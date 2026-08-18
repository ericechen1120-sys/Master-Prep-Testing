const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { sparseSectionChange } = require("../server");

const previousExams = Array.from({ length: 20 }, (_, index) => ({ id: `exam-${index + 1}`, title: `Exam ${index + 1}`, open: true }));
const nextExams = previousExams.map((exam) => ({ ...exam }));
nextExams[7].open = false;
const sparseExamUpdate = sparseSectionChange("exams", nextExams, JSON.stringify(previousExams));
assert.ok(sparseExamUpdate);
assert.deepEqual(sparseExamUpdate.nextIds, nextExams.map((exam) => exam.id));
assert.deepEqual(sparseExamUpdate.changedItems, [nextExams[7]]);

const fullyChangedExams = previousExams.map((exam) => ({ ...exam, title: `${exam.title} changed` }));
assert.equal(sparseSectionChange("exams", fullyChangedExams, JSON.stringify(previousExams)), null);
assert.equal(sparseSectionChange("students", [{ id: "student-1" }], "[]"), null);

const appPath = path.join(__dirname, "..", "app.js");
const appSource = fs.readFileSync(appPath, "utf8").replace(/\nrender\(\);\s*$/, "");
const scenario = String.raw`
state = {
  exams: [{ id: 'exam-1', title: 'Old title' }],
  submissions: [],
  students: [],
  attempts: [{ id: 'attempt-1' }, { id: 'attempt-2' }],
  classes: [],
  questionBank: [],
};
const result = await api('/api/admin/exams/exam-1/toggle', { method: 'POST' });
assert.equal(state.exams.length, 2);
assert.equal(state.exams.find((exam) => exam.id === 'exam-1').title, 'Updated title');
assert.equal(state.exams[0].id, 'exam-2');
assert.equal(state.attempts.map((attempt) => attempt.id).join(','), 'attempt-2');
assert.equal(state.classes.map((item) => item.id).join(','), 'class-1');
assert.equal(result.operation, 'saved');
assert.equal(result.exams, state.exams);
`;

const payload = {
  stateChanges: {
    exams: { upsert: [{ id: "exam-1", title: "Updated title" }, { id: "exam-2", title: "New exam" }] },
    attempts: { removeIds: ["attempt-1"] },
    classes: { replace: [{ id: "class-1", name: "Class 1" }] },
  },
  operation: "saved",
};

const context = {
  assert,
  console,
  localStorage: { removeItem() {}, getItem() { return ""; }, setItem() {} },
  sessionStorage: { getItem() { return "test-token"; }, setItem() {}, removeItem() {} },
  location: { hostname: "localhost", protocol: "http:", search: "" },
  document: { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} },
  window: { addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout },
  navigator: {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  URL,
  URLSearchParams,
  Blob,
  FormData,
  fetch: async () => ({ ok: true, json: async () => payload }),
};

(async () => {
  await vm.runInNewContext(`(async () => { ${appSource}\n${scenario} })()`, context, { filename: appPath });
  console.log("Performance state checks passed for sparse database updates and compact browser state merging.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
