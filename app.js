const LETTERS = ["A", "B", "C", "D", "E"];
const TOKEN_KEY = "topwayAdminToken";
const SAMPLE_MATH_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420"><rect width="900" height="420" fill="#f8fafc"/><line x1="80" y1="340" x2="820" y2="340" stroke="#10263d" stroke-width="3"/><line x1="120" y1="370" x2="120" y2="60" stroke="#10263d" stroke-width="3"/><path d="M120 320 C240 220 330 250 420 160 S620 80 780 120" fill="none" stroke="#146c94" stroke-width="8"/><text x="138" y="82" font-family="Arial" font-size="26" fill="#10263d">Sample graph for a math question</text><text x="715" y="372" font-family="Arial" font-size="22" fill="#64748b">x</text><text x="92" y="84" font-family="Arial" font-size="22" fill="#64748b">y</text></svg>`);
const SAMPLE_PASSAGE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520"><rect width="900" height="520" fill="#f8fafc"/><rect x="80" y="60" width="740" height="400" rx="10" fill="#ffffff" stroke="#d8e1ea" stroke-width="3"/><text x="120" y="120" font-family="Georgia" font-size="30" fill="#10263d">Sample Reading Passage</text><text x="120" y="178" font-family="Georgia" font-size="22" fill="#334155">Students can attach one passage image to multiple</text><text x="120" y="218" font-family="Georgia" font-size="22" fill="#334155">English questions. When questions are randomized,</text><text x="120" y="258" font-family="Georgia" font-size="22" fill="#334155">the passage image stays attached to each question.</text><line x1="120" y1="310" x2="760" y2="310" stroke="#cbd5e1" stroke-width="3"/><line x1="120" y1="350" x2="720" y2="350" stroke="#cbd5e1" stroke-width="3"/><line x1="120" y1="390" x2="760" y2="390" stroke="#cbd5e1" stroke-width="3"/></svg>`);

let state = { exams: [], submissions: [] };
let selectedExamId = null;
let selectedSubmissionId = null;
let selectedQuestionId = null;
let activeExam = null;
let activeStudent = null;
let activeAnswers = {};
let activeOrder = [];
let activeSteps = [];
let timerHandle = null;
let remainingSeconds = 0;
let violations = 0;
let violationEvents = [];
let lockdownAttached = false;
let currentQuestionIndex = 0;
let lastViolationAt = 0;

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function render() {
  if (location.protocol === "file:") {
    renderServerRequired();
    return;
  }

  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  renderLanding();
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
}

function renderServerRequired() {
  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("student")}
      <main class="locked">
        <section class="panel login-panel stack">
          <h2>Secure Server Required</h2>
          <p class="subtle">This publish-ready version must run from the Topway server so passwords and answer keys stay hidden from students.</p>
          <p class="notice">Use the local server URL instead of opening the file directly: http://127.0.0.1:4173/</p>
        </section>
      </main>
    </div>
  `;
}

function renderTopbar(active = "admin") {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="mark">TOP<br />WAY</div>
        <div>
          <h1>Topway / Master Tutoring Center</h1>
          <small>權威英數教育 / Topway / Master Tutoring Center</small>
        </div>
      </div>
      <nav class="nav no-print">
        <button class="${active === "admin" ? "active" : ""}" onclick="adminLogin()">Admin</button>
        <button class="${active === "student" ? "active" : ""}" onclick="studentEntry()">Student</button>
      </nav>
    </header>
  `;
}

function renderLanding() {
  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("student")}
      <main class="locked">
        <section class="panel login-panel stack">
          <div class="section-head">
            <div>
              <h2>Student Test Entry</h2>
              <p class="subtle">Students only receive the exam screen. Answer keys, scores, and reports stay in admin.</p>
            </div>
          </div>
          <div class="field">
            <label>Student name</label>
            <input id="studentName" placeholder="Enter full name" autocomplete="off" />
          </div>
          <div class="field">
            <label>Test code</label>
            <input id="testCode" placeholder="Example: SAT-001" autocomplete="off" />
          </div>
          <button class="primary" onclick="startStudentExam()">Start Test</button>
          <button class="ghost" onclick="adminLogin()">Topway Admin Portal</button>
        </section>
      </main>
    </div>
  `;
}

function adminLogin() {
  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("admin")}
      <main class="locked">
        <section class="panel login-panel stack">
          <div>
            <h2>Topway Admin Portal</h2>
            <p class="subtle">Only Topway staff can upload exams, edit answer keys, grade results, and print reports.</p>
          </div>
          <div class="field">
            <label>Password</label>
            <input id="adminPassword" type="password" placeholder="Enter admin password" autocomplete="off" onkeydown="if(event.key === 'Enter') verifyAdminLogin()" />
          </div>
          <button class="primary" onclick="verifyAdminLogin()">Enter Admin Dashboard</button>
          <button class="ghost" onclick="studentEntry()">Back to Student Entry</button>
        </section>
      </main>
    </div>
  `;
}

async function verifyAdminLogin() {
  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: $("#adminPassword").value }),
    });
    localStorage.setItem(TOKEN_KEY, result.token);
    await loadAdminState();
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function studentEntry() {
  activeExam = null;
  activeStudent = null;
  renderLanding();
}

async function loadAdminState() {
  state = await api("/api/admin/state");
  selectedExamId = state.exams.find((item) => item.id === selectedExamId)?.id || state.exams[0]?.id || null;
  selectedSubmissionId =
    state.submissions.find((item) => item.id === selectedSubmissionId)?.id || state.submissions[0]?.id || null;
}

function renderAdmin() {
  const exam = state.exams.find((item) => item.id === selectedExamId) || state.exams[0] || null;
  const submission = state.submissions.find((item) => item.id === selectedSubmissionId) || state.submissions[0] || null;

  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("admin")}
      <main class="main grid">
        <section class="grid three">
          <div class="stat"><span class="subtle">Active Exams</span><strong>${state.exams.length}</strong></div>
          <div class="stat"><span class="subtle">Submissions</span><strong>${state.submissions.length}</strong></div>
          <div class="stat"><span class="subtle">Average Score</span><strong>${adminAverage()}%</strong></div>
        </section>
        <section class="grid two">
          <div class="panel stack">
            <div class="section-head">
              <div>
                <h2>Create Exam</h2>
                <p class="subtle">Create questions, attach images, add answer key, then share the test code.</p>
              </div>
            </div>
            <div class="field">
              <label>Exam title</label>
              <input id="examTitle" placeholder="SAT Practice Test 1" />
            </div>
            <div class="row">
              <div class="field" style="flex: 1 1 130px">
                <label>Test code</label>
                <input id="examCode" placeholder="SAT-001" />
              </div>
              <div class="field" style="flex: 1 1 130px">
                <label>Minutes</label>
                <input id="examMinutes" type="number" min="1" value="65" />
              </div>
              <div class="field" style="flex: 1 1 130px">
                <label>Question count</label>
                <input id="questionCount" type="number" min="1" value="20" />
              </div>
              <div class="field" style="flex: 1 1 130px">
                <label>Choices</label>
                <select id="choiceCount">
                  <option value="4">A-D</option>
                  <option value="5" selected>A-E</option>
                </select>
              </div>
            </div>
            <div class="row">
              <div class="field" style="flex: 1 1 180px">
                <label>Exam type</label>
                <select id="examType">
                  <option value="english">English / Reading</option>
                  <option value="math">Math step-by-step</option>
                </select>
              </div>
              <div class="field" style="flex: 1 1 220px">
                <label>Student flow</label>
                <select id="stepMode">
                  <option value="one" selected>One question at a time</option>
                  <option value="all">All questions on one page</option>
                </select>
              </div>
              <label class="row" style="margin-top: 22px"><input id="shuffleQuestions" type="checkbox" checked /> Randomize question order for students</label>
            </div>
            <div class="field">
              <label>Answer key CSV</label>
              <textarea id="answerKey" placeholder="section,question,answer&#10;Reading Module 1,1,A&#10;Reading Module 1,2,C&#10;Math Module 2,1,17"></textarea>
              <p class="hint">Use section/module names when the test has multiple parts. Mixed answers are supported: A-E or numeric/grid-in.</p>
            </div>
            <button class="primary" onclick="createExam()">Create Exam</button>
          </div>
          <div class="panel stack">
            <div class="section-head">
              <div>
                <h2>Exam Control</h2>
                <p class="subtle">Students cannot access this screen or any answer key data.</p>
              </div>
            </div>
            ${renderExamList(exam)}
          </div>
        </section>
        <section class="panel stack">
          <div class="section-head">
            <div>
              <h2>Results & Printing</h2>
                <p class="subtle">Reports are restored to original question order for review class.</p>
            </div>
            ${submission ? `<button class="ghost no-print" onclick="printSelectedReport()">Print Selected Report</button>` : ""}
          </div>
          ${renderResults(submission)}
        </section>
        <section class="panel stack">
          <div class="section-head">
            <div>
              <h2>SAT Score Calculator</h2>
              <p class="subtle">Quick approximate calculator from raw Reading/Writing and Math scores.</p>
            </div>
          </div>
          <div class="row">
            <div class="field" style="flex: 1 1 130px"><label>RW Correct</label><input id="rwRaw" type="number" min="0" value="0" oninput="updateSatCalculator()" /></div>
            <div class="field" style="flex: 1 1 130px"><label>RW Total</label><input id="rwTotal" type="number" min="1" value="54" oninput="updateSatCalculator()" /></div>
            <div class="field" style="flex: 1 1 130px"><label>Math Correct</label><input id="mathRaw" type="number" min="0" value="0" oninput="updateSatCalculator()" /></div>
            <div class="field" style="flex: 1 1 130px"><label>Math Total</label><input id="mathTotal" type="number" min="1" value="44" oninput="updateSatCalculator()" /></div>
          </div>
          <div id="satCalcResult" class="grid three"></div>
          <p class="hint">This is an approximate SAT-style estimate. Exact SAT conversion changes by test form, so a future version can support custom conversion tables per exam.</p>
        </section>
      </main>
    </div>
  `;
  updateSatCalculator();
}

function estimateSectionScore(correct, total) {
  if (!total) return null;
  const ratio = Math.max(0, Math.min(1, correct / total));
  return Math.round((200 + ratio * 600) / 10) * 10;
}

function updateSatCalculator() {
  const result = $("#satCalcResult");
  if (!result) return;
  const rwRaw = Number.parseFloat($("#rwRaw")?.value || "0");
  const rwTotal = Number.parseFloat($("#rwTotal")?.value || "54");
  const mathRaw = Number.parseFloat($("#mathRaw")?.value || "0");
  const mathTotal = Number.parseFloat($("#mathTotal")?.value || "44");
  const rwScore = estimateSectionScore(rwRaw, rwTotal);
  const mathScore = estimateSectionScore(mathRaw, mathTotal);
  result.innerHTML = `
    <div class="stat"><span class="subtle">Reading/Writing</span><strong>${rwScore || "N/A"}</strong></div>
    <div class="stat"><span class="subtle">Math</span><strong>${mathScore || "N/A"}</strong></div>
    <div class="stat"><span class="subtle">Total</span><strong>${rwScore && mathScore ? rwScore + mathScore : "N/A"}</strong></div>
  `;
}

function adminAverage() {
  if (!state.submissions.length) return 0;
  const total = state.submissions.reduce((sum, item) => sum + item.score.percent, 0);
  return Math.round(total / state.submissions.length);
}

function renderExamList(selected) {
  if (!state.exams.length) {
    return `<div class="notice">No exams yet. Create the first one and share its test code with students.</div>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Exam</th><th>Type</th><th>Code</th><th>Questions</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${state.exams
            .map(
              (exam) => `
                <tr>
                  <td><strong>${escapeHtml(exam.title)}</strong><br><span class="subtle">${exam.minutes} minutes</span></td>
                  <td>${exam.examType === "math" ? "Math" : "English"}</td>
                  <td><span class="pill">${escapeHtml(exam.code)}</span></td>
                  <td>${exam.questions.length}</td>
                  <td><span class="pill ${exam.open ? "ok" : "bad"}">${exam.open ? "Open" : "Closed"}</span></td>
                  <td class="row">
                    <button class="ghost" onclick="selectExam('${exam.id}')">${selected?.id === exam.id ? "Selected" : "Select"}</button>
                    <button class="ghost" onclick="toggleExam('${exam.id}')">${exam.open ? "Close" : "Open"}</button>
                    <button class="danger" onclick="deleteExam('${exam.id}')" type="button">Delete</button>
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ${selected ? renderQuestionEditor(selected) : ""}
  `;
}

function renderQuestionEditor(exam) {
  const questions = [...exam.questions].sort((a, b) => a.number - b.number);
  const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) || questions[0] || null;
  selectedQuestionId = selectedQuestion?.id || null;
  return `
    <div class="card stack">
      <div class="section-head">
        <div>
          <h3>Review Answer Key</h3>
          <p class="subtle">${escapeHtml(exam.title)} · Original PDF order · Click Edit for text and images</p>
        </div>
        <button class="ghost" onclick="saveQuestionEdits('${exam.id}')">Save Key</button>
      </div>
      <div class="table-wrap question-table-wrap">
        <table class="question-editor-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Section</th>
              <th>Module Q#</th>
              <th>Group</th>
              <th>Type</th>
              <th>Choices</th>
              <th>Correct</th>
              <th>Content</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${questions
              .map(
                (question) => `
                  <tr class="${selectedQuestion?.id === question.id ? "selected-row" : ""}">
                    <td>${question.number}</td>
                    <td><input data-q="${question.id}" data-field="section" value="${escapeHtml(question.section)}" /></td>
                    <td><input data-q="${question.id}" data-field="originalNumber" value="${escapeHtml(question.originalNumber || question.number)}" /></td>
                    <td><input data-q="${question.id}" data-field="groupId" value="${escapeHtml(question.groupId || "")}" placeholder="Passage A" /></td>
                    <td>
                      <select data-q="${question.id}" data-field="type">
                        <option value="multiple" ${question.type === "multiple" ? "selected" : ""}>Multiple</option>
                        <option value="numeric" ${question.type === "numeric" ? "selected" : ""}>Numeric</option>
                      </select>
                    </td>
                    <td><input data-q="${question.id}" data-field="choices" value="${escapeHtml((question.choices || []).join(", "))}" placeholder="A-E or E-H" /></td>
                    <td><input data-q="${question.id}" data-field="answer" value="${escapeHtml(question.answer)}" placeholder="A" /></td>
                    <td>
                      <button class="ghost mini" onclick="selectQuestion('${question.id}')" type="button">${selectedQuestion?.id === question.id ? "Editing" : "Edit"}</button>
                      <span class="subtle">${question.imageUrl || question.sharedImageUrl ? "Image set" : "No image"}</span>
                    </td>
                    <td><button class="danger mini" onclick="deleteQuestion('${exam.id}', '${question.id}', ${question.number})" type="button">Delete</button></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${selectedQuestion ? renderQuestionDetailPanel(selectedQuestion) : ""}
      <p class="hint">Use the same Group value for questions that share one passage. Questions inside a group stay in original order.</p>
    </div>
  `;
}

function renderQuestionDetailPanel(question) {
  return `
    <section class="question-detail-panel">
      <div class="section-head">
        <div>
          <h3>Question ${question.number} Details</h3>
          <p class="subtle">Use this panel for longer content and images.</p>
        </div>
        <button class="danger" onclick="deleteQuestion(selectedExamId, '${question.id}', ${question.number})" type="button">Delete Question</button>
      </div>
      <div class="grid two">
        <div class="field">
          <label>Question text</label>
          <textarea data-q="${question.id}" data-field="questionText" placeholder="Type the question here, or leave blank if the image contains the full question.">${escapeHtml(question.questionText || "")}</textarea>
        </div>
        <div class="stack">
          <div class="grid two compact-grid">
            <div class="field">
              <label>Section / Module</label>
              <input data-q="${question.id}" data-field="section" value="${escapeHtml(question.section)}" />
            </div>
            <div class="field">
              <label>Original question #</label>
              <input data-q="${question.id}" data-field="originalNumber" value="${escapeHtml(question.originalNumber || question.number)}" />
            </div>
            <div class="field">
              <label>Group / Passage ID</label>
              <input data-q="${question.id}" data-field="groupId" value="${escapeHtml(question.groupId || "")}" placeholder="Passage A" />
            </div>
            <div class="field">
              <label>Correct answer</label>
              <input data-q="${question.id}" data-field="answer" value="${escapeHtml(question.answer)}" placeholder="A or 17" />
            </div>
            <div class="field">
              <label>Answer type</label>
              <select data-q="${question.id}" data-field="type">
                <option value="multiple" ${question.type === "multiple" ? "selected" : ""}>Multiple choice</option>
                <option value="numeric" ${question.type === "numeric" ? "selected" : ""}>Grid-in / Numeric</option>
              </select>
            </div>
            <div class="field">
              <label>Choices</label>
              <input data-q="${question.id}" data-field="choices" value="${escapeHtml((question.choices || []).join(", "))}" placeholder="A-E or E-H" />
            </div>
          </div>
        </div>
      </div>
      <div class="grid two">
        <div class="field">
          <label>Question image</label>
          <input data-q="${question.id}" data-field="imageUrl" value="${escapeHtml(question.imageUrl || "")}" placeholder="Paste image URL, or upload below" />
          <div class="image-tools">
            <input type="file" accept="image/*" onchange="uploadQuestionImage('${question.id}', 'imageUrl', this.files[0])" />
            <button class="ghost" onclick="setQuestionImage('${question.id}', 'math')" type="button">Use Sample</button>
          </div>
        </div>
        <div class="field">
          <label>Shared passage image</label>
          <input data-q="${question.id}" data-field="sharedImageUrl" value="${escapeHtml(question.sharedImageUrl || "")}" placeholder="Same passage image for multiple English questions" />
          <div class="image-tools">
            <input type="file" accept="image/*" onchange="uploadQuestionImage('${question.id}', 'sharedImageUrl', this.files[0])" />
            <button class="ghost" onclick="setQuestionImage('${question.id}', 'passage')" type="button">Use Sample</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function selectQuestion(questionId) {
  const exam = state.exams.find((item) => item.id === selectedExamId);
  if (exam) syncQuestionEditsFromDom(exam);
  selectedQuestionId = questionId;
  renderAdmin();
}

function syncQuestionEditsFromDom(exam) {
  if (!exam) return;
  const questionMap = new Map(exam.questions.map((question) => [question.id, question]));
  document.querySelectorAll("[data-q][data-field]").forEach((input) => {
    const question = questionMap.get(input.dataset.q);
    if (!question) return;
    const field = input.dataset.field;
    const value = input.value.trim();
    if (field === "choices") question.choices = parseChoicesInput(value, question.choices);
    else if (field === "originalNumber") question.originalNumber = Number.parseInt(value, 10) || question.number;
    else if (field === "answer") question.answer = value.toUpperCase();
    else question[field] = value;
  });
}

function parseChoicesInput(value, fallback = []) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return fallback || [];
  const rangeMatch = trimmed.toUpperCase().match(/^([A-Z])\s*-\s*([A-Z])$/);
  if (rangeMatch) {
    const start = rangeMatch[1].charCodeAt(0);
    const end = rangeMatch[2].charCodeAt(0);
    if (end >= start && end - start <= 10) {
      return Array.from({ length: end - start + 1 }, (_, index) => String.fromCharCode(start + index));
    }
  }
  return trimmed
    .split(",")
    .map((choice) => choice.trim().toUpperCase())
    .filter(Boolean);
}

function setQuestionImage(questionId, sampleType) {
  const field = sampleType === "passage" ? "sharedImageUrl" : "imageUrl";
  const input = document.querySelector(`[data-q="${questionId}"][data-field="${field}"]`);
  if (input) input.value = sampleType === "passage" ? SAMPLE_PASSAGE_IMAGE : SAMPLE_MATH_IMAGE;
}

function uploadQuestionImage(questionId, field, file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Only image files are accepted.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const input = document.querySelector(`[data-q="${questionId}"][data-field="${field}"]`);
    if (input) input.value = reader.result;
  };
  reader.readAsDataURL(file);
}

function printSelectedReport() {
  const submission = state.submissions.find((item) => item.id === selectedSubmissionId) || state.submissions[0];
  if (!submission) return;
  $("#app").innerHTML = `
    <main class="report-only stack">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print</button>
      </div>
      ${renderSubmissionReport(submission, true)}
      <section class="card stack">
        <h3>Student-Safe Copy</h3>
        ${renderSubmissionReport(submission, false)}
      </section>
    </main>
  `;
}

function renderResults(selected) {
  if (!state.submissions.length) {
    return `<div class="notice">No student submissions yet.</div>`;
  }

  return `
    <div class="grid two">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th>Violations</th><th></th></tr></thead>
          <tbody>
            ${state.submissions
              .map((submission) => {
                const exam = state.exams.find((item) => item.id === submission.examId);
                return `
                  <tr>
                    <td><strong>${escapeHtml(submission.studentName)}</strong><br><span class="subtle">${new Date(submission.submittedAt).toLocaleString()}</span></td>
                    <td>${escapeHtml(exam?.title || "Deleted exam")}</td>
                    <td><span class="pill ${submission.score.percent >= 70 ? "ok" : "bad"}">${submission.score.earned}/${submission.score.possible} · ${submission.score.percent}%</span></td>
                    <td>${submission.violations}</td>
                    <td><button class="ghost" onclick="selectSubmission('${submission.id}')">Review</button></td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <div>
        ${selected ? renderSubmissionReport(selected) : ""}
      </div>
    </div>
  `;
}

function renderSubmissionReport(submission, showCorrect = true) {
  const exam = state.exams.find((item) => item.id === submission.examId);
  const violationLog = Array.isArray(submission.violationEvents) ? submission.violationEvents : [];
  return `
    <div class="card stack report-card">
      <div class="report-head">
        <div>
          <h3>${escapeHtml(submission.studentName)} Review Report</h3>
          <p class="subtle">${escapeHtml(exam?.title || "Exam")} · Original question order</p>
        </div>
        <div class="report-score">
          <span class="subtle">${showCorrect ? "Auto Grade" : "Student Copy"}</span>
          <strong>${showCorrect ? `${submission.score.earned}/${submission.score.possible}` : "Submitted"}</strong>
          ${showCorrect ? `<span class="subtle">${submission.score.percent}%</span>` : ""}
        </div>
      </div>
      ${
        showCorrect && violationLog.length
          ? `<div class="notice">
              <strong>Lockdown Events</strong>
              <div class="violation-log">
                ${violationLog
                  .map(
                    (event) =>
                      `<div>${escapeHtml(new Date(event.at).toLocaleString())} · ${escapeHtml(event.reason)} · ${escapeHtml(event.page || "Exam page")}</div>`
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>Question</th><th>Section</th><th>Student</th>${showCorrect ? "<th>Correct</th><th>Result</th>" : "<th>Status</th>"}</tr></thead>
          <tbody>
            ${submission.score.rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.section)} #${row.originalNumber || row.number}</td>
                    <td>${escapeHtml(row.section)}</td>
                    <td>${escapeHtml(row.studentAnswer || "Blank")}</td>
                    ${
                      showCorrect
                        ? `<td>${escapeHtml(row.correctAnswer || "Not set")}</td><td><span class="pill ${row.correct ? "ok" : "bad"}">${row.correct ? "Correct" : "Wrong"}</span></td>`
                        : `<td><span class="pill">Submitted</span></td>`
                    }
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function createExam() {
  try {
    const payload = {
      title: $("#examTitle").value.trim() || "Untitled Exam",
      code: $("#examCode").value.trim(),
      minutes: Math.max(1, Number.parseInt($("#examMinutes").value, 10) || 65),
      examType: $("#examType").value,
      stepMode: $("#stepMode").value,
      questionCount: Math.max(1, Number.parseInt($("#questionCount").value, 10) || 20),
      choiceCount: Math.max(4, Math.min(5, Number.parseInt($("#choiceCount").value, 10) || 5)),
      answerKey: $("#answerKey").value,
      shuffle: $("#shuffleQuestions").checked,
    };
    const result = await api("/api/admin/exams", { method: "POST", body: JSON.stringify(payload) });
    state = result;
    selectedExamId = state.exams[0]?.id || null;
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function selectExam(id) {
  selectedExamId = id;
  renderAdmin();
}

async function toggleExam(id) {
  try {
    state = await api(`/api/admin/exams/${id}/toggle`, { method: "POST" });
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteExam(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam) return;
  const relatedSubmissions = state.submissions.filter((submission) => submission.examId === id).length;
  const message = relatedSubmissions
    ? `Delete "${exam.title}" and its ${relatedSubmissions} saved submission/report(s)? This cannot be undone.`
    : `Delete "${exam.title}"? This cannot be undone.`;
  if (!confirm(message)) return;

  try {
    state = await api(`/api/admin/exams/${id}`, { method: "DELETE" });
    selectedExamId = state.exams[0]?.id || null;
    selectedSubmissionId = state.submissions[0]?.id || null;
    selectedQuestionId = null;
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteQuestion(examId, questionId, number) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  if (!confirm(`Delete question ${number}? Save any edits first. This cannot be undone.`)) return;

  try {
    state = await api(`/api/admin/exams/${examId}/questions/${questionId}`, { method: "DELETE" });
    const updatedExam = state.exams.find((item) => item.id === examId);
    selectedExamId = updatedExam?.id || state.exams[0]?.id || null;
    selectedQuestionId = updatedExam?.questions[0]?.id || null;
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function saveQuestionEdits(examId) {
  const questions = [];
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  syncQuestionEditsFromDom(exam);

  exam.questions.forEach((question) => {
    const edits = {
      id: question.id,
      section: question.section || "",
      originalNumber: question.originalNumber || question.number,
      groupId: question.groupId || "",
      type: question.type || "multiple",
      choices: (question.choices || []).join(", "),
      answer: question.answer || "",
      questionText: question.questionText || "",
      imageUrl: question.imageUrl || "",
      sharedImageUrl: question.sharedImageUrl || "",
    };
    document.querySelectorAll(`[data-q="${question.id}"][data-field]`).forEach((input) => {
      edits[input.dataset.field] = input.value.trim();
    });
    questions.push(edits);
  });

  try {
    state = await api(`/api/admin/exams/${examId}/questions`, {
      method: "POST",
      body: JSON.stringify({ questions }),
    });
    alert("Answer key saved.");
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function selectSubmission(id) {
  selectedSubmissionId = id;
  renderAdmin();
}

async function startStudentExam() {
  const name = $("#studentName").value.trim();
  const code = $("#testCode").value.trim().toUpperCase();
  if (!name || !code) {
    alert("Enter student name and test code.");
    return;
  }

  try {
    activeExam = await api(`/api/student/exam?code=${encodeURIComponent(code)}`);
    activeStudent = name;
    activeAnswers = {};
    activeOrder = activeExam.displayOrder;
    activeSteps = buildStudentSteps(activeExam, activeOrder);
    remainingSeconds = activeExam.minutes * 60;
    violations = 0;
    violationEvents = [];
    currentQuestionIndex = 0;
    renderExam();
  } catch (error) {
    alert(error.message);
  }
}

function renderExam() {
  stopTimer();
  const oneAtATime = activeExam.stepMode !== "all";
  const visibleQuestions =
    oneAtATime
      ? activeSteps[currentQuestionIndex] || []
      : activeOrder.map((id) => activeExam.questions.find((question) => question.id === id)).filter(Boolean);
  const footer =
    oneAtATime
      ? `<span class="subtle">${visibleQuestions.length > 1 ? "Passage group" : "Question"} ${currentQuestionIndex + 1} of ${activeSteps.length}. Answer all before moving on.</span><button class="primary" onclick="nextQuestion()">${currentQuestionIndex === activeSteps.length - 1 ? "Submit Test" : "Submit Answer"}</button>`
      : `<span class="subtle">Answers are saved only when you submit.</span><button class="danger" onclick="submitExam(false)">Submit Test</button>`;

  $("#app").innerHTML = `
    <div class="exam-layout single">
      <section class="exam-sheet">
        <div class="exam-header">
          <div>
            <strong>${escapeHtml(activeExam.title)}</strong>
            <p class="subtle">${escapeHtml(activeStudent)} · ${oneAtATime ? "One question at a time" : "Student View"}</p>
          </div>
          <div class="timer" id="timer">${formatTime(remainingSeconds)}</div>
        </div>
        <div class="questions">
          <div class="notice" id="lockNotice">Fullscreen is recommended. Tab switching is logged for admin review.</div>
          ${oneAtATime ? renderStudentStep(visibleQuestions, currentQuestionIndex + 1) : visibleQuestions.map((question, index) => renderStudentQuestion(question, index + 1)).join("")}
        </div>
        <div class="exam-footer">
          ${footer}
        </div>
      </section>
    </div>
  `;
  attachLockdown();
  startTimer();
}

function buildStudentSteps(exam, order) {
  const questionMap = new Map(exam.questions.map((question) => [question.id, question]));
  const steps = [];
  const seenGroups = new Set();

  order.forEach((id) => {
    const question = questionMap.get(id);
    if (!question) return;
    const groupId = String(question.groupId || "").trim();
    if (!groupId) {
      steps.push([question]);
      return;
    }
    if (seenGroups.has(groupId)) return;
    seenGroups.add(groupId);
    const groupQuestions = order
      .map((orderedId) => questionMap.get(orderedId))
      .filter((item) => item && String(item.groupId || "").trim() === groupId);
    steps.push(groupQuestions);
  });

  return steps;
}

function nextQuestion() {
  const currentStep = activeSteps[currentQuestionIndex] || [];
  const unanswered = currentStep.filter((question) => !activeAnswers[question.id]);
  if (unanswered.length) {
    alert(currentStep.length > 1 ? "Please answer every question in this passage group before moving on." : "Please answer this question before moving on.");
    return;
  }
  if (currentQuestionIndex === activeSteps.length - 1) submitExam(false);
  else {
    currentQuestionIndex += 1;
    renderExam();
  }
}

function renderStudentStep(questions, stepNumber) {
  if (questions.length <= 1) return questions.map((question) => renderStudentQuestion(question, stepNumber)).join("");
  const groupId = questions[0]?.groupId || `Group ${stepNumber}`;
  const sharedMedia = questions.find((question) => question.sharedImageUrl)?.sharedImageUrl || "";
  return `
    <section class="question-group">
      <div class="question-title">
        <span>${escapeHtml(groupId)}</span>
        <span class="subtle">${questions.length} questions</span>
      </div>
      ${sharedMedia ? `<figure class="question-media"><img src="${escapeHtml(sharedMedia)}" alt="Shared passage image" /></figure>` : ""}
      ${questions.map((question) => renderStudentQuestion(question, question.originalNumber || question.number, Boolean(sharedMedia))).join("")}
    </section>
  `;
}

function renderStudentQuestion(question, displayNumber, hideSharedMedia = false) {
  const current = activeAnswers[question.id] || "";
  return `
    <article class="question" data-section="${escapeHtml(question.section)}" data-original-number="${question.originalNumber || question.number}">
      <div class="question-title">
        <span>Question ${displayNumber}</span>
        <span class="subtle">${escapeHtml(question.section)} #${question.originalNumber || question.number}</span>
      </div>
      ${question.questionText ? `<div class="question-text">${escapeHtml(question.questionText)}</div>` : ""}
      ${renderQuestionMedia(question, hideSharedMedia)}
      ${
        question.type === "numeric"
          ? `<input value="${escapeHtml(current)}" placeholder="Enter numeric answer" data-original-number="${question.originalNumber || question.number}" data-section="${escapeHtml(question.section)}" oninput="setTextAnswer('${question.id}', this.value)" />`
          : `<div class="choices">
              ${(question.choices || [])
                .map(
                  (choice) => `
                    <button class="choice ${current === choice ? "selected" : ""}" data-original-number="${question.originalNumber || question.number}" data-section="${escapeHtml(question.section)}" data-choice="${escapeHtml(choice)}" onclick="setAnswer('${question.id}', this.dataset.choice)">${escapeHtml(choice)}</button>
                  `
                )
                .join("")}
            </div>`
      }
    </article>
  `;
}

function renderQuestionMedia(question, hideSharedMedia = false) {
  const media = question.imageUrl || (hideSharedMedia ? "" : question.sharedImageUrl);
  if (!media) return "";
  return `<figure class="question-media"><img src="${escapeHtml(media)}" alt="Question reference image" /></figure>`;
}

function setAnswer(questionId, answer) {
  activeAnswers[questionId] = String(answer).trim().toUpperCase();
  const scrollTop = $(".questions")?.scrollTop || 0;
  renderExam();
  const questions = $(".questions");
  if (questions) questions.scrollTop = scrollTop;
}

function setTextAnswer(questionId, answer) {
  activeAnswers[questionId] = String(answer).trim().toUpperCase();
}

function startTimer() {
  stopTimer();
  timerHandle = setInterval(() => {
    remainingSeconds -= 1;
    const timer = $("#timer");
    if (timer) timer.textContent = formatTime(Math.max(0, remainingSeconds));
    if (remainingSeconds <= 0) submitExam(true);
  }, 1000);
}

function formatTime(total) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function attachLockdown() {
  if (!lockdownAttached) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") recordViolation("Tab switch");
    });
    document.addEventListener("fullscreenchange", () => {
      if (activeExam && !document.fullscreenElement) recordViolation("Fullscreen exited");
    });
    window.addEventListener("blur", () => recordViolation("Window focus lost"));
    lockdownAttached = true;
  }
  document.oncontextmenu = (event) => event.preventDefault();
  document.oncopy = (event) => event.preventDefault();
  document.onpaste = (event) => event.preventDefault();
  document.documentElement.requestFullscreen?.().catch(() => {});
}

function recordViolation(reason) {
  if (!activeExam) return;
  const now = Date.now();
  if (now - lastViolationAt < 1200) return;
  lastViolationAt = now;
  violations += 1;
  violationEvents.push({
    reason,
    at: new Date(now).toISOString(),
    page: document.visibilityState === "hidden" ? "Exam page hidden; exact outside tab is unavailable" : "Exam page",
  });
  const notice = $("#lockNotice");
  if (notice) notice.textContent = `${reason} logged for admin review. Violations: ${violations}`;
}

async function submitExam(autoSubmit) {
  if (!activeExam) return;
  if (!autoSubmit && !confirm("Submit your test now? You cannot see answers after submitting.")) return;

  try {
    const result = await api("/api/student/submit", {
      method: "POST",
      body: JSON.stringify({
        examId: activeExam.id,
        studentName: activeStudent,
        answers: activeAnswers,
        displayOrder: activeOrder,
        violations,
        violationEvents,
        autoSubmit,
      }),
    });
    const safeSubmission = result.submission;
    activeExam = null;
    activeStudent = null;
    activeAnswers = {};
    activeOrder = [];
    activeSteps = [];
    violationEvents = [];
    clearInterval(timerHandle);
    timerHandle = null;
    document.exitFullscreen?.().catch(() => {});
    $("#app").innerHTML = `
      <div class="shell">
        ${renderTopbar("student")}
        <main class="main stack">
          <section class="panel stack">
            <h2>Test Submitted</h2>
            <p class="subtle">Your answers were sent to Topway. This student copy does not show correct answers.</p>
            <div class="row no-print">
              <button class="primary" onclick="window.print()">Print Student Report</button>
              <button class="ghost" onclick="studentEntry()">Return to Student Entry</button>
            </div>
          </section>
          ${safeSubmission ? renderSubmissionReport(safeSubmission, false) : ""}
        </main>
      </div>
    `;
  } catch (error) {
    alert(error.message);
  }
}

render();
