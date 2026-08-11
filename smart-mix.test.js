const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "app.js");
const appSource = fs.readFileSync(appPath, "utf8").replace(/\nrender\(\);\s*$/, "");
const scenario = String.raw`
const fields = {
  '#aiExamQuestionCount': { value: '4' },
  '#aiExamDifficultyMode': { value: 'balanced' },
  '#aiExamMaxPerSkill': { value: '8' },
  '#aiExamMaxPerGroup': { value: '20' },
  '#aiExamAvoidUsed': { checked: false },
  '#aiExamSubject': { value: 'English / Reading' },
  '#aiExamSourceTab': { value: '' },
  '#aiExamSkill': { value: '' },
  '#aiExamSection': { value: '' },
  '#aiExamReadingCount': { value: '2' },
  '#aiExamDifficulty1': { value: '1' },
  '#aiExamDifficulty2': { value: '1' },
  '#aiExamDifficulty3': { value: '1' },
  '#aiExamDifficulty4': { value: '1' },
};
document.querySelector = (selector) => fields[selector] || null;

const makeQuestion = (id, difficulty, reading) => ({
  id,
  sourceQuestionId: id.toUpperCase(),
  sourceGroupId: id.toUpperCase(),
  bankNumber: difficulty,
  originalNumber: difficulty,
  testClass: 'SHSAT ELA',
  subject: 'english',
  section: reading ? 'Reading Comprehension' : 'Grammar and Usage',
  skill: reading ? 'Main Idea' : 'Grammar & Editing',
  difficulty,
  type: 'multiple',
  choices: ['A', 'B', 'C', 'D'],
  answer: 'A',
  questionText: (reading ? 'What is the main idea of this passage?' : 'Which sentence is grammatically correct?') + '\nA. One\nB. Two\nC. Three\nD. Four ' + id,
  groupId: reading ? 'PASSAGE_' + id : '',
  passageTitle: reading ? 'Passage ' + id : '',
  passageText: reading ? 'Complete reading passage content for ' + id + '.' : '',
});
state.questionBank = [
  makeQuestion('read-1', 1, true),
  makeQuestion('read-2', 2, true),
  makeQuestion('grammar-3', 3, false),
  makeQuestion('grammar-4', 4, false),
];
state.exams = [];
bankClassFilter = 'all';
bankSubjectFilter = 'all';
bankSkillFilter = 'all';
bankDifficultyFilter = 'all';
bankTypeFilter = 'all';
bankSearch = '';

const exactPlan = buildSmartBankExamDraft();
assert.equal(exactPlan.complete, true);
assert.equal(exactPlan.selected.length, 4);
assert.equal(exactPlan.readingCount, 2);
assert.deepEqual(exactPlan.difficultyCounts, { 1: 1, 2: 1, 3: 1, 4: 1 });

fields['#aiExamReadingCount'].value = '3';
const impossiblePlan = buildSmartBankExamDraft();
assert.equal(impossiblePlan.complete, false);
assert.notEqual(impossiblePlan.readingCount, 3);
`;

const document = { querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} };
const context = {
  assert,
  console,
  localStorage: { removeItem() {}, getItem() { return ""; }, setItem() {} },
  location: { hostname: "localhost", search: "" },
  document,
  window: { addEventListener() {}, removeEventListener() {}, setTimeout, clearTimeout },
  navigator: {},
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  URL,
  URLSearchParams,
  Blob,
  fetch: async () => { throw new Error("Unexpected network request in smart-mix test"); },
};

vm.runInNewContext(`${appSource}\n${scenario}`, context, { filename: appPath });
console.log("Smart mix checks passed for exact reading-comprehension and Level 1–4 counts.");
