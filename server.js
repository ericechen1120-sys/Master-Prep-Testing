const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 4173);
const ADMIN_PASSWORD = process.env.TOPWAY_ADMIN_PASSWORD || "Topway8508";
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "topway-data.json");
const DATABASE_URL = process.env.DATABASE_URL || "";
const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
]);
const LETTERS = ["A", "B", "C", "D", "E"];
const sessions = new Set();
let dbPool = null;
let dbReady = false;

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function defaultData() {
  return { exams: [], submissions: [] };
}

function getDbPool() {
  if (!DATABASE_URL) return null;
  if (!dbPool) {
    const { Pool } = require("pg");
    dbPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
    });
  }
  return dbPool;
}

async function ensureDb() {
  const pool = getDbPool();
  if (!pool || dbReady) return pool;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  dbReady = true;
  return pool;
}

async function loadData() {
  const pool = await ensureDb();
  if (pool) {
    const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["main"]);
    return result.rows[0]?.data || defaultData();
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return defaultData();
  }
}

async function saveData(data) {
  const pool = await ensureDb();
  if (pool) {
    await pool.query(
      `
        INSERT INTO app_state (id, data, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
      `,
      ["main", JSON.stringify(data)]
    );
    return;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function parseCsvRows(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(",").map((cell) => cell.trim()));
}

function parseAnswerKey(text) {
  const rows = parseCsvRows(text);
  const entries = [];
  const header = rows[0]?.map((cell) => cell.toLowerCase());
  const hasHeader = header?.some((cell) => ["section", "module", "question", "q", "answer"].includes(cell));
  const sectionIndex = hasHeader ? Math.max(header.indexOf("section"), header.indexOf("module")) : -1;
  const questionIndex = hasHeader ? Math.max(header.indexOf("question"), header.indexOf("q"), header.indexOf("number")) : -1;
  const answerIndex = hasHeader ? header.indexOf("answer") : -1;

  rows.forEach((row, index) => {
    if (index === 0 && hasHeader) return;

    let section = "";
    let number = 0;
    let answer = "";

    if (hasHeader) {
      section = sectionIndex >= 0 ? String(row[sectionIndex] || "").trim() : "";
      number = Number.parseInt(row[questionIndex], 10);
      answer = String(row[answerIndex] || "").trim().toUpperCase();
    } else if (Number.isFinite(Number.parseInt(row[0], 10))) {
      number = Number.parseInt(row[0], 10);
      answer = String(row[1] || "").trim().toUpperCase();
      section = String(row[2] || "").trim();
    } else {
      section = String(row[0] || "").trim();
      number = Number.parseInt(row[1], 10);
      answer = String(row[2] || "").trim().toUpperCase();
    }

    if (Number.isFinite(number) && number > 0 && answer) entries.push({ section, number, answer });
  });
  return entries;
}

function expandChoiceToken(token) {
  const range = token.match(/^([A-Z])-([A-Z])$/);
  if (!range) return [token];

  const start = range[1].charCodeAt(0);
  const end = range[2].charCodeAt(0);
  if (end < start || end - start > 11) return [token];

  return Array.from({ length: end - start + 1 }, (_, index) => String.fromCharCode(start + index));
}

function parseChoices(value, fallback = LETTERS) {
  const choices = String(value || "")
    .split(/[\s,;|/]+/)
    .map((choice) => choice.trim().toUpperCase())
    .filter(Boolean)
    .flatMap(expandChoiceToken);
  const uniqueChoices = [...new Set(choices)].slice(0, 12);
  return uniqueChoices.length ? uniqueChoices : fallback;
}

function makeQuestions(count, answerKey, choiceCount = 5) {
  const choices = LETTERS.slice(0, choiceCount);
  if (answerKey.length) {
    return answerKey.map((entry, index) => ({
      id: uid("q"),
      number: index + 1,
      originalNumber: entry.number,
      type: /^[A-E]$/.test(entry.answer) ? "multiple" : "numeric",
      section: entry.section || "Section 1",
      choices,
      answer: entry.answer,
      imageUrl: "",
      sharedImageUrl: "",
      questionText: "",
      groupId: "",
      points: 1,
    }));
  }

  return Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    return {
      id: uid("q"),
      number,
      originalNumber: number,
      type: "multiple",
      section: number <= Math.ceil(count / 2) ? "Section 1" : "Section 2",
      choices,
      answer: "",
      imageUrl: "",
      sharedImageUrl: "",
      questionText: "",
      groupId: "",
      points: 1,
    };
  });
}

function renumberQuestions(questions) {
  questions
    .sort((left, right) => (left.number || 0) - (right.number || 0))
    .forEach((question, index) => {
      question.number = index + 1;
      if (!question.originalNumber) question.originalNumber = question.number;
    });
}

function buildDisplayOrder(exam) {
  const units = [];
  const grouped = new Map();
  const questionById = new Map(exam.questions.map((question) => [question.id, question]));

  exam.questions.forEach((question) => {
    const groupId = String(question.groupId || "").trim();
    if (!groupId) {
      units.push({ ids: [question.id] });
      return;
    }
    if (!grouped.has(groupId)) {
      const unit = { groupId, ids: [] };
      grouped.set(groupId, unit);
      units.push(unit);
    }
    grouped.get(groupId).ids.push(question.id);
  });

  const orderedUnits = exam.shuffle ? shuffle(units) : units;
  return orderedUnits.flatMap((unit) =>
    unit.ids.sort((left, right) => {
      const leftQuestion = questionById.get(left);
      const rightQuestion = questionById.get(right);
      return (leftQuestion?.number || 0) - (rightQuestion?.number || 0);
    })
  );
}

function sanitizeViolationEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.slice(0, 100).map((event) => ({
    reason: String(event.reason || "Unknown").slice(0, 80),
    at: String(event.at || new Date().toISOString()).slice(0, 40),
    page: String(event.page || "Exam page").slice(0, 80),
  }));
}

function sanitizeExamForStudent(exam) {
  return {
    id: exam.id,
    title: exam.title,
    code: exam.code,
    minutes: exam.minutes,
    examType: exam.examType || "english",
    stepMode: exam.stepMode || "one",
    displayOrder: buildDisplayOrder(exam),
    questions: exam.questions.map(({ answer, ...question }) => question),
  };
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scoreSubmission(exam, answers) {
  const rows = [...exam.questions]
    .sort((a, b) => a.number - b.number)
    .map((question) => {
      const studentAnswer = String(answers[question.id] || "").trim().toUpperCase();
      const correctAnswer = String(question.answer || "").trim().toUpperCase();
      const correct = Boolean(correctAnswer) && studentAnswer === correctAnswer;
      return {
        questionId: question.id,
        number: question.number,
        originalNumber: question.originalNumber || question.number,
        section: question.section,
        studentAnswer,
        correctAnswer,
        correct,
        points: question.points || 1,
        earned: correct ? question.points || 1 : 0,
      };
    });

  const earned = rows.reduce((sum, row) => sum + row.earned, 0);
  const possible = rows.reduce((sum, row) => sum + row.points, 0);
  return {
    earned,
    possible,
    percent: possible ? Math.round((earned / possible) * 100) : 0,
    rows,
    satEstimate: estimateSatScore(rows),
  };
}

function estimateSatScore(rows) {
  const buckets = {
    readingWriting: { correct: 0, total: 0 },
    math: { correct: 0, total: 0 },
  };

  rows.forEach((row) => {
    const section = String(row.section || "").toLowerCase();
    const bucket = /math|algebra|geometry|graph|data|advanced/.test(section) ? buckets.math : buckets.readingWriting;
    bucket.total += row.points || 1;
    bucket.correct += row.earned || 0;
  });

  const rwScore = estimateSectionScore(buckets.readingWriting.correct, buckets.readingWriting.total);
  const mathScore = estimateSectionScore(buckets.math.correct, buckets.math.total);
  return {
    readingWritingRaw: buckets.readingWriting.correct,
    readingWritingTotal: buckets.readingWriting.total,
    readingWritingScore: rwScore,
    mathRaw: buckets.math.correct,
    mathTotal: buckets.math.total,
    mathScore,
    totalScore: rwScore && mathScore ? rwScore + mathScore : null,
    note: "Approximate SAT-style estimate. Exact conversion varies by test form.",
  };
}

function estimateSectionScore(correct, total) {
  if (!total) return null;
  const ratio = Math.max(0, Math.min(1, correct / total));
  return Math.round((200 + ratio * 600) / 10) * 10;
}

function isAdmin(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  return Boolean(token && sessions.has(token));
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 60 * 1024 * 1024) {
        reject(new Error("Upload is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const fileName = PUBLIC_FILES.get(url.pathname) || "index.html";
  const allowedFallback = !path.extname(url.pathname);
  if (!PUBLIC_FILES.has(url.pathname) && !allowedFallback) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  if (!fileName) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const filePath = path.join(__dirname, fileName);
  const type = fileName.endsWith(".css") ? "text/css" : fileName.endsWith(".js") ? "text/javascript" : "text/html";
  res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const data = await loadData();

  try {
    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const body = await readBody(req);
      if (body.password !== ADMIN_PASSWORD) return sendJson(res, 401, { error: "Admin access denied." });
      const token = crypto.randomBytes(24).toString("hex");
      sessions.add(token);
      return sendJson(res, 200, { token });
    }

    if (url.pathname.startsWith("/api/admin/") && !isAdmin(req)) {
      return sendJson(res, 401, { error: "Admin login required." });
    }

    if (req.method === "GET" && url.pathname === "/api/admin/state") {
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/exams") {
      const body = await readBody(req);
      const title = String(body.title || "Untitled Exam").trim();
      const code = String(body.code || title.slice(0, 3) + "-001").trim().toUpperCase();
      const minutes = Math.max(1, Number.parseInt(body.minutes, 10) || 65);
      const questionCount = Math.max(1, Number.parseInt(body.questionCount, 10) || 20);
      const choiceCount = Math.max(4, Math.min(5, Number.parseInt(body.choiceCount, 10) || 5));
      const answerKey = parseAnswerKey(body.answerKey);
      const exam = {
        id: uid("exam"),
        title,
        code,
        minutes,
        examType: body.examType === "math" ? "math" : "english",
        stepMode: body.stepMode === "all" ? "all" : "one",
        questions: makeQuestions(questionCount, answerKey, choiceCount),
        shuffle: body.shuffle !== false,
        open: true,
        createdAt: new Date().toISOString(),
      };
      data.exams.unshift(exam);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const toggleMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/toggle$/);
    if (req.method === "POST" && toggleMatch) {
      const exam = data.exams.find((item) => item.id === toggleMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });
      exam.open = !exam.open;
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const deleteExamMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)$/);
    if (req.method === "DELETE" && deleteExamMatch) {
      const examIndex = data.exams.findIndex((item) => item.id === deleteExamMatch[1]);
      if (examIndex < 0) return sendJson(res, 404, { error: "Exam not found." });
      const [deletedExam] = data.exams.splice(examIndex, 1);
      data.submissions = data.submissions.filter((submission) => submission.examId !== deletedExam.id);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const deleteQuestionMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/questions\/([^/]+)$/);
    if (req.method === "DELETE" && deleteQuestionMatch) {
      const exam = data.exams.find((item) => item.id === deleteQuestionMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });
      if (exam.questions.length <= 1) return sendJson(res, 400, { error: "An exam must keep at least one question. Delete the exam instead." });
      const beforeCount = exam.questions.length;
      exam.questions = exam.questions.filter((question) => question.id !== deleteQuestionMatch[2]);
      if (exam.questions.length === beforeCount) return sendJson(res, 404, { error: "Question not found." });
      renumberQuestions(exam.questions);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const questionMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/questions$/);
    if (req.method === "POST" && questionMatch) {
      const body = await readBody(req);
      const exam = data.exams.find((item) => item.id === questionMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });
      body.questions?.forEach((edit) => {
        const question = exam.questions.find((item) => item.id === edit.id);
        if (!question) return;
        if (Object.hasOwn(edit, "section")) question.section = String(edit.section || question.section).trim();
        if (Object.hasOwn(edit, "originalNumber")) {
          question.originalNumber = Number.parseInt(edit.originalNumber, 10) || question.originalNumber || question.number;
        }
        if (Object.hasOwn(edit, "type")) question.type = edit.type === "numeric" ? "numeric" : "multiple";
        if (Object.hasOwn(edit, "answer")) question.answer = String(edit.answer || "").trim().toUpperCase();
        if (Object.hasOwn(edit, "choices")) question.choices = parseChoices(edit.choices, question.choices || LETTERS);
        if (question.type === "multiple" && question.answer && !question.choices.includes(question.answer)) question.choices.push(question.answer);
        if (Object.hasOwn(edit, "questionText")) question.questionText = String(edit.questionText || "").trim();
        if (Object.hasOwn(edit, "groupId")) question.groupId = String(edit.groupId || "").trim();
        if (Object.hasOwn(edit, "imageUrl")) question.imageUrl = String(edit.imageUrl || "").trim();
        if (Object.hasOwn(edit, "sharedImageUrl")) question.sharedImageUrl = String(edit.sharedImageUrl || "").trim();
      });
      await saveData(data);
      return sendJson(res, 200, data);
    }

    if (req.method === "GET" && url.pathname === "/api/student/exam") {
      const code = String(url.searchParams.get("code") || "").trim().toUpperCase();
      const exam = data.exams.find((item) => item.code.toUpperCase() === code && item.open);
      if (!exam) return sendJson(res, 404, { error: "Test code is not open or does not exist." });
      return sendJson(res, 200, sanitizeExamForStudent(exam));
    }

    if (req.method === "POST" && url.pathname === "/api/student/submit") {
      const body = await readBody(req);
      const exam = data.exams.find((item) => item.id === body.examId && item.open);
      if (!exam) return sendJson(res, 404, { error: "Exam is no longer open." });
      const score = scoreSubmission(exam, body.answers || {});
      const submission = {
        id: uid("sub"),
        examId: exam.id,
        studentName: String(body.studentName || "Student").trim(),
        answers: body.answers || {},
        displayOrder: Array.isArray(body.displayOrder) ? body.displayOrder : [],
        score,
        violations: Number.parseInt(body.violations, 10) || 0,
        violationEvents: sanitizeViolationEvents(body.violationEvents),
        autoSubmit: Boolean(body.autoSubmit),
        submittedAt: new Date().toISOString(),
      };
      data.submissions.unshift(submission);
      await saveData(data);
      return sendJson(res, 200, {
        ok: true,
        submission: {
          id: submission.id,
          examId: submission.examId,
          studentName: submission.studentName,
          submittedAt: submission.submittedAt,
          violations: submission.violations,
          score: {
            rows: submission.score.rows.map(({ questionId, number, originalNumber, section, studentAnswer }) => ({
              questionId,
              number,
              originalNumber,
              section,
              studentAnswer,
            })),
          },
        },
      });
    }

    return sendJson(res, 404, { error: "Not found." });
  } catch (error) {
    return sendJson(res, 400, { error: error.message });
  }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  serveFile(req, res);
});

server.listen(PORT, () => {
  console.log(`Topway server running at http://127.0.0.1:${PORT}/`);
});
