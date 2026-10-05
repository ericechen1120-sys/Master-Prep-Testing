const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const SERVER_PATH = path.join(__dirname, "..", "server.js");
const STUDENT_COUNT = 75;

function buildExamData() {
  const questions = Array.from({ length: 50 }, (_, index) => ({
    id: `load-q-${index + 1}`,
    number: index + 1,
    originalNumber: index + 1,
    type: "multiple",
    section: "ELA",
    choices: ["A", "B", "C", "D"],
    answer: "A",
    questionText: `Load test question ${index + 1}\n\nA. First\nB. Second\nC. Third\nD. Fourth`,
    points: 1,
  }));
  questions[0].imageUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const mathQuestions = Array.from({ length: 50 }, (_, index) => ({
    id: `math-q-${index + 1}`,
    number: index + 1,
    originalNumber: index + 1,
    type: "multiple",
    section: "Math",
    choices: ["A", "B", "C", "D"],
    answer: "A",
    questionText: `Math load test question ${index + 1}\n\nA. First\nB. Second\nC. Third\nD. Fourth`,
    points: 1,
  }));
  return {
    exams: [
      {
        id: "load-exam",
        title: "75 Student ELA Readiness Exam",
        code: "LOAD75",
        minutes: 60,
        open: true,
        shuffle: true,
        examType: "english",
        stepMode: "one",
        questions,
      },
      {
        id: "math-exam",
        title: "75 Student Math Readiness Exam",
        code: "LOAD75",
        minutes: 60,
        open: true,
        shuffle: true,
        examType: "math",
        stepMode: "one",
        questions: mathQuestions,
      },
    ],
    submissions: [],
    students: [],
    attempts: [],
    classes: [],
    questionBank: [],
  };
}

async function waitForServer(baseUrl, child) {
  let lastError;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode != null) throw new Error(`Server exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw lastError || new Error("Local readiness server did not start");
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  assert.equal(response.status, 200, result.error || `Unexpected status ${response.status}`);
  return result;
}

test("75 students can use open 50-question ELA and Math exams concurrently without data loss", async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "topway-load-"));
  const dataFile = path.join(tempDir, "topway-data.json");
  fs.writeFileSync(dataFile, JSON.stringify(buildExamData()));
  const port = 43000 + (process.pid % 1000);
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", DATA_DIR: tempDir, DATABASE_URL: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErrors = "";
  child.stderr.on("data", (chunk) => { serverErrors += chunk.toString(); });
  t.after(() => {
    child.kill("SIGTERM");
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  let health;
  try {
    health = await waitForServer(baseUrl, child);
  } catch (error) {
    throw new Error(`${error.message}${serverErrors ? `\n${serverErrors}` : ""}`);
  }
  assert.equal(health.status, "ok");
  assert.equal(health.build, "2026.10.05.1");

  const examResponses = await Promise.all(Array.from({ length: STUDENT_COUNT }, async (_, index) => {
    const examId = index % 2 === 0 ? "load-exam" : "math-exam";
    const response = await fetch(`${baseUrl}/api/student/exam?code=LOAD75&examId=${examId}&student=${index + 1}`);
    assert.equal(response.status, 200);
    return response.json();
  }));
  assert.ok(examResponses.every((exam) => exam.questions.length === 50));
  const migratedImageUrl = examResponses[0].questions[0].imageUrl;
  assert.match(migratedImageUrl, /^\/api\/media\/[a-f0-9]{64}$/);
  const imageResponse = await fetch(`${baseUrl}${migratedImageUrl}`);
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/png");

  const starts = await Promise.all(Array.from({ length: STUDENT_COUNT }, (_, index) => postJson(`${baseUrl}/api/student/start`, {
    examId: index % 2 === 0 ? "load-exam" : "math-exam",
    studentName: `Load Student ${index + 1}`,
    studentId: `LOAD-${String(index + 1).padStart(3, "0")}`,
  })));
  assert.equal(new Set(starts.map((start) => start.attemptId)).size, STUDENT_COUNT);

  const submissions = await Promise.all(starts.map((start, index) => postJson(`${baseUrl}/api/student/submit`, {
    examId: index % 2 === 0 ? "load-exam" : "math-exam",
    attemptId: start.attemptId,
    studentName: `Load Student ${index + 1}`,
    studentId: `LOAD-${String(index + 1).padStart(3, "0")}`,
    answers: Object.fromEntries(Array.from(
      { length: 50 },
      (_, questionIndex) => [`${index % 2 === 0 ? "load" : "math"}-q-${questionIndex + 1}`, "A"]
    )),
    displayOrder: examResponses[index].displayOrder,
  })));
  assert.equal(new Set(submissions.map((result) => result.submission.id)).size, STUDENT_COUNT);

  const repeated = await postJson(`${baseUrl}/api/student/submit`, {
    examId: "load-exam",
    attemptId: starts[0].attemptId,
    studentName: "Load Student 1",
    studentId: "LOAD-001",
    answers: Object.fromEntries(Array.from({ length: 50 }, (_, index) => [`load-q-${index + 1}`, "A"])),
  });
  assert.equal(repeated.duplicatePrevented, true);
  assert.equal(repeated.submission.id, submissions[0].submission.id);

  const duplicateStartResponse = await fetch(`${baseUrl}/api/student/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ examId: "load-exam", studentName: "Load Student 1", studentId: "LOAD-001" }),
  });
  const duplicateStart = await duplicateStartResponse.json();
  assert.equal(duplicateStartResponse.status, 409);
  assert.equal(duplicateStart.alreadySubmitted, true);
  assert.equal(duplicateStart.submission.id, submissions[0].submission.id);

  const saved = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  assert.equal(saved.attempts.length, STUDENT_COUNT);
  assert.equal(saved.submissions.length, STUDENT_COUNT);
  assert.equal(saved.exams[0].questions[0].imageUrl, migratedImageUrl);
  assert.ok(saved.attempts.every((attempt) => attempt.status === "submitted" && attempt.submissionId));
  assert.equal(serverErrors, "");
});
