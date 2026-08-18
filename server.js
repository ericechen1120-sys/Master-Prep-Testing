const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

const PORT = Number(process.env.PORT || 4173);
const HOST = process.env.HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");
const ADMIN_PASSWORD = process.env.TOPWAY_ADMIN_PASSWORD || "Topway8508";
const DEMO_ADMIN_HOSTS = new Set(["topway-admin.onrender.com"]);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "topway-data.json");
const DATABASE_URL = process.env.DATABASE_URL || "";
const PUBLIC_FILES = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/app.js", "app.js"],
  ["/diagnostic-report-preview.html", "diagnostic-report-preview.html"],
  ["/combined-diagnostic-report-preview.html", "combined-diagnostic-report-preview.html"],
  ["/assets/topway-prep-logo.png", "assets/topway-prep-logo.png"],
  ["/assets/topway-prep-logo-transparent.png", "assets/topway-prep-logo-transparent.png"],
  // GitHub's web uploader can flatten a selected assets folder. Keep both
  // URL layouts working so a root-level upload still serves the logo.
  ["/topway-prep-logo.png", "topway-prep-logo.png"],
  ["/topway-prep-logo-transparent.png", "topway-prep-logo-transparent.png"],
]);
const FALLBACK_LOGO_BASE64 = "";
const LETTERS = ["A", "B", "C", "D", "E"];
const QUESTION_TYPES = new Set(["multiple", "numeric", "equation", "fill_blank", "dropdown", "drag_drop", "table_grid", "hot_text", "hotspot"]);
const sessions = new Set();
let dbPool = null;
let dbReady = false;
let cachedData = null;
let cachedDataAt = 0;
let dataLoadPromise = null;
let cachedSectionJson = null;
const DATA_CACHE_TTL_MS = Math.max(1000, Number.parseInt(process.env.TOPWAY_DATA_CACHE_TTL_MS, 10) || 10000);
const DATA_SECTION_KEYS = Object.freeze(["exams", "submissions", "students", "attempts", "classes", "questionBank"]);

function serializeDataSections(data) {
  return Object.fromEntries(
    DATA_SECTION_KEYS.map((key) => [key, JSON.stringify(Array.isArray(data?.[key]) ? data[key] : [])])
  );
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}

function normalizeQuestionType(value) {
  const type = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (/table|claim|evidence/.test(type)) return "table_grid";
  if (/equation|math_editor|math_input/.test(type)) return "equation";
  if (/hot_?spot|image_?select/.test(type)) return "hotspot";
  if (/hot_?text|select_?text/.test(type)) return "hot_text";
  if (/grid|numeric|free|short/.test(type)) return "numeric";
  if (/fill|blank|text_entry/.test(type)) return "fill_blank";
  if (/drop.?down|inline.?choice|select/.test(type)) return "dropdown";
  if (/drag/.test(type)) return "drag_drop";
  return QUESTION_TYPES.has(type) ? type : "multiple";
}

function normalizeSubject(value) {
  const subject = String(value || "").trim().toLowerCase();
  if (/(^|\b)(math|mathematics|algebra|geometry|arithmetic|statistics|probability)(\b|$)/.test(subject)) return "math";
  if (/(^|\b)(english|ela|reading|writing|grammar|language arts)(\b|$)/.test(subject)) return "english";
  return "";
}

function inferQuestionSubject(question) {
  return normalizeSubject(question?.subject || `${question?.testClass || ""} ${question?.section || ""} ${question?.skill || ""}`);
}

function isOptionQuestion(type) {
  return ["dropdown", "drag_drop", "table_grid", "hot_text", "hotspot"].includes(normalizeQuestionType(type));
}

function parseOptionValues(value, fallback = []) {
  const options = String(value || "")
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [...new Set(options)].slice(0, 16);
  return unique.length ? unique : fallback;
}

function normalizeAnswerForStorage(value, type) {
  const answer = String(value || "").trim();
  return ["multiple", "numeric", "equation"].includes(normalizeQuestionType(type)) ? answer.toUpperCase() : answer;
}

// User-provided SHSAT prep conversion chart: Original column only.
// This is deliberately not used for SAT or any other exam type.
const SHSAT_ORIGINAL_SCORE_CONVERSION = Object.freeze({
  1: 16, 2: 30, 3: 44, 4: 58, 5: 72, 6: 82, 7: 90, 8: 98, 9: 107, 10: 129,
  11: 138, 12: 145, 13: 152, 14: 158, 15: 164, 16: 170, 17: 175, 18: 180, 19: 185, 20: 190,
  21: 194, 22: 198, 23: 202, 24: 206, 25: 212, 26: 214, 27: 218, 28: 222, 29: 226, 30: 230,
  31: 234, 32: 238, 33: 242, 34: 246, 35: 250, 36: 254, 37: 258, 38: 262, 39: 267, 40: 272,
  41: 277, 42: 283, 43: 290, 44: 298, 45: 308, 46: 318, 47: 328, 48: 339, 49: 350, 50: 400,
});

function isEligibleShsatOriginalExam(exam) {
  const questionIdentity = Array.isArray(exam?.questions)
    ? exam.questions.map((question) => `${question?.testClass || ""} ${question?.sourceQuestionId || ""}`).join(" ")
    : "";
  const identity = `${exam?.title || ""} ${exam?.code || ""} ${questionIdentity}`.toUpperCase();
  return /\bSHSAT\b/.test(identity) && Array.isArray(exam?.questions) && exam.questions.length === 50;
}

function shsatOriginalScoringMode(exam) {
  return isEligibleShsatOriginalExam(exam) ? "shsat_original" : "";
}

function defaultData() {
  return { exams: [], submissions: [], students: [], attempts: [], classes: [], questionBank: [] };
}

const KNOWN_UNDERLINE_FIXES = {
  "SHSAT-ELA2-0005": ["descend through gray wolves"],
  "SHSAT-ELA2-0006": ["drastic range of traits, appearances and body types"],
  "SHSAT-ELA2-0007": ["This was done through a process called selective breeding"],
  "SHSAT-ELA2-0008": ["Selective breeding which is also called artificial selection is the process"],
  "SHSAT-ELA2-0009": ["gain an advantage over others of their species"],
  "SHSAT-ELA2-0010": ["genes are passed into their offspring"],
};

function applyKnownQuestionFix(question) {
  const targets = KNOWN_UNDERLINE_FIXES[String(question?.sourceQuestionId || "")];
  if (!targets?.length || String(question.questionText || "").includes("__")) return;
  let text = String(question.questionText || "");
  targets.forEach((target) => { text = text.replace(target, `__${target}__`); });
  question.questionText = text;
}

function makeStudentScoreHistoryEntry(submission, exam) {
  const score = submission?.score || {};
  const questionSourceGroupIds = [...new Set([
    ...(Array.isArray(submission?.questionSourceGroupIds) ? submission.questionSourceGroupIds : []),
    ...((exam?.questions || []).map(getQuestionSourceGroupId)),
  ].map((id) => String(id || "").trim().toLowerCase()).filter(Boolean))];
  return {
    id: String(submission?.id || `score_${submission?.submittedAt || Date.now()}`),
    submissionId: String(submission?.id || ""),
    examId: String(submission?.examId || exam?.id || ""),
    examTitle: String(submission?.examTitle || submission?.examName || exam?.title || "Deleted exam"),
    examCode: String(submission?.examCode || exam?.code || ""),
    subject: String(submission?.examSubject || exam?.examType || ""),
    submittedAt: String(submission?.submittedAt || ""),
    percent: Number.isFinite(Number(score.percent)) ? Number(score.percent) : 0,
    correct: Number.isFinite(Number(score.correct)) ? Number(score.correct) : 0,
    total: Number.isFinite(Number(score.total)) ? Number(score.total) : 0,
    rawScore: Number.isFinite(Number(score.rawScore)) ? Number(score.rawScore) : null,
    shsatScore: Number.isFinite(Number(score.shsatScore)) ? Number(score.shsatScore) : null,
    weakSkills: Array.isArray(score.weakSkills) ? score.weakSkills.map((skill) => String(skill)).filter(Boolean) : [],
    questionSourceGroupIds,
  };
}

function saveStudentScoreHistory(data, student, submission, exam) {
  if (!student || !submission) return;
  const entry = makeStudentScoreHistoryEntry(submission, exam);
  student.scoreHistory = Array.isArray(student.scoreHistory) ? student.scoreHistory : [];
  student.deletedScoreHistoryKeys = Array.isArray(student.deletedScoreHistoryKeys) ? student.deletedScoreHistoryKeys : [];
  const historyKey = String(entry.submissionId || entry.id || "");
  if (historyKey && student.deletedScoreHistoryKeys.includes(historyKey)) return;
  const existingIndex = student.scoreHistory.findIndex(
    (item) => (entry.submissionId && item.submissionId === entry.submissionId) || (!entry.submissionId && item.id === entry.id)
  );
  if (existingIndex >= 0) student.scoreHistory[existingIndex] = { ...student.scoreHistory[existingIndex], ...entry };
  else student.scoreHistory.unshift(entry);
  student.scoreHistory.sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0));
}

function normalizeData(data) {
  const normalized = {
    exams: Array.isArray(data?.exams)
      ? data.exams.map((exam) => ({
          ...exam,
          questions: sortExamQuestionsInSourceOrder(exam.questions || []),
          shuffle: Boolean(exam.shuffle),
          program: String(exam.program || "").trim(),
          reusePolicy: normalizeQuestionReusePolicy(exam.reusePolicy || "allow_previous"),
          scoringMode: shsatOriginalScoringMode(exam),
        }))
      : [],
    submissions: Array.isArray(data?.submissions) ? data.submissions : [],
    attempts: Array.isArray(data?.attempts) ? data.attempts : [],
    classes: Array.isArray(data?.classes) ? data.classes : [],
    questionBank: Array.isArray(data?.questionBank) ? data.questionBank : [],
    students: Array.isArray(data?.students)
      ? data.students.map((student) => ({
          ...student,
          group: student.group || "Ungrouped",
          term: student.term || "Unassigned",
          status: student.status || "Active",
          classId: student.classId || "",
          logEntries: Array.isArray(student.logEntries) ? student.logEntries : [],
          scoreHistory: Array.isArray(student.scoreHistory) ? student.scoreHistory : [],
          deletedScoreHistoryKeys: Array.isArray(student.deletedScoreHistoryKeys) ? student.deletedScoreHistoryKeys : [],
        }))
      : [],
  };
  fillSharedPassageContent(normalized.questionBank).forEach(applyKnownQuestionFix);
  const canonicalPassages = buildCanonicalPassagesBySection(normalized.questionBank);
  const canonicalPassagesByQuestionText = buildCanonicalPassagesByQuestionText(normalized.questionBank);
  normalized.exams.forEach((exam) =>
    fillSharedPassageContent(exam.questions || [], canonicalPassages, canonicalPassagesByQuestionText).forEach(applyKnownQuestionFix)
  );
  normalized.submissions.forEach((submission) => {
    const student = normalized.students.find((item) => item.id === submission.studentRecordId)
      || findStudentRecord(normalized, submission.studentId, submission.studentName);
    if (student) saveStudentScoreHistory(normalized, student, submission, normalized.exams.find((exam) => exam.id === submission.examId));
  });
  return normalized;
}

function looksLikeTopwayData(data) {
  if (!data || typeof data !== "object") return false;
  return ["exams", "submissions", "students", "attempts", "classes", "questionBank"].some((key) => Array.isArray(data[key]));
}

function submissionMatchesStudent(submission, student) {
  const submissionStudentId = String(submission.studentId || "").trim().toLowerCase();
  const studentNumber = String(student.studentNumber || "").trim().toLowerCase();
  const submissionName = String(submission.studentName || "").trim().toLowerCase();
  const studentName = String(student.name || "").trim().toLowerCase();
  if (submissionStudentId) return Boolean(studentNumber && submissionStudentId === studentNumber);
  return Boolean(studentName && submissionName === studentName);
}

function normalizeIdentityText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

function findDuplicateStudent(students, candidate, excludedId = "") {
  const candidateName = normalizeIdentityText(candidate.name);
  if (!candidateName) return null;

  const fields = [
    ["address", normalizeIdentityText],
    ["phone", normalizePhone],
    ["parentPhone", normalizePhone],
    ["email", (value) => String(value || "").trim().toLowerCase()],
  ];
  const provided = fields
    .map(([key, normalize]) => ({ key, value: normalize(candidate[key]) }))
    .filter((field) => field.value);
  if (!provided.length) return null;

  return (students || []).find((student) => {
    if (student.id === excludedId || normalizeIdentityText(student.name) !== candidateName) return false;
    return provided.every(({ key, value }) => {
      const normalize = fields.find(([fieldKey]) => fieldKey === key)[1];
      return normalize(student[key]) === value;
    });
  }) || null;
}

function findStudentRecord(data, studentId, studentName) {
  const normalizedId = String(studentId || "").trim().toLowerCase();
  if (normalizedId) {
    return data.students.find((student) => String(student.studentNumber || "").trim().toLowerCase() === normalizedId) || null;
  }
  const normalizedName = String(studentName || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalizedName) return null;
  const matches = data.students.filter(
    (student) => String(student.name || "").trim().toLowerCase().replace(/\s+/g, " ") === normalizedName
  );
  return matches.length === 1 ? matches[0] : null;
}

function attachSubmissionToStudent(data, student, submission) {
  submission.studentRecordId = student.id;
  submission.studentId = student.studentNumber;
  submission.studentName = student.name;
  submission.studentGroup = student.group;
  submission.classId = student.classId || submission.classId || "";
  saveStudentScoreHistory(data, student, submission, data.exams.find((exam) => exam.id === submission.examId));
  data.attempts.forEach((attempt) => {
    if (attempt.submissionId === submission.id || attempt.id === submission.attemptId) {
      attempt.studentRecordId = student.id;
      attempt.studentId = student.studentNumber;
      attempt.studentName = student.name;
      attempt.studentGroup = student.group;
      attempt.classId = student.classId || "";
    }
  });
}

function attachStudentToClass(data, student, classRecord) {
  student.classId = classRecord.id;
  student.term = student.term || classRecord.term || "Unassigned";
  student.updatedAt = new Date().toISOString();
  data.submissions.forEach((submission) => {
    if (
      submission.studentRecordId === student.id ||
      String(submission.studentId || "").toLowerCase() === String(student.studentNumber || "").toLowerCase()
    ) {
      submission.classId = classRecord.id;
      submission.studentGroup = student.group;
    }
  });
  data.attempts.forEach((attempt) => {
    if (
      attempt.studentRecordId === student.id ||
      String(attempt.studentId || "").toLowerCase() === String(student.studentNumber || "").toLowerCase()
    ) {
      attempt.classId = classRecord.id;
    }
  });
}

function linkExistingSubmissionsToStudent(data, student) {
  data.submissions.forEach((submission) => {
    const matchedStudent = findStudentRecord(data, submission.studentId, submission.studentName);
    if (!submission.studentRecordId && matchedStudent?.id === student.id) {
      attachSubmissionToStudent(data, student, submission);
    }
  });
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
  if (cachedData && Date.now() - cachedDataAt < DATA_CACHE_TTL_MS) return cachedData;
  if (dataLoadPromise) return dataLoadPromise;
  dataLoadPromise = (async () => {
    const pool = await ensureDb();
    let loaded;
    if (pool) {
      const result = await pool.query("SELECT data FROM app_state WHERE id = $1", ["main"]);
      loaded = normalizeData(result.rows[0]?.data || defaultData());
    } else {
      try {
        loaded = normalizeData(JSON.parse(fs.readFileSync(DATA_FILE, "utf8")));
      } catch {
        loaded = defaultData();
      }
    }
    cachedData = loaded;
    cachedDataAt = Date.now();
    cachedSectionJson = serializeDataSections(loaded);
    return loaded;
  })();
  try {
    return await dataLoadPromise;
  } finally {
    dataLoadPromise = null;
  }
}

async function saveData(data) {
  try {
    const pool = await ensureDb();
    const nextSectionJson = serializeDataSections(data);
    if (pool) {
      const changedKeys = DATA_SECTION_KEYS.filter(
        (key) => !cachedSectionJson || cachedSectionJson[key] !== nextSectionJson[key]
      );
      if (changedKeys.length) {
        const values = ["main"];
        let dataExpression = "data";
        changedKeys.forEach((key) => {
          values.push(nextSectionJson[key]);
          dataExpression = `jsonb_set(${dataExpression}, '{${key}}', $${values.length}::jsonb, true)`;
        });
        const result = await pool.query(
          `UPDATE app_state SET data = ${dataExpression}, updated_at = NOW() WHERE id = $1`,
          values
        );
        if (!result.rowCount) {
          await pool.query(
            "INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
            ["main", JSON.stringify(data)]
          );
        }
      }
    } else {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const tempFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(data));
      fs.renameSync(tempFile, DATA_FILE);
    }
    cachedData = data;
    cachedDataAt = Date.now();
    cachedSectionJson = nextSectionJson;
  } catch (error) {
    cachedData = null;
    cachedDataAt = 0;
    cachedSectionJson = null;
    throw error;
  }
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const source = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[_/()+.-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCsvValue(row, headers, names) {
  for (const name of names) {
    const index = headers.indexOf(normalizeHeader(name));
    if (index >= 0) return String(row[index] || "").trim();
  }
  return "";
}

function isRealImageReference(value) {
  return /^(https?:\/\/|data:image\/)/i.test(String(value || "").trim());
}

function cleanInlineImageUrl(value) {
  return String(value || "").trim().replace(/[),.;]+$/g, "");
}

function isInlineImageUrl(value, fromMarkdownImage = false) {
  const url = cleanInlineImageUrl(value);
  if (/^data:image\//i.test(url)) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  if (fromMarkdownImage) return true;
  return /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(url) || /\/(uploads?|assets)\//i.test(url);
}

function findInlineImageReference(value) {
  const text = String(value || "");
  const markdownImage = /!\[[^\]]*]\(\s*([^)]+?)\s*\)/i.exec(text);
  if (markdownImage && isInlineImageUrl(markdownImage[1], true)) return cleanInlineImageUrl(markdownImage[1]);
  const labeledImage = /\[((?:graph|image|diagram|figure|chart|picture)[^\]]*)]\(\s*([^)]+?)\s*\)/i.exec(text);
  if (labeledImage && isInlineImageUrl(labeledImage[2], true)) return cleanInlineImageUrl(labeledImage[2]);
  const rawImages = text.match(/(https?:\/\/[^\s<>"']+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi) || [];
  const match = rawImages.find((url) => isInlineImageUrl(url, false));
  return match ? cleanInlineImageUrl(match) : "";
}

function stripInlineImageReferences(value) {
  let text = String(value || "");
  text = text.replace(/!\[[^\]]*]\(\s*([^)]+?)\s*\)/gi, (match, url) => (isInlineImageUrl(url, true) ? "" : match));
  text = text.replace(/\[((?:graph|image|diagram|figure|chart|picture)[^\]]*)]\(\s*([^)]+?)\s*\)/gi, (match, _label, url) => (isInlineImageUrl(url, true) ? "" : match));
  text = text.replace(/(https?:\/\/[^\s<>"']+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi, (match, url) => (isInlineImageUrl(url, false) ? "" : match));
  return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function cleanCsvText(value) {
  const text = String(value || "").trim();
  return /^(n\/a|na|null|none|-)$/i.test(text) ? "" : text;
}

function normalizeImportedRichText(value) {
  let text = String(value || "").trim();
  text = text
    .replace(/&lt;\s*(?:u|ins)\s*&gt;([\s\S]*?)&lt;\s*\/\s*(?:u|ins)\s*&gt;/gi, "__$1__")
    .replace(/<\s*(?:u|ins)(?:\s[^>]*)?>([\s\S]*?)<\s*\/\s*(?:u|ins)\s*>/gi, "__$1__")
    .replace(/\[(?:u|underline)]([\s\S]*?)\[\/(?:u|underline)]/gi, "__$1__")
    .replace(/\+\+([^+\n][\s\S]*?[^+\n])\+\+/g, "__$1__");
  text = text.replace(/(?:[^\u0332\r\n]\u0332)+/gu, (match) => `__${match.replace(/\u0332/g, "")}__`);
  return text.replace(/_{3,}/g, "__");
}

function normalizedPassageText(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function passageSectionKey(question) {
  return normalizedPassageText(question?.section);
}

function passageScopeKey(question) {
  return normalizedPassageText(question?.testClass || question?.subject || "unassigned");
}

function passageGroupKey(question) {
  const groupId = normalizedPassageText(question?.groupId);
  return groupId ? `${passageScopeKey(question)}::${groupId}` : "";
}

function hasPassageMaterial(question) {
  return Boolean(String(question?.passageTitle || question?.passageText || question?.sharedImageUrl || "").trim());
}

function questionContentKey(question) {
  return normalizedPassageText(question?.questionText);
}

function passageMaterialKey(question) {
  return normalizedPassageText(`${question?.passageTitle || ""} ${question?.passageText || ""} ${question?.sharedImageUrl || ""}`);
}

function looksLikeReadingPassageQuestion(question) {
  if (inferQuestionSubject(question) === "math") return false;
  const context = `${question?.section || ""} ${question?.skill || ""} ${question?.questionText || ""}`.toLowerCase();
  return /reading|passage|article|excerpt|poem|story|author|paragraph|central idea|main idea|inferen|evidence|according to|the text/.test(context);
}

function isReadingComprehensionQuestion(question) {
  if (inferQuestionSubject(question) === "math") return false;
  const context = `${question?.section || ""} ${question?.skill || ""}`.toLowerCase();
  if (/grammar|usage|editing|writing|punctuation|sentence correction/.test(context)) return false;
  return hasPassageMaterial(question) && (looksLikeReadingPassageQuestion(question) || /comprehension|literary|informational/.test(context));
}

function inferredPassageGroupId(question) {
  const specificSection = passageSectionKey(question);
  const identity = specificSection && specificSection !== "reading" && specificSection !== "section 1"
    ? `${passageScopeKey(question)}|${specificSection}`
    : `${passageScopeKey(question)}|${normalizedPassageText(question?.passageTitle || question?.passageText || question?.sharedImageUrl)}`;
  return `AUTO-${crypto.createHash("sha1").update(identity || String(question?.id || "passage")).digest("hex").slice(0, 10).toUpperCase()}`;
}

function copyPassageMaterial(question, saved) {
  if (!question || !saved) return;
  if (!question.groupId) question.groupId = saved.groupId || "";
  if (!question.passageTitle) question.passageTitle = saved.passageTitle || "";
  if (!question.passageText) question.passageText = saved.passageText || "";
  if (!question.sharedImageUrl) question.sharedImageUrl = saved.sharedImageUrl || "";
}

function buildCanonicalPassagesByQuestionText(questions) {
  const candidates = new Map();
  (questions || []).forEach((question) => {
    const contentKey = questionContentKey(question);
    const materialKey = passageMaterialKey(question);
    if (contentKey.length < 24 || !materialKey) return;
    if (!candidates.has(contentKey)) candidates.set(contentKey, new Map());
    candidates.get(contentKey).set(materialKey, {
      groupId: String(question.groupId || "").trim(),
      passageTitle: String(question.passageTitle || "").trim(),
      passageText: String(question.passageText || "").trim(),
      sharedImageUrl: String(question.sharedImageUrl || "").trim(),
    });
  });
  const canonical = new Map();
  candidates.forEach((versions, contentKey) => {
    if (versions.size === 1) canonical.set(contentKey, [...versions.values()][0]);
  });
  return canonical;
}

function buildCanonicalPassagesBySection(questions) {
  const candidates = new Map();
  (questions || []).forEach((question) => {
    const sectionKey = passageSectionKey(question);
    if (!sectionKey || !looksLikeReadingPassageQuestion(question) || !question.groupId || !hasPassageMaterial(question)) return;
    const signature = normalizedPassageText(`${question.passageTitle || ""} ${question.passageText || ""} ${question.sharedImageUrl || ""}`);
    if (!signature) return;
    if (!candidates.has(sectionKey)) candidates.set(sectionKey, new Map());
    candidates.get(sectionKey).set(signature, {
      groupId: String(question.groupId || "").trim(),
      passageTitle: String(question.passageTitle || "").trim(),
      passageText: String(question.passageText || "").trim(),
      sharedImageUrl: String(question.sharedImageUrl || "").trim(),
    });
  });
  const canonical = new Map();
  candidates.forEach((versions, sectionKey) => {
    if (versions.size === 1) canonical.set(sectionKey, [...versions.values()][0]);
  });
  return canonical;
}

function fillSharedPassageContent(questions, externalCanonicalPassages = null, externalCanonicalByQuestionText = null) {
  const list = questions || [];
  list.forEach((question) => {
    if (!String(question.groupId || "").trim() && hasPassageMaterial(question)) question.groupId = inferredPassageGroupId(question);
  });

  const fillKnownGroups = () => {
    const groups = new Map();
    list.forEach((question) => {
      const key = passageGroupKey(question);
      if (!key) return;
      const saved = groups.get(key) || { passageTitle: "", passageText: "", sharedImageUrl: "" };
      if (!saved.passageTitle && question.passageTitle) saved.passageTitle = question.passageTitle;
      if (!saved.passageText && question.passageText) saved.passageText = question.passageText;
      if (!saved.sharedImageUrl && question.sharedImageUrl) saved.sharedImageUrl = question.sharedImageUrl;
      groups.set(key, saved);
    });
    list.forEach((question) => copyPassageMaterial(question, groups.get(passageGroupKey(question))));
  };

  fillKnownGroups();

  const ordered = [...list].sort((left, right) =>
    passageScopeKey(left).localeCompare(passageScopeKey(right)) ||
    (Number.parseInt(left.bankNumber, 10) || Number.parseInt(left.number, 10) || Number.parseInt(left.originalNumber, 10) || 0) -
      (Number.parseInt(right.bankNumber, 10) || Number.parseInt(right.number, 10) || Number.parseInt(right.originalNumber, 10) || 0)
  );
  let active = null;
  ordered.forEach((question) => {
    const position = Number.parseInt(question.bankNumber, 10) || Number.parseInt(question.number, 10) || Number.parseInt(question.originalNumber, 10) || 0;
    const scope = passageScopeKey(question);
    const section = passageSectionKey(question);
    if (question.groupId && hasPassageMaterial(question)) {
      active = { scope, section, position, groupId: question.groupId, passageTitle: question.passageTitle, passageText: question.passageText, sharedImageUrl: question.sharedImageUrl };
      return;
    }
    const consecutive = active && (!position || !active.position || position === active.position + 1);
    if (!question.groupId && active && consecutive && scope === active.scope && section === active.section && looksLikeReadingPassageQuestion(question)) {
      question.groupId = active.groupId;
      copyPassageMaterial(question, active);
      active.position = position;
      return;
    }
    if (question.groupId && active && passageGroupKey(question) === passageGroupKey({ ...active, testClass: question.testClass, subject: question.subject })) {
      copyPassageMaterial(question, active);
      active.position = position;
      return;
    }
    active = null;
  });

  fillKnownGroups();
  const canonicalByQuestionText = externalCanonicalByQuestionText || buildCanonicalPassagesByQuestionText(list);
  list.forEach((question) => {
    if (hasPassageMaterial(question) || (!String(question.groupId || "").trim() && !looksLikeReadingPassageQuestion(question))) return;
    const saved = canonicalByQuestionText.get(questionContentKey(question));
    if (saved) copyPassageMaterial(question, saved);
  });
  fillKnownGroups();
  const canonical = externalCanonicalPassages || buildCanonicalPassagesBySection(list);
  list.forEach((question) => {
    if (!looksLikeReadingPassageQuestion(question) || hasPassageMaterial(question)) return;
    const saved = canonical.get(passageSectionKey(question));
    if (!saved) return;
    if (!question.groupId) question.groupId = saved.groupId;
    copyPassageMaterial(question, saved);
  });
  fillKnownGroups();
  return list;
}

function normalizeQuestionIdPrefix(value) {
  return String(value || "Q").trim().toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+/g, "") || "Q";
}

function makeSystemQuestionId(prefix, number) {
  return `${normalizeQuestionIdPrefix(prefix)}${String(number).padStart(4, "0")}`;
}

function nextBankQuestionNumber(bankQuestions) {
  return (bankQuestions || []).reduce((max, question) => Math.max(max, Number.parseInt(question.bankNumber, 10) || 0), 0) + 1;
}

function makeQuestionsFromCsv(text, options = {}) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];

  const headers = rows[0].map(normalizeHeader);
  const questions = [];
  const idPrefix = normalizeQuestionIdPrefix(options.idPrefix || "Q");
  const startNumber = Number.parseInt(options.startNumber, 10) || 1;

  rows.slice(1).forEach((row, index) => {
    const prompt = normalizeImportedRichText(cleanCsvText(getCsvValue(row, headers, ["Question", "Prompt", "Question Text", "Question Prompt", "question_text", "question_prompt"])));
    const correctLetter = cleanCsvText(getCsvValue(row, headers, ["Correct Answer Letter", "Answer Letter", "Answer", "Correct Answer", "Verified Official Key", "correct_answer", "student_answer"])).toUpperCase();
    const correctText = cleanCsvText(getCsvValue(row, headers, ["Correct Answer Text", "Answer Text", "Grid-In Answer", "correct_answer_text"]));
    if (!prompt && !correctLetter && !correctText) return;

    const rawQuestionType = cleanCsvText(getCsvValue(row, headers, ["Question Type", "Type", "question_type"]));
    const type = correctLetter === "GRID-IN" ? "numeric" : normalizeQuestionType(rawQuestionType);
    const isNumeric = type === "numeric";
    const choiceLines = [];
    const choices = [];

    for (let choiceIndex = 1; choiceIndex <= 8; choiceIndex += 1) {
      const fallbackLabel = LETTERS[choiceIndex - 1];
      const label = cleanCsvText(getCsvValue(row, headers, [`Choice ${choiceIndex} Label`, `Choice ${choiceIndex}`, `Choice ${fallbackLabel} Label`, `Option ${fallbackLabel} Label`])).toUpperCase();
      const textValue = cleanCsvText(getCsvValue(row, headers, [`Choice ${choiceIndex} Text`, `Choice ${fallbackLabel}`, `Option ${fallbackLabel}`, `${label} Text`, `${fallbackLabel} Text`]));
      const finalLabel = /^[A-Z]$/.test(label) ? label : fallbackLabel;
      if (finalLabel && (label || textValue)) {
        choices.push(finalLabel);
        if (textValue) choiceLines.push(`${finalLabel}. ${textValue}`);
      }
    }

    const optionText = cleanCsvText(getCsvValue(row, headers, ["Options", "Choices", "Dropdown Options", "Drag Items", "Items"]));
    const dragTargets = parseOptionValues(getCsvValue(row, headers, ["Drop Zones", "Drop Targets", "Target Zones", "Categories"]));
    const gridRows = parseOptionValues(getCsvValue(row, headers, ["Grid Rows", "Table Rows", "Claim Evidence Rows", "Claims", "Statements"]));

    const imageValue = cleanCsvText(getCsvValue(row, headers, ["Question Image", "Question Image ", "Question Image URL", "Image", "Image URL", "Graph", "Graph URL", "Diagram", "Diagram URL", "Picture", "Picture URL", "Visual Description", "Source Note"]));
    const sharedImageValue = cleanCsvText(getCsvValue(row, headers, ["Shared Passage Image", "Shared Image", "Passage Image", "Passage Image URL", "Stimulus Image", "Stimulus Image URL"]));
    const promptImage = findInlineImageReference(prompt);
    const cleanedPrompt = stripInlineImageReferences(prompt);
    const originalNumber = Number.parseInt(cleanCsvText(getCsvValue(row, headers, ["Question #", "Question Number", "Number", "Original Question Number", "original_question_number"])), 10) || index + 1;
    const testClass = cleanCsvText(getCsvValue(row, headers, ["Test / Class", "Test Class", "Class", "Course", "Exam Category", "Bank Category"]));
    const subject = normalizeSubject(getCsvValue(row, headers, ["Subject", "Exam Subject", "Subject Area", "subject"]));
    const section = cleanCsvText(getCsvValue(row, headers, ["Section / Topic", "Section", "Topic", "Subpart"])) || "Section 1";
    const skill = cleanCsvText(getCsvValue(row, headers, ["Skill", "Domain", "Standard", "Official DOK"]));
    const difficulty = Number.parseInt(cleanCsvText(getCsvValue(row, headers, ["Difficulty (1-4)", "Difficulty", "Level", "Difficulty 1 to 4", "difficulty_1_to_4"])), 10) || "";
    const systemNumber = startNumber + questions.length;
    const sourceQuestionId = makeSystemQuestionId(idPrefix, systemNumber);
    const sourceGroupId = cleanCsvText(getCsvValue(row, headers, ["Source Question ID", "Question Family ID", "Original Source ID", "Variant Of", "source_question_id", "question_family_id"]));
    const passageId = cleanCsvText(getCsvValue(row, headers, ["Passage ID", "Passage ID / Group", "Shared Passage ID", "Stimulus ID", "Group", "Group ID", "Passage Group", "passage_group", "group_id"]));
    const passageTitle = cleanCsvText(getCsvValue(row, headers, ["Passage Title", "Stimulus Title", "Title", "Passage T", "passage_title"]));
    const passageText = normalizeImportedRichText(cleanCsvText(getCsvValue(row, headers, ["Passage / Stimulus", "Full Passage / Stimulus", "Full Passage", "Passage Text", "Shared Passage Text", "Stimulus Text", "passage_text", "Passage", "Stimulus", "Reading Passage"])));
    const explanation = cleanCsvText(getCsvValue(row, headers, ["Answer Explanation", "Explanation", "Rationale"]));
    const questionText = [cleanedPrompt, type === "multiple" ? choiceLines.join("\n") : ""].filter(Boolean).join("\n\n");
    const typeChoices = isOptionQuestion(type) ? parseOptionValues(optionText, choiceLines.map((line) => line.replace(/^[A-Z][).]\s*/, ""))) : [...new Set(choices.length ? choices : LETTERS.slice(0, 4))];
    const answerValue = isNumeric ? correctText : type === "multiple" ? correctLetter : correctText || correctLetter;

    questions.push({
      id: uid("q"),
      number: questions.length + 1,
      originalNumber,
      testClass,
      subject: subject || inferQuestionSubject({ testClass, section, skill }),
      type,
      section,
      choices: ["numeric", "equation", "fill_blank"].includes(type) ? [] : typeChoices,
      dragTargets,
      gridRows,
      answer: normalizeAnswerForStorage(answerValue, type),
      imageUrl: isRealImageReference(imageValue) ? imageValue : promptImage,
      sharedImageUrl: isRealImageReference(sharedImageValue) ? sharedImageValue : "",
      questionText,
      groupId: passageId,
      passageTitle,
      passageText,
      questionFont: "",
      points: 1,
      skill,
      difficulty,
      explanation,
      sourceQuestionId,
      sourceGroupId: sourceGroupId || sourceQuestionId,
    });
  });

  return fillSharedPassageContent(questions);
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
      passageTitle: "",
      passageText: "",
      points: 1,
      skill: "",
      difficulty: "",
      explanation: "",
      sourceQuestionId: "",
      questionFont: "",
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
      passageTitle: "",
      passageText: "",
      points: 1,
      skill: "",
      difficulty: "",
      explanation: "",
      sourceQuestionId: "",
      questionFont: "",
    };
  });
}

function makeBlankQuestion(exam) {
  const sortedQuestions = [...exam.questions].sort((left, right) => (left.number || 0) - (right.number || 0));
  const lastQuestion = sortedQuestions[sortedQuestions.length - 1] || {};
  const nextNumber = sortedQuestions.length + 1;
  const lastOriginalNumber = Number.parseInt(lastQuestion.originalNumber || lastQuestion.number, 10) || sortedQuestions.length;
  return {
    id: uid("q"),
    number: nextNumber,
    originalNumber: lastOriginalNumber + 1,
    type: lastQuestion.type || "multiple",
    section: lastQuestion.section || "Section 1",
    choices: Array.isArray(lastQuestion.choices) && lastQuestion.choices.length ? [...lastQuestion.choices] : LETTERS,
    dragTargets: Array.isArray(lastQuestion.dragTargets) ? [...lastQuestion.dragTargets] : [],
    gridRows: Array.isArray(lastQuestion.gridRows) ? [...lastQuestion.gridRows] : [],
    answer: "",
    imageUrl: "",
    sharedImageUrl: "",
    questionText: "",
    groupId: "",
    passageTitle: "",
    passageText: "",
    points: 1,
    skill: "",
    difficulty: "",
    explanation: "",
    sourceQuestionId: "",
    questionFont: "",
  };
}

function makeBankQuestion(question, bankNumber = 1) {
  return {
    ...question,
    id: uid("bank"),
    bankNumber,
    createdAt: new Date().toISOString(),
    updatedAt: "",
  };
}

function cloneBankQuestionForExam(question, index) {
  return {
    id: uid("q"),
    number: index + 1,
    originalNumber: Number.parseInt(question.originalNumber || question.number || index + 1, 10) || index + 1,
    type: normalizeQuestionType(question.type),
    section: String(question.section || "Section 1").trim() || "Section 1",
    testClass: String(question.testClass || "").trim(),
    subject: inferQuestionSubject(question),
    choices: Array.isArray(question.choices) ? [...question.choices] : LETTERS,
    dragTargets: Array.isArray(question.dragTargets) ? [...question.dragTargets] : [],
    gridRows: Array.isArray(question.gridRows) ? [...question.gridRows] : [],
    answer: normalizeAnswerForStorage(question.answer, question.type),
    imageUrl: String(question.imageUrl || "").trim(),
    sharedImageUrl: String(question.sharedImageUrl || "").trim(),
    questionText: String(question.questionText || "").trim(),
    groupId: String(question.groupId || "").trim(),
    passageTitle: String(question.passageTitle || "").trim(),
    passageText: String(question.passageText || "").trim(),
    questionFont: String(question.questionFont || "").trim(),
    points: Number.parseInt(question.points, 10) || 1,
    skill: String(question.skill || "").trim(),
    difficulty: Number.parseInt(question.difficulty, 10) || "",
    explanation: String(question.explanation || "").trim(),
    sourceQuestionId: String(question.sourceQuestionId || question.id || "").trim(),
    sourceGroupId: String(question.sourceGroupId || question.aiSourceQuestionId || question.sourceQuestionId || question.id || "").trim(),
    aiSourceQuestionId: String(question.aiSourceQuestionId || "").trim(),
  };
}

function applyQuestionEdit(question, edit) {
  const recheckAfterEdit = ["testClass", "subject", "section", "originalNumber", "type", "answer", "choices", "dragTargets", "gridRows", "questionText", "groupId", "passageTitle", "passageText", "questionFont", "imageUrl", "sharedImageUrl", "skill", "difficulty", "explanation", "sourceQuestionId", "sourceGroupId"].some((key) => Object.hasOwn(edit, key));
  if (recheckAfterEdit) question.qualityApprovedAt = "";
  if (Object.hasOwn(edit, "testClass")) question.testClass = String(edit.testClass || "").trim();
  if (Object.hasOwn(edit, "subject")) question.subject = normalizeSubject(edit.subject);
  if (Object.hasOwn(edit, "section")) question.section = String(edit.section || question.section || "Section 1").trim();
  if (Object.hasOwn(edit, "originalNumber")) {
    question.originalNumber = Number.parseInt(edit.originalNumber, 10) || question.originalNumber || question.number || 1;
  }
  if (Object.hasOwn(edit, "type")) question.type = normalizeQuestionType(edit.type);
  if (Object.hasOwn(edit, "answer")) question.answer = normalizeAnswerForStorage(edit.answer, question.type);
  if (Object.hasOwn(edit, "choices")) question.choices = isOptionQuestion(question.type) ? parseOptionValues(edit.choices, question.choices || []) : parseChoices(edit.choices, question.choices || LETTERS);
  if (Object.hasOwn(edit, "dragTargets")) question.dragTargets = parseOptionValues(edit.dragTargets, question.dragTargets || []);
  if (Object.hasOwn(edit, "gridRows")) question.gridRows = parseOptionValues(edit.gridRows, question.gridRows || []);
  if (question.type === "multiple" && question.answer && !question.choices.includes(question.answer)) question.choices.push(question.answer);
  if (Object.hasOwn(edit, "questionText")) question.questionText = String(edit.questionText || "").trim();
  if (Object.hasOwn(edit, "groupId")) question.groupId = String(edit.groupId || "").trim();
  if (Object.hasOwn(edit, "passageTitle")) question.passageTitle = String(edit.passageTitle || "").trim();
  if (Object.hasOwn(edit, "passageText")) question.passageText = String(edit.passageText || "").trim();
  if (Object.hasOwn(edit, "questionFont")) question.questionFont = String(edit.questionFont || "").trim();
  if (Object.hasOwn(edit, "imageUrl")) question.imageUrl = String(edit.imageUrl || "").trim();
  if (Object.hasOwn(edit, "sharedImageUrl")) question.sharedImageUrl = String(edit.sharedImageUrl || "").trim();
  if (Object.hasOwn(edit, "skill")) question.skill = String(edit.skill || "").trim();
  if (Object.hasOwn(edit, "difficulty")) question.difficulty = Number.parseInt(edit.difficulty, 10) || "";
  if (Object.hasOwn(edit, "explanation")) question.explanation = String(edit.explanation || "").trim();
  if (Object.hasOwn(edit, "sourceQuestionId")) question.sourceQuestionId = String(edit.sourceQuestionId || "").trim();
  if (Object.hasOwn(edit, "sourceGroupId")) question.sourceGroupId = String(edit.sourceGroupId || question.sourceQuestionId || question.id || "").trim();
  if (Object.hasOwn(edit, "qualityApprovedAt")) question.qualityApprovedAt = String(edit.qualityApprovedAt || "").trim();
  question.updatedAt = new Date().toISOString();
}

function bankQuestionSort(left, right) {
  return (
    (Number.parseInt(left.bankNumber, 10) || 0) - (Number.parseInt(right.bankNumber, 10) || 0) ||
    String(left.sourceQuestionId || "").localeCompare(String(right.sourceQuestionId || "")) ||
    String(left.section || "").localeCompare(String(right.section || "")) ||
    (Number.parseInt(left.originalNumber, 10) || 0) - (Number.parseInt(right.originalNumber, 10) || 0)
  );
}

function getPassageUnitKey(question) {
  const group = String(question?.groupId || question?.passageTitle || "").trim().toLowerCase();
  if (!group) return "";
  const scope = String(question?.testClass || question?.subject || "bank").trim().toLowerCase();
  const material = passageMaterialKey(question);
  const materialId = material ? crypto.createHash("sha1").update(material).digest("hex").slice(0, 12) : "missing";
  return `${scope}::${group}::${materialId}`;
}

function sortExamQuestionsInSourceOrder(questions) {
  return [...(questions || [])]
    .sort((left, right) =>
      (Number.parseInt(left.number, 10) || Number.parseInt(left.originalNumber, 10) || 0) -
        (Number.parseInt(right.number, 10) || Number.parseInt(right.originalNumber, 10) || 0)
    )
    .map((question, index) => ({ ...question, number: index + 1 }));
}

function expandCompletePassageSelection(questionBank, requestedQuestions) {
  const requestedIds = new Set((requestedQuestions || []).map((question) => question.id));
  const passageKeys = new Set((requestedQuestions || []).map(getPassageUnitKey).filter(Boolean));
  return (questionBank || [])
    .filter((question) => requestedIds.has(question.id) || passageKeys.has(getPassageUnitKey(question)))
    .sort(bankQuestionSort);
}

function resolveStrictMixSelection(questionBank, requestedQuestions) {
  const expandedQuestions = expandCompletePassageSelection(questionBank, requestedQuestions);
  const requestedResolution = selectOneQuestionPerSourceGroup(requestedQuestions);
  const expandedResolution = selectOneQuestionPerSourceGroup(expandedQuestions);
  const requestedSources = new Set(requestedResolution.selected.map(getQuestionSourceGroupId));
  const requestedContent = new Set(requestedResolution.selected.map(getQuestionContentSignature).filter((signature) => signature.length >= 24));
  const missingCompanions = expandedResolution.selected.filter((question) => {
    const source = getQuestionSourceGroupId(question);
    const signature = getQuestionContentSignature(question);
    return !requestedSources.has(source) && !(signature.length >= 24 && requestedContent.has(signature));
  });
  return {
    selected: requestedResolution.selected,
    omitted: requestedResolution.omitted,
    expandedQuestions,
    missingCompanions,
  };
}

function validateExamMixConstraints(questions, constraints) {
  if (!constraints || typeof constraints !== "object") return "";
  const list = Array.isArray(questions) ? questions : [];
  const expectedTarget = Math.max(0, Number.parseInt(constraints.target, 10) || 0);
  const expectedTypes = Object.fromEntries([...QUESTION_TYPES].map((type) => [type, Math.max(0, Number.parseInt(constraints.typeCounts?.[type], 10) || 0)]));
  const actualTypes = Object.fromEntries([...QUESTION_TYPES].map((type) => [type, 0]));
  list.forEach((question) => {
    actualTypes[normalizeQuestionType(question.type)] += 1;
  });
  const typeMismatches = [...QUESTION_TYPES]
    .filter((type) => actualTypes[type] !== expectedTypes[type])
    .map((type) => `${type.replaceAll("_", " ")}: ${actualTypes[type]}/${expectedTypes[type]}`);
  const expectedReading = Math.max(0, Number.parseInt(constraints.readingTarget, 10) || 0);
  const actualReading = list.filter(isReadingComprehensionQuestion).length;
  const allowedDifficulties = new Set(
    (Array.isArray(constraints.difficultyLevels) ? constraints.difficultyLevels : [])
      .map((level) => Number.parseInt(level, 10))
      .filter((level) => level >= 1 && level <= 4)
  );
  const wrongDifficulty = allowedDifficulties.size
    ? list.filter((question) => !allowedDifficulties.has(Number.parseInt(question.difficulty, 10)))
    : [];
  const problems = [];
  if (expectedTarget && list.length !== expectedTarget) problems.push(`total questions: ${list.length}/${expectedTarget}`);
  if (typeMismatches.length) problems.push(`answer formats (${typeMismatches.join(", ")})`);
  if (actualReading !== expectedReading) problems.push(`reading comprehension: ${actualReading}/${expectedReading}`);
  if (wrongDifficulty.length) problems.push(`${wrongDifficulty.length} question${wrongDifficulty.length === 1 ? " is" : "s are"} outside the selected difficulty levels`);
  return problems.join("; ");
}

function getQuestionSourceGroupId(question) {
  return String(question?.sourceGroupId || question?.aiSourceQuestionId || question?.sourceQuestionId || question?.id || "").trim().toLowerCase();
}

function normalizeQuestionReusePolicy(value) {
  return ["never_used", "different_program", "allow_previous"].includes(value) ? value : "never_used";
}

function normalizeProgramKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getReusePolicyBlockedQuestionIds(data, reusePolicy, program) {
  const policy = normalizeQuestionReusePolicy(reusePolicy);
  if (policy === "allow_previous") return new Set();
  const programKey = normalizeProgramKey(program);
  const blocked = new Set();
  (data.exams || []).forEach((exam) => {
    if (policy === "different_program" && normalizeProgramKey(exam.program) !== programKey) return;
    (exam.questions || []).forEach((question) => {
      const id = getQuestionSourceGroupId(question);
      if (id) blocked.add(id);
    });
  });
  return blocked;
}

function validateQuestionReusePolicy(data, selectedQuestions, reusePolicy, program) {
  const policy = normalizeQuestionReusePolicy(reusePolicy);
  const cleanProgram = String(program || "").trim();
  if (policy === "different_program" && !cleanProgram) {
    return "Enter a Program / Course name to use the program-specific reuse policy";
  }
  const blocked = getReusePolicyBlockedQuestionIds(data, policy, cleanProgram);
  const repeated = (selectedQuestions || []).filter((question) => blocked.has(getQuestionSourceGroupId(question)));
  if (!repeated.length) return "";
  const labels = repeated.slice(0, 8).map((question) => question.sourceQuestionId || question.id).join(", ");
  if (policy === "different_program") {
    return `${repeated.length} selected question${repeated.length === 1 ? " was" : "s were"} already used in program \"${cleanProgram}\" (${labels})`;
  }
  return `${repeated.length} selected question${repeated.length === 1 ? " was" : "s were"} already used in an existing exam (${labels})`;
}

function getStudentSeenQuestionSourceIds(data, studentId) {
  const student = (data.students || []).find((item) => item.id === studentId);
  if (!student) return null;
  const seen = new Set();
  const examIds = new Set();
  [...(data.submissions || []), ...(data.attempts || [])].forEach((record) => {
    const matches =
      record.studentRecordId === student.id ||
      String(record.studentId || "").trim().toLowerCase() === String(student.studentNumber || "").trim().toLowerCase() ||
      (!record.studentId && String(record.studentName || "").trim().toLowerCase() === String(student.name || "").trim().toLowerCase());
    if (!matches) return;
    if (record.examId) examIds.add(record.examId);
    (record.questionSourceGroupIds || []).forEach((id) => seen.add(String(id || "").trim().toLowerCase()));
  });
  (student.scoreHistory || []).forEach((record) => {
    if (record.examId) examIds.add(record.examId);
    (record.questionSourceGroupIds || []).forEach((id) => seen.add(String(id || "").trim().toLowerCase()));
  });
  (data.exams || []).forEach((exam) => {
    if (!examIds.has(exam.id)) return;
    (exam.questions || []).forEach((question) => seen.add(getQuestionSourceGroupId(question)));
  });
  seen.delete("");
  return seen;
}

function getQuestionContentSignature(question) {
  return normalizedPassageText(`${question?.passageTitle || ""} ${question?.passageText || ""} ${question?.questionText || ""}`);
}

function selectOneQuestionPerSourceGroup(questions) {
  const groups = new Set();
  const contentSignatures = new Set();
  const selected = [];
  const omitted = [];
  [...questions]
    .sort((left, right) => {
      const leftGenerated = left.aiGenerated || left.aiSourceQuestionId ? 1 : 0;
      const rightGenerated = right.aiGenerated || right.aiSourceQuestionId ? 1 : 0;
      const leftMissingPassage = String(left.groupId || "").trim() && !hasPassageMaterial(left) ? 1 : 0;
      const rightMissingPassage = String(right.groupId || "").trim() && !hasPassageMaterial(right) ? 1 : 0;
      return leftMissingPassage - rightMissingPassage || leftGenerated - rightGenerated || bankQuestionSort(left, right);
    })
    .forEach((question) => {
      const groupId = getQuestionSourceGroupId(question);
      const contentSignature = getQuestionContentSignature(question);
      if (groups.has(groupId) || (contentSignature.length >= 24 && contentSignatures.has(contentSignature))) {
        omitted.push(question);
        return;
      }
      groups.add(groupId);
      if (contentSignature.length >= 24) contentSignatures.add(contentSignature);
      selected.push(question);
    });
  return { selected, omitted };
}

function resolveBankQuestionsByIds(questionBank, requestedIds, existingQuestions = []) {
  const ids = (Array.isArray(requestedIds) ? requestedIds : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const normalizedIds = ids.map((value) => value.toLowerCase());
  const duplicateRequests = [...new Set(normalizedIds.filter((value, index) => normalizedIds.indexOf(value) !== index))];
  const existingSourceGroups = new Set((existingQuestions || []).map(getQuestionSourceGroupId).filter(Boolean));
  const existingContent = new Set(
    (existingQuestions || []).map(getQuestionContentSignature).filter((signature) => signature.length >= 24)
  );
  const selectedSourceGroups = new Set();
  const selectedContent = new Set();
  const missing = [];
  const ambiguous = [];
  const invalid = [];
  const repeated = [];
  const selected = [];

  ids.forEach((requestedId) => {
    const lookupId = requestedId.toLowerCase();
    if (duplicateRequests.includes(lookupId)) return;
    const matches = (questionBank || []).filter((question) =>
      [question.id, question.sourceQuestionId].some((value) => String(value || "").trim().toLowerCase() === lookupId)
    );
    if (!matches.length) {
      missing.push(requestedId);
      return;
    }
    const materialVersions = new Set(matches.map(getQuestionContentSignature).filter(Boolean));
    if (materialVersions.size > 1) {
      ambiguous.push(requestedId);
      return;
    }
    const question = [...matches].sort((left, right) => {
      const leftMissingPassage = String(left.groupId || "").trim() && !hasPassageMaterial(left) ? 1 : 0;
      const rightMissingPassage = String(right.groupId || "").trim() && !hasPassageMaterial(right) ? 1 : 0;
      const leftGenerated = left.aiGenerated || left.aiSourceQuestionId ? 1 : 0;
      const rightGenerated = right.aiGenerated || right.aiSourceQuestionId ? 1 : 0;
      return leftMissingPassage - rightMissingPassage || leftGenerated - rightGenerated || bankQuestionSort(left, right);
    })[0];
    const issues = getQuestionReadinessIssues(question);
    if (issues.length) {
      invalid.push({ id: requestedId, issues });
      return;
    }
    const sourceGroup = getQuestionSourceGroupId(question);
    const contentSignature = getQuestionContentSignature(question);
    if (
      existingSourceGroups.has(sourceGroup) ||
      selectedSourceGroups.has(sourceGroup) ||
      (contentSignature.length >= 24 && (existingContent.has(contentSignature) || selectedContent.has(contentSignature)))
    ) {
      repeated.push(requestedId);
      return;
    }
    selectedSourceGroups.add(sourceGroup);
    if (contentSignature.length >= 24) selectedContent.add(contentSignature);
    selected.push(question);
  });

  return { requested: ids, selected, duplicateRequests, missing, ambiguous, invalid, repeated };
}

function bankIdSelectionError(result) {
  const problems = [];
  if (!result.requested.length) problems.push("No question IDs were provided");
  if (result.duplicateRequests.length) problems.push(`repeated IDs in the list: ${result.duplicateRequests.slice(0, 8).join(", ")}`);
  if (result.missing.length) problems.push(`IDs not found: ${result.missing.slice(0, 8).join(", ")}`);
  if (result.ambiguous.length) problems.push(`IDs matching different bank questions: ${result.ambiguous.slice(0, 8).join(", ")}`);
  if (result.invalid.length) {
    problems.push(`questions needing repair: ${result.invalid.slice(0, 6).map((item) => `${item.id} (${item.issues.join(", ")})`).join("; ")}`);
  }
  if (result.repeated.length) problems.push(`questions already present or duplicated by content: ${result.repeated.slice(0, 8).join(", ")}`);
  return problems.length ? `Nothing was changed. Fix these question-ID problems: ${problems.join(". ")}.` : "";
}

function parseStructuredAnswer(value) {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function getStructuredQuestionQualityIssues(question) {
  const issues = [];
  const type = normalizeQuestionType(question?.type);
  const questionText = String(question?.questionText || "");
  const passageText = String(question?.passageText || "");
  const choices = Array.isArray(question?.choices) ? question.choices.map((item) => String(item).trim()).filter(Boolean) : [];
  const mapping = parseStructuredAnswer(question?.answer);
  if (/underlin(?:e|ed|ing)/i.test(questionText) && !/__(?:[^_\n]+)__|<u>[\s\S]*?<\/u>/i.test(`${questionText}\n${passageText}`)) {
    issues.push("mentions underlined text but no underline markup");
  }
  if (type === "dropdown" && (questionText.match(/\[\[blank\]\]/g) || []).length !== 1) issues.push("dropdown needs exactly one [[blank]]");
  if (type === "drag_drop") {
    const targets = Array.isArray(question?.dragTargets) ? question.dragTargets.map((item) => String(item).trim()).filter(Boolean) : [];
    if (choices.length < 3) issues.push("drag-and-drop needs at least 3 items");
    if (targets.length < 2) issues.push("drag-and-drop needs at least 2 categories");
    if (choices.length && targets.length && (!choices.every((item) => targets.includes(mapping[item])) || new Set(Object.values(mapping)).size < 2)) {
      issues.push("drag mapping must place every item across categories");
    }
  }
  if (type === "table_grid") {
    const rows = Array.isArray(question?.gridRows) ? question.gridRows.map((item) => String(item).trim()).filter(Boolean) : [];
    const weakLabels = choices.filter((label) => /^(best answer|not best answer|correct|incorrect|true|false|yes|no|[a-e])$/i.test(label));
    if (rows.length < 2) issues.push("table needs at least 2 statements");
    if (weakLabels.length) issues.push("table needs meaningful evidence labels, not correct/incorrect");
    if (rows.length && choices.length && (!rows.every((_, index) => choices.includes(mapping[String(index + 1)])) || new Set(Object.values(mapping)).size < 2)) {
      issues.push("table rows need different meaningful answer labels");
    }
  }
  return issues;
}

function extractMultipleChoiceTextByLabel(questionText, labels = LETTERS) {
  const result = {};
  String(questionText || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([A-Z])[\).]\s*(.+)$/);
      if (match && labels.includes(match[1])) result[match[1]] = match[2].trim();
    });
  return result;
}

function getQuestionReadinessIssues(question) {
  const mandatoryIssues = String(question?.groupId || "").trim() && !hasPassageMaterial(question)
    ? ["missing linked passage"]
    : [];
  if (String(question?.qualityApprovedAt || "").trim()) return mandatoryIssues;
  const issues = [...mandatoryIssues];
  const type = normalizeQuestionType(question?.type);
  const choices = Array.isArray(question?.choices) ? question.choices.map(String) : [];
  const answer = String(question?.answer || "").trim();
  if (!String(question?.questionText || "").trim() && !String(question?.imageUrl || "").trim()) issues.push("missing question");
  if (!answer) issues.push("missing answer");
  if (["multiple", "dropdown", "drag_drop", "table_grid", "hot_text", "hotspot"].includes(type) && !choices.length) issues.push("missing choices");
  if (type === "multiple" && answer && !choices.includes(answer.toUpperCase())) issues.push("answer not in choices");
  if (type === "multiple") {
    const labels = choices.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean);
    const choiceText = extractMultipleChoiceTextByLabel(question?.questionText, labels);
    const missingText = labels.filter((label) => /^[A-Z]$/.test(label) && !choiceText[label]);
    if (missingText.length) issues.push("answer text missing for " + missingText.join(", "));
  }
  if (type === "dropdown" && answer && !choices.includes(answer)) issues.push("dropdown answer not in options");
  if (type === "drag_drop" && (!Array.isArray(question?.dragTargets) || !question.dragTargets.length)) issues.push("missing drop zones");
  if (type === "table_grid" && (!Array.isArray(question?.gridRows) || !question.gridRows.length)) issues.push("missing table rows");
  if (type === "hot_text" && answer && !answer.split(/[;|\n]+/).map((item) => item.trim()).filter(Boolean).every((item) => choices.includes(item))) issues.push("hot text answer not selectable");
  if (type === "hotspot" && !String(question?.imageUrl || "").trim()) issues.push("missing hot spot image");
  return [...issues, ...getStructuredQuestionQualityIssues(question)];
}

function renumberQuestions(questions) {
  questions
    .sort((left, right) => (left.number || 0) - (right.number || 0))
    .forEach((question, index) => {
      question.number = index + 1;
      if (!question.originalNumber) question.originalNumber = question.number;
    });
}

function buildDisplayOrder(exam, randomFn = Math.random) {
  const units = [];
  const grouped = new Map();
  const questionById = new Map(exam.questions.map((question) => [question.id, question]));

  exam.questions.forEach((question) => {
    const groupId = String(question.groupId || question.passageTitle || "").trim();
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

  const displayUnits = exam.shuffle ? shuffle(units, randomFn) : units;
  return displayUnits.flatMap((unit) =>
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
    severity: String(event.severity || "medium").slice(0, 20),
    category: String(event.category || "Lockdown").slice(0, 40),
    detail: String(event.detail || "").slice(0, 160),
    durationMs: Math.max(0, Number.parseInt(event.durationMs, 10) || 0),
    elapsedSeconds: Math.max(0, Number.parseInt(event.elapsedSeconds, 10) || 0),
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
    adaptive: Boolean(exam.adaptive),
    displayOrder: buildDisplayOrder(exam),
    questions: exam.questions.map(({ answer, explanation, sourceQuestionId, sourceGroupId, aiSourceQuestionId, ...question }) => question),
  };
}

function sameAttemptStudent(attempt, studentId, studentName) {
  const normalizedStudentId = String(studentId || "").trim().toLowerCase();
  const normalizedAttemptId = String(attempt.studentId || "").trim().toLowerCase();
  if (normalizedStudentId && normalizedAttemptId) return normalizedAttemptId === normalizedStudentId;
  return String(attempt.studentName || "").trim().toLowerCase() === String(studentName || "").trim().toLowerCase();
}

function hasSubmittedCombinedSubject(data, examId, studentId, studentName) {
  return (data.submissions || []).some((submission) => submission.examId === examId && sameAttemptStudent(submission, studentId, studentName));
}

function findBlockingCombinedAttempt(data, exam, studentId, studentName, options = {}) {
  const code = String(exam.code || "").toUpperCase();
  if (!code) return null;
  return (data.attempts || []).find((attempt) => {
    if (attempt.status === "submitted" || attempt.submissionId || attempt.examId === exam.id) return false;
    if (options.completedExamId && attempt.examId === options.completedExamId) return false;
    if (hasSubmittedCombinedSubject(data, attempt.examId, studentId, studentName)) return false;
    const attemptExam = (data.exams || []).find((item) => item.id === attempt.examId);
    if (!attemptExam || String(attemptExam.code || "").toUpperCase() !== code) return false;
    return sameAttemptStudent(attempt, studentId, studentName);
  });
}

function sanitizeSubmissionForStudent(submission) {
  return {
    id: submission.id,
    examId: submission.examId,
    studentName: submission.studentName,
    submittedAt: submission.submittedAt,
    violations: submission.violations,
    score: {
      rawScore: submission.score.rawScore,
      shsatOriginal: submission.score.shsatOriginal || null,
      rows: submission.score.rows.map(({ questionId, number, originalNumber, section, studentAnswer }) => ({
        questionId,
        number,
        originalNumber,
        section,
        studentAnswer,
      })),
    },
  };
}

function shuffle(items, randomFn = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFn() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function scoreSubmission(exam, answers) {
  const rows = [...exam.questions]
    .sort((a, b) => a.number - b.number)
    .map((question) => {
      const studentAnswer = normalizeSubmittedAnswer(answers[question.id], question.type);
      const correctAnswers = (["drag_drop", "table_grid", "hot_text"].includes(normalizeQuestionType(question.type)) ? [question.answer] : splitAcceptedAnswers(question.answer))
        .map((answer) => normalizeSubmittedAnswer(answer, question.type))
        .filter(Boolean);
      const correctAnswer = correctAnswers.join(" / ");
      const correct = Boolean(studentAnswer && correctAnswers.length) && correctAnswers.some((answer) => answersMatch(studentAnswer, answer, question.type));
      return {
        questionId: question.id,
        number: question.number,
        originalNumber: question.originalNumber || question.number,
        section: question.section,
        questionText: question.questionText || "",
        passageTitle: question.passageTitle || "",
        choices: Array.isArray(question.choices) ? [...question.choices] : [],
        questionType: question.type || "multiple",
        skill: question.skill || "",
        difficulty: question.difficulty || "",
        explanation: question.explanation || "",
        studentAnswer,
        correctAnswer,
        correct,
        points: question.points || 1,
        earned: correct ? question.points || 1 : 0,
      };
    });

  const earned = rows.reduce((sum, row) => sum + row.earned, 0);
  const possible = rows.reduce((sum, row) => sum + row.points, 0);
  const rawScore = rows.filter((row) => row.correct).length;
  const shsatOriginal = exam.scoringMode === "shsat_original"
    ? {
        rawScore,
        convertedScore: SHSAT_ORIGINAL_SCORE_CONVERSION[rawScore] ?? null,
        chart: "original",
        eligible: rows.length === 50 && Object.prototype.hasOwnProperty.call(SHSAT_ORIGINAL_SCORE_CONVERSION, rawScore),
        note:
          rows.length !== 50
            ? "Original SHSAT conversion is available only for a 50-question exam."
            : rawScore === 0
              ? "The original chart provided starts at raw score 1; no converted value is assigned for raw score 0."
              : "Converted with the supplied Original SHSAT chart.",
      }
    : null;
  return {
    earned,
    possible,
    percent: possible ? Math.round((earned / possible) * 100) : 0,
    rawScore,
    rows,
    satEstimate: estimateSatScore(rows),
    shsatOriginal,
  };
}

function splitAcceptedAnswers(value) {
  return String(value || "")
    .split(/\s*(?:,|;|\||\bor\b)\s*/i)
    .map((answer) => answer.trim())
    .filter(Boolean);
}

function normalizeSubmittedAnswer(value, type = "multiple") {
  const normalizedType = normalizeQuestionType(type);
  if (["drag_drop", "table_grid"].includes(normalizedType)) return normalizeDragMapping(value);
  if (normalizedType === "hot_text") return normalizeHotTextAnswer(value);
  if (normalizedType === "equation") return normalizeEquation(value);
  const raw = String(value || "").trim();
  if (normalizedType !== "numeric") return raw.toUpperCase();
  return raw
    .replace(/\s+/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/[(){}\[\]]/g, "")
    .replace(/⁄/g, "/")
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .replace(/\*/g, "")
    .replace(/π/gi, "PI")
    .replace(/√\(([^)]+)\)/g, "SQRT$1")
    .replace(/√\s*/g, "SQRT")
    .replace(/SQRT\(([^)]+)\)/gi, "SQRT$1")
    .replace(/\^2/g, "²")
    .replace(/\^3/g, "³")
    .replace(/SQUAREROOT/gi, "SQRT")
    .toUpperCase();
}

function normalizeHotTextAnswer(value) {
  return [...new Set(String(value || "")
    .split(/[;|\n]+/)
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean))]
    .sort()
    .join("|");
}

function normalizeEquation(value) {
  return String(value || "").trim()
    .replace(/\s+/g, "")
    .replace(/[−–—]/g, "-")
    .replace(/[×·]/g, "*")
    .replace(/[÷⁄]/g, "/")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/≠/g, "!=")
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√\(([^)]+)\)/g, "SQRT($1)")
    .replace(/√/g, "SQRT")
    .toUpperCase();
}

function answersMatch(studentAnswer, correctAnswer, type = "multiple") {
  if (studentAnswer === correctAnswer) return true;
  if (normalizeQuestionType(type) !== "numeric") return false;
  const studentNumber = parseComparableNumber(studentAnswer);
  const correctNumber = parseComparableNumber(correctAnswer);
  if (studentNumber == null || correctNumber == null) return false;
  return Math.abs(studentNumber - correctNumber) < 0.000001;
}

function normalizeDragMapping(value) {
  let entries = [];
  if (value && typeof value === "object" && !Array.isArray(value)) entries = Object.entries(value);
  else {
    const raw = String(value || "").trim();
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) entries = Object.entries(parsed);
    } catch (_) {
      entries = raw
        .split(/[;\n|]+/)
        .map((part) => part.split(/\s*(?:=>|=|:)\s*/, 2))
        .filter(([item, target]) => String(item || "").trim() && String(target || "").trim());
    }
  }
  return entries
    .map(([item, target]) => `${String(item).trim().toUpperCase()}=>${String(target).trim().toUpperCase()}`)
    .sort()
    .join("|");
}

function parseComparableNumber(value) {
  const text = String(value || "").trim().toUpperCase();
  if (!text) return null;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  const fraction = text.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator ? Number(fraction[1]) / denominator : null;
  }
  const sqrt = text.match(/^SQRT(-?\d+(?:\.\d+)?)$/);
  if (sqrt) {
    const valueNumber = Number(sqrt[1]);
    return valueNumber >= 0 ? Math.sqrt(valueNumber) : null;
  }
  if (text === "PI") return Math.PI;
  const piMultiple = text.match(/^(-?\d+(?:\.\d+)?)PI$/);
  if (piMultiple) return Number(piMultiple[1]) * Math.PI;
  return null;
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

function normalizedRequestHost(req) {
  return String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
}

function isDemoAdminHost(req) {
  return DEMO_ADMIN_HOSTS.has(normalizedRequestHost(req));
}

function sendJson(res, status, data) {
  const payload = JSON.stringify(data);
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };
  if (res.topwayAcceptsGzip && Buffer.byteLength(payload) > 1024) {
    headers["Content-Encoding"] = "gzip";
    headers.Vary = "Accept-Encoding";
    zlib.gzip(payload, { level: 1 }, (error, compressed) => {
      if (res.writableEnded) return;
      if (error) {
        delete headers["Content-Encoding"];
        delete headers.Vary;
        res.writeHead(status, headers);
        res.end(payload);
        return;
      }
      res.writeHead(status, headers);
      res.end(compressed);
    });
    return;
  }
  res.writeHead(status, headers);
  res.end(payload);
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
  let filePath = path.join(__dirname, fileName);
  // If the requested /assets logo was flattened to the repository root,
  // transparently serve that copy instead.
  if (!fs.existsSync(filePath) && fileName.startsWith("assets/")) {
    const rootLogoPath = path.join(__dirname, path.basename(fileName));
    if (fs.existsSync(rootLogoPath)) filePath = rootLogoPath;
  }
  if (!fs.existsSync(filePath)) {
    if (fileName === "assets/topway-prep-logo.png" && FALLBACK_LOGO_BASE64) {
      const logoBuffer = Buffer.from(FALLBACK_LOGO_BASE64, "base64");
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=31536000, immutable" });
      res.end(logoBuffer);
      return;
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" });
    res.end("Not found");
    return;
  }
  const type = fileName.endsWith(".css")
    ? "text/css; charset=utf-8"
    : fileName.endsWith(".js")
      ? "text/javascript; charset=utf-8"
      : fileName.endsWith(".png")
        ? "image/png"
        : "text/html; charset=utf-8";
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("File read error");
  });
  const cacheControl = fileName.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": cacheControl });
  stream.pipe(res);
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  res.topwayAcceptsGzip = /(?:^|,)\s*gzip\b/.test(String(req.headers["accept-encoding"] || ""));

  try {
    if (req.method === "POST" && url.pathname === "/api/admin/login") {
      const body = await readBody(req);
      if (body.demo === true && isDemoAdminHost(req)) {
        const token = crypto.randomBytes(24).toString("hex");
        sessions.add(token);
        return sendJson(res, 200, { token, demo: true });
      }
      if (body.password !== ADMIN_PASSWORD) return sendJson(res, 401, { error: "Admin access denied." });
      const token = crypto.randomBytes(24).toString("hex");
      sessions.add(token);
      return sendJson(res, 200, { token });
    }

    if (url.pathname.startsWith("/api/admin/") && !isAdmin(req)) {
      return sendJson(res, 401, { error: "Admin login required." });
    }

    const data = await loadData();

    if (req.method === "GET" && url.pathname === "/api/admin/state") {
      return sendJson(res, 200, data);
    }

    if (req.method === "GET" && url.pathname === "/api/admin/export") {
      return sendJson(res, 200, {
        exportedAt: new Date().toISOString(),
        app: "Topway Prep Testing System",
        version: 1,
        counts: {
          exams: data.exams.length,
          submissions: data.submissions.length,
          students: data.students.length,
          attempts: data.attempts.length,
          classes: data.classes.length,
          questionBank: data.questionBank.length,
        },
        data,
      });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/restore") {
      const body = await readBody(req);
      const importedData = body?.data || body;
      if (!looksLikeTopwayData(importedData)) return sendJson(res, 400, { error: "This file does not look like a Topway backup." });
      const restoredData = normalizeData(importedData);
      await saveData(restoredData);
      return sendJson(res, 200, restoredData);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/classes") {
      const body = await readBody(req);
      const name = String(body.name || "").trim();
      if (!name) return sendJson(res, 400, { error: "Class name is required." });

      data.classes.unshift({
        id: uid("class"),
        name,
        term: String(body.term || "Unassigned").trim() || "Unassigned",
        schedule: String(body.schedule || "").trim(),
        teacher: String(body.teacher || "").trim(),
        room: String(body.room || "").trim(),
        notes: String(body.notes || "").trim(),
        linkedExamIds: Array.isArray(body.linkedExamIds) ? body.linkedExamIds.map((id) => String(id || "").trim()).filter(Boolean) : [],
        createdAt: new Date().toISOString(),
      });
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const updateClassMatch = url.pathname.match(/^\/api\/admin\/classes\/([^/]+)$/);
    if (req.method === "POST" && updateClassMatch) {
      const body = await readBody(req);
      const classRecord = data.classes.find((item) => item.id === updateClassMatch[1]);
      if (!classRecord) return sendJson(res, 404, { error: "Class not found." });

      const name = String(body.name || classRecord.name || "").trim();
      if (!name) return sendJson(res, 400, { error: "Class name is required." });

      classRecord.name = name;
      classRecord.term = String(body.term || "Unassigned").trim() || "Unassigned";
      classRecord.schedule = String(body.schedule || "").trim();
      classRecord.teacher = String(body.teacher || "").trim();
      classRecord.room = String(body.room || "").trim();
      classRecord.notes = String(body.notes || "").trim();
      classRecord.linkedExamIds = Array.isArray(body.linkedExamIds)
        ? body.linkedExamIds.map((id) => String(id || "").trim()).filter(Boolean)
        : Array.isArray(classRecord.linkedExamIds)
          ? classRecord.linkedExamIds
          : [];
      classRecord.updatedAt = new Date().toISOString();
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const deleteClassMatch = url.pathname.match(/^\/api\/admin\/classes\/([^/]+)$/);
    if (req.method === "DELETE" && deleteClassMatch) {
      const classIndex = data.classes.findIndex((item) => item.id === deleteClassMatch[1]);
      if (classIndex < 0) return sendJson(res, 404, { error: "Class not found." });
      const [deletedClass] = data.classes.splice(classIndex, 1);
      data.students.forEach((student) => {
        if (student.classId === deletedClass.id) student.classId = "";
      });
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const linkClassStudentMatch = url.pathname.match(/^\/api\/admin\/classes\/([^/]+)\/link-student$/);
    if (req.method === "POST" && linkClassStudentMatch) {
      const body = await readBody(req);
      const classRecord = data.classes.find((item) => item.id === linkClassStudentMatch[1]);
      if (!classRecord) return sendJson(res, 404, { error: "Class not found." });
      const student = data.students.find((item) => item.id === String(body.studentId || ""));
      if (!student) return sendJson(res, 404, { error: "Student not found." });
      attachStudentToClass(data, student, classRecord);
      classRecord.updatedAt = new Date().toISOString();
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const linkClassSubmissionMatch = url.pathname.match(/^\/api\/admin\/classes\/([^/]+)\/link-submission$/);
    if (req.method === "POST" && linkClassSubmissionMatch) {
      const body = await readBody(req);
      const classRecord = data.classes.find((item) => item.id === linkClassSubmissionMatch[1]);
      if (!classRecord) return sendJson(res, 404, { error: "Class not found." });
      const submission = data.submissions.find((item) => item.id === String(body.submissionId || ""));
      if (!submission) return sendJson(res, 404, { error: "Saved report not found." });
      submission.classId = classRecord.id;
      data.attempts.forEach((attempt) => {
        if (attempt.submissionId === submission.id || attempt.id === submission.attemptId) attempt.classId = classRecord.id;
      });
      const linkedStudent = data.students.find(
        (student) =>
          student.id === submission.studentRecordId ||
          String(student.studentNumber || "").toLowerCase() === String(submission.studentId || "").toLowerCase()
      );
      if (linkedStudent) attachStudentToClass(data, linkedStudent, classRecord);
      classRecord.updatedAt = new Date().toISOString();
      await saveData(data);
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/students") {
      const body = await readBody(req);
      const studentNumber = String(body.studentNumber || "").trim();
      const name = String(body.name || "").trim();
      if (!studentNumber || !name) return sendJson(res, 400, { error: "Student ID and name are required." });

      const duplicate = data.students.find((student) => String(student.studentNumber || "").toLowerCase() === studentNumber.toLowerCase());
      if (duplicate) return sendJson(res, 400, { error: "A student already uses that ID." });

      const matchingStudent = findDuplicateStudent(data.students, { ...body, name });
      if (matchingStudent) {
        return sendJson(res, 409, {
          error: `Possible duplicate: ${matchingStudent.name} (${matchingStudent.studentNumber}) already has the same name and contact/address information.`,
          duplicateStudentId: matchingStudent.id,
        });
      }

      const student = {
        id: uid("stu"),
        studentNumber,
        name,
        group: String(body.group || "Ungrouped").trim() || "Ungrouped",
        term: String(body.term || "Unassigned").trim() || "Unassigned",
        classId: String(body.classId || "").trim(),
        status: String(body.status || "Active").trim() || "Active",
        grade: String(body.grade || "").trim(),
        school: String(body.school || "").trim(),
        email: String(body.email || "").trim(),
        phone: String(body.phone || "").trim(),
        address: String(body.address || "").trim(),
        parentName: String(body.parentName || "").trim(),
        parentPhone: String(body.parentPhone || "").trim(),
        tags: String(body.tags || "").trim(),
        notes: String(body.notes || "").trim(),
        logEntries: [],
        scoreHistory: [],
        deletedScoreHistoryKeys: [],
        createdAt: new Date().toISOString(),
      };
      data.students.unshift(student);
      linkExistingSubmissionsToStudent(data, student);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const updateStudentMatch = url.pathname.match(/^\/api\/admin\/students\/([^/]+)$/);
    if (req.method === "POST" && updateStudentMatch) {
      const body = await readBody(req);
      const student = data.students.find((item) => item.id === updateStudentMatch[1]);
      if (!student) return sendJson(res, 404, { error: "Student not found." });

      const studentNumber = String(body.studentNumber || student.studentNumber || "").trim();
      const name = String(body.name || student.name || "").trim();
      if (!studentNumber || !name) return sendJson(res, 400, { error: "Student ID and name are required." });

      const duplicate = data.students.find(
        (item) => item.id !== student.id && String(item.studentNumber || "").toLowerCase() === studentNumber.toLowerCase()
      );
      if (duplicate) return sendJson(res, 400, { error: "Another student already uses that ID." });

      const matchingStudent = findDuplicateStudent(data.students, { ...body, name }, student.id);
      if (matchingStudent) {
        return sendJson(res, 409, {
          error: `Possible duplicate: ${matchingStudent.name} (${matchingStudent.studentNumber}) already has the same name and contact/address information.`,
          duplicateStudentId: matchingStudent.id,
        });
      }

      student.studentNumber = studentNumber;
      student.name = name;
      student.group = String(body.group || "Ungrouped").trim() || "Ungrouped";
      student.term = String(body.term || "Unassigned").trim() || "Unassigned";
      student.classId = String(body.classId || "").trim();
      student.status = String(body.status || "Active").trim() || "Active";
      student.grade = String(body.grade || "").trim();
      student.school = String(body.school || "").trim();
      student.email = String(body.email || "").trim();
      student.phone = String(body.phone || "").trim();
      student.address = String(body.address || "").trim();
      student.parentName = String(body.parentName || "").trim();
      student.parentPhone = String(body.parentPhone || "").trim();
      student.tags = String(body.tags || "").trim();
      student.notes = String(body.notes || "").trim();
      student.logEntries = Array.isArray(student.logEntries) ? student.logEntries : [];
      student.updatedAt = new Date().toISOString();

      data.submissions.forEach((submission) => {
        if (submission.studentRecordId === student.id || submissionMatchesStudent(submission, student)) {
          attachSubmissionToStudent(data, student, submission);
        }
      });

      await saveData(data);
      return sendJson(res, 200, data);
    }

    const linkStudentSubmissionMatch = url.pathname.match(/^\/api\/admin\/students\/([^/]+)\/link-submission$/);
    if (req.method === "POST" && linkStudentSubmissionMatch) {
      const body = await readBody(req);
      const student = data.students.find((item) => item.id === linkStudentSubmissionMatch[1]);
      if (!student) return sendJson(res, 404, { error: "Student not found." });
      const submission = data.submissions.find((item) => item.id === String(body.submissionId || ""));
      if (!submission) return sendJson(res, 404, { error: "Saved report not found." });
      attachSubmissionToStudent(data, student, submission);
      student.updatedAt = new Date().toISOString();
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const studentLogMatch = url.pathname.match(/^\/api\/admin\/students\/([^/]+)\/logs$/);
    if (req.method === "POST" && studentLogMatch) {
      const body = await readBody(req);
      const student = data.students.find((item) => item.id === studentLogMatch[1]);
      if (!student) return sendJson(res, 404, { error: "Student not found." });
      const note = String(body.note || "").trim();
      if (!note) return sendJson(res, 400, { error: "Log note is required." });
      student.logEntries = Array.isArray(student.logEntries) ? student.logEntries : [];
      student.logEntries.unshift({
        id: uid("log"),
        type: String(body.type || "Note").trim() || "Note",
        note,
        at: new Date().toISOString(),
      });
      student.updatedAt = new Date().toISOString();
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const deleteStudentScoreMatch = url.pathname.match(/^\/api\/admin\/students\/([^/]+)\/score-history\/([^/]+)$/);
    if (req.method === "DELETE" && deleteStudentScoreMatch) {
      const student = data.students.find((item) => item.id === deleteStudentScoreMatch[1]);
      if (!student) return sendJson(res, 404, { error: "Student not found." });
      student.scoreHistory = Array.isArray(student.scoreHistory) ? student.scoreHistory : [];
      const score = student.scoreHistory.find((item) => item.id === deleteStudentScoreMatch[2]);
      if (!score) return sendJson(res, 404, { error: "Saved score not found." });
      const historyKey = String(score.submissionId || score.id || "");
      student.scoreHistory = student.scoreHistory.filter((item) => item.id !== score.id);
      student.deletedScoreHistoryKeys = Array.isArray(student.deletedScoreHistoryKeys) ? student.deletedScoreHistoryKeys : [];
      if (historyKey && !student.deletedScoreHistoryKeys.includes(historyKey)) student.deletedScoreHistoryKeys.push(historyKey);
      student.updatedAt = new Date().toISOString();
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const deleteStudentMatch = url.pathname.match(/^\/api\/admin\/students\/([^/]+)$/);
    if (req.method === "DELETE" && deleteStudentMatch) {
      const studentIndex = data.students.findIndex((item) => item.id === deleteStudentMatch[1]);
      if (studentIndex < 0) return sendJson(res, 404, { error: "Student not found." });
      const [deletedStudent] = data.students.splice(studentIndex, 1);
      data.submissions.forEach((submission) => {
        if (submission.studentRecordId === deletedStudent.id) {
          delete submission.studentRecordId;
        }
      });
      await saveData(data);
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/question-bank/import") {
      const body = await readBody(req);
      const idPrefix = body.idPrefix || "Q";
      const importTestClass = String(body.testClass || "").trim();
      const startNumber = nextBankQuestionNumber(data.questionBank);
      const importedQuestions = makeQuestionsFromCsv(body.questionCsv, { idPrefix, startNumber });
      if (!importedQuestions.length) return sendJson(res, 400, { error: "No valid question rows found in this CSV." });
      if (importTestClass) {
        importedQuestions.forEach((question) => {
          question.testClass = importTestClass;
        });
      }
      const importSubject = normalizeSubject(body.subject);
      importedQuestions.forEach((question) => {
        question.subject = importSubject || inferQuestionSubject(question);
      });
      const bankQuestions = importedQuestions.map((question, index) => makeBankQuestion(question, startNumber + index));
      data.questionBank.unshift(...bankQuestions);
      await saveData(data);
      return sendJson(res, 200, { importedQuestions: bankQuestions });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/question-bank/add") {
      const body = await readBody(req);
      const bankNumber = nextBankQuestionNumber(data.questionBank);
      const sourceQuestionId = makeSystemQuestionId(body.idPrefix || "Q", bankNumber);
      const question = makeBankQuestion(
        {
          id: uid("q"),
          number: bankNumber,
          originalNumber: Number.parseInt(body.originalNumber, 10) || bankNumber,
          testClass: String(body.testClass || "").trim(),
          subject: normalizeSubject(body.subject),
          type: normalizeQuestionType(body.type),
          section: String(body.section || "Section 1").trim() || "Section 1",
          choices: isOptionQuestion(body.type) ? parseOptionValues(body.choices, []) : parseChoices(body.choices || "A-E", LETTERS),
          dragTargets: parseOptionValues(body.dragTargets, []),
          gridRows: parseOptionValues(body.gridRows, []),
          answer: normalizeAnswerForStorage(body.answer, body.type),
          imageUrl: String(body.imageUrl || "").trim(),
          sharedImageUrl: String(body.sharedImageUrl || "").trim(),
          questionText: String(body.questionText || "").trim(),
          groupId: String(body.groupId || "").trim(),
          passageTitle: String(body.passageTitle || "").trim(),
          passageText: String(body.passageText || "").trim(),
          questionFont: String(body.questionFont || "").trim(),
          points: 1,
          skill: String(body.skill || "").trim(),
          difficulty: Number.parseInt(body.difficulty, 10) || "",
          explanation: String(body.explanation || "").trim(),
          sourceQuestionId,
          sourceGroupId: sourceQuestionId,
        },
        bankNumber
      );
      data.questionBank.unshift(question);
      await saveData(data);
      return sendJson(res, 200, { question });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/question-bank/regenerate-ids") {
      const body = await readBody(req);
      const selectedIds = new Set(Array.isArray(body.questionIds) ? body.questionIds.map(String) : []);
      const questions = data.questionBank
        .filter((question) => !selectedIds.size || selectedIds.has(question.id))
        .sort(bankQuestionSort);
      if (!questions.length) return sendJson(res, 400, { error: "No bank questions selected for ID regeneration." });
      const prefix = body.idPrefix || "Q";
      const startNumber = Math.max(1, Number.parseInt(body.startNumber, 10) || 1);
      questions.forEach((question, index) => {
        const number = startNumber + index;
        question.bankNumber = number;
        question.sourceQuestionId = makeSystemQuestionId(prefix, number);
        question.updatedAt = new Date().toISOString();
      });
      await saveData(data);
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/question-bank/batch-update") {
      const body = await readBody(req);
      const selectedIds = new Set(Array.isArray(body.questionIds) ? body.questionIds.map(String) : []);
      const updates = body.updates || {};
      if (!selectedIds.size) return sendJson(res, 400, { error: "Choose at least one bank question to update." });
      const editableFields = ["testClass", "section", "skill", "difficulty", "type", "choices", "dragTargets", "gridRows", "groupId", "imageUrl", "sharedImageUrl"];
      const edit = {};
      editableFields.forEach((field) => {
        if (Object.hasOwn(updates, field) && String(updates[field] ?? "").trim() !== "") edit[field] = updates[field];
      });
      if (!Object.keys(edit).length) return sendJson(res, 400, { error: "Enter at least one batch field to update." });
      const questions = [];
      data.questionBank.forEach((question) => {
        if (!selectedIds.has(question.id)) return;
        applyQuestionEdit(question, edit);
        questions.push(question);
      });
      await saveData(data);
      return sendJson(res, 200, { questions });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/question-bank/batch-delete") {
      const body = await readBody(req);
      const selectedIds = new Set(Array.isArray(body.questionIds) ? body.questionIds.map(String) : []);
      if (!selectedIds.size) return sendJson(res, 400, { error: "Choose at least one bank question to delete." });
      const beforeCount = data.questionBank.length;
      data.questionBank = data.questionBank.filter((question) => !selectedIds.has(question.id));
      const deletedQuestionIds = beforeCount === data.questionBank.length ? [] : [...selectedIds];
      if (!deletedQuestionIds.length) return sendJson(res, 200, { deletedQuestionIds });
      await saveData(data);
      return sendJson(res, 200, { deletedQuestionIds });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/question-bank/create-exam") {
      const body = await readBody(req);
      const selectedIds = new Set(Array.isArray(body.questionIds) ? body.questionIds.map(String) : []);
      const requestedQuestions = data.questionBank.filter((question) => selectedIds.has(question.id)).sort(bankQuestionSort);
      const strictMix = body.mixConstraints && typeof body.mixConstraints === "object";
      const strictResolution = strictMix ? resolveStrictMixSelection(data.questionBank, requestedQuestions) : null;
      const expandedQuestions = strictResolution?.expandedQuestions || expandCompletePassageSelection(data.questionBank, requestedQuestions);
      if (strictResolution?.missingCompanions.length) {
        const labels = strictResolution.missingCompanions
          .slice(0, 5)
          .map((question) => question.sourceQuestionId || question.id)
          .join(", ");
        return sendJson(res, 400, {
          error: `The Flexible Mix draft is missing companion passage questions (${labels}). Generate the mix again; no extra question formats were added and no exam was created.`,
        });
      }
      const sourceSelection = strictResolution || selectOneQuestionPerSourceGroup(expandedQuestions);
      const sourceSelectedQuestions = sourceSelection.selected;
      const omittedVariants = sourceSelection.omitted;
      const invalidQuestions = sourceSelectedQuestions.filter((question) => getQuestionReadinessIssues(question).length);
      const invalidPassageKeys = new Set(invalidQuestions.map(getPassageUnitKey).filter(Boolean));
      if (invalidPassageKeys.size) {
        const labels = [...invalidPassageKeys].map((key) => key.split("::").slice(1).join("::")).slice(0, 4);
        return sendJson(res, 400, {
          error: `A selected passage set is incomplete (${labels.join(", ")}). Fix every question in that passage before creating the exam; no middle questions were added.`,
        });
      }
      const selectedQuestions = sourceSelectedQuestions.filter((question) => !getQuestionReadinessIssues(question).length);
      if (!selectedQuestions.length) return sendJson(res, 400, { error: "Choose at least one bank question for the exam." });
      const program = String(body.program || "").trim();
      const reusePolicy = normalizeQuestionReusePolicy(body.reusePolicy || "allow_previous");
      const reusePolicyError = validateQuestionReusePolicy(data, selectedQuestions, reusePolicy, program);
      if (reusePolicyError) {
        return sendJson(res, 400, {
          error: `The question reuse policy blocked this exam: ${reusePolicyError}. Change the reuse policy or generate the draft again; no exam was created.`,
        });
      }
      const targetStudentId = String(body.targetStudentId || "").trim();
      if (targetStudentId) {
        const studentSeenSourceIds = getStudentSeenQuestionSourceIds(data, targetStudentId);
        if (!studentSeenSourceIds) return sendJson(res, 400, { error: "The selected student profile was not found. Choose the student again before creating the exam." });
        const repeatedForStudent = selectedQuestions.filter((question) => studentSeenSourceIds.has(getQuestionSourceGroupId(question)));
        if (repeatedForStudent.length) {
          const student = data.students.find((item) => item.id === targetStudentId);
          const labels = repeatedForStudent.slice(0, 8).map((question) => question.sourceQuestionId || question.id).join(", ");
          return sendJson(res, 400, {
            error: `${student?.name || "This student"} has already seen ${repeatedForStudent.length} selected question${repeatedForStudent.length === 1 ? "" : "s"} (${labels}). Generate the draft again; no exam was created.`,
          });
        }
      }
      const mixConstraintError = validateExamMixConstraints(selectedQuestions, body.mixConstraints);
      if (mixConstraintError) {
        return sendJson(res, 400, {
          error: `The final exam does not match the Flexible Mix request: ${mixConstraintError}. No exam was created. Generate the mix again after checking the bank questions.`,
        });
      }
      const title = String(body.title || "Question Bank Exam").trim();
      const code = String(body.code || title.slice(0, 3) + "-BANK").trim().toUpperCase();
      const shsatOriginalScoring = isEligibleShsatOriginalExam({ title, code, questions: selectedQuestions });
      const minutes = Math.max(1, Number.parseInt(body.minutes, 10) || 65);
      const adaptive = body.adaptive === true || body.adaptive === "true";
      const examType = body.examType === "math" ? "math" : "english";
      const oppositeSubject = examType === "math" ? "english" : "math";
      if (selectedQuestions.some((question) => inferQuestionSubject(question) === oppositeSubject)) {
        return sendJson(res, 400, { error: `Your selected questions include ${oppositeSubject === "math" ? "Math" : "English / Reading"} questions. Filter the bank by subject before creating this ${examType === "math" ? "Math" : "English / Reading"} exam.` });
      }
      const duplicate = data.exams.find((item) => String(item.code || "").toUpperCase() === code && (item.examType || "english") === examType);
      if (duplicate) return sendJson(res, 400, { error: "Another exam with the same subject already uses that test code." });
      const exam = {
        id: uid("exam"),
        title,
        code,
        minutes,
        examType,
        stepMode: body.stepMode === "all" ? "all" : "one",
        questions: selectedQuestions.map((question, index) => cloneBankQuestionForExam(question, index)),
        shuffle: body.shuffle === true || body.shuffle === "true",
        adaptive,
        targetStudentId,
        program,
        reusePolicy,
        scoringMode: shsatOriginalScoring ? "shsat_original" : "",
        source: "question-bank",
        open: true,
        createdAt: new Date().toISOString(),
      };
      data.exams.unshift(exam);
      await saveData(data);
      return sendJson(res, 200, {
        ...data,
        examBuild: {
          requestedCount: requestedQuestions.length,
          expandedPassageCount: strictMix ? 0 : expandedQuestions.length - requestedQuestions.length,
          includedCount: selectedQuestions.length,
          omittedVariantCount: omittedVariants.length,
          omittedInvalidCount: invalidQuestions.length,
          reusePolicy,
          program,
        },
      });
    }

    const updateBankQuestionMatch = url.pathname.match(/^\/api\/admin\/question-bank\/([^/]+)$/);
    if (req.method === "POST" && updateBankQuestionMatch) {
      const body = await readBody(req);
      const question = data.questionBank.find((item) => item.id === updateBankQuestionMatch[1]);
      if (!question) return sendJson(res, 404, { error: "Bank question not found." });
      applyQuestionEdit(question, body);
      await saveData(data);
      return sendJson(res, 200, { question });
    }

    if (req.method === "DELETE" && updateBankQuestionMatch) {
      const questionIndex = data.questionBank.findIndex((item) => item.id === updateBankQuestionMatch[1]);
      if (questionIndex < 0) return sendJson(res, 404, { error: "Bank question not found." });
      data.questionBank.splice(questionIndex, 1);
      await saveData(data);
      return sendJson(res, 200, { deletedQuestionId: updateBankQuestionMatch[1] });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/exams/from-bank-ids") {
      const body = await readBody(req);
      const title = String(body.title || "Question ID Exam").trim();
      const code = String(body.code || title.slice(0, 3) + "-IDS").trim().toUpperCase();
      const examType = body.examType === "math" ? "math" : "english";
      const duplicate = data.exams.find((item) => String(item.code || "").toUpperCase() === code && (item.examType || "english") === examType);
      if (duplicate) return sendJson(res, 400, { error: "Another exam with the same subject already uses that test code." });
      const resolution = resolveBankQuestionsByIds(data.questionBank, body.questionIds);
      const selectionError = bankIdSelectionError(resolution);
      if (selectionError) return sendJson(res, 400, { error: selectionError });
      const oppositeSubject = examType === "math" ? "english" : "math";
      const wrongSubject = resolution.selected.filter((question) => inferQuestionSubject(question) === oppositeSubject);
      if (wrongSubject.length) {
        return sendJson(res, 400, {
          error: `Nothing was created. These IDs do not match the selected exam subject: ${wrongSubject.slice(0, 8).map((question) => question.sourceQuestionId || question.id).join(", ")}.`,
        });
      }
      const questions = resolution.selected.map((question, index) => cloneBankQuestionForExam(question, index));
      const exam = {
        id: uid("exam"),
        title,
        code,
        minutes: Math.max(1, Number.parseInt(body.minutes, 10) || 65),
        examType,
        stepMode: body.stepMode === "all" ? "all" : "one",
        questions,
        shuffle: body.shuffle === true || body.shuffle === "true",
        adaptive: body.adaptive === true || body.adaptive === "true",
        program: String(body.program || "").trim(),
        reusePolicy: normalizeQuestionReusePolicy(body.reusePolicy || "allow_previous"),
        scoringMode: shsatOriginalScoringMode({ title, code, questions }),
        source: "question-id-csv",
        open: false,
        createdAt: new Date().toISOString(),
      };
      data.exams.unshift(exam);
      await saveData(data);
      return sendJson(res, 200, {
        ...data,
        examBuild: { createdExamId: exam.id, addedQuestionIds: resolution.selected.map((question) => question.sourceQuestionId || question.id) },
      });
    }

    if (req.method === "POST" && url.pathname === "/api/admin/exams") {
      const body = await readBody(req);
      const title = String(body.title || "Untitled Exam").trim();
      const code = String(body.code || title.slice(0, 3) + "-001").trim().toUpperCase();
      const minutes = Math.max(1, Number.parseInt(body.minutes, 10) || 65);
      const questionCount = Math.max(1, Number.parseInt(body.questionCount, 10) || 20);
      const choiceCount = Math.max(4, Math.min(5, Number.parseInt(body.choiceCount, 10) || 5));
      const answerKey = parseAnswerKey(body.answerKey);
      const importedQuestions = makeQuestionsFromCsv(body.questionCsv, { idPrefix: body.idPrefix || code || "Q" });
      if (String(body.questionCsv || "").trim()) {
        if (!importedQuestions.length) return sendJson(res, 400, { error: "Nothing was created. The CSV did not contain any usable question rows." });
        const invalidQuestions = importedQuestions
          .map((question, index) => ({ id: `row ${index + 2}`, issues: getQuestionReadinessIssues(question) }))
          .filter((item) => item.issues.length);
        if (invalidQuestions.length) {
          return sendJson(res, 400, {
            error: `Nothing was created. Fix these CSV rows first: ${invalidQuestions.slice(0, 8).map((item) => `${item.id} (${item.issues.join(", ")})`).join("; ")}.`,
          });
        }
        const signatures = new Set();
        const duplicateRows = [];
        importedQuestions.forEach((question, index) => {
          const signature = getQuestionContentSignature(question);
          if (signature.length >= 24 && signatures.has(signature)) duplicateRows.push(index + 2);
          if (signature.length >= 24) signatures.add(signature);
        });
        if (duplicateRows.length) {
          return sendJson(res, 400, { error: `Nothing was created. The CSV repeats the same question on row(s): ${duplicateRows.slice(0, 12).join(", ")}.` });
        }
      }
      const finalQuestionCount = importedQuestions.length || questionCount;
      const adaptive = body.adaptive === true || body.adaptive === "true";
      const examType = body.examType === "math" ? "math" : "english";
      if (importedQuestions.length) {
        const oppositeSubject = examType === "math" ? "english" : "math";
        const wrongSubject = importedQuestions.filter((question) => inferQuestionSubject(question) === oppositeSubject);
        if (wrongSubject.length) {
          return sendJson(res, 400, { error: `Nothing was created. ${wrongSubject.length} CSV question(s) do not match the selected exam subject.` });
        }
      }
      const duplicate = data.exams.find((item) => String(item.code || "").toUpperCase() === code && (item.examType || "english") === examType);
      if (duplicate) return sendJson(res, 400, { error: "Another exam with the same subject already uses that test code." });
      const createdQuestions = importedQuestions.length ? importedQuestions : makeQuestions(questionCount, answerKey, choiceCount);
      const shsatOriginalScoring = isEligibleShsatOriginalExam({ title, code, questions: createdQuestions });
      const exam = {
        id: uid("exam"),
        title,
        code,
        minutes,
        examType,
        stepMode: body.stepMode === "all" ? "all" : "one",
        questions: createdQuestions,
        shuffle: body.shuffle === true || body.shuffle === "true",
        adaptive,
        program: String(body.program || "").trim(),
        reusePolicy: normalizeQuestionReusePolicy(body.reusePolicy || "allow_previous"),
        scoringMode: shsatOriginalScoring ? "shsat_original" : "",
        source: importedQuestions.length ? "csv" : "manual",
        open: !importedQuestions.length,
        createdAt: new Date().toISOString(),
      };
      data.exams.unshift(exam);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/exams/import-backup") {
      const body = await readBody(req);
      const source = body?.exam || body?.backup?.exam || body?.backup || null;
      if (!source || !Array.isArray(source.questions)) return sendJson(res, 400, { error: "This is not a valid Topway exam backup." });
      const examType = source.examType === "math" ? "math" : "english";
      const baseCode = String(source.code || "RESTORED").trim().toUpperCase() || "RESTORED";
      let code = baseCode;
      let copyNumber = 2;
      while (data.exams.some((item) => String(item.code || "").toUpperCase() === code && (item.examType || "english") === examType)) {
        code = `${baseCode}-COPY${copyNumber}`;
        copyNumber += 1;
      }
      const questions = source.questions.map((question, index) => ({
        ...question,
        id: uid("q"),
        number: index + 1,
        originalNumber: Number.parseInt(question.originalNumber || question.number || index + 1, 10) || index + 1,
        type: normalizeQuestionType(question.type),
        choices: Array.isArray(question.choices) ? question.choices : parseChoices(question.choices, LETTERS),
        dragTargets: Array.isArray(question.dragTargets) ? question.dragTargets : parseOptionValues(question.dragTargets),
        gridRows: Array.isArray(question.gridRows) ? question.gridRows : parseOptionValues(question.gridRows),
        answer: normalizeAnswerForStorage(question.answer, question.type),
        questionText: String(question.questionText || "").trim(),
        groupId: String(question.groupId || "").trim(),
        passageTitle: String(question.passageTitle || "").trim(),
        passageText: String(question.passageText || "").trim(),
        sharedImageUrl: String(question.sharedImageUrl || "").trim(),
      }));
      if (!questions.length) return sendJson(res, 400, { error: "Nothing was imported. The exam JSON has no questions." });
      fillSharedPassageContent(
        questions,
        buildCanonicalPassagesBySection(data.questionBank),
        buildCanonicalPassagesByQuestionText(data.questionBank)
      );
      const invalidQuestions = questions
        .map((question, index) => ({ number: index + 1, issues: getQuestionReadinessIssues(question) }))
        .filter((item) => item.issues.length);
      if (invalidQuestions.length) {
        return sendJson(res, 400, {
          error: `Nothing was imported. Fix these JSON questions first: ${invalidQuestions.slice(0, 8).map((item) => `Question ${item.number} (${item.issues.join(", ")})`).join("; ")}.`,
        });
      }
      const signatures = new Set();
      const duplicateNumbers = [];
      questions.forEach((question, index) => {
        const signature = getQuestionContentSignature(question);
        if (signature.length >= 24 && signatures.has(signature)) duplicateNumbers.push(index + 1);
        if (signature.length >= 24) signatures.add(signature);
      });
      if (duplicateNumbers.length) {
        return sendJson(res, 400, { error: `Nothing was imported. The JSON repeats the same question at position(s): ${duplicateNumbers.slice(0, 12).join(", ")}.` });
      }
      const oppositeSubject = examType === "math" ? "english" : "math";
      const wrongSubject = questions.filter((question) => inferQuestionSubject(question) === oppositeSubject);
      if (wrongSubject.length) {
        return sendJson(res, 400, { error: `Nothing was imported. ${wrongSubject.length} JSON question(s) do not match the exam subject.` });
      }
      const exam = {
        id: uid("exam"),
        title: `${String(source.title || "Restored Exam").trim()}${code === baseCode ? "" : " (Restored Copy)"}`,
        code,
        minutes: Math.max(1, Number.parseInt(source.minutes, 10) || 65),
        examType,
        stepMode: source.stepMode === "all" ? "all" : "one",
        questions,
        shuffle: Boolean(source.shuffle),
        adaptive: Boolean(source.adaptive),
        program: String(source.program || "").trim(),
        reusePolicy: normalizeQuestionReusePolicy(source.reusePolicy || "allow_previous"),
        scoringMode: shsatOriginalScoringMode({ ...source, questions }),
        source: "exam-backup",
        open: false,
        createdAt: new Date().toISOString(),
        restoredFrom: String(body?.fileName || source.title || "exam backup"),
      };
      data.exams.unshift(exam);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const updateExamMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)$/);
    if (req.method === "POST" && updateExamMatch) {
      const body = await readBody(req);
      const exam = data.exams.find((item) => item.id === updateExamMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });

      const title = String(body.title || exam.title || "Untitled Exam").trim();
      const code = String(body.code || exam.code || title.slice(0, 3) + "-001").trim().toUpperCase();
      const nextExamType = body.examType === "math" ? "math" : "english";
      const duplicate = data.exams.find(
        (item) =>
          item.id !== exam.id &&
          String(item.code || "").toUpperCase() === code &&
          (item.examType || "english") === nextExamType
      );
      if (duplicate) return sendJson(res, 400, { error: "Another exam with the same subject already uses that test code." });
      const shsatOriginalScoring = isEligibleShsatOriginalExam({ title, code, questions: exam.questions || [] });

      exam.title = title;
      exam.code = code;
      exam.minutes = Math.max(1, Number.parseInt(body.minutes, 10) || exam.minutes || 65);
      exam.examType = nextExamType;
      exam.program = String(body.program || "").trim();
      exam.reusePolicy = normalizeQuestionReusePolicy(body.reusePolicy || exam.reusePolicy);
      exam.stepMode = body.stepMode === "all" ? "all" : "one";
      exam.shuffle = body.shuffle === true || body.shuffle === "true";
      exam.open = body.open !== false;
      exam.scoringMode = shsatOriginalScoring ? "shsat_original" : "";
      exam.updatedAt = new Date().toISOString();

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
      data.attempts = data.attempts.filter((attempt) => attempt.examId !== deletedExam.id);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const clearAttemptsMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/attempts$/);
    if (req.method === "DELETE" && clearAttemptsMatch) {
      const exam = data.exams.find((item) => item.id === clearAttemptsMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });
      data.attempts = data.attempts.filter((attempt) => attempt.examId !== exam.id || attempt.status === "submitted");
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const deleteAttemptMatch = url.pathname.match(/^\/api\/admin\/attempts\/([^/]+)$/);
    if (req.method === "DELETE" && deleteAttemptMatch) {
      const attempt = data.attempts.find((item) => item.id === deleteAttemptMatch[1]);
      if (!attempt) return sendJson(res, 404, { error: "Waiting report not found." });
      if (attempt.status === "submitted" || attempt.submissionId) {
        return sendJson(res, 400, { error: "This attempt already has a submitted report. Review or delete the report instead." });
      }
      data.attempts = data.attempts.filter((item) => item.id !== attempt.id);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const deleteSubmissionMatch = url.pathname.match(/^\/api\/admin\/submissions\/([^/]+)$/);
    if (req.method === "DELETE" && deleteSubmissionMatch) {
      const submission = data.submissions.find((item) => item.id === deleteSubmissionMatch[1]);
      if (!submission) return sendJson(res, 404, { error: "Report not found." });
      data.submissions = data.submissions.filter((item) => item.id !== submission.id);
      data.attempts = data.attempts.filter((attempt) => attempt.submissionId !== submission.id && attempt.id !== submission.attemptId);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && url.pathname === "/api/admin/storage/old-reports") {
      const body = await readBody(req);
      const beforeText = String(body.before || "").trim();
      const cutoff = new Date(`${beforeText}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(beforeText) || Number.isNaN(cutoff.getTime())) {
        return sendJson(res, 400, { error: "Choose a valid cleanup date." });
      }
      const oldReports = data.submissions.filter((submission) => new Date(submission.submittedAt || 0) < cutoff);
      const deletedSubmissionIds = new Set(oldReports.map((submission) => submission.id));
      const deletedAttemptIds = new Set(oldReports.map((submission) => submission.attemptId).filter(Boolean));
      const beforeAttempts = data.attempts.length;
      data.submissions = data.submissions.filter((submission) => !deletedSubmissionIds.has(submission.id));
      data.attempts = data.attempts.filter(
        (attempt) => !deletedAttemptIds.has(attempt.id) && !deletedSubmissionIds.has(attempt.submissionId)
      );
      await saveData(data);
      return sendJson(res, 200, {
        data,
        deletedReports: oldReports.length,
        deletedAttempts: beforeAttempts - data.attempts.length,
      });
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

    const addQuestionMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/questions\/add$/);
    if (req.method === "POST" && addQuestionMatch) {
      const exam = data.exams.find((item) => item.id === addQuestionMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });
      exam.questions.push(makeBlankQuestion(exam));
      renumberQuestions(exam.questions);
      await saveData(data);
      return sendJson(res, 200, data);
    }

    const addBankQuestionsMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/questions\/from-bank$/);
    if (req.method === "POST" && addBankQuestionsMatch) {
      const body = await readBody(req);
      const exam = data.exams.find((item) => item.id === addBankQuestionsMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });
      const resolution = resolveBankQuestionsByIds(data.questionBank, body.questionIds, exam.questions || []);
      const selectionError = bankIdSelectionError(resolution);
      if (selectionError) return sendJson(res, 400, { error: selectionError });
      const oppositeSubject = (exam.examType || "english") === "math" ? "english" : "math";
      const wrongSubject = resolution.selected.filter((question) => inferQuestionSubject(question) === oppositeSubject);
      if (wrongSubject.length) {
        return sendJson(res, 400, {
          error: `Nothing was changed. These IDs do not match this exam's subject: ${wrongSubject.slice(0, 8).map((question) => question.sourceQuestionId || question.id).join(", ")}.`,
        });
      }
      const startIndex = exam.questions.length;
      resolution.selected.forEach((question, index) => exam.questions.push(cloneBankQuestionForExam(question, startIndex + index)));
      renumberQuestions(exam.questions);
      exam.scoringMode = shsatOriginalScoringMode(exam);
      exam.updatedAt = new Date().toISOString();
      await saveData(data);
      return sendJson(res, 200, {
        ...data,
        examUpdate: {
          examId: exam.id,
          addedQuestionIds: resolution.selected.map((question) => question.sourceQuestionId || question.id),
          addedQuestionInternalIds: exam.questions.slice(startIndex).map((question) => question.id),
        },
      });
    }

    const renumberExamQuestionsMatch = url.pathname.match(/^\/api\/admin\/exams\/([^/]+)\/questions\/renumber$/);
    if (req.method === "POST" && renumberExamQuestionsMatch) {
      const exam = data.exams.find((item) => item.id === renumberExamQuestionsMatch[1]);
      if (!exam) return sendJson(res, 404, { error: "Exam not found." });
      exam.questions = [...(exam.questions || [])]
        .sort((left, right) => (Number.parseInt(left.number, 10) || 0) - (Number.parseInt(right.number, 10) || 0))
        .map((question, index) => ({ ...question, number: index + 1 }));
      exam.updatedAt = new Date().toISOString();
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
        applyQuestionEdit(question, edit);
      });
      await saveData(data);
      return sendJson(res, 200, data);
    }

    if (req.method === "GET" && url.pathname === "/api/student/exam") {
      const code = String(url.searchParams.get("code") || "").trim().toUpperCase();
      const examId = String(url.searchParams.get("examId") || "").trim();
      const matchingExams = data.exams.filter((item) => String(item.code || "").toUpperCase() === code && item.open);
      if (!matchingExams.length) return sendJson(res, 404, { error: "Test code is not open or does not exist." });
      if (examId) {
        const selectedExam = matchingExams.find((item) => item.id === examId);
        if (!selectedExam) return sendJson(res, 404, { error: "That subject is not open for this test code." });
        return sendJson(res, 200, sanitizeExamForStudent(selectedExam));
      }
      if (matchingExams.length > 1) {
        return sendJson(res, 200, {
          combined: true,
          code,
          exams: matchingExams.map((exam) => ({
            id: exam.id,
            title: exam.title,
            code: exam.code,
            minutes: exam.minutes,
            examType: exam.examType || "english",
            questionCount: Array.isArray(exam.questions) ? exam.questions.length : 0,
            stepMode: exam.stepMode || "one",
          })),
        });
      }
      const exam = matchingExams[0];
      return sendJson(res, 200, sanitizeExamForStudent(exam));
    }

    if (req.method === "POST" && url.pathname === "/api/student/start") {
      const body = await readBody(req);
      const exam = data.exams.find((item) => item.id === body.examId && item.open);
      if (!exam) return sendJson(res, 404, { error: "Exam is no longer open." });
      const studentId = String(body.studentId || "").trim();
      const studentRecord = findStudentRecord(data, studentId, body.studentName);
      const studentName = String(body.studentName || studentRecord?.name || "Student").trim();
      const normalizedStudentId = studentRecord?.studentNumber || studentId;
      const blockingAttempt = findBlockingCombinedAttempt(data, exam, normalizedStudentId, studentName, {
        completedExamId: String(body.completedExamId || "").trim(),
      });
      if (blockingAttempt) {
        const blockingExam = data.exams.find((item) => item.id === blockingAttempt.examId);
        const blockingSubject = blockingExam?.examType === "math" ? "Math" : "English / Reading";
        return sendJson(res, 409, {
          error: `Finish your ${blockingSubject} exam before starting another subject with this test code.`,
        });
      }
      const existingAttempt = (data.attempts || []).find(
        (item) => item.examId === exam.id && item.status === "in_progress" && sameAttemptStudent(item, normalizedStudentId, studentName)
      );
      if (existingAttempt) {
        existingAttempt.displayOrder = Array.isArray(existingAttempt.displayOrder) && existingAttempt.displayOrder.length
          ? existingAttempt.displayOrder
          : buildDisplayOrder(exam);
        existingAttempt.lastSeenAt = new Date().toISOString();
        await saveData(data);
        return sendJson(res, 200, { ok: true, attemptId: existingAttempt.id, displayOrder: existingAttempt.displayOrder });
      }
      const attempt = {
        id: uid("att"),
        examId: exam.id,
        studentRecordId: studentRecord?.id || "",
        studentId: normalizedStudentId,
        studentGroup: studentRecord?.group || "",
        studentName,
        displayOrder: buildDisplayOrder(exam),
        status: "in_progress",
        startedAt: new Date().toISOString(),
        submittedAt: "",
        submissionId: "",
        lastSeenAt: new Date().toISOString(),
      };
      data.attempts.unshift(attempt);
      await saveData(data);
      return sendJson(res, 200, { ok: true, attemptId: attempt.id, displayOrder: attempt.displayOrder });
    }

    if (req.method === "POST" && url.pathname === "/api/student/submit") {
      const body = await readBody(req);
      const exam = data.exams.find((item) => item.id === body.examId && item.open);
      if (!exam) return sendJson(res, 404, { error: "Exam is no longer open." });
      const studentId = String(body.studentId || "").trim();
      const studentRecord = findStudentRecord(data, studentId, body.studentName);
      const score = scoreSubmission(exam, body.answers || {});
      const attempt =
        data.attempts.find((item) => item.id === body.attemptId) ||
        data.attempts.find(
          (item) =>
            item.examId === exam.id &&
            item.status === "in_progress" &&
            String(item.studentId || "").toLowerCase() === String(studentRecord?.studentNumber || studentId).toLowerCase()
        );
      const submission = {
        id: uid("sub"),
        examId: exam.id,
        examTitle: exam.title,
        examCode: exam.code,
        examSubject: exam.examType || "english",
        studentRecordId: studentRecord?.id || "",
        studentId: studentRecord?.studentNumber || studentId,
        studentGroup: studentRecord?.group || "",
        studentName: String(body.studentName || studentRecord?.name || "Student").trim(),
        answers: body.answers || {},
        displayOrder: Array.isArray(attempt?.displayOrder) && attempt.displayOrder.length
          ? attempt.displayOrder
          : Array.isArray(body.displayOrder) ? body.displayOrder : [],
        score,
        questionSourceGroupIds: [...new Set((exam.questions || []).map(getQuestionSourceGroupId).filter(Boolean))],
        violations: Number.parseInt(body.violations, 10) || 0,
        violationEvents: sanitizeViolationEvents(body.violationEvents),
        autoSubmit: Boolean(body.autoSubmit),
        submittedAt: new Date().toISOString(),
      };
      data.submissions.unshift(submission);
      if (studentRecord) saveStudentScoreHistory(data, studentRecord, submission, exam);
      if (attempt) {
        attempt.status = "submitted";
        attempt.submissionId = submission.id;
        attempt.submittedAt = submission.submittedAt;
        attempt.lastSeenAt = submission.submittedAt;
        attempt.studentRecordId = submission.studentRecordId;
        attempt.studentId = submission.studentId;
        attempt.studentGroup = submission.studentGroup;
        attempt.studentName = submission.studentName;
      }
      const examCode = String(exam.code || "").toUpperCase();
      const remainingCombinedExams = data.exams
        .filter(
          (item) =>
            item.open &&
            item.id !== exam.id &&
            String(item.code || "").toUpperCase() === examCode &&
            !hasSubmittedCombinedSubject(data, item.id, submission.studentId, submission.studentName)
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          code: item.code,
          minutes: item.minutes,
          examType: item.examType || "english",
          questionCount: Array.isArray(item.questions) ? item.questions.length : 0,
          stepMode: item.stepMode || "one",
        }));
      await saveData(data);
      return sendJson(res, 200, {
        ok: true,
        submission: sanitizeSubmissionForStudent(submission),
        remainingCombinedExams,
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

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Try a different port: PORT=4174 node server.js`);
    process.exit(1);
  }

  if (error.code === "EPERM") {
    console.error(`Cannot listen on ${HOST}:${PORT}. Try local host: HOST=127.0.0.1 node server.js`);
    process.exit(1);
  }

  throw error;
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    const displayHost = HOST === "0.0.0.0" ? "127.0.0.1" : HOST;
    console.log(`Topway server running at http://${displayHost}:${PORT}/`);
  });
}

module.exports = {
  normalizeData,
  getPassageUnitKey,
  getQuestionReadinessIssues,
  resolveBankQuestionsByIds,
  bankIdSelectionError,
  makeQuestionsFromCsv,
  selectOneQuestionPerSourceGroup,
  resolveStrictMixSelection,
  validateExamMixConstraints,
  buildDisplayOrder,
};
