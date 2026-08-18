const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "app.js");
const appSource = fs.readFileSync(appPath, "utf8").replace(/\nrender\(\);\s*$/, "");
const scenario = String.raw`
const makeBankFixture = (id, originalNumber, text) => ({
  id: 'internal-' + id,
  sourceQuestionId: id,
  sourceGroupId: id,
  bankNumber: originalNumber,
  originalNumber,
  testClass: 'SHSAT ELA',
  subject: 'english',
  section: 'Reading',
  type: 'multiple',
  choices: ['A', 'B', 'C', 'D'],
  answer: 'A',
  questionText: text + '\nA. One\nB. Two\nC. Three\nD. Four',
  groupId: 'PASSAGE_A',
  passageTitle: 'A complete passage',
  passageText: 'The full passage text is attached to every selected question.',
});
const first = makeBankFixture('BANK-1', 1, 'What is the main idea of the passage?');
const second = makeBankFixture('BANK-2', 2, 'According to the passage, what happened second?');
state.questionBank = [first, second];

const csv = 'Order,Question ID\n2,BANK-2\n1,BANK-1';
const inspection = analyzeExamIdCsv(csv);
assert.deepEqual(inspection.ids, ['BANK-1', 'BANK-2']);
assert.equal(inspection.ready.length, 2);
assert.equal(inspection.invalid.length, 0);
assert.equal(inspection.errors.length, 0);

const repeated = analyzeExamIdCsv('Question ID\nBANK-1\nBANK-1');
assert.equal(repeated.invalid.length, 1);
assert.match(repeated.invalid[0].issue, /Repeated ID/);

const missing = analyzeExamIdCsv('Question ID\nUNKNOWN-9');
assert.equal(missing.invalid.length, 1);
assert.match(missing.invalid[0].issue, /not found/);

const existingExam = { examType: 'english', questions: [{ ...first }] };
const existing = inspectQuestionIds(['BANK-1'], existingExam);
assert.equal(existing.invalid.length, 1);
assert.match(existing.invalid[0].issue, /Already in exam|duplicate/);

const preview = renderQuestionIdInspection(inspection);
assert.match(preview, /BANK-1/);
assert.match(preview, /2 ready/);
`;

const context = {
  assert,
  console,
  localStorage: { removeItem() {}, getItem() { return ""; }, setItem() {} },
  location: { hostname: "localhost", search: "" },
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
  fetch: async () => { throw new Error("Unexpected network request in Question-ID import test"); },
};

vm.runInNewContext(`${appSource}\n${scenario}`, context, { filename: appPath });
console.log("Question-ID CSV checks passed for ordering, missing IDs, duplicate IDs, and existing-exam protection.");
