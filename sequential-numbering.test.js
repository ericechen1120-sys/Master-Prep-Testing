const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appPath = path.join(__dirname, "..", "app.js");
const appSource = fs.readFileSync(appPath, "utf8").replace(/\nrender\(\);\s*$/, "");
const scenario = String.raw`
const testQuestions = Array.from({ length: 50 }, (_, index) => ({
  id: 'q' + (index + 1),
  number: index + 1,
  originalNumber: index < 5 ? 5 : 900 - index,
  section: 'ELA',
  type: 'multiple',
  choices: ['A', 'B', 'C', 'D'],
  answer: 'A',
  questionText: 'Question text',
  groupId: index === 1 || index === 19 ? 'shared-passage' : '',
  passageTitle: index === 1 || index === 19 ? 'Shared Passage' : '',
  passageText: index === 1 ? 'Passage text' : '',
}));

const printGroups = buildTeacherQuestionGroups(testQuestions);
const expectedOrder = printGroups.flatMap((group) => group.questions.map((question) => question.id));
activeOrder = expectedOrder;
activeExam = { id: 'exam-1', title: 'SHSAT ELA Practice Test', code: 'SHSAT-ELA', scoringMode: 'shsat_original', questions: testQuestions };
state.exams = [activeExam];

assert.equal(expectedOrder.length, 50);
assert.equal(getActiveQuestionDisplayNumber(testQuestions[0]), 1);
assert.equal(getActiveQuestionDisplayNumber(testQuestions[19]), 3);
assert.equal(getActiveQuestionDisplayNumber(testQuestions[49]), 50);

const liveHtml = renderStudentAllQuestions(expectedOrder.map((id) => testQuestions.find((question) => question.id === id)));
const liveNumbers = [...liveHtml.matchAll(/student-question-number">(\d+)</g)].map((match) => Number(match[1]));
assert.deepEqual(liveNumbers, Array.from({ length: 50 }, (_, index) => index + 1));
assert.match(liveHtml, /data-original-number="5"/);

const paperHtml = renderStudentPaperQuestionGroups(testQuestions, activeExam);
const paperNumbers = [...paperHtml.matchAll(/paper-question-label"><strong>(\d+)\.<\/strong>/g)].map((match) => Number(match[1]));
assert.deepEqual(paperNumbers, Array.from({ length: 50 }, (_, index) => index + 1));

const teacherHtml = renderTeacherQuestionGroups(testQuestions, 'exam', activeExam);
const teacherNumbers = [...teacherHtml.matchAll(/<h3>Question (\d+)<\/h3>/g)].map((match) => Number(match[1]));
assert.deepEqual(teacherNumbers, Array.from({ length: 50 }, (_, index) => index + 1));

const scoreRows = testQuestions.map((question, index) => ({
  questionId: question.id,
  number: question.number,
  originalNumber: question.originalNumber,
  section: question.section,
  studentAnswer: 'A',
  correctAnswer: 'A',
  correct: index < 42,
  points: 1,
  earned: index < 42 ? 1 : 0,
}));
const submission = {
  examId: 'exam-1',
  studentName: 'Test Student',
  displayOrder: expectedOrder,
  score: { rows: scoreRows, rawScore: 42, earned: 42, possible: 50, percent: 84 },
};
const reportRows = getSubmissionDisplayRows(submission);
assert.deepEqual(reportRows.map((row) => row.questionId), testQuestions.map((question) => question.id));
assert.deepEqual(reportRows.map((row) => row.displayNumber), Array.from({ length: 50 }, (_, index) => index + 1));
assert.equal(reportRows.find((row) => row.questionId === 'q1').originalNumber, 5);

const editorPreviewNumbers = testQuestions.slice(0, 5).map((question, index) => {
  const html = renderQuestionLivePreview(question, index + 1);
  return Number(html.match(/<span>Question (\d+)<\/span>/)?.[1]);
});
assert.deepEqual(editorPreviewNumbers, [1, 2, 3, 4, 5]);

const conversion = getShsatOriginalConversion(submission.score, activeExam);
assert.equal(conversion.rawScore, 42);
assert.equal(conversion.convertedScore, 283);

const performanceHtml = renderSubmissionReport(submission, true, { showProctoring: false, branded: true });
assert.match(performanceHtml, /Standard exam order/);
assert.doesNotMatch(performanceHtml, /Weakness Summary|Student Weakness Report|Overall Result/);
assert.match(performanceHtml, /SHSAT converted · Original chart/);
assert.match(performanceHtml, />283</);

const studentSafeSubmission = { ...submission, score: { rawScore: 42, shsatOriginal: conversion, rows: scoreRows.map(({ correct, correctAnswer, earned, points, ...row }) => row) } };
const studentCopyHtml = renderSubmissionReport(studentSafeSubmission, false);
assert.doesNotMatch(studentCopyHtml, /Correct<\/span>|Incorrect<\/span>|0\/50/);

const reviewHtml = renderStudentReviewPacket(submission, activeExam, reportRows, false);
const reportNumbers = [...reviewHtml.matchAll(/<strong>Q(\d+)<\/strong>/g)].map((match) => Number(match[1]));
assert.deepEqual(reportNumbers, Array.from({ length: 50 }, (_, index) => index + 1));
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
  fetch: async () => { throw new Error("Unexpected network request in numbering test"); },
};

vm.runInNewContext(`${appSource}\n${scenario}`, context, { filename: appPath });
console.log("Sequential numbering checks passed for live exam, student print, teacher print, and saved report (1-50). ");
