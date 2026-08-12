const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "app.js");
const appSource = fs.readFileSync(appPath, "utf8").replace(/\nrender\(\);\s*$/, "");
const scenario = String.raw`
const fields = {
  '#mixTotal': { value: '4' },
  '#mixMultiple': { value: '4' },
  '#mixReadingCount': { value: '2' },
  '#mixFillBlank': { value: '0' },
  '#mixDropdown': { value: '0' },
  '#mixDragDrop': { value: '0' },
  '#mixTableGrid': { value: '0' },
  '#mixNumeric': { value: '0' },
  '#mixEquation': { value: '0' },
  '#mixHotText': { value: '0' },
  '#mixHotspot': { value: '0' },
  '#mixDifficulty1': { checked: true },
  '#mixDifficulty2': { checked: true },
  '#mixDifficulty3': { checked: false },
  '#mixDifficulty4': { checked: false },
};
document.querySelector = (selector) => fields[selector] || null;

const makeQuestion = (id, difficulty, options = {}) => ({
  id,
  sourceQuestionId: id.toUpperCase(),
  sourceGroupId: id.toUpperCase(),
  bankNumber: options.number || 1,
  originalNumber: options.number || 1,
  testClass: 'SHSAT ELA',
  subject: 'english',
  section: options.reading ? 'Reading Comprehension' : 'Grammar and Usage',
  skill: options.reading ? 'Main Idea' : 'Grammar & Editing',
  difficulty,
  type: options.type || 'multiple',
  choices: ['A', 'B', 'C', 'D'],
  answer: 'A',
  questionText: 'Question ' + id + '?\nA. One\nB. Two\nC. Three\nD. Four',
  groupId: options.reading ? 'PASSAGE_A' : '',
  passageTitle: options.reading ? 'A Shared Passage' : '',
  passageText: options.reading ? 'The complete shared passage used by both questions.' : '',
});

state.questionBank = [
  makeQuestion('read-1', 1, { reading: true, number: 1 }),
  makeQuestion('read-2', 2, { reading: true, number: 2 }),
  makeQuestion('grammar-1', 1, { number: 3 }),
  makeQuestion('grammar-2', 2, { number: 4 }),
  makeQuestion('unwanted-dropdown', 1, { type: 'dropdown', number: 5 }),
  makeQuestion('excluded-level-3', 3, { number: 6 }),
];
bankClassFilter = 'all';
bankSubjectFilter = 'English / Reading';
bankSkillFilter = 'all';
bankDifficultyFilter = 'all';
bankTypeFilter = 'all';
bankSearch = '';
bankFilteredCache = null;

const exactPlan = buildQuestionMixDraft();
assert.equal(exactPlan.complete, true);
assert.equal(exactPlan.selected.length, 4);
assert.equal(exactPlan.readingCount, 2);
assert.deepEqual(exactPlan.difficultyLevels, [1, 2]);
assert.equal(exactPlan.selected.every((question) => normalizeQuestionType(question.type) === 'multiple'), true);
assert.equal(exactPlan.selected.some((question) => question.id === 'unwanted-dropdown'), false);
assert.equal(exactPlan.selected.some((question) => question.id === 'excluded-level-3'), false);
assert.deepEqual(exactPlan.selected.filter(isBankReadingComprehensionQuestion).map((question) => question.id).sort(), ['read-1', 'read-2']);
assert.equal(fields['#mixMultiple'].value, '4');

fields['#mixReadingCount'].value = '1';
const impossiblePassageSplit = buildQuestionMixDraft();
assert.equal(impossiblePassageSplit.complete, false);
assert.equal(impossiblePassageSplit.readingCount, 0);
assert.ok(impossiblePassageSplit.shortfalls.some((item) => item.type === 'Reading comprehension'));
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
  fetch: async () => { throw new Error("Unexpected network request in flexible-mix test"); },
};

vm.runInNewContext(`${appSource}\n${scenario}`, context, { filename: appPath });
console.log("Flexible mix checks passed for level selection, exact reading counts, passage safety, and zero optional formats.");
