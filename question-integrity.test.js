const assert = require("node:assert/strict");
const {
  normalizeData,
  getPassageUnitKey,
  getQuestionReadinessIssues,
  resolveBankQuestionsByIds,
  bankIdSelectionError,
  makeQuestionsFromCsv,
  selectOneQuestionPerSourceGroup,
} = require("../server.js");

function readingQuestion(overrides = {}) {
  return {
    id: "q-1",
    sourceQuestionId: "SOURCE-1",
    sourceGroupId: "SOURCE-1",
    number: 1,
    originalNumber: 1,
    testClass: "SHSAT ELA",
    subject: "english",
    section: "Reading",
    groupId: "PASSAGE_A",
    type: "multiple",
    choices: ["A", "B", "C", "D"],
    answer: "A",
    questionText: "What is this passage primarily about?\nA. One\nB. Two\nC. Three\nD. Four",
    passageTitle: "",
    passageText: "",
    sharedImageUrl: "",
    ...overrides,
  };
}

const bankQuestion = readingQuestion({
  id: "bank-1",
  sourceQuestionId: "BANK-1",
  sourceGroupId: "BANK-1",
  passageTitle: "Women in Basketball",
  passageText: "A complete reading passage used by this question.",
});
const brokenExamQuestion = readingQuestion({ id: "exam-1", sourceQuestionId: "EXAM-1", sourceGroupId: "EXAM-1" });
const normalized = normalizeData({
  questionBank: [bankQuestion],
  exams: [{ id: "exam", title: "Reading Test", questions: [brokenExamQuestion] }],
});

assert.equal(normalized.exams[0].questions[0].passageTitle, "Women in Basketball");
assert.equal(normalized.exams[0].questions[0].passageText, "A complete reading passage used by this question.");
assert.deepEqual(getQuestionReadinessIssues(normalized.exams[0].questions[0]), []);

const unrecoverable = readingQuestion({ questionText: "According to the passage, which answer is correct?\nA. One\nB. Two\nC. Three\nD. Four" });
assert.ok(getQuestionReadinessIssues(unrecoverable).includes("missing linked passage"));
unrecoverable.qualityApprovedAt = new Date().toISOString();
assert.ok(getQuestionReadinessIssues(unrecoverable).includes("missing linked passage"));

const repeatedImport = readingQuestion({
  id: "duplicate-2",
  sourceQuestionId: "OTHER-99",
  sourceGroupId: "OTHER-99",
  passageTitle: bankQuestion.passageTitle,
  passageText: bankQuestion.passageText,
});
const selection = selectOneQuestionPerSourceGroup([bankQuestion, repeatedImport]);
assert.equal(selection.selected.length, 1);
assert.equal(selection.omitted.length, 1);

const differentPassage = readingQuestion({
  passageTitle: "A Different Passage",
  passageText: "Different content under the same reused PASSAGE_A label.",
});
assert.notEqual(getPassageUnitKey(bankQuestion), getPassageUnitKey(differentPassage));

const secondBankQuestion = readingQuestion({
  id: "bank-2",
  sourceQuestionId: "BANK-2",
  sourceGroupId: "BANK-2",
  originalNumber: 2,
  questionText: "According to the passage, what happened second?\nA. One\nB. Two\nC. Three\nD. Four",
  passageTitle: bankQuestion.passageTitle,
  passageText: bankQuestion.passageText,
});
const orderedIds = resolveBankQuestionsByIds([bankQuestion, secondBankQuestion], ["BANK-2", "BANK-1"]);
assert.deepEqual(orderedIds.selected.map((question) => question.sourceQuestionId), ["BANK-2", "BANK-1"]);
assert.equal(bankIdSelectionError(orderedIds), "");

const missingId = resolveBankQuestionsByIds([bankQuestion], ["DOES-NOT-EXIST"]);
assert.match(bankIdSelectionError(missingId), /Nothing was changed.*IDs not found/i);
const duplicateIdList = resolveBankQuestionsByIds([bankQuestion], ["BANK-1", "bank-1"]);
assert.match(bankIdSelectionError(duplicateIdList), /repeated IDs/i);
const alreadyInExam = resolveBankQuestionsByIds([bankQuestion], ["BANK-1"], [bankQuestion]);
assert.match(bankIdSelectionError(alreadyInExam), /already present|duplicated by content/i);

const validCsv = [
  "Question,Choice A,Choice B,Choice C,Choice D,Correct Answer,Passage ID,Passage Text",
  '"What is the main idea?","One","Two","Three","Four","A","PASSAGE_1","A complete passage for this question."',
].join("\n");
const validCsvQuestions = makeQuestionsFromCsv(validCsv, { idPrefix: "CSV" });
assert.equal(validCsvQuestions.length, 1);
assert.deepEqual(getQuestionReadinessIssues(validCsvQuestions[0]), []);
const brokenCsv = validCsv.replace("A complete passage for this question.", "");
const brokenCsvQuestions = makeQuestionsFromCsv(brokenCsv, { idPrefix: "CSV" });
assert.ok(getQuestionReadinessIssues(brokenCsvQuestions[0]).includes("missing linked passage"));

const preservedOrder = normalizeData({
  exams: [{
    id: "ordered-exam",
    questions: [
      readingQuestion({ id: "first-in-exam", number: 1, originalNumber: 50, passageTitle: "Passage", passageText: "Text" }),
      readingQuestion({ id: "second-in-exam", number: 2, originalNumber: 1, passageTitle: "Passage", passageText: "Text" }),
    ],
  }],
}).exams[0].questions;
assert.deepEqual(preservedOrder.map((question) => question.id), ["first-in-exam", "second-in-exam"]);
assert.deepEqual(preservedOrder.map((question) => question.number), [1, 2]);

console.log("Question integrity checks passed: saved exam order, passage repair, strict CSV validation, duplicate prevention, passage identity, and safe Question-ID loading.");
