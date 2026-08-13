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
  '#mixReadingPercent': { value: '50' },
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
  '#mixAvoidUsed': { checked: true },
  '#mixTargetStudentId': { value: '' },
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
  { ...makeQuestion('read-missing-passage', 1, { reading: true, number: 8 }), passageTitle: '', passageText: '' },
  makeQuestion('grammar-1', 1, { number: 3 }),
  makeQuestion('grammar-2', 2, { number: 4 }),
  makeQuestion('grammar-3', 1, { number: 5 }),
  makeQuestion('unwanted-dropdown', 1, { type: 'dropdown', number: 6 }),
  makeQuestion('excluded-level-3', 3, { number: 7 }),
];
state.exams = [{ id: 'old-exam', questions: [{ ...state.questionBank.find((question) => question.id === 'grammar-1') }] }];
bankClassFilter = 'all';
bankSubjectFilter = 'English / Reading';
bankSkillFilter = 'all';
bankDifficultyFilter = 'all';
bankTypeFilter = 'all';
bankSearch = '';
bankFilteredCache = null;

bankSubjectFilter = 'Reading Comprehension';
const readingTabQuestions = getFilteredBankQuestions();
assert.equal(readingTabQuestions.some((question) => question.id === 'read-1'), true);
assert.equal(readingTabQuestions.some((question) => question.id === 'read-2'), true);
assert.equal(readingTabQuestions.some((question) => question.id === 'read-missing-passage'), true);
assert.equal(readingTabQuestions.some((question) => question.id === 'grammar-2'), false);
assert.equal(getBankBuildSubject(readingTabQuestions), 'English / Reading');
bankSubjectFilter = 'English / Reading';
bankFilteredCache = null;

const exactPlan = buildQuestionMixDraft();
assert.equal(exactPlan.complete, true);
assert.equal(exactPlan.selected.length, 4);
assert.equal(exactPlan.readingCount, 2);
assert.deepEqual(exactPlan.difficultyLevels, [1, 2]);
assert.equal(exactPlan.selected.every((question) => normalizeQuestionType(question.type) === 'multiple'), true);
assert.equal(exactPlan.selected.some((question) => question.id === 'unwanted-dropdown'), false);
assert.equal(exactPlan.selected.some((question) => question.id === 'excluded-level-3'), false);
assert.equal(exactPlan.selected.some((question) => question.id === 'grammar-1'), false);
assert.equal(exactPlan.selected.some((question) => question.id === 'grammar-3'), true);
assert.equal(exactPlan.avoidUsed, true);
assert.deepEqual(exactPlan.selected.filter(isBankReadingComprehensionQuestion).map((question) => question.id).sort(), ['read-1', 'read-2']);
assert.equal(fields['#mixMultiple'].value, '4');

state.students = [{ id: 'student-1', studentNumber: 'S001', name: 'Same Student', scoreHistory: [] }];
state.submissions = [{ studentRecordId: 'student-1', studentId: 'S001', examId: 'old-exam' }];
fields['#mixTargetStudentId'].value = 'student-1';
fields['#mixAvoidUsed'].checked = false;
bankFilteredCache = null;
const studentProtectedPlan = buildQuestionMixDraft();
assert.equal(studentProtectedPlan.selected.some((question) => question.id === 'grammar-1'), false);
assert.equal(studentProtectedPlan.targetStudentId, 'student-1');
assert.equal(studentProtectedPlan.studentSeenCount > 0, true);
fields['#mixTargetStudentId'].value = '';
fields['#mixAvoidUsed'].checked = true;

fields['#mixTotal'].value = '50';
fields['#mixReadingPercent'].value = '80';
updateFlexibleReadingFromPercent();
assert.equal(fields['#mixReadingCount'].value, '40');
fields['#mixReadingCount'].value = '25';
updateFlexibleReadingPercentFromCount();
assert.equal(fields['#mixReadingPercent'].value, '50');
fields['#mixTotal'].value = '4';
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
