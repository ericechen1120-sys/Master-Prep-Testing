const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "app.js");
const appSource = fs.readFileSync(appPath, "utf8").replace(/\nrender\(\);\s*$/, "");
const scenario = String.raw`
const fields = {
  '#aiExamQuestionCount': { value: '4' },
  '#aiExamDifficultyMode': { value: 'mix12' },
  '#aiExamMaxPerSkill': { value: '8' },
  '#aiExamMaxPerGroup': { value: '20' },
  '#aiExamAvoidUsed': { checked: false },
  '#aiExamSubject': { value: 'English / Reading' },
  '#aiExamSourceTab': { value: '' },
  '#aiExamSkill': { value: '' },
  '#aiExamSection': { value: '' },
  '#aiExamReadingCount': { value: '2' },
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
  makeQuestion('grammar-1', 1, false),
  makeQuestion('grammar-2', 2, false),
  makeQuestion('excluded-3', 3, false),
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
assert.deepEqual([...new Set(exactPlan.selected.map((question) => question.difficulty))].sort(), [1, 2]);
assert.equal(exactPlan.selected.some((question) => question.id === 'excluded-3'), false);
assert.equal(exactPlan.difficultyModeLabel, 'Mix Levels 1–2');

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
console.log("Smart mix checks passed for exact reading-comprehension counts and automatic difficulty ranges.");
