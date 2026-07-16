const LETTERS = ["A", "B", "C", "D", "E"];
const TOKEN_KEY = "topwayAdminToken";
localStorage.removeItem(TOKEN_KEY);
const SAMPLE_MATH_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420"><rect width="900" height="420" fill="#f8fafc"/><line x1="80" y1="340" x2="820" y2="340" stroke="#10263d" stroke-width="3"/><line x1="120" y1="370" x2="120" y2="60" stroke="#10263d" stroke-width="3"/><path d="M120 320 C240 220 330 250 420 160 S620 80 780 120" fill="none" stroke="#146c94" stroke-width="8"/><text x="138" y="82" font-family="Arial" font-size="26" fill="#10263d">Sample graph for a math question</text><text x="715" y="372" font-family="Arial" font-size="22" fill="#64748b">x</text><text x="92" y="84" font-family="Arial" font-size="22" fill="#64748b">y</text></svg>`);
const SAMPLE_PASSAGE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520"><rect width="900" height="520" fill="#f8fafc"/><rect x="80" y="60" width="740" height="400" rx="10" fill="#ffffff" stroke="#d8e1ea" stroke-width="3"/><text x="120" y="120" font-family="Georgia" font-size="30" fill="#10263d">Sample Reading Passage</text><text x="120" y="178" font-family="Georgia" font-size="22" fill="#334155">Students can attach one passage image to multiple</text><text x="120" y="218" font-family="Georgia" font-size="22" fill="#334155">English questions. When questions are randomized,</text><text x="120" y="258" font-family="Georgia" font-size="22" fill="#334155">the passage image stays attached to each question.</text><line x1="120" y1="310" x2="760" y2="310" stroke="#cbd5e1" stroke-width="3"/><line x1="120" y1="350" x2="720" y2="350" stroke="#cbd5e1" stroke-width="3"/><line x1="120" y1="390" x2="760" y2="390" stroke="#cbd5e1" stroke-width="3"/></svg>`);

let state = { exams: [], submissions: [], students: [], attempts: [], classes: [] };
let selectedExamId = null;
let selectedSubmissionId = null;
let selectedQuestionId = null;
let selectedStudentId = null;
let selectedClassId = null;
let adminActiveTab = "exams";
let reportSearch = "";
let reportExamFilter = "all";
let studentSearch = "";
let studentGroupFilter = "all";
let studentTermFilter = "all";
let studentClassFilter = "all";
let activeExam = null;
let activeStudent = null;
let activeStudentId = "";
let activeAttemptId = "";
let activeAnswers = {};
let activeOrder = [];
let activeSteps = [];
let mediaZooms = {};
let timerHandle = null;
let remainingSeconds = 0;
let violations = 0;
let violationEvents = [];
let lockdownAttached = false;
let currentQuestionIndex = 0;
let lastViolationAt = 0;
let examStartedAt = 0;
let awayStartedAt = 0;
let blurStartedAt = 0;
let fullscreenExitAt = 0;

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
  const token = sessionStorage.getItem(TOKEN_KEY);
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

function clearAdminSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

function renderTopbar(active = "admin", showAdminTabs = false) {
  return `
    <header class="topbar">
      <div class="brand">
        <img class="brand-logo" src="/assets/topway-prep-logo.png" alt="Topway Prep" />
      </div>
      <div class="topbar-actions no-print">
        <nav class="nav main-nav">
          <button class="${active === "admin" ? "active" : ""}" onclick="adminLogin()">Admin</button>
          <button class="${active === "student" ? "active" : ""}" onclick="studentEntry()">Student</button>
        </nav>
        ${active === "admin" && showAdminTabs ? renderAdminTabs("topbar-tabs") : ""}
      </div>
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
            <label>Student ID <span class="label-note">Optional</span></label>
            <input id="studentId" placeholder="Optional student ID" autocomplete="off" />
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
  clearAdminSession();
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
    sessionStorage.setItem(TOKEN_KEY, result.token);
    await loadAdminState();
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function studentEntry() {
  clearAdminSession();
  activeExam = null;
  activeStudent = null;
  renderLanding();
}

async function loadAdminState() {
  state = await api("/api/admin/state");
  selectedExamId = state.exams.find((item) => item.id === selectedExamId)?.id || state.exams[0]?.id || null;
  selectedSubmissionId =
    state.submissions.find((item) => item.id === selectedSubmissionId)?.id || state.submissions[0]?.id || null;
  selectedStudentId = state.students.find((item) => item.id === selectedStudentId)?.id || state.students[0]?.id || null;
  selectedClassId = state.classes.find((item) => item.id === selectedClassId)?.id || state.classes[0]?.id || null;
}

function renderAdmin() {
  if (!sessionStorage.getItem(TOKEN_KEY)) {
    adminLogin();
    return;
  }
  const exam = state.exams.find((item) => item.id === selectedExamId) || state.exams[0] || null;
  const submission = state.submissions.find((item) => item.id === selectedSubmissionId) || state.submissions[0] || null;

  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("admin", true)}
      <main class="main grid">
        <section class="grid five">
          <div class="stat"><span class="subtle">Active Exams</span><strong>${state.exams.length}</strong></div>
          <div class="stat"><span class="subtle">Student Profiles</span><strong>${state.students.length}</strong></div>
          <div class="stat"><span class="subtle">In Progress</span><strong>${(state.attempts || []).filter((attempt) => attempt.status !== "submitted").length}</strong></div>
          <div class="stat"><span class="subtle">Submissions</span><strong>${state.submissions.length}</strong></div>
          <div class="stat"><span class="subtle">Average Score</span><strong>${adminAverage()}%</strong></div>
        </section>
        ${adminActiveTab === "reports" ? renderReportsWorkspace(submission) : ""}
        ${adminActiveTab === "students" ? renderStudentsWorkspace() : ""}
        ${adminActiveTab === "classes" ? renderClassesWorkspace() : ""}
        ${adminActiveTab === "tools" ? renderToolsWorkspace() : ""}
        ${adminActiveTab === "exams" ? renderExamWorkspace(exam) : ""}
      </main>
    </div>
  `;
  updateSatCalculator();
}

function renderAdminTabs(extraClass = "") {
  return `
    <nav class="admin-tabs ${extraClass}">
      <button class="${adminActiveTab === "exams" ? "active" : ""}" onclick="setAdminTab('exams')" type="button">
        Exams
        <span>Create & Settings</span>
      </button>
      <button class="${adminActiveTab === "reports" ? "active" : ""}" onclick="setAdminTab('reports')" type="button">
        Reports
        <span>${state.submissions.length} saved</span>
      </button>
      <button class="${adminActiveTab === "students" ? "active" : ""}" onclick="setAdminTab('students')" type="button">
        Students
        <span>${state.students.length} profiles</span>
      </button>
      <button class="${adminActiveTab === "classes" ? "active" : ""}" onclick="setAdminTab('classes')" type="button">
        Classes
        <span>${state.classes.length} rosters</span>
      </button>
      <button class="${adminActiveTab === "tools" ? "active" : ""}" onclick="setAdminTab('tools')" type="button">
        Tools
        <span>SAT calculator</span>
      </button>
    </nav>
  `;
}

function setAdminTab(tab) {
  if (!sessionStorage.getItem(TOKEN_KEY)) {
    adminLogin();
    return;
  }
  adminActiveTab = tab;
  renderAdmin();
}

function renderExamWorkspace(exam) {
  return `
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
            <h2>Exam Settings</h2>
            <p class="subtle">Create and manage exams in one place.</p>
          </div>
        </div>
        ${renderExamList(exam)}
      </div>
    </section>
  `;
}

function renderReportsWorkspace(submission) {
  return `
    <section class="panel stack">
      <div class="section-head">
        <div>
          <h2>Student Reports</h2>
          <p class="subtle">Search by student name, filter by exam, then review or print.</p>
        </div>
        ${submission ? `<button class="ghost no-print" onclick="printSelectedReport()">Print Selected Report</button>` : ""}
      </div>
      ${renderResults(submission)}
    </section>
  `;
}

function classNameForStudent(student) {
  const classRecord = (state.classes || []).find((item) => item.id === student.classId);
  return classRecord?.name || "";
}

function classRoster(classRecord) {
  if (!classRecord) return [];
  return (state.students || []).filter(
    (student) => student.classId === classRecord.id || (!student.classId && (student.group || "") === classRecord.name)
  );
}

function classReports(classRecord) {
  const roster = classRoster(classRecord);
  const studentIds = new Set(roster.map((student) => student.id));
  const studentNumbers = new Set(roster.map((student) => String(student.studentNumber || "").toLowerCase()));
  return (state.submissions || []).filter(
    (submission) =>
      studentIds.has(submission.studentRecordId) ||
      studentNumbers.has(String(submission.studentId || "").toLowerCase())
  );
}

function classAverage(classRecord) {
  const reports = classReports(classRecord);
  if (!reports.length) return 0;
  return Math.round(reports.reduce((sum, report) => sum + (report.score?.percent || 0), 0) / reports.length);
}

function renderClassOptions(selectedId = "") {
  return `
    <option value="" ${!selectedId ? "selected" : ""}>No class assigned</option>
    ${(state.classes || [])
      .map((classRecord) => `<option value="${classRecord.id}" ${selectedId === classRecord.id ? "selected" : ""}>${escapeHtml(classRecord.name)} (${escapeHtml(classRecord.term || "Unassigned")})</option>`)
      .join("")}
  `;
}

function renderStudentsWorkspace() {
  const groups = [...new Set((state.students || []).map((student) => student.group || "Ungrouped"))].sort();
  const terms = [...new Set((state.students || []).map((student) => student.term || "Unassigned"))].sort();
  const search = studentSearch.trim().toLowerCase();
  const filteredStudents = (state.students || []).filter((student) => {
    const matchesGroup = studentGroupFilter === "all" || (student.group || "Ungrouped") === studentGroupFilter;
    const matchesTerm = studentTermFilter === "all" || (student.term || "Unassigned") === studentTermFilter;
    const matchesClass = studentClassFilter === "all" || (student.classId || "") === studentClassFilter;
    const studentClassName = classNameForStudent(student);
    const matchesSearch =
      !search ||
      String(student.name || "").toLowerCase().includes(search) ||
      String(student.studentNumber || "").toLowerCase().includes(search) ||
      String(student.group || "").toLowerCase().includes(search) ||
      String(studentClassName || "").toLowerCase().includes(search) ||
      String(student.term || "").toLowerCase().includes(search) ||
      String(student.grade || "").toLowerCase().includes(search) ||
      String(student.school || "").toLowerCase().includes(search) ||
      String(student.parentName || "").toLowerCase().includes(search) ||
      String(student.tags || "").toLowerCase().includes(search) ||
      String(student.notes || "").toLowerCase().includes(search);
    return matchesGroup && matchesTerm && matchesClass && matchesSearch;
  });
  const selectedStudent = state.students.find((student) => student.id === selectedStudentId) || filteredStudents[0] || null;
  const studentReports = selectedStudent
    ? state.submissions.filter(
        (submission) =>
          submission.studentRecordId === selectedStudent.id ||
          String(submission.studentId || "").toLowerCase() === String(selectedStudent.studentNumber || "").toLowerCase()
      )
    : [];
  const activeCount = (state.students || []).filter((student) => (student.status || "Active") === "Active").length;

  return `
    <section class="student-workspace">
      <div class="student-command-bar panel">
        <div>
          <h2>Student Management</h2>
          <p class="subtle">Search profiles, organize classes and terms, and open each student's test record.</p>
        </div>
        <div class="student-kpis">
          <div class="stat"><span class="subtle">Profiles</span><strong>${state.students.length}</strong></div>
          <div class="stat"><span class="subtle">Active</span><strong>${activeCount}</strong></div>
          <div class="stat"><span class="subtle">Classes</span><strong>${state.classes.length}</strong></div>
          <div class="stat"><span class="subtle">Reports</span><strong>${state.submissions.length}</strong></div>
        </div>
      </div>
      <div class="panel stack">
        <div class="section-head compact-head">
          <div>
            <h3>Student Directory</h3>
            <p class="subtle">Filter first, then select a profile to edit.</p>
          </div>
          <span class="pill">${filteredStudents.length} shown</span>
        </div>
        <div class="report-filters student-filters">
          <div class="field">
            <label>Find student</label>
            <input id="studentSearch" value="${escapeHtml(studentSearch)}" placeholder="Search name, ID, or group" oninput="setStudentSearch(this.value)" />
          </div>
          <div class="field">
            <label>Group</label>
            <select id="studentGroupFilter" onchange="setStudentGroupFilter(this.value)">
              <option value="all" ${studentGroupFilter === "all" ? "selected" : ""}>All groups</option>
              ${groups.map((group) => `<option value="${escapeHtml(group)}" ${studentGroupFilter === group ? "selected" : ""}>${escapeHtml(group)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Term</label>
            <select id="studentTermFilter" onchange="setStudentTermFilter(this.value)">
              <option value="all" ${studentTermFilter === "all" ? "selected" : ""}>All terms</option>
              ${terms.map((term) => `<option value="${escapeHtml(term)}" ${studentTermFilter === term ? "selected" : ""}>${escapeHtml(term)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label>Class</label>
            <select id="studentClassFilter" onchange="setStudentClassFilter(this.value)">
              <option value="all" ${studentClassFilter === "all" ? "selected" : ""}>All classes</option>
              ${(state.classes || [])
                .map((classRecord) => `<option value="${classRecord.id}" ${studentClassFilter === classRecord.id ? "selected" : ""}>${escapeHtml(classRecord.name)}</option>`)
                .join("")}
            </select>
          </div>
          <div class="report-count">
            <span class="subtle">Showing</span>
            <strong>${filteredStudents.length}</strong>
          </div>
        </div>
        ${renderStudentList(filteredStudents, selectedStudent)}
        ${renderCreateStudentCard(false)}
      </div>
      <div class="panel stack">
        ${
          selectedStudent
            ? renderStudentProfileDetail(selectedStudent, studentReports)
            : `<div class="notice">No student profiles yet. Add your first student profile on the left.</div>`
        }
      </div>
    </section>
  `;
}

function renderCreateStudentCard(open = false) {
  return `
    <details class="create-student-card" ${open ? "open" : ""}>
      <summary>
        <span>
          <strong>Add Student Profile</strong>
          <small>Student ID and name are required for admin profiles.</small>
        </span>
        <span class="pill">New</span>
      </summary>
      <div class="create-student-body">
        <div class="grid two compact-grid">
          <div class="field">
            <label>Student ID</label>
            <input id="newStudentNumber" placeholder="Example: TW-1024" />
          </div>
          <div class="field">
            <label>Student name</label>
            <input id="newStudentName" placeholder="Full name" />
          </div>
          <div class="field">
            <label>Class</label>
            <select id="newStudentClassId">${renderClassOptions()}</select>
          </div>
          <div class="field">
            <label>Term</label>
            <input id="newStudentTerm" placeholder="Spring 26, Summer 26" />
          </div>
          <div class="field">
            <label>Group</label>
            <input id="newStudentGroup" placeholder="SAT Morning, Grade 8, etc." />
          </div>
          <div class="field">
            <label>Status</label>
            <select id="newStudentStatus">
              <option value="Active">Active</option>
              <option value="Paused">Paused</option>
              <option value="Graduated">Graduated</option>
              <option value="Lead">Lead</option>
            </select>
          </div>
          <div class="field">
            <label>Grade</label>
            <input id="newStudentGrade" placeholder="Example: Grade 10" />
          </div>
          <div class="field">
            <label>School</label>
            <input id="newStudentSchool" placeholder="Optional" />
          </div>
          <div class="field">
            <label>Email</label>
            <input id="newStudentEmail" placeholder="Optional" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input id="newStudentPhone" placeholder="Optional" />
          </div>
          <div class="field">
            <label>Parent</label>
            <input id="newStudentParentName" placeholder="Optional" />
          </div>
          <div class="field">
            <label>Parent phone</label>
            <input id="newStudentParentPhone" placeholder="Optional" />
          </div>
          <div class="field">
            <label>Tags</label>
            <input id="newStudentTags" placeholder="SAT, Math, Trial" />
          </div>
          <div class="field">
            <label>Notes</label>
            <input id="newStudentNotes" placeholder="Optional notes" />
          </div>
        </div>
        <button class="primary" onclick="createStudent()" type="button">Create Student</button>
      </div>
    </details>
  `;
}

function renderStudentList(students, selectedStudent) {
  if (!students.length) return `<div class="notice">No students match this filter.</div>`;
  return `
    <div class="student-list">
      ${students
        .map((student) => {
          const studentClassName = classNameForStudent(student);
          return `
            <button class="student-row ${selectedStudent?.id === student.id ? "active" : ""}" onclick="selectStudent('${student.id}')" type="button">
              <span class="student-avatar">${studentInitials(student.name)}</span>
              <span><strong>${escapeHtml(student.name)}</strong><small>${escapeHtml(student.studentNumber)} · ${escapeHtml(student.term || "Unassigned")} · ${escapeHtml(studentClassName || student.group || "No class")}</small></span>
              <span class="pill ${studentStatusClass(student.status)}">${escapeHtml(student.status || "Active")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderStudentProfileDetail(student, reports) {
  const logEntries = Array.isArray(student.logEntries) ? student.logEntries : [];
  const latestReport = reports[0] || null;
  const latestExam = latestReport ? state.exams.find((item) => item.id === latestReport.examId) : null;
  const studentClassName = classNameForStudent(student);
  return `
    <section class="student-profile-hero">
      <div class="student-avatar large">${studentInitials(student.name)}</div>
      <div class="student-profile-title">
        <div class="row">
          <h2>${escapeHtml(student.name)}</h2>
          <span class="pill ${studentStatusClass(student.status)}">${escapeHtml(student.status || "Active")}</span>
        </div>
        <p class="subtle">${escapeHtml(student.studentNumber)} · ${escapeHtml(studentClassName || student.group || "Ungrouped")} · ${escapeHtml(student.term || "Unassigned")} · ${escapeHtml(student.school || "No school listed")}</p>
        <div class="profile-tags">
          ${String(student.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .map((tag) => `<span>${escapeHtml(tag)}</span>`)
            .join("")}
        </div>
      </div>
      <div class="profile-actions">
        <button class="primary" onclick="saveStudent('${student.id}')" type="button">Save Student</button>
        <button class="danger" onclick="deleteStudent('${student.id}')" type="button">Delete</button>
      </div>
    </section>
    <div class="profile-summary">
      <div class="stat"><span class="subtle">Status</span><strong>${escapeHtml(student.status || "Active")}</strong></div>
      <div class="stat"><span class="subtle">Term</span><strong>${escapeHtml(student.term || "Unassigned")}</strong></div>
      <div class="stat"><span class="subtle">Class</span><strong>${escapeHtml(studentClassName || "None")}</strong></div>
      <div class="stat"><span class="subtle">Grade</span><strong>${escapeHtml(student.grade || "N/A")}</strong></div>
      <div class="stat"><span class="subtle">Reports</span><strong>${reports.length}</strong></div>
    </div>
    <div class="student-record-grid">
      <section class="card stack">
        <h3>Student Record</h3>
        <div class="grid two compact-grid">
          <div class="field">
            <label>Student ID</label>
            <input id="editStudentNumber" value="${escapeHtml(student.studentNumber)}" />
          </div>
          <div class="field">
            <label>Name</label>
            <input id="editStudentName" value="${escapeHtml(student.name)}" />
          </div>
          <div class="field">
            <label>Group</label>
            <input id="editStudentGroup" value="${escapeHtml(student.group || "Ungrouped")}" />
          </div>
          <div class="field">
            <label>Term</label>
            <input id="editStudentTerm" value="${escapeHtml(student.term || "Unassigned")}" placeholder="Spring 26, Summer 26" />
          </div>
          <div class="field">
            <label>Class</label>
            <select id="editStudentClassId">${renderClassOptions(student.classId || "")}</select>
          </div>
          <div class="field">
            <label>Status</label>
            <select id="editStudentStatus">
              ${["Active", "Paused", "Graduated", "Lead"]
                .map((status) => `<option value="${status}" ${(student.status || "Active") === status ? "selected" : ""}>${status}</option>`)
                .join("")}
            </select>
          </div>
          <div class="field">
            <label>Grade</label>
            <input id="editStudentGrade" value="${escapeHtml(student.grade || "")}" />
          </div>
          <div class="field">
            <label>School</label>
            <input id="editStudentSchool" value="${escapeHtml(student.school || "")}" />
          </div>
          <div class="field">
            <label>Tags</label>
            <input id="editStudentTags" value="${escapeHtml(student.tags || "")}" placeholder="SAT, Math, Trial" />
          </div>
          <div class="field">
            <label>Notes</label>
            <input id="editStudentNotes" value="${escapeHtml(student.notes || "")}" />
          </div>
        </div>
      </section>
      <section class="card stack">
        <h3>Contact & Guardian</h3>
        <div class="grid two compact-grid">
          <div class="field">
            <label>Email</label>
            <input id="editStudentEmail" value="${escapeHtml(student.email || "")}" />
          </div>
          <div class="field">
            <label>Phone</label>
            <input id="editStudentPhone" value="${escapeHtml(student.phone || "")}" />
          </div>
          <div class="field">
            <label>Parent</label>
            <input id="editStudentParentName" value="${escapeHtml(student.parentName || "")}" />
          </div>
          <div class="field">
            <label>Parent phone</label>
            <input id="editStudentParentPhone" value="${escapeHtml(student.parentPhone || "")}" />
          </div>
        </div>
        <div class="profile-contact-card">
          <span><strong>${escapeHtml(student.email || "No email")}</strong><small>Student email</small></span>
          <span><strong>${escapeHtml(student.parentPhone || student.phone || "No phone")}</strong><small>Best contact</small></span>
        </div>
      </section>
    </div>
    <section class="student-profile-tabs">
      <span class="active">Activity</span>
      <span>Tests</span>
      <span>Notes</span>
      <span>Contacts</span>
    </section>
    <section class="card stack">
      <div class="section-head">
        <div>
          <h3>Activity Timeline</h3>
          <p class="subtle">Manual logs and test submissions in one place.</p>
        </div>
        ${latestReport ? `<span class="pill ${latestReport.score.percent >= 70 ? "ok" : "bad"}">Latest: ${latestReport.score.percent}%</span>` : ""}
      </div>
      <div class="grid two compact-grid">
        <div class="field">
          <label>Log type</label>
          <select id="studentLogType">
            <option value="Note">Note</option>
            <option value="Parent Contact">Parent Contact</option>
            <option value="Goal">Goal</option>
            <option value="Follow-up">Follow-up</option>
          </select>
        </div>
        <div class="field">
          <label>Log note</label>
          <input id="studentLogNote" placeholder="Add a quick note to this profile" />
        </div>
      </div>
      <button class="ghost" onclick="addStudentLog('${student.id}')" type="button">Add Log Entry</button>
      ${renderStudentTimeline(logEntries, reports)}
    </section>
    <div class="section-head">
      <div>
        <h3>Test History</h3>
        <p class="subtle">Tests are linked when the submitted Student ID matches this profile.</p>
      </div>
      ${latestReport ? `<span class="subtle">Last test: ${escapeHtml(latestExam?.title || "Exam")}</span>` : ""}
    </div>
    ${
      reports.length
        ? `<div class="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Exam</th><th>Score</th><th></th></tr></thead>
              <tbody>
                ${reports
                  .map((submission) => {
                    const exam = state.exams.find((item) => item.id === submission.examId);
                    return `<tr>
                      <td>${new Date(submission.submittedAt).toLocaleString()}</td>
                      <td>${escapeHtml(exam?.title || "Deleted exam")}</td>
                      <td><span class="pill ${submission.score.percent >= 70 ? "ok" : "bad"}">${submission.score.percent}%</span></td>
                      <td><button class="ghost" onclick="selectSubmission('${submission.id}')">Open Report</button></td>
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="notice">No reports linked to this student yet.</div>`
    }
  `;
}

function studentAverage(reports) {
  if (!reports.length) return 0;
  return Math.round(reports.reduce((sum, report) => sum + (report.score?.percent || 0), 0) / reports.length);
}

function studentInitials(name) {
  const parts = String(name || "Student")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return escapeHtml((parts[0]?.[0] || "S") + (parts[1]?.[0] || ""));
}

function studentStatusClass(status) {
  const normalized = String(status || "Active").toLowerCase();
  if (normalized === "active") return "ok";
  if (normalized === "paused") return "warn";
  if (normalized === "graduated") return "";
  return "bad";
}

function renderStudentTimeline(logEntries, reports) {
  const logItems = logEntries.map((entry) => ({
    at: entry.at,
    type: entry.type || "Note",
    title: entry.note || "",
    detail: "Manual profile log",
    badgeClass: "",
  }));
  const testItems = reports.map((submission) => {
    const exam = state.exams.find((item) => item.id === submission.examId);
    return {
      at: submission.submittedAt,
      type: "Test",
      title: `${exam?.title || "Deleted exam"} · ${submission.score?.percent || 0}%`,
      detail: `${submission.score?.earned || 0}/${submission.score?.possible || 0} correct · ${submission.violations || 0} violation(s)`,
      badgeClass: (submission.score?.percent || 0) >= 70 ? "ok" : "bad",
    };
  });
  const items = [...logItems, ...testItems].sort((left, right) => new Date(right.at) - new Date(left.at));

  if (!items.length) return `<div class="notice">No activity yet. Add a log entry or wait for the student to submit a test.</div>`;

  return `
    <div class="activity-log timeline">
      ${items
        .map(
          (item) => `
            <div class="activity-log-item">
              <span class="pill ${item.badgeClass}">${escapeHtml(item.type)}</span>
              <strong>${escapeHtml(item.title)}</strong>
              <span class="subtle">${escapeHtml(item.detail)}</span>
              <small>${new Date(item.at).toLocaleString()}</small>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderClassesWorkspace() {
  const selectedClass = (state.classes || []).find((item) => item.id === selectedClassId) || state.classes[0] || null;

  return `
    <section class="grid two class-workspace">
      <div class="panel stack">
        <div class="section-head">
          <div>
            <h2>Classes</h2>
            <p class="subtle">Create rosters by term, then review students and test results from one place.</p>
          </div>
        </div>
        ${renderClassList(selectedClass)}
        ${renderCreateClassCard()}
      </div>
      <div class="panel stack">
        ${selectedClass ? renderClassDetail(selectedClass) : `<div class="notice">No classes yet. Add a class to start building rosters.</div>`}
      </div>
    </section>
  `;
}

function renderCreateClassCard() {
  return `
    <details class="create-student-card create-class-card">
      <summary>
        <span>
          <strong>Add Class</strong>
          <small>Create a new roster for a term or schedule.</small>
        </span>
        <span class="pill">New</span>
      </summary>
      <div class="create-student-body">
        <div class="grid two compact-grid sidebar-form-grid">
          <div class="field">
            <label>Class name</label>
            <input id="newClassName" placeholder="SAT Summer AM" />
          </div>
          <div class="field">
            <label>Term</label>
            <input id="newClassTerm" placeholder="Summer 26" />
          </div>
          <div class="field">
            <label>Schedule</label>
            <input id="newClassSchedule" placeholder="Sat 10:00 AM" />
          </div>
          <div class="field">
            <label>Teacher</label>
            <input id="newClassTeacher" placeholder="Optional" />
          </div>
          <div class="field">
            <label>Room</label>
            <input id="newClassRoom" placeholder="Optional" />
          </div>
          <div class="field">
            <label>Notes</label>
            <input id="newClassNotes" placeholder="Optional notes" />
          </div>
        </div>
        <button class="primary" onclick="createClass()" type="button">Create Class</button>
      </div>
    </details>
  `;
}

function renderClassList(selectedClass) {
  if (!state.classes.length) return `<div class="notice">No classes created yet.</div>`;
  return `
    <div class="class-list">
      ${state.classes
        .map((classRecord) => {
          const roster = classRoster(classRecord);
          const reports = classReports(classRecord);
          return `
            <button class="class-row ${selectedClass?.id === classRecord.id ? "active" : ""}" onclick="selectClass('${classRecord.id}')" type="button">
              <span>
                <strong>${escapeHtml(classRecord.name)}</strong>
                <small>${escapeHtml(classRecord.term || "Unassigned")} · ${escapeHtml(classRecord.schedule || "No schedule")}</small>
              </span>
              <span class="pill">${roster.length} students</span>
              <span class="pill ${classAverage(classRecord) >= 70 ? "ok" : reports.length ? "bad" : ""}">${reports.length ? `${classAverage(classRecord)}% avg` : "No results"}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderClassDetail(classRecord) {
  const roster = classRoster(classRecord);
  const reports = classReports(classRecord);
  const attempts = (state.attempts || []).filter((attempt) =>
    roster.some(
      (student) =>
        attempt.studentRecordId === student.id ||
        String(attempt.studentId || "").toLowerCase() === String(student.studentNumber || "").toLowerCase()
    )
  );

  return `
    <div class="section-head">
      <div>
        <h2>${escapeHtml(classRecord.name)}</h2>
        <p class="subtle">${escapeHtml(classRecord.term || "Unassigned")} · ${escapeHtml(classRecord.schedule || "No schedule")}</p>
      </div>
      <div class="row">
        <button class="primary" onclick="saveClass('${classRecord.id}')" type="button">Save Class</button>
        <button class="danger" onclick="deleteClass('${classRecord.id}')" type="button">Delete</button>
      </div>
    </div>
    <div class="profile-summary class-summary">
      <div class="stat"><span class="subtle">Students</span><strong>${roster.length}</strong></div>
      <div class="stat"><span class="subtle">Submitted</span><strong>${reports.length}</strong></div>
      <div class="stat"><span class="subtle">In Progress</span><strong>${attempts.filter((attempt) => attempt.status !== "submitted").length}</strong></div>
      <div class="stat"><span class="subtle">Average</span><strong>${reports.length ? `${classAverage(classRecord)}%` : "N/A"}</strong></div>
    </div>
    <section class="card stack">
      <h3>Class Settings</h3>
      <div class="grid two compact-grid">
        <div class="field">
          <label>Class name</label>
          <input id="editClassName" value="${escapeHtml(classRecord.name)}" />
        </div>
        <div class="field">
          <label>Term</label>
          <input id="editClassTerm" value="${escapeHtml(classRecord.term || "Unassigned")}" />
        </div>
        <div class="field">
          <label>Schedule</label>
          <input id="editClassSchedule" value="${escapeHtml(classRecord.schedule || "")}" />
        </div>
        <div class="field">
          <label>Teacher</label>
          <input id="editClassTeacher" value="${escapeHtml(classRecord.teacher || "")}" />
        </div>
        <div class="field">
          <label>Room</label>
          <input id="editClassRoom" value="${escapeHtml(classRecord.room || "")}" />
        </div>
        <div class="field">
          <label>Notes</label>
          <input id="editClassNotes" value="${escapeHtml(classRecord.notes || "")}" />
        </div>
      </div>
    </section>
    <section class="card stack">
      <div class="section-head">
        <div>
          <h3>Students In This Class</h3>
          <p class="subtle">Assign or edit class membership from the Students tab.</p>
        </div>
      </div>
      ${
        roster.length
          ? `<div class="table-wrap">
              <table>
                <thead><tr><th>Student</th><th>ID</th><th>Term</th><th>Latest Result</th><th></th></tr></thead>
                <tbody>
                  ${roster
                    .map((student) => {
                      const studentReports = reports
                        .filter(
                          (submission) =>
                            submission.studentRecordId === student.id ||
                            String(submission.studentId || "").toLowerCase() === String(student.studentNumber || "").toLowerCase()
                        )
                        .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt));
                      const latest = studentReports[0];
                      const exam = latest ? state.exams.find((item) => item.id === latest.examId) : null;
                      return `<tr>
                        <td><strong>${escapeHtml(student.name)}</strong><br><span class="subtle">${escapeHtml(student.grade || "No grade")}</span></td>
                        <td>${escapeHtml(student.studentNumber)}</td>
                        <td>${escapeHtml(student.term || "Unassigned")}</td>
                        <td>${latest ? `<span class="pill ${latest.score.percent >= 70 ? "ok" : "bad"}">${latest.score.percent}%</span><br><span class="subtle">${escapeHtml(exam?.title || "Exam")}</span>` : `<span class="subtle">No submitted test</span>`}</td>
                        <td><button class="ghost" onclick="selectStudent('${student.id}')" type="button">Open Profile</button></td>
                      </tr>`;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="notice">No students assigned yet. Open a student profile and choose this class.</div>`
      }
    </section>
    <section class="card stack">
      <h3>Class Test Results</h3>
      ${
        reports.length
          ? `<div class="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Student</th><th>Exam</th><th>Score</th><th></th></tr></thead>
                <tbody>
                  ${reports
                    .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt))
                    .map((submission) => {
                      const exam = state.exams.find((item) => item.id === submission.examId);
                      return `<tr>
                        <td>${new Date(submission.submittedAt).toLocaleString()}</td>
                        <td>${escapeHtml(submission.studentName)}</td>
                        <td>${escapeHtml(exam?.title || "Deleted exam")}</td>
                        <td><span class="pill ${submission.score.percent >= 70 ? "ok" : "bad"}">${submission.score.percent}%</span></td>
                        <td><button class="ghost" onclick="selectSubmission('${submission.id}')" type="button">Open Report</button></td>
                      </tr>`;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>`
          : `<div class="notice">No submitted test results for this class yet.</div>`
      }
    </section>
  `;
}

function renderToolsWorkspace() {
  return `
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
  `;
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
    ${selected ? renderExamSettings(selected) : ""}
    ${selected ? renderQuestionEditor(selected) : ""}
  `;
}

function renderExamSettings(exam) {
  return `
    <section class="card stack exam-settings-panel">
      <div class="section-head">
        <div>
          <h3>Selected Exam Settings</h3>
          <p class="subtle">Rename the exam or adjust the test code, timing, flow, and status.</p>
        </div>
        <button class="primary" onclick="saveExamSettings('${exam.id}')" type="button">Save Settings</button>
      </div>
      <div class="grid two compact-grid">
        <div class="field">
          <label>Exam name</label>
          <input id="editExamTitle" value="${escapeHtml(exam.title)}" />
        </div>
        <div class="field">
          <label>Test code</label>
          <input id="editExamCode" value="${escapeHtml(exam.code)}" />
        </div>
        <div class="field">
          <label>Minutes</label>
          <input id="editExamMinutes" type="number" min="1" value="${escapeHtml(exam.minutes)}" />
        </div>
        <div class="field">
          <label>Subject</label>
          <select id="editExamType">
            <option value="english" ${exam.examType !== "math" ? "selected" : ""}>English / Reading</option>
            <option value="math" ${exam.examType === "math" ? "selected" : ""}>Math</option>
          </select>
        </div>
        <div class="field">
          <label>Student flow</label>
          <select id="editStepMode">
            <option value="one" ${exam.stepMode !== "all" ? "selected" : ""}>One question at a time</option>
            <option value="all" ${exam.stepMode === "all" ? "selected" : ""}>All questions on one page</option>
          </select>
        </div>
        <div class="field">
          <label>Status</label>
          <select id="editExamOpen">
            <option value="open" ${exam.open ? "selected" : ""}>Open for students</option>
            <option value="closed" ${!exam.open ? "selected" : ""}>Closed</option>
          </select>
        </div>
      </div>
      <label class="row"><input id="editShuffleQuestions" type="checkbox" ${exam.shuffle !== false ? "checked" : ""} /> Randomize question order for students</label>
      <p class="hint">Changing these settings keeps the same exam, questions, and saved reports connected.</p>
    </section>
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
          <h3>Question Editor</h3>
          <p class="subtle">${escapeHtml(exam.title)} · Select a question on the left, edit details on the right.</p>
        </div>
        <div class="row">
          <button class="ghost" onclick="addQuestion('${exam.id}')" type="button">Add Question</button>
          <button class="ghost" onclick="saveQuestionEdits('${exam.id}')">Save Key</button>
        </div>
      </div>
      <div class="question-editor-layout">
        <aside class="question-nav-list">
          ${questions
            .map(
              (question) => `
                <button class="question-nav-item ${selectedQuestion?.id === question.id ? "active" : ""}" onclick="selectQuestion('${question.id}')" type="button">
                  <span class="question-nav-number">Q${question.number}</span>
                  <span>
                    <strong>${escapeHtml(question.section || "Section")}</strong>
                    <small>Original #${escapeHtml(question.originalNumber || question.number)} · Answer ${escapeHtml(question.answer || "unset")}</small>
                  </span>
                  <span class="pill ${question.imageUrl || question.sharedImageUrl ? "ok" : ""}">${question.imageUrl || question.sharedImageUrl ? "Media" : "Text"}</span>
                </button>
              `
            )
            .join("")}
        </aside>
        <div class="question-editor-detail">
          ${selectedQuestion ? renderQuestionDetailPanel(selectedQuestion) : `<div class="notice">Select a question to edit.</div>`}
        </div>
      </div>
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
      ${renderSubmissionReport(submission, true, { showProctoring: false })}
      <section class="card stack">
        <h3>Student-Safe Copy</h3>
        ${renderSubmissionReport(submission, false)}
      </section>
    </main>
  `;
}

function renderResults(selected) {
  const reportRows = buildReportRows();
  if (!reportRows.length) {
    return `<div class="notice">No student activity yet.</div>`;
  }

  const search = reportSearch.trim().toLowerCase();
  const filteredRows = reportRows.filter((row) => {
    const exam = state.exams.find((item) => item.id === row.examId);
    const matchesExam = reportExamFilter === "all" || row.examId === reportExamFilter;
    const matchesSearch =
      !search ||
      String(row.studentName || "").toLowerCase().includes(search) ||
      String(row.studentId || "").toLowerCase().includes(search) ||
      String(row.studentGroup || "").toLowerCase().includes(search) ||
      String(row.status || "").toLowerCase().includes(search) ||
      String(exam?.title || "").toLowerCase().includes(search) ||
      String(row.submission?.score?.percent || "").includes(search);
    return matchesExam && matchesSearch;
  });
  const selectedReport = selected && filteredRows.some((row) => row.submission?.id === selected.id) ? selected : filteredRows.find((row) => row.submission)?.submission || selected;

  return `
    <div class="report-filters">
      <div class="field">
        <label>Find student or exam</label>
        <input id="reportSearch" value="${escapeHtml(reportSearch)}" placeholder="Type a student name or exam title" oninput="setReportSearch(this.value)" />
      </div>
      <div class="field">
        <label>Exam</label>
        <select id="reportExamFilter" onchange="setReportExamFilter(this.value)">
          <option value="all" ${reportExamFilter === "all" ? "selected" : ""}>All exams</option>
          ${state.exams
            .map((exam) => `<option value="${exam.id}" ${reportExamFilter === exam.id ? "selected" : ""}>${escapeHtml(exam.title)}</option>`)
            .join("")}
        </select>
      </div>
      <div class="report-count">
        <span class="subtle">Showing</span>
        <strong>${filteredRows.length}</strong>
      </div>
    </div>
    ${
      filteredRows.length
        ? `
    <div class="grid two report-layout">
      <div class="report-list">
        ${filteredRows
          .map((row) => {
            const submission = row.submission;
            const exam = state.exams.find((item) => item.id === row.examId);
            return `
              <article class="report-row-card ${selectedReport?.id === submission?.id ? "active" : ""}">
                <div class="report-row-main">
                  <div>
                    <strong>${escapeHtml(row.studentName)}</strong>
                    <p class="subtle">${escapeHtml(row.studentId || "No ID")} · ${escapeHtml(row.studentGroup || "No group")}</p>
                  </div>
                  <span class="pill ${row.status === "Submitted" ? "ok" : "warn"}">${row.status}</span>
                </div>
                <div class="report-row-meta">
                  <span>${escapeHtml(exam?.title || "Deleted exam")}</span>
                  <span>${row.submittedAt ? new Date(row.submittedAt).toLocaleString() : `Started ${new Date(row.startedAt).toLocaleString()}`}</span>
                </div>
                <div class="report-row-actions">
                  ${submission ? `<span class="pill ${submission.score.percent >= 70 ? "ok" : "bad"}">${submission.score.earned}/${submission.score.possible} · ${submission.score.percent}%</span>` : `<span class="subtle">No report yet</span>`}
                  <span class="subtle">Violations: ${submission?.violations ?? "-"}</span>
                  ${submission ? `<button class="ghost" onclick="selectSubmission('${submission.id}')">Review</button>` : `<span class="subtle">Waiting</span>`}
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
      <div>
        ${selectedReport ? renderSubmissionReport(selectedReport) : ""}
      </div>
    </div>
    `
        : `<div class="notice">No reports match this search.</div>`
    }
  `;
}

function buildReportRows() {
  const submittedAttemptIds = new Set();
  const rows = [];
  (state.submissions || []).forEach((submission) => {
    const attempt = (state.attempts || []).find((item) => item.submissionId === submission.id);
    if (attempt) submittedAttemptIds.add(attempt.id);
    rows.push({
      id: submission.id,
      examId: submission.examId,
      studentName: submission.studentName,
      studentId: submission.studentId,
      studentGroup: submission.studentGroup,
      status: "Submitted",
      startedAt: attempt?.startedAt || submission.submittedAt,
      submittedAt: submission.submittedAt,
      submission,
    });
  });
  (state.attempts || [])
    .filter((attempt) => attempt.status !== "submitted" && !submittedAttemptIds.has(attempt.id))
    .forEach((attempt) => {
      rows.push({
        id: attempt.id,
        examId: attempt.examId,
        studentName: attempt.studentName,
        studentId: attempt.studentId,
        studentGroup: attempt.studentGroup,
        status: "In Progress",
        startedAt: attempt.startedAt,
        submittedAt: "",
        submission: null,
      });
    });
  return rows.sort((left, right) => new Date(right.submittedAt || right.startedAt) - new Date(left.submittedAt || left.startedAt));
}

function renderSubmissionReport(submission, showCorrect = true, options = {}) {
  const { showProctoring = true } = options;
  const exam = state.exams.find((item) => item.id === submission.examId);
  const violationLog = Array.isArray(submission.violationEvents) ? submission.violationEvents : [];
  const proctorSummary = summarizeProctoring(violationLog);
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
        showCorrect && showProctoring && violationLog.length
          ? renderProctoringSummary(proctorSummary, violationLog)
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

function summarizeProctoring(events) {
  const counts = { high: 0, medium: 0, low: 0, info: 0 };
  let awayMs = 0;
  const categories = new Map();
  events.forEach((event) => {
    const severity = ["high", "medium", "low", "info"].includes(event.severity) ? event.severity : "medium";
    counts[severity] += 1;
    if (event.durationMs) awayMs += event.durationMs;
    const category = event.category || "Lockdown";
    categories.set(category, (categories.get(category) || 0) + 1);
  });
  const riskScore = counts.high * 4 + counts.medium * 2 + counts.low + Math.floor(awayMs / 30000);
  const risk = riskScore >= 8 ? "High" : riskScore >= 4 ? "Medium" : events.length ? "Low" : "Clear";
  return { counts, awayMs, categories: [...categories.entries()], risk, riskScore };
}

function renderProctoringSummary(summary, events) {
  return `
    <section class="proctor-panel">
      <div class="section-head">
        <div>
          <h3>Proctoring Review</h3>
          <p class="subtle">Browser events only. The system cannot identify outside apps, websites, AI tools, calculators, or screen contents.</p>
        </div>
        <span class="pill ${summary.risk === "High" ? "bad" : summary.risk === "Medium" ? "warn" : "ok"}">${summary.risk} Risk</span>
      </div>
      <div class="proctor-stats">
        <div class="stat"><span class="subtle">Flagged</span><strong>${summary.counts.high + summary.counts.medium + summary.counts.low}</strong></div>
        <div class="stat"><span class="subtle">High</span><strong>${summary.counts.high}</strong></div>
        <div class="stat"><span class="subtle">Medium</span><strong>${summary.counts.medium}</strong></div>
        <div class="stat"><span class="subtle">Away Time</span><strong>${formatDuration(summary.awayMs)}</strong></div>
      </div>
      <div class="violation-log timeline">
        ${events
          .map(
            (event) => `
              <div class="proctor-event ${event.severity || "medium"}">
                <span class="pill ${event.severity === "high" ? "bad" : event.severity === "medium" ? "warn" : event.severity === "info" ? "" : "ok"}">${escapeHtml(event.severity || "medium")}</span>
                <div>
                  <strong>${escapeHtml(event.reason)}</strong>
                  <p class="subtle">${escapeHtml(event.category || "Lockdown")} · ${escapeHtml(event.detail || event.page || "Exam page")}</p>
                  <small>${escapeHtml(new Date(event.at).toLocaleString())}${event.durationMs ? ` · ${formatDuration(event.durationMs)}` : ""}${event.elapsedSeconds ? ` · ${formatDuration(event.elapsedSeconds * 1000)} into test` : ""}</small>
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round((ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
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
    adminActiveTab = "exams";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function selectExam(id) {
  selectedExamId = id;
  adminActiveTab = "exams";
  renderAdmin();
}

async function saveExamSettings(id) {
  const payload = {
    title: $("#editExamTitle").value.trim() || "Untitled Exam",
    code: $("#editExamCode").value.trim(),
    minutes: Math.max(1, Number.parseInt($("#editExamMinutes").value, 10) || 65),
    examType: $("#editExamType").value,
    stepMode: $("#editStepMode").value,
    open: $("#editExamOpen").value === "open",
    shuffle: $("#editShuffleQuestions").checked,
  };

  try {
    state = await api(`/api/admin/exams/${id}`, { method: "POST", body: JSON.stringify(payload) });
    selectedExamId = id;
    alert("Exam settings saved.");
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
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

async function addQuestion(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;

  try {
    await saveQuestionEdits(examId, { render: false, silent: true });
    const beforeIds = new Set(exam.questions.map((question) => question.id));
    state = await api(`/api/admin/exams/${examId}/questions/add`, { method: "POST" });
    const updatedExam = state.exams.find((item) => item.id === examId);
    const newQuestion =
      updatedExam?.questions.find((question) => !beforeIds.has(question.id)) ||
      [...(updatedExam?.questions || [])].sort((left, right) => right.number - left.number)[0];
    selectedExamId = examId;
    selectedQuestionId = newQuestion?.id || null;
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function saveQuestionEdits(examId, options = {}) {
  const { render = true, silent = false } = options;
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
    if (!silent) alert("Answer key saved.");
    if (render) renderAdmin();
  } catch (error) {
    alert(error.message);
    throw error;
  }
}

function selectSubmission(id) {
  selectedSubmissionId = id;
  adminActiveTab = "reports";
  renderAdmin();
}

function selectStudent(id) {
  selectedStudentId = id;
  adminActiveTab = "students";
  renderAdmin();
}

function selectClass(id) {
  selectedClassId = id;
  adminActiveTab = "classes";
  renderAdmin();
}

function setStudentSearch(value) {
  studentSearch = value;
  renderAdmin();
  const input = $("#studentSearch");
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function setStudentGroupFilter(value) {
  studentGroupFilter = value;
  renderAdmin();
}

function setStudentTermFilter(value) {
  studentTermFilter = value;
  renderAdmin();
}

function setStudentClassFilter(value) {
  studentClassFilter = value;
  renderAdmin();
}

async function createClass() {
  const payload = {
    name: $("#newClassName").value.trim(),
    term: $("#newClassTerm").value.trim(),
    schedule: $("#newClassSchedule").value.trim(),
    teacher: $("#newClassTeacher").value.trim(),
    room: $("#newClassRoom").value.trim(),
    notes: $("#newClassNotes").value.trim(),
  };

  try {
    state = await api("/api/admin/classes", { method: "POST", body: JSON.stringify(payload) });
    selectedClassId = state.classes[0]?.id || null;
    adminActiveTab = "classes";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function saveClass(id) {
  const payload = {
    name: $("#editClassName").value.trim(),
    term: $("#editClassTerm").value.trim(),
    schedule: $("#editClassSchedule").value.trim(),
    teacher: $("#editClassTeacher").value.trim(),
    room: $("#editClassRoom").value.trim(),
    notes: $("#editClassNotes").value.trim(),
  };

  try {
    state = await api(`/api/admin/classes/${id}`, { method: "POST", body: JSON.stringify(payload) });
    selectedClassId = id;
    adminActiveTab = "classes";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteClass(id) {
  const classRecord = state.classes.find((item) => item.id === id);
  if (!classRecord || !confirm(`Delete class "${classRecord.name}"? Students and reports will stay saved.`)) return;

  try {
    state = await api(`/api/admin/classes/${id}`, { method: "DELETE" });
    selectedClassId = state.classes[0]?.id || null;
    adminActiveTab = "classes";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function createStudent() {
  const payload = {
    studentNumber: $("#newStudentNumber").value.trim(),
    name: $("#newStudentName").value.trim(),
    group: $("#newStudentGroup").value.trim(),
    term: $("#newStudentTerm").value.trim(),
    classId: $("#newStudentClassId").value,
    status: $("#newStudentStatus").value,
    grade: $("#newStudentGrade").value.trim(),
    school: $("#newStudentSchool").value.trim(),
    email: $("#newStudentEmail").value.trim(),
    phone: $("#newStudentPhone").value.trim(),
    parentName: $("#newStudentParentName").value.trim(),
    parentPhone: $("#newStudentParentPhone").value.trim(),
    tags: $("#newStudentTags").value.trim(),
    notes: $("#newStudentNotes").value.trim(),
  };

  try {
    state = await api("/api/admin/students", { method: "POST", body: JSON.stringify(payload) });
    selectedStudentId = state.students[0]?.id || null;
    adminActiveTab = "students";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function saveStudent(id) {
  const payload = {
    studentNumber: $("#editStudentNumber").value.trim(),
    name: $("#editStudentName").value.trim(),
    group: $("#editStudentGroup").value.trim(),
    term: $("#editStudentTerm").value.trim(),
    classId: $("#editStudentClassId").value,
    status: $("#editStudentStatus").value,
    grade: $("#editStudentGrade").value.trim(),
    school: $("#editStudentSchool").value.trim(),
    email: $("#editStudentEmail").value.trim(),
    phone: $("#editStudentPhone").value.trim(),
    parentName: $("#editStudentParentName").value.trim(),
    parentPhone: $("#editStudentParentPhone").value.trim(),
    tags: $("#editStudentTags").value.trim(),
    notes: $("#editStudentNotes").value.trim(),
  };

  try {
    state = await api(`/api/admin/students/${id}`, { method: "POST", body: JSON.stringify(payload) });
    selectedStudentId = id;
    adminActiveTab = "students";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function addStudentLog(id) {
  const payload = {
    type: $("#studentLogType").value,
    note: $("#studentLogNote").value.trim(),
  };

  try {
    state = await api(`/api/admin/students/${id}/logs`, { method: "POST", body: JSON.stringify(payload) });
    selectedStudentId = id;
    adminActiveTab = "students";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteStudent(id) {
  const student = state.students.find((item) => item.id === id);
  if (!student || !confirm(`Delete student profile "${student.name}"? Existing reports will stay saved.`)) return;

  try {
    state = await api(`/api/admin/students/${id}`, { method: "DELETE" });
    selectedStudentId = state.students[0]?.id || null;
    adminActiveTab = "students";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function setReportSearch(value) {
  reportSearch = value;
  renderAdmin();
  const input = $("#reportSearch");
  if (input) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function setReportExamFilter(value) {
  reportExamFilter = value;
  renderAdmin();
}

async function startStudentExam() {
  const name = $("#studentName").value.trim();
  const studentId = $("#studentId").value.trim();
  const code = $("#testCode").value.trim().toUpperCase();
  if (!name || !code) {
    alert("Enter student name and test code.");
    return;
  }

  try {
    activeExam = await api(`/api/student/exam?code=${encodeURIComponent(code)}`);
    activeStudent = name;
    activeStudentId = studentId;
    const attempt = await api("/api/student/start", {
      method: "POST",
      body: JSON.stringify({ examId: activeExam.id, studentName: name, studentId }),
    });
    activeAttemptId = attempt.attemptId || "";
    activeAnswers = {};
    activeOrder = activeExam.displayOrder;
    activeSteps = buildStudentSteps(activeExam, activeOrder);
    mediaZooms = {};
    remainingSeconds = activeExam.minutes * 60;
    violations = 0;
    violationEvents = [];
    currentQuestionIndex = 0;
    examStartedAt = Date.now();
    awayStartedAt = 0;
    blurStartedAt = 0;
    fullscreenExitAt = 0;
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
      ${sharedMedia ? renderZoomableMedia(sharedMedia, `shared-${stepNumber}`, "Shared passage image") : ""}
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
  return renderZoomableMedia(media, `question-${question.id}`, "Question reference image");
}

function renderZoomableMedia(media, mediaId, altText) {
  const zoom = mediaZooms[mediaId] || 100;
  return `
    <figure class="question-media" data-media-id="${escapeHtml(mediaId)}">
      <div class="media-toolbar">
        <button class="mini" type="button" onclick="adjustMediaZoom('${mediaId}', -25)">-</button>
        <span class="pill media-zoom-label">${zoom}%</span>
        <button class="mini" type="button" onclick="adjustMediaZoom('${mediaId}', 25)">+</button>
        <button class="mini" type="button" onclick="resetMediaZoom('${mediaId}')">Reset</button>
      </div>
      <div class="question-media-scroll">
        <img src="${escapeHtml(media)}" alt="${escapeHtml(altText)}" style="width: ${zoom}%" />
      </div>
    </figure>
  `;
}

function updateMediaZoom(mediaId) {
  const container = document.querySelector(`[data-media-id="${mediaId}"]`);
  if (!container) return;
  const zoom = mediaZooms[mediaId] || 100;
  const image = container.querySelector("img");
  const label = container.querySelector(".media-zoom-label");
  if (image) image.style.width = `${zoom}%`;
  if (label) label.textContent = `${zoom}%`;
}

function adjustMediaZoom(mediaId, delta) {
  mediaZooms[mediaId] = Math.max(75, Math.min(250, (mediaZooms[mediaId] || 100) + delta));
  updateMediaZoom(mediaId);
}

function resetMediaZoom(mediaId) {
  mediaZooms[mediaId] = 100;
  updateMediaZoom(mediaId);
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
      if (!activeExam) return;
      if (document.visibilityState === "hidden") {
        awayStartedAt = Date.now();
        recordViolation("Exam tab hidden", { severity: "high", category: "Focus", detail: "Student left or covered the exam tab." });
      } else if (awayStartedAt) {
        recordViolation("Returned to exam tab", {
          severity: "info",
          category: "Focus",
          durationMs: Date.now() - awayStartedAt,
          detail: "Student returned to the visible exam tab.",
        });
        awayStartedAt = 0;
      }
    });
    document.addEventListener("fullscreenchange", () => {
      if (!activeExam) return;
      if (!document.fullscreenElement) {
        fullscreenExitAt = Date.now();
        recordViolation("Fullscreen exited", { severity: "medium", category: "Lockdown", detail: "Exam was no longer in fullscreen mode." });
      } else if (fullscreenExitAt) {
        recordViolation("Fullscreen restored", {
          severity: "info",
          category: "Lockdown",
          durationMs: Date.now() - fullscreenExitAt,
          detail: "Fullscreen mode was restored.",
        });
        fullscreenExitAt = 0;
      }
    });
    window.addEventListener("blur", () => {
      if (!activeExam) return;
      blurStartedAt = Date.now();
      recordViolation("Window focus lost", { severity: "high", category: "Focus", detail: "Browser window lost focus. Outside app is not identifiable." });
    });
    window.addEventListener("focus", () => {
      if (!activeExam || !blurStartedAt) return;
      recordViolation("Window focus returned", {
        severity: "info",
        category: "Focus",
        durationMs: Date.now() - blurStartedAt,
        detail: "Browser window focus returned to the exam.",
      });
      blurStartedAt = 0;
    });
    document.addEventListener("keydown", (event) => {
      if (!activeExam) return;
      const key = event.key.toLowerCase();
      const shortcut = event.metaKey || event.ctrlKey || event.altKey;
      if ((event.metaKey || event.ctrlKey) && ["c", "v", "x", "p", "s", "f", "u"].includes(key)) {
        recordViolation(`Blocked shortcut ${event.metaKey ? "Cmd" : "Ctrl"}+${event.key.toUpperCase()}`, {
          severity: key === "p" || key === "u" ? "medium" : "low",
          category: "Blocked action",
          detail: "A browser or clipboard shortcut was attempted during the exam.",
        });
        event.preventDefault();
      } else if (shortcut && key === "tab") {
        recordViolation("App-switch shortcut attempted", {
          severity: "high",
          category: "Blocked action",
          detail: "A system/browser switching shortcut was attempted.",
        });
      }
    });
    lockdownAttached = true;
  }
  document.oncontextmenu = (event) => {
    if (activeExam) recordViolation("Right click blocked", { severity: "low", category: "Blocked action", detail: "Context menu was blocked." });
    event.preventDefault();
  };
  document.oncopy = (event) => {
    if (activeExam) recordViolation("Copy blocked", { severity: "low", category: "Blocked action", detail: "Copy attempt was blocked." });
    event.preventDefault();
  };
  document.onpaste = (event) => {
    if (activeExam) recordViolation("Paste blocked", { severity: "medium", category: "Blocked action", detail: "Paste attempt was blocked." });
    event.preventDefault();
  };
  document.documentElement.requestFullscreen?.().catch(() => {});
}

function recordViolation(reason, details = {}) {
  if (!activeExam) return;
  const now = Date.now();
  if (now - lastViolationAt < 1200 && details.severity !== "info") return;
  lastViolationAt = now;
  if (details.severity !== "info") violations += 1;
  violationEvents.push({
    reason,
    at: new Date(now).toISOString(),
    severity: details.severity || "medium",
    category: details.category || "Lockdown",
    detail: details.detail || "",
    durationMs: Number.isFinite(details.durationMs) ? Math.max(0, Math.round(details.durationMs)) : 0,
    elapsedSeconds: examStartedAt ? Math.max(0, Math.round((now - examStartedAt) / 1000)) : 0,
    page: document.visibilityState === "hidden" ? "Exam page hidden; exact outside tab is unavailable" : "Exam page",
  });
  const notice = $("#lockNotice");
  if (notice) notice.textContent = `${reason} logged for admin review. Flagged events: ${violations}`;
}

async function submitExam(autoSubmit) {
  if (!activeExam) return;
  if (!autoSubmit && !confirm("Submit your test now? You cannot see answers after submitting.")) return;

  try {
    const result = await api("/api/student/submit", {
      method: "POST",
      body: JSON.stringify({
        examId: activeExam.id,
        attemptId: activeAttemptId,
        studentName: activeStudent,
        studentId: activeStudentId,
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
    activeStudentId = "";
    activeAttemptId = "";
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
