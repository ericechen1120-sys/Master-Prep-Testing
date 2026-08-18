const LETTERS = ["A", "B", "C", "D", "E"];
// User-provided SHSAT prep conversion chart: Original column only.
const SHSAT_ORIGINAL_SCORE_CONVERSION = Object.freeze({
  1: 16, 2: 30, 3: 44, 4: 58, 5: 72, 6: 82, 7: 90, 8: 98, 9: 107, 10: 129,
  11: 138, 12: 145, 13: 152, 14: 158, 15: 164, 16: 170, 17: 175, 18: 180, 19: 185, 20: 190,
  21: 194, 22: 198, 23: 202, 24: 206, 25: 212, 26: 214, 27: 218, 28: 222, 29: 226, 30: 230,
  31: 234, 32: 238, 33: 242, 34: 246, 35: 250, 36: 254, 37: 258, 38: 262, 39: 267, 40: 272,
  41: 277, 42: 283, 43: 290, 44: 298, 45: 308, 46: 318, 47: 328, 48: 339, 49: 350, 50: 400,
});
const QUESTION_TYPE_OPTIONS = [
  ["multiple", "Multiple choice"],
  ["numeric", "Short answer / Grid-in"],
  ["equation", "Equation editor"],
  ["fill_blank", "Fill in the blank"],
  ["dropdown", "Inline dropdown"],
  ["drag_drop", "Drag and drop"],
  ["table_grid", "Evidence classification table"],
  ["hot_text", "Hot text selection"],
  ["hotspot", "Hot spot image"],
];
const TOKEN_KEY = "topwayAdminToken";
const APP_BUILD = "2026.08.18.4";
const DEMO_ADMIN_HOSTS = new Set(["topway-admin.onrender.com"]);
localStorage.removeItem(TOKEN_KEY);
const SAMPLE_MATH_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420"><rect width="900" height="420" fill="#f8fafc"/><line x1="80" y1="340" x2="820" y2="340" stroke="#10263d" stroke-width="3"/><line x1="120" y1="370" x2="120" y2="60" stroke="#10263d" stroke-width="3"/><path d="M120 320 C240 220 330 250 420 160 S620 80 780 120" fill="none" stroke="#146c94" stroke-width="8"/><text x="138" y="82" font-family="Arial" font-size="26" fill="#10263d">Sample graph for a math question</text><text x="715" y="372" font-family="Arial" font-size="22" fill="#64748b">x</text><text x="92" y="84" font-family="Arial" font-size="22" fill="#64748b">y</text></svg>`);
const SAMPLE_PASSAGE_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520"><rect width="900" height="520" fill="#f8fafc"/><rect x="80" y="60" width="740" height="400" rx="10" fill="#ffffff" stroke="#d8e1ea" stroke-width="3"/><text x="120" y="120" font-family="Georgia" font-size="30" fill="#10263d">Sample Reading Passage</text><text x="120" y="178" font-family="Georgia" font-size="22" fill="#334155">Students can attach one passage image to multiple</text><text x="120" y="218" font-family="Georgia" font-size="22" fill="#334155">English questions. When questions are randomized,</text><text x="120" y="258" font-family="Georgia" font-size="22" fill="#334155">the passage image stays attached to each question.</text><line x1="120" y1="310" x2="760" y2="310" stroke="#cbd5e1" stroke-width="3"/><line x1="120" y1="350" x2="720" y2="350" stroke="#cbd5e1" stroke-width="3"/><line x1="120" y1="390" x2="760" y2="390" stroke="#cbd5e1" stroke-width="3"/></svg>`);
const QUESTION_FONTS = [
  { value: "", label: "Times New Roman", css: '"Times New Roman", Times, serif' },
  { value: "georgia", label: "Georgia", css: "Georgia, serif" },
  { value: "arial", label: "Arial", css: "Arial, sans-serif" },
  { value: "verdana", label: "Verdana", css: "Verdana, sans-serif" },
  { value: "system", label: "System", css: "Inter, system-ui, sans-serif" },
];

let state = { exams: [], submissions: [], students: [], attempts: [], classes: [], questionBank: [] };
let selectedExamId = null;
let selectedSubmissionId = null;
let selectedQuestionId = null;
let selectedStudentId = null;
let selectedClassId = null;
let selectedBankQuestionId = null;
let selectedBankQuestionIds = new Set();
let selectedClassSubmissionExamId = "";
let adminActiveTab = "overview";
let adminSubTabs = {
  exams: "create",
  reports: "results",
  bank: "import",
  students: "directory",
  classes: "tracker",
  tools: "backup",
};
let reportSearch = "";
let reportExamFilter = "all";
let reportStudentFilter = "";
let examListSearch = "";
let examListSubjectFilter = "all";
let examListStatusFilter = "all";
let studentSearch = "";
let studentGroupFilter = "all";
let studentTermFilter = "all";
let studentClassFilter = "all";
let pendingQuestionCsv = "";
let pendingExamIdCsv = "";
let pendingBankCsv = "";
let pendingBankFileName = "";
let bankSearch = "";
let bankClassFilter = "all";
let bankSubjectFilter = "all";
let bankSkillFilter = "all";
let bankDifficultyFilter = "all";
let bankTypeFilter = "all";
let bankUsageFilter = "all";
let bankAiPlan = null;
let bankQualityInspection = null;
let bankInspectorQuestionId = "";
let bankPage = 0;
let bankListSort = "newest";
const BANK_PAGE_SIZE = 20;
let bankSearchTimer = null;
let adminToastTimer = null;
let bankFilteredCache = null;
const bankQuestionMetaCache = new WeakMap();
const bankDuplicateExtraCache = new WeakMap();
let questionMixPlan = null;
let activeExam = null;
let activeExamBundle = null;
let activeCombinedExamChoices = [];
let activeCombinedCode = "";
let nextCombinedExam = null;
let completedCombinedExamIds = new Set();
let activeStudent = null;
let activeStudentId = "";
let activeAttemptId = "";
let activeAnswers = {};
let activeDragItems = {};
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
let adminLoginLoading = false;
let awayStartedAt = 0;
let blurStartedAt = 0;
let fullscreenExitAt = 0;

function isDemoAdminHost() {
  return DEMO_ADMIN_HOSTS.has(String(location.hostname || "").toLowerCase());
}

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

function escapeJs(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function normalizeQuestionType(value) {
  const type = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (/table|claim|evidence/.test(type)) return "table_grid";
  if (/equation|math_editor|math_input/.test(type)) return "equation";
  if (/hot_?spot|image_?select/.test(type)) return "hotspot";
  if (/hot_?text|select_?text/.test(type)) return "hot_text";
  if (/grid|numeric|free|short/.test(type)) return "numeric";
  if (/fill|blank|text_entry/.test(type)) return "fill_blank";
  if (/drop.?down|inline.?choice|select/.test(type)) return "dropdown";
  if (/drag/.test(type)) return "drag_drop";
  return QUESTION_TYPE_OPTIONS.some(([key]) => key === type) ? type : "multiple";
}

function questionTypeLabel(value) {
  const type = normalizeQuestionType(value);
  return QUESTION_TYPE_OPTIONS.find(([key]) => key === type)?.[1] || "Multiple choice";
}

function getQuestionInstruction(type) {
  const normalized = normalizeQuestionType(type);
  const instructions = {
    multiple: "Select one answer.",
    numeric: "Enter your answer as a number, decimal, fraction, or permitted math symbol. Do not include units.",
    equation: "Use the equation editor or keyboard to enter only the equation or expression.",
    fill_blank: "Type the exact word, phrase, or value that completes the blank.",
    dropdown: "Choose the best option from the dropdown menu.",
    drag_drop: "Place every item into the category where it belongs.",
    table_grid: "For each statement, use the evidence labels to classify it accurately.",
    hot_text: "Select every word or phrase that answers the question.",
    hotspot: "Select the correct area of the image.",
  };
  return instructions[normalized] || instructions.multiple;
}

function isOptionQuestionType(type) {
  return ["dropdown", "drag_drop", "table_grid", "hot_text", "hotspot"].includes(normalizeQuestionType(type));
}

function questionChoicesLabel(type) {
  const normalized = normalizeQuestionType(type);
  if (normalized === "table_grid") return "Evidence labels";
  if (normalized === "hot_text") return "Selectable text";
  if (normalized === "hotspot") return "Hot spot zones";
  return ["dropdown", "drag_drop"].includes(normalized) ? "Options / drag items" : "Choices";
}

function questionChoicesPlaceholder(type) {
  const normalized = normalizeQuestionType(type);
  if (normalized === "hot_text") return "Exact phrases to select, separated with commas";
  if (normalized === "hotspot") return "id::label::left%::top%::width%::height%";
  if (normalized === "table_grid") return "Supports the claim, Contradicts the claim, Not enough information";
  return "Separate items with commas";
}

function questionAnswerPlaceholder(type) {
  const normalized = normalizeQuestionType(type);
  if (normalized === "drag_drop") return "One=Odd; Two=Even";
  if (normalized === "table_grid") return "1=Supports the claim; 2=Contradicts the claim";
  if (normalized === "hot_text") return "Correct selected phrases, separated with |";
  if (normalized === "hotspot") return "Correct hot spot id, such as lake";
  if (normalized === "equation") return "5², x=4, √5, 3/4";
  return "A, 17, 3/4, √5, 2²";
}

function renderQuestionTypeOptions(selected) {
  const type = normalizeQuestionType(selected);
  return QUESTION_TYPE_OPTIONS.map(([value, label]) => `<option value="${value}" ${type === value ? "selected" : ""}>${label}</option>`).join("");
}

function formatQuestionText(value) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function formatRichText(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n][\s\S]*?[^_\n])__/g, "<u>$1</u>")
    .replace(/\*([^*\n][^*\n]*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br />");
}

function isMathQuestion(question = {}) {
  const subject = String(question.subject || "").toLowerCase();
  const text = `${question.testClass || ""} ${question.section || ""} ${question.skill || ""} ${question.questionText || ""}`.toLowerCase();
  return subject === "math" || ["numeric", "equation"].includes(normalizeQuestionType(question.type)) || /\b(math|algebra|geometry|equation|expression|integer|fraction|ratio|percent|probability|function|inequality|graph)\b/.test(text);
}

function formatQuestionTextForDisplay(question, value) {
  let html = formatRichText(value);
  if (!isMathQuestion(question)) return html;
  return html
    .replace(/sqrt\(\s*([^()<>\n]+?)\s*\)/gi, "√($1)")
    .replace(/([a-z0-9)])\^([0-9]+)/gi, "$1<sup>$2</sup>")
    .replace(/\bpi\b/gi, "π")
    .replace(/\binfinity\b/gi, "∞")
    .replace(/&lt;=/g, "≤")
    .replace(/&gt;=/g, "≥")
    .replace(/!=/g, "≠")
    .replace(/\*\*/g, "×");
}

function cleanInlineImageUrl(value) {
  return String(value || "").trim().replace(/[),.;]+$/g, "");
}

function isInlineImageUrl(value, fromMarkdownImage = false) {
  const url = cleanInlineImageUrl(value);
  if (/^data:image\//i.test(url)) return true;
  if (!/^https?:\/\//i.test(url)) return false;
  if (fromMarkdownImage) return true;
  return /\.(png|jpe?g|gif|webp|svg)(?:[?#].*)?$/i.test(url) || /\/(uploads?|assets)\//i.test(url);
}

function collectQuestionTextImages(value) {
  const text = String(value || "");
  const images = [];
  const addImage = (url, fromMarkdownImage = false) => {
    const cleaned = cleanInlineImageUrl(url);
    if (cleaned && isInlineImageUrl(cleaned, fromMarkdownImage) && !images.includes(cleaned)) images.push(cleaned);
  };

  text.replace(/!\[[^\]]*]\(\s*([^)]+?)\s*\)/gi, (_match, url) => {
    addImage(url, true);
    return "";
  });
  text.replace(/\[((?:graph|image|diagram|figure|chart|picture)[^\]]*)]\(\s*([^)]+?)\s*\)/gi, (_match, _label, url) => {
    addImage(url, true);
    return "";
  });
  text.replace(/(https?:\/\/[^\s<>"']+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi, (_match, url) => {
    addImage(url, false);
    return "";
  });

  return images;
}

function stripQuestionTextImages(value) {
  let text = String(value || "");
  text = text.replace(/!\[[^\]]*]\(\s*([^)]+?)\s*\)/gi, (match, url) => (isInlineImageUrl(url, true) ? "" : match));
  text = text.replace(/\[((?:graph|image|diagram|figure|chart|picture)[^\]]*)]\(\s*([^)]+?)\s*\)/gi, (match, _label, url) => (isInlineImageUrl(url, true) ? "" : match));
  text = text.replace(/(https?:\/\/[^\s<>"']+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi, (match, url) => (isInlineImageUrl(url, false) ? "" : match));
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderQuestionTextWithInlineMedia(question, options = {}) {
  const { preview = false, mediaPrefix = "inline-question" } = options;
  const fullText = String(question?.questionText || "");
  const choiceLabels = normalizeQuestionType(question?.type) === "multiple"
    ? (Array.isArray(question?.choices) ? question.choices : LETTERS).filter((choice) => /^[A-Z]$/.test(String(choice || "").trim().toUpperCase()))
    : [];
  // CSV imports store the answer wording beside the question. Show that wording
  // inside the answer buttons, rather than repeating it above as plain text.
  const text = choiceLabels.length ? removeChoiceLines(fullText, choiceLabels) : fullText;
  const cleanText = stripQuestionTextImages(text);
  const inlineImages = collectQuestionTextImages(fullText);
  const fontStyle = `font-family: ${escapeHtml(getQuestionFontCss(question))}`;
  const textHtml = cleanText ? `<div class="question-text" style="${fontStyle}">${formatQuestionTextForDisplay(question, cleanText)}</div>` : preview && !inlineImages.length ? `<div class="notice compact">No question text yet.</div>` : "";
  const imageHtml = inlineImages
    .filter((image) => image !== question?.imageUrl && image !== question?.sharedImageUrl)
    .map((image, index) => (preview ? renderEditorImagePreview(image, "Question image from text") : renderZoomableMedia(image, `${mediaPrefix}-${question?.id || "draft"}-${index}`, "Question image from text")))
    .join("");
  return `${textHtml}${imageHtml}`;
}

function getQuestionFontCss(question = {}) {
  const font = QUESTION_FONTS.find((item) => item.value === String(question.questionFont || ""));
  return font?.css || QUESTION_FONTS[0].css;
}

function renderQuestionFontOptions(selected = "") {
  return QUESTION_FONTS.map((font) => `<option value="${escapeHtml(font.value)}" ${String(selected || "") === font.value ? "selected" : ""}>${escapeHtml(font.label)}</option>`).join("");
}

async function api(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
  if (data?.stateChanges && typeof data.stateChanges === "object") {
    Object.entries(data.stateChanges).forEach(([section, change]) => {
      if (Array.isArray(change?.replace)) {
        state[section] = change.replace;
        return;
      }
      let nextItems = Array.isArray(state[section]) ? [...state[section]] : [];
      const removeIds = new Set((change?.removeIds || []).map(String));
      if (removeIds.size) nextItems = nextItems.filter((item) => !removeIds.has(String(item?.id || "")));
      const upsertItems = Array.isArray(change?.upsert) ? change.upsert.filter(Boolean) : [];
      upsertItems.forEach((item) => {
        const existingIndex = nextItems.findIndex((current) => String(current?.id || "") === String(item?.id || ""));
        if (existingIndex >= 0) {
          nextItems[existingIndex] = item;
        } else if (change?.prepend === false) {
          nextItems.push(item);
        } else {
          nextItems.unshift(item);
        }
      });
      state[section] = nextItems;
    });
    const { stateChanges, ...extra } = data;
    return { ...state, ...extra };
  }
  return data;
}

function render() {
  if (new URLSearchParams(location.search).get("preview") === "student-exam") {
    renderStudentExperiencePreview();
    return;
  }

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

function renderStudentExperiencePreview() {
  $("#app").innerHTML = `
    <div class="student-exam-shell">
      <header class="student-exam-topbar">
        <div class="student-exam-brand" aria-label="Topway Prep"><img class="student-exam-logo" src="/assets/topway-prep-logo-transparent.png?v=20260806" alt="Topway Prep" onerror="if (!this.dataset.rootFallback) { this.dataset.rootFallback='1'; this.src='/topway-prep-logo-transparent.png?v=20260806'; } else { this.hidden=true; this.nextElementSibling.hidden=false; }" /><span class="student-exam-wordmark-fallback" hidden><span class="student-exam-wordmark-icon" aria-hidden="true"></span><span>Topway Prep</span></span></div>
        <div class="student-exam-title"><span class="student-exam-kicker">SHSAT practice assessment</span><strong>English Language Arts · Practice Set 2</strong></div>
        <div class="student-exam-timer"><span>Time remaining</span><strong class="timer">01:18:42</strong></div>
      </header>
      <div class="student-exam-progress" aria-label="Preview progress"><div class="student-progress-copy"><strong>Page 4 of 12</strong><span>8 of 50 questions answered</span></div><div class="student-progress-track" aria-hidden="true"><span class="complete"></span><span class="complete"></span><span class="complete"></span><span class="current"></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div>
      <main class="student-test-stage">
        <section class="student-test-card">
          <div class="student-test-notice"><span aria-hidden="true">◉</span> Preview only — this screen does not create a student attempt.</div>
          <div class="questions student-questions">
            <section class="question-group student-passage-group">
              <div class="student-group-heading"><div><span class="student-section-label">Reading set</span><h2>How Curiosity Leads to Discovery</h2></div><span class="student-question-count">2 questions</span></div>
              <div class="passage-question-layout">
                <aside class="passage-column student-passage-pane"><div class="student-pane-label">Passage</div><section class="passage-text-block"><h3>How Curiosity Leads to Discovery</h3><div class="passage-rich-text"><p>At first, a difficult question can seem like an obstacle. Yet it can also be the beginning of discovery. When researchers notice something unexpected, they gather evidence, compare possibilities, and revise their ideas.</p><p>That process rarely moves in a straight line. A careful observer may return to the same question many times, each time with a clearer understanding of what still needs to be learned.</p><p>In this way, curiosity is more than an interest in new information. It is a habit of looking closely, asking precise questions, and using evidence to reach a thoughtful conclusion.</p></div></section></aside>
                <div class="question-column student-question-pane"><div class="student-pane-label">Questions</div>
                  <article class="question student-question-card"><div class="question-title student-question-title"><span class="student-question-number">16</span><div><span class="student-section-label">Reading</span><strong>Question 16</strong></div><span class="student-format-label">Multiple choice</span></div><p class="question-instruction">Select the best answer.</p><div class="question-text">Which sentence best states the central idea of the passage?</div><div class="choices student-choice-grid"><button class="choice student-choice" type="button"><span class="student-choice-letter">A</span><span class="student-choice-copy">Scientific discoveries happen quickly when researchers find an answer.</span></button><button class="choice student-choice selected" type="button"><span class="student-choice-letter">B</span><span class="student-choice-copy">Curiosity and careful use of evidence help people develop understanding.</span></button><button class="choice student-choice" type="button"><span class="student-choice-letter">C</span><span class="student-choice-copy">Researchers should avoid returning to questions that seem difficult.</span></button><button class="choice student-choice" type="button"><span class="student-choice-letter">D</span><span class="student-choice-copy">Unexpected observations are less useful than planned experiments.</span></button></div></article>
                </div>
              </div>
            </section>
          </div>
          <footer class="student-exam-footer"><div><strong>Finish this passage set</strong><span>Your progress is shown here while you work.</span></div><button class="student-next-button" type="button">Continue <span aria-hidden="true">→</span></button></footer>
        </section>
      </main>
    </div>
  `;
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
        <img class="brand-logo" src="/assets/topway-prep-logo-transparent.png" alt="Topway Prep" onerror="this.onerror=null;this.src='/assets/topway-prep-logo.png';" />
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
      <main class="locked login-stage">
        <section class="login-showcase">
          <div class="login-hero">
            <div class="login-eyebrow">Secure Testing Portal</div>
            <h1>Topway Prep Exam Center</h1>
            <p>Enter your name and assigned exam code to begin. Your result links to your student record automatically.</p>
          </div>
          <div class="panel login-panel login-card stack">
            <form class="stack" onsubmit="startStudentExam(event)">
              <div class="login-card-head">
                <span class="login-mode">Student</span>
                <div>
                  <h2>Start Exam</h2>
                  <p class="subtle">Use your student number when available. An exact unique name also links automatically.</p>
                </div>
              </div>
              <div class="field">
                <label>Student name</label>
                <input id="studentName" placeholder="Enter full name" autocomplete="off" />
              </div>
              <div class="field">
                <label>Student Number <span class="label-note">Recommended</span></label>
                <input id="studentId" placeholder="Your Topway student number" autocomplete="off" />
              </div>
              <div class="field">
                <label>Test code</label>
                <input id="testCode" placeholder="Example: SAT-001" autocomplete="off" />
              </div>
              <button class="primary login-primary" type="submit">Start Test</button>
            </form>
            <button class="ghost" onclick="adminLogin()">Topway Admin Portal</button>
          </div>
        </section>
      </main>
    </div>
  `;
}

function adminLogin() {
  if (isDemoAdminHost()) {
    openDemoAdmin();
    return;
  }
  clearAdminSession();
  adminLoginLoading = false;
  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("admin")}
      <main class="locked login-stage">
        <section class="login-showcase admin-showcase">
          <div class="login-hero admin-login-hero">
            <div class="login-eyebrow">Staff Access</div>
            <h1>Topway Prep Admin Center</h1>
            <p>Secure workspace for exams, classes, reports, student profiles, and question banks.</p>
            <div class="admin-login-status">
              <span><strong>Protected</strong><small>Password required for staff tools</small></span>
              <span><strong>Organized</strong><small>Separate workspaces for daily tasks</small></span>
              <span><strong>Ready</strong><small>Reports, rosters, and exams in one place</small></span>
            </div>
          </div>
          <div class="panel login-panel login-card admin-login-card stack">
            <form class="stack" onsubmit="verifyAdminLogin(event)">
              <div class="login-card-head">
                <span class="login-mode admin-mode">Admin</span>
                <div>
                  <h2>Staff Login</h2>
                  <p class="subtle">Enter the admin password to open the dashboard.</p>
                </div>
              </div>
              <div class="field">
                <label>Password</label>
                <input id="adminPassword" type="password" placeholder="Enter admin password" autocomplete="off" />
              </div>
              <button id="adminLoginButton" class="primary login-primary" type="submit">Enter Admin Dashboard</button>
              <p id="adminLoginStatus" class="hint" aria-live="polite"></p>
            </form>
            <button class="ghost" onclick="studentEntry()">Back to Student Entry</button>
          </div>
        </section>
      </main>
    </div>
  `;
  setTimeout(() => $("#adminPassword")?.focus(), 0);
}

async function openDemoAdmin() {
  if (adminLoginLoading) return;
  adminLoginLoading = true;
  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("admin")}
      <main class="locked login-stage">
        <section class="panel login-card stack">
          <span class="login-mode admin-mode">Demo Admin</span>
          <h2>Opening Demo Dashboard</h2>
          <p class="subtle">This demo site opens without a password. The live testing system still requires the admin password.</p>
        </section>
      </main>
    </div>
  `;
  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ demo: true, includeState: true }),
    });
    sessionStorage.setItem(TOKEN_KEY, result.token);
    await loadAdminState(result.state);
    adminLoginLoading = false;
    renderAdmin();
  } catch (error) {
    adminLoginLoading = false;
    alert(error.message || "Demo admin access failed.");
    studentEntry();
  }
}

async function verifyAdminLogin(event) {
  event?.preventDefault();
  if (adminLoginLoading) return;
  const passwordInput = $("#adminPassword");
  const password = String(passwordInput?.value || "");
  if (!password.trim()) {
    alert("Please enter the admin password.");
    passwordInput?.focus();
    return;
  }
  adminLoginLoading = true;
  const button = $("#adminLoginButton");
  const status = $("#adminLoginStatus");
  if (button) {
    button.disabled = true;
    button.textContent = "Opening Dashboard...";
  }
  if (status) status.textContent = "Checking password and loading admin data...";
  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password, includeState: true }),
    });
    sessionStorage.setItem(TOKEN_KEY, result.token);
    await loadAdminState(result.state);
    renderAdmin();
  } catch (error) {
    adminLoginLoading = false;
    if (button) {
      button.disabled = false;
      button.textContent = "Enter Admin Dashboard";
    }
    if (status) status.textContent = "";
    alert(error.message);
    passwordInput?.focus();
  }
}

function studentEntry() {
  clearAdminSession();
  activeExam = null;
  activeExamBundle = null;
  activeCombinedExamChoices = [];
  activeCombinedCode = "";
  nextCombinedExam = null;
  activeStudent = null;
  renderLanding();
}

async function loadAdminState(initialState = null) {
  state = initialState || (await api("/api/admin/state"));
  selectedExamId = state.exams.find((item) => item.id === selectedExamId)?.id || state.exams[0]?.id || null;
  selectedSubmissionId =
    state.submissions.find((item) => item.id === selectedSubmissionId)?.id || state.submissions[0]?.id || null;
  selectedStudentId = state.students.find((item) => item.id === selectedStudentId)?.id || state.students[0]?.id || null;
  selectedClassId = state.classes.find((item) => item.id === selectedClassId)?.id || state.classes[0]?.id || null;
  selectedBankQuestionId =
    state.questionBank?.find((item) => item.id === selectedBankQuestionId)?.id || state.questionBank?.[0]?.id || null;
}

function renderAdmin() {
  if (!sessionStorage.getItem(TOKEN_KEY)) {
    adminLogin();
    return;
  }
  const exam = state.exams.find((item) => item.id === selectedExamId) || state.exams[0] || null;
  const submission = state.submissions.find((item) => item.id === selectedSubmissionId) || state.submissions[0] || null;
  const isOverview = adminActiveTab === "overview";

  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("admin", true)}
      <main class="main grid">
        <section class="admin-command ${isOverview ? "" : "compact"}">
          <div class="admin-command-copy">
            <span class="login-eyebrow">Admin Command Center</span>
            <h1>${escapeHtml(adminTabTitle())}</h1>
            <p>${escapeHtml(adminTabDescription())}</p>
          </div>
          <div class="admin-command-status">
            <span class="pill ok">Secure session</span>
            <span class="pill">Build ${APP_BUILD}</span>
            ${getAdminSubTab(adminActiveTab) ? `<span class="subtle">${escapeHtml(currentAdminSubTabLabel())}</span>` : `<span class="subtle">Topway Prep operations</span>`}
            ${renderAdminQuickActions()}
          </div>
        </section>
        ${isOverview ? "" : renderAdminMiniStats()}
        ${adminActiveTab === "overview" ? renderOverviewWorkspace() : ""}
        ${adminActiveTab === "reports" ? renderReportsWorkspace(submission) : ""}
        ${adminActiveTab === "bank" ? renderQuestionBankWorkspace() : ""}
        ${adminActiveTab === "students" ? renderStudentsWorkspace() : ""}
        ${adminActiveTab === "classes" ? renderClassesWorkspace() : ""}
        ${adminActiveTab === "tools" ? renderToolsWorkspace() : ""}
        ${adminActiveTab === "exams" ? renderExamWorkspace(exam) : ""}
      </main>
    </div>
  `;
  updateSatCalculator();
  updateShsatOriginalCalculator();
  updateExamShsatOriginalCalculator();
}

function renderAdminPreserveScroll(focusSelector = "") {
  const scrollX = window.scrollX || 0;
  const scrollY = window.scrollY || 0;
  const navScrollTop = $(".question-nav-list")?.scrollTop || 0;
  const activeId = document.activeElement?.id || "";
  const activeSelectionStart = document.activeElement?.selectionStart;
  renderAdmin();
  requestAnimationFrame(() => {
    window.scrollTo(scrollX, scrollY);
    const questionNav = $(".question-nav-list");
    if (questionNav) questionNav.scrollTop = navScrollTop;
    const focusTarget = focusSelector ? $(focusSelector) : activeId ? document.getElementById(activeId) : null;
    if (focusTarget) {
      focusTarget.focus();
      if (Number.isInteger(activeSelectionStart) && typeof focusTarget.setSelectionRange === "function") {
        focusTarget.setSelectionRange(activeSelectionStart, activeSelectionStart);
      }
    }
  });
}

function showAdminToast(message, tone = "ok") {
  let toast = document.getElementById("adminToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";
    toast.className = "admin-toast";
    document.body.appendChild(toast);
  }
  toast.className = `admin-toast show ${tone}`;
  toast.textContent = message;
  if (adminToastTimer) clearTimeout(adminToastTimer);
  adminToastTimer = setTimeout(() => toast?.classList.remove("show"), 2200);
}

function renderAdminTabs(extraClass = "") {
  return `
    <nav class="admin-tabs ${extraClass}">
      <button class="${adminActiveTab === "overview" ? "active" : ""}" onclick="setAdminTab('overview')" type="button">
        Overview
        <span>Quick view</span>
      </button>
      <button class="${adminActiveTab === "exams" ? "active" : ""}" onclick="setAdminTab('exams')" type="button">
        Exams
        <span>Create & Settings</span>
      </button>
      <button class="${adminActiveTab === "reports" ? "active" : ""}" onclick="setAdminTab('reports')" type="button">
        Reports
        <span>${state.submissions.length} saved</span>
      </button>
      <button class="${adminActiveTab === "bank" ? "active" : ""}" onclick="setAdminTab('bank')" type="button">
        Questions
        <span>${state.questionBank?.length || 0} questions</span>
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

function currentAdminSubTabLabel() {
  const active = getAdminSubTab(adminActiveTab);
  return getAdminSubTabItems(adminActiveTab).find((item) => item.id === active)?.label || "";
}

function renderAdminQuickActions() {
  const actionsByTab = {
    overview: [
      { label: "Create Exam", tab: "exams", subtab: "create", tone: "gold" },
      { label: "Import Bank", tab: "bank", subtab: "import" },
      { label: "Print Reports", tab: "reports", subtab: "print" },
    ],
    exams: [
      { label: "Create", tab: "exams", subtab: "create", tone: "gold" },
      { label: "Manage", tab: "exams", subtab: "manage" },
      { label: "Questions", tab: "exams", subtab: "questions" },
    ],
    reports: [
      { label: "Results", tab: "reports", subtab: "results" },
      { label: "Summary", tab: "reports", subtab: "summary", tone: "gold" },
      { label: "Exam Map", tab: "reports", subtab: "map" },
      { label: "Print", tab: "reports", subtab: "print" },
    ],
    bank: [
      { label: "Import", tab: "bank", subtab: "import" },
      { label: "Smart Draft", tab: "bank", subtab: "smart", tone: "gold" },
      { label: "Build", tab: "bank", subtab: "build" },
      { label: "Self Check", tab: "bank", subtab: "cleanup" },
    ],
    students: [
      { label: "Directory", tab: "students", subtab: "directory" },
      { label: "Profile", tab: "students", subtab: "profile" },
      { label: "Add", tab: "students", subtab: "add", tone: "gold" },
    ],
    classes: [
      { label: "Tracker", tab: "classes", subtab: "tracker", tone: "gold" },
      { label: "Roster", tab: "classes", subtab: "roster" },
      { label: "Settings", tab: "classes", subtab: "settings" },
    ],
    tools: [
      { label: "Backup", tab: "tools", subtab: "backup", tone: "gold" },
      { label: "Storage", tab: "tools", subtab: "storage" },
      { label: "SHSAT Scores", tab: "tools", subtab: "calculator" },
    ],
  };
  const actions = actionsByTab[adminActiveTab] || actionsByTab.overview;
  return `
    <div class="admin-quick-actions">
      ${actions
        .map(
          (action) => `
            <button class="${action.tone || ""}" onclick="openAdminWorkspace('${action.tab}', '${action.subtab}')" type="button">
              ${escapeHtml(action.label)}
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderAdminMiniStats() {
  const openExams = (state.exams || []).filter((exam) => exam.open !== false).length;
  const inProgress = (state.attempts || []).filter((attempt) => attempt.status !== "submitted").length;
  const duplicateExtras = getAllExactTextDuplicateExtraIds(state.questionBank || []).length;
  return `
    <section class="admin-mini-stats">
      <button onclick="openAdminWorkspace('exams', 'manage')" type="button"><span>Open exams</span><strong>${openExams}</strong></button>
      <button onclick="openAdminWorkspace('classes', 'tracker')" type="button"><span>In progress</span><strong>${inProgress}</strong></button>
      <button onclick="openAdminWorkspace('reports', 'results')" type="button"><span>Reports</span><strong>${state.submissions.length}</strong></button>
      <button onclick="openAdminWorkspace('bank', 'cleanup')" type="button"><span>Bank cleanup</span><strong>${duplicateExtras}</strong></button>
      <button onclick="openAdminWorkspace('students', 'directory')" type="button"><span>Students</span><strong>${state.students.length}</strong></button>
    </section>
  `;
}

function adminTabTitle() {
  return (
    {
      exams: "Exam Builder",
      reports: "Student Reports",
      bank: "Question Bank",
      students: "Student Profiles",
      classes: "Class Management",
      tools: "Testing Tools",
      overview: "Admin Dashboard",
    }[adminActiveTab] || "Admin Dashboard"
  );
}

function adminTabDescription() {
  return (
    {
      exams: "Create exams, adjust settings, edit questions, and control active testing windows.",
      reports: "Review submissions, identify student weaknesses, and print parent-ready reports.",
      bank: "Import, organize, edit, export, and build exams from reusable questions.",
      students: "Manage student profiles, terms, classes, notes, activity, and linked test history.",
      classes: "Build rosters, track completion, and review class-level performance.",
      tools: "Open secure testing tools and calculator resources for approved workflows.",
      overview: "Quickly check the system, then open the exact workspace you need.",
    }[adminActiveTab] || "Manage Topway Prep testing operations from one secure workspace."
  );
}

function getAdminSubTab(tab = adminActiveTab) {
  const items = getAdminSubTabItems(tab);
  const selected = adminSubTabs[tab];
  return items.some((item) => item.id === selected) ? selected : items[0]?.id || "";
}

function getAdminSubTabItems(tab = adminActiveTab) {
  return (
    {
      exams: [
        { id: "create", label: "Create", meta: "New exam" },
        { id: "manage", label: "Manage", meta: `${state.exams.length} exams` },
        { id: "questions", label: "Questions", meta: "Edit selected" },
      ],
      reports: [
        { id: "results", label: "Results", meta: `${state.submissions.length} reports` },
        { id: "summary", label: "Summary", meta: "Class view" },
        { id: "student", label: "Student Weakness", meta: "Specific" },
        { id: "map", label: "Self Detect", meta: "Exam skill map" },
        { id: "print", label: "Print", meta: "Class reports" },
      ],
      bank: [
        { id: "import", label: "Import", meta: "CSV" },
        { id: "smart", label: "Smart Draft", meta: "Balanced selection" },
        { id: "build", label: "Build Exam", meta: "Selected/filter" },
        { id: "edit", label: "Edit", meta: `${state.questionBank?.length || 0} questions` },
        { id: "cleanup", label: "Self Check", meta: "Quality + cleanup" },
        { id: "export", label: "Export", meta: "Excel" },
      ],
      students: [
        { id: "directory", label: "Directory", meta: `${state.students.length} profiles` },
        { id: "profile", label: "Profile", meta: "Record" },
        { id: "add", label: "Add Student", meta: "New" },
      ],
      classes: [
        { id: "tracker", label: "Tracker", meta: "Submissions" },
        { id: "roster", label: "Roster", meta: "Students" },
        { id: "settings", label: "Settings", meta: "Class + exams" },
        { id: "analysis", label: "Analysis", meta: "Weakness" },
      ],
      tools: [
        { id: "backup", label: "Backup", meta: "Export/restore" },
        { id: "storage", label: "Storage", meta: "Clear old reports" },
        { id: "calculator", label: "SHSAT Scores", meta: "Original chart" },
      ],
    }[tab] || []
  );
}

function renderAdminSubTabs(tab = adminActiveTab) {
  const items = getAdminSubTabItems(tab);
  if (!items.length) return "";
  const active = getAdminSubTab(tab);
  return `
    <nav class="admin-subtabs">
      ${items
        .map(
          (item) => `
            <button class="${active === item.id ? "active" : ""}" onclick="setAdminSubTab('${tab}', '${item.id}')" type="button">
              ${escapeHtml(item.label)}
              <span>${escapeHtml(item.meta || "")}</span>
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

function setAdminSubTab(tab, subtab) {
  adminSubTabs[tab] = subtab;
  adminActiveTab = tab;
  renderAdmin();
}

function setAdminTab(tab) {
  if (!sessionStorage.getItem(TOKEN_KEY)) {
    adminLogin();
    return;
  }
  adminActiveTab = tab;
  adminSubTabs[tab] = getAdminSubTab(tab);
  renderAdmin();
}

function openAdminWorkspace(tab, subtab = "") {
  adminActiveTab = tab;
  if (subtab) adminSubTabs[tab] = subtab;
  else adminSubTabs[tab] = getAdminSubTab(tab);
  renderAdmin();
}

function renderOverviewWorkspace() {
  const recentReports = [...(state.submissions || [])]
    .sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0))
    .slice(0, 6);
  const bankSummary = (state.questionBank || []).reduce((map, question) => {
    const label = getBankQuestionClass(question) || question.examType || "Unassigned";
    map.set(label, (map.get(label) || 0) + 1);
    return map;
  }, new Map());
  const bankRows = [...bankSummary.entries()].sort((left, right) => right[1] - left[1]).slice(0, 6);
  const inProgress = (state.attempts || []).filter((attempt) => attempt.status !== "submitted").length;
  const openExams = (state.exams || []).filter((exam) => exam.open !== false).length;

  return `
    <section class="admin-workspace stack">
      <section class="admin-kpis grid six">
        <button class="stat action-stat" onclick="openAdminWorkspace('exams', 'manage')" type="button"><span class="stat-icon">EX</span><span class="subtle">Open Exams</span><strong>${openExams}</strong><small>${state.exams.length} total exams</small></button>
        <button class="stat action-stat" onclick="openAdminWorkspace('students', 'directory')" type="button"><span class="stat-icon">ST</span><span class="subtle">Student Profiles</span><strong>${state.students.length}</strong><small>Manage records</small></button>
        <button class="stat action-stat" onclick="openAdminWorkspace('bank', 'smart')" type="button"><span class="stat-icon">QB</span><span class="subtle">Question Bank</span><strong>${state.questionBank?.length || 0}</strong><small>Smart draft from bank</small></button>
        <button class="stat action-stat" onclick="openAdminWorkspace('classes', 'tracker')" type="button"><span class="stat-icon warn-icon">CL</span><span class="subtle">Classes</span><strong>${state.classes.length}</strong><small>Track rosters</small></button>
        <button class="stat action-stat" onclick="openAdminWorkspace('reports', 'results')" type="button"><span class="stat-icon ok-icon">SB</span><span class="subtle">Submissions</span><strong>${state.submissions.length}</strong><small>${inProgress} in progress</small></button>
        <button class="stat action-stat" onclick="openAdminWorkspace('reports', 'summary')" type="button"><span class="stat-icon score-icon">AV</span><span class="subtle">Average Score</span><strong>${adminAverage()}%</strong><small>Open summary</small></button>
      </section>
      ${renderAdminWorkflowCards()}
      <section class="grid two overview-grid">
        <div class="panel stack">
          <div class="section-head">
            <div>
              <h2>Recent Results</h2>
              <p class="subtle">Latest submitted exams. Use Reports for full review and printing.</p>
            </div>
            <button class="ghost" onclick="setAdminTab('reports')" type="button">All Reports</button>
          </div>
          ${
            recentReports.length
              ? `<div class="table-wrap">
                  <table>
                    <thead><tr><th>Student</th><th>Exam</th><th>Score</th><th></th></tr></thead>
                    <tbody>
                      ${recentReports
                        .map((submission) => {
                          const exam = state.exams.find((item) => item.id === submission.examId);
                          return `<tr>
                            <td><strong>${escapeHtml(submission.studentName || "Student")}</strong><br><span class="subtle">${new Date(submission.submittedAt).toLocaleString()}</span></td>
                            <td>${escapeHtml(exam?.title || "Deleted exam")}</td>
                            <td><span class="pill ${submission.score?.percent >= 70 ? "ok" : "bad"}">${submission.score?.percent || 0}%</span></td>
                            <td><button class="ghost" onclick="selectSubmission('${submission.id}')" type="button">Open</button></td>
                          </tr>`;
                        })
                        .join("")}
                    </tbody>
                  </table>
                </div>`
              : `<div class="notice">No submitted reports yet.</div>`
          }
        </div>
        <div class="panel stack">
          <div class="section-head">
            <div>
              <h2>Question Bank</h2>
              <p class="subtle">Saved questions grouped by source exam, subject, or bank tab.</p>
            </div>
            <button class="ghost" onclick="setAdminTab('bank')" type="button">Open Bank</button>
          </div>
          ${
            bankRows.length
              ? `<div class="overview-list">
                  ${bankRows.map(([label, count]) => `<button onclick="openBankClass('${escapeJs(label)}')" type="button"><span>${escapeHtml(label)}</span><strong>${count}</strong></button>`).join("")}
                </div>`
              : `<div class="notice">No bank questions imported yet.</div>`
          }
          <div class="overview-actions">
            <button class="primary" onclick="setAdminSubTab('bank', 'import')" type="button">Import CSV</button>
            <button class="ghost" onclick="setAdminSubTab('bank', 'smart')" type="button">Smart Draft</button>
            <button class="ghost" onclick="setAdminSubTab('tools', 'backup')" type="button">Backup</button>
          </div>
        </div>
      </section>
      ${renderAdminAttentionQueue()}
    </section>
  `;
}

function renderAdminWorkflowCards() {
  const workflows = [
    { label: "Create Exam", detail: "Set code, timing, subject, answer key", tab: "exams", subtab: "create", tone: "primary" },
    { label: "Manage Exams", detail: "Open, close, delete, clear progress", tab: "exams", subtab: "manage" },
    { label: "Import Bank", detail: "Upload CSV and auto-generate IDs", tab: "bank", subtab: "import" },
    { label: "Smart Draft", detail: "Auto-pick balanced questions, then review", tab: "bank", subtab: "smart" },
    { label: "Build From Bank", detail: "Create from checked or filtered questions", tab: "bank", subtab: "build" },
    { label: "Self Check Bank", detail: "Find incomplete questions and duplicate records", tab: "bank", subtab: "cleanup" },
    { label: "SHSAT Scores", detail: "Use your Original score conversion chart", tab: "tools", subtab: "calculator" },
    { label: "Class Tracker", detail: "See submitted, in progress, not started", tab: "classes", subtab: "tracker" },
    { label: "Print Reports", detail: "Student or class print packet", tab: "reports", subtab: "print" },
  ];
  return `
    <section class="panel stack admin-workflows">
      <div class="section-head">
        <div>
          <h2>Workflows</h2>
          <p class="subtle">Open the exact workspace you need without searching through a long admin page.</p>
        </div>
      </div>
      <div class="workflow-grid">
        ${workflows
          .map(
            (workflow) => `
              <button class="workflow-card ${workflow.tone || ""}" onclick="openAdminWorkspace('${workflow.tab}', '${workflow.subtab}')" type="button">
                <span>${escapeHtml(workflow.label)}</span>
                <small>${escapeHtml(workflow.detail)}</small>
              </button>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderAdminAttentionQueue() {
  const inProgressAttempts = (state.attempts || []).filter((attempt) => attempt.status !== "submitted");
  const emptyExams = (state.exams || []).filter((exam) => !exam.questions?.length);
  const closedWithCode = (state.exams || []).filter((exam) => exam.open === false && exam.code);
  const lowReports = [...(state.submissions || [])]
    .filter((submission) => Number(submission.score?.percent || 0) < 70)
    .sort((left, right) => Number(left.score?.percent || 0) - Number(right.score?.percent || 0));
  const duplicateExtras = getAllExactTextDuplicateExtraIds(state.questionBank || []);
  const unlinkedReports = (state.submissions || []).filter((submission) => {
    if (submission.studentRecordId) return false;
    return !(state.students || []).some(
      (student) =>
        String(student.studentNumber || "").toLowerCase() === String(submission.studentId || "").toLowerCase() ||
        String(student.name || "").toLowerCase() === String(submission.studentName || "").toLowerCase()
    );
  });
  const items = [
    {
      show: inProgressAttempts.length,
      tone: "warn",
      title: `${inProgressAttempts.length} exam attempt${inProgressAttempts.length === 1 ? "" : "s"} in progress`,
      detail: "Clear testing attempts before changing locked exam settings.",
      action: "openAdminWorkspace('exams', 'manage')",
      button: "Manage",
    },
    {
      show: emptyExams.length,
      tone: "bad",
      title: `${emptyExams.length} exam${emptyExams.length === 1 ? "" : "s"} with no questions`,
      detail: "Open the question editor or build from the bank before sharing these codes.",
      action: "openAdminWorkspace('exams', 'questions')",
      button: "Fix",
    },
    {
      show: duplicateExtras.length,
      tone: "warn",
      title: `${duplicateExtras.length} duplicate bank question${duplicateExtras.length === 1 ? "" : "s"} can be removed`,
      detail: "Cleanup keeps one copy and removes exact same-text extras.",
      action: "openAdminWorkspace('bank', 'cleanup')",
      button: "Cleanup",
    },
    {
      show: unlinkedReports.length,
      tone: "warn",
      title: `${unlinkedReports.length} report${unlinkedReports.length === 1 ? "" : "s"} not linked to a student profile`,
      detail: "Connect older scores to student profiles for better history.",
      action: "openAdminWorkspace('students', 'profile')",
      button: "Link",
    },
    {
      show: lowReports.length,
      tone: "bad",
      title: `${lowReports.length} report${lowReports.length === 1 ? "" : "s"} under 70%`,
      detail: "Use analysis to find specific weaknesses by student or class.",
      action: "openAdminWorkspace('reports', 'summary')",
      button: "Analyze",
    },
    {
      show: closedWithCode.length,
      tone: "info",
      title: `${closedWithCode.length} closed exam${closedWithCode.length === 1 ? "" : "s"} still have codes`,
      detail: "Keep closed exams for records, or reopen only when ready.",
      action: "openAdminWorkspace('exams', 'manage')",
      button: "Review",
    },
  ].filter((item) => item.show);

  return `
    <section class="panel stack attention-panel">
      <div class="section-head">
        <div>
          <h2>Attention Queue</h2>
          <p class="subtle">Fast admin check before students start or before you deploy changes.</p>
        </div>
        <span class="pill ${items.length ? "warn" : "ok"}">${items.length ? `${items.length} item${items.length === 1 ? "" : "s"}` : "All clear"}</span>
      </div>
      ${
        items.length
          ? `<div class="attention-list">
              ${items
                .map(
                  (item) => `
                    <article class="attention-item ${item.tone}">
                      <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <p>${escapeHtml(item.detail)}</p>
                      </div>
                      <button class="ghost" onclick="${item.action}" type="button">${escapeHtml(item.button)}</button>
                    </article>
                  `
                )
                .join("")}
            </div>`
          : `<div class="notice ok">No urgent admin issues found right now.</div>`
      }
    </section>
  `;
}

function renderExamWorkspace(exam) {
  const subtab = getAdminSubTab("exams");
  return `
    <section class="admin-workspace stack">
      ${renderExamWorkflowGuide()}
      ${renderAdminSubTabs("exams")}
      ${subtab === "create" ? renderCreateExamPanel() : ""}
      ${subtab === "manage" ? renderManageExamPanel(exam) : ""}
      ${subtab === "questions" ? renderExamQuestionsPanel(exam) : ""}
    </section>
  `;
}

function renderExamWorkflowGuide() {
  return `
    <section class="panel stack exam-workflow-guide">
      <div class="section-head"><div><h2>Exam Workflow</h2><p class="subtle">Follow these steps from questions to student report.</p></div><span class="pill ok">Guided</span></div>
      <div class="workflow-grid">
        <button class="workflow-card" onclick="openAdminWorkspace('bank', 'import')" type="button"><strong>1. Import questions</strong><small>Upload and organize the question bank.</small></button>
        <button class="workflow-card primary" onclick="openAdminWorkspace('bank', 'build')" type="button"><strong>2. Build the exam</strong><small>Choose subject, difficulty, format mix, and test code.</small></button>
        <button class="workflow-card" onclick="openAdminWorkspace('exams', 'manage')" type="button"><strong>3. Open and print</strong><small>Check settings, create paper copies, and open the test.</small></button>
        <button class="workflow-card" onclick="openAdminWorkspace('reports', 'results')" type="button"><strong>4. Review results</strong><small>See scores, reports, and student next steps.</small></button>
      </div>
    </section>
  `;
}

function renderCreateExamPanel() {
  return `
    <section class="panel stack">
      <div class="section-head">
        <div>
          <h2>Create Exam</h2>
          <p class="subtle">Set the name and code, add questions, then create and share the test.</p>
        </div>
      </div>
      <div class="notice compact ok"><strong>Recommended:</strong> Build from the Question Bank for an organized exam with subject, difficulty, and answer-format controls. <button class="ghost mini" onclick="openAdminWorkspace('bank', 'build')" type="button">Open Question Bank Builder</button></div>
      <div class="notice compact">Combined English + Math exam: create one English exam and one Math exam with the same test code. Students will choose which subject to start first.</div>
      <div class="exam-create-section">
        <h3>1. Exam details</h3>
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
      </div>
      <div class="exam-create-section">
        <h3>2. Student experience</h3>
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
        <label class="row" style="margin-top: 22px"><input id="shuffleQuestions" type="checkbox" checked /> Randomize question order separately for each student</label>
        <label class="row" style="margin-top: 22px"><input id="examPaperForm" type="checkbox" /> Open student paper form after creating</label>
      </div>
      </div>
      <div class="exam-create-section">
        <h3>3. Add questions</h3>
      <div class="csv-import-box">
        <div class="section-head">
          <div>
            <h3>Build From a Question-ID CSV</h3>
            <p class="subtle">Use this when you or ChatGPT selected existing Question Bank IDs. The CSV controls the exact exam order.</p>
          </div>
          <button class="ghost" onclick="downloadExamIdCsvTemplate()" type="button">Download ID Template</button>
        </div>
        <div class="field">
          <label>Question-ID CSV file</label>
          <input id="examIdCsvFile" type="file" accept=".csv,text/csv" onchange="loadExamIdCsv(this.files[0])" />
          <p class="hint" id="examIdCsvStatus">Required column: Question ID. Optional column: Order. Every ID must already exist in the Question Bank.</p>
        </div>
        <div id="examIdCsvPreview" class="csv-preview"></div>
        <button class="primary" onclick="createExamFromIdCsv()" type="button">Create Closed Exam From These IDs</button>
        <p class="hint">For safety, the exam is created closed. Review it in Question Editor, then open it for students.</p>
      </div>
      <div class="csv-import-box">
        <div class="section-head">
          <div>
            <h3>Import an Exam JSON</h3>
            <p class="subtle">Upload a downloaded Topway exam backup, or a JSON object containing an exam with a questions array.</p>
          </div>
        </div>
        <div class="field">
          <label>Exam JSON file</label>
          <input type="file" accept="application/json,.json" onchange="restoreExamBackup(this.files[0]); this.value='';" />
          <p class="hint">The system validates every question first. A valid import becomes a new closed exam; the original exam and reports are not replaced.</p>
        </div>
      </div>
      <div class="notice compact"><strong>Or upload complete new questions below.</strong> The full-question CSV creates questions directly and will stop if required content is missing.</div>
      <div class="field">
        <label>Answer key CSV</label>
        <textarea id="answerKey" placeholder="section,question,answer&#10;Reading Module 1,1,A&#10;Reading Module 1,2,C&#10;Math Module 2,1,17"></textarea>
        <p class="hint">Use section/module names when the test has multiple parts. Mixed answers are supported: A-E or numeric/grid-in.</p>
      </div>
      <div class="csv-import-box">
        <div class="section-head">
          <div>
            <h3>Full Question CSV Import</h3>
            <p class="subtle">Upload a full question spreadsheet to create questions automatically.</p>
          </div>
        </div>
        <div class="field">
          <label>Question CSV file</label>
          <input id="questionCsvFile" type="file" accept=".csv,text/csv" onchange="loadQuestionCsv(this.files[0])" />
          <p class="hint" id="questionCsvStatus">Columns supported: Question, choices, correct answer, skill, difficulty, passage ID, explanation, Question Image URL, Graph URL, and Passage Image URL.</p>
        </div>
        <div class="field">
          <label>System question ID prefix</label>
          <input id="questionIdPrefix" placeholder="Example: SHSATM-" />
          <p class="hint">The system will generate IDs in order, like SHSATM-0001. You do not need IDs in the CSV.</p>
        </div>
        <div id="questionCsvPreview" class="csv-preview"></div>
        <label class="row"><input id="adaptiveExam" type="checkbox" /> Mark as adaptive-ready difficulty exam</label>
        <textarea id="questionCsvText" class="visually-compact" placeholder="CSV preview will appear here after upload."></textarea>
      </div>
      </div>
      <button class="primary" onclick="createExam()">4. Create Exam</button>
    </section>
  `;
}

function renderManageExamPanel(exam) {
  return `
    <section class="panel stack">
      <div class="section-head">
        <div>
          <h2>Exam Settings</h2>
          <p class="subtle">Select an exam, adjust settings, print paper versions, open/close, or clear test progress.</p>
        </div>
      </div>
      ${renderExamList(exam, { showSettings: true, showQuestions: false })}
    </section>
  `;
}

function renderExamQuestionsPanel(exam) {
  return `
    <section class="panel stack">
      <div class="section-head">
        <div>
          <h2>Question Editor</h2>
          <p class="subtle">Pick one exam, preview the student view, and edit questions without the long management table.</p>
        </div>
      </div>
      ${renderQuestionEditorExamPicker(exam)}
      ${exam ? renderQuestionEditor(exam) : `<div class="notice">Choose an exam to edit questions.</div>`}
    </section>
  `;
}

function renderQuestionBankWorkspace() {
  const filteredQuestions = getFilteredBankQuestions();
  let inspectedQuestion = bankInspectorQuestionId ? (state.questionBank || []).find((question) => question.id === bankInspectorQuestionId) : null;
  if (bankInspectorQuestionId && !inspectedQuestion) bankInspectorQuestionId = "";
  const questions = inspectedQuestion ? [inspectedQuestion] : filteredQuestions;
  const selectedQuestion = inspectedQuestion || questions.find((question) => question.id === selectedBankQuestionId) || questions[0] || state.questionBank?.[0] || null;
  selectedBankQuestionId = selectedQuestion?.id || null;
  const bankClasses = [...new Set((state.questionBank || []).map((question) => getBankQuestionClass(question)).filter(Boolean))].sort();
  const skills = [...new Set((state.questionBank || []).map((question) => question.skill).filter(Boolean))].sort();
  const difficulties = [...new Set((state.questionBank || []).map((question) => question.difficulty).filter(Boolean))].sort((a, b) => Number(a) - Number(b));
  const idHealth = getBankIdHealth(questions);
  const subtab = getAdminSubTab("bank");

  return `
    <section class="admin-workspace stack">
      ${renderAdminSubTabs("bank")}
      <div class="panel stack">
        <div class="section-head">
          <div>
            <h2>Question Bank</h2>
            <p class="subtle">Import, organize, edit, export, and build exams from reusable questions.</p>
          </div>
          <span class="pill">${state.questionBank?.length || 0} saved</span>
        </div>
        ${subtab === "import" ? renderBankImportPanel() : ""}
        ${subtab === "smart" ? `${renderBankFilters(bankClasses, skills, difficulties)}${renderSmartExamGenerator(questions)}` : ""}
        ${subtab === "build" ? `${renderBankFilters(bankClasses, skills, difficulties)}${renderBankBuildPanel(questions)}` : ""}
        ${subtab === "edit" ? `${renderBankFilters(bankClasses, skills, difficulties)}${inspectedQuestion ? renderBankInspectionFocusBanner(inspectedQuestion) : renderBankBatchFixPanel(questions)}${renderBankQuestionEditor(questions, selectedQuestion)}` : ""}
        ${subtab === "cleanup" ? `${renderBankFilters(bankClasses, skills, difficulties)}${renderBankQualityInspection()}${renderBankIdFixPanel(idHealth, questions)}${renderBankDuplicateDetector(questions)}` : ""}
        ${subtab === "export" ? `${renderBankFilters(bankClasses, skills, difficulties)}${renderBankExportPanel(questions)}` : ""}
      </div>
    </section>
  `;
}

function renderBankImportPanel() {
  return `
    <div class="grid two">
      <div class="csv-import-box">
        <div class="field">
          <label>Import question CSV to bank</label>
          <input type="file" accept=".csv,text/csv" onchange="loadBankCsv(this.files[0])" />
          <p class="hint" id="bankCsvStatus">Use Question Type: multiple, numeric, equation, fill_blank, dropdown (inline choice), drag_drop, table_grid, hot_text, or hotspot. Use Options for dropdowns, drag items, selectable text, table columns, or hot spot zones. Hot spots need an image and zones such as lake::Lake::20::30::18::16.</p>
        </div>
        <div class="field">
          <label>System question ID prefix</label>
          <input id="bankQuestionIdPrefix" placeholder="Example: SHSATM-" />
          <p class="hint">IDs are generated by the system in saved order, so they do not repeat and do not depend on ChatGPT.</p>
        </div>
        <div class="field">
          <label>Source Exam / Bank Tab</label>
          <input id="bankImportTestClass" placeholder="Example: Spring 26 First SHSAT English Exam" />
          <p class="hint">Every question in this CSV will appear under this tab. Use one clear name per source exam.</p>
        </div>
        <div class="field">
          <label>Subject for this CSV</label>
          <select id="bankImportSubject">
            <option value="">Auto-detect from the CSV</option>
            <option value="english">English / Reading</option>
            <option value="math">Math</option>
          </select>
          <p class="hint">Choose a subject when the CSV does not have a Subject column. A mixed CSV should use its own Subject column for each row.</p>
        </div>
        <div id="bankCsvPreview" class="csv-preview"></div>
        <button class="primary" onclick="importQuestionBankCsv()" type="button">Import To Bank</button>
        <textarea id="bankCsvText" class="visually-compact" placeholder="CSV preview will appear here after upload."></textarea>
      </div>
      <div class="card stack">
        <h3>Add One Bank Question</h3>
        <div class="grid two compact-grid">
          <div class="field"><label>System ID prefix</label><input id="singleBankIdPrefix" placeholder="Example: SHSATM-" /></div>
          <div class="field"><label>Test / Class</label><input id="singleBankTestClass" placeholder="SHSAT Math, SAT English" /></div>
          <div class="field"><label>Section / Topic</label><input id="singleBankSection" placeholder="Section 1" /></div>
          <div class="field"><label>Answer type</label><select id="singleBankType">${renderQuestionTypeOptions("multiple")}</select></div>
        </div>
        <button class="primary" onclick="addSingleBankQuestion()" type="button">Create Blank Bank Question</button>
        <p class="hint">After it is created, open Edit and fill in the full question, answer, passage, image, skill, and explanation.</p>
      </div>
    </div>
  `;
}

function renderBankFilters(bankClasses, skills, difficulties) {
  const allBankQuestions = state.questionBank || [];
  const usedSourceIds = getUsedBankSourceIds();
  const usedQuestionCount = allBankQuestions.filter((question) => usedSourceIds.has(getBankQuestionSourceGroupId(question))).length;
  const unusedQuestionCount = Math.max(0, allBankQuestions.length - usedQuestionCount);
  const advancedOpen = bankClassFilter !== "all" || bankSkillFilter !== "all" || bankDifficultyFilter !== "all" || bankTypeFilter !== "all";
  return `
    ${renderBankSubjectTabs()}
    <div class="bank-quick-filters">
      <div class="field">
        <label>Search</label>
        <input id="bankSearch" value="${escapeHtml(bankSearch)}" placeholder="Question, class, skill, answer..." oninput="queueBankSearch(this.value)" />
      </div>
      <div class="field">
        <label>Open question ID</label>
        <input id="bankQuestionIdSearch" placeholder="Example: SHSATM-0001" onkeydown="if(event.key==='Enter'){event.preventDefault();openBankQuestionById()}" />
        <button class="ghost small" type="button" onclick="openBankQuestionById()">Open question</button>
      </div>
    </div>
    <div class="bank-reuse-bar">
      <div>
        <strong>Questions stay in the bank</strong>
        <span>Creating an exam marks usage; it never consumes or removes a question.</span>
      </div>
      <div class="bank-reuse-actions" role="group" aria-label="Question availability">
        <button class="${bankUsageFilter === "all" ? "active" : ""}" aria-pressed="${bankUsageFilter === "all"}" onclick="setBankUsageFilter('all')" type="button">Include previously used (${allBankQuestions.length})</button>
        <button class="${bankUsageFilter === "unused" ? "active" : ""}" aria-pressed="${bankUsageFilter === "unused"}" onclick="setBankUsageFilter('unused')" type="button">New only (${unusedQuestionCount})</button>
      </div>
    </div>
    <details class="bank-advanced-filters" ${advancedOpen ? "open" : ""}>
      <summary>More filters and question types${advancedOpen ? " · filters active" : ""}</summary>
      ${renderBankClassTabs(bankClasses)}
      <div class="bank-filters">
      <div class="field">
        <label>Test / Class</label>
        <select onchange="setBankClassFilter(this.value)">
          <option value="all">All tests/classes</option>
          ${bankClasses.map((item) => `<option value="${escapeHtml(item)}" ${bankClassFilter === item ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Skill</label>
        <select onchange="setBankSkillFilter(this.value)">
          <option value="all">All skills</option>
          ${skills.map((skill) => `<option value="${escapeHtml(skill)}" ${bankSkillFilter === skill ? "selected" : ""}>${escapeHtml(skill)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Difficulty</label>
        <select onchange="setBankDifficultyFilter(this.value)">
          <option value="all">All levels</option>
          ${difficulties.map((level) => `<option value="${escapeHtml(level)}" ${String(bankDifficultyFilter) === String(level) ? "selected" : ""}>Level ${escapeHtml(level)}</option>`).join("")}
        </select>
      </div>
      </div>
      ${renderQuestionTypeTabs()}
      <button class="ghost small" type="button" onclick="resetBankAdvancedFilters()">Clear advanced filters</button>
    </details>
  `;
}

function renderBankSubjectTabs() {
  const allQuestions = state.questionBank || [];
  const mathCount = allQuestions.filter((question) => inferBankQuestionSubject(question) === "Math").length;
  const englishCount = allQuestions.filter((question) => inferBankQuestionSubject(question) === "English / Reading").length;
  const readingCount = allQuestions.filter(isBankReadingComprehensionCatalogQuestion).length;
  const unknownCount = allQuestions.length - mathCount - englishCount;
  return `
    <nav class="bank-class-tabs bank-subject-tabs" aria-label="Question subject">
      <span class="question-type-label">Subject</span>
      <button class="${bankSubjectFilter === "all" ? "active" : ""}" onclick="setBankSubjectFilter('all')" type="button">All <span>${allQuestions.length}</span></button>
      <button class="${bankSubjectFilter === "Reading Comprehension" ? "active" : ""}" onclick="setBankSubjectFilter('Reading Comprehension')" type="button">Reading Comprehension <span>${readingCount}</span></button>
      <button class="${bankSubjectFilter === "English / Reading" ? "active" : ""}" onclick="setBankSubjectFilter('English / Reading')" type="button">English / Reading <span>${englishCount}</span></button>
      <button class="${bankSubjectFilter === "Math" ? "active" : ""}" onclick="setBankSubjectFilter('Math')" type="button">Math <span>${mathCount}</span></button>
      ${unknownCount ? `<span class="pill warn">${unknownCount} unassigned</span>` : ""}
    </nav>
  `;
}

function renderQuestionTypeTabs() {
  const tabs = [["all", "All"], ...QUESTION_TYPE_OPTIONS];
  const questions = state.questionBank || [];
  return `
    <nav class="question-type-tabs" aria-label="Question type">
      <span class="question-type-label">Question type</span>
      ${tabs
        .map(([value, label]) => {
          const count = value === "all" ? questions.length : questions.filter((question) => normalizeQuestionType(question.type) === value).length;
          return `<button class="${bankTypeFilter === value ? "active" : ""}" onclick="setBankTypeFilter('${value}')" type="button">${escapeHtml(label)} <span>${count}</span></button>`;
        })
        .join("")}
    </nav>
  `;
}

function getBankBuildSubject(questions) {
  if (bankSubjectFilter === "Reading Comprehension") return "English / Reading";
  if (bankSubjectFilter === "Math" || bankSubjectFilter === "English / Reading") return bankSubjectFilter;
  const subjects = [...new Set((questions || []).map((question) => inferBankQuestionSubject(question)).filter(Boolean))];
  return subjects.length === 1 ? subjects[0] : "";
}

function renderBankBuildPanel(questions) {
  const buildSubject = getBankBuildSubject(questions);
  const preferredExamType = buildSubject === "English / Reading" ? "english" : buildSubject === "Math" ? "math" : "";
  const isElaBuild = buildSubject === "English / Reading";
  const readiness = getBankExamReadiness(questions);
  const selectedMixLevels = new Set(questionMixPlan?.difficultyLevels || [1, 2, 3, 4]);
  const mixTarget = questionMixPlan?.target || 50;
  const mixReadingMinPercent = questionMixPlan?.readingMinPercent ?? (isElaBuild ? 70 : 0);
  const mixReadingMaxPercent = questionMixPlan?.readingMaxPercent ?? (isElaBuild ? 80 : 0);
  const mixReadingCount = questionMixPlan?.readingMode === "exact" ? questionMixPlan.readingTarget : "";
  const mixReadingPercent = questionMixPlan?.readingPercent ?? mixReadingMaxPercent;
  const mixReadingSelected = questionMixPlan?.readingCount ?? "Auto";
  const mixNonReadingSelected = questionMixPlan?.complete ? Math.max(0, questionMixPlan.target - questionMixPlan.readingCount) : "Auto";
  const mixTargetStudentId = questionMixPlan?.targetStudentId || "";
  const mixReusePolicy = questionMixPlan?.reusePolicy || "never_used";
  const mixProgram = questionMixPlan?.program || "";
  return `
    <div class="stack build-workflow-grid">
      <details class="card build-secondary" open>
        <summary>Step 1 — Exam details and manual build</summary>
        <div class="stack build-secondary-body">
        <div class="section-head"><div><h3>Create Exam From Bank</h3><p class="subtle">Step 1: choose a subject above. Step 2: create from only those visible questions.</p></div><span class="pill ${readiness.invalid.length ? "warn" : "ok"}">${readiness.ready.length} ready · ${readiness.invalid.length} need review</span></div>
        <div class="grid two compact-grid">
          <div class="field"><label>Exam title</label><input id="bankExamTitle" placeholder="SHSAT Math Practice" /></div>
          <div class="field"><label>Test code</label><input id="bankExamCode" placeholder="SHSAT-001" /></div>
          <div class="field"><label>Minutes</label><input id="bankExamMinutes" type="number" min="1" value="65" /></div>
          <div class="field">
            <label>Subject</label>
            <select id="bankExamType" onchange="setBankBuildSubject(this.value)">
              <option value="" ${!preferredExamType ? "selected" : ""} disabled>Choose a subject</option>
              <option value="math" ${preferredExamType === "math" ? "selected" : ""}>Math</option>
              <option value="english" ${preferredExamType === "english" ? "selected" : ""}>English / Reading</option>
            </select>
          </div>
        </div>
        <div class="grid two compact-grid reuse-policy-card">
          <div class="field">
            <label>Program / Course</label>
            <input id="bankExamProgram" list="bankExamProgramOptions" value="${escapeHtml(mixProgram)}" placeholder="Example: Fall SHSAT Grade 8" />
            ${renderProgramDatalist("bankExamProgramOptions")}
          </div>
          <div class="field">
            <label>Question reuse policy</label>
            <select id="bankExamReusePolicy" onchange="questionMixPlan=null">${renderReusePolicyOptions(mixReusePolicy)}</select>
          </div>
        </div>
        <p class="hint">Choose a program to reuse questions across different programs while keeping each individual program fresh. “Never used” is the strictest option.</p>
        <label class="row"><input id="bankExamShuffle" type="checkbox" checked /> Randomize question order separately for each student</label>
        <p class="hint">Reading passages stay attached to their questions, and questions inside each passage keep their correct order.</p>
        <label class="row"><input id="bankExamAdaptive" type="checkbox" /> Mark as adaptive-ready</label>
        <label class="row"><input id="bankExamPaperForm" type="checkbox" /> Open student paper form after creating</label>
        <div class="notice compact">For a 50-question SHSAT exam, the Original conversion chart is applied automatically. Raw score and converted score are both kept on the report.</div>
        <div class="bank-selection-actions">
          <button class="primary" onclick="createExamFromBank()" type="button">Create Exam From Current Filter (${questions.length})</button>
          <button class="ghost" onclick="createExamFromSelectedBankQuestions()" type="button">Create Exam From Checked (<span data-bank-selection-count>${selectedBankQuestionIds.size}</span>)</button>
        </div>
        <p class="hint">The safety check automatically leaves out incomplete or mismatched questions. Open them in Edit to correct the highlighted issue before your next build.</p>
        ${renderBankSelectionSummary()}
        </div>
      </details>
      <div class="card stack question-mix-builder">
        <div class="section-head"><div><h3>Step 2 — Flexible Question Mix</h3><p class="subtle">Choose the difficulty levels and answer formats. Reading can use an automatic percentage range or an optional exact count.</p></div><span class="pill warn">Review draft</span></div>
        <div class="grid two compact-grid">
          <div class="field"><label>Total questions</label><input id="mixTotal" type="number" min="1" value="${mixTarget}" oninput="updateFlexibleMixTotal()" /></div>
          <div class="field"><label>Multiple choice <span class="label-note">automatic remainder</span></label><input id="mixMultiple" type="number" min="0" value="${questionMixPlan?.requested?.multiple ?? 50}" readonly /></div>
        </div>
        <div class="reading-range-card">
          <div><strong>Automatic reading-comprehension range</strong><p class="hint">Auto-Pick chooses a complete-passage count inside this range. Enter an exact count only when you must override the range.</p></div>
          <div class="reading-range-grid">
          <div class="field"><label>Reading minimum % <span class="label-note">ELA default: 70%</span></label><input id="mixReadingMinPercent" type="number" min="0" max="100" value="${mixReadingMinPercent}" oninput="clearFlexibleExactReadingCount()" /></div>
          <div class="field"><label>Reading maximum % <span class="label-note">ELA default: 80%</span></label><input id="mixReadingMaxPercent" type="number" min="0" max="100" value="${mixReadingMaxPercent}" oninput="clearFlexibleExactReadingCount()" /></div>
          <div class="field"><label>Exact reading count <span class="label-note">optional override</span></label><input id="mixReadingCount" type="number" min="0" value="${mixReadingCount}" placeholder="Auto within range" oninput="updateFlexibleReadingPercentFromCount()" /></div>
          <div class="field"><label>Selected reading count</label><input id="mixReadingSelected" value="${escapeHtml(mixReadingSelected)}" readonly /></div>
          ${isElaBuild ? `<div class="field"><label>Selected language/editing count</label><input id="mixNonReadingSelected" value="${escapeHtml(mixNonReadingSelected)}" readonly /></div>` : ""}
          </div>
        </div>
        <p class="hint">For a 50-question English exam, 70–80% allows 35–40 reading questions. Auto-Pick chooses an achievable complete-passage count inside that range and reports the exact number.</p>
        <details class="mix-optional-formats">
          <summary>Optional answer formats (all default to zero)</summary>
          <div class="grid four compact-grid mix-optional-grid">
          <div class="field"><label>Fill in blank <span class="label-note">optional</span></label><input id="mixFillBlank" type="number" min="0" value="${questionMixPlan?.requested?.fill_blank ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          <div class="field"><label>Inline dropdown <span class="label-note">optional</span></label><input id="mixDropdown" type="number" min="0" value="${questionMixPlan?.requested?.dropdown ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          <div class="field"><label>Drag and drop <span class="label-note">optional</span></label><input id="mixDragDrop" type="number" min="0" value="${questionMixPlan?.requested?.drag_drop ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          <div class="field"><label>Claim / evidence table <span class="label-note">optional</span></label><input id="mixTableGrid" type="number" min="0" value="${questionMixPlan?.requested?.table_grid ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          <div class="field"><label>Grid-in / short answer <span class="label-note">optional</span></label><input id="mixNumeric" type="number" min="0" value="${questionMixPlan?.requested?.numeric ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          <div class="field"><label>Equation editor <span class="label-note">optional</span></label><input id="mixEquation" type="number" min="0" value="${questionMixPlan?.requested?.equation ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          <div class="field"><label>Hot text selection <span class="label-note">optional</span></label><input id="mixHotText" type="number" min="0" value="${questionMixPlan?.requested?.hot_text ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          <div class="field"><label>Hot spot image <span class="label-note">optional</span></label><input id="mixHotspot" type="number" min="0" value="${questionMixPlan?.requested?.hotspot ?? 0}" oninput="updateFlexibleMixTotals()" /></div>
          </div>
        </details>
        <div class="field mix-difficulty-field">
          <label>Difficulty levels to mix <span class="label-note">check any combination</span></label>
          <div class="mix-level-options">
            ${[1, 2, 3, 4].map((level) => `<label><input id="mixDifficulty${level}" type="checkbox" ${selectedMixLevels.has(level) ? "checked" : ""} /> Level ${level}</label>`).join("")}
          </div>
        </div>
        <div class="notice compact">Reuse policy: <strong>${escapeHtml(questionReusePolicyLabel(mixReusePolicy))}</strong>${mixProgram ? ` · Program: <strong>${escapeHtml(mixProgram)}</strong>` : ""}. Change it in Step 1 above, then generate the mix again.</div>
        ${renderTargetStudentProtectionSelect("mixTargetStudentId", mixTargetStudentId)}
        <p class="hint">Choose the student when this exam is for someone who has tested before. Their submitted and in-progress question history is always excluded, even if you allow questions used by other students.</p>
        <div class="bank-selection-actions">
          ${isElaBuild ? `<button class="ghost" onclick="applyShsatEla50Mix()" type="button">Use SHSAT ELA 50 Mix</button>` : ""}
          ${buildSubject === "Math" ? `<button class="ghost" onclick="applyShsatMath50Mix()" type="button">Use SHSAT Math 50 Mix</button>` : ""}
          <button class="primary" onclick="generateQuestionMixDraft()" type="button">Auto-Pick Question Mix</button>
          <button class="ghost" onclick="useQuestionMixDraft()" type="button">Check Mix Draft</button>
          <button class="ghost" onclick="createExamFromQuestionMixDraft()" type="button">Create Exam From Mix</button>
        </div>
        ${renderQuestionMixDraft(questionMixPlan)}
        <p class="hint">Optional formats stay at zero and cannot appear unless you enter a count or deliberately use a preset. Multiple choice automatically fills the remaining spaces. Complete passage sets stay together; if an exact mix is unavailable, exam creation is blocked instead of silently changing your request.</p>
      </div>
      <details class="card build-secondary">
        <summary>Teacher print version</summary>
        <div class="stack build-secondary-body">
          <p class="subtle">Teacher-only copy with question text, choices, correct answers, and explanations.</p>
          <div class="bank-selection-actions">
            <button class="ghost" onclick="printTeacherBankVersion(false)" type="button">Teacher Version From Current Filter (${questions.length})</button>
            <button class="ghost" onclick="printTeacherBankVersion(true)" type="button">Teacher Version From Checked (<span data-bank-selection-count>${selectedBankQuestionIds.size}</span>)</button>
          </div>
          <p class="hint">This is only available inside Admin. Students still do not receive answers or explanations.</p>
        </div>
      </details>
    </div>
  `;
}

function renderBankQualityInspection() {
  const inspection = bankQualityInspection;
  return `
    <section class="card stack">
      <div class="section-head">
        <div>
          <h3>Full Bank Quality Inspection</h3>
          <p class="subtle">Checks all ${state.questionBank?.length || 0} saved questions without changing or deleting any question.</p>
        </div>
        <button class="primary" onclick="runBankQualityInspection()" type="button">Inspect All Questions</button>
      </div>
      ${inspection ? `
        <div class="grid three compact-grid">
          <div class="stat"><span class="subtle">Checked</span><strong>${inspection.total}</strong></div>
          <div class="stat"><span class="subtle">Ready</span><strong>${inspection.ready}</strong></div>
          <div class="stat"><span class="subtle">Needs review</span><strong>${inspection.invalid.length}</strong></div>
        </div>
        ${inspection.invalid.length ? `<div class="notice warn compact"><strong>Nothing was changed automatically.</strong> Use <strong>Fix</strong> to open only that flagged question, <strong>Mark correct</strong> when you confirm the warning is not a real problem, or <strong>Delete</strong> to remove only that question from the bank.</div><div class="table-wrap"><table><thead><tr><th>Question ID</th><th>Type</th><th>Issue</th><th>Actions</th></tr></thead><tbody>${inspection.invalid.slice(0, 40).map((item) => `<tr><td>${escapeHtml(item.question.sourceQuestionId || item.question.id)}</td><td>${escapeHtml(questionTypeLabel(item.question.type))}</td><td>${escapeHtml(item.issues.join(", "))}</td><td><div class="inspection-actions"><button class="ghost" onclick="openInspectedBankQuestion('${item.question.id}')" type="button">Fix</button><button class="ghost" onclick="approveInspectedBankQuestion('${item.question.id}')" type="button">Mark correct</button><button class="danger-light" onclick="deleteInspectedBankQuestion('${item.question.id}')" type="button">Delete</button></div></td></tr>`).join("")}</tbody></table></div>${inspection.invalid.length > 40 ? `<p class="hint">Showing the first 40 flagged questions. Use the filters and inspection again after correcting them.</p>` : ""}` : `<div class="notice ok">All checked questions are ready for use.</div>`}
      ` : `<p class="hint">This includes underline references, incomplete structured formats, missing answers, and missing images. It is safe for a 5,000-question bank.</p>`}
    </section>
  `;
}

function runBankQualityInspection() {
  const allQuestions = state.questionBank || [];
  const invalid = allQuestions.map((question) => ({ question, issues: getBankQuestionReadinessIssues(question) })).filter((item) => item.issues.length);
  bankQualityInspection = { total: allQuestions.length, ready: allQuestions.length - invalid.length, invalid };
  adminActiveTab = "bank";
  adminSubTabs.bank = "cleanup";
  renderAdmin();
}

function openInspectedBankQuestion(id) {
  bankInspectorQuestionId = id;
  selectedBankQuestionId = id;
  bankPage = 0;
  adminActiveTab = "bank";
  adminSubTabs.bank = "edit";
  renderAdmin();
}

function renderBankInspectionFocusBanner(question) {
  return `
    <div class="notice warn compact bank-inspection-focus">
      <div><strong>Fixing one Self Check question:</strong> ${escapeHtml(question.sourceQuestionId || question.id)}. This page is limited to this one question.</div>
      <button class="ghost" onclick="returnToBankQualityInspection()" type="button">Back to Self Check</button>
    </div>
  `;
}

function returnToBankQualityInspection() {
  bankInspectorQuestionId = "";
  adminActiveTab = "bank";
  adminSubTabs.bank = "cleanup";
  renderAdmin();
}

async function approveInspectedBankQuestion(id) {
  const question = (state.questionBank || []).find((item) => item.id === id);
  if (!question || !confirm("Mark this question as correct after your manual review? Future Self Check scans will not flag it again unless you edit the question.")) return;
  try {
    const result = await api(`/api/admin/question-bank/${id}`, {
      method: "POST",
      body: JSON.stringify({ qualityApprovedAt: new Date().toISOString() }),
    });
    state = result.question
      ? { ...state, questionBank: (state.questionBank || []).map((item) => (item.id === id ? result.question : item)) }
      : result;
    if (bankQualityInspection) {
      const invalid = bankQualityInspection.invalid.filter((item) => item.question.id !== id);
      bankQualityInspection = { total: state.questionBank.length, ready: state.questionBank.length - invalid.length, invalid };
    }
    if (bankInspectorQuestionId === id) bankInspectorQuestionId = "";
    adminActiveTab = "bank";
    adminSubTabs.bank = "cleanup";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteInspectedBankQuestion(id) {
  const question = (state.questionBank || []).find((item) => item.id === id);
  if (!question || !confirm("Delete only this flagged bank question? Exams already created from it will stay unchanged.")) return;
  try {
    const result = await api(`/api/admin/question-bank/${id}`, { method: "DELETE" });
    const deletedId = result.deletedQuestionId || id;
    state = result.deletedQuestionId ? { ...state, questionBank: (state.questionBank || []).filter((item) => item.id !== deletedId) } : result;
    selectedBankQuestionIds.delete(deletedId);
    if (bankQualityInspection) {
      const invalid = bankQualityInspection.invalid.filter((item) => item.question.id !== deletedId);
      bankQualityInspection = { total: state.questionBank.length, ready: state.questionBank.length - invalid.length, invalid };
    }
    bankInspectorQuestionId = "";
    selectedBankQuestionId = state.questionBank?.[0]?.id || null;
    adminActiveTab = "bank";
    adminSubTabs.bank = "cleanup";
    renderAdmin();
  } catch (error) {
    if (/Bank question not found/i.test(error.message)) {
      await loadAdminState();
      bankInspectorQuestionId = "";
      adminActiveTab = "bank";
      adminSubTabs.bank = "cleanup";
      renderAdmin();
      return;
    }
    alert(error.message);
  }
}

function renderBankIdFixPanel(idHealth, questions) {
  return `
    <div class="card stack">
      <h3>Fix Question IDs</h3>
      ${renderBankIdHealth(idHealth, questions.length)}
      <div class="grid two compact-grid">
        <div class="field">
          <label>New ID prefix</label>
          <input id="regenerateBankIdPrefix" placeholder="Example: SHSATM-" />
        </div>
        <div class="field">
          <label>Start number</label>
          <input id="regenerateBankIdStart" type="number" min="1" value="1" />
        </div>
      </div>
      <button class="ghost" onclick="regenerateBankQuestionIds()" type="button">Regenerate IDs For Current Filter (${questions.length})</button>
      <p class="hint">Use search/filter first if you only want to renumber one test, section, skill, or level.</p>
    </div>
  `;
}

function renderBankExportPanel(questions) {
  return `
    <div class="card stack">
      <h3>Excel Backup</h3>
      <p class="subtle">Download the question bank as an Excel-openable backup file.</p>
      <div class="bank-selection-actions">
        <button class="primary" onclick="downloadQuestionBankManagerWorkbook('all')" type="button">Download Manager Workbook</button>
        <button class="ghost" onclick="downloadQuestionBankExcel('all')" type="button">Download All Bank</button>
        <button class="ghost" onclick="downloadQuestionBankEditingSheet('all')" type="button">Download Editing Sheet</button>
        <button class="ghost" onclick="downloadQuestionBankExcel('filter')" type="button">Download Current Filter (${questions.length})</button>
        <button class="ghost" onclick="downloadQuestionBankExcel('checked')" type="button">Download Checked (<span data-bank-selection-count>${selectedBankQuestionIds.size}</span>)</button>
      </div>
      <p class="hint">For thousands of questions, use Manager Workbook. It creates separate Excel tabs by class/category, such as SHSAT ELA, SHSAT Math, SAT English, and SAT Math.</p>
    </div>
  `;
}

function renderBankClassTabs(bankClasses) {
  if (!state.questionBank?.length) return "";
  const tabs = ["all", ...bankClasses];
  return `
    <div class="bank-class-tabs">
      ${tabs
        .map((item) => {
          const label = item === "all" ? "All Bank" : item;
          const count =
            item === "all"
              ? state.questionBank.length
              : state.questionBank.filter((question) => getBankQuestionClass(question) === item).length;
          return `<button class="${bankClassFilter === item ? "active" : ""}" onclick="setBankClassFilter('${escapeJs(item)}')" type="button">${escapeHtml(label)} <span>${count}</span></button>`;
        })
        .join("")}
    </div>
  `;
}

function getSelectedBankQuestions() {
  const selectedIds = new Set(selectedBankQuestionIds);
  return (state.questionBank || []).filter((question) => selectedIds.has(question.id)).sort(bankQuestionUiSort);
}

function getBankQuestionSourceGroupId(question) {
  return String(question?.sourceGroupId || question?.aiSourceQuestionId || question?.sourceQuestionId || question?.id || "").trim().toLowerCase();
}

function uniqueBankQuestionsBySourceGroup(questions) {
  const groups = new Set();
  return (questions || []).filter((question) => {
    const groupId = getBankQuestionSourceGroupId(question);
    if (groups.has(groupId)) return false;
    groups.add(groupId);
    return true;
  });
}

function bankQuestionUiSort(left, right) {
  return (
    String(getBankQuestionClass(left)).localeCompare(String(getBankQuestionClass(right))) ||
    (Number(left.bankNumber) || 999999) - (Number(right.bankNumber) || 999999) ||
    (Number(left.originalNumber) || 999999) - (Number(right.originalNumber) || 999999)
  );
}

function getBankEditorQuestions(questions) {
  const items = [...(questions || [])];
  if (bankListSort === "source") return items.sort(bankQuestionUiSort);
  return items.sort((left, right) => {
    const leftTime = new Date(left.createdAt || left.updatedAt || 0).getTime() || 0;
    const rightTime = new Date(right.createdAt || right.updatedAt || 0).getTime() || 0;
    return rightTime - leftTime || (Number(right.bankNumber) || 0) - (Number(left.bankNumber) || 0) || bankQuestionUiSort(left, right);
  });
}

function getBankSelectionByClass() {
  const groups = new Map();
  getSelectedBankQuestions().forEach((question) => {
    const label = getBankQuestionClass(question);
    groups.set(label, (groups.get(label) || 0) + 1);
  });
  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function renderBankSelectionSummary() {
  const groups = getBankSelectionByClass();
  if (!groups.length) return `<div class="notice compact" data-bank-selection-summary>No checked questions yet. You can check questions from multiple tabs before creating one exam.</div>`;
  return `
    <div class="selection-summary" data-bank-selection-summary>
      <strong>Selected Basket</strong>
      <div class="selection-pills">
        ${groups.map(([label, count]) => `<span class="pill">${escapeHtml(label)}: ${count}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderBankBatchFixPanel(questions) {
  if (!state.questionBank?.length) return "";
  return `
    <section class="card stack batch-fix-panel">
      <div class="section-head">
        <div>
          <h3>Batch Fix Current Filter</h3>
          <p class="subtle">Apply the fields you enter below to the ${questions.length} question${questions.length === 1 ? "" : "s"} currently shown.</p>
        </div>
        <span class="pill">${questions.length} selected by filter</span>
      </div>
      <div class="grid four batch-fix-grid">
        <div class="field"><label>Test / Class</label><input id="batchBankTestClass" placeholder="SAT English, SHSAT Math" /></div>
        <div class="field"><label>Section / Topic</label><input id="batchBankSection" placeholder="Leave blank to skip" /></div>
        <div class="field"><label>Skill</label><input id="batchBankSkill" placeholder="Leave blank to skip" /></div>
        <div class="field"><label>Difficulty</label><input id="batchBankDifficulty" type="number" min="1" max="4" placeholder="1-4" /></div>
      </div>
      <div class="grid two compact-grid">
        <div class="field">
          <label>Answer type</label>
          <select id="batchBankType">
            <option value="">Do not change</option>
            <option value="multiple">Multiple choice</option>
            <option value="numeric">Short answer / Grid-in</option>
          </select>
        </div>
        <div class="field"><label>Choices</label><input id="batchBankChoices" placeholder="Example: A-D or A, B, C, D" /></div>
      </div>
      <div class="field"><label>Group / Passage ID</label><input id="batchBankGroupId" placeholder="Leave blank to skip" /></div>
      <button class="ghost" onclick="batchFixBankQuestions()" type="button">Apply Batch Fix</button>
      <p class="hint">Only non-empty fields will change. Use this after filtering by test, topic, skill, or difficulty.</p>
    </section>
  `;
}

function getBankQuestionMeta(question) {
  if (!question || typeof question !== "object") return { classLabel: "Unassigned", subject: "", searchText: "" };
  const cached = bankQuestionMetaCache.get(question);
  if (cached) return cached;
  const savedClass = String(question?.testClass || "").trim();
  const id = String(question?.sourceQuestionId || "").toUpperCase();
  const classLabel = savedClass || (/^SHSATM|^SHA?M|SHSAT.*MATH/.test(id) ? "SHSAT Math" : /^SHSATE|^SHA?E|SHSAT.*(ENG|READ)/.test(id) ? "SHSAT English" : /^SATM|SAT.*MATH/.test(id) ? "SAT Math" : /^SATE|^SATR|SAT.*(ENG|READ|RW)/.test(id) ? "SAT English" : "Unassigned");
  const savedSubject = String(question.subject || "").toLowerCase();
  const subjectText = `${question.testClass || ""} ${question.section || ""} ${question.skill || ""}`.toLowerCase();
  const subject = savedSubject === "math" || (savedSubject !== "english" && /math|algebra|geometry|arithmetic|probability/.test(subjectText)) ? "Math" : savedSubject === "english" || /english|ela|reading|grammar|writing/.test(subjectText) ? "English / Reading" : "";
  const meta = {
    classLabel,
    subject,
    searchText: `${question.questionText || ""} ${question.passageTitle || ""} ${question.passageText || ""} ${classLabel} ${question.testClass || ""} ${question.section || ""} ${question.skill || ""} ${question.answer || ""} ${question.sourceQuestionId || ""}`.toLowerCase(),
  };
  bankQuestionMetaCache.set(question, meta);
  return meta;
}

function getBankQuestionClass(question) {
  return getBankQuestionMeta(question).classLabel;
}

function getFilteredBankQuestions(options = {}) {
  const ignoreType = Boolean(options.ignoreType);
  const ignoreDifficulty = Boolean(options.ignoreDifficulty);
  const ignoreUsage = Boolean(options.ignoreUsage);
  const search = bankSearch.trim().toLowerCase();
  const bank = state.questionBank || [];
  const usedSourceIds = !ignoreUsage && bankUsageFilter === "unused" ? getUsedBankSourceIds() : null;
  const cacheKey = [search, bankClassFilter, bankSubjectFilter, bankSkillFilter, bankDifficultyFilter, bankTypeFilter, bankUsageFilter, ignoreType ? "ignore-type" : "with-type", ignoreDifficulty ? "ignore-difficulty" : "with-difficulty", ignoreUsage ? "ignore-usage" : "with-usage"].join("|");
  if (bankFilteredCache?.bank === bank && bankFilteredCache.exams === state.exams && bankFilteredCache.key === cacheKey) return bankFilteredCache.questions;
  const questions = [...bank]
    .filter((question) => {
      const meta = getBankQuestionMeta(question);
      const matchesSearch = !search || meta.searchText.includes(search);
      const matchesClass = bankClassFilter === "all" || meta.classLabel === bankClassFilter;
      const matchesSubject =
        bankSubjectFilter === "all" ||
        meta.subject === bankSubjectFilter ||
        (bankSubjectFilter === "Reading Comprehension" && isBankReadingComprehensionCatalogQuestion(question));
      const matchesSkill = bankSkillFilter === "all" || question.skill === bankSkillFilter;
      const matchesDifficulty = ignoreDifficulty || bankDifficultyFilter === "all" || String(question.difficulty || "") === String(bankDifficultyFilter);
      const matchesType = ignoreType || bankTypeFilter === "all" || normalizeQuestionType(question.type) === bankTypeFilter;
      const matchesUsage = !usedSourceIds || !usedSourceIds.has(getBankQuestionSourceGroupId(question));
      return matchesSearch && matchesClass && matchesSubject && matchesSkill && matchesDifficulty && matchesType && matchesUsage;
    })
    .sort(bankQuestionUiSort);
  bankFilteredCache = { bank, exams: state.exams, key: cacheKey, questions };
  return questions;
}

function getQuestionMixRequest() {
  const target = Math.max(1, Number.parseInt($("#mixTotal")?.value, 10) || 50);
  const requested = {
    multiple: 0,
    fill_blank: Math.max(0, Number.parseInt($("#mixFillBlank")?.value, 10) || 0),
    dropdown: Math.max(0, Number.parseInt($("#mixDropdown")?.value, 10) || 0),
    drag_drop: Math.max(0, Number.parseInt($("#mixDragDrop")?.value, 10) || 0),
    table_grid: Math.max(0, Number.parseInt($("#mixTableGrid")?.value, 10) || 0),
    numeric: Math.max(0, Number.parseInt($("#mixNumeric")?.value, 10) || 0),
    equation: Math.max(0, Number.parseInt($("#mixEquation")?.value, 10) || 0),
    hot_text: Math.max(0, Number.parseInt($("#mixHotText")?.value, 10) || 0),
    hotspot: Math.max(0, Number.parseInt($("#mixHotspot")?.value, 10) || 0),
  };
  const optionalTotal = Object.values(requested).reduce((sum, count) => sum + count, 0);
  requested.multiple = Math.max(0, target - optionalTotal);
  const multipleInput = $("#mixMultiple");
  if (multipleInput) multipleInput.value = String(requested.multiple);
  const exactReadingValue = String($("#mixReadingCount")?.value ?? "").trim();
  const hasReadingRange = Boolean($("#mixReadingMinPercent") && $("#mixReadingMaxPercent"));
  const readingMode = hasReadingRange && exactReadingValue === "" ? "range" : "exact";
  const readingMinPercent = hasReadingRange
    ? Math.max(0, Math.min(100, Number.parseFloat($("#mixReadingMinPercent")?.value) || 0))
    : Math.max(0, Math.min(100, Number.parseFloat($("#mixReadingPercent")?.value) || 0));
  const readingMaxPercent = hasReadingRange
    ? Math.max(0, Math.min(100, Number.parseFloat($("#mixReadingMaxPercent")?.value) || 0))
    : readingMinPercent;
  const exactReadingTarget = Math.max(0, Number.parseInt(exactReadingValue, 10) || 0);
  const readingMinTarget = readingMode === "exact" ? exactReadingTarget : Math.ceil((target * readingMinPercent) / 100);
  const readingMaxTarget = readingMode === "exact" ? exactReadingTarget : Math.floor((target * readingMaxPercent) / 100);
  const readingTarget = readingMode === "exact" ? exactReadingTarget : readingMaxTarget;
  const difficultyLevels = [1, 2, 3, 4].filter((level) => $("#mixDifficulty" + level)?.checked);
  const reusePolicyInput = $("#bankExamReusePolicy")?.value;
  const reusePolicy = reusePolicyInput
    ? normalizeQuestionReusePolicy(reusePolicyInput)
    : $("#mixAvoidUsed")?.checked !== false
      ? "never_used"
      : "allow_previous";
  const program = String($("#bankExamProgram")?.value || "").trim();
  const avoidUsed = reusePolicy === "never_used";
  const targetStudentId = $("#mixTargetStudentId")?.value || "";
  const readingPercent = target ? Math.round((readingTarget / target) * 100) : 0;
  const examType = $("#bankExamType")?.value || (bankSubjectFilter === "Math" ? "math" : bankSubjectFilter === "English / Reading" || bankSubjectFilter === "Reading Comprehension" ? "english" : "");
  const subject = examType === "math" ? "Math" : examType === "english" ? "English / Reading" : "";
  return { target, requested, optionalTotal, readingMode, readingTarget, readingMinTarget, readingMaxTarget, readingMinPercent, readingMaxPercent, readingPercent, difficultyLevels, avoidUsed, reusePolicy, program, targetStudentId, examType, subject };
}

function updateFlexibleMixTotals() {
  getQuestionMixRequest();
}

function syncReadingCountFromPercent(totalId, percentId, countId, allowBlank = false) {
  const total = Math.max(1, Number.parseInt($(totalId)?.value, 10) || 1);
  const percentInput = $(percentId);
  const countInput = $(countId);
  if (!percentInput || !countInput) return;
  if (allowBlank && String(percentInput.value || "").trim() === "") {
    countInput.value = "";
    return;
  }
  const percent = Math.max(0, Math.min(100, Number.parseFloat(percentInput.value) || 0));
  percentInput.value = String(percent);
  countInput.value = String(Math.round((total * percent) / 100));
}

function syncReadingPercentFromCount(totalId, percentId, countId, allowBlank = false) {
  const total = Math.max(1, Number.parseInt($(totalId)?.value, 10) || 1);
  const percentInput = $(percentId);
  const countInput = $(countId);
  if (!percentInput || !countInput) return;
  if (allowBlank && String(countInput.value || "").trim() === "") {
    percentInput.value = "";
    return;
  }
  const count = Math.max(0, Math.min(total, Number.parseInt(countInput.value, 10) || 0));
  countInput.value = String(count);
  percentInput.value = String(Math.round((count / total) * 100));
}

function updateFlexibleMixTotal() {
  if (!$("#mixReadingMinPercent")) syncReadingCountFromPercent("#mixTotal", "#mixReadingPercent", "#mixReadingCount");
  const selected = $("#mixReadingSelected");
  if (selected) selected.value = "Auto";
  if ($("#mixNonReadingSelected")) $("#mixNonReadingSelected").value = "Auto";
  updateFlexibleMixTotals();
}

function updateFlexibleReadingFromPercent() {
  syncReadingCountFromPercent("#mixTotal", "#mixReadingPercent", "#mixReadingCount");
}

function updateFlexibleReadingPercentFromCount() {
  syncReadingPercentFromCount("#mixTotal", "#mixReadingPercent", "#mixReadingCount", true);
  const selected = $("#mixReadingSelected");
  if (selected) selected.value = String($("#mixReadingCount")?.value || "Auto");
}

function clearFlexibleExactReadingCount() {
  const exact = $("#mixReadingCount");
  const selected = $("#mixReadingSelected");
  if (exact) exact.value = "";
  if (selected) selected.value = "Auto";
  if ($("#mixNonReadingSelected")) $("#mixNonReadingSelected").value = "Auto";
}

function buildQuestionMixDraft() {
  const { target, requested, optionalTotal, readingMode, readingTarget, readingMinTarget, readingMaxTarget, readingMinPercent, readingMaxPercent, readingPercent, difficultyLevels, avoidUsed, reusePolicy, program, targetStudentId, examType, subject } = getQuestionMixRequest();
  const typeKeys = QUESTION_TYPE_OPTIONS.map(([type]) => type);
  const configurationErrors = [];
  if (optionalTotal > target) configurationErrors.push(`Optional format counts total ${optionalTotal}, which is greater than the ${target}-question exam.`);
  if (!difficultyLevels.length) configurationErrors.push("Check at least one difficulty level.");
  if (!subject) configurationErrors.push("Choose English / Reading or Math before generating the exam.");
  if (readingMinPercent > readingMaxPercent) configurationErrors.push("Reading minimum percentage cannot be larger than the maximum percentage.");
  if (readingMaxTarget > target) configurationErrors.push("Reading comprehension count cannot be larger than the total question count.");
  if (reusePolicy === "different_program" && !program) configurationErrors.push("Enter a Program / Course name when using the program-specific reuse policy.");
  if (configurationErrors.length) {
    return { target, requested, selected: [], shortfalls: [], configurationErrors, difficultyLevels, readingMode, readingTarget, readingMinTarget, readingMaxTarget, readingMinPercent, readingMaxPercent, readingPercent, readingCount: 0, difficultyCounts: {}, passageSetCount: 0, poolCount: 0, avoidUsed, reusePolicy, program, targetStudentId, examType, subject, complete: false };
  }

  const allowedLevels = new Set(difficultyLevels);
  const blockedByReusePolicy = getReusePolicyBlockedSourceIds(reusePolicy, program);
  const studentSeenSourceIds = targetStudentId ? getStudentSeenBankSourceIds(targetStudentId) : new Set();
  const allQuestions = state.questionBank || [];
  const anchorPool = getFilteredBankQuestions({ ignoreType: true, ignoreDifficulty: true, ignoreUsage: true })
    .filter((question) => inferBankQuestionSubject(question) === subject);
  const units = new Map();
  anchorPool.forEach((anchor) => {
    const passageKey = getBankPassageUnitKey(anchor);
    const sourceId = getBankQuestionSourceGroupId(anchor);
    const unitId = passageKey || `single::${sourceId || anchor.id}`;
    if (units.has(unitId)) return;
    const related = passageKey
      ? allQuestions.filter((question) => getBankPassageUnitKey(question) === passageKey)
      : allQuestions.filter((question) => getBankQuestionSourceGroupId(question) === sourceId);
    const unitQuestions = selectPreferredBankQuestionVersions(related.length ? related : [anchor]).sort(bankQuestionUiSort);
    const invalid = unitQuestions.some((question) => getBankQuestionReadinessIssues(question).length);
    const wrongSubject = unitQuestions.some((question) => inferBankQuestionSubject(question) !== subject);
    const wrongDifficulty = unitQuestions.some((question) => !allowedLevels.has(Number.parseInt(question.difficulty, 10)));
    const alreadyUsed = unitQuestions.some((question) => {
      const sourceId = getBankQuestionSourceGroupId(question);
      return blockedByReusePolicy.has(sourceId) || studentSeenSourceIds.has(sourceId);
    });
    if (invalid || wrongSubject || wrongDifficulty || alreadyUsed) return;
    const typeCounts = Object.fromEntries(typeKeys.map((type) => [type, 0]));
    let unitReadingCount = 0;
    const levelCounts = [0, 0, 0, 0, 0];
    unitQuestions.forEach((question) => {
      typeCounts[normalizeQuestionType(question.type)] += 1;
      if (isBankReadingComprehensionQuestion(question)) unitReadingCount += 1;
      const level = Number.parseInt(question.difficulty, 10);
      if (level >= 1 && level <= 4) levelCounts[level] += 1;
    });
    units.set(unitId, {
      id: unitId,
      passageKey,
      questions: unitQuestions,
      typeCounts,
      readingCount: unitReadingCount,
      levelCounts,
      quality: unitQuestions.reduce((sum, question) => sum + smartQuestionWeight(question, 2.5), 0),
    });
  });

  // Remove repeated source/content units before planning so the draft can never
  // contain two versions of the same question.
  const seenSources = new Set();
  const seenSignatures = new Set();
  const availableUnits = [...units.values()]
    .sort((left, right) => bankQuestionUiSort(left.questions[0], right.questions[0]))
    .filter((unit) => {
      const unitSources = unit.questions.map(getBankQuestionSourceGroupId);
      const unitSignatures = unit.questions.map(getBankQuestionSignature).filter((signature) => signature.length >= 24);
      if (unitSources.some((source) => seenSources.has(source)) || unitSignatures.some((signature) => seenSignatures.has(signature))) return false;
      unitSources.forEach((source) => seenSources.add(source));
      unitSignatures.forEach((signature) => seenSignatures.add(signature));
      return true;
    })
    .filter((unit) => typeKeys.every((type) => unit.typeCounts[type] <= requested[type]) && unit.readingCount <= readingMaxTarget);

  const emptyCounts = Object.fromEntries(typeKeys.map((type) => [type, 0]));
  const stateKey = (counts, readingCount) => `${typeKeys.map((type) => counts[type]).join(",")}|${readingCount}`;
  const initialState = { counts: emptyCounts, readingCount: 0, unitIndexes: [], levelCounts: [0, 0, 0, 0, 0], quality: 0 };
  let mixStates = new Map([[stateKey(emptyCounts, 0), initialState]]);
  const preferredState = (candidate, current) => {
    if (!current) return candidate;
    const candidateCoverage = difficultyLevels.filter((level) => candidate.levelCounts[level] > 0).length;
    const currentCoverage = difficultyLevels.filter((level) => current.levelCounts[level] > 0).length;
    if (candidateCoverage !== currentCoverage) return candidateCoverage > currentCoverage ? candidate : current;
    const candidateValues = difficultyLevels.map((level) => candidate.levelCounts[level]);
    const currentValues = difficultyLevels.map((level) => current.levelCounts[level]);
    const candidateSpread = Math.max(...candidateValues) - Math.min(...candidateValues);
    const currentSpread = Math.max(...currentValues) - Math.min(...currentValues);
    if (candidateSpread !== currentSpread) return candidateSpread < currentSpread ? candidate : current;
    return candidate.quality > current.quality ? candidate : current;
  };

  availableUnits.forEach((unit, unitIndex) => {
    const nextStates = new Map(mixStates);
    mixStates.forEach((mixState) => {
      const nextCounts = { ...mixState.counts };
      let fits = true;
      typeKeys.forEach((type) => {
        nextCounts[type] += unit.typeCounts[type];
        if (nextCounts[type] > requested[type]) fits = false;
      });
      const nextReadingCount = mixState.readingCount + unit.readingCount;
      if (!fits || nextReadingCount > readingMaxTarget) return;
      const nextState = {
        counts: nextCounts,
        readingCount: nextReadingCount,
        unitIndexes: [...mixState.unitIndexes, unitIndex],
        levelCounts: mixState.levelCounts.map((count, level) => count + unit.levelCounts[level]),
        quality: mixState.quality + unit.quality,
      };
      const key = stateKey(nextCounts, nextReadingCount);
      nextStates.set(key, preferredState(nextState, nextStates.get(key)));
    });
    if (nextStates.size > 20000) {
      const ranked = [...nextStates.entries()]
        .sort(([, left], [, right]) => {
          const leftTotal = Object.values(left.counts).reduce((sum, count) => sum + count, 0);
          const rightTotal = Object.values(right.counts).reduce((sum, count) => sum + count, 0);
          return rightTotal - leftTotal || Math.abs(readingTarget - left.readingCount) - Math.abs(readingTarget - right.readingCount) || right.quality - left.quality;
        })
        .slice(0, 20000);
      mixStates = new Map(ranked);
    } else {
      mixStates = nextStates;
    }
  });

  const hasRequestedTypeCounts = (mixState) => typeKeys.every((type) => mixState.counts[type] === requested[type]);
  const isReadingInRange = (count) => count >= readingMinTarget && count <= readingMaxTarget;
  const distanceFromReadingRange = (count) => count < readingMinTarget ? readingMinTarget - count : count > readingMaxTarget ? count - readingMaxTarget : 0;
  const completeStates = [...mixStates.values()]
    .filter((mixState) => hasRequestedTypeCounts(mixState) && isReadingInRange(mixState.readingCount))
    .sort((left, right) => Math.abs(readingTarget - left.readingCount) - Math.abs(readingTarget - right.readingCount) || right.quality - left.quality);
  const complete = completeStates.length > 0;
  let chosenState = completeStates[0];
  if (!chosenState) {
    chosenState = [...mixStates.values()].sort((left, right) => {
      const leftTotal = Object.values(left.counts).reduce((sum, count) => sum + count, 0);
      const rightTotal = Object.values(right.counts).reduce((sum, count) => sum + count, 0);
      return rightTotal - leftTotal || distanceFromReadingRange(left.readingCount) - distanceFromReadingRange(right.readingCount) || Math.abs(readingTarget - left.readingCount) - Math.abs(readingTarget - right.readingCount) || right.quality - left.quality;
    })[0] || initialState;
  }
  const selectedUnits = chosenState.unitIndexes.map((index) => availableUnits[index]);
  const selected = selectedUnits.flatMap((unit) => unit.questions).sort(bankQuestionUiSort);
  const shortfalls = [];
  typeKeys.forEach((type) => {
    const missing = requested[type] - chosenState.counts[type];
    if (missing > 0) shortfalls.push({ type: questionTypeLabel(type), missing, message: `Missing ${missing} ready ${questionTypeLabel(type).toLowerCase()} question${missing === 1 ? "" : "s"} in the selected levels and current filter.` });
  });
  if (!isReadingInRange(chosenState.readingCount)) {
    const readingRequest = readingMode === "range" ? `${readingMinTarget}-${readingMaxTarget}` : String(readingTarget);
    shortfalls.push({ type: "Reading comprehension", missing: distanceFromReadingRange(chosenState.readingCount), message: `The available complete passage sets produced ${chosenState.readingCount} reading questions; the requested ${readingMode === "range" ? "range is" : "exact count is"} ${readingRequest}.` });
  }
  return {
    target,
    requested,
    selected,
    shortfalls,
    configurationErrors,
    difficultyLevels,
    difficultyCounts: Object.fromEntries([1, 2, 3, 4].map((level) => [level, chosenState.levelCounts[level] || 0])),
    readingMode,
    readingTarget: complete ? chosenState.readingCount : readingTarget,
    readingPreferredTarget: readingTarget,
    readingMinTarget,
    readingMaxTarget,
    readingMinPercent,
    readingMaxPercent,
    readingPercent,
    readingCount: chosenState.readingCount,
    passageSetCount: selectedUnits.filter((unit) => unit.passageKey).length,
    poolCount: availableUnits.reduce((sum, unit) => sum + unit.questions.length, 0),
    avoidUsed,
    reusePolicy,
    program,
    targetStudentId,
    examType,
    subject,
    studentSeenCount: studentSeenSourceIds.size,
    complete,
  };
}

function renderQuestionMixDraft(plan) {
  if (!plan) return `<div class="notice compact">Set the counts, then select <strong>Auto-Pick Question Mix</strong>. No questions are changed until you create the exam.</div>`;
  const counts = Object.fromEntries(QUESTION_TYPE_OPTIONS.map(([type]) => [type, plan.selected.filter((question) => normalizeQuestionType(question.type) === type).length]));
  const requestedOptionalTypes = QUESTION_TYPE_OPTIONS.filter(([type]) => type !== "multiple" && (plan.requested[type] || 0) > 0);
  const readingWithinRequest = plan.readingCount >= (plan.readingMinTarget ?? plan.readingTarget) && plan.readingCount <= (plan.readingMaxTarget ?? plan.readingTarget);
  const readingLabel = plan.readingMode === "range"
    ? `Reading: ${plan.readingCount} selected (${plan.readingMinTarget}-${plan.readingMaxTarget} allowed · ${plan.target ? Math.round((plan.readingCount / plan.target) * 100) : 0}%)`
    : `Reading: ${plan.readingCount}/${plan.readingTarget}`;
  return `
    <div class="mix-draft-summary">
      ${plan.configurationErrors?.length ? `<div class="notice bad">${plan.configurationErrors.map(escapeHtml).join(" ")}</div>` : ""}
      <div class="selection-pills">
        <span class="pill ${plan.complete ? "ok" : "warn"}">${plan.selected.length} of ${plan.target} selected</span>
        <span class="pill ${readingWithinRequest ? "ok" : "warn"}">${escapeHtml(readingLabel)}</span>
        ${plan.subject ? `<span class="pill ok">Subject: ${escapeHtml(plan.subject)}</span>` : ""}
        ${plan.subject === "English / Reading" ? `<span class="pill">Language / editing: ${Math.max(0, plan.selected.length - plan.readingCount)}</span>` : ""}
        <span class="pill">Multiple choice: ${counts.multiple || 0}/${plan.requested.multiple || 0}</span>
        ${requestedOptionalTypes.length ? requestedOptionalTypes.map(([type, label]) => `<span class="pill ${(counts[type] || 0) === plan.requested[type] ? "ok" : "warn"}">${escapeHtml(label)}: ${counts[type] || 0}/${plan.requested[type]}</span>`).join("") : `<span class="pill ok">No optional formats</span>`}
        ${plan.difficultyLevels?.map((level) => `<span class="pill">Level ${level}: ${plan.difficultyCounts?.[level] || 0}</span>`).join("") || ""}
        <span class="pill ${plan.reusePolicy === "allow_previous" ? "warn" : "ok"}">${escapeHtml(questionReusePolicyLabel(plan.reusePolicy || (plan.avoidUsed ? "never_used" : "allow_previous")))}</span>
        ${plan.program ? `<span class="pill">Program: ${escapeHtml(plan.program)}</span>` : ""}
        ${plan.targetStudentId ? `<span class="pill ok">${escapeHtml(getStudentLabel(plan.targetStudentId))}: previous questions blocked</span>` : ""}
        ${plan.passageSetCount ? `<span class="pill ok">${plan.passageSetCount} complete passage set${plan.passageSetCount === 1 ? "" : "s"}</span>` : ""}
      </div>
      ${plan.shortfalls?.length ? `<div class="notice bad">${plan.shortfalls.map((item) => escapeHtml(item.message)).join(" ")}</div>` : plan.complete ? `<div class="notice ok">A valid mix is ready with ${plan.readingCount} reading-comprehension question${plan.readingCount === 1 ? "" : "s"}. Review or check the draft before creating the exam.</div>` : ""}
    </div>
  `;
}

function getBankIdHealth(questions) {
  const counts = new Map();
  const missing = [];
  questions.forEach((question) => {
    const id = String(question.sourceQuestionId || "").trim();
    if (!id) {
      missing.push(question);
      return;
    }
    counts.set(id, (counts.get(id) || 0) + 1);
  });
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
  return {
    missing,
    duplicates,
    firstId: questions[0]?.sourceQuestionId || "",
    lastId: questions[questions.length - 1]?.sourceQuestionId || "",
  };
}

function renderBankIdHealth(health, count) {
  if (!count) return `<div class="notice">No filtered questions to check.</div>`;
  const problemCount = health.missing.length + health.duplicates.length;
  return `
    <div class="csv-health">
      <span class="pill ${problemCount ? "warn" : "ok"}">${problemCount ? "Needs review" : "IDs OK"}</span>
      <span class="pill ${health.missing.length ? "bad" : "ok"}">Missing: ${health.missing.length}</span>
      <span class="pill ${health.duplicates.length ? "bad" : "ok"}">Duplicate groups: ${health.duplicates.length}</span>
    </div>
    ${health.firstId || health.lastId ? `<p class="hint"><strong>Current filter:</strong> ${escapeHtml(health.firstId || "No first ID")} to ${escapeHtml(health.lastId || "No last ID")}</p>` : ""}
    ${
      health.duplicates.length
        ? `<div class="notice bad">Duplicate IDs: ${escapeHtml(health.duplicates.slice(0, 6).map(([id]) => id).join(", "))}${health.duplicates.length > 6 ? "..." : ""}</div>`
        : ""
    }
  `;
}

function normalizeQuestionSignature(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\b(question|answer|choice|choices|which|following|select|best)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getBankQuestionSignature(question) {
  return normalizeQuestionSignature(`${question.passageTitle || ""} ${question.passageText || ""} ${question.questionText || ""}`);
}

function getBankQuestionFingerprint(question) {
  const words = getBankQuestionSignature(question)
    .split(" ")
    .filter((word) => word.length > 3);
  return [...new Set(words)].sort().slice(0, 26).join(" ");
}

function groupBankDuplicates(questions, signatureFn, minLength = 24) {
  const groups = new Map();
  questions.forEach((question) => {
    const signature = signatureFn(question);
    if (signature.length < minLength) return;
    groups.set(signature, [...(groups.get(signature) || []), question]);
  });
  return [...groups.values()].filter((group) => group.length > 1);
}

function getBankDuplicateScan(questions) {
  const idCounts = new Map();
  questions.forEach((question) => {
    const id = String(question.sourceQuestionId || "").trim().toLowerCase();
    if (id) idCounts.set(id, [...(idCounts.get(id) || []), question]);
  });
  const duplicateIds = [...idCounts.values()].filter((group) => group.length > 1);
  const exactText = groupBankDuplicates(questions, getBankQuestionSignature, 32);
  const similarText = groupBankDuplicates(questions, getBankQuestionFingerprint, 18).filter((group) => {
    const exactKeys = new Set(group.map(getBankQuestionSignature));
    return exactKeys.size > 1;
  });
  return { duplicateIds, exactText, similarText };
}

function rankDuplicateGroup(group) {
  return [...group].sort((left, right) => {
    const quality = smartQuestionWeight(right, Number(right.difficulty) || 2) - smartQuestionWeight(left, Number(left.difficulty) || 2);
    if (quality) return quality;
    const leftUpdated = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightUpdated = new Date(right.updatedAt || right.createdAt || 0).getTime();
    if (rightUpdated !== leftUpdated) return rightUpdated - leftUpdated;
    return Number(left.bankNumber || 999999) - Number(right.bankNumber || 999999);
  });
}

function getDuplicateExtraIds(group) {
  return rankDuplicateGroup(group).slice(1).map((question) => question.id);
}

function getAllExactTextDuplicateExtraIds(questions = getFilteredBankQuestions()) {
  if (Array.isArray(questions) && bankDuplicateExtraCache.has(questions)) return bankDuplicateExtraCache.get(questions);
  const scan = getBankDuplicateScan(questions);
  const duplicateIds = [...new Set(scan.exactText.flatMap(getDuplicateExtraIds))];
  if (Array.isArray(questions)) bankDuplicateExtraCache.set(questions, duplicateIds);
  return duplicateIds;
}

function renderDuplicateGroup(group, label) {
  const rankedGroup = rankDuplicateGroup(group);
  const sample = rankedGroup[0];
  const keepQuestion = rankedGroup[0];
  const duplicateIds = rankedGroup.map((question) => question.id);
  const extraIds = getDuplicateExtraIds(group);
  const extraIdsJs = extraIds.map((id) => `'${escapeJs(id)}'`).join(",");
  return `
    <div class="duplicate-group">
      <div class="duplicate-group-head">
        <div>
          <strong>${escapeHtml(label)}</strong>
          <span class="subtle">Keep: ${escapeHtml(keepQuestion.sourceQuestionId || keepQuestion.id)}</span>
        </div>
        ${
          extraIds.length
            ? `<button class="danger-light small" onclick="deleteDuplicateBankQuestions([${extraIdsJs}], '${escapeJs(label)}')" type="button">Delete Extras</button>`
            : ""
        }
      </div>
      <p>${escapeHtml(sample.questionText || sample.passageTitle || sample.sourceQuestionId || "No question text").slice(0, 180)}</p>
      <div class="selection-pills">
        ${rankedGroup
          .slice(0, 8)
          .map(
            (question, index) => `
              <span class="duplicate-pill ${index === 0 ? "keep" : ""}">
                <button class="pill-button" onclick="selectBankQuestion('${question.id}')" type="button">${index === 0 ? "Keep " : ""}${escapeHtml(question.sourceQuestionId || question.id)} · ${escapeHtml(getBankQuestionClass(question))}</button>
                ${
                  index > 0
                    ? `<button class="mini-delete" onclick="deleteDuplicateBankQuestions(['${escapeJs(question.id)}'], '${escapeJs(label)}')" type="button" title="Delete this duplicate">Delete</button>`
                    : ""
                }
              </span>
            `
          )
          .join("")}
      </div>
      ${group.length > 8 ? `<p class="hint">Showing first 8 of ${duplicateIds.length} duplicate questions. Use the filter to narrow before deleting a larger group.</p>` : ""}
    </div>
  `;
}

function renderBankDuplicateDetector(questions) {
  if (!state.questionBank?.length) return "";
  const scan = getBankDuplicateScan(questions);
  const issueCount = scan.duplicateIds.length + scan.exactText.length + scan.similarText.length;
  const exactDeleteCount = getAllExactTextDuplicateExtraIds(questions).length;
  const previewGroups = [
    ...scan.duplicateIds.map((group) => ({ group, label: "Same system ID" })),
    ...scan.exactText.map((group) => ({ group, label: "Same question text" })),
    ...scan.similarText.map((group) => ({ group, label: "Very similar wording" })),
  ].slice(0, 6);
  return `
    <section class="card stack bank-ai-card">
      <div class="section-head">
        <div>
          <h3>Duplicate Detector</h3>
          <p class="subtle">Checks the current filter for repeated IDs, exact repeats, and very similar question wording.</p>
        </div>
        <div class="row-actions">
          ${
            exactDeleteCount
              ? `<button class="danger-light" onclick="deleteAllExactTextDuplicateBankQuestions()" type="button">Delete All Same-Text Extras (${exactDeleteCount})</button>`
              : ""
          }
          <span class="pill ${issueCount ? "warn" : "ok"}">${issueCount ? `${issueCount} groups` : "Clean"}</span>
        </div>
      </div>
      <div class="ai-kpi-grid">
        <div class="stat"><span class="subtle">Same ID</span><strong>${scan.duplicateIds.length}</strong></div>
        <div class="stat"><span class="subtle">Exact Text</span><strong>${scan.exactText.length}</strong></div>
        <div class="stat"><span class="subtle">Similar Text</span><strong>${scan.similarText.length}</strong></div>
      </div>
      ${
        previewGroups.length
          ? `<div class="duplicate-list">${previewGroups.map(({ group, label }) => renderDuplicateGroup(group, label)).join("")}</div>`
          : `<div class="notice ok">No repeated questions found in this filter.</div>`
      }
      <p class="hint">Use the bank tabs and filters first if you only want to scan one source exam, subject, skill, or difficulty level.</p>
    </section>
  `;
}

function getUsedBankSourceIds() {
  const used = new Set();
  (state.exams || []).forEach((exam) => {
    (exam.questions || []).forEach((question) => {
      const id = getBankQuestionSourceGroupId(question);
      if (id) used.add(id);
    });
  });
  return used;
}

function normalizeQuestionReusePolicy(value) {
  return ["never_used", "different_program", "allow_previous"].includes(value) ? value : "never_used";
}

function normalizeProgramKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getExamProgramName(exam) {
  return String(exam?.program || "").trim();
}

function getProgramUsedBankSourceIds(program) {
  const programKey = normalizeProgramKey(program);
  if (!programKey) return new Set();
  const used = new Set();
  (state.exams || []).forEach((exam) => {
    if (normalizeProgramKey(getExamProgramName(exam)) !== programKey) return;
    (exam.questions || []).forEach((question) => {
      const id = getBankQuestionSourceGroupId(question);
      if (id) used.add(id);
    });
  });
  return used;
}

function getReusePolicyBlockedSourceIds(reusePolicy, program) {
  const policy = normalizeQuestionReusePolicy(reusePolicy);
  if (policy === "allow_previous") return new Set();
  if (policy === "different_program") return getProgramUsedBankSourceIds(program);
  return getUsedBankSourceIds();
}

function filterQuestionsByReusePolicy(questions, reusePolicy, program) {
  const blocked = getReusePolicyBlockedSourceIds(reusePolicy, program);
  return (questions || []).filter((question) => !blocked.has(getBankQuestionSourceGroupId(question)));
}

function questionReusePolicyLabel(reusePolicy) {
  const policy = normalizeQuestionReusePolicy(reusePolicy);
  if (policy === "different_program") return "New inside this program";
  if (policy === "allow_previous") return "Previous use allowed";
  return "Never used anywhere";
}

function getBankQuestionUsageHistory(question) {
  const sourceId = getBankQuestionSourceGroupId(question);
  if (!sourceId) return [];
  return (state.exams || [])
    .filter((exam) => (exam.questions || []).some((item) => getBankQuestionSourceGroupId(item) === sourceId))
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0));
}

function renderProgramDatalist(id) {
  const programs = [...new Set((state.exams || []).map(getExamProgramName).filter(Boolean))].sort((left, right) => left.localeCompare(right));
  return `<datalist id="${escapeHtml(id)}">${programs.map((program) => `<option value="${escapeHtml(program)}"></option>`).join("")}</datalist>`;
}

function renderReusePolicyOptions(selectedPolicy = "never_used") {
  const selected = normalizeQuestionReusePolicy(selectedPolicy);
  return `
    <option value="never_used" ${selected === "never_used" ? "selected" : ""}>Never used in any exam</option>
    <option value="different_program" ${selected === "different_program" ? "selected" : ""}>Not previously used in this program</option>
    <option value="allow_previous" ${selected === "allow_previous" ? "selected" : ""}>Allow previous use from any program</option>
  `;
}

function getStudentLabel(studentId) {
  const student = (state.students || []).find((item) => item.id === studentId);
  return student ? `${student.name || "Student"}${student.studentNumber ? ` · ${student.studentNumber}` : ""}` : "Selected student";
}

function renderTargetStudentProtectionSelect(id, selectedStudentId = "") {
  const students = [...(state.students || [])].sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  return `
    <div class="field">
      <label for="${escapeHtml(id)}">Student history protection</label>
      <select id="${escapeHtml(id)}">
        <option value="">No specific student selected</option>
        ${students.map((student) => `<option value="${escapeHtml(student.id)}" ${student.id === selectedStudentId ? "selected" : ""}>${escapeHtml(student.name || "Student")} · ${escapeHtml(student.studentNumber || "No student number")}</option>`).join("")}
      </select>
    </div>
  `;
}

function getStudentSeenBankSourceIds(studentId) {
  const student = (state.students || []).find((item) => item.id === studentId);
  if (!student) return new Set();
  const seen = new Set();
  const examIds = new Set();
  [...(state.submissions || []), ...(state.attempts || [])].forEach((record) => {
    if (!studentMatchesRecord(student, record)) return;
    if (record.examId) examIds.add(record.examId);
    (record.questionSourceGroupIds || []).forEach((id) => seen.add(String(id || "").trim().toLowerCase()));
  });
  (student.scoreHistory || []).forEach((record) => {
    if (record.examId) examIds.add(record.examId);
    (record.questionSourceGroupIds || []).forEach((id) => seen.add(String(id || "").trim().toLowerCase()));
  });
  (state.exams || []).forEach((exam) => {
    if (!examIds.has(exam.id)) return;
    (exam.questions || []).forEach((question) => {
      const sourceId = getBankQuestionSourceGroupId(question);
      if (sourceId) seen.add(sourceId);
    });
  });
  seen.delete("");
  return seen;
}

function smartQuestionWeight(question, targetDifficulty) {
  const difficulty = Number(question.difficulty) || 2;
  const answerReady = question.answer ? 6 : 0;
  const textReady = question.questionText || question.imageUrl ? 4 : 0;
  const skillReady = question.skill ? 2 : 0;
  const difficultyFit = 8 - Math.abs(difficulty - targetDifficulty) * 2;
  return answerReady + textReady + skillReady + difficultyFit + (Number(question.bankNumber) ? 1 : 0);
}

function getSmartDifficultySequence(count, mode) {
  const patterns = {
    mix12: [1, 2],
    mix23: [2, 3],
    mix34: [3, 4],
    level1: [1],
    level2: [2],
    level3: [3],
    level4: [4],
    balanced: [1, 2, 3, 4],
  };
  const pattern = patterns[mode] || patterns.balanced;
  return Array.from({ length: count }, (_, index) => pattern[index % pattern.length]);
}

function getSmartDifficultyLevels(mode) {
  const levels = {
    mix12: [1, 2],
    mix23: [2, 3],
    mix34: [3, 4],
    level1: [1],
    level2: [2],
    level3: [3],
    level4: [4],
    balanced: [1, 2, 3, 4],
  };
  return levels[mode] || levels.balanced;
}

function smartDifficultyModeLabel(mode) {
  return {
    mix12: "Mix Levels 1–2",
    mix23: "Mix Levels 2–3",
    mix34: "Mix Levels 3–4",
    level1: "Level 1 only",
    level2: "Level 2 only",
    level3: "Level 3 only",
    level4: "Level 4 only",
    balanced: "Balanced Levels 1–4",
  }[mode] || "Balanced Levels 1–4";
}

function uniqueSortedBankValues(questions, valueFn) {
  return [...new Set((questions || []).map(valueFn).map((value) => String(value || "").trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );
}

function renderOptionalBankSelect(id, label, values, selected = "", anyLabel = "Any", onChange = "") {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <select id="${escapeHtml(id)}" ${onChange ? `onchange="${escapeHtml(onChange)}"` : ""}>
        <option value="" ${!selected ? "selected" : ""}>${escapeHtml(anyLabel)}</option>
        ${values.map((value) => `<option value="${escapeHtml(value)}" ${String(selected) === String(value) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("")}
      </select>
    </div>
  `;
}

function getSmartBankGeneratorOptions() {
  return {
    subject: $("#aiExamSubject")?.value || "",
    sourceTab: $("#aiExamSourceTab")?.value || "",
    skill: $("#aiExamSkill")?.value || "",
    section: $("#aiExamSection")?.value || "",
  };
}

function questionMatchesSmartBankOptions(question, options) {
  if (options.subject && inferBankQuestionSubject(question) !== options.subject) return false;
  if (options.sourceTab && getBankQuestionClass(question) !== options.sourceTab && String(question.testClass || "") !== options.sourceTab) return false;
  if (options.skill && String(question.skill || "") !== options.skill) return false;
  if (options.section && String(question.section || "") !== options.section) return false;
  return true;
}

function getBankPassageUnitKey(question) {
  const group = String(question?.groupId || question?.passageTitle || "").trim().toLowerCase();
  if (!group) return "";
  const scope = String(getBankQuestionClass(question) || inferBankQuestionSubject(question) || "bank").trim().toLowerCase();
  const material = normalizeQuestionSignature(`${question?.passageTitle || ""} ${question?.passageText || ""} ${question?.sharedImageUrl || ""}`);
  let materialHash = 2166136261;
  for (let index = 0; index < material.length; index += 1) {
    materialHash ^= material.charCodeAt(index);
    materialHash = Math.imul(materialHash, 16777619);
  }
  return `${scope}::${group}::${material ? (materialHash >>> 0).toString(16) : "missing"}`;
}

function hasBankPassageMaterial(question) {
  return Boolean(String(question?.passageTitle || question?.passageText || question?.sharedImageUrl || "").trim());
}

function looksLikeBankReadingPassageQuestion(question) {
  if (inferBankQuestionSubject(question) === "Math") return false;
  const context = `${question?.section || ""} ${question?.skill || ""} ${question?.questionText || ""}`.toLowerCase();
  return /reading|passage|article|excerpt|poem|story|author|paragraph|central idea|main idea|inferen|evidence|according to|the text/.test(context);
}

function isBankReadingComprehensionQuestion(question) {
  if (inferBankQuestionSubject(question) === "Math") return false;
  const context = `${question?.section || ""} ${question?.skill || ""}`.toLowerCase();
  if (/grammar|usage|editing|writing|punctuation|sentence correction/.test(context)) return false;
  return hasBankPassageMaterial(question) && (looksLikeBankReadingPassageQuestion(question) || /comprehension|literary|informational/.test(context));
}

function isBankReadingComprehensionCatalogQuestion(question) {
  if (inferBankQuestionSubject(question) === "Math") return false;
  const context = `${question?.section || ""} ${question?.skill || ""}`.toLowerCase();
  if (/grammar|usage|editing|writing|punctuation|sentence correction/.test(context)) return false;
  return (
    isBankReadingComprehensionQuestion(question) ||
    Boolean(String(question?.groupId || question?.passageTitle || question?.passageText || question?.sharedImageUrl || "").trim()) ||
    /reading|comprehension|passage|literary|informational|main idea|central idea|inferen|author|text evidence/.test(context)
  );
}

function selectPreferredBankQuestionVersions(questions) {
  const seenSources = new Set();
  const seenContent = new Set();
  return [...(questions || [])]
    .sort((left, right) => {
      const leftGenerated = left.aiGenerated || left.aiSourceQuestionId ? 1 : 0;
      const rightGenerated = right.aiGenerated || right.aiSourceQuestionId ? 1 : 0;
      const leftMissingPassage = String(left.groupId || "").trim() && !hasBankPassageMaterial(left) ? 1 : 0;
      const rightMissingPassage = String(right.groupId || "").trim() && !hasBankPassageMaterial(right) ? 1 : 0;
      return leftMissingPassage - rightMissingPassage || leftGenerated - rightGenerated || bankQuestionUiSort(left, right);
    })
    .filter((question) => {
      const sourceId = getBankQuestionSourceGroupId(question);
      const contentSignature = getBankQuestionSignature(question);
      if (seenSources.has(sourceId) || (contentSignature.length >= 24 && seenContent.has(contentSignature))) return false;
      seenSources.add(sourceId);
      if (contentSignature.length >= 24) seenContent.add(contentSignature);
      return true;
    });
}

function buildSmartBankExamDraft() {
  const requestedCount = Math.max(1, Number.parseInt($("#aiExamQuestionCount")?.value, 10) || 30);
  const difficultyInputValues = [1, 2, 3, 4].map((level) => String($(`#aiExamDifficulty${level}`)?.value || "").trim());
  const hasExactDifficultyMix = difficultyInputValues.some((value) => value !== "");
  const difficultyTargets = Object.fromEntries(
    difficultyInputValues.map((value, index) => [index + 1, value === "" ? 0 : Math.max(0, Number.parseInt(value, 10) || 0)])
  );
  const exactDifficultyTotal = Object.values(difficultyTargets).reduce((sum, count) => sum + count, 0);
  const targetCount = hasExactDifficultyMix ? exactDifficultyTotal : requestedCount;
  const readingInput = String($("#aiExamReadingCount")?.value || "").trim();
  const readingTarget = readingInput === "" ? null : Math.max(0, Number.parseInt(readingInput, 10) || 0);
  const mode = $("#aiExamDifficultyMode")?.value || "balanced";
  const allowedDifficultyLevels = new Set(getSmartDifficultyLevels(mode));
  const maxPerSkill = Math.max(1, Number.parseInt($("#aiExamMaxPerSkill")?.value, 10) || 8);
  const maxPerGroup = Math.max(1, Number.parseInt($("#aiExamMaxPerGroup")?.value, 10) || 6);
  const reusePolicyInput = $("#aiExamReusePolicy")?.value;
  const reusePolicy = reusePolicyInput
    ? normalizeQuestionReusePolicy(reusePolicyInput)
    : $("#aiExamAvoidUsed")?.checked !== false
      ? "never_used"
      : "allow_previous";
  const program = String($("#aiExamProgram")?.value || "").trim();
  const examTitle = String($("#aiExamTitle")?.value || "").trim();
  const examCode = String($("#aiExamCode")?.value || "").trim();
  const minutes = Math.max(1, Number.parseInt($("#aiExamMinutes")?.value, 10) || 65);
  const avoidUsed = reusePolicy === "never_used";
  const targetStudentId = $("#aiExamTargetStudentId")?.value || "";
  const options = getSmartBankGeneratorOptions();
  const blockedByReusePolicy = getReusePolicyBlockedSourceIds(reusePolicy, program);
  const studentSeenSourceIds = targetStudentId ? getStudentSeenBankSourceIds(targetStudentId) : new Set();
  const duplicateSignatures = new Set();
  const selectedSourceGroups = new Set();
  const skillCounts = new Map();
  const selected = [];
  const rejected = [];
  const configurationErrors = [];
  if (hasExactDifficultyMix && !exactDifficultyTotal) configurationErrors.push("Enter at least one Level 1–4 question.");
  if (readingTarget !== null && readingTarget > targetCount) configurationErrors.push("Reading comprehension count cannot be larger than the total question count.");
  if (reusePolicy === "different_program" && !program) configurationErrors.push("Enter a Program / Course name when using the program-specific reuse policy.");
  const sequence = hasExactDifficultyMix
    ? [1, 2, 3, 4].flatMap((level) => Array.from({ length: difficultyTargets[level] }, () => level))
    : getSmartDifficultySequence(targetCount, mode);
  if (configurationErrors.length) {
    return { createdAt: new Date().toISOString(), requested: targetCount, selected, rejected, poolCount: 0, passageSetCount: 0, mode, options, avoidUsed, reusePolicy, program, examTitle, examCode, minutes, targetStudentId, hasExactDifficultyMix, difficultyTargets, readingTarget, readingCount: 0, difficultyCounts: {}, configurationErrors, complete: false };
  }
  const allQuestions = state.questionBank || [];
  const anchorPool = getFilteredBankQuestions({ ignoreUsage: true }).filter((question) => questionMatchesSmartBankOptions(question, options));
  const units = new Map();

  anchorPool.forEach((anchor) => {
    const passageKey = getBankPassageUnitKey(anchor);
    const sourceId = getBankQuestionSourceGroupId(anchor);
    const unitId = passageKey || `single::${sourceId || anchor.id}`;
    if (units.has(unitId)) return;
    const related = passageKey
      ? allQuestions.filter((question) => getBankPassageUnitKey(question) === passageKey)
      : allQuestions.filter((question) => getBankQuestionSourceGroupId(question) === sourceId);
    const questions = selectPreferredBankQuestionVersions(related.length ? related : [anchor]);
    const hasWrongSubject = options.subject && questions.some((question) => inferBankQuestionSubject(question) !== options.subject);
    const hasWrongSource = options.sourceTab && questions.some(
      (question) => getBankQuestionClass(question) !== options.sourceTab && String(question.testClass || "") !== options.sourceTab
    );
    const hasInvalidQuestion = questions.some((question) => getBankQuestionReadinessIssues(question).length);
    const hasWrongDifficulty = questions.some((question) => !allowedDifficultyLevels.has(Number.parseInt(question.difficulty, 10)));
    const hasUsedQuestion = questions.some((question) => {
      const sourceId = getBankQuestionSourceGroupId(question);
      return blockedByReusePolicy.has(sourceId) || studentSeenSourceIds.has(sourceId);
    });
    const passageTooLarge = Boolean(passageKey) && questions.length > maxPerGroup;
    if (hasWrongSubject || hasWrongSource || hasInvalidQuestion || hasWrongDifficulty || hasUsedQuestion || passageTooLarge) {
      rejected.push(...questions);
      return;
    }
    units.set(unitId, { id: unitId, passageKey, questions: questions.sort(bankQuestionUiSort) });
  });

  const availableUnits = [...units.values()].sort((left, right) => bankQuestionUiSort(left.questions[0], right.questions[0]));
  const selectedUnitIds = new Set();
  const difficultyCounts = new Map();
  let readingCount = 0;

  const canAddUnit = (unit) => {
    if (!unit || selected.length + unit.questions.length > targetCount) return false;
    const unitSignatures = new Set();
    const skillAdds = new Map();
    const difficultyAdds = new Map();
    let readingAdds = 0;
    for (const question of unit.questions) {
      const signature = getBankQuestionSignature(question);
      const sourceGroupId = getBankQuestionSourceGroupId(question);
      const skillKey = question.skill || question.section || "Unlabeled";
      if (selectedSourceGroups.has(sourceGroupId)) return false;
      if (signature && (duplicateSignatures.has(signature) || unitSignatures.has(signature))) return false;
      unitSignatures.add(signature);
      skillAdds.set(skillKey, (skillAdds.get(skillKey) || 0) + 1);
      const level = Number.parseInt(question.difficulty, 10);
      if (hasExactDifficultyMix && ![1, 2, 3, 4].includes(level)) return false;
      if ([1, 2, 3, 4].includes(level)) difficultyAdds.set(level, (difficultyAdds.get(level) || 0) + 1);
      if (isBankReadingComprehensionQuestion(question)) readingAdds += 1;
    }
    if (hasExactDifficultyMix && [...difficultyAdds].some(([level, count]) => (difficultyCounts.get(level) || 0) + count > difficultyTargets[level])) return false;
    if (readingTarget !== null) {
      const nextReadingCount = readingCount + readingAdds;
      const remainingSlots = targetCount - (selected.length + unit.questions.length);
      if (nextReadingCount > readingTarget || nextReadingCount + remainingSlots < readingTarget) return false;
    }
    if (!unit.passageKey && [...skillAdds].some(([skill, count]) => (skillCounts.get(skill) || 0) + count > maxPerSkill)) return false;
    return true;
  };

  const addUnit = (unit) => {
    selectedUnitIds.add(unit.id);
    unit.questions.forEach((question) => {
      selected.push(question);
      const signature = getBankQuestionSignature(question);
      if (signature) duplicateSignatures.add(signature);
      selectedSourceGroups.add(getBankQuestionSourceGroupId(question));
      const skillKey = question.skill || question.section || "Unlabeled";
      skillCounts.set(skillKey, (skillCounts.get(skillKey) || 0) + 1);
      const level = Number.parseInt(question.difficulty, 10);
      if ([1, 2, 3, 4].includes(level)) difficultyCounts.set(level, (difficultyCounts.get(level) || 0) + 1);
      if (isBankReadingComprehensionQuestion(question)) readingCount += 1;
    });
  };

  sequence.forEach((targetDifficulty) => {
    if (selected.length >= targetCount) return;
    const chosen = availableUnits
      .filter((unit) => !selectedUnitIds.has(unit.id) && canAddUnit(unit))
      .sort((left, right) => {
        const leftScore = left.questions.reduce((sum, question) => sum + smartQuestionWeight(question, targetDifficulty), 0) / left.questions.length;
        const rightScore = right.questions.reduce((sum, question) => sum + smartQuestionWeight(question, targetDifficulty), 0) / right.questions.length;
        return rightScore - leftScore || bankQuestionUiSort(left.questions[0], right.questions[0]);
      })[0];
    if (chosen) addUnit(chosen);
  });

  availableUnits.forEach((unit) => {
    if (selected.length >= targetCount || selectedUnitIds.has(unit.id)) return;
    if (canAddUnit(unit)) addUnit(unit);
  });

  selected.sort(bankQuestionUiSort);

  const exactDifficultyComplete = !hasExactDifficultyMix || [1, 2, 3, 4].every((level) => (difficultyCounts.get(level) || 0) === difficultyTargets[level]);
  const readingComplete = readingTarget === null || readingCount === readingTarget;
  const complete = selected.length === targetCount && exactDifficultyComplete && readingComplete;

  return {
    createdAt: new Date().toISOString(),
    requested: targetCount,
    selected,
    rejected,
    poolCount: availableUnits.reduce((count, unit) => count + unit.questions.length, 0),
    passageSetCount: availableUnits.filter((unit) => unit.passageKey).length,
    mode,
    difficultyModeLabel: smartDifficultyModeLabel(mode),
    options,
    avoidUsed,
    reusePolicy,
    program,
    examTitle,
    examCode,
    minutes,
    targetStudentId,
    studentSeenCount: studentSeenSourceIds.size,
    hasExactDifficultyMix,
    difficultyTargets,
    difficultyCounts: Object.fromEntries([1, 2, 3, 4].map((level) => [level, difficultyCounts.get(level) || 0])),
    readingTarget,
    readingCount,
    configurationErrors,
    complete,
  };
}

function renderSmartExamDraft(plan) {
  if (!plan) return `<div class="notice compact">No draft yet. Set the filters, then generate a draft.</div>`;
  const bySkill = new Map();
  plan.selected.forEach((question) => {
    const skill = question.skill || question.section || "Unlabeled";
    bySkill.set(skill, (bySkill.get(skill) || 0) + 1);
  });
  const byDifficulty = new Map();
  plan.selected.forEach((question) => {
    const difficulty = question.difficulty ? `Level ${question.difficulty}` : "No level";
    byDifficulty.set(difficulty, (byDifficulty.get(difficulty) || 0) + 1);
  });
  return `
    <div class="smart-draft" data-smart-bank-draft>
      ${plan.configurationErrors?.length ? `<div class="notice bad">${plan.configurationErrors.map(escapeHtml).join(" ")}</div>` : ""}
      ${!plan.configurationErrors?.length && !plan.complete ? `<div class="notice warn"><strong>This mix is not available.</strong> No exam will be created from this draft. Adjust the total, reading count, difficulty mix, source filter, or complete-passage limit and generate again.</div>` : ""}
      <div class="csv-health">
        <span class="pill ${plan.complete ? "ok" : "warn"}">${plan.selected.length}/${plan.requested} picked</span>
        <span class="pill">${plan.poolCount} usable in filter</span>
        <span class="pill ok">${escapeHtml(plan.difficultyModeLabel || smartDifficultyModeLabel(plan.mode))}</span>
        ${plan.passageSetCount ? `<span class="pill ok">${plan.passageSetCount} complete passage set${plan.passageSetCount === 1 ? "" : "s"} protected</span>` : ""}
        ${plan.options?.subject ? `<span class="pill">Subject: ${escapeHtml(plan.options.subject)}</span>` : ""}
        ${plan.options?.sourceTab ? `<span class="pill">Source: ${escapeHtml(plan.options.sourceTab)}</span>` : ""}
        ${plan.options?.skill ? `<span class="pill">Skill: ${escapeHtml(plan.options.skill)}</span>` : ""}
        ${plan.targetStudentId ? `<span class="pill ok">${escapeHtml(getStudentLabel(plan.targetStudentId))}: previous questions blocked</span>` : ""}
        ${plan.options?.section ? `<span class="pill">Topic: ${escapeHtml(plan.options.section)}</span>` : ""}
        ${plan.readingTarget !== null ? `<span class="pill ${plan.readingCount === plan.readingTarget ? "ok" : "warn"}">Reading: ${plan.readingCount}/${plan.readingTarget}</span>` : ""}
        <span class="pill ${plan.reusePolicy === "allow_previous" ? "warn" : "ok"}">${escapeHtml(questionReusePolicyLabel(plan.reusePolicy || (plan.avoidUsed ? "never_used" : "allow_previous")))}</span>
        ${plan.program ? `<span class="pill">Program: ${escapeHtml(plan.program)}</span>` : ""}
      </div>
      <div class="selection-pills">
        ${plan.hasExactDifficultyMix ? [1, 2, 3, 4].map((level) => `<span class="pill ${(plan.difficultyCounts?.[level] || 0) === (plan.difficultyTargets?.[level] || 0) ? "ok" : "warn"}">Level ${level}: ${plan.difficultyCounts?.[level] || 0}/${plan.difficultyTargets?.[level] || 0}</span>`).join("") : ""}
        ${[...byDifficulty.entries()].map(([label, count]) => `<span class="pill">${escapeHtml(label)}: ${count}</span>`).join("")}
      </div>
      <div class="selection-pills">
        ${[...bySkill.entries()].slice(0, 10).map(([label, count]) => `<span class="pill">${escapeHtml(label)}: ${count}</span>`).join("")}
      </div>
      <div class="smart-draft-list">
        ${plan.selected
          .slice(0, 12)
          .map(
            (question, index) => `
              <button class="smart-draft-row" onclick="selectBankQuestion('${question.id}')" type="button">
                <strong>${index + 1}. ${escapeHtml(question.sourceQuestionId || question.id)}</strong>
                <span>${escapeHtml(question.skill || question.section || "Unlabeled")} · ${escapeHtml(getBankQuestionClass(question))} · ${question.difficulty ? `Level ${escapeHtml(question.difficulty)}` : "No level"}</span>
              </button>
            `
          )
          .join("")}
      </div>
      ${plan.selected.length > 12 ? `<p class="hint">Showing first 12 of ${plan.selected.length} drafted questions.</p>` : ""}
    </div>
  `;
}

function renderSmartExamGenerator(questions) {
  if (!state.questionBank?.length) return "";
  const baseQuestions = getFilteredBankQuestions();
  const subjects = uniqueSortedBankValues(baseQuestions, inferBankQuestionSubject);
  const sourceTabs = uniqueSortedBankValues(baseQuestions, getBankQuestionClass);
  const skillOptions = uniqueSortedBankValues(baseQuestions, (question) => question.skill);
  const sectionOptions = uniqueSortedBankValues(baseQuestions, (question) => question.section);
  const selectedOptions = bankAiPlan?.options || {};
  const defaultSmartSubject = selectedOptions.subject || (bankSubjectFilter === "Reading Comprehension" || bankSubjectFilter === "English / Reading" ? "English / Reading" : bankSubjectFilter === "Math" ? "Math" : "");
  const smartTarget = bankAiPlan?.requested || Math.min(30, Math.max(1, questions.length || 30));
  const smartIsEla = defaultSmartSubject === "English / Reading";
  const smartReadingCount = bankAiPlan?.readingTarget ?? (smartIsEla ? Math.round(smartTarget * 0.8) : "");
  const smartReadingPercent = smartReadingCount === "" ? "" : smartTarget ? Math.round((smartReadingCount / smartTarget) * 100) : 0;
  const smartTargetStudentId = bankAiPlan?.targetStudentId || "";
  const smartReusePolicy = bankAiPlan?.reusePolicy || "never_used";
  const smartProgram = bankAiPlan?.program || "";
  return `
    <section class="card stack bank-ai-card">
      <div class="section-head">
        <div>
          <h3>Smart Exam Generator</h3>
          <p class="subtle">Smart draft builder: balanced, editable, and repeat-aware before you create the exam.</p>
        </div>
        <span class="pill warn">Teacher Review</span>
      </div>
      <div class="grid two compact-grid reuse-policy-card">
        <div class="field"><label>Exam title</label><input id="aiExamTitle" value="${escapeHtml(bankAiPlan?.examTitle || "")}" placeholder="SHSAT Practice Exam" /></div>
        <div class="field"><label>Test code</label><input id="aiExamCode" value="${escapeHtml(bankAiPlan?.examCode || "")}" placeholder="SHSAT-001" /></div>
        <div class="field"><label>Minutes</label><input id="aiExamMinutes" type="number" min="1" value="${escapeHtml(bankAiPlan?.minutes || 65)}" /></div>
        <div class="field"><label>Program / Course</label><input id="aiExamProgram" list="aiExamProgramOptions" value="${escapeHtml(smartProgram)}" placeholder="Example: Fall SHSAT Grade 8" />${renderProgramDatalist("aiExamProgramOptions")}</div>
        <div class="field"><label>Question reuse policy</label><select id="aiExamReusePolicy">${renderReusePolicyOptions(smartReusePolicy)}</select></div>
      </div>
      <div class="grid two compact-grid">
        ${renderOptionalBankSelect("aiExamSubject", "Subject", subjects, defaultSmartSubject, "Any subject", "updateSmartReadingDefaultForSubject()")}
        ${renderOptionalBankSelect("aiExamSourceTab", "Source Exam / Tab", sourceTabs, selectedOptions.sourceTab, "Any source tab")}
        ${renderOptionalBankSelect("aiExamSkill", "Skill", skillOptions, selectedOptions.skill, "Any skill")}
        ${renderOptionalBankSelect("aiExamSection", "Section / Topic", sectionOptions, selectedOptions.section, "Any topic")}
        <div class="field"><label>Questions needed</label><input id="aiExamQuestionCount" type="number" min="1" value="${smartTarget}" oninput="updateSmartReadingFromPercent()" /></div>
        <div class="field"><label>Reading comprehension % <span class="label-note">ELA default: 80%</span></label><input id="aiExamReadingPercent" type="number" min="0" max="100" value="${smartReadingPercent}" oninput="updateSmartReadingFromPercent()" /></div>
        <div class="field"><label>Reading comprehension <span class="label-note">exact question count</span></label><input id="aiExamReadingCount" type="number" min="0" value="${smartReadingCount}" oninput="updateSmartReadingPercentFromCount()" /></div>
        <div class="field"><label>Max per skill/topic</label><input id="aiExamMaxPerSkill" type="number" min="1" value="8" /></div>
        <div class="field"><label>Largest complete passage allowed</label><input id="aiExamMaxPerGroup" type="number" min="1" value="20" /></div>
      </div>
      <p class="hint">This automatic generator balances levels for you. For your own difficulty-level checkboxes, exact reading count, and answer-format choices, use <strong>Build Exam → Flexible Question Mix</strong>.</p>
      <div class="notice ok compact">Exact repeated questions are always blocked.</div>
      <p class="hint">Program-aware reuse lets you recycle a strong question in a different course without repeating it inside the current program.</p>
      ${renderTargetStudentProtectionSelect("aiExamTargetStudentId", smartTargetStudentId)}
      <p class="hint">When a student is selected, questions from that student's submitted or in-progress exams are always blocked.</p>
      <div class="bank-selection-actions">
        <button class="primary" onclick="generateSmartBankExamDraft()" type="button">Generate Draft (${questions.length} visible)</button>
        <button class="ghost" onclick="useSmartBankDraft()" type="button">Check Draft Questions</button>
        <button class="ghost" onclick="createExamFromSmartBankDraft()" type="button">Create Exam From Draft</button>
      </div>
      ${renderSmartExamDraft(bankAiPlan)}
      <p class="hint">Passage questions are always selected as a complete set and returned to their original source order. A draft may stop below the requested count instead of splitting a passage.</p>
    </section>
  `;
}

function updateSmartReadingDefaultForSubject() {
  const subject = $("#aiExamSubject")?.value || "";
  const percentInput = $("#aiExamReadingPercent");
  if (!percentInput) return;
  percentInput.value = subject === "English / Reading" ? "80" : subject === "Math" ? "0" : "";
  updateSmartReadingFromPercent();
}

function updateSmartReadingFromPercent() {
  syncReadingCountFromPercent("#aiExamQuestionCount", "#aiExamReadingPercent", "#aiExamReadingCount", true);
}

function updateSmartReadingPercentFromCount() {
  syncReadingPercentFromCount("#aiExamQuestionCount", "#aiExamReadingPercent", "#aiExamReadingCount", true);
}

function renderBankQuestionEditor(questions, selectedQuestion) {
  if (!state.questionBank?.length) return `<div class="notice">No bank questions yet. Import a CSV to start building your reusable question bank.</div>`;
  if (!questions.length) return `<div class="notice">No bank questions match this filter.</div>`;
  const editorQuestions = getBankEditorQuestions(questions);
  const pageCount = Math.max(1, Math.ceil(editorQuestions.length / BANK_PAGE_SIZE));
  bankPage = Math.max(0, Math.min(bankPage, pageCount - 1));
  const start = bankPage * BANK_PAGE_SIZE;
  const pageQuestions = editorQuestions.slice(start, start + BANK_PAGE_SIZE);
  return `
    <div id="bankQuestionEditorHost">
    <div class="question-editor-layout bank-editor-layout">
      <aside class="question-nav-list">
        <div class="bank-picker-toolbar">
          <span class="pill"><span data-bank-selection-count>${selectedBankQuestionIds.size}</span> checked</span>
          <button class="ghost small" onclick="selectFilteredBankQuestions()" type="button">Check Current Filter</button>
          <input id="bankSelectLimit" class="small-number-input" type="number" min="1" value="15" aria-label="Number of questions to check" />
          <button class="ghost small" onclick="selectFirstFilteredBankQuestions()" type="button">Check First N</button>
          <button class="ghost small" onclick="clearBankQuestionSelection()" type="button">Clear</button>
          <button class="danger small" onclick="deleteSelectedBankQuestions()" type="button">Delete Checked</button>
        </div>
        <div class="bank-picker-toolbar bank-page-toolbar">
          <span class="pill">Showing ${start + 1}-${Math.min(start + BANK_PAGE_SIZE, questions.length)} of ${questions.length}</span>
          <label class="subtle" for="bankListSort">List order</label>
          <select id="bankListSort" class="compact-select" onchange="setBankListSort(this.value)">
            <option value="newest" ${bankListSort === "newest" ? "selected" : ""}>Newest first</option>
            <option value="source" ${bankListSort === "source" ? "selected" : ""}>Source order</option>
          </select>
          <button class="ghost small" onclick="changeBankPage(-1)" type="button" ${bankPage === 0 ? "disabled" : ""}>Previous</button>
          <span class="subtle">Page ${bankPage + 1} / ${pageCount}</span>
          <button class="ghost small" onclick="changeBankPage(1)" type="button" ${bankPage >= pageCount - 1 ? "disabled" : ""}>Next</button>
        </div>
        ${renderBankSelectionSummary()}
        ${pageQuestions
          .map(
            (question, index) => `
              <div class="question-nav-item bank-nav-item ${selectedQuestion?.id === question.id ? "active" : ""}" data-bank-nav-id="${escapeHtml(question.id)}">
                <label class="question-select" title="Use this question in a custom exam">
                  <input type="checkbox" data-question-id="${escapeHtml(question.id)}" ${selectedBankQuestionIds.has(question.id) ? "checked" : ""} onchange="toggleBankQuestionSelection('${question.id}', this.checked)" />
                </label>
                <button class="question-nav-main" onclick="selectBankQuestion('${question.id}')" type="button">
                  <span class="question-nav-number" title="Permanent question ID">${escapeHtml(question.sourceQuestionId || `Bank ${question.bankNumber || "—"}`)}</span>
                  <span>
                    <strong>${escapeHtml(question.skill || question.section || "Unlabeled")}</strong>
                    <small>${escapeHtml(getBankQuestionClass(question))} · ${escapeHtml(questionTypeLabel(question.type))} · ${escapeHtml(question.sourceQuestionId || "No ID")} · ${escapeHtml(question.section || "Section")} #${escapeHtml(question.originalNumber || question.number || index + 1)} · ${question.difficulty ? `L${escapeHtml(question.difficulty)}` : "No level"} · Answer ${escapeHtml(question.answer || "unset")}</small>
                  </span>
                </button>
                <span class="pill ${question.answer ? "ok" : "bad"}">${question.answer ? "Ready" : "Fix"}</span>
                ${question.aiGenerated ? `<span class="pill warn">AI draft</span>` : ""}
              </div>
            `
          )
          .join("")}
      </aside>
      <div class="question-editor-detail" id="bankQuestionDetail">
        ${selectedQuestion ? renderBankQuestionDetailPanel(selectedQuestion) : `<div class="notice">Select a bank question to edit.</div>`}
      </div>
    </div>
    </div>
  `;
}

function renderBankQuestionDetailPanel(question) {
  const usageHistory = getBankQuestionUsageHistory(question);
  const usagePrograms = [...new Set(usageHistory.map((exam) => getExamProgramName(exam) || "Legacy / Unassigned"))];
  return `
    <section class="question-detail-panel">
      <div class="section-head">
        <div>
          <h3>Bank Question</h3>
          <p class="subtle">Edits here affect future exams, not old submitted reports.</p>
        </div>
        <div class="row">
          <button class="ghost" onclick="saveBankQuestion('${question.id}')" type="button">Save Question</button>
          <button class="danger" onclick="deleteBankQuestion('${question.id}')" type="button">Delete</button>
        </div>
      </div>
      <details class="bank-usage-history">
        <summary>
          <span><strong>Usage history</strong> · ${usageHistory.length} exam${usageHistory.length === 1 ? "" : "s"} · ${usagePrograms.length} program${usagePrograms.length === 1 ? "" : "s"}</span>
          <span class="pill ${usageHistory.length ? "warn" : "ok"}">${usageHistory.length ? "Reusable" : "Never used"}</span>
        </summary>
        <div class="bank-usage-history-body">
          ${
            usageHistory.length
              ? usageHistory.slice(0, 12).map((exam) => `
                <div class="bank-usage-row">
                  <div><strong>${escapeHtml(exam.title || "Untitled Exam")}</strong><span>${escapeHtml(exam.code || "No code")}</span></div>
                  <span>${escapeHtml(getExamProgramName(exam) || "Legacy / Unassigned")}</span>
                  <span>${escapeHtml(exam.createdAt ? new Date(exam.createdAt).toLocaleDateString() : "Unknown date")}</span>
                </div>
              `).join("")
              : `<p class="hint">This question has never been placed in an exam.</p>`
          }
          ${usageHistory.length > 12 ? `<p class="hint">Showing the 12 most recent uses.</p>` : ""}
          <p class="hint">Usage history never prevents reuse by itself. The exam's selected reuse policy decides availability.</p>
        </div>
      </details>
      <div id="bankQuestionPreview-${question.id}" class="question-live-preview">
        ${renderQuestionLivePreview(question)}
      </div>
      <div class="grid two">
        <div class="field">
          <label>Question text</label>
          ${renderBankFormatToolbar(question.id, "questionText")}
          <textarea data-bank-q="${question.id}" data-field="questionText" oninput="updateBankQuestionLivePreview('${question.id}')">${escapeHtml(question.questionText || "")}</textarea>
        </div>
        <div class="stack">
          <div class="grid two compact-grid">
            <div class="field"><label>Test / Class</label><input data-bank-q="${question.id}" data-field="testClass" value="${escapeHtml(question.testClass || getBankQuestionClass(question))}" placeholder="SAT English, SHSAT Math" /></div>
            <div class="field"><label>Subject</label><select data-bank-q="${question.id}" data-field="subject"><option value="">Auto-detect</option><option value="english" ${String(question.subject || "").toLowerCase() === "english" ? "selected" : ""}>English / Reading</option><option value="math" ${String(question.subject || "").toLowerCase() === "math" ? "selected" : ""}>Math</option></select></div>
            <div class="field"><label>Section / Topic</label><input data-bank-q="${question.id}" data-field="section" value="${escapeHtml(question.section || "")}" /></div>
            <div class="field"><label>Original #</label><input data-bank-q="${question.id}" data-field="originalNumber" value="${escapeHtml(question.originalNumber || question.number || "")}" /></div>
            <div class="field"><label>Skill</label><input data-bank-q="${question.id}" data-field="skill" value="${escapeHtml(question.skill || "")}" /></div>
            <div class="field"><label>Difficulty</label><input data-bank-q="${question.id}" data-field="difficulty" type="number" min="1" max="4" value="${escapeHtml(question.difficulty || "")}" /></div>
            <div class="field"><label>Answer type</label><select data-bank-q="${question.id}" data-field="type" onchange="updateBankQuestionLivePreview('${question.id}')">${renderQuestionTypeOptions(question.type)}</select></div>
            <div class="field"><label>Correct answer${["drag_drop", "table_grid"].includes(normalizeQuestionType(question.type)) ? " mapping" : ""}</label><input data-bank-q="${question.id}" data-field="answer" value="${escapeHtml(question.answer || "")}" placeholder="${questionAnswerPlaceholder(question.type)}" /></div>
            <div class="field"><label>${questionChoicesLabel(question.type)}</label><input data-bank-q="${question.id}" data-field="choices" value="${escapeHtml((question.choices || []).join(", "))}" placeholder="${questionChoicesPlaceholder(question.type)}" /></div>
            ${normalizeQuestionType(question.type) === "drag_drop" ? `<div class="field"><label>Drop zones</label><input data-bank-q="${question.id}" data-field="dragTargets" value="${escapeHtml((question.dragTargets || []).join(", "))}" placeholder="Example: Even, Odd" /></div>` : ""}
            ${normalizeQuestionType(question.type) === "table_grid" ? `<div class="field"><label>Claim / evidence rows</label><input data-bank-q="${question.id}" data-field="gridRows" value="${escapeHtml((question.gridRows || []).join(", "))}" placeholder="Separate statements with commas" /></div>` : ""}
            <div class="field"><label>Group / Passage ID</label><input data-bank-q="${question.id}" data-field="groupId" value="${escapeHtml(question.groupId || "")}" /></div>
            <div class="field"><label>Question font</label><select data-bank-q="${question.id}" data-field="questionFont" onchange="updateBankQuestionLivePreview('${question.id}')">${renderQuestionFontOptions(question.questionFont)}</select></div>
          </div>
        </div>
      </div>
      <div class="grid two">
        <div class="field"><label>Passage title</label><input data-bank-q="${question.id}" data-field="passageTitle" value="${escapeHtml(question.passageTitle || "")}" /></div>
        <div class="field"><label>Passage text</label>${renderBankFormatToolbar(question.id, "passageText")}<textarea data-bank-q="${question.id}" data-field="passageText" oninput="updateBankQuestionLivePreview('${question.id}')">${escapeHtml(question.passageText || "")}</textarea></div>
      </div>
      <div class="grid two">
        <div class="field"><label>Question image URL</label><input data-bank-q="${question.id}" data-field="imageUrl" value="${escapeHtml(question.imageUrl || "")}" oninput="updateBankQuestionLivePreview('${question.id}')" /><div class="editor-image-preview">${renderEditorImagePreview(question.imageUrl, "Question image preview")}</div></div>
        <div class="field"><label>Shared passage image URL</label><input data-bank-q="${question.id}" data-field="sharedImageUrl" value="${escapeHtml(question.sharedImageUrl || "")}" oninput="updateBankQuestionLivePreview('${question.id}')" /><div class="editor-image-preview">${renderEditorImagePreview(question.sharedImageUrl, "Shared passage image preview")}</div></div>
      </div>
      <div class="field">
        <label>Answer explanation</label>
        <textarea data-bank-q="${question.id}" data-field="explanation">${escapeHtml(question.explanation || "")}</textarea>
      </div>
      <div class="field">
        <label>System question ID</label>
        <input data-bank-q="${question.id}" data-field="sourceQuestionId" value="${escapeHtml(question.sourceQuestionId || "")}" />
        <p class="hint">Created by the system during import. You can edit it only if you really need to rename a saved question.</p>
      </div>
      <div class="field">
        <label>Question family ID</label>
        <input data-bank-q="${question.id}" data-field="sourceGroupId" value="${escapeHtml(question.sourceGroupId || question.aiSourceQuestionId || question.sourceQuestionId || "")}" />
        <p class="hint">Alternate versions of the same original question must share this ID. Only one version can be used in an exam.</p>
      </div>
    </section>
  `;
}

function renderReportsWorkspace(submission) {
  const subtab = getAdminSubTab("reports");
  return `
    <section class="admin-workspace stack">
      ${renderAdminSubTabs("reports")}
      <div class="panel stack">
      <div class="section-head">
        <div>
          <h2>Student Reports</h2>
          <p class="subtle">Search by student name, filter by exam, then review or print.</p>
        </div>
      </div>
      ${subtab === "print" ? renderReportPrintPanel(submission) : renderResults(submission, subtab)}
      </div>
    </section>
  `;
}

function renderReportPrintPanel(submission) {
  const combinedReports = submission ? getCombinedDiagnosticReports(submission) : [];
  const studentReports = submission ? getStudentDiagnosticReports(submission) : [];
  const availablePrintExams = [...(state.exams || [])].sort((left, right) => String(left.title || "").localeCompare(String(right.title || "")));
  const selectedPrintExamId = availablePrintExams.some((exam) => exam.id === reportExamFilter) ? reportExamFilter : "";
  return `
    <div class="card stack">
      <div class="section-head">
        <div>
          <h3>Print Reports</h3>
          <p class="subtle">Print a selected report, diagnostic report, or all student reports for one class.</p>
        </div>
        <span class="pill">No lockdown log in print</span>
      </div>
      <div class="report-print-actions no-print">
        ${submission ? `<button class="ghost" onclick="printSelectedReport()">Print Student Summary</button>` : `<button class="ghost" disabled>Select a report first</button>`}
        ${submission ? `<button class="primary" onclick="printSelectedDiagnosticReport()">Print Diagnostic Report</button>` : ""}
        ${combinedReports.length >= 2 ? `<button class="primary" onclick="printCombinedDiagnosticReport()">Print Combined Diagnostic Packet (${combinedReports.length} Subjects)</button>` : ""}
        ${
          state.classes?.length
            ? `
              <select id="printClassId" class="class-print-select" aria-label="Choose class to print">
                ${(state.classes || [])
                  .map((classRecord) => `<option value="${classRecord.id}">${escapeHtml(classRecord.name)}${classRecord.term ? ` · ${escapeHtml(classRecord.term)}` : ""}</option>`)
                  .join("")}
              </select>
              <select id="printClassExamId" class="class-print-select" aria-label="Choose exam to print">
                <option value="">Choose exam</option>
                ${availablePrintExams.map((exam) => `<option value="${escapeHtml(exam.id)}" ${exam.id === selectedPrintExamId ? "selected" : ""}>${escapeHtml(exam.title)} (${escapeHtml(exam.code || "No code")})</option>`).join("")}
              </select>
              <button class="primary" onclick="printClassReports()">Print All Student Summaries</button>
            `
            : ""
        }
      </div>
      ${
        studentReports.length >= 2
          ? `<section class="diagnostic-packet-selector no-print">
              <div>
                <strong>Print Different Subjects Together</strong>
                <p class="hint">Choose two or more reports for this student. They can use different testing codes, such as SAT ELA and SAT Math.</p>
              </div>
              <div class="diagnostic-packet-options">
                ${studentReports
                  .map((report) => {
                    const exam = state.exams.find((item) => item.id === report.examId);
                    const checked = report.id === submission.id || studentReports.length === 2;
                    return `<label><input type="checkbox" data-diagnostic-packet-report value="${escapeHtml(report.id)}" ${checked ? "checked" : ""} /><span><strong>${escapeHtml(exam?.title || "Exam")}</strong><small>${escapeHtml(exam?.code || "No code")} · ${escapeHtml(exam?.examType === "math" ? "Math" : "ELA / Reading")}</small></span></label>`;
                  })
                  .join("")}
              </div>
              <button class="primary" onclick="printSelectedDiagnosticPacket()">Print Selected Subject Packet</button>
            </section>`
          : ""
      }
      <p class="hint">Use the Results subtab to choose a specific student report first.${combinedReports.length >= 2 ? ` The combined packet uses this student's completed subjects with the same test code.` : ""}</p>
    </div>
  `;
}

function getCombinedDiagnosticReports(seedSubmission) {
  const seedExam = state.exams.find((exam) => exam.id === seedSubmission?.examId);
  const testCode = String(seedExam?.code || "").trim().toUpperCase();
  if (!seedSubmission || !testCode) return [];
  const candidates = (state.submissions || [])
    .filter((submission) => {
      const exam = state.exams.find((item) => item.id === submission.examId);
      return String(exam?.code || "").trim().toUpperCase() === testCode && sameStudentSubmission(submission, seedSubmission.studentId, seedSubmission.studentName);
    })
    .sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0));
  const newestByExam = new Map();
  candidates.forEach((submission) => {
    if (!newestByExam.has(submission.examId)) newestByExam.set(submission.examId, submission);
  });
  return [...newestByExam.values()].sort((left, right) => {
    const leftExam = state.exams.find((exam) => exam.id === left.examId);
    const rightExam = state.exams.find((exam) => exam.id === right.examId);
    const subjectOrder = (leftExam?.examType === "english" ? 0 : 1) - (rightExam?.examType === "english" ? 0 : 1);
    return subjectOrder || String(leftExam?.title || "").localeCompare(String(rightExam?.title || ""));
  });
}

function getStudentDiagnosticReports(seedSubmission) {
  if (!seedSubmission) return [];
  const candidates = (state.submissions || [])
    .filter((submission) => sameStudentSubmission(submission, seedSubmission.studentId, seedSubmission.studentName))
    .sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0));
  const newestByExam = new Map();
  candidates.forEach((submission) => {
    if (!newestByExam.has(submission.examId)) newestByExam.set(submission.examId, submission);
  });
  return [...newestByExam.values()].sort((left, right) => {
    const leftExam = state.exams.find((exam) => exam.id === left.examId);
    const rightExam = state.exams.find((exam) => exam.id === right.examId);
    const subjectOrder = (leftExam?.examType === "math" ? 1 : 0) - (rightExam?.examType === "math" ? 1 : 0);
    return subjectOrder || String(leftExam?.title || "").localeCompare(String(rightExam?.title || ""));
  });
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
      submission.classId === classRecord.id ||
      studentIds.has(submission.studentRecordId) ||
      studentNumbers.has(String(submission.studentId || "").toLowerCase())
  );
}

function studentMatchesRecord(student, record) {
  return Boolean(
    record.studentRecordId === student.id ||
      String(record.studentId || "").toLowerCase() === String(student.studentNumber || "").toLowerCase() ||
      (!record.studentId && String(record.studentName || "").toLowerCase() === String(student.name || "").toLowerCase())
  );
}

function getSubmissionStudentKey(submission) {
  return String(submission?.studentRecordId || submission?.studentId || submission?.studentName || "unknown").trim().toLowerCase();
}

function latestReportsPerStudent(reports) {
  const newest = new Map();
  [...(reports || [])]
    .sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0))
    .forEach((report) => {
      const key = getSubmissionStudentKey(report);
      if (!newest.has(key)) newest.set(key, report);
    });
  return [...newest.values()];
}

function classReportsForExam(classRecord, examId = "") {
  return classReports(classRecord).filter((report) => !examId || report.examId === examId);
}

function classAverage(classRecord, examId = "") {
  const reports = latestReportsPerStudent(classReportsForExam(classRecord, examId));
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
  const subtab = getAdminSubTab("students");
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
    <section class="admin-workspace stack">
      ${renderAdminSubTabs("students")}
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
      ${subtab === "directory" ? renderStudentDirectoryPanel(filteredStudents, selectedStudent, groups, terms) : ""}
      ${subtab === "profile" ? renderStudentProfilePanel(selectedStudent, studentReports) : ""}
      ${subtab === "add" ? `<div class="panel stack">${renderCreateStudentCard(true)}</div>` : ""}
    </section>
  `;
}

function renderStudentDirectoryPanel(filteredStudents, selectedStudent, groups, terms) {
  return `
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
    </div>
  `;
}

function renderStudentProfilePanel(selectedStudent, studentReports) {
  return `
    <div class="panel stack">
      ${
        selectedStudent
          ? renderStudentProfileDetail(selectedStudent, studentReports)
          : `<div class="notice">No student selected. Open Directory first, select a student, then come back to Profile.</div>`
      }
    </div>
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
            <label>Address</label>
            <input id="newStudentAddress" placeholder="Optional" />
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

function submissionStudentLabel(submission) {
  const exam = state.exams.find((item) => item.id === submission.examId);
  const linkedStudent = state.students.find((student) => student.id === submission.studentRecordId);
  return `${submission.studentName || "Student"} · ${submission.studentId || "No ID"} · ${exam?.title || "Deleted exam"} · ${submission.score?.percent ?? 0}%${linkedStudent ? ` · linked to ${linkedStudent.name}` : ""}`;
}

function renderLinkSavedReportCard(student) {
  const availableReports = (state.submissions || [])
    .filter((submission) => submission.studentRecordId !== student.id)
    .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt));

  return `
    <section class="card stack link-report-card">
      <div class="section-head">
        <div>
          <h3>Link Saved Reports</h3>
          <p class="subtle">Use this when the student already took an exam before the profile was created, or typed a different ID/name.</p>
        </div>
        <span class="pill">${availableReports.length} available</span>
      </div>
      ${
        availableReports.length
          ? `
            <div class="grid two compact-grid">
              <div class="field">
                <label>Saved report</label>
                <select id="linkSubmissionId">
                  ${availableReports
                    .map((submission) => `<option value="${submission.id}">${escapeHtml(submissionStudentLabel(submission))}</option>`)
                    .join("")}
                </select>
              </div>
              <div class="field action-field">
                <label>Action</label>
                <button class="primary" onclick="linkSubmissionToStudent('${student.id}')" type="button">Link To This Student</button>
              </div>
            </div>
          `
          : `<div class="notice ok">No unlinked or other saved reports are available right now.</div>`
      }
    </section>
  `;
}

function renderStudentProfileDetail(student, reports) {
  const logEntries = Array.isArray(student.logEntries) ? student.logEntries : [];
  const scoreHistory = getStudentProfileScoreHistory(student, reports);
  const latestScore = scoreHistory[0] || null;
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
      <div class="stat"><span class="subtle">Saved scores</span><strong>${scoreHistory.length}</strong></div>
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
      <section id="studentContactsSection" class="card stack">
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
            <label>Address</label>
            <input id="editStudentAddress" value="${escapeHtml(student.address || "")}" />
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
    ${renderLinkSavedReportCard(student)}
    <section class="student-profile-tabs">
      <button class="active" onclick="scrollStudentProfileSection('studentActivitySection')" type="button">Activity</button>
      <button onclick="scrollStudentProfileSection('studentTestsSection')" type="button">Tests</button>
      <button onclick="scrollStudentProfileSection('studentNotesSection')" type="button">Notes</button>
      <button onclick="scrollStudentProfileSection('studentContactsSection')" type="button">Contacts</button>
    </section>
    <section id="studentActivitySection" class="card stack">
      <div class="section-head">
        <div>
          <h3>Activity Timeline</h3>
          <p class="subtle">Manual logs and test submissions in one place.</p>
        </div>
        ${latestScore ? `<span class="pill ${Number(latestScore.percent || 0) >= 70 ? "ok" : "bad"}">Latest: ${Number(latestScore.percent || 0)}%</span>` : ""}
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
        <div id="studentNotesSection" class="field">
          <label>Log note</label>
          <input id="studentLogNote" placeholder="Add a quick note to this profile" />
        </div>
      </div>
      <button class="ghost" onclick="addStudentLog('${student.id}')" type="button">Add Log Entry</button>
      ${renderStudentTimeline(logEntries, reports)}
    </section>
    <div id="studentTestsSection" class="section-head">
        <div>
          <h3>Test History</h3>
        <p class="subtle">Exam title and score stay here even after the detailed report is removed to save space.</p>
      </div>
      ${latestScore ? `<span class="subtle">Last test: ${escapeHtml(latestScore.examTitle || "Exam")}</span>` : ""}
    </div>
    ${
      scoreHistory.length
        ? `<div class="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Exam title</th><th>Subject</th><th>Score</th><th></th></tr></thead>
              <tbody>
                ${scoreHistory
                  .map((item) => {
                    const submission = (state.submissions || []).find((saved) => saved.id === item.submissionId);
                    const scoreLabel = `${Number(item.percent || 0)}%${item.total ? ` · ${item.correct || 0}/${item.total}` : ""}${item.shsatScore ? ` · SHSAT ${item.shsatScore}` : ""}`;
                    return `<tr>
                      <td>${item.submittedAt ? new Date(item.submittedAt).toLocaleString() : "Date not saved"}</td>
                      <td><strong>${escapeHtml(item.examTitle || "Deleted exam")}</strong>${item.examCode ? `<br><span class="subtle">${escapeHtml(item.examCode)}</span>` : ""}</td>
                      <td>${escapeHtml(item.subject === "math" ? "Math" : item.subject ? "English / Reading" : "—")}</td>
                      <td><span class="pill ${Number(item.percent || 0) >= 70 ? "ok" : "bad"}">${escapeHtml(scoreLabel)}</span></td>
                      <td class="table-actions-cell"><div class="table-actions">${submission ? `<button class="ghost" onclick="selectSubmission('${submission.id}')">Open Report</button>` : `<span class="pill">Score kept</span>`}<button class="danger" onclick="deleteStudentScore('${student.id}', '${item.id}')" type="button">Delete score</button></div></td>
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>`
        : `<div class="notice">No saved scores linked to this student yet.</div>`
    }
  `;
}

function getStudentProfileScoreHistory(student, reports) {
  const deletedKeys = new Set((Array.isArray(student?.deletedScoreHistoryKeys) ? student.deletedScoreHistoryKeys : []).map(String));
  const history = (Array.isArray(student?.scoreHistory) ? student.scoreHistory : [])
    .filter((entry) => !deletedKeys.has(String(entry.submissionId || entry.id || "")))
    .map((entry) => ({ ...entry }));
  const knownSubmissionIds = new Set(history.map((entry) => String(entry.submissionId || "")).filter(Boolean));
  (reports || []).forEach((submission) => {
    if (knownSubmissionIds.has(String(submission.id || "")) || deletedKeys.has(String(submission.id || ""))) return;
    const exam = state.exams.find((item) => item.id === submission.examId);
    history.push({
      id: submission.id,
      submissionId: submission.id,
      examId: submission.examId,
      examTitle: submission.examTitle || submission.examName || exam?.title || "Deleted exam",
      examCode: submission.examCode || exam?.code || "",
      subject: submission.examSubject || exam?.examType || "",
      submittedAt: submission.submittedAt,
      percent: submission.score?.percent || 0,
      correct: submission.score?.correct || 0,
      total: submission.score?.total || 0,
      rawScore: submission.score?.rawScore ?? null,
      shsatScore: submission.score?.shsatScore ?? null,
    });
  });
  return history.sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0));
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
    <section class="admin-workspace stack">
      ${renderAdminSubTabs("classes")}
      <section class="grid two class-workspace">
        <div class="panel stack">
          <div class="section-head">
            <div>
              <h2>Class Directory</h2>
              <p class="subtle">Choose a class first, then use Tracker, Roster, Settings, or Analysis.</p>
            </div>
          </div>
          ${renderClassList(selectedClass)}
          ${renderCreateClassCard()}
        </div>
        <div class="panel stack">
          ${selectedClass ? renderClassDetail(selectedClass) : `<div class="notice">No classes yet. Add a class to start building rosters.</div>`}
        </div>
      </section>
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
              <span class="pill">${reports.length ? `${reports.length} results` : "No results"}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderClassLinkingCard(classRecord, roster) {
  const rosterIds = new Set(roster.map((student) => student.id));
  const availableStudents = (state.students || [])
    .filter((student) => !rosterIds.has(student.id))
    .sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
  const classReportIds = new Set(classReports(classRecord).map((submission) => submission.id));
  const availableReports = (state.submissions || [])
    .filter((submission) => !classReportIds.has(submission.id))
    .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt));

  return `
    <section class="card stack link-report-card">
      <div class="section-head">
        <div>
          <h3>Connect Existing Records</h3>
          <p class="subtle">Use this when older student profiles or exam reports did not automatically connect to this class.</p>
        </div>
      </div>
      <div class="grid two compact-grid">
        <div class="field">
          <label>Existing student profile</label>
          <select id="linkClassStudentId" ${availableStudents.length ? "" : "disabled"}>
            ${
              availableStudents.length
                ? availableStudents
                    .map((student) => `<option value="${student.id}">${escapeHtml(student.name)} · ${escapeHtml(student.studentNumber)} · ${escapeHtml(student.term || "Unassigned")}</option>`)
                    .join("")
                : `<option>No available students</option>`
            }
          </select>
          <button class="ghost" onclick="linkStudentToClass('${classRecord.id}')" type="button" ${availableStudents.length ? "" : "disabled"}>Add Student To Class</button>
        </div>
        <div class="field">
          <label>Saved report</label>
          <select id="linkClassSubmissionId" ${availableReports.length ? "" : "disabled"}>
            ${
              availableReports.length
                ? availableReports.map((submission) => `<option value="${submission.id}">${escapeHtml(submissionStudentLabel(submission))}</option>`).join("")
                : `<option>No available reports</option>`
            }
          </select>
          <button class="ghost" onclick="linkSubmissionToClass('${classRecord.id}')" type="button" ${availableReports.length ? "" : "disabled"}>Add Report To Class</button>
        </div>
      </div>
    </section>
  `;
}

function renderClassDetail(classRecord) {
  const roster = classRoster(classRecord);
  const reports = classReports(classRecord);
  const linkedExamIds = getClassLinkedExamIds(classRecord);
  const metricExamOptions = (linkedExamIds.length ? linkedExamIds.map((id) => state.exams.find((exam) => exam.id === id)).filter(Boolean) : state.exams || []);
  const latestReport = [...reports].sort((left, right) => new Date(right.submittedAt || 0) - new Date(left.submittedAt || 0))[0];
  const metricExamId = metricExamOptions.some((exam) => exam.id === selectedClassSubmissionExamId)
    ? selectedClassSubmissionExamId
    : metricExamOptions.find((exam) => exam.id === latestReport?.examId)?.id || metricExamOptions[0]?.id || "";
  const metricExam = metricExamOptions.find((exam) => exam.id === metricExamId) || null;
  const examReports = classReportsForExam(classRecord, metricExamId);
  const latestExamReports = latestReportsPerStudent(examReports);
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
      <div class="stat"><span class="subtle">Submitted for selected exam</span><strong>${latestExamReports.length}</strong></div>
      <div class="stat"><span class="subtle">In Progress</span><strong>${attempts.filter((attempt) => attempt.status !== "submitted").length}</strong></div>
      <div class="stat"><span class="subtle">Average${metricExam ? ` · ${escapeHtml(metricExam.title)}` : ""}</span><strong>${latestExamReports.length ? `${classAverage(classRecord, metricExamId)}%` : "N/A"}</strong></div>
    </div>
    ${
      metricExamOptions.length
        ? `<div class="field class-average-exam-select"><label>Class average is for this exam</label><select onchange="setClassSubmissionExam(this.value)">${metricExamOptions.map((exam) => `<option value="${escapeHtml(exam.id)}" ${exam.id === metricExamId ? "selected" : ""}>${escapeHtml(exam.title)} (${escapeHtml(exam.code || "No code")})</option>`).join("")}</select></div>`
        : ""
    }
    ${renderClassLinkedExamStrip(classRecord, linkedExamIds)}
    ${renderClassDetailSubtab(classRecord, roster, examReports, attempts, linkedExamIds)}
  `;
}

function renderClassLinkedExamStrip(classRecord, linkedExamIds) {
  const linkedExams = linkedExamIds.map((id) => state.exams.find((exam) => exam.id === id)).filter(Boolean);
  const subtab = getAdminSubTab("classes");
  return `
    <section class="class-linked-strip ${linkedExams.length ? "" : "empty"}">
      <div class="class-linked-copy">
        <strong>Linked Exams</strong>
        <p>${linkedExams.length ? `${linkedExams.length} exam${linkedExams.length === 1 ? "" : "s"} pinned to ${escapeHtml(classRecord.name)}.` : "No exams linked yet. Link exams once, then the tracker will show only the exams for this class."}</p>
      </div>
      <div class="class-linked-exams" aria-label="Linked exams">
        ${
          linkedExams.length
            ? linkedExams.slice(0, 4).map((exam) => `<span class="pill">${escapeHtml(exam.title || "Untitled")} <small>${escapeHtml(exam.code || "")}</small></span>`).join("")
            : `<span class="pill warn">Needs setup</span>`
        }
        ${linkedExams.length > 4 ? `<span class="pill">+${linkedExams.length - 4} more</span>` : ""}
      </div>
      ${
        subtab === "settings"
          ? ""
          : `<button class="ghost class-linked-action" onclick="setAdminSubTab('classes', 'settings')" type="button">Manage Linked Exams</button>`
      }
    </section>
  `;
}

function renderClassDetailSubtab(classRecord, roster, reports, attempts, linkedExamIds) {
  const subtab = getAdminSubTab("classes");
  if (subtab === "roster") return renderClassRosterPanel(classRecord, roster, reports);
  if (subtab === "settings") return renderClassSettingsPanel(classRecord, roster, linkedExamIds);
  if (subtab === "analysis") return `${renderClassWeaknessDashboard(classRecord, reports)}${renderClassResultsPanel(reports)}`;
  return renderClassSubmissionTracker(classRecord, roster, reports, attempts);
}

function renderClassSettingsPanel(classRecord, roster, linkedExamIds) {
  return `
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
      <button class="primary" onclick="saveClass('${classRecord.id}')" type="button">Save Class Settings</button>
    </section>
    ${renderClassExamLinkCard(classRecord, linkedExamIds)}
    ${renderClassLinkingCard(classRecord, roster)}
  `;
}

function renderClassRosterPanel(classRecord, roster, reports) {
  return `
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
                        <td>${latest ? `<span class="pill ${latest.score.percent >= 70 ? "ok" : "bad"}">${latest.score.percent}%</span><br><span class="subtle">${escapeHtml(latest.examTitle || latest.examName || exam?.title || "Exam")}</span>` : `<span class="subtle">No submitted test</span>`}</td>
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
  `;
}

function renderClassResultsPanel(reports) {
  return `
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
                        <td>${escapeHtml(submission.examTitle || submission.examName || exam?.title || "Deleted exam")}</td>
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

function renderClassSubmissionTracker(classRecord, roster, reports, attempts) {
  const allExamOptions = [...(state.exams || [])].sort((left, right) => String(left.title || "").localeCompare(String(right.title || "")));
  const linkedExamIds = getClassLinkedExamIds(classRecord);
  const linkedExamOptions = linkedExamIds
    .map((id) => allExamOptions.find((exam) => exam.id === id))
    .filter(Boolean);
  const examOptions = linkedExamOptions.length ? linkedExamOptions : allExamOptions;
  if (!roster.length) {
    return `
      <section class="card stack">
        <h3>Submission Tracker</h3>
        <div class="notice">Add students to this class before tracking exam submissions.</div>
      </section>
    `;
  }
  if (!examOptions.length) {
    return `
      <section class="card stack">
        <h3>Submission Tracker</h3>
        <div class="notice">Create an exam before tracking class submissions.</div>
      </section>
    `;
  }

  const latestClassReport = [...reports].sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt))[0];
  const selectedExamId =
    examOptions.find((exam) => exam.id === selectedClassSubmissionExamId)?.id ||
    examOptions.find((exam) => exam.id === latestClassReport?.examId)?.id ||
    examOptions[0].id;
  selectedClassSubmissionExamId = selectedExamId;
  const selectedExam = examOptions.find((exam) => exam.id === selectedExamId);
  const rows = roster
    .map((student) => {
      const submitted = reports
        .filter((submission) => submission.examId === selectedExamId && studentMatchesRecord(student, submission))
        .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt))[0];
      const inProgress = attempts
        .filter((attempt) => attempt.examId === selectedExamId && attempt.status !== "submitted" && studentMatchesRecord(student, attempt))
        .sort((left, right) => new Date(right.startedAt || 0) - new Date(left.startedAt || 0))[0];
      const status = submitted ? "Submitted" : inProgress ? "In Progress" : "Not Started";
      return { student, submitted, inProgress, status };
    })
    .sort((left, right) => left.status.localeCompare(right.status) || left.student.name.localeCompare(right.student.name));
  const submittedCount = rows.filter((row) => row.status === "Submitted").length;
  const inProgressCount = rows.filter((row) => row.status === "In Progress").length;
  const notStartedCount = rows.filter((row) => row.status === "Not Started").length;
  const total = rows.length || 1;
  const submittedPercent = Math.round((submittedCount / total) * 100);
  const inProgressPercent = Math.round((inProgressCount / total) * 100);
  const notStartedPercent = Math.max(0, 100 - submittedPercent - inProgressPercent);

  return `
    <section class="card stack class-submission-tracker">
      <div class="section-head">
        <div>
          <h3>Submission Tracker</h3>
          <p class="subtle">${linkedExamOptions.length ? "Tracking exams linked to this class." : "Link exams below to keep this class easier to manage."}</p>
        </div>
        <div class="field compact-select">
          <label>Exam</label>
          <select onchange="setClassSubmissionExam(this.value)">
            ${examOptions
              .map((exam) => `<option value="${escapeHtml(exam.id)}" ${exam.id === selectedExamId ? "selected" : ""}>${escapeHtml(exam.title)} (${escapeHtml(exam.code)})</option>`)
              .join("")}
          </select>
        </div>
      </div>
      <div class="general-kpis">
        <div class="stat"><span class="subtle">Class Size</span><strong>${rows.length}</strong></div>
        <div class="stat"><span class="subtle">Submitted</span><strong>${submittedCount}</strong></div>
        <div class="stat"><span class="subtle">In Progress</span><strong>${inProgressCount}</strong></div>
        <div class="stat"><span class="subtle">Not Started</span><strong>${notStartedCount}</strong></div>
        <div class="stat"><span class="subtle">Completion</span><strong>${submittedPercent}%</strong></div>
      </div>
      <div class="submission-chart" aria-label="Submission chart for ${escapeHtml(selectedExam?.title || "selected exam")}">
        <span class="submitted" style="width: ${submittedPercent}%"></span>
        <span class="progress" style="width: ${inProgressPercent}%"></span>
        <span class="missing" style="width: ${notStartedPercent}%"></span>
      </div>
      <div class="submission-legend">
        <span><i class="submitted"></i>Submitted</span>
        <span><i class="progress"></i>In Progress</span>
        <span><i class="missing"></i>Not Started</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Student</th><th>ID</th><th>Status</th><th>Score / Started</th><th></th></tr></thead>
          <tbody>
            ${rows
              .map(
                ({ student, submitted, inProgress, status }) => `
                  <tr>
                    <td><strong>${escapeHtml(student.name)}</strong><br><span class="subtle">${escapeHtml(student.term || classRecord.term || "Unassigned")}</span></td>
                    <td>${escapeHtml(student.studentNumber || "")}</td>
                    <td><span class="pill ${status === "Submitted" ? "ok" : status === "In Progress" ? "warn" : "bad"}">${status}</span></td>
                    <td>${
                      submitted
                        ? `<span class="pill ${submitted.score?.percent >= 70 ? "ok" : "bad"}">${submitted.score?.percent || 0}%</span><br><span class="subtle">${new Date(submitted.submittedAt).toLocaleString()}</span>`
                        : inProgress
                          ? `<span class="subtle">Started ${new Date(inProgress.startedAt).toLocaleString()}</span>`
                          : `<span class="subtle">No record yet</span>`
                    }</td>
                    <td>${
                      submitted
                        ? `<button class="ghost" onclick="selectSubmission('${submitted.id}')" type="button">Open Report</button>`
                        : `<button class="ghost" onclick="selectStudent('${student.id}')" type="button">Open Profile</button>`
                    }</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getClassLinkedExamIds(classRecord) {
  return Array.isArray(classRecord?.linkedExamIds) ? classRecord.linkedExamIds.filter(Boolean) : [];
}

function renderClassExamLinkCard(classRecord, linkedExamIds) {
  const linkedSet = new Set(linkedExamIds);
  const exams = [...(state.exams || [])].sort((left, right) => {
    const leftLinked = linkedSet.has(left.id) ? 0 : 1;
    const rightLinked = linkedSet.has(right.id) ? 0 : 1;
    return leftLinked - rightLinked || String(left.title || "").localeCompare(String(right.title || ""));
  });
  const examTypes = [...new Set(exams.map((exam) => String(exam.examType || "Exam").trim() || "Exam"))].sort((left, right) =>
    left.localeCompare(right)
  );
  const linkedExams = exams.filter((exam) => linkedSet.has(exam.id));
  return `
    <section class="card stack class-exam-links">
      <div class="section-head">
        <div>
          <h3>Linked Exams</h3>
          <p class="subtle">Search and pin the exams this class uses. Linked exams stay at the top of the tracker.</p>
        </div>
        <span class="pill" id="classExamLinkedCount">${linkedSet.size} linked</span>
      </div>
      ${
        exams.length
          ? `<div class="class-linked-summary" id="classLinkedExamSummary">
              ${
                linkedExams.length
                  ? linkedExams
                      .map((exam) => `<span>${escapeHtml(exam.title || "Untitled Exam")} <small>${escapeHtml(exam.code || "")}</small></span>`)
                      .join("")
                  : `<span class="empty">No linked exams yet</span>`
              }
            </div>
            <div class="class-exam-tools">
              <div class="field">
                <label>Find exam</label>
                <input id="classExamSearch" placeholder="Search title, code, subject, or term" oninput="filterClassExamLinks()" />
              </div>
              <div class="field">
                <label>Subject</label>
                <select id="classExamTypeFilter" onchange="filterClassExamLinks()">
                  <option value="all">All subjects</option>
                  ${examTypes.map((type) => `<option value="${escapeHtml(type.toLowerCase())}">${escapeHtml(type)}</option>`).join("")}
                </select>
              </div>
              <div class="class-exam-tool-actions">
                <button class="ghost" onclick="toggleVisibleClassExams(true)" type="button">Select Visible</button>
                <button class="ghost" onclick="toggleVisibleClassExams(false)" type="button">Clear Visible</button>
              </div>
            </div>
            <p class="hint" id="classExamVisibleCount">Showing ${exams.length} exams · linked exams appear first.</p>
            <div class="class-exam-grid">
              ${exams
                .map(
                  (exam) => `
                    <label
                      class="exam-link-option ${linkedSet.has(exam.id) ? "active" : ""}"
                      data-title="${escapeHtml([exam.title, exam.code, exam.examType, exam.term].join(" ").toLowerCase())}"
                      data-type="${escapeHtml(String(exam.examType || "Exam").toLowerCase())}"
                    >
                      <input type="checkbox" class="classExamCheckbox" value="${escapeHtml(exam.id)}" data-label="${escapeHtml(exam.title || "Untitled Exam")}" data-code="${escapeHtml(exam.code || "")}" onchange="refreshClassExamLinkSummary()" ${linkedSet.has(exam.id) ? "checked" : ""} />
                      <span>
                        <strong>${escapeHtml(exam.title || "Untitled Exam")}</strong>
                        <small>${escapeHtml(exam.code || "No code")} · ${escapeHtml(exam.examType || "Exam")} · ${exam.questions?.length || 0} questions</small>
                      </span>
                    </label>
                  `
                )
                .join("")}
            </div>
            <p class="hint">After changing linked exams, click Save Class.</p>`
          : `<div class="notice">Create exams first, then link them to this class.</div>`
      }
    </section>
  `;
}

function renderClassWeaknessDashboard(classRecord, reports) {
  const analysis = buildGeneralReport(reports);
  if (!reports.length) {
    return `
      <section class="card stack">
        <div class="section-head">
          <div>
            <h3>Class Weakness Dashboard</h3>
            <p class="subtle">No submitted reports connected to ${escapeHtml(classRecord.name)} yet.</p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="card stack">
      <div class="section-head">
        <div>
          <h3>Class Weakness Dashboard</h3>
          <p class="subtle">Quick teaching view from all submitted reports connected to this class.</p>
        </div>
        <span class="pill ${analysis.average >= 80 ? "ok" : analysis.average >= 65 ? "warn" : "bad"}">${analysis.average}% Avg</span>
      </div>
      <div class="general-kpis">
        <div class="stat"><span class="subtle">Reports</span><strong>${analysis.count}</strong></div>
        <div class="stat"><span class="subtle">Average</span><strong>${analysis.average}%</strong></div>
        <div class="stat"><span class="subtle">High</span><strong>${analysis.high}%</strong></div>
        <div class="stat"><span class="subtle">Low</span><strong>${analysis.low}%</strong></div>
        <div class="stat"><span class="subtle">Main Weakness</span><strong>${escapeHtml(analysis.weakestArea?.label || "None")}</strong></div>
      </div>
      <div class="grid two general-report-grid">
        <div class="stack">
          <h3>Weak Skills</h3>
          ${
            analysis.weakAreas.length
              ? `<div class="weakness-list">
                  ${analysis.weakAreas
                    .slice(0, 5)
                    .map(
                      (area) => `
                        <article class="weakness-item">
                          <div>
                            <strong>${escapeHtml(area.label)}</strong>
                            <p class="subtle">${area.missed} missed · ${area.percent}% correct</p>
                          </div>
                          <div class="weakness-bar"><span style="width: ${area.percent}%"></span></div>
                        </article>
                      `
                    )
                    .join("")}
                </div>`
              : `<div class="notice ok">No class weakness pattern yet.</div>`
          }
        </div>
        <div class="stack">
          <h3>Difficulty</h3>
          ${renderDifficultyBreakdown(analysis.difficultyAreas)}
        </div>
      </div>
      ${analysis.weakAreas.length ? `<div class="notice">${escapeHtml(buildTeachingFocusText(analysis, "class"))}</div>` : ""}
    </section>
  `;
}

function renderToolsWorkspace() {
  const subtab = getAdminSubTab("tools");
  return `
    <section class="admin-workspace stack">
      ${renderAdminSubTabs("tools")}
      ${subtab === "backup" ? renderBackupToolPanel() : ""}
      ${subtab === "storage" ? renderStorageCleanupToolPanel() : ""}
      ${subtab === "calculator" ? renderCalculatorToolPanel() : ""}
    </section>
  `;
}

function renderBackupToolPanel() {
  return `
    <section class="panel stack tool-panel">
      <div class="section-head">
        <div>
          <h2>Full System Backup</h2>
          <p class="subtle">Save or restore all exams, reports, students, classes, attempts, and question bank data before major edits or deploys.</p>
        </div>
        <span class="pill ok">Admin only</span>
      </div>
      <div class="grid three">
        <div class="stat"><span class="subtle">Exams</span><strong>${state.exams.length}</strong></div>
        <div class="stat"><span class="subtle">Reports</span><strong>${state.submissions.length}</strong></div>
        <div class="stat"><span class="subtle">Question Bank</span><strong>${state.questionBank?.length || 0}</strong></div>
      </div>
      <div class="bank-selection-actions">
        <button class="primary" onclick="downloadFullSystemBackup()" type="button">Download Full Backup</button>
        <button class="danger-light" onclick="chooseFullSystemRestoreFile()" type="button">Restore From Backup</button>
        <input id="fullSystemRestoreFile" class="visually-compact" type="file" accept="application/json,.json" onchange="restoreFullSystemBackup(this.files[0]); this.value='';" />
      </div>
      <p class="hint">Use Download Full Backup before importing large CSV files, deleting duplicates, or changing exam settings. Restore replaces current server data, so use it only with a backup file you trust.</p>
    </section>
  `;
}

function renderStorageCleanupToolPanel() {
  const unfinishedAttempts = (state.attempts || []).filter((attempt) => attempt.status !== "submitted").length;
  return `
    <section class="panel stack tool-panel storage-cleanup-panel">
      <div class="section-head">
        <div>
          <h2>Storage Cleanup</h2>
          <p class="subtle">Delete old detailed reports after downloading a backup. The student profile keeps a compact score history with the exam title.</p>
        </div>
        <span class="pill warn">Permanent action</span>
      </div>
      <div class="grid three">
        <div class="stat"><span class="subtle">Completed reports</span><strong>${state.submissions.length}</strong></div>
        <div class="stat"><span class="subtle">Unfinished attempts</span><strong>${unfinishedAttempts}</strong></div>
        <div class="stat"><span class="subtle">Question bank</span><strong>${state.questionBank?.length || 0}</strong></div>
      </div>
      <div class="notice compact"><strong>Safe order:</strong> download a Full Backup first. Then choose a date. The cleanup removes detailed reports and their linked completed attempts; the small score history stays on each student profile.</div>
      <div class="row storage-cleanup-controls">
        <div class="field"><label>Delete completed reports before</label><input id="storageCleanupBefore" type="date" /></div>
        <button class="danger" onclick="deleteOldCompletedReports()" type="button">Delete Old Reports</button>
      </div>
      <p class="hint">To remove an entire old test, use Exams → Manage → Delete. That also removes that exam’s reports and attempts. This cleanup never deletes student profiles.</p>
    </section>
  `;
}

function renderCalculatorToolPanel() {
  return `
    <section class="panel stack tool-panel shsat-calculator-panel">
      <div class="section-head">
        <div>
          <h2>SHSAT Original Score Converter</h2>
          <p class="subtle">Uses the Original column from your supplied SHSAT prep chart only. It does not use the Modified column and is not used for SAT exams.</p>
        </div>
        <span class="pill ok">Original only</span>
      </div>
      <div class="row">
        <div class="field" style="flex: 1 1 220px"><label>Raw score / number correct</label><input id="shsatRawScore" type="number" min="0" max="50" step="1" value="0" oninput="updateShsatOriginalCalculator()" /></div>
      </div>
      <div id="shsatOriginalCalcResult" class="grid three"></div>
      <p class="hint">The chart contains values for raw scores 1–50. Raw score 0 is kept as raw score only because your Original chart does not list a converted value for 0.</p>
    </section>
    <section class="panel stack tool-panel">
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

function updateShsatOriginalCalculator() {
  const result = $("#shsatOriginalCalcResult");
  if (!result) return;
  const rawValue = String($("#shsatRawScore")?.value || "").trim();
  const rawScore = Number(rawValue);
  const validWholeScore = Number.isInteger(rawScore) && rawScore >= 0 && rawScore <= 50;
  const convertedScore = validWholeScore ? SHSAT_ORIGINAL_SCORE_CONVERSION[rawScore] : null;
  result.innerHTML = `
    <div class="stat"><span class="subtle">Raw score</span><strong>${validWholeScore ? rawScore : "Enter 0–50"}</strong></div>
    <div class="stat"><span class="subtle">SHSAT converted score</span><strong>${convertedScore ?? "Not listed"}</strong></div>
    <div class="stat"><span class="subtle">Chart used</span><strong>Original</strong></div>
  `;
}

async function downloadFullSystemBackup() {
  try {
    const backup = await api("/api/admin/export");
    const stamp = formatDownloadDate();
    const counts = backup.counts || {};
    const fileName = `topway-full-system-backup-${stamp}.json`;
    downloadTextFile(fileName, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
    alert(`Backup downloaded.\n\nExams: ${counts.exams || 0}\nReports: ${counts.submissions || 0}\nStudents: ${counts.students || 0}\nQuestion bank: ${counts.questionBank || 0}`);
  } catch (error) {
    alert(error.message);
  }
}

function chooseFullSystemRestoreFile() {
  $("#fullSystemRestoreFile")?.click();
}

function getBackupCountsFromPayload(payload) {
  const data = payload?.data || payload || {};
  return {
    exams: Array.isArray(data.exams) ? data.exams.length : 0,
    submissions: Array.isArray(data.submissions) ? data.submissions.length : 0,
    students: Array.isArray(data.students) ? data.students.length : 0,
    attempts: Array.isArray(data.attempts) ? data.attempts.length : 0,
    classes: Array.isArray(data.classes) ? data.classes.length : 0,
    questionBank: Array.isArray(data.questionBank) ? data.questionBank.length : 0,
  };
}

async function restoreFullSystemBackup(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const data = payload?.data || payload;
    const counts = getBackupCountsFromPayload(payload);
    const looksValid = ["exams", "submissions", "students", "attempts", "classes", "questionBank"].some((key) => Array.isArray(data?.[key]));
    if (!looksValid) {
      alert("This file does not look like a Topway backup.");
      return;
    }
    const message = `Restore this backup?\n\nFile: ${file.name}\nExams: ${counts.exams}\nReports: ${counts.submissions}\nStudents: ${counts.students}\nClasses: ${counts.classes}\nQuestion bank: ${counts.questionBank}\n\nThis replaces the current server data. Type RESTORE to continue.`;
    if (prompt(message) !== "RESTORE") return;
    state = await api("/api/admin/restore", {
      method: "POST",
      body: JSON.stringify({ data }),
    });
    selectedExamId = state.exams[0]?.id || null;
    selectedSubmissionId = state.submissions[0]?.id || null;
    selectedStudentId = state.students[0]?.id || null;
    selectedClassId = state.classes[0]?.id || null;
    selectedBankQuestionId = state.questionBank?.[0]?.id || null;
    selectedBankQuestionIds = new Set();
    bankAiPlan = null;
    adminActiveTab = "tools";
    renderAdmin();
    alert("Backup restored successfully.");
  } catch (error) {
    alert(error.message || "Backup restore failed.");
  }
}

async function deleteOldCompletedReports() {
  const before = String($("#storageCleanupBefore")?.value || "").trim();
  if (!before) {
    alert("Choose a date first.");
    return;
  }
  const message = `Delete every completed report submitted before ${before}?\n\nThis also removes the linked completed attempts. Exams, student profiles, and question-bank questions will stay.\n\nDownload a Full Backup first. Type DELETE to continue.`;
  if (prompt(message) !== "DELETE") return;
  try {
    const result = await api("/api/admin/storage/old-reports", {
      method: "POST",
      body: JSON.stringify({ before }),
    });
    state = result.data || state;
    selectedSubmissionId = state.submissions[0]?.id || null;
    adminActiveTab = "tools";
    adminSubTabs.tools = "storage";
    renderAdmin();
    alert(`${result.deletedReports || 0} old detailed report(s) and ${result.deletedAttempts || 0} linked attempt(s) were deleted. Student score history was kept.`);
  } catch (error) {
    alert(error.message || "Storage cleanup failed.");
  }
}

function adminAverage() {
  if (!state.submissions.length) return 0;
  const total = state.submissions.reduce((sum, item) => sum + item.score.percent, 0);
  return Math.round(total / state.submissions.length);
}

function renderQuestionEditorExamPicker(selected) {
  if (!state.exams.length) {
    return `<div class="notice">No exams yet. Create the first one and share its test code with students.</div>`;
  }
  const inProgressCount = selected ? (state.attempts || []).filter((attempt) => attempt.examId === selected.id && attempt.status !== "submitted").length : 0;
  const selectedLabel = selected ? `${selected.examType === "math" ? "Math" : "English"} · ${selected.code || "No code"} · ${selected.questions?.length || 0} questions` : "No exam selected";

  return `
    <div class="question-editor-picker">
      <div class="field">
        <label>Editing exam</label>
        <select onchange="selectExamForQuestions(this.value)">
          ${state.exams
            .map((exam) => `<option value="${escapeHtml(exam.id)}" ${selected?.id === exam.id ? "selected" : ""}>${escapeHtml(exam.title)} (${escapeHtml(exam.code || "No code")})</option>`)
            .join("")}
        </select>
      </div>
      <div class="question-editor-picker-status">
        <strong>${escapeHtml(selected?.title || "Choose an exam")}</strong>
        <span class="subtle">${escapeHtml(selectedLabel)}</span>
        <div class="row compact-row">
          <span class="pill ${selected?.open ? "ok" : "bad"}">${selected?.open ? "Open" : "Closed"}</span>
          ${inProgressCount ? `<span class="pill warn">${inProgressCount} in progress</span>` : `<span class="pill">No active progress</span>`}
        </div>
      </div>
      <div class="question-editor-picker-actions">
        ${selected ? `<button class="ghost" onclick="addQuestion('${selected.id}')" type="button">Add Question</button>` : ""}
        ${selected ? `<button class="primary" onclick="saveQuestionEdits('${selected.id}')" type="button">Save Key</button>` : ""}
      </div>
    </div>
  `;
}

function renderExamList(selected, options = {}) {
  const { showSettings = true, showQuestions = true } = options;
  if (!state.exams.length) {
    return `<div class="notice">No exams yet. Create the first one and share its test code with students.</div>`;
  }
  const codeCounts = (state.exams || []).reduce((map, exam) => {
    const code = String(exam.code || "").toUpperCase();
    if (code) map.set(code, (map.get(code) || 0) + 1);
    return map;
  }, new Map());
  const search = examListSearch.trim().toLowerCase();
  const visibleExams = (state.exams || []).filter((exam) => {
    const matchesSearch = !search || `${exam.title || ""} ${exam.code || ""}`.toLowerCase().includes(search);
    const matchesSubject = examListSubjectFilter === "all" || (exam.examType || "english") === examListSubjectFilter;
    const matchesStatus = examListStatusFilter === "all" || (examListStatusFilter === "open" ? exam.open : !exam.open);
    return matchesSearch && matchesSubject && matchesStatus;
  });

  return `
    <div class="exam-list-toolbar">
      <div class="field"><label>Find an exam</label><input id="examListSearch" value="${escapeHtml(examListSearch)}" placeholder="Name or test code" oninput="setExamListSearch(this.value)" /></div>
      <div class="field"><label>Subject</label><select onchange="setExamListSubjectFilter(this.value)"><option value="all" ${examListSubjectFilter === "all" ? "selected" : ""}>All subjects</option><option value="english" ${examListSubjectFilter === "english" ? "selected" : ""}>English / Reading</option><option value="math" ${examListSubjectFilter === "math" ? "selected" : ""}>Math</option></select></div>
      <div class="field"><label>Status</label><select onchange="setExamListStatusFilter(this.value)"><option value="all" ${examListStatusFilter === "all" ? "selected" : ""}>Open and closed</option><option value="open" ${examListStatusFilter === "open" ? "selected" : ""}>Open only</option><option value="closed" ${examListStatusFilter === "closed" ? "selected" : ""}>Closed only</option></select></div>
      <span class="pill">${visibleExams.length} shown</span>
    </div>
    ${visibleExams.length ? `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Exam</th><th>Type</th><th>Code</th><th>Questions</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${visibleExams
            .map(
              (exam) => {
                const inProgressCount = (state.attempts || []).filter((attempt) => attempt.examId === exam.id && attempt.status !== "submitted").length;
                return `
                <tr>
                  <td><strong>${escapeHtml(exam.title)}</strong><br><span class="subtle">${exam.minutes} minutes${exam.program ? ` · ${escapeHtml(exam.program)}` : " · No program"}</span></td>
                  <td>${exam.examType === "math" ? "Math" : "English"}${exam.scoringMode === "shsat_original" ? `<br><span class="pill ok">SHSAT chart active</span>` : ""}</td>
                  <td><span class="pill">${escapeHtml(exam.code)}</span>${codeCounts.get(String(exam.code || "").toUpperCase()) > 1 ? `<br><span class="pill ok">Combined code</span>` : ""}</td>
                  <td>${exam.questions.length}</td>
                  <td><span class="pill ${exam.open ? "ok" : "bad"}">${exam.open ? "Open" : "Closed"}</span>${inProgressCount ? `<br><span class="pill warn">${inProgressCount} in progress</span>` : ""}</td>
                  <td class="table-actions-cell">
                    <div class="table-actions">
                      <button class="ghost" onclick="selectExam('${exam.id}')">${selected?.id === exam.id ? "Selected" : "Select"}</button>
                      <button class="ghost" onclick="openPaperExamForm('${exam.id}')" type="button">Paper Form</button>
                      <button class="ghost" onclick="toggleExam('${exam.id}')">${exam.open ? "Close" : "Open"}</button>
                      ${inProgressCount ? `<button class="ghost" onclick="clearExamAttempts('${exam.id}')" type="button">Clear Progress</button>` : ""}
                      <button class="danger" onclick="deleteExam('${exam.id}')" type="button">Delete</button>
                    </div>
                  </td>
                </tr>
              `;
              }
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ` : `<div class="notice">No exams match these filters. Clear a filter to see all exams again.</div>`}
    ${selected && visibleExams.some((exam) => exam.id === selected.id) && showSettings ? renderExamSettings(selected) : ""}
    ${selected && visibleExams.some((exam) => exam.id === selected.id) && showQuestions ? renderQuestionEditor(selected) : ""}
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
        <div class="row">
          <button class="ghost" onclick="printTeacherExamVersion('${exam.id}')" type="button">Teacher Answer Key</button>
          <button class="ghost" onclick="openPaperExamForm('${exam.id}')" type="button">Paper Exam Form</button>
          <button class="ghost" onclick="downloadExamBackup('${exam.id}')" type="button">Download Backup</button>
          <button class="ghost" onclick="downloadExamCsv('${exam.id}')" type="button">Download CSV</button>
          <button class="ghost" onclick="chooseExamBackupFile('${exam.id}')" type="button">Restore Backup</button>
          <input id="examBackupFile-${exam.id}" class="visually-compact" type="file" accept="application/json,.json" onchange="restoreExamBackup(this.files[0]); this.value='';" />
          <button class="primary" onclick="saveExamSettings('${exam.id}')" type="button">Save Settings</button>
        </div>
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
          <label>Program / Course</label>
          <input id="editExamProgram" list="editExamProgramOptions" value="${escapeHtml(exam.program || "")}" placeholder="Example: Fall SHSAT Grade 8" />
          ${renderProgramDatalist("editExamProgramOptions")}
        </div>
        <div class="field">
          <label>Reuse policy used to build</label>
          <select id="editExamReusePolicy">${renderReusePolicyOptions(exam.reusePolicy || "never_used")}</select>
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
      <label class="row"><input id="editShuffleQuestions" type="checkbox" ${exam.shuffle ? "checked" : ""} /> Randomize question order separately for each student</label>
      <p class="hint">Passage sets move as complete units. Their questions remain together and in source order, while the surrounding exam order changes for each student.</p>
      ${exam.scoringMode === "shsat_original" ? `<div class="notice compact ok"><strong>Original SHSAT chart active automatically.</strong> Reports keep the raw number correct and add the converted SHSAT score from the Original column only.</div>` : `<div class="notice compact">The SHSAT conversion is automatic when the exam title or code includes SHSAT and it has exactly 50 questions.</div>`}
      ${exam.scoringMode === "shsat_original" ? renderExamShsatOriginalScoreConverter(exam) : ""}
      <p class="hint">Changing these settings keeps the same exam, questions, and saved reports connected.</p>
    </section>
  `;
}

function renderExamShsatOriginalScoreConverter(exam) {
  return `
    <section class="panel stack exam-shsat-score-panel">
      <div class="section-head">
        <div>
          <h3>SHSAT Score Converter — This Exam</h3>
          <p class="subtle">Preview the Original-chart score for ${escapeHtml(exam.title)}. Student reports calculate this automatically after submission.</p>
        </div>
        <span class="pill ok">Original chart active</span>
      </div>
      <div class="row">
        <div class="field" style="flex: 1 1 220px"><label>Raw score / number correct</label><input id="examShsatRawScore" type="number" min="0" max="50" step="1" value="0" oninput="updateExamShsatOriginalCalculator()" /></div>
      </div>
      <div id="examShsatOriginalCalcResult" class="grid three compact-grid"></div>
      <p class="hint">This preview never changes a student's submitted grade. It uses only the Original column from your SHSAT chart.</p>
    </section>
  `;
}

function updateExamShsatOriginalCalculator() {
  const result = $("#examShsatOriginalCalcResult");
  if (!result) return;
  const rawValue = String($("#examShsatRawScore")?.value || "").trim();
  const rawScore = Number(rawValue);
  const validWholeScore = Number.isInteger(rawScore) && rawScore >= 0 && rawScore <= 50;
  const convertedScore = validWholeScore ? SHSAT_ORIGINAL_SCORE_CONVERSION[rawScore] : null;
  result.innerHTML = `
    <div class="stat"><span class="subtle">Raw score</span><strong>${validWholeScore ? `${rawScore} / 50` : "Enter 0–50"}</strong></div>
    <div class="stat"><span class="subtle">SHSAT converted score</span><strong>${convertedScore ?? "Not listed"}</strong></div>
    <div class="stat"><span class="subtle">Chart used</span><strong>Original</strong></div>
  `;
}

function renderQuestionEditor(exam) {
  const questions = [...exam.questions].sort((a, b) => a.number - b.number);
  const selectedQuestion = questions.find((question) => question.id === selectedQuestionId) || questions[0] || null;
  const selectedDisplayNumber = selectedQuestion ? questions.findIndex((question) => question.id === selectedQuestion.id) + 1 : 0;
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
          <button class="ghost" onclick="repairExamNumbering('${exam.id}')" type="button">Repair Numbering 1–${questions.length}</button>
          <button class="ghost" onclick="saveQuestionEdits('${exam.id}')">Save Key</button>
        </div>
      </div>
      <section class="csv-import-box stack">
        <div class="section-head">
          <div>
            <h3>Add Existing Questions by ID</h3>
            <p class="subtle">Enter one or more Question Bank IDs. They will be appended in the exact order entered.</p>
          </div>
          <button class="primary" onclick="addQuestionsById('${exam.id}')" type="button">Load Into Exam</button>
        </div>
        <div class="field">
          <label>Question IDs</label>
          <textarea id="examAddQuestionIds" rows="2" oninput="updateExamQuestionIdPreview('${exam.id}')" placeholder="Example: Q0172, Q0173, Q0174"></textarea>
          <p class="hint">Separate IDs with commas, spaces, or new lines. Unknown IDs, duplicate content, wrong-subject questions, and incomplete passage questions are rejected before anything changes.</p>
        </div>
        <div id="examQuestionIdPreview" class="csv-preview"></div>
      </section>
      <div class="question-editor-layout">
        <aside class="question-nav-list">
          ${questions
            .map(
              (question, index) => `
                <button class="question-nav-item ${selectedQuestion?.id === question.id ? "active" : ""}" onclick="selectQuestion('${question.id}')" type="button">
                  <span class="question-nav-number">Q${index + 1}</span>
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
          ${selectedQuestion ? renderQuestionDetailPanel(selectedQuestion, selectedDisplayNumber) : `<div class="notice">Select a question to edit.</div>`}
        </div>
      </div>
      <p class="hint">Use the same Group value for questions that share one passage. Questions inside a group stay in original order.</p>
    </div>
  `;
}

function renderQuestionDetailPanel(question, displayNumber = question.number || 1) {
  return `
    <section class="question-detail-panel">
      <div class="section-head">
        <div>
          <h3>Question ${displayNumber} Details</h3>
          <p class="subtle">Use this panel for longer content and images.</p>
        </div>
        <button class="danger" onclick="deleteQuestion(selectedExamId, '${question.id}', ${displayNumber})" type="button">Delete Question</button>
      </div>
      <div id="questionPreview-${question.id}" class="question-live-preview">
        ${renderQuestionLivePreview(question, displayNumber)}
      </div>
      <div class="grid two">
        <div class="field">
          <label>Question text</label>
          ${renderFormatToolbar(question.id, "questionText")}
          <textarea data-q="${question.id}" data-field="questionText" oninput="updateQuestionLivePreview('${question.id}')" placeholder="Type the question here, or leave blank if the image contains the full question.">${escapeHtml(question.questionText || "")}</textarea>
          <p class="hint">Formatting: select text, then use Bold, Italic, or Underline. If a prompt says “underlined,” mark the exact word with the Underline button or write __word__ in CSV. The quality check flags a missing underline.</p>
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
              <input data-q="${question.id}" data-field="answer" value="${escapeHtml(question.answer)}" placeholder="${questionAnswerPlaceholder(question.type)}" />
            </div>
            <div class="field">
              <label>Answer type</label>
              <select data-q="${question.id}" data-field="type" onchange="updateQuestionLivePreview('${question.id}')">${renderQuestionTypeOptions(question.type)}</select>
            </div>
            <div class="field">
              <label>${questionChoicesLabel(question.type)}</label>
              <input data-q="${question.id}" data-field="choices" value="${escapeHtml((question.choices || []).join(", "))}" placeholder="${questionChoicesPlaceholder(question.type)}" />
            </div>
            ${normalizeQuestionType(question.type) === "drag_drop" ? `<div class="field"><label>Drop zones</label><input data-q="${question.id}" data-field="dragTargets" value="${escapeHtml((question.dragTargets || []).join(", "))}" placeholder="Example: Even, Odd" /></div>` : ""}
            ${normalizeQuestionType(question.type) === "table_grid" ? `<div class="field"><label>Claim / evidence rows</label><input data-q="${question.id}" data-field="gridRows" value="${escapeHtml((question.gridRows || []).join(", "))}" placeholder="Separate statements with commas" /></div>` : ""}
            <div class="field">
              <label>Skill</label>
              <input data-q="${question.id}" data-field="skill" value="${escapeHtml(question.skill || "")}" placeholder="Ratios, Geometry, Grammar..." />
            </div>
            <div class="field">
              <label>Difficulty</label>
              <input data-q="${question.id}" data-field="difficulty" type="number" min="1" max="4" value="${escapeHtml(question.difficulty || "")}" placeholder="1-4" />
            </div>
            <div class="field">
              <label>Source question ID</label>
              <input data-q="${question.id}" data-field="sourceQuestionId" value="${escapeHtml(question.sourceQuestionId || "")}" placeholder="From CSV" />
            </div>
            <div class="field">
              <label>Question font</label>
              <select data-q="${question.id}" data-field="questionFont" onchange="updateQuestionLivePreview('${question.id}')">
                ${renderQuestionFontOptions(question.questionFont)}
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="grid two">
        <div class="field">
          <label>Passage title</label>
          <input data-q="${question.id}" data-field="passageTitle" value="${escapeHtml(question.passageTitle || "")}" placeholder="Reading Passage 1" />
        </div>
        <div class="field">
          <label>Passage text</label>
          ${renderFormatToolbar(question.id, "passageText")}
          <textarea data-q="${question.id}" data-field="passageText" oninput="updateQuestionLivePreview('${question.id}')" placeholder="Shared passage text for this group">${escapeHtml(question.passageText || "")}</textarea>
        </div>
      </div>
      <div class="grid two">
        <div class="field">
          <label>Question image</label>
          <input data-q="${question.id}" data-field="imageUrl" value="${escapeHtml(question.imageUrl || "")}" oninput="updateQuestionLivePreview('${question.id}')" placeholder="Paste image URL, or upload below" />
          <div class="image-tools">
            <input type="file" accept="image/*" onchange="uploadQuestionImage('${question.id}', 'imageUrl', this.files[0])" />
            <button class="primary-light" onclick="generateQuestionVisual('${question.id}')" type="button">Generate Visual</button>
            <button class="ghost" onclick="setQuestionImage('${question.id}', 'math')" type="button">Use Sample</button>
            <button class="ghost" onclick="clearQuestionImage('${question.id}', 'imageUrl')" type="button">Remove Image</button>
          </div>
          <p class="hint">Teacher-only helper: creates a draft graph/table from the question text. Preview it first, then save if it looks right.</p>
          <div class="editor-image-preview">${renderEditorImagePreview(question.imageUrl, "Question image preview")}</div>
        </div>
        <div class="field">
          <label>Shared passage image</label>
          <input data-q="${question.id}" data-field="sharedImageUrl" value="${escapeHtml(question.sharedImageUrl || "")}" oninput="updateQuestionLivePreview('${question.id}')" placeholder="Same passage image for multiple English questions" />
          <div class="image-tools">
            <input type="file" accept="image/*" onchange="uploadQuestionImage('${question.id}', 'sharedImageUrl', this.files[0])" />
            <button class="ghost" onclick="setQuestionImage('${question.id}', 'passage')" type="button">Use Sample</button>
          </div>
          <div class="editor-image-preview">${renderEditorImagePreview(question.sharedImageUrl, "Shared passage image preview")}</div>
        </div>
      </div>
      <div class="field">
        <label>Answer explanation</label>
        <textarea data-q="${question.id}" data-field="explanation" placeholder="Optional explanation used for admin review and reports.">${escapeHtml(question.explanation || "")}</textarea>
      </div>
    </section>
  `;
}

function renderFormatToolbar(questionId, field) {
  return `
    <div class="format-toolbar">
      <button class="mini" onclick="applyTextFormat('${questionId}', '${field}', '**', '**')" type="button">B</button>
      <button class="mini italic-tool" onclick="applyTextFormat('${questionId}', '${field}', '*', '*')" type="button">I</button>
      <button class="mini underline-tool" onclick="applyTextFormat('${questionId}', '${field}', '__', '__')" type="button">U</button>
    </div>
  `;
}

function renderBankFormatToolbar(questionId, field) {
  return `
    <div class="format-toolbar">
      <button class="mini" onclick="applyBankTextFormat('${questionId}', '${field}', '**', '**')" type="button">B</button>
      <button class="mini italic-tool" onclick="applyBankTextFormat('${questionId}', '${field}', '*', '*')" type="button">I</button>
      <button class="mini underline-tool" onclick="applyBankTextFormat('${questionId}', '${field}', '__', '__')" type="button">U</button>
    </div>
  `;
}

function applyTextFormat(questionId, field, before, after) {
  const input = document.querySelector(`[data-q="${questionId}"][data-field="${field}"]`);
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const selected = input.value.slice(start, end) || "important text";
  input.value = `${input.value.slice(0, start)}${before}${selected}${after}${input.value.slice(end)}`;
  input.focus();
  input.selectionStart = start + before.length;
  input.selectionEnd = start + before.length + selected.length;
  updateQuestionLivePreview(questionId);
}

function applyBankTextFormat(questionId, field, before, after) {
  const input = document.querySelector(`[data-bank-q="${questionId}"][data-field="${field}"]`);
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const selected = input.value.slice(start, end) || "important text";
  input.value = `${input.value.slice(0, start)}${before}${selected}${after}${input.value.slice(end)}`;
  input.focus();
  input.selectionStart = start + before.length;
  input.selectionEnd = start + before.length + selected.length;
  updateBankQuestionLivePreview(questionId);
}

function getQuestionDraftFromDom(questionId, sourceQuestion = {}) {
  const draft = { ...sourceQuestion };
  document.querySelectorAll(`[data-q="${questionId}"][data-field]`).forEach((input) => {
    const field = input.dataset.field;
    const value = input.value.trim();
    if (field === "choices") draft.choices = isOptionQuestionType(draft.type) ? parseOptionValuesInput(value, draft.choices) : parseChoicesInput(value, draft.choices);
    else if (field === "dragTargets" || field === "gridRows") draft[field] = parseOptionValuesInput(value, draft[field]);
    else if (field === "originalNumber") draft.originalNumber = Number.parseInt(value, 10) || draft.number;
    else if (field === "difficulty") draft.difficulty = Number.parseInt(value, 10) || "";
    else if (field === "answer") draft.answer = ["multiple", "numeric", "equation"].includes(normalizeQuestionType(draft.type)) ? value.toUpperCase() : value;
    else draft[field] = value;
  });
  return draft;
}

function getBankQuestionDraftFromDom(questionId, sourceQuestion = {}) {
  const draft = { ...sourceQuestion };
  document.querySelectorAll(`[data-bank-q="${questionId}"][data-field]`).forEach((input) => {
    const field = input.dataset.field;
    const value = input.value.trim();
    if (field === "choices") draft.choices = isOptionQuestionType(draft.type) ? parseOptionValuesInput(value, draft.choices) : parseChoicesInput(value, draft.choices);
    else if (field === "dragTargets" || field === "gridRows") draft[field] = parseOptionValuesInput(value, draft[field]);
    else if (field === "originalNumber") draft.originalNumber = Number.parseInt(value, 10) || draft.number;
    else if (field === "difficulty") draft.difficulty = Number.parseInt(value, 10) || "";
    else if (field === "answer") draft.answer = ["multiple", "numeric", "equation"].includes(normalizeQuestionType(draft.type)) ? value.toUpperCase() : value;
    else draft[field] = value;
  });
  return draft;
}

function renderEditorImagePreview(imageUrl, altText) {
  if (!imageUrl) return `<div class="notice compact">No image selected.</div>`;
  return `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" onerror="this.outerHTML='<div class=&quot;notice bad compact&quot;>Image could not load. Check the URL or upload again.</div>'" />`;
}

function renderQuestionLivePreview(question, displayNumber = null) {
  const draft = { ...question, number: question.number || 1, section: question.section || "Section 1" };
  const visibleNumber = displayNumber || draft.originalNumber || draft.number;
  const draftType = normalizeQuestionType(draft.type);
  const usesInlineBlank = draftType === "dropdown" && String(draft.questionText || "").includes("[[blank]]");
  const usesHotText = draftType === "hot_text";
  const usesHotspot = draftType === "hotspot";
  return `
    <div class="preview-label">Student Preview</div>
    <article class="question preview-question" data-section="${escapeHtml(draft.section)}" data-original-number="${draft.originalNumber || draft.number}">
      ${draft.passageText ? `<section class="passage-text-block preview-passage">${draft.passageTitle ? `<h3>${escapeHtml(draft.passageTitle)}</h3>` : ""}<div class="passage-rich-text">${formatRichText(draft.passageText)}</div></section>` : ""}
      ${draft.sharedImageUrl ? renderEditorImagePreview(draft.sharedImageUrl, "Shared passage image preview") : ""}
      <div class="question-title">
        <span>Question ${escapeHtml(visibleNumber)}</span>
        <span class="subtle">${escapeHtml(draft.section)}</span>
      </div>
      <p class="question-instruction">${escapeHtml(getQuestionInstruction(draft.type))}</p>
      ${usesInlineBlank ? renderDropdownPrompt(draft, "", true) : usesHotText ? renderHotTextPrompt(draft, "", true) : renderQuestionTextWithInlineMedia(draft, { preview: true, mediaPrefix: "preview-question" })}
      ${draft.imageUrl && !usesHotspot ? renderEditorImagePreview(draft.imageUrl, "Question image preview") : ""}
      ${usesInlineBlank || usesHotText ? "" : renderStudentAnswerControl(draft, "", { preview: true })}
    </article>
  `;
}

function renderDropdownSelect(question, current = "", preview = false) {
  const options = Array.isArray(question.choices) ? question.choices : [];
  const id = `dropdown-${question.id}`;
  return `<select id="${escapeHtml(id)}" class="inline-choice-select" ${preview ? "disabled" : `onchange="setTextAnswer('${escapeJs(question.id)}', this.value)"`}><option value="">Choose...</option>${options.map((option) => `<option value="${escapeHtml(option)}" ${current === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
}

function renderDropdownPrompt(question, current = "", preview = false) {
  const text = formatQuestionTextForDisplay(question, question.questionText || "");
  const control = renderDropdownSelect(question, current, preview);
  return `<div class="question-text dropdown-question-text">${text.replace("[[blank]]", control)}</div>`;
}

function parseDragAnswer(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function renderDragDropControl(question, current = "", preview = false) {
  const items = Array.isArray(question.choices) ? question.choices : [];
  const targets = Array.isArray(question.dragTargets) ? question.dragTargets : [];
  const mapping = parseDragAnswer(current);
  const unassigned = items.filter((item) => !mapping[item]);
  const placedCount = items.length - unassigned.length;
  if (!items.length || !targets.length) return `<div class="notice bad compact">Drag-and-drop needs items and at least one drop zone.</div>`;
  return `
    <div class="drag-drop-widget" data-question-id="${escapeHtml(question.id)}">
      <div class="drag-drop-head"><p class="hint">Move every item into the category where it belongs. You can drag, or select an item and then select its category.</p><span class="pill ${placedCount === items.length ? "ok" : ""}">Placed ${placedCount} of ${items.length}</span></div>
      <div class="drag-items" aria-label="Drag items">
        ${unassigned.length ? unassigned.map((item) => `<button class="drag-item ${activeDragItems[question.id] === item ? "selected" : ""}" type="button" draggable="${preview ? "false" : "true"}" ${preview ? "disabled" : `ondragstart="startDragItem(event, '${escapeJs(question.id)}', '${escapeJs(item)}')" onclick="selectDragItem('${escapeJs(question.id)}', '${escapeJs(item)}')"`}>${escapeHtml(item)}</button>`).join("") : `<span class="drag-empty">All items have been placed.</span>`}
      </div>
      <div class="drop-zone-grid">
        ${targets.map((target) => {
          const assigned = items.filter((item) => mapping[item] === target);
          return `<div class="drop-zone" role="button" tabindex="${preview ? "-1" : "0"}" ${preview ? "" : `ondragover="allowDragDrop(event)" ondrop="dropDragItem(event, '${escapeJs(question.id)}', '${escapeJs(target)}')" onclick="assignSelectedDragItem('${escapeJs(question.id)}', '${escapeJs(target)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();assignSelectedDragItem('${escapeJs(question.id)}', '${escapeJs(target)}')}"`}><strong>${escapeHtml(target)}</strong><span class="drop-zone-content">${assigned.length ? assigned.map((item) => `<button class="placed-chip" type="button" ${preview ? "disabled" : `onclick="event.stopPropagation();removeDragItem('${escapeJs(question.id)}', '${escapeJs(item)}')"`} aria-label="Remove ${escapeHtml(item)} from ${escapeHtml(target)}">${escapeHtml(item)} <b aria-hidden="true">×</b></button>`).join("") : `<span class="drop-zone-placeholder">Drop item here</span>`}</span></div>`;
        }).join("")}
      </div>
      ${preview ? "" : `<div><button class="ghost small drag-reset" type="button" onclick="clearDragAssignments('${escapeJs(question.id)}')">Reset placements</button></div>`}
    </div>
  `;
}

function renderTableGridControl(question, current = "", preview = false) {
  const rows = Array.isArray(question.gridRows) ? question.gridRows : [];
  const columns = Array.isArray(question.choices) ? question.choices : [];
  const mapping = parseDragAnswer(current);
  const answeredCount = rows.filter((_, index) => mapping[String(index + 1)]).length;
  if (!rows.length || !columns.length) return `<div class="notice bad compact">Claim / evidence table needs statements and answer columns.</div>`;
  return `
    <div class="table-grid-widget">
      <p class="hint">Classify each statement using the evidence labels. ${answeredCount} of ${rows.length} completed.</p>
      <div class="table-grid-scroll"><table class="claim-evidence-table"><thead><tr><th scope="col">Statement to evaluate</th>${columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("")}</tr></thead><tbody>
        ${rows.map((row, index) => `<tr><th scope="row">${escapeHtml(row)}</th>${columns.map((column) => `<td><label class="claim-evidence-radio"><input type="radio" name="table-${escapeHtml(question.id)}-${index + 1}" value="${escapeHtml(column)}" ${mapping[String(index + 1)] === column ? "checked" : ""} ${preview ? "disabled" : `onchange="setTableGridAnswer('${escapeJs(question.id)}', ${index + 1}, '${escapeJs(column)}')"`} /><span>${escapeHtml(column)}</span></label></td>`).join("")}</tr>`).join("")}
      </tbody></table></div>
    </div>
  `;
}

function parseHotTextAnswer(value) {
  return [...new Set(String(value || "").split(/[;|\n]+/).map((item) => item.trim()).filter(Boolean))];
}

function renderHotTextPrompt(question, current = "", preview = false) {
  const selected = new Set(parseHotTextAnswer(current).map((item) => item.toUpperCase()));
  const choices = Array.isArray(question.choices) ? question.choices.filter(Boolean) : [];
  let text = formatQuestionTextForDisplay(question, question.questionText || "");
  let matched = false;
  choices.forEach((choice) => {
    const safeChoice = escapeHtml(choice);
    if (!safeChoice || !text.includes(safeChoice)) return;
    matched = true;
    const isSelected = selected.has(String(choice).toUpperCase());
    const button = `<button class="hot-text-mark ${isSelected ? "selected" : ""}" type="button" ${preview ? "disabled" : `onclick="toggleHotTextAnswer('${escapeJs(question.id)}', '${escapeJs(choice)}')"`} aria-pressed="${isSelected}">${safeChoice}</button>`;
    text = text.split(safeChoice).join(button);
  });
  return `
    <div class="hot-text-widget">
      <p class="hint">Select every word or phrase that answers the question.</p>
      <div class="question-text hot-text-prompt">${text}</div>
      ${matched ? "" : `<div class="hot-text-chip-list">${choices.map((choice) => `<button class="hot-text-mark ${selected.has(String(choice).toUpperCase()) ? "selected" : ""}" type="button" ${preview ? "disabled" : `onclick="toggleHotTextAnswer('${escapeJs(question.id)}', '${escapeJs(choice)}')"`}>${escapeHtml(choice)}</button>`).join("")}</div>`}
    </div>
  `;
}

function parseHotspots(question) {
  return (Array.isArray(question.choices) ? question.choices : []).map((value, index) => {
    const parts = String(value || "").split("::").map((item) => item.trim());
    const [id = `spot${index + 1}`, label = `Hot spot ${index + 1}`, left = "40", top = "40", width = "16", height = "16"] = parts;
    return {
      id: id || `spot${index + 1}`,
      label: label || id || `Hot spot ${index + 1}`,
      left: Math.max(0, Math.min(95, Number.parseFloat(left) || 0)),
      top: Math.max(0, Math.min(95, Number.parseFloat(top) || 0)),
      width: Math.max(4, Math.min(100, Number.parseFloat(width) || 16)),
      height: Math.max(4, Math.min(100, Number.parseFloat(height) || 16)),
    };
  });
}

function renderHotspotControl(question, current = "", preview = false) {
  const hotspots = parseHotspots(question);
  if (!question.imageUrl) return `<div class="notice bad compact">Hot spot questions need a question image.</div>`;
  if (!hotspots.length) return `<div class="notice bad compact">Hot spot questions need zones in Options: id::label::left%::top%::width%::height%.</div>`;
  return `
    <div class="hotspot-widget">
      <p class="hint">Select the correct area of the image.</p>
      <div class="hotspot-stage">
        <img src="${escapeHtml(question.imageUrl)}" alt="Question image for hot spot selection" />
        ${hotspots.map((spot) => `<button class="hotspot-target ${String(current).toUpperCase() === String(spot.id).toUpperCase() ? "selected" : ""}" type="button" aria-label="${escapeHtml(spot.label)}" title="${escapeHtml(spot.label)}" style="left:${spot.left}%;top:${spot.top}%;width:${spot.width}%;height:${spot.height}%;" ${preview ? "disabled" : `onclick="setHotspotAnswer('${escapeJs(question.id)}', '${escapeJs(spot.id)}')"`}><span>${escapeHtml(spot.label)}</span></button>`).join("")}
      </div>
      <p class="hint">Use Tab to move through areas; press Enter or Space to select one.</p>
    </div>
  `;
}

function renderStudentAnswerControl(question, current = "", options = {}) {
  const type = normalizeQuestionType(question.type);
  const preview = options.preview === true;
  const displayNumber = options.displayNumber || null;
  if (["numeric", "equation"].includes(type)) return preview ? `<input placeholder="Student math answer: 3/4, √5, 2², x=4" disabled />` : renderShortAnswerInput(question, current, type === "equation", displayNumber);
  if (type === "fill_blank") return isMathQuestion(question) ? (preview ? `<input placeholder="Student math answer: 3/4, √5, ∞" disabled />` : renderShortAnswerInput(question, current, false, displayNumber)) : `<div class="fill-blank-box"><input class="short-answer-input" value="${escapeHtml(current)}" placeholder="Type your answer" ${preview ? "disabled" : `oninput="setTextAnswer('${escapeJs(question.id)}', this.value)"`} /></div>`;
  if (type === "dropdown") return `<div class="dropdown-answer-box">${renderDropdownSelect(question, current, preview)}</div>`;
  if (type === "drag_drop") return renderDragDropControl(question, current, preview);
  if (type === "table_grid") return renderTableGridControl(question, current, preview);
  if (type === "hot_text") return renderHotTextPrompt(question, current, preview);
  if (type === "hotspot") return renderHotspotControl(question, current, preview);
  const choiceLabels = Array.isArray(question.choices) && question.choices.length ? question.choices : LETTERS;
  const choiceTextByLabel = extractChoiceTextByLabel(question.questionText, choiceLabels);
  return `<div class="choices student-choice-grid">${choiceLabels.map((choice, index) => {
    const label = String(choice || "").trim();
    const displayLabel = /^[A-Z]$/i.test(label) ? label.toUpperCase() : String.fromCharCode(65 + index);
    const choiceText = choiceTextByLabel[displayLabel] || (label !== displayLabel ? label : "");
    return `<button class="choice student-choice ${current === label ? "selected" : ""}" type="button" ${preview ? "disabled" : `data-original-number="${question.originalNumber || question.number}" data-section="${escapeHtml(question.section)}" data-choice="${escapeHtml(label)}" onclick="setAnswer('${escapeJs(question.id)}', this.dataset.choice)"`}><span class="student-choice-letter">${escapeHtml(displayLabel)}</span><span class="student-choice-copy">${escapeHtml(choiceText || `Answer choice ${displayLabel}`)}</span></button>`;
  }).join("")}</div>`;
}

function updateQuestionLivePreview(questionId) {
  const exam = state.exams.find((item) => item.id === selectedExamId);
  const question = exam?.questions.find((item) => item.id === questionId) || {};
  const draft = getQuestionDraftFromDom(questionId, question);
  const orderedQuestions = [...(exam?.questions || [])].sort((left, right) => (Number(left.number) || 0) - (Number(right.number) || 0));
  const displayNumber = orderedQuestions.findIndex((item) => item.id === questionId) + 1 || question.number || 1;
  const preview = document.querySelector(`#questionPreview-${questionId}`);
  if (preview) preview.innerHTML = renderQuestionLivePreview(draft, displayNumber);
  document.querySelectorAll(`[data-q="${questionId}"][data-field="imageUrl"], [data-q="${questionId}"][data-field="sharedImageUrl"]`).forEach((input) => {
    const previewBox = input.closest(".field")?.querySelector(".editor-image-preview");
    if (previewBox) previewBox.innerHTML = renderEditorImagePreview(input.value.trim(), input.dataset.field === "imageUrl" ? "Question image preview" : "Shared passage image preview");
  });
}

function updateBankQuestionLivePreview(questionId) {
  const question = state.questionBank.find((item) => item.id === questionId) || {};
  const draft = getBankQuestionDraftFromDom(questionId, question);
  const preview = document.querySelector(`#bankQuestionPreview-${questionId}`);
  if (preview) preview.innerHTML = renderQuestionLivePreview(draft);
  document.querySelectorAll(`[data-bank-q="${questionId}"][data-field="imageUrl"], [data-bank-q="${questionId}"][data-field="sharedImageUrl"]`).forEach((input) => {
    const previewBox = input.closest(".field")?.querySelector(".editor-image-preview");
    if (previewBox) previewBox.innerHTML = renderEditorImagePreview(input.value.trim(), input.dataset.field === "imageUrl" ? "Question image preview" : "Shared passage image preview");
  });
}

async function addSingleBankQuestion() {
  try {
    const result = await api("/api/admin/question-bank/add", {
      method: "POST",
      body: JSON.stringify({
        idPrefix: $("#singleBankIdPrefix")?.value || "Q",
        testClass: $("#singleBankTestClass")?.value || "",
        section: $("#singleBankSection")?.value || "Section 1",
        type: $("#singleBankType")?.value || "multiple",
      }),
    });
    if (result.question) {
      state = { ...state, questionBank: [result.question, ...(state.questionBank || []).filter((item) => item.id !== result.question.id)] };
      bankFilteredCache = null;
    } else {
      state = result;
    }
    selectedBankQuestionId = result.question?.id || state.questionBank[0]?.id || null;
    bankListSort = "newest";
    bankPage = 0;
    adminActiveTab = "bank";
    renderAdminPreserveScroll();
  } catch (error) {
    alert(error.message);
  }
}

function selectQuestion(questionId) {
  const exam = state.exams.find((item) => item.id === selectedExamId);
  if (exam) syncQuestionEditsFromDom(exam);
  selectedQuestionId = questionId;
  renderAdminPreserveScroll();
}

function syncQuestionEditsFromDom(exam) {
  if (!exam) return;
  const questionMap = new Map(exam.questions.map((question) => [question.id, question]));
  document.querySelectorAll("[data-q][data-field]").forEach((input) => {
    const question = questionMap.get(input.dataset.q);
    if (!question) return;
    const field = input.dataset.field;
    const value = input.value.trim();
    if (field === "choices") question.choices = isOptionQuestionType(question.type) ? parseOptionValuesInput(value, question.choices) : parseChoicesInput(value, question.choices);
    else if (field === "originalNumber") question.originalNumber = Number.parseInt(value, 10) || question.number;
    else if (field === "difficulty") question.difficulty = Number.parseInt(value, 10) || "";
    else if (field === "answer") question.answer = ["multiple", "numeric", "equation"].includes(normalizeQuestionType(question.type)) ? value.toUpperCase() : value;
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

function parseOptionValuesInput(value, fallback = []) {
  const items = String(value || "")
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? [...new Set(items)] : fallback || [];
}

function setQuestionImage(questionId, sampleType) {
  const field = sampleType === "passage" ? "sharedImageUrl" : "imageUrl";
  const input = document.querySelector(`[data-q="${questionId}"][data-field="${field}"]`);
  if (input) input.value = sampleType === "passage" ? SAMPLE_PASSAGE_IMAGE : SAMPLE_MATH_IMAGE;
  updateQuestionLivePreview(questionId);
}

function clearQuestionImage(questionId, field = "imageUrl") {
  const input = document.querySelector(`[data-q="${questionId}"][data-field="${field}"]`);
  if (input) input.value = "";
  updateQuestionLivePreview(questionId);
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
    updateQuestionLivePreview(questionId);
  };
  reader.readAsDataURL(file);
}

function generateQuestionVisual(questionId) {
  const exam = state.exams.find((item) => item.id === selectedExamId);
  const question = exam?.questions.find((item) => item.id === questionId) || {};
  const draft = getQuestionDraftFromDom(questionId, question);
  const visual = buildQuestionVisual(draft);
  const input = document.querySelector(`[data-q="${questionId}"][data-field="imageUrl"]`);
  if (!input) return;
  if (input.value.trim() && !confirm("Replace the current question image with a generated visual?")) return;
  input.value = visual.url;
  updateQuestionLivePreview(questionId);
  alert(`Generated ${visual.label}. Please check the preview before saving.`);
}

function buildQuestionVisual(question) {
  const sourceText = [question.questionText, question.passageText, question.explanation].filter(Boolean).join("\n");
  const lower = sourceText.toLowerCase();
  if (/table|row|column/.test(lower)) return { label: "table draft", url: svgDataUrl(renderGeneratedTableSvg(sourceText, question)) };
  if (/number\s*line|integer line|on the line/.test(lower)) return { label: "number line draft", url: svgDataUrl(renderGeneratedNumberLineSvg(sourceText, question)) };
  if (/triangle|circle|rectangle|square|angle|parallel|perpendicular/.test(lower)) return { label: "geometry draft", url: svgDataUrl(renderGeneratedGeometrySvg(sourceText, question)) };
  if (/graph|coordinate|slope|intercept|function|linear|line|y\s*=|\([+-]?\d/.test(lower)) return { label: "coordinate graph draft", url: svgDataUrl(renderGeneratedGraphSvg(sourceText, question)) };
  return { label: "visual draft", url: svgDataUrl(renderGeneratedDiagramSvg(sourceText, question)) };
}

function svgDataUrl(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function svgText(value) {
  return escapeHtml(String(value || "")).replace(/\s+/g, " ").trim();
}

function truncateSvgText(value, max = 76) {
  const text = svgText(value);
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function extractQuestionVisualTitle(question, fallback) {
  return truncateSvgText(question.passageTitle || question.skill || question.section || fallback, 62);
}

function extractNumbersFromText(text, limit = 12) {
  return [...String(text || "").matchAll(/[+-]?\d+(?:\.\d+)?/g)].map((match) => Number(match[0])).filter(Number.isFinite).slice(0, limit);
}

function extractCoordinatePairs(text, limit = 8) {
  return [...String(text || "").matchAll(/\(([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\)/g)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .slice(0, limit);
}

function parseLinearEquation(text) {
  const compact = String(text || "").replace(/[−–—]/g, "-").replace(/\s+/g, "");
  const match = compact.match(/y=([+-]?(?:\d+(?:\.\d+)?|\.\d+)?)x([+-]\d+(?:\.\d+)?)?/i);
  if (!match) return null;
  const slopeText = match[1];
  const slope = slopeText === "" || slopeText === "+" ? 1 : slopeText === "-" ? -1 : Number(slopeText);
  const intercept = match[2] ? Number(match[2]) : 0;
  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;
  return { slope, intercept };
}

function renderGeneratedGraphSvg(text, question) {
  const title = extractQuestionVisualTitle(question, "Generated Coordinate Graph");
  const points = extractCoordinatePairs(text);
  const equation = parseLinearEquation(text);
  const plot = { x: 76, y: 42, w: 572, h: 318 };
  const scaleX = (value) => plot.x + ((value + 10) / 20) * plot.w;
  const scaleY = (value) => plot.y + plot.h - ((value + 10) / 20) * plot.h;
  const grid = Array.from({ length: 21 }, (_, index) => index - 10)
    .map((value) => {
      const x = scaleX(value);
      const y = scaleY(value);
      const major = value === 0;
      return `<line x1="${x}" y1="${plot.y}" x2="${x}" y2="${plot.y + plot.h}" stroke="${major ? "#10263d" : "#d8e1ea"}" stroke-width="${major ? 2 : 1}"/><line x1="${plot.x}" y1="${y}" x2="${plot.x + plot.w}" y2="${y}" stroke="${major ? "#10263d" : "#d8e1ea"}" stroke-width="${major ? 2 : 1}"/>`;
    })
    .join("");
  const line =
    equation
      ? `<line x1="${scaleX(-10)}" y1="${scaleY(equation.slope * -10 + equation.intercept)}" x2="${scaleX(10)}" y2="${scaleY(equation.slope * 10 + equation.intercept)}" stroke="#1888bd" stroke-width="5" stroke-linecap="round"/>`
      : "";
  const pointMarks = points
    .map((point) => `<circle cx="${scaleX(Math.max(-10, Math.min(10, point.x)))}" cy="${scaleY(Math.max(-10, Math.min(10, point.y)))}" r="6" fill="#f5b700"/><text x="${scaleX(Math.max(-10, Math.min(10, point.x))) + 8}" y="${scaleY(Math.max(-10, Math.min(10, point.y))) - 8}" font-family="Arial" font-size="14" fill="#10263d">(${point.x}, ${point.y})</text>`)
    .join("");
  const label = equation ? `y = ${equation.slope}x${equation.intercept ? ` ${equation.intercept > 0 ? "+" : "-"} ${Math.abs(equation.intercept)}` : ""}` : points.length ? "Plotted points from question text" : "Draft coordinate grid";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="430" viewBox="0 0 760 430">
    <rect width="760" height="430" fill="#f8fbfd"/>
    <rect x="26" y="18" width="708" height="392" rx="12" fill="#ffffff" stroke="#c8dfea" stroke-width="2"/>
    <text x="48" y="34" font-family="Arial" font-size="18" font-weight="700" fill="#10263d">${title}</text>
    ${grid}${line}${pointMarks}
    <text x="662" y="374" font-family="Arial" font-size="16" fill="#64748b">x</text>
    <text x="54" y="52" font-family="Arial" font-size="16" fill="#64748b">y</text>
    <text x="48" y="396" font-family="Arial" font-size="15" fill="#10263d">${svgText(label)}</text>
  </svg>`;
}

function renderGeneratedTableSvg(text, question) {
  const title = extractQuestionVisualTitle(question, "Generated Table");
  const nums = extractNumbersFromText(text, 18);
  const rows = [];
  for (let index = 0; index < Math.max(6, Math.ceil(nums.length / 2)); index += 1) {
    rows.push([nums[index * 2] ?? "", nums[index * 2 + 1] ?? ""]);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="430" viewBox="0 0 760 430">
    <rect width="760" height="430" fill="#f8fbfd"/>
    <rect x="64" y="36" width="632" height="348" rx="10" fill="#ffffff" stroke="#c8dfea" stroke-width="2"/>
    <text x="88" y="75" font-family="Arial" font-size="22" font-weight="700" fill="#10263d">${title}</text>
    <rect x="118" y="104" width="524" height="44" fill="#eaf6fb"/>
    <text x="188" y="132" font-family="Arial" font-size="18" font-weight="700" fill="#10263d">x / Input</text>
    <text x="450" y="132" font-family="Arial" font-size="18" font-weight="700" fill="#10263d">y / Output</text>
    ${rows
      .slice(0, 6)
      .map((row, index) => {
        const y = 148 + index * 36;
        return `<rect x="118" y="${y}" width="524" height="36" fill="${index % 2 ? "#ffffff" : "#f8fafc"}" stroke="#d8e1ea"/><line x1="380" y1="${y}" x2="380" y2="${y + 36}" stroke="#d8e1ea"/><text x="202" y="${y + 24}" font-family="Arial" font-size="17" fill="#10263d">${svgText(row[0])}</text><text x="466" y="${y + 24}" font-family="Arial" font-size="17" fill="#10263d">${svgText(row[1])}</text>`;
      })
      .join("")}
    <text x="88" y="362" font-family="Arial" font-size="14" fill="#64748b">Draft table generated from numbers found in the question text.</text>
  </svg>`;
}

function renderGeneratedNumberLineSvg(text, question) {
  const title = extractQuestionVisualTitle(question, "Generated Number Line");
  const nums = extractNumbersFromText(text, 8);
  const min = Math.min(-10, ...nums);
  const max = Math.max(10, ...nums);
  const scale = (value) => 92 + ((value - min) / (max - min || 1)) * 576;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="300" viewBox="0 0 760 300">
    <rect width="760" height="300" fill="#f8fbfd"/>
    <rect x="44" y="34" width="672" height="228" rx="12" fill="#ffffff" stroke="#c8dfea" stroke-width="2"/>
    <text x="70" y="76" font-family="Arial" font-size="22" font-weight="700" fill="#10263d">${title}</text>
    <line x1="92" y1="160" x2="668" y2="160" stroke="#10263d" stroke-width="4"/>
    <polygon points="668,160 650,150 650,170" fill="#10263d"/>
    ${Array.from({ length: 11 }, (_, index) => min + ((max - min) / 10) * index)
      .map((value) => `<line x1="${scale(value)}" y1="146" x2="${scale(value)}" y2="174" stroke="#64748b" stroke-width="2"/><text x="${scale(value) - 12}" y="198" font-family="Arial" font-size="13" fill="#64748b">${Math.round(value * 10) / 10}</text>`)
      .join("")}
    ${nums.map((value) => `<circle cx="${scale(value)}" cy="160" r="8" fill="#f5b700"/><text x="${scale(value) - 10}" y="132" font-family="Arial" font-size="16" font-weight="700" fill="#10263d">${svgText(value)}</text>`).join("")}
  </svg>`;
}

function renderGeneratedGeometrySvg(text, question) {
  const title = extractQuestionVisualTitle(question, "Generated Geometry Diagram");
  const lower = String(text || "").toLowerCase();
  const shape =
    /circle/.test(lower)
      ? `<circle cx="380" cy="208" r="106" fill="#eaf6fb" stroke="#1888bd" stroke-width="5"/><line x1="380" y1="208" x2="486" y2="208" stroke="#f5b700" stroke-width="4"/><text x="421" y="198" font-family="Arial" font-size="18" fill="#10263d">r</text>`
      : /rectangle|square/.test(lower)
        ? `<rect x="236" y="130" width="288" height="156" fill="#eaf6fb" stroke="#1888bd" stroke-width="5"/><text x="358" y="122" font-family="Arial" font-size="18" fill="#10263d">length</text><text x="532" y="212" font-family="Arial" font-size="18" fill="#10263d">width</text>`
        : `<polygon points="380,92 214,306 546,306" fill="#eaf6fb" stroke="#1888bd" stroke-width="5"/><path d="M264 306 A50 50 0 0 1 295 266" fill="none" stroke="#f5b700" stroke-width="4"/><text x="284" y="288" font-family="Arial" font-size="18" fill="#10263d">angle</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="430" viewBox="0 0 760 430">
    <rect width="760" height="430" fill="#f8fbfd"/>
    <rect x="44" y="34" width="672" height="358" rx="12" fill="#ffffff" stroke="#c8dfea" stroke-width="2"/>
    <text x="70" y="76" font-family="Arial" font-size="22" font-weight="700" fill="#10263d">${title}</text>
    ${shape}
    <text x="70" y="372" font-family="Arial" font-size="14" fill="#64748b">Draft diagram. Check measurements and labels before saving.</text>
  </svg>`;
}

function renderGeneratedDiagramSvg(text, question) {
  const title = extractQuestionVisualTitle(question, "Generated Visual Draft");
  const summary = truncateSvgText(text || "Add details in the question text, then generate again.", 118);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="360" viewBox="0 0 760 360">
    <rect width="760" height="360" fill="#f8fbfd"/>
    <rect x="52" y="42" width="656" height="256" rx="12" fill="#ffffff" stroke="#c8dfea" stroke-width="2"/>
    <text x="82" y="88" font-family="Arial" font-size="24" font-weight="700" fill="#10263d">${title}</text>
    <line x1="104" y1="158" x2="656" y2="158" stroke="#1888bd" stroke-width="6" stroke-linecap="round"/>
    <circle cx="210" cy="158" r="18" fill="#f5b700"/>
    <circle cx="380" cy="158" r="18" fill="#f5b700"/>
    <circle cx="550" cy="158" r="18" fill="#f5b700"/>
    <text x="82" y="230" font-family="Arial" font-size="16" fill="#334155">${summary}</text>
    <text x="82" y="266" font-family="Arial" font-size="14" fill="#64748b">Draft visual generated from text. Replace or remove if it does not match the original question.</text>
  </svg>`;
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
      ${renderSubmissionReport(submission, true, { showProctoring: false, branded: true })}
    </main>
  `;
}

function printSelectedDiagnosticReport() {
  const submission = state.submissions.find((item) => item.id === selectedSubmissionId) || state.submissions[0];
  if (!submission) return;
  $("#app").innerHTML = `
    <main class="report-only stack">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print / Save PDF</button>
      </div>
      ${renderDiagnosticReport(submission, { branded: true, includeSkillAnalysis: false, compact: true })}
    </main>
  `;
}

function printCombinedDiagnosticReport() {
  const seedSubmission = state.submissions.find((item) => item.id === selectedSubmissionId) || state.submissions[0];
  const reports = getCombinedDiagnosticReports(seedSubmission);
  if (reports.length < 2) {
    alert("This student does not have two completed subjects under the same test code yet.");
    return;
  }
  const testCode = String(state.exams.find((exam) => exam.id === seedSubmission.examId)?.code || "").trim().toUpperCase();
  $("#app").innerHTML = `
    <main class="report-only stack combined-diagnostic-packet">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print / Save ${reports.length}-Subject Packet</button>
      </div>
      <div class="combined-diagnostic-cover no-print"><strong>${escapeHtml(seedSubmission.studentName || "Student")}</strong><span>${escapeHtml(testCode)} · ${reports.length} diagnostic reports</span></div>
      ${reports.map((submission) => `<section class="combined-diagnostic-page">${renderDiagnosticReport(submission, { branded: true, includeSkillAnalysis: false, compact: true })}</section>`).join("")}
    </main>
  `;
}

function printSelectedDiagnosticPacket() {
  const selectedIds = [...document.querySelectorAll("[data-diagnostic-packet-report]:checked")].map((input) => input.value);
  const reports = getStudentDiagnosticReports(state.submissions.find((item) => item.id === selectedSubmissionId) || state.submissions[0]).filter((submission) => selectedIds.includes(submission.id));
  if (reports.length < 2) {
    alert("Choose at least two subject reports to print together.");
    return;
  }
  const studentName = reports[0]?.studentName || "Student";
  $("#app").innerHTML = `
    <main class="report-only stack combined-diagnostic-packet">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print / Save ${reports.length}-Subject Packet</button>
      </div>
      <div class="combined-diagnostic-cover no-print"><strong>${escapeHtml(studentName)}</strong><span>${reports.length} selected diagnostic reports</span></div>
      ${reports.map((submission) => `<section class="combined-diagnostic-page">${renderDiagnosticReport(submission, { branded: true, includeSkillAnalysis: false, compact: true })}</section>`).join("")}
    </main>
  `;
}

function printClassReports() {
  const classId = $("#printClassId")?.value || state.classes?.[0]?.id || "";
  const examId = $("#printClassExamId")?.value || "";
  const classRecord = (state.classes || []).find((item) => item.id === classId);
  if (!classRecord) {
    alert("Choose a class first.");
    return;
  }
  if (!examId) {
    alert("Choose the exam first. This keeps the packet and class average clear.");
    return;
  }
  const exam = state.exams.find((item) => item.id === examId);
  const reports = latestReportsPerStudent(classReportsForExam(classRecord, examId)).sort((left, right) =>
    String(left.studentName || "").localeCompare(String(right.studentName || ""))
  );
  if (!reports.length) {
    alert(`No submitted reports found for ${classRecord.name}${exam ? ` in ${exam.title}` : ""}.`);
    return;
  }
  $("#app").innerHTML = `
    <main class="report-only stack class-report-print">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print All Student Summaries</button>
      </div>
      <section class="card stack class-report-cover branded-report">
        ${renderReportBrandHeader("Class Report Packet")}
        <div class="section-head">
          <div>
            <h2>${escapeHtml(classRecord.name)}</h2>
            <p class="subtle">${escapeHtml(classRecord.term || "No term")} · ${reports.length} submitted report${reports.length === 1 ? "" : "s"}${exam ? ` · ${escapeHtml(exam.title)}` : ""}</p>
          </div>
          <span class="pill">${new Date().toLocaleDateString()}</span>
        </div>
      </section>
      ${reports.map((submission) => `<section class="student-report-print-page">${renderSubmissionReport(submission, true, { showProctoring: false, branded: true, compactPrint: true })}</section>`).join("")}
    </main>
  `;
}

function getTeacherBankQuestions(checkedOnly = false) {
  const source = checkedOnly
    ? (state.questionBank || []).filter((question) => selectedBankQuestionIds.has(question.id))
    : getFilteredBankQuestions();
  return [...source].sort(
    (left, right) =>
      (Number(left.bankNumber) || 999999) - (Number(right.bankNumber) || 999999) ||
      (Number(left.originalNumber) || 999999) - (Number(right.originalNumber) || 999999)
  );
}

function printTeacherBankVersion(checkedOnly = false) {
  const questions = getTeacherBankQuestions(checkedOnly);
  if (!questions.length) {
    alert(checkedOnly ? "Check at least one bank question first." : "No bank questions match the current filter.");
    return;
  }
  const titleParts = [
    bankClassFilter !== "all" ? bankClassFilter : "",
    bankSkillFilter !== "all" ? bankSkillFilter : "",
    bankDifficultyFilter !== "all" ? `Level ${bankDifficultyFilter}` : "",
  ].filter(Boolean);
  const title = titleParts.length ? titleParts.join(" / ") : "Question Bank";
  $("#app").innerHTML = `
    <main class="report-only stack teacher-version">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print Teacher Version</button>
      </div>
      <section class="card stack teacher-version-head">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(title)} Teacher Version</h2>
            <p class="subtle">${questions.length} question${questions.length === 1 ? "" : "s"} · Answers and explanations included · Admin only</p>
          </div>
          <span class="pill warn">Teacher Only</span>
        </div>
      </section>
      ${renderTeacherQuestionGroups(questions, "bank")}
    </main>
  `;
}

function downloadQuestionBankExcel(scope = "all") {
  const questions =
    scope === "checked"
      ? getSelectedBankQuestions()
      : scope === "filter"
        ? getFilteredBankQuestions()
        : [...(state.questionBank || [])].sort(bankQuestionUiSort);

  if (!questions.length) {
    alert(scope === "checked" ? "Check at least one bank question first." : "No bank questions to download.");
    return;
  }

  const title =
    scope === "checked"
      ? "Topway Question Bank Checked"
      : scope === "filter" && bankClassFilter !== "all"
        ? `Topway Question Bank ${bankClassFilter}`
        : "Topway Question Bank All";
  const headers = [
    "Bank Number",
    "System Question ID",
    "Source Exam / Bank Tab",
    "Question Number",
    "Group ID",
    "Passage Title",
    "Passage / Stimulus",
    "Question",
    "Choice 1 Label",
    "Choice 1 Text",
    "Choice 2 Label",
    "Choice 2 Text",
    "Choice 3 Label",
    "Choice 3 Text",
    "Choice 4 Label",
    "Choice 4 Text",
    "Choice 5 Label",
    "Choice 5 Text",
    "Correct Answer Letter",
    "Correct Answer Text",
    "Question Type",
    "Difficulty (1-4)",
    "Skill",
    "Answer Explanation",
    "Question Image URL",
    "Shared Passage Image URL",
  ];

  const rows = questions.map((question) => {
    const choiceLabels = Array.isArray(question.choices) && question.choices.length ? question.choices : LETTERS;
    const questionText = String(question.questionText || "");
    const choiceTextByLabel = extractChoiceTextByLabel(questionText, choiceLabels);
    const cleanQuestionText = removeChoiceLines(questionText, choiceLabels);
    return [
      question.bankNumber || "",
      question.sourceQuestionId || "",
      getBankQuestionClass(question),
      question.originalNumber || question.number || "",
      question.groupId || "",
      question.passageTitle || "",
      question.passageText || "",
      cleanQuestionText,
      choiceLabels[0] || "",
      choiceTextByLabel[choiceLabels[0]] || "",
      choiceLabels[1] || "",
      choiceTextByLabel[choiceLabels[1]] || "",
      choiceLabels[2] || "",
      choiceTextByLabel[choiceLabels[2]] || "",
      choiceLabels[3] || "",
      choiceTextByLabel[choiceLabels[3]] || "",
      choiceLabels[4] || "",
      choiceTextByLabel[choiceLabels[4]] || "",
      question.type === "numeric" ? "GRID-IN" : question.answer || "",
      question.type === "numeric" ? question.answer || "" : "",
      question.type === "numeric" ? "numeric" : "multiple_choice",
      question.difficulty || "",
      question.skill || "",
      question.explanation || "",
      question.imageUrl || "",
      question.sharedImageUrl || "",
    ];
  });

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
          th { background: #10263d; color: white; font-weight: bold; }
          th, td { border: 1px solid #d8e1ea; padding: 6px; vertical-align: top; mso-number-format:"\\@"; }
          td.long-text { width: 420px; white-space: normal; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    ${row
                      .map((cell, index) => `<td class="${[6, 7, 23].includes(index) ? "long-text" : ""}">${escapeHtml(cell).replace(/\n/g, "<br />")}</td>`)
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
  downloadTextFile(`${slugifyFileName(title)}-${formatDownloadDate()}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
}

function downloadQuestionBankEditingSheet(scope = "all") {
  const questions =
    scope === "checked"
      ? getSelectedBankQuestions()
      : scope === "filter"
        ? getFilteredBankQuestions()
        : [...(state.questionBank || [])].sort(bankQuestionUiSort);

  if (!questions.length) {
    alert(scope === "checked" ? "Check at least one bank question first." : "No bank questions to download.");
    return;
  }

  const title =
    scope === "checked"
      ? "Topway Question Bank Editing Sheet Checked"
      : scope === "filter" && bankClassFilter !== "all"
        ? `Topway Question Bank Editing Sheet ${bankClassFilter}`
        : "Topway Question Bank Editing Sheet";
  const headers = [
    "Status",
    "Subject",
    "Source Exam / Bank Tab",
    "System Question ID",
    "Question Number",
    "Section / Module",
    "Group / Passage ID",
    "Passage Title",
    "Skill",
    "Difficulty (1-4)",
    "Question Type",
    "Correct Answer",
    "Question",
    "Choice A",
    "Choice B",
    "Choice C",
    "Choice D",
    "Choice E",
    "Passage / Stimulus",
    "Answer Explanation",
    "Question Image URL",
    "Shared Passage Image URL",
    "Teacher Notes",
  ];

  const rows = questions.map((question) => {
    const choiceLabels = Array.isArray(question.choices) && question.choices.length ? question.choices : LETTERS;
    const questionText = String(question.questionText || "");
    const choiceTextByLabel = extractChoiceTextByLabel(questionText, choiceLabels);
    const cleanQuestionText = removeChoiceLines(questionText, choiceLabels);
    const status = getBankQuestionExportStatus(question);
    return [
      status,
      inferBankQuestionSubject(question),
      getBankQuestionClass(question),
      question.sourceQuestionId || "",
      question.originalNumber || question.number || "",
      question.section || "",
      question.groupId || "",
      question.passageTitle || "",
      question.skill || "",
      question.difficulty || "",
      question.type === "numeric" ? "numeric" : "multiple_choice",
      question.answer || "",
      cleanQuestionText,
      choiceTextByLabel.A || "",
      choiceTextByLabel.B || "",
      choiceTextByLabel.C || "",
      choiceTextByLabel.D || "",
      choiceTextByLabel.E || "",
      question.passageText || "",
      question.explanation || "",
      question.imageUrl || "",
      question.sharedImageUrl || "",
      "",
    ];
  });

  const longColumns = new Set([12, 18, 19, 22]);
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11pt; }
          th { background: #10263d; color: white; font-weight: bold; }
          th, td { border: 1px solid #d8e1ea; padding: 6px; vertical-align: top; mso-number-format:"\\@"; }
          td.long-text { width: 460px; white-space: normal; }
          td.status-ready { background: #e7f7ed; color: #17633a; font-weight: bold; }
          td.status-fix { background: #fff4dc; color: #8a5a00; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    ${row
                      .map((cell, index) => {
                        const classes = [];
                        if (longColumns.has(index)) classes.push("long-text");
                        if (index === 0) classes.push(String(cell).startsWith("Ready") ? "status-ready" : "status-fix");
                        return `<td class="${classes.join(" ")}">${escapeHtml(cell).replace(/\n/g, "<br />")}</td>`;
                      })
                      .join("")}
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </body>
    </html>
  `;
  downloadTextFile(`${slugifyFileName(title)}-${formatDownloadDate()}.xls`, html, "application/vnd.ms-excel;charset=utf-8");
}

function downloadQuestionBankManagerWorkbook(scope = "all") {
  const questions =
    scope === "checked"
      ? getSelectedBankQuestions()
      : scope === "filter"
        ? getFilteredBankQuestions()
        : [...(state.questionBank || [])].sort(bankQuestionUiSort);

  if (!questions.length) {
    alert(scope === "checked" ? "Check at least one bank question first." : "No bank questions to download.");
    return;
  }

  const title =
    scope === "checked"
      ? "Topway Question Bank Manager Checked"
      : scope === "filter" && bankClassFilter !== "all"
        ? `Topway Question Bank Manager ${bankClassFilter}`
        : "Topway Question Bank Manager";
  const managerHeaders = [
    "Row",
    "Status",
    "Subject",
    "Source Exam / Bank Tab",
    "System Question ID",
    "Question #",
    "Section / Module",
    "Passage ID",
    "Passage Title",
    "Skill",
    "Difficulty",
    "Type",
    "Answer",
    "Question",
    "Choice A",
    "Choice B",
    "Choice C",
    "Choice D",
    "Choice E",
    "Passage / Stimulus",
    "Answer Explanation",
    "Question Image URL",
    "Shared Passage Image URL",
    "Teacher Notes",
  ];
  const managerWidths = [45, 150, 120, 210, 135, 80, 140, 130, 180, 160, 75, 110, 75, 360, 220, 220, 220, 220, 220, 500, 460, 260, 260, 240];
  const groupedRows = new Map();

  questions.forEach((question) => {
    const choiceLabels = Array.isArray(question.choices) && question.choices.length ? question.choices : LETTERS;
    const questionText = String(question.questionText || "");
    const choiceTextByLabel = extractChoiceTextByLabel(questionText, choiceLabels);
    const cleanQuestionText = removeChoiceLines(questionText, choiceLabels);
    const sourceExam = getBankQuestionClass(question);
    const passageId = String(question.groupId || question.passageTitle || "").trim();
    const tabName = getBankWorkbookClassTabName(question);
    if (!groupedRows.has(tabName)) groupedRows.set(tabName, []);
    const rows = groupedRows.get(tabName);
    rows.push([
      rows.length + 1,
      getBankQuestionExportStatus(question),
      inferBankQuestionSubject(question),
      sourceExam,
      question.sourceQuestionId || "",
      question.originalNumber || question.number || "",
      question.section || "",
      passageId,
      question.passageTitle || "",
      question.skill || "",
      question.difficulty || "",
      question.type === "numeric" ? "numeric" : "multiple_choice",
      question.answer || "",
      cleanQuestionText,
      choiceTextByLabel.A || "",
      choiceTextByLabel.B || "",
      choiceTextByLabel.C || "",
      choiceTextByLabel.D || "",
      choiceTextByLabel.E || "",
      question.passageText || "",
      question.explanation || "",
      question.imageUrl || "",
      question.sharedImageUrl || "",
      "",
    ]);
  });

  const usedSheetNames = new Set();
  const workbook = buildExcelXmlWorkbook(
    [...groupedRows.entries()].map(([name, rows]) => ({
      name: createExcelSheetName(name, usedSheetNames),
      headers: managerHeaders,
      rows,
      widths: managerWidths,
    }))
  );

  downloadTextFile(`${slugifyFileName(title)}-${formatDownloadDate()}.xls`, workbook, "application/vnd.ms-excel;charset=utf-8");
}

function buildExcelXmlWorkbook(sheets) {
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Header"><Interior ss:Color="#10263d" ss:Pattern="Solid"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="Ready"><Interior ss:Color="#e7f7ed" ss:Pattern="Solid"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#17633a"/></Style>
  <Style ss:ID="NeedsFix"><Interior ss:Color="#fff4dc" ss:Pattern="Solid"/><Font ss:FontName="Arial" ss:Size="10" ss:Bold="1" ss:Color="#8a5a00"/></Style>
 </Styles>
 ${sheets.map(renderExcelXmlWorksheet).join("\n")}
</Workbook>`;
}

function renderExcelXmlWorksheet(sheet) {
  return `<Worksheet ss:Name="${xmlEscape(sheet.name)}">
  <Table>
   ${(sheet.widths || []).map((width) => `<Column ss:Width="${Number(width) || 120}"/>`).join("\n   ")}
   <Row>${sheet.headers.map((header) => excelXmlCell(header, "Header")).join("")}</Row>
   ${sheet.rows.map((row) => `<Row>${row.map((cell, index) => excelXmlCell(cell, index === 1 && String(cell).startsWith("Ready") ? "Ready" : index === 1 && String(cell).startsWith("Needs Fix") ? "NeedsFix" : "")).join("")}</Row>`).join("\n   ")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>`;
}

function excelXmlCell(value, style = "") {
  const numeric = typeof value === "number" && Number.isFinite(value);
  return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${numeric ? "Number" : "String"}">${xmlEscape(value)}</Data></Cell>`;
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncateForSheet(value, maxLength) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function createExcelSheetName(value, usedNames) {
  const base =
    String(value || "Questions")
      .replace(/[\[\]\*\/\\\?:]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || "Questions";
  let name = base;
  let count = 2;
  while (usedNames.has(name.toLowerCase())) {
    const suffix = ` ${count}`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    count += 1;
  }
  usedNames.add(name.toLowerCase());
  return name;
}

function getBankWorkbookClassTabName(question) {
  const text = `${question.testClass || ""} ${getBankQuestionClass(question)} ${question.section || ""} ${question.skill || ""}`.toLowerCase();
  const isShsat = text.includes("shsat");
  const isSat = /\bsat\b/.test(text) && !isShsat;
  const subject = String(question.subject || "").toLowerCase();
  const isMath = subject === "math" || text.includes("math") || text.includes("algebra") || text.includes("geometry");
  const isEla = subject === "english" || text.includes("ela") || text.includes("english") || text.includes("reading") || text.includes("grammar") || text.includes("writing");
  if (isShsat && isEla) return "SHSAT ELA";
  if (isShsat && isMath) return "SHSAT Math";
  if (isSat && isEla) return "SAT English";
  if (isSat && isMath) return "SAT Math";
  if (isEla) return "English Reading";
  if (isMath) return "Math";
  return getBankQuestionClass(question) || "Uncategorized";
}

function inferBankQuestionSubject(question) {
  return getBankQuestionMeta(question).subject;
}

function getBankQuestionExportStatus(question) {
  const issues = getBankQuestionReadinessIssues(question);
  return issues.length ? `Needs Fix: ${issues.join(", ")}` : "Ready";
}

function getStructuredQuestionQualityIssues(question) {
  const issues = [];
  const type = normalizeQuestionType(question?.type);
  const questionText = String(question?.questionText || "");
  const passageText = String(question?.passageText || "");
  const choices = Array.isArray(question?.choices) ? question.choices.map((item) => String(item).trim()).filter(Boolean) : [];
  const mapping = parseDragAnswer(question?.answer);
  if (/underlin(?:e|ed|ing)/i.test(questionText) && !/__(?:[^_\n]+)__|<u>[\s\S]*?<\/u>/i.test(`${questionText}\n${passageText}`)) {
    issues.push("mentions underlined text but no underline markup");
  }
  if (type === "dropdown" && (questionText.match(/\[\[blank\]\]/g) || []).length !== 1) issues.push("dropdown needs exactly one [[blank]]");
  if (type === "drag_drop") {
    const targets = Array.isArray(question?.dragTargets) ? question.dragTargets.map((item) => String(item).trim()).filter(Boolean) : [];
    if (choices.length < 3) issues.push("drag-and-drop needs at least 3 items");
    if (targets.length < 2) issues.push("drag-and-drop needs at least 2 categories");
    if (choices.length && targets.length && (!choices.every((item) => targets.includes(mapping[item])) || new Set(Object.values(mapping)).size < 2)) issues.push("drag mapping must place every item across categories");
  }
  if (type === "table_grid") {
    const rows = Array.isArray(question?.gridRows) ? question.gridRows.map((item) => String(item).trim()).filter(Boolean) : [];
    if (rows.length < 2) issues.push("table needs at least 2 statements");
    if (choices.some((label) => /^(best answer|not best answer|correct|incorrect|true|false|yes|no|[a-e])$/i.test(label))) issues.push("table needs meaningful evidence labels, not correct/incorrect");
    if (rows.length && choices.length && (!rows.every((_, index) => choices.includes(mapping[String(index + 1)])) || new Set(Object.values(mapping)).size < 2)) issues.push("table rows need different meaningful answer labels");
  }
  return issues;
}

function getBankQuestionReadinessIssues(question) {
  const mandatoryIssues = String(question?.groupId || "").trim() && !hasBankPassageMaterial(question)
    ? ["missing linked passage"]
    : [];
  if (String(question?.qualityApprovedAt || "").trim()) return mandatoryIssues;
  const issues = [...mandatoryIssues];
  const type = normalizeQuestionType(question.type);
  if (!String(question.sourceQuestionId || "").trim()) issues.push("missing ID");
  if (!String(question.questionText || "").trim() && !String(question.imageUrl || "").trim()) issues.push("missing question");
  if (!String(question.answer || "").trim()) issues.push("missing answer");
  if (["multiple", "dropdown", "drag_drop", "table_grid", "hot_text", "hotspot"].includes(type) && (!Array.isArray(question.choices) || !question.choices.length)) issues.push("missing choices/options");
  if (type === "multiple" && question.answer && !question.choices.includes(String(question.answer).toUpperCase())) issues.push("answer not in choices");
  if (type === "multiple") {
    const labels = (question.choices || []).map((item) => String(item || "").trim().toUpperCase()).filter(Boolean);
    const choiceText = extractChoiceTextByLabel(question.questionText, labels);
    const missingText = labels.filter((label) => /^[A-Z]$/.test(label) && !choiceText[label]);
    if (missingText.length) issues.push("answer text missing for " + missingText.join(", "));
  }
  if (type === "dropdown" && question.answer && !question.choices.includes(question.answer)) issues.push("dropdown answer not in options");
  if (type === "drag_drop" && (!Array.isArray(question.dragTargets) || !question.dragTargets.length)) issues.push("missing drop zones");
  if (type === "table_grid" && (!Array.isArray(question.gridRows) || !question.gridRows.length)) issues.push("missing table rows");
  if (type === "hot_text" && question.answer && !String(question.answer).split(/[;|\n]+/).every((item) => question.choices.includes(item.trim()))) issues.push("hot text answer not selectable");
  if (type === "hotspot" && !String(question.imageUrl || "").trim()) issues.push("missing hot spot image");
  return [...issues, ...getStructuredQuestionQualityIssues(question)];
}

function getBankExamReadiness(questions) {
  const invalid = (questions || []).filter((question) => getBankQuestionReadinessIssues(question).length);
  return { ready: (questions || []).filter((question) => !getBankQuestionReadinessIssues(question).length), invalid };
}

function extractChoiceTextByLabel(questionText, labels = LETTERS) {
  const result = {};
  String(questionText || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([A-Z])[\).]\s*(.+)$/);
      if (match && labels.includes(match[1])) result[match[1]] = match[2].trim();
    });
  return result;
}

function removeChoiceLines(questionText, labels = LETTERS) {
  return String(questionText || "")
    .split(/\r?\n/)
    .filter((line) => {
      const match = line.match(/^\s*([A-Z])[\).]\s*(.+)$/);
      return !match || !labels.includes(match[1]);
    })
    .join("\n")
    .trim();
}

function slugifyFileName(value) {
  return (
    String(value || "topway-export")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "topway-export"
  );
}

function formatDownloadDate() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
}

function downloadTextFile(fileName, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function makeExamBackupPayload(exam) {
  return {
    format: "topway-exam-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    exam: JSON.parse(JSON.stringify(exam)),
  };
}

function downloadExamBackup(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  const fileName = `${slugifyFileName(exam.title)}-${formatDownloadDate()}-backup.json`;
  downloadTextFile(fileName, JSON.stringify(makeExamBackupPayload(exam), null, 2), "application/json;charset=utf-8");
}

function downloadExamCsv(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  const headers = [
    "Question Number", "Test / Class", "Subject", "Section / Topic", "Skill", "Difficulty", "Question Type", "Question Text",
    "Choice A Text", "Choice B Text", "Choice C Text", "Choice D Text", "Choice E Text", "Options", "Answer", "Correct Answer Text",
    "Passage ID", "Passage Title", "Passage Text", "Question Image URL", "Shared Passage Image URL", "Drop Targets", "Grid Rows", "Explanation", "Source Question ID"
  ];
  const rows = [...(exam.questions || [])]
    .sort((left, right) => (Number(left.number) || 0) - (Number(right.number) || 0))
    .map((question) => {
      const choiceText = extractChoiceTextByLabel(question.questionText || "", ["A", "B", "C", "D", "E"]);
      const type = normalizeQuestionType(question.type);
      return [
        question.originalNumber || question.number, exam.title || question.testClass || "", question.subject || exam.examType || "", question.section || "", question.skill || "", question.difficulty || "", type,
        removeChoiceLines(question.questionText || "", ["A", "B", "C", "D", "E"]), choiceText.A || "", choiceText.B || "", choiceText.C || "", choiceText.D || "", choiceText.E || "",
        isOptionQuestion(type) ? (question.choices || []).join("|") : "", type === "multiple" ? question.answer || "" : "", type === "multiple" ? "" : question.answer || "",
        question.groupId || "", question.passageTitle || "", question.passageText || "", question.imageUrl || "", question.sharedImageUrl || "", (question.dragTargets || []).join("|"), (question.gridRows || []).join("|"), question.explanation || "", question.sourceQuestionId || ""
      ];
    });
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadTextFile(`${slugifyFileName(exam.title)}-${formatDownloadDate()}-questions.csv`, `\ufeff${csv}`, "text/csv;charset=utf-8");
}

function chooseExamBackupFile(examId) {
  document.getElementById(`examBackupFile-${examId}`)?.click();
}

async function restoreExamBackup(file) {
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    const exam = backup?.exam || backup;
    if (!exam || !Array.isArray(exam.questions)) throw new Error("This is not a valid Topway exam backup file.");
    if (!confirm(`Restore \"${exam.title || "this exam"}\" with ${exam.questions.length} questions? The restored exam will be closed until you review and open it.`)) return;
    state = await api("/api/admin/exams/import-backup", {
      method: "POST",
      body: JSON.stringify({ backup, fileName: file.name }),
    });
    selectedExamId = state.exams[0]?.id || null;
    selectedQuestionId = state.exams[0]?.questions?.[0]?.id || null;
    adminActiveTab = "exams";
    adminSubTabs.exams = "questions";
    renderAdmin();
    alert("Exam restored as a closed exam. Review it before opening it for students.");
  } catch (error) {
    alert(error.message);
  }
}

function printTeacherExamVersion(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) {
    alert("Select an exam first.");
    return;
  }
  const questions = [...(exam.questions || [])].sort((left, right) => (Number(left.number) || 0) - (Number(right.number) || 0));
  $("#app").innerHTML = `
    <main class="report-only stack teacher-version">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print Teacher Version</button>
      </div>
      <section class="card stack teacher-version-head">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(exam.title)} Teacher Version</h2>
            <p class="subtle">${escapeHtml(exam.code)} · ${questions.length} question${questions.length === 1 ? "" : "s"} · Answers and explanations included · Admin only</p>
          </div>
          <span class="pill warn">Teacher Only</span>
        </div>
      </section>
      ${renderTeacherQuestionGroups(questions, "exam", exam)}
    </main>
  `;
}

function printStudentExamVersion(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) {
    alert("Select an exam first.");
    return;
  }
  const questions = [...(exam.questions || [])].sort((left, right) => (Number(left.number) || 0) - (Number(right.number) || 0));
  $("#app").innerHTML = `
    <main class="report-only stack teacher-version student-paper-version">
      <div class="row no-print">
        <button class="ghost" onclick="renderAdmin()">Back</button>
        <button class="primary" onclick="window.print()">Print / Save PDF</button>
      </div>
      <section class="card stack teacher-version-head student-paper-head">
        <div class="section-head">
          <div>
            <h2>${escapeHtml(exam.title)} Paper Exam Form</h2>
            <p class="subtle">${escapeHtml(exam.code)} · ${questions.length} questions · ${exam.minutes} minutes</p>
          </div>
          <span class="pill">Student Version</span>
        </div>
        <div class="student-paper-info-grid">
          <div><strong>Name</strong><span></span></div>
          <div><strong>Date</strong><span></span></div>
        </div>
        <p class="subtle">Choose the best answer. Write grid-in answers clearly on the answer line.</p>
      </section>
      ${renderStudentPaperQuestionGroups(questions, exam)}
    </main>
  `;
}

function openPaperExamForm(examId) {
  printStudentExamVersion(examId);
}

function buildTeacherQuestionGroups(questions) {
  const groups = [];
  const grouped = new Map();
  questions.forEach((question, index) => {
    const hasPassage = Boolean(question.passageText || question.passageTitle || question.sharedImageUrl || question.groupId);
    const key = hasPassage ? String(question.groupId || question.passageTitle || `single-passage-${question.id || index}`) : `single-${question.id || index}`;
    if (!grouped.has(key)) {
      const group = {
        key,
        hasPassage,
        firstIndex: index,
        passageQuestion: question,
        questions: [],
      };
      grouped.set(key, group);
      groups.push(group);
    }
    const group = grouped.get(key);
    group.questions.push(question);
    if (!group.passageQuestion?.passageText && (question.passageText || question.passageTitle || question.sharedImageUrl)) group.passageQuestion = question;
  });
  return groups.sort((left, right) => left.firstIndex - right.firstIndex);
}

function renderTeacherQuestionGroups(questions, source = "exam", exam = null) {
  let displayIndex = 0;
  return buildTeacherQuestionGroups(questions)
    .map((group) => {
      if (!group.hasPassage && group.questions.length === 1) {
        const html = source === "bank" ? renderTeacherBankQuestion(group.questions[0], displayIndex) : renderTeacherExamQuestion(group.questions[0], displayIndex, exam);
        displayIndex += 1;
        return html;
      }
      const start = displayIndex + 1;
      const questionHtml = group.questions
        .map((question) => {
          const html = renderTeacherQuestionCore(question, displayIndex, source, exam, true);
          displayIndex += 1;
          return html;
        })
        .join("");
      const end = displayIndex;
      const passageQuestion = group.passageQuestion || group.questions[0];
      const groupTitle = passageQuestion.passageTitle || passageQuestion.groupId || group.key;
      return `
        <article class="card stack teacher-passage-group">
          <div class="section-head">
            <div>
              <h3>${escapeHtml(groupTitle)}</h3>
              <p class="subtle">Questions ${start}${end > start ? `-${end}` : ""} · ${group.questions.length} question${group.questions.length === 1 ? "" : "s"} · ${escapeHtml(passageQuestion.section || "Section")}</p>
            </div>
            <span class="pill warn">Passage Group</span>
          </div>
          ${renderTeacherPassageBlock(passageQuestion)}
          ${renderTeacherSharedMediaBlock(passageQuestion)}
          <div class="teacher-group-questions">${questionHtml}</div>
        </article>
      `;
    })
    .join("");
}

function renderStudentPaperQuestionGroups(questions, exam) {
  let displayIndex = 0;
  return buildTeacherQuestionGroups(questions)
    .map((group) => {
      if (!group.hasPassage && group.questions.length === 1) {
        const html = renderStudentPaperQuestionCore(group.questions[0], displayIndex, exam, false);
        displayIndex += 1;
        return html;
      }
      const start = displayIndex + 1;
      const questionHtml = group.questions
        .map((question) => {
          const html = renderStudentPaperQuestionCore(question, displayIndex, exam, true);
          displayIndex += 1;
          return html;
        })
        .join("");
      const end = displayIndex;
      const passageQuestion = group.passageQuestion || group.questions[0];
      const groupTitle = passageQuestion.passageTitle || passageQuestion.groupId || group.key;
      return `
        <article class="card stack teacher-passage-group student-paper-passage-group">
          <div class="section-head">
            <div>
              <h3>${escapeHtml(groupTitle)}</h3>
              <p class="subtle">Questions ${start}${end > start ? `-${end}` : ""} · ${group.questions.length} question${group.questions.length === 1 ? "" : "s"} · ${escapeHtml(passageQuestion.section || "Section")}</p>
            </div>
          </div>
          ${renderTeacherPassageBlock(passageQuestion)}
          ${renderTeacherSharedMediaBlock(passageQuestion)}
          <div class="teacher-group-questions">${questionHtml}</div>
        </article>
      `;
    })
    .join("");
}

function renderStudentPaperQuestionCore(question, index, exam, compact = false) {
  const questionNumber = index + 1;
  const hasChoiceLines = /(^|\n)\s*[A-E][\).]\s+/.test(String(question.questionText || ""));
  return `
    <article class="${compact ? "teacher-question-compact student-paper-question-compact" : "card stack teacher-question student-paper-question"}">
      <div class="paper-question-label"><strong>${escapeHtml(questionNumber)}.</strong><span>${escapeHtml(question.section || "")}</span></div>
      ${compact ? "" : renderTeacherPassageBlock(question)}
      ${compact ? "" : renderTeacherSharedMediaBlock(question)}
      ${renderTeacherQuestionTextWithInlineMedia(question, "student-paper-question-text")}
      ${question.imageUrl ? renderTeacherMediaBlock(question.imageUrl, "Question reference image") : ""}
      ${question.type === "numeric" ? renderStudentPaperNumericAnswerLine() : renderStudentPaperChoiceLine(question, hasChoiceLines)}
    </article>
  `;
}

function renderStudentPaperChoiceLine(question, hasChoiceLines) {
  const labels = Array.isArray(question.choices) && question.choices.length ? question.choices : LETTERS;
  if (hasChoiceLines) {
    return `
      <div class="student-paper-answer-line">
        <strong>Answer:</strong><span></span>
      </div>
    `;
  }
  return `
    <div class="student-paper-choice-grid">
      ${labels.map((choice) => `<span>${escapeHtml(choice)}</span>`).join("")}
    </div>
  `;
}

function renderStudentPaperNumericAnswerLine() {
  return `
    <div class="student-paper-answer-line">
      <strong>Answer:</strong><span></span>
    </div>
  `;
}

function renderTeacherBankQuestion(question, index) {
  return renderTeacherQuestionCore(question, index, "bank", null, false);
}

function renderTeacherExamQuestion(question, index, exam) {
  return renderTeacherQuestionCore(question, index, "exam", exam, false);
}

function renderTeacherQuestionCore(question, index, source = "exam", exam = null, compact = false) {
  const choiceText = Array.isArray(question.choices) && question.choices.length ? question.choices.join(", ") : "Grid-in / Numeric";
  const subject = source === "bank" ? question.testClass || "No class" : exam?.examType === "math" ? "Math" : "English";
  const idText = source === "bank" ? question.sourceQuestionId || "No ID" : question.sourceQuestionId || "No bank ID";
  const questionNumber = index + 1;
  return `
    <article class="${compact ? "teacher-question-compact" : "card stack teacher-question"}">
      <div class="section-head">
        <div>
          <h3>Question ${escapeHtml(questionNumber)}</h3>
          <p class="subtle">${escapeHtml(subject)} · ${escapeHtml(question.section || "Section")}</p>
        </div>
      </div>
      ${compact ? "" : renderTeacherPassageBlock(question)}
      ${compact ? "" : renderTeacherSharedMediaBlock(question)}
      ${renderTeacherQuestionTextWithInlineMedia(question)}
      ${question.imageUrl ? renderTeacherMediaBlock(question.imageUrl, "Question reference image") : ""}
      <div class="grid two compact-grid teacher-answer-grid teacher-answer-strip">
        <div><strong>Correct Answer</strong><p>${escapeHtml(question.answer || "Not set")}</p></div>
        <div><strong>Skill</strong><p>${escapeHtml(question.skill || "Not set")}</p></div>
      </div>
      ${question.explanation ? `<div class="teacher-explanation"><strong>Explanation</strong><p>${escapeHtml(question.explanation)}</p></div>` : ""}
    </article>
  `;
}

function renderTeacherQuestionTextWithInlineMedia(question, extraClass = "") {
  const cleanText = stripQuestionTextImages(question.questionText || "") || "No question text saved.";
  const inlineImages = collectQuestionTextImages(question.questionText || "").filter((image) => image !== question.imageUrl && image !== question.sharedImageUrl);
  return `
    <div class="teacher-question-text ${escapeHtml(extraClass)}" style="font-family: ${escapeHtml(getQuestionFontCss(question))}">${formatRichText(cleanText)}</div>
    ${inlineImages.map((image) => renderTeacherMediaBlock(image, "Question image from text")).join("")}
  `;
}

function renderTeacherPassageBlock(question) {
  if (!question?.passageText) return "";
  return `
    <div class="teacher-passage">
      ${question.passageTitle ? `<strong>${escapeHtml(question.passageTitle)}</strong>` : "<strong>Passage</strong>"}
      <p>${formatRichText(question.passageText)}</p>
    </div>
  `;
}

function renderTeacherSharedMediaBlock(question) {
  if (!question?.sharedImageUrl) return "";
  return renderTeacherMediaBlock(question.sharedImageUrl, "Shared passage image");
}

function renderTeacherMediaBlock(imageUrl, altText) {
  if (!imageUrl) return "";
  return `
    <figure class="teacher-media">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(altText)}" />
    </figure>
  `;
}

function renderResults(selected, mode = "results") {
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
    ${
      mode === "summary" || mode === "analysis"
        ? renderGeneralReport(filteredRows)
        : ""
    }
    ${
      mode === "student"
        ? renderSpecificStudentWeakness(filteredRows)
        : ""
    }
    ${
      mode === "map"
        ? renderExamSelfDetectPanel(filteredRows, selectedReport)
        : ""
    }
    ${
      mode === "results"
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
                  ${
                    submission
                      ? `<button class="ghost" onclick="selectSubmission('${submission.id}')">Review</button><button class="danger-light" onclick="deleteSubmittedReport('${submission.id}')">Delete Report</button>`
                      : `<button class="danger-light" onclick="deleteWaitingReport('${row.id}')">Delete Waiting</button>`
                  }
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
        : ""
    }
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

function renderGeneralReport(rows) {
  const submissions = rows.map((row) => row.submission).filter(Boolean);
  const analysis = buildGeneralReport(submissions);
  if (!submissions.length) {
    return `
      <section class="panel stack general-report">
        <div class="section-head">
          <div>
            <h2>General Report</h2>
            <p class="subtle">No submitted reports in this filtered view yet.</p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel stack general-report">
      <div class="section-head">
        <div>
          <h2>General Report</h2>
          <p class="subtle">Overall class performance and common weaknesses for the reports currently shown.</p>
        </div>
        <span class="pill ${analysis.average >= 80 ? "ok" : analysis.average >= 65 ? "warn" : "bad"}">${analysis.average}% Avg</span>
      </div>
      <div class="general-kpis">
        <div class="stat"><span class="subtle">Submitted</span><strong>${analysis.count}</strong></div>
        <div class="stat"><span class="subtle">Average</span><strong>${analysis.average}%</strong></div>
        <div class="stat"><span class="subtle">High Score</span><strong>${analysis.high}%</strong></div>
        <div class="stat"><span class="subtle">Low Score</span><strong>${analysis.low}%</strong></div>
        <div class="stat"><span class="subtle">Weakest Area</span><strong>${escapeHtml(analysis.weakestArea?.label || "None")}</strong></div>
      </div>
      <div class="grid two general-report-grid">
        <div class="card stack">
          <h3>Common Weaknesses</h3>
          ${
            analysis.weakAreas.length
              ? `<div class="weakness-list">
                  ${analysis.weakAreas
                    .slice(0, 5)
                    .map(
                      (area) => `
                        <article class="weakness-item">
                          <div>
                            <strong>${escapeHtml(area.label)}</strong>
                            <p class="subtle">${area.missed} missed · ${area.percent}% correct</p>
                          </div>
                          <div class="weakness-bar"><span style="width: ${area.percent}%"></span></div>
                        </article>
                      `
                    )
                    .join("")}
                </div>`
              : `<div class="notice ok">No common weakness found in the current submitted reports.</div>`
          }
        </div>
        <div class="card stack">
          <h3>Difficulty Breakdown</h3>
          ${renderDifficultyBreakdown(analysis.difficultyAreas)}
        </div>
        <div class="card stack">
          <h3>Hardest Questions</h3>
          ${
            analysis.hardQuestions.length
              ? `<div class="hard-question-list">
                  ${analysis.hardQuestions
                    .slice(0, 8)
                    .map(
                      (question) => `
                        <div class="hard-question-row">
                          <strong>${escapeHtml(question.label)}</strong>
                          <span class="pill ${question.percent >= 70 ? "ok" : question.percent >= 50 ? "warn" : "bad"}">${question.percent}% correct</span>
                          <span class="subtle">${question.missed}/${question.total} missed</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>`
              : `<div class="notice ok">No difficult-question pattern yet.</div>`
          }
        </div>
      </div>
      ${
        analysis.weakAreas.length
          ? `<div class="notice">${escapeHtml(buildTeachingFocusText(analysis, "class"))}</div>`
          : ""
      }
    </section>
  `;
}

function renderExamSelfDetectPanel(rows, selectedReport) {
  const examIds = new Set(rows.map((row) => row.examId).filter(Boolean));
  if (selectedReport?.examId) examIds.add(selectedReport.examId);
  const exams = [...examIds]
    .map((id) => state.exams.find((exam) => exam.id === id))
    .filter(Boolean)
    .sort((left, right) => String(left.title || "").localeCompare(String(right.title || "")));
  if (!exams.length) return "";
  const shownExams = reportExamFilter === "all" ? exams.slice(0, 4) : exams;

  return `
    <section class="panel stack self-detect-panel">
      <div class="section-head">
        <div>
          <h2>Self Detect Report Map</h2>
          <p class="subtle">The system reads each exam's subject, section, passage, and question text to build weakness categories automatically.</p>
        </div>
        <span class="pill">${exams.length} exam${exams.length === 1 ? "" : "s"}</span>
      </div>
      <div class="self-detect-grid">
        ${shownExams.map(renderExamSelfDetectCard).join("")}
      </div>
      ${
        reportExamFilter === "all" && exams.length > shownExams.length
          ? `<p class="hint">Showing first ${shownExams.length} exams. Choose one exam in the report filter to see its full self-detect map.</p>`
          : ""
      }
    </section>
  `;
}

function renderExamSelfDetectCard(exam) {
  const summary = buildExamSelfDetectSummary(exam);
  return `
    <article class="self-detect-card">
      <div class="section-head compact">
        <div>
          <h3>${escapeHtml(exam.title || "Untitled Exam")}</h3>
          <p class="subtle">${escapeHtml(summary.subjectLabel)} · ${summary.questionCount} question${summary.questionCount === 1 ? "" : "s"}</p>
        </div>
        <span class="pill ${summary.missingSkill ? "warn" : "ok"}">${summary.missingSkill ? `${summary.missingSkill} auto` : "Labeled"}</span>
      </div>
      <div class="self-detect-meta">
        <span><strong>Sections</strong>${escapeHtml(summary.sectionText || "None")}</span>
        <span><strong>Levels</strong>${escapeHtml(summary.difficultyText || "Not set")}</span>
      </div>
      <div class="weakness-list">
        ${
          summary.areas.length
            ? summary.areas
                .slice(0, 8)
                .map(
                  (area) => `
                    <article class="weakness-item self-detect-area">
                      <div>
                        <strong>${escapeHtml(area.label)}</strong>
                        <p class="subtle">${area.count} question${area.count === 1 ? "" : "s"}${area.auto ? ` · ${area.auto} auto detected` : ""}</p>
                      </div>
                      <div class="weakness-bar"><span style="width: ${summary.questionCount ? Math.round((area.count / summary.questionCount) * 100) : 0}%"></span></div>
                    </article>
                  `
                )
                .join("")
            : `<div class="notice">No questions are saved in this exam yet.</div>`
        }
      </div>
    </article>
  `;
}

function buildExamSelfDetectSummary(exam) {
  const questions = Array.isArray(exam?.questions) ? exam.questions : [];
  const areas = new Map();
  const sections = new Map();
  const difficulties = new Map();
  const subject = detectExamSubject(exam);
  let missingSkill = 0;

  questions.forEach((question) => {
    const row = { section: question.section, difficulty: question.difficulty, skill: question.skill };
    const label = getSkillLabel(row, question, exam);
    const entry = areas.get(label) || { label, count: 0, auto: 0 };
    entry.count += 1;
    if (!String(question.skill || "").trim()) {
      entry.auto += 1;
      missingSkill += 1;
    }
    areas.set(label, entry);
    const section = question.section || "Section";
    sections.set(section, (sections.get(section) || 0) + 1);
    const difficulty = question.difficulty ? `L${question.difficulty}` : "No level";
    difficulties.set(difficulty, (difficulties.get(difficulty) || 0) + 1);
  });

  const areaList = [...areas.values()].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  const sectionText = [...sections.entries()].map(([label, count]) => `${label} (${count})`).join(", ");
  const difficultyText = [...difficulties.entries()]
    .sort(([left], [right]) => {
      const leftLevel = Number(left.replace(/\D/g, "")) || 99;
      const rightLevel = Number(right.replace(/\D/g, "")) || 99;
      return leftLevel - rightLevel || left.localeCompare(right);
    })
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");

  return {
    questionCount: questions.length,
    subjectLabel: subject === "math" ? "Math report categories" : "ELA report categories",
    missingSkill,
    areas: areaList,
    sectionText,
    difficultyText,
  };
}

function buildGeneralReport(submissions) {
  const scores = submissions.map((submission) => Number(submission?.score?.percent || 0));
  const count = submissions.length;
  const average = count ? Math.round(scores.reduce((sum, score) => sum + score, 0) / count) : 0;
  const high = count ? Math.max(...scores) : 0;
  const low = count ? Math.min(...scores) : 0;
  const areaMap = new Map();
  const difficultyMap = new Map();
  const questionMap = new Map();

  submissions.forEach((submission) => {
    const exam = state.exams.find((item) => item.id === submission.examId);
    const examQuestions = new Map((exam?.questions || []).map((question) => [question.id, question]));
    getSubmissionDisplayRows(submission).forEach((row) => {
      const points = Number(row.points || 1);
      const skillLabel = getSkillLabel(row, examQuestions.get(row.questionId), exam);
      const area = areaMap.get(skillLabel) || { label: skillLabel, total: 0, correct: 0, missed: 0 };
      area.total += points;
      area.correct += Number(row.earned || 0);
      if (!row.correct) area.missed += 1;
      areaMap.set(skillLabel, area);

      const difficultyLabel = row.difficulty ? `Level ${row.difficulty}` : "No Difficulty";
      const difficulty = difficultyMap.get(difficultyLabel) || { label: difficultyLabel, total: 0, correct: 0, missed: 0 };
      difficulty.total += points;
      difficulty.correct += Number(row.earned || 0);
      if (!row.correct) difficulty.missed += 1;
      difficultyMap.set(difficultyLabel, difficulty);

      const questionKey = `${submission.examId}:${row.questionId || row.section}:${row.originalNumber || row.number}`;
      const questionLabel = `${exam?.title || "Exam"} · ${row.section || "Section"} #${row.displayNumber}`;
      const question = questionMap.get(questionKey) || { label: questionLabel, total: 0, correct: 0, missed: 0 };
      question.total += 1;
      if (row.correct) question.correct += 1;
      else question.missed += 1;
      questionMap.set(questionKey, question);
    });
  });

  const weakAreas = [...areaMap.values()]
    .map((area) => ({ ...area, percent: area.total ? Math.round((area.correct / area.total) * 100) : 0 }))
    .filter((area) => area.missed > 0)
    .sort((left, right) => right.missed - left.missed || left.percent - right.percent || left.label.localeCompare(right.label));
  const hardQuestions = [...questionMap.values()]
    .map((question) => ({ ...question, percent: question.total ? Math.round((question.correct / question.total) * 100) : 0 }))
    .filter((question) => question.missed > 0)
    .sort((left, right) => right.missed - left.missed || left.percent - right.percent || left.label.localeCompare(right.label));
  const difficultyAreas = [...difficultyMap.values()]
    .map((area) => ({ ...area, percent: area.total ? Math.round((area.correct / area.total) * 100) : 0 }))
    .sort((left, right) => {
      const leftLevel = Number(left.label.replace(/\D/g, "")) || 99;
      const rightLevel = Number(right.label.replace(/\D/g, "")) || 99;
      return leftLevel - rightLevel;
    });

  return { count, average, high, low, weakestArea: weakAreas[0] || null, weakAreas, hardQuestions, difficultyAreas };
}

function renderDifficultyBreakdown(difficultyAreas) {
  if (!difficultyAreas?.length) return `<div class="notice">No difficulty data saved yet. Future CSV imports can include Difficulty (1-4).</div>`;
  return `
    <div class="weakness-list">
      ${difficultyAreas
        .map(
          (area) => `
            <article class="weakness-item">
              <div>
                <strong>${escapeHtml(area.label)}</strong>
                <p class="subtle">${area.total} scored · ${area.missed} missed · ${area.percent}% correct</p>
              </div>
              <div class="weakness-bar"><span style="width: ${area.percent}%"></span></div>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function buildTeachingFocusText(analysis, scope = "class") {
  const weak = analysis.weakAreas?.slice(0, 3).map((area) => area.label) || [];
  const lowDifficulty = (analysis.difficultyAreas || []).filter((area) => area.missed > 0).sort((left, right) => left.percent - right.percent)[0];
  const target = scope === "student" ? "Student plan" : "Teaching focus";
  const weakText = weak.length ? weak.join(", ") : "the missed-question set";
  const difficultyText = lowDifficulty ? ` Prioritize ${lowDifficulty.label} questions first because it is at ${lowDifficulty.percent}% correct.` : "";
  return `${target}: review ${weakText}, then assign a short practice set from those skills.${difficultyText}`;
}

function renderSpecificStudentWeakness(rows) {
  const submittedRows = rows.filter((row) => row.submission);
  const students = buildReportStudentOptions(submittedRows);
  if (!students.length) return "";

  const selectedKey = students.some((student) => student.key === reportStudentFilter) ? reportStudentFilter : students[0].key;
  if (selectedKey !== reportStudentFilter) reportStudentFilter = selectedKey;
  const selectedStudent = students.find((student) => student.key === selectedKey);
  const studentSubmissions = submittedRows.filter((row) => getReportStudentKey(row) === selectedKey).map((row) => row.submission);
  const analysis = buildGeneralReport(studentSubmissions);

  return `
    <section class="panel stack specific-student-report">
      <div class="section-head">
        <div>
          <h2>Specific Student Weakness</h2>
          <p class="subtle">Choose one student to see their personal weak areas inside the current report filters.</p>
        </div>
        <div class="field compact-select">
          <label>Student</label>
          <select onchange="setReportStudentFilter(this.value)">
            ${students
              .map(
                (student) => `
                  <option value="${escapeHtml(student.key)}" ${student.key === selectedKey ? "selected" : ""}>
                    ${escapeHtml(student.label)}
                  </option>
                `
              )
              .join("")}
          </select>
        </div>
      </div>
      <div class="student-weakness-head">
        <div>
          <h3>${escapeHtml(selectedStudent?.name || "Student")}</h3>
          <p class="subtle">${escapeHtml(selectedStudent?.detail || "Submitted reports")} · ${analysis.count} submitted report${analysis.count === 1 ? "" : "s"}</p>
        </div>
        <span class="pill ${analysis.average >= 80 ? "ok" : analysis.average >= 65 ? "warn" : "bad"}">${analysis.average}% Avg</span>
      </div>
      <div class="general-kpis">
        <div class="stat"><span class="subtle">Reports</span><strong>${analysis.count}</strong></div>
        <div class="stat"><span class="subtle">Average</span><strong>${analysis.average}%</strong></div>
        <div class="stat"><span class="subtle">Best</span><strong>${analysis.high}%</strong></div>
        <div class="stat"><span class="subtle">Lowest</span><strong>${analysis.low}%</strong></div>
        <div class="stat"><span class="subtle">Main Weakness</span><strong>${escapeHtml(analysis.weakestArea?.label || "None")}</strong></div>
      </div>
      <div class="grid two general-report-grid">
        <div class="card stack">
          <h3>Personal Weak Areas</h3>
          ${
            analysis.weakAreas.length
              ? `<div class="weakness-list">
                  ${analysis.weakAreas
                    .slice(0, 5)
                    .map(
                      (area) => `
                        <article class="weakness-item">
                          <div>
                            <strong>${escapeHtml(area.label)}</strong>
                            <p class="subtle">${area.missed} missed · ${area.percent}% correct</p>
                          </div>
                          <div class="weakness-bar"><span style="width: ${area.percent}%"></span></div>
                        </article>
                      `
                    )
                    .join("")}
                </div>`
              : `<div class="notice ok">No personal weakness found for this student in the current filter.</div>`
          }
        </div>
        <div class="card stack">
          <h3>Difficulty Breakdown</h3>
          ${renderDifficultyBreakdown(analysis.difficultyAreas)}
        </div>
        <div class="card stack">
          <h3>Questions To Review</h3>
          ${
            analysis.hardQuestions.length
              ? `<div class="hard-question-list">
                  ${analysis.hardQuestions
                    .slice(0, 6)
                    .map(
                      (question) => `
                        <div class="hard-question-row">
                          <strong>${escapeHtml(question.label)}</strong>
                          <span class="pill ${question.percent >= 70 ? "ok" : question.percent >= 50 ? "warn" : "bad"}">${question.percent}% correct</span>
                          <span class="subtle">${question.missed}/${question.total} missed</span>
                        </div>
                      `
                    )
                    .join("")}
                </div>`
              : `<div class="notice ok">No missed question pattern for this student.</div>`
          }
        </div>
      </div>
      ${
        analysis.weakAreas.length
          ? `<div class="notice">${escapeHtml(buildTeachingFocusText(analysis, "student"))}</div>`
          : ""
      }
    </section>
  `;
}

function buildReportStudentOptions(rows) {
  const students = new Map();
  rows.forEach((row) => {
    const key = getReportStudentKey(row);
    if (!students.has(key)) {
      students.set(key, {
        key,
        name: row.studentName || "Student",
        detail: [row.studentId || "No ID", row.studentGroup || "No group"].filter(Boolean).join(" · "),
        label: `${row.studentName || "Student"}${row.studentId ? ` (${row.studentId})` : ""}`,
      });
    }
  });
  return [...students.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function getReportStudentKey(row) {
  const id = String(row.studentId || "").trim().toLowerCase();
  if (id) return `id:${id}`;
  return `name:${String(row.studentName || "student").trim().toLowerCase()}`;
}

function getShsatOriginalConversion(score, exam) {
  if (score?.shsatOriginal) return score.shsatOriginal;
  const rows = Array.isArray(score?.rows) ? score.rows : [];
  const examIdentity = `${exam?.title || ""} ${exam?.code || ""}`.toUpperCase();
  const eligibleExam = exam?.scoringMode === "shsat_original" || (/\bSHSAT\b/.test(examIdentity) && rows.length === 50);
  if (!eligibleExam) return null;
  const rawScore = Number.isInteger(score?.rawScore) ? score.rawScore : rows.filter((row) => row.correct).length;
  return {
    rawScore,
    convertedScore: rows.length === 50 ? SHSAT_ORIGINAL_SCORE_CONVERSION[rawScore] ?? null : null,
    chart: "original",
    eligible: rows.length === 50 && Object.prototype.hasOwnProperty.call(SHSAT_ORIGINAL_SCORE_CONVERSION, rawScore),
    note:
      rows.length !== 50
        ? "Original SHSAT conversion is available only for a 50-question exam."
        : rawScore === 0
          ? "The original chart provided starts at raw score 1; no converted value is assigned for raw score 0."
          : "Converted with the supplied Original SHSAT chart.",
  };
}

function renderShsatOriginalScore(score, exam) {
  const shsat = getShsatOriginalConversion(score, exam);
  if (!shsat) return "";
  return `
    <section class="shsat-original-score" aria-label="SHSAT Original score conversion">
      <div><span>Raw score</span><strong>${escapeHtml(String(shsat.rawScore ?? score?.rawScore ?? ""))} / 50</strong></div>
      <div><span>SHSAT converted score</span><strong>${shsat.convertedScore == null ? "Not listed" : escapeHtml(String(shsat.convertedScore))}</strong></div>
      <div><span>Conversion chart</span><strong>Original</strong></div>
      ${shsat.note ? `<p>${escapeHtml(shsat.note)}</p>` : ""}
    </section>
  `;
}

function getSubmissionDisplayRows(submission) {
  const sourceRows = Array.isArray(submission?.score?.rows) ? submission.score.rows : [];
  // Reports always return to the shared teacher/source order. The saved
  // randomized displayOrder is kept for audit purposes, but is deliberately
  // not used for printing so every student's review packet lines up.
  return [...sourceRows]
    .sort((left, right) => (Number(left.number) || 0) - (Number(right.number) || 0))
    .map((row, index) => ({ ...row, displayNumber: index + 1 }));
}

function renderSubmissionReport(submission, showCorrect = true, options = {}) {
  const { showProctoring = true, branded = false, compactPrint = false, reviewPrint = false } = options;
  const exam = state.exams.find((item) => item.id === submission.examId);
  const violationLog = Array.isArray(submission.violationEvents) ? submission.violationEvents : [];
  const proctorSummary = summarizeProctoring(violationLog);
  const rows = getSubmissionDisplayRows(submission);
  const missedRows = rows.filter((row) => !row.correct);
  const correctCount = rows.length - missedRows.length;
  const shsatOriginal = getShsatOriginalConversion(submission.score, exam);
  const reviewItems = missedRows
    .slice(0, 12)
    .map((row) => `${row.section || "Section"} #${row.displayNumber}`)
    .join(" · ");
  if (compactPrint) {
    return `
      <article class="card stack report-card compact-student-summary ${branded ? "branded-report" : ""}">
        ${branded ? renderReportBrandHeader("Student Test Summary") : ""}
        <div class="report-head">
          <div>
            <h3>${escapeHtml(submission.studentName || "Student")}</h3>
            <p class="subtle">${escapeHtml(exam?.title || "Exam")} · ${new Date(submission.submittedAt || Date.now()).toLocaleDateString()}</p>
          </div>
          <div class="report-score"><span class="subtle">Score</span><strong>${escapeHtml(`${submission.score?.percent ?? 0}%`)}</strong></div>
        </div>
        <div class="compact-report-stats ${shsatOriginal ? "" : "two"}">
          <div><span>Correct</span><strong>${escapeHtml(`${correctCount}/${rows.length}`)}</strong></div>
          <div><span>To review</span><strong>${missedRows.length}</strong></div>
          ${shsatOriginal ? `<div><span>SHSAT converted · Original chart</span><strong>${shsatOriginal.convertedScore == null ? "Not listed" : escapeHtml(String(shsatOriginal.convertedScore))}</strong></div>` : ""}
        </div>
        <section class="compact-review-list">
          <strong>Questions to review</strong>
          <p>${missedRows.length ? escapeHtml(`${reviewItems}${missedRows.length > 12 ? ` · +${missedRows.length - 12} more` : ""}`) : "Excellent work — no missed questions."}</p>
        </section>
        <footer class="compact-report-footer">Topway Prep · Student Test Summary</footer>
      </article>
    `;
  }
  if (reviewPrint) return renderStudentReviewPacket(submission, exam, rows, branded);
  return `
    <div class="card stack report-card ${branded ? "branded-report" : ""}">
      ${branded ? renderReportBrandHeader("Student Performance Report") : ""}
      <div class="report-head">
        <div>
          <h3>${escapeHtml(submission.studentName)} Review Report</h3>
          <p class="subtle">${escapeHtml(exam?.title || "Exam")} · Standard exam order · Questions 1-${rows.length}</p>
        </div>
        <div class="report-score">
          <span class="subtle">${showCorrect ? "Auto Grade" : "Student Copy"}</span>
          <strong>${showCorrect ? `${submission.score.earned}/${submission.score.possible}` : "Submitted"}</strong>
          ${showCorrect ? `<span class="subtle">${submission.score.percent}%</span>` : ""}
        </div>
      </div>
      ${
        showCorrect
          ? `<div class="compact-report-stats ${shsatOriginal ? "" : "two"}">
              <div><span>Correct</span><strong>${escapeHtml(`${correctCount}/${rows.length}`)}</strong></div>
              <div><span>Incorrect</span><strong>${missedRows.length}</strong></div>
              ${shsatOriginal ? `<div><span>SHSAT converted · Original chart</span><strong>${shsatOriginal.convertedScore == null ? "Not listed" : escapeHtml(String(shsatOriginal.convertedScore))}</strong></div>` : ""}
            </div>`
          : ""
      }
      ${
        showCorrect && showProctoring && violationLog.length
          ? renderProctoringSummary(proctorSummary, violationLog)
          : ""
      }
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr><th>Question</th><th>Section</th><th>Student</th>${showCorrect ? "<th>Correct</th><th>Result</th>" : "<th>Status</th>"}</tr></thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <td>${escapeHtml(row.section)} #${row.displayNumber}</td>
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

function getReportQuestion(exam, row) {
  const saved = (exam?.questions || []).find((question) => question.id === row.questionId) || {};
  return {
    ...saved,
    questionText: saved.questionText || row.questionText || "Question text was not saved in this older report.",
    passageTitle: saved.passageTitle || row.passageTitle || "",
    choices: Array.isArray(saved.choices) && saved.choices.length ? saved.choices : Array.isArray(row.choices) ? row.choices : [],
    skill: saved.skill || row.skill || "",
    explanation: saved.explanation || row.explanation || "",
  };
}

function renderStudentReviewPacket(submission, exam, rows, branded = true) {
  const missedRows = rows.filter((row) => !row.correct);
  const blankRows = missedRows.filter((row) => !String(row.studentAnswer || "").trim());
  return `
    <article class="card stack report-card student-review-packet ${branded ? "branded-report" : ""}">
      ${branded ? renderReportBrandHeader("Student Answer Review") : ""}
      <div class="report-head">
        <div>
          <h2>${escapeHtml(submission.studentName || "Student")}</h2>
          <p class="subtle">${escapeHtml(submission.examTitle || exam?.title || "Exam")} · ${new Date(submission.submittedAt || Date.now()).toLocaleDateString()} · Review-session copy</p>
        </div>
        <div class="report-score"><span class="subtle">Score</span><strong>${escapeHtml(`${submission.score?.percent ?? 0}%`)}</strong><span class="subtle">${escapeHtml(`${submission.score?.earned ?? 0}/${submission.score?.possible ?? rows.length}`)}</span></div>
      </div>
      <div class="compact-report-stats review-packet-stats">
        <div><span>Correct</span><strong>${rows.length - missedRows.length}</strong></div>
        <div><span>Wrong</span><strong>${missedRows.length - blankRows.length}</strong></div>
        <div><span>Blank</span><strong>${blankRows.length}</strong></div>
      </div>
      ${renderShsatOriginalScore(submission.score, exam)}
      <section class="review-answer-map">
        <div class="section-head"><div><h3>Answer Map</h3><p class="subtle">Use this page to quickly identify every correct, wrong, and blank response.</p></div><div class="review-legend"><span class="ok">Correct</span><span class="bad">Wrong</span><span class="blank">Blank</span></div></div>
        <div class="review-answer-grid">
          ${rows.map((row) => `<div class="review-answer-cell ${row.correct ? "correct" : row.studentAnswer ? "wrong" : "blank"}"><strong>Q${escapeHtml(row.displayNumber)}</strong><span>${row.correct ? "✓ Correct" : row.studentAnswer ? "✕ Wrong" : "— Blank"}</span><small>${escapeHtml(row.studentAnswer || "No answer")} → ${escapeHtml(row.correctAnswer || "Not set")}</small></div>`).join("")}
        </div>
      </section>
      <section class="missed-question-review">
        <div class="section-head"><div><h3>Questions to Fix</h3><p class="subtle">Full details for every wrong or blank response.</p></div><span class="pill ${missedRows.length ? "bad" : "ok"}">${missedRows.length} to review</span></div>
        ${missedRows.length ? missedRows.map((row) => renderMissedQuestionReview(exam, row)).join("") : `<div class="notice ok">Excellent work — there are no missed questions to review.</div>`}
      </section>
      <footer class="compact-report-footer">Topway Prep · Student Answer Review · Teacher / Review Session Copy</footer>
    </article>
  `;
}

function renderMissedQuestionReview(exam, row) {
  const question = getReportQuestion(exam, row);
  const cleanQuestionText = stripQuestionTextImages(question.questionText || "");
  return `
    <article class="missed-question-card">
      <header><div><span class="question-review-number">Question ${escapeHtml(row.displayNumber)}</span><strong>${escapeHtml(row.section || question.section || "Section")}</strong></div><span class="pill ${row.studentAnswer ? "bad" : "warn"}">${row.studentAnswer ? "Wrong" : "Blank"}</span></header>
      ${question.passageTitle ? `<p class="review-passage-label">Passage: ${escapeHtml(question.passageTitle)}</p>` : ""}
      <div class="review-question-text" style="font-family: ${escapeHtml(getQuestionFontCss(question))}">${formatRichText(cleanQuestionText || "Question text was not saved in this older report.")}</div>
      <div class="review-response-grid">
        <div class="student-response"><span>Student answer</span><strong>${escapeHtml(row.studentAnswer || "Blank")}</strong></div>
        <div class="correct-response"><span>Correct answer</span><strong>${escapeHtml(row.correctAnswer || "Not set")}</strong></div>
      </div>
      <div class="review-meta"><span><strong>Skill:</strong> ${escapeHtml(row.skill || question.skill || "Not labeled")}</span>${row.difficulty || question.difficulty ? `<span><strong>Level:</strong> ${escapeHtml(row.difficulty || question.difficulty)}</span>` : ""}</div>
      ${question.explanation ? `<div class="review-explanation"><strong>How to fix it</strong><p>${escapeHtml(question.explanation)}</p></div>` : `<div class="review-note-lines"><span>Review notes</span></div>`}
    </article>
  `;
}

function renderDiagnosticReport(submission, options = {}) {
  // Staff views keep the full skill breakdown. Student printouts use the
  // concise version so the report remains clear and parent-friendly.
  const { branded = false, includeSkillAnalysis = true, compact = false } = options;
  const exam = state.exams.find((item) => item.id === submission.examId);
  const analysis = buildWeaknessAnalysis(submission, exam);
  const subject = detectExamSubject(exam);
  const reportTitle = getDiagnosticReportTitle(exam, subject);
  const rating = getDiagnosticRating(analysis.percent);
  const readiness = getDiagnosticReadiness(subject, analysis.percent);
  const allAreas = analysis.allAreas?.length ? analysis.allAreas : [];
  const topWeakAreas = analysis.weakAreas?.slice(0, 3) || [];
  const shsatOriginal = getShsatOriginalConversion(submission.score, exam);

  return `
    <article class="diagnostic-report ${branded ? "branded-report" : ""} ${compact ? "student-diagnostic-report" : ""}">
      ${branded ? renderReportBrandHeader(reportTitle) : ""}
      <div class="diagnostic-title">
        <h1>${escapeHtml(reportTitle)}</h1>
        <div class="diagnostic-student-line">
          <span><strong>Student:</strong> ${escapeHtml(submission.studentName || "Student")}</span>
          <span><strong>Exam:</strong> ${escapeHtml(exam?.title || "Exam")}</span>
        </div>
      </div>

      <section class="diagnostic-section">
        <h2>Metric</h2>
        <table class="diagnostic-table compact">
          <tbody>
            <tr><th>Correct</th><td>${escapeHtml(`${analysis.correct}/${analysis.total}`)}</td></tr>
            <tr><th>Incorrect</th><td>${escapeHtml(String(analysis.missed))}</td></tr>
            <tr><th>Accuracy</th><td>${escapeHtml(`${analysis.percent}%`)}</td></tr>
            ${shsatOriginal ? `<tr><th>Raw Score</th><td>${escapeHtml(`${shsatOriginal.rawScore} / 50`)}</td></tr><tr><th>SHSAT Converted Score</th><td>${shsatOriginal.convertedScore == null ? "Not listed" : escapeHtml(String(shsatOriginal.convertedScore))} <small>(Original chart)</small></td></tr>` : ""}
            <tr><th>Overall Rating</th><td>${escapeHtml(rating)}</td></tr>
            <tr><th>${subject === "math" ? "SHSAT Math Readiness" : "SHSAT ELA Readiness"}</th><td>${escapeHtml(readiness)}</td></tr>
          </tbody>
        </table>
      </section>

      <section class="diagnostic-section">
        <h2>Performance Summary</h2>
        <p>${escapeHtml(buildDiagnosticPerformanceSummary(submission, exam, analysis, subject))}</p>
      </section>

      ${
        includeSkillAnalysis
          ? `<section class="diagnostic-section diagnostic-skill-analysis">
              <h2>Skill Analysis</h2>
              <table class="diagnostic-table">
                <thead>
                  <tr><th>${subject === "math" ? "Math Topic" : "Skill Area"}</th><th>Performance</th><th>Recommendation</th></tr>
                </thead>
                <tbody>
                  ${
                    allAreas.length
                      ? allAreas
                          .map(
                            (area) => `
                              <tr>
                                <td>${escapeHtml(area.label)}</td>
                                <td>${escapeHtml(getAreaPerformanceLabel(area.percent))}</td>
                                <td>${escapeHtml(getAreaRecommendation(area, subject))}</td>
                              </tr>
                            `
                          )
                          .join("")
                      : `<tr><td colspan="3">No skill data was detected for this report.</td></tr>`
                  }
                </tbody>
              </table>
            </section>`
          : ""
      }

      ${
        compact
          ? ""
          : `<section class="diagnostic-section">
              <h2>Teacher Comments</h2>
              <p>${escapeHtml(buildDiagnosticTeacherComments(submission, analysis, subject))}</p>
            </section>`
      }

      <section class="diagnostic-section">
        <h2>${compact ? "Next Steps" : "Improvement Plan"}</h2>
        <table class="diagnostic-table">
          <thead><tr><th>Recommended Practice</th><th>Frequency</th></tr></thead>
          <tbody>
            ${buildDiagnosticImprovementPlan(analysis, subject, topWeakAreas)
              .slice(0, compact ? 2 : undefined)
              .map((item) => `<tr><td>${escapeHtml(item.practice)}</td><td>${escapeHtml(item.frequency)}</td></tr>`)
              .join("")}
          </tbody>
        </table>
      </section>
      ${compact ? `<footer class="diagnostic-document-footer">Topway Prep · Student Diagnostic Report · Confidential Student Copy</footer>` : ""}
    </article>
  `;
}

function getDiagnosticReportTitle(exam, subject) {
  const title = String(exam?.title || "").toLowerCase();
  const examFamily = /shsat/.test(title) ? "SHSAT" : /sat/.test(title) ? "SAT" : "SHSAT";
  return `${examFamily} ${subject === "math" ? "Math" : "ELA"} Diagnostic Report`;
}

function getDiagnosticRating(percent) {
  if (percent >= 97) return "A+";
  if (percent >= 90) return "A";
  if (percent >= 80) return "B+";
  if (percent >= 70) return "B";
  if (percent >= 60) return "C";
  return "Needs Support";
}

function getDiagnosticReadiness(subject, percent) {
  if (percent >= 95) return "Outstanding";
  if (percent >= 85) return "Strong";
  if (percent >= 72) return `Good - Competitive with Continued Practice`;
  if (percent >= 60) return `Developing - Targeted ${subject === "math" ? "Math" : "ELA"} Practice Needed`;
  return "Needs Foundational Review";
}

function getAreaPerformanceLabel(percent) {
  if (percent >= 90) return "Excellent";
  if (percent >= 75) return "Strong";
  if (percent >= 60) return "Developing";
  return "Needs Review";
}

function getAreaRecommendation(area, subject) {
  if (area.percent >= 90) return "Maintain current level with mixed timed review.";
  if (area.percent >= 75) return "Continue regular practice and review missed items.";
  if (subject === "math") {
    if (/grid|numeric/i.test(area.label)) return "Practice grid-in format and check answer entry carefully.";
    if (/geometry/i.test(area.label)) return "Review formulas, diagrams, and multi-step geometry problems.";
    if (/algebra/i.test(area.label)) return "Practice equations, expressions, and function questions.";
    return "Assign targeted practice and review work step by step.";
  }
  if (/inference/i.test(area.label)) return "Practice challenging inference and evidence questions.";
  if (/grammar|editing/i.test(area.label)) return "Review grammar rules with short editing drills.";
  if (/main idea|author/i.test(area.label)) return "Practice passage purpose, tone, and central idea questions.";
  return "Continue close-reading practice and review missed evidence.";
}

function buildDiagnosticPerformanceSummary(submission, exam, analysis, subject) {
  const student = submission.studentName || "The student";
  const weakText = analysis.weakAreas?.length
    ? ` The main areas to strengthen are ${analysis.weakAreas.slice(0, 3).map((area) => area.label).join(", ")}.`
    : " No clear weakness area appeared in this attempt.";
  const strength = analysis.percent >= 90 ? "excellent" : analysis.percent >= 75 ? "good" : analysis.percent >= 60 ? "developing" : "early-stage";
  return `${student} answered ${analysis.correct} of ${analysis.total} questions correctly (${analysis.percent}%) on ${exam?.title || "this exam"}. This shows ${strength} overall ${subject === "math" ? "math reasoning" : "ELA performance"}.${weakText} Continued targeted practice will help improve consistency on future exams.`;
}

function buildDiagnosticTeacherComments(submission, analysis, subject) {
  const student = submission.studentName || "This student";
  if (analysis.percent >= 90) {
    return `${student} is performing at a strong level. Continue full-length timed practice, review any missed questions carefully, and use challenge sets to maintain growth.`;
  }
  if (analysis.percent >= 75) {
    return `${student} has built a solid foundation. With additional focus on ${analysis.weakAreas.slice(0, 2).map((area) => area.label).join(" and ") || "missed question patterns"}, the score can improve further.`;
  }
  return `${student} should focus on rebuilding accuracy through shorter targeted practice sets before moving back into full timed sections.`;
}

function buildDiagnosticImprovementPlan(analysis, subject, weakAreas) {
  const primary = weakAreas[0]?.label || (subject === "math" ? "Mixed math review" : "Reading and grammar review");
  const secondary = weakAreas[1]?.label || (subject === "math" ? "Timed mixed problem sets" : "Timed ELA passage practice");
  const daily = subject === "math" ? "Error log and formula review" : "Vocabulary and close-reading notes";
  return [
    { practice: `${primary} practice`, frequency: "2-3 times per week" },
    { practice: `${secondary} review`, frequency: "Once per week" },
    { practice: daily, frequency: "10-20 minutes daily" },
    { practice: `Full-length ${subject === "math" ? "SHSAT Math" : "SHSAT ELA"} practice test`, frequency: "Every 2-3 weeks" },
  ];
}

function renderReportBrandHeader(title) {
  return `
    <div class="report-brand">
      <img src="/assets/topway-prep-logo.png?v=20260811" alt="Topway Prep / 權威教育" onerror="this.onerror=null; this.src='/topway-prep-logo.png?v=20260811';" />
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${new Date().toLocaleDateString()}</span>
      </div>
    </div>
  `;
}

function renderWeaknessSummary(submission, exam) {
  const analysis = buildWeaknessAnalysis(submission, exam);
  if (!analysis.total) return "";

  return `
    <section class="weakness-panel">
      <div class="section-head">
        <div>
          <h3>Student Weakness Report</h3>
          <p class="subtle">Focus areas based on wrong or blank answers from this submitted exam.</p>
        </div>
        <span class="pill ${analysis.percent >= 80 ? "ok" : analysis.percent >= 65 ? "warn" : "bad"}">${analysis.percent}% Overall</span>
      </div>
      <div class="weakness-grid">
        <div class="stat"><span class="subtle">Correct</span><strong>${analysis.correct}/${analysis.total}</strong></div>
        <div class="stat"><span class="subtle">Missed</span><strong>${analysis.missed}</strong></div>
        <div class="stat"><span class="subtle">Weakest Area</span><strong>${escapeHtml(analysis.weakest?.label || "None")}</strong></div>
        <div class="stat"><span class="subtle">Priority</span><strong>${escapeHtml(analysis.priority)}</strong></div>
      </div>
      ${
        analysis.weakAreas.length
          ? `
            <div class="weakness-list">
              ${analysis.weakAreas
                .map(
                  (area) => `
                    <article class="weakness-item">
                      <div>
                        <strong>${escapeHtml(area.label)}</strong>
                        <p class="subtle">${area.missed} missed of ${area.total} · ${area.percent}% correct</p>
                      </div>
                      <div class="weakness-bar" aria-label="${escapeHtml(area.label)} ${area.percent}% correct">
                        <span style="width: ${area.percent}%"></span>
                      </div>
                    </article>
                  `
                )
                .join("")}
            </div>
            <div class="notice">
              Recommended next step: review ${escapeHtml(analysis.weakAreas
                .slice(0, 2)
                .map((area) => area.label)
                .join(" and "))} first, then redo the missed questions without time pressure.
            </div>
          `
          : `<div class="notice ok">No clear weakness from this attempt. Student answered every scored question correctly.</div>`
      }
      ${
        analysis.missedRows.length
          ? `
            <details class="missed-detail">
              <summary>Missed questions (${analysis.missedRows.length})</summary>
              <div class="missed-chips">
                ${analysis.missedRows
                  .map((row) => `<span>${escapeHtml(row.section || "Section")} #${escapeHtml(row.displayNumber)}</span>`)
                  .join("")}
              </div>
            </details>
          `
          : ""
      }
    </section>
  `;
}

function buildWeaknessAnalysis(submission, exam) {
  const rows = getSubmissionDisplayRows(submission);
  const questionMap = new Map((exam?.questions || []).map((question) => [question.id, question]));
  const groups = new Map();
  let correct = 0;

  rows.forEach((row) => {
    const points = Number(row.points || 1);
    if (row.correct) correct += points;
    const label = getSkillLabel(row, questionMap.get(row.questionId), exam);
    const group = groups.get(label) || { label, total: 0, correct: 0, missed: 0, rows: [] };
    group.total += points;
    group.correct += Number(row.earned || 0);
    if (!row.correct) {
      group.missed += 1;
      group.rows.push(row);
    }
    groups.set(label, group);
  });

  const total = rows.reduce((sum, row) => sum + Number(row.points || 1), 0);
  const missedRows = rows.filter((row) => !row.correct);
  const allAreas = [...groups.values()]
    .map((group) => ({
      ...group,
      percent: group.total ? Math.round((group.correct / group.total) * 100) : 0,
    }))
    .sort((left, right) => left.percent - right.percent || right.missed - left.missed || left.label.localeCompare(right.label));
  const weakAreas = allAreas
    .filter((group) => group.missed > 0)
    .sort((left, right) => right.missed - left.missed || left.percent - right.percent || left.label.localeCompare(right.label));
  const percent = total ? Math.round((correct / total) * 100) : 0;
  const priority = weakAreas.length >= 3 ? "High" : weakAreas.length ? "Targeted" : "Maintain";

  return {
    total,
    correct,
    missed: missedRows.length,
    percent,
    priority,
    weakest: weakAreas[0] || null,
    allAreas,
    weakAreas,
    missedRows,
  };
}

function detectExamSubject(exam, row = {}, question = {}) {
  const text = `${exam?.examType || ""} ${exam?.title || ""} ${question?.testClass || ""} ${row?.section || ""} ${question?.section || ""} ${question?.skill || ""}`.toLowerCase();
  if (/math|algebra|geometry|arithmetic|grid|numeric|shsat\s*math/.test(text)) return "math";
  if (/ela|english|reading|writing|grammar|passage|shsat\s*ela/.test(text)) return "ela";
  const questionText = `${question?.questionText || ""} ${question?.passageTitle || ""} ${question?.passageText || ""}`.toLowerCase();
  if (/equation|integer|fraction|triangle|circle|graph|percent|ratio|square root|slope/.test(questionText)) return "math";
  return "ela";
}

function getSelfDetectText(row, question, exam) {
  return `${exam?.title || ""} ${exam?.examType || ""} ${row?.section || ""} ${question?.section || ""} ${question?.groupId || ""} ${question?.passageTitle || ""} ${question?.passageText || ""} ${question?.questionText || ""} ${question?.type || ""}`.toLowerCase();
}

function detectMathSkill(text) {
  if (/grid|numeric|short response|free response|student produced|fill in|input/.test(text)) return "Grid-in / Numeric Response";
  if (/geometry|triangle|circle|angle|parallel|perpendicular|area|volume|surface area|perimeter|coordinate|polygon|radius|diameter/.test(text)) return "Geometry";
  if (/data|graph|table|chart|statistics|probability|mean|median|mode|range|scatter|histogram/.test(text)) return "Data Analysis";
  if (/ratio|proportion|percent|percentage|rate|unit rate|discount|tax|interest|scale/.test(text)) return "Ratios & Percents";
  if (/equation|expression|linear|function|slope|variable|solve|system|inequality|factor|quadratic|polynomial|exponential/.test(text)) return "Algebra";
  if (/integer|fraction|decimal|number line|prime|divisible|multiple|least common|greatest common|exponent|square root|arithmetic/.test(text)) return "Arithmetic & Number Sense";
  if (/word problem|how many|total|altogether|cost|distance|time|mixture/.test(text)) return "Word Problems";
  return "Math Reasoning";
}

function detectElaSkill(text) {
  if (/grammar|punctuation|sentence|transition|editing|revise|revision|standard english|comma|semicolon|apostrophe|verb|pronoun/.test(text)) return "Grammar & Editing";
  if (/vocabulary|meaning of the word|word most nearly|phrase most nearly|context/.test(text)) return "Vocabulary in Context";
  if (/infer|inference|imply|suggest|conclude|most likely/.test(text)) return "Inference";
  if (/evidence|detail|according to|line|paragraph|support/.test(text)) return "Reading Details";
  if (/main idea|central idea|summary|summarize|theme/.test(text)) return "Main Idea";
  if (/author|purpose|tone|point of view|craft|structure|organize/.test(text)) return "Author's Purpose";
  return "Reading Comprehension";
}

function getSkillLabel(row, question, exam = null) {
  const explicitSkill = row?.skill || question?.skill;
  if (explicitSkill) return explicitSkill;
  const text = getSelfDetectText(row, question, exam);
  if (detectExamSubject(exam, row, question) === "math") return detectMathSkill(text);
  return detectElaSkill(text);
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

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const source = String(text || "").replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normalizeCsvHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[_/()+.-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getCsvValue(row, headers, names) {
  for (const name of names) {
    const index = headers.indexOf(normalizeCsvHeader(name));
    if (index >= 0) return String(row[index] || "").trim();
  }
  return "";
}

function cleanCsvValue(value) {
  const text = String(value || "").trim();
  return /^(n\/a|na|null|none|-)$/i.test(text) ? "" : text;
}

function parseQuestionIdInput(value) {
  return String(value || "")
    .split(/[\s,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inspectQuestionIds(ids, exam = null) {
  const rows = [];
  const seenIds = new Set();
  const selectedSources = new Set();
  const selectedContent = new Set();
  const existingSources = new Set((exam?.questions || []).map(getBankQuestionSourceGroupId));
  const existingContent = new Set((exam?.questions || []).map(getBankQuestionSignature).filter((signature) => signature.length >= 24));
  (ids || []).forEach((requestedId, index) => {
    const normalizedId = String(requestedId || "").trim().toLowerCase();
    let issue = "";
    let question = null;
    const matches = (state.questionBank || []).filter((item) =>
      [item.id, item.sourceQuestionId].some((value) => String(value || "").trim().toLowerCase() === normalizedId)
    );
    if (seenIds.has(normalizedId)) issue = "Repeated ID in this list";
    else if (!matches.length) issue = "ID not found in Question Bank";
    else {
      const versions = new Set(matches.map(getBankQuestionSignature).filter(Boolean));
      if (versions.size > 1) issue = "ID matches different bank questions";
      else {
        question = rankDuplicateGroup(matches)[0];
        const readiness = getBankQuestionReadinessIssues(question);
        const sourceGroup = getBankQuestionSourceGroupId(question);
        const signature = getBankQuestionSignature(question);
        const subject = inferBankQuestionSubject(question);
        const wrongSubject = exam && subject && ((exam.examType === "math" && subject !== "Math") || (exam.examType !== "math" && subject === "Math"));
        if (readiness.length) issue = readiness.join(", ");
        else if (wrongSubject) issue = "Wrong subject for this exam";
        else if (existingSources.has(sourceGroup) || selectedSources.has(sourceGroup) || (signature.length >= 24 && (existingContent.has(signature) || selectedContent.has(signature)))) {
          issue = "Already in exam or duplicate question content";
        } else {
          selectedSources.add(sourceGroup);
          if (signature.length >= 24) selectedContent.add(signature);
        }
      }
    }
    seenIds.add(normalizedId);
    rows.push({ order: index + 1, requestedId, question, issue });
  });
  return { rows, ready: rows.filter((row) => !row.issue), invalid: rows.filter((row) => row.issue) };
}

function analyzeExamIdCsv(text) {
  const parsedRows = parseCsvRows(text);
  if (parsedRows.length < 2) return { ids: [], rows: [], ready: [], invalid: [], errors: ["CSV needs a header and at least one Question ID row."] };
  const headers = parsedRows[0].map(normalizeCsvHeader);
  const idIndex = ["Question ID", "QuestionID", "Source Question ID", "ID"]
    .map(normalizeCsvHeader)
    .map((header) => headers.indexOf(header))
    .find((index) => index >= 0);
  if (idIndex === undefined) return { ids: [], rows: [], ready: [], invalid: [], errors: ["Missing required Question ID column."] };
  const orderIndex = ["Order", "Exam Order", "Position"]
    .map(normalizeCsvHeader)
    .map((header) => headers.indexOf(header))
    .find((index) => index >= 0);
  const entries = parsedRows.slice(1).map((row, index) => ({
    row: index + 2,
    id: cleanCsvValue(row[idIndex]),
    order: orderIndex === undefined ? index + 1 : Number.parseInt(cleanCsvValue(row[orderIndex]), 10),
  })).filter((entry) => entry.id);
  const errors = [];
  if (!entries.length) errors.push("No Question IDs were found.");
  if (orderIndex !== undefined && entries.some((entry) => !Number.isInteger(entry.order) || entry.order < 1)) errors.push("Every Order value must be a positive whole number.");
  if (orderIndex !== undefined && new Set(entries.map((entry) => entry.order)).size !== entries.length) errors.push("Order values must not repeat.");
  entries.sort((left, right) => left.order - right.order || left.row - right.row);
  const inspection = inspectQuestionIds(entries.map((entry) => entry.id));
  return { ...inspection, ids: entries.map((entry) => entry.id), errors };
}

function renderQuestionIdInspection(inspection, title = "Question ID Preview") {
  if (!inspection) return "";
  const errors = inspection.errors || [];
  const invalidCount = (inspection.invalid || []).length + errors.length;
  return `
    <div class="csv-preview-head"><strong>${escapeHtml(title)}</strong><span class="pill ${invalidCount ? "bad" : "ok"}">${invalidCount ? "Blocked — fix IDs" : `${inspection.ready?.length || 0} ready`}</span></div>
    ${errors.length ? `<div class="notice bad">${errors.map(escapeHtml).join("<br>")}</div>` : ""}
    ${inspection.rows?.length ? `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Question ID</th><th>Status</th><th>Question</th></tr></thead><tbody>${inspection.rows.slice(0, 30).map((row) => `<tr><td>${row.order}</td><td><strong>${escapeHtml(row.requestedId)}</strong></td><td><span class="pill ${row.issue ? "bad" : "ok"}">${escapeHtml(row.issue || "Ready")}</span></td><td>${escapeHtml(String(row.question?.questionText || "Not loaded").slice(0, 120))}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${inspection.rows?.length > 30 ? `<p class="hint">Showing the first 30 of ${inspection.rows.length} IDs.</p>` : ""}
  `;
}

function analyzeQuestionCsv(text) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { total: 0, errors: ["CSV needs one header row and at least one question row."] };
  const headers = rows[0].map(normalizeCsvHeader);
  const hasQuestionHeader = ["Question", "Prompt", "Question Text", "Question Prompt", "question_text", "question_prompt"].some((header) =>
    headers.includes(normalizeCsvHeader(header))
  );
  const summary = {
    total: 0,
    multipleChoice: 0,
    gridIn: 0,
    fillBlank: 0,
    dropdown: 0,
    dragDrop: 0,
    tableGrid: 0,
    missingAnswer: 0,
    missingSkill: 0,
    missingDifficulty: 0,
    missingQuestion: 0,
    groupedPassages: 0,
    passageRows: 0,
    questionImages: 0,
    inlineImages: 0,
    sharedImages: 0,
    visualTextOnly: 0,
    missingUnderlineMarkup: 0,
    passageSetupIssues: 0,
    passageGroups: new Map(),
    difficulties: {},
    skills: new Map(),
    examples: [],
    rowIssues: [],
    errors: hasQuestionHeader ? [] : ["Missing required column: Question, Question Text, or Question Prompt"],
  };

  rows.slice(1).forEach((row, index) => {
    const question = cleanCsvValue(getCsvValue(row, headers, ["Question", "Prompt", "Question Text", "Question Prompt", "question_text", "question_prompt"]));
    const correctLetter = cleanCsvValue(getCsvValue(row, headers, ["Correct Answer Letter", "Answer Letter", "Answer", "Correct Answer", "Verified Official Key", "correct_answer", "student_answer"]));
    const correctText = cleanCsvValue(getCsvValue(row, headers, ["Correct Answer Text", "Answer Text", "Grid-In Answer", "correct_answer_text"]));
    const rawType = cleanCsvValue(getCsvValue(row, headers, ["Question Type", "Type", "question_type"]));
    const tableRows = cleanCsvValue(getCsvValue(row, headers, ["Grid Rows", "Table Rows", "Claim Evidence Rows", "Claims", "Statements"]));
    const skill = cleanCsvValue(getCsvValue(row, headers, ["Skill", "Domain", "Standard", "Official DOK"]));
    const difficulty = cleanCsvValue(getCsvValue(row, headers, ["Difficulty (1-4)", "Difficulty", "Level", "Difficulty 1 to 4", "difficulty_1_to_4"]));
    const groupId = cleanCsvValue(getCsvValue(row, headers, ["Passage ID", "Passage ID / Group", "Shared Passage ID", "Stimulus ID", "Group", "Group ID", "Passage Group", "passage_group", "group_id"]));
    const passageTitle = cleanCsvValue(getCsvValue(row, headers, ["Passage Title", "Stimulus Title", "Title", "Passage T", "passage_title"]));
    const passageText = cleanCsvValue(getCsvValue(row, headers, ["Passage / Stimulus", "Full Passage / Stimulus", "Full Passage", "Passage Text", "Shared Passage Text", "Stimulus Text", "passage_text", "Passage", "Stimulus", "Reading Passage"]));
    const imageValue = cleanCsvValue(getCsvValue(row, headers, ["Question Image", "Question Image URL", "Image", "Image URL", "Graph", "Graph URL", "Diagram", "Diagram URL", "Picture", "Picture URL", "Visual", "Visual Description", "Source Note"]));
    const sharedImageValue = cleanCsvValue(getCsvValue(row, headers, ["Shared Passage Image", "Shared Image", "Passage Image", "Passage Image URL", "Stimulus Image", "Stimulus Image URL"]));
    const inlineImages = collectQuestionTextImages(question);
    const hasQuestionImage = isInlineImageUrl(imageValue, true);
    const hasSharedImage = isInlineImageUrl(sharedImageValue, true);
    const hasVisualTextOnly = imageValue && !hasQuestionImage && /graph|diagram|figure|chart|image|picture|visual/i.test(imageValue);
    const type = correctLetter.toUpperCase() === "GRID-IN" ? "numeric" : normalizeQuestionType(rawType);
    const isGrid = type === "numeric";

    if (!question && !correctLetter && !correctText) return;
    const issues = [];
    summary.total += 1;
    if (isGrid) summary.gridIn += 1;
    else if (type === "fill_blank") summary.fillBlank += 1;
    else if (type === "dropdown") summary.dropdown += 1;
    else if (type === "drag_drop") summary.dragDrop += 1;
    else if (type === "table_grid") summary.tableGrid += 1;
    else summary.multipleChoice += 1;
    if (!question) {
      summary.missingQuestion += 1;
      issues.push("Question text missing");
    }
    const answerValue = isGrid ? correctText : type === "multiple" ? correctLetter : correctText || correctLetter;
    if (!answerValue) {
      summary.missingAnswer += 1;
      issues.push(`${questionTypeLabel(type)} answer missing`);
    }
    if (type === "table_grid" && !tableRows) issues.push("Table rows missing");
    if (!skill) {
      summary.missingSkill += 1;
      issues.push("Skill missing");
    }
    if (!difficulty) {
      summary.missingDifficulty += 1;
      issues.push("Difficulty missing");
    } else if (!/^[1-4]$/.test(String(difficulty))) {
      issues.push("Difficulty should be 1-4");
    }
    if (hasQuestionImage) summary.questionImages += 1;
    if (inlineImages.length) summary.inlineImages += 1;
    if (hasSharedImage) summary.sharedImages += 1;
    if (hasVisualTextOnly) {
      summary.visualTextOnly += 1;
      issues.push("Graphic is text only; add an image URL or upload image after import");
    }
    const mentionsUnderline = /underlin(?:e|ed|ing)/i.test(`${question}\n${passageText}`);
    const hasUnderlineMarkup = /__(?:[^_\n]+)__|<\s*(?:u|ins)(?:\s[^>]*)?>[\s\S]*?<\s*\/\s*(?:u|ins)\s*>|\[(?:u|underline)][\s\S]*?\[\/(?:u|underline)]|\+\+[^+\n]+\+\+|\u0332/i.test(`${question}\n${passageText}`);
    if (mentionsUnderline && !hasUnderlineMarkup) {
      summary.missingUnderlineMarkup += 1;
      issues.push("Mentions underlined text but no underline formatting was found");
    }
    if ((passageTitle || passageText || hasSharedImage) && !groupId) {
      summary.passageSetupIssues += 1;
      issues.push("Passage content needs a Passage ID so all related questions stay together");
    }
    if (difficulty) summary.difficulties[difficulty] = (summary.difficulties[difficulty] || 0) + 1;
    if (skill) summary.skills.set(skill, (summary.skills.get(skill) || 0) + 1);
    if (passageText) summary.passageRows += 1;
    if (groupId || passageTitle || passageText) {
      const passageKey = groupId || passageTitle || `Passage row ${index + 2}`;
      const current = summary.passageGroups.get(passageKey) || { title: passageTitle || passageKey, count: 0, hasText: false };
      current.count += 1;
      current.hasText = current.hasText || Boolean(passageText);
      summary.passageGroups.set(passageKey, current);
      summary.groupedPassages = summary.passageGroups.size;
    }
    if (summary.examples.length < 3) summary.examples.push({ number: index + 1, question, skill, difficulty, type: questionTypeLabel(type), graphics: hasQuestionImage || hasSharedImage || inlineImages.length });
    if (issues.length) summary.rowIssues.push({ row: index + 2, type: questionTypeLabel(type), issue: issues.join(", "), question: question || "No question text" });
  });

  (summary.passageGroups || new Map()).forEach((group, id) => {
    if (group.count > 1 && !group.hasText) {
      summary.passageSetupIssues += 1;
      summary.rowIssues.push({ row: "Group", type: "Passage", issue: `Passage group ${id} has no passage text`, question: group.title || id });
    }
  });
  if (!summary.total) summary.errors.push("No question rows were found.");
  return summary;
}

function renderQuestionCsvPreview(summary) {
  if (!summary?.total && !summary?.errors?.length) return "";
  const issueCount = (summary.missingAnswer || 0) + (summary.missingSkill || 0) + (summary.missingDifficulty || 0) + (summary.missingQuestion || 0) + (summary.visualTextOnly || 0) + (summary.missingUnderlineMarkup || 0) + (summary.passageSetupIssues || 0) + (summary.errors?.length || 0);
  const graphicCount = (summary.questionImages || 0) + (summary.inlineImages || 0) + (summary.sharedImages || 0);
  const difficultyText = Object.entries(summary.difficulties || {})
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([level, count]) => `L${level}: ${count}`)
    .join(" · ");
  const topSkills = [...(summary.skills || new Map()).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([skill, count]) => `${skill} (${count})`)
    .join(", ");

  return `
    <div class="csv-preview-head">
      <strong>CSV Preview</strong>
      <span class="pill ${issueCount ? "warn" : "ok"}">${issueCount ? `${issueCount} item${issueCount === 1 ? "" : "s"} to review` : "Ready"}</span>
    </div>
    <div class="general-kpis csv-kpis">
      <div class="stat"><span class="subtle">Questions</span><strong>${summary.total || 0}</strong></div>
      <div class="stat"><span class="subtle">Multiple Choice</span><strong>${summary.multipleChoice || 0}</strong></div>
      <div class="stat"><span class="subtle">Grid-In</span><strong>${summary.gridIn || 0}</strong></div>
      <div class="stat"><span class="subtle">Fill Blank</span><strong>${summary.fillBlank || 0}</strong></div>
      <div class="stat"><span class="subtle">Dropdown</span><strong>${summary.dropdown || 0}</strong></div>
      <div class="stat"><span class="subtle">Drag & Drop</span><strong>${summary.dragDrop || 0}</strong></div>
      <div class="stat"><span class="subtle">Claim / Evidence</span><strong>${summary.tableGrid || 0}</strong></div>
      <div class="stat"><span class="subtle">Passage Groups</span><strong>${summary.groupedPassages || 0}</strong></div>
      <div class="stat"><span class="subtle">Graphics</span><strong>${graphicCount}</strong></div>
      <div class="stat"><span class="subtle">Missing Answers</span><strong>${summary.missingAnswer || 0}</strong></div>
    </div>
    <div class="csv-health">
      <span class="pill ${summary.missingSkill ? "warn" : "ok"}">Skill missing: ${summary.missingSkill || 0}</span>
      <span class="pill ${summary.missingDifficulty ? "warn" : "ok"}">Difficulty missing: ${summary.missingDifficulty || 0}</span>
      <span class="pill ${summary.missingQuestion ? "bad" : "ok"}">Question missing: ${summary.missingQuestion || 0}</span>
      <span class="pill ${graphicCount ? "ok" : ""}">Question graphics: ${summary.questionImages || 0}</span>
      <span class="pill ${summary.inlineImages ? "ok" : ""}">Graphics in text: ${summary.inlineImages || 0}</span>
      <span class="pill ${summary.sharedImages ? "ok" : ""}">Passage images: ${summary.sharedImages || 0}</span>
      <span class="pill ${summary.visualTextOnly ? "warn" : "ok"}">Graphic text only: ${summary.visualTextOnly || 0}</span>
      <span class="pill ${summary.missingUnderlineMarkup ? "bad" : "ok"}">Underline issues: ${summary.missingUnderlineMarkup || 0}</span>
      <span class="pill ${summary.passageSetupIssues ? "bad" : "ok"}">Passage setup issues: ${summary.passageSetupIssues || 0}</span>
    </div>
    ${
      summary.visualTextOnly
        ? `<div class="notice warn"><strong>Graphic warning:</strong> ${summary.visualTextOnly} row${summary.visualTextOnly === 1 ? "" : "s"} mention a graph/image as text only. Students can only see the actual graphic if the CSV has an image URL/data image, or if you upload the image in Question Editor after import.</div>`
        : ""
    }
    ${summary.errors?.length ? `<div class="notice bad">${summary.errors.map(escapeHtml).join("<br>")}</div>` : ""}
    ${renderCsvIssueTable(summary.rowIssues)}
    <p class="hint"><strong>Question IDs:</strong> generated by the system in import order. A CSV Question ID column is not required.</p>
    ${renderCsvPassageSummary(summary)}
    ${difficultyText ? `<p class="hint"><strong>Difficulty:</strong> ${escapeHtml(difficultyText)}</p>` : ""}
    ${topSkills ? `<p class="hint"><strong>Top skills:</strong> ${escapeHtml(topSkills)}</p>` : ""}
    ${
      summary.examples?.length
        ? `<div class="csv-example-list">
            ${summary.examples
              .map(
                (item) => `
                  <div>
                    <strong>Row ${item.number}</strong>
                    <span class="subtle">${escapeHtml(item.type)}${item.difficulty ? ` · L${escapeHtml(item.difficulty)}` : ""}${item.skill ? ` · ${escapeHtml(item.skill)}` : ""}${item.graphics ? " · Graphic" : ""}</span>
                    <p>${escapeHtml(item.question || "No question text")}</p>
                  </div>
                `
              )
              .join("")}
          </div>`
        : ""
    }
  `;
}

function renderCsvPassageSummary(summary) {
  const groups = [...(summary.passageGroups || new Map()).entries()];
  if (!groups.length) return "";
  return `
    <div class="notice ok">
      <strong>Passages detected:</strong> ${summary.groupedPassages} group${summary.groupedPassages === 1 ? "" : "s"}, ${summary.passageRows} row${summary.passageRows === 1 ? "" : "s"} with passage text.
      <br />
      ${groups
        .slice(0, 8)
        .map(([id, group]) => `${escapeHtml(id)}: ${escapeHtml(group.title)} (${group.count})`)
        .join("<br />")}
      ${groups.length > 8 ? `<br />...and ${groups.length - 8} more` : ""}
    </div>
  `;
}

function renderCsvIssueTable(rowIssues = []) {
  if (!rowIssues.length) return `<div class="notice ok">No row problems found in this CSV preview.</div>`;
  return `
    <details class="csv-issue-table" open>
      <summary>Rows To Fix (${rowIssues.length})</summary>
      <div class="table-wrap">
        <table>
          <thead><tr><th>CSV Row</th><th>Type</th><th>Problem</th><th>Question</th></tr></thead>
          <tbody>
            ${rowIssues
              .slice(0, 30)
              .map(
                (item) => `
                  <tr>
                    <td><strong>${item.row}</strong></td>
                    <td>${escapeHtml(item.type)}</td>
                    <td><span class="pill warn">${escapeHtml(item.issue)}</span></td>
                    <td>${escapeHtml(String(item.question || "").slice(0, 120))}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      ${rowIssues.length > 30 ? `<p class="hint">Showing first 30 row issues. Import to Bank to fix all rows individually or with batch fix.</p>` : ""}
    </details>
  `;
}

function loadExamIdCsv(file) {
  const status = $("#examIdCsvStatus");
  const preview = $("#examIdCsvPreview");
  if (!file) {
    pendingExamIdCsv = "";
    if (status) status.textContent = "No Question-ID CSV selected.";
    if (preview) preview.innerHTML = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    pendingExamIdCsv = String(reader.result || "");
    const inspection = analyzeExamIdCsv(pendingExamIdCsv);
    if (status) status.textContent = `${file.name} loaded. ${inspection.ids.length} Question ID row${inspection.ids.length === 1 ? "" : "s"} found.`;
    if (preview) preview.innerHTML = renderQuestionIdInspection(inspection, "Exam ID CSV Preview");
    if ($("#questionCount") && inspection.ids.length) $("#questionCount").value = inspection.ids.length;
  };
  reader.onerror = () => {
    pendingExamIdCsv = "";
    if (status) status.textContent = "Could not read this CSV file.";
  };
  reader.readAsText(file);
}

function downloadExamIdCsvTemplate() {
  const sampleIds = (state.questionBank || []).slice(0, 3).map((question) => question.sourceQuestionId || question.id);
  const rows = [["Order", "Question ID"], ...(sampleIds.length ? sampleIds : ["Q0001", "Q0002", "Q0003"]).map((id, index) => [index + 1, id])];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  downloadTextFile("topway-exam-question-ids-template.csv", `\ufeff${csv}`, "text/csv;charset=utf-8");
}

async function createExamFromIdCsv() {
  const inspection = analyzeExamIdCsv(pendingExamIdCsv);
  if (!pendingExamIdCsv.trim()) return alert("Choose a Question-ID CSV first.");
  if (inspection.errors.length || inspection.invalid.length) return alert("This exam was not created. Fix every blocked row shown in the CSV preview first.");
  const payload = {
    title: $("#examTitle").value.trim() || "Question ID Exam",
    code: $("#examCode").value.trim(),
    minutes: Math.max(1, Number.parseInt($("#examMinutes").value, 10) || 65),
    examType: $("#examType").value,
    stepMode: $("#stepMode").value,
    adaptive: $("#adaptiveExam")?.checked || false,
    shuffle: $("#shuffleQuestions")?.checked !== false,
    questionIds: inspection.ids,
  };
  try {
    state = await api("/api/admin/exams/from-bank-ids", { method: "POST", body: JSON.stringify(payload) });
    selectedExamId = state.examBuild?.createdExamId || state.exams[0]?.id || null;
    const exam = state.exams.find((item) => item.id === selectedExamId);
    selectedQuestionId = exam?.questions?.[0]?.id || null;
    pendingExamIdCsv = "";
    adminActiveTab = "exams";
    adminSubTabs.exams = "questions";
    alert(`Exam created closed with ${exam?.questions?.length || inspection.ids.length} questions in CSV order. Review it, then open it when ready.`);
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function loadQuestionCsv(file) {
  const status = $("#questionCsvStatus");
  const preview = $("#questionCsvPreview");
  if (!file) {
    pendingQuestionCsv = "";
    if ($("#questionCsvText")) $("#questionCsvText").value = "";
    if (status) status.textContent = "No CSV selected.";
    if (preview) preview.innerHTML = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    pendingQuestionCsv = String(reader.result || "");
    const lineCount = pendingQuestionCsv.split(/\r?\n/).filter((line) => line.trim()).length;
    const questionCount = Math.max(0, lineCount - 1);
    if ($("#questionCsvText")) $("#questionCsvText").value = pendingQuestionCsv.slice(0, 6000);
    if ($("#questionCount") && questionCount) $("#questionCount").value = questionCount;
    if (status) status.textContent = `${file.name} loaded. About ${questionCount} question rows found.`;
    if (preview) preview.innerHTML = renderQuestionCsvPreview(analyzeQuestionCsv(pendingQuestionCsv));
  };
  reader.onerror = () => {
    pendingQuestionCsv = "";
    if (status) status.textContent = "Could not read this CSV file.";
  };
  reader.readAsText(file);
}

function loadBankCsv(file) {
  const status = $("#bankCsvStatus");
  const preview = $("#bankCsvPreview");
  if (!file) {
    pendingBankCsv = "";
    pendingBankFileName = "";
    if ($("#bankCsvText")) $("#bankCsvText").value = "";
    if (status) status.textContent = "No CSV selected.";
    if (preview) preview.innerHTML = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    pendingBankCsv = String(reader.result || "");
    pendingBankFileName = file.name || "";
    const sourceInput = $("#bankImportTestClass");
    if (sourceInput && !sourceInput.value.trim()) sourceInput.value = makeBankSourceLabelFromFileName(file.name);
    if ($("#bankCsvText")) $("#bankCsvText").value = pendingBankCsv.slice(0, 6000);
    if (status) status.textContent = `${file.name} loaded. Review the preview, then import to bank.`;
    if (preview) preview.innerHTML = renderQuestionCsvPreview(analyzeQuestionCsv(pendingBankCsv));
  };
  reader.onerror = () => {
    pendingBankCsv = "";
    if (status) status.textContent = "Could not read this CSV file.";
  };
  reader.readAsText(file);
}

function makeBankSourceLabelFromFileName(fileName = "") {
  return String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function importQuestionBankCsv() {
  const questionCsv = pendingBankCsv || $("#bankCsvText")?.value || "";
  if (!questionCsv.trim()) {
    alert("Choose a question CSV first.");
    return;
  }
  const summary = analyzeQuestionCsv(questionCsv);
  const importantIssues = (summary.missingAnswer || 0) + (summary.missingQuestion || 0) + (summary.missingUnderlineMarkup || 0) + (summary.passageSetupIssues || 0) + (summary.errors?.length || 0);
  if (importantIssues && !confirm(`This CSV has ${importantIssues} important issue(s). Import anyway so you can fix them in the bank?`)) return;
  const importTestClass = $("#bankImportTestClass")?.value || makeBankSourceLabelFromFileName(pendingBankFileName);
  const importSubject = $("#bankImportSubject")?.value || "";

  try {
    const result = await api("/api/admin/question-bank/import", {
      method: "POST",
      body: JSON.stringify({
        questionCsv,
        idPrefix: $("#bankQuestionIdPrefix")?.value || "Q",
        testClass: importTestClass,
        subject: importSubject,
      }),
    });
    if (Array.isArray(result.importedQuestions)) {
      const importedIds = new Set(result.importedQuestions.map((question) => question.id));
      state = { ...state, questionBank: [...result.importedQuestions, ...(state.questionBank || []).filter((question) => !importedIds.has(question.id))] };
      bankFilteredCache = null;
    } else {
      state = result;
    }
    selectedBankQuestionId = result.importedQuestions?.[0]?.id || state.questionBank[0]?.id || null;
    pendingBankCsv = "";
    pendingBankFileName = "";
    bankSearch = "";
    bankClassFilter = importTestClass || "all";
    bankSubjectFilter = importSubject === "math" ? "Math" : importSubject === "english" ? "English / Reading" : "all";
    bankSkillFilter = "all";
    bankDifficultyFilter = "all";
    bankTypeFilter = "all";
    bankListSort = "newest";
    bankPage = 0;
    bankAiPlan = null;
    adminActiveTab = "bank";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function setBankSearch(value) {
  bankSearch = value;
  bankPage = 0;
  bankAiPlan = null;
  renderAdminPreserveScroll("#bankSearch");
}

function queueBankSearch(value) {
  if (bankSearchTimer) clearTimeout(bankSearchTimer);
  bankSearchTimer = setTimeout(() => {
    bankSearchTimer = null;
    setBankSearch(value);
  }, 180);
}

function openBankQuestionById() {
  const query = String($("#bankQuestionIdSearch")?.value || "").trim().toLowerCase();
  if (!query) {
    alert("Enter a system question ID first.");
    return;
  }
  const question = (state.questionBank || []).find((item) => {
    const values = [item.sourceQuestionId, item.id, item.sourceGroupId, item.aiSourceQuestionId].map((value) => String(value || "").trim().toLowerCase());
    return values.includes(query);
  });
  if (!question) {
    alert(`No saved question matches ID "${query}".`);
    return;
  }
  bankSearch = "";
  bankClassFilter = "all";
  bankSubjectFilter = "all";
  bankSkillFilter = "all";
  bankDifficultyFilter = "all";
  bankTypeFilter = "all";
  bankUsageFilter = "all";
  selectedBankQuestionId = question.id;
  const sortedIndex = getBankEditorQuestions(state.questionBank || []).findIndex((item) => item.id === question.id);
  bankPage = sortedIndex >= 0 ? Math.floor(sortedIndex / BANK_PAGE_SIZE) : 0;
  adminActiveTab = "bank";
  adminSubTabs.bank = "edit";
  renderAdmin();
}

function setBankClassFilter(value) {
  bankClassFilter = value;
  bankPage = 0;
  bankAiPlan = null;
  renderAdminPreserveScroll();
}

function setBankSubjectFilter(value) {
  bankSubjectFilter = value;
  bankPage = 0;
  bankAiPlan = null;
  questionMixPlan = null;
  renderAdminPreserveScroll();
}

function setBankBuildSubject(value) {
  const subject = value === "math" ? "Math" : "English / Reading";
  bankSubjectFilter = subject;
  const currentClassHasSubject = bankClassFilter === "all" || (state.questionBank || []).some(
    (question) => getBankQuestionClass(question) === bankClassFilter && inferBankQuestionSubject(question) === subject
  );
  if (!currentClassHasSubject) bankClassFilter = "all";
  bankPage = 0;
  bankAiPlan = null;
  questionMixPlan = null;
  renderAdminPreserveScroll();
}

function openBankClass(value) {
  bankClassFilter = value;
  bankPage = 0;
  bankAiPlan = null;
  adminActiveTab = "bank";
  adminSubTabs.bank = "build";
  renderAdmin();
}

function setBankSkillFilter(value) {
  bankSkillFilter = value;
  bankPage = 0;
  bankAiPlan = null;
  renderAdminPreserveScroll();
}

function setBankDifficultyFilter(value) {
  bankDifficultyFilter = value;
  bankPage = 0;
  bankAiPlan = null;
  questionMixPlan = null;
  renderAdminPreserveScroll();
}

function setBankTypeFilter(value) {
  bankTypeFilter = value;
  bankPage = 0;
  bankAiPlan = null;
  renderAdminPreserveScroll();
}

function setBankUsageFilter(value) {
  bankUsageFilter = value === "unused" ? "unused" : "all";
  bankPage = 0;
  bankAiPlan = null;
  questionMixPlan = null;
  renderAdminPreserveScroll();
}

function resetBankAdvancedFilters() {
  bankClassFilter = "all";
  bankSkillFilter = "all";
  bankDifficultyFilter = "all";
  bankTypeFilter = "all";
  bankUsageFilter = "all";
  bankPage = 0;
  bankAiPlan = null;
  questionMixPlan = null;
  renderAdminPreserveScroll();
}

function syncBankQuestionFromDom(question) {
  if (!question) return {};
  const edits = {
    questionText: question.questionText || "",
    testClass: question.testClass || "",
    subject: question.subject || "",
    section: question.section || "",
    originalNumber: question.originalNumber || question.number || "",
    skill: question.skill || "",
    difficulty: question.difficulty || "",
    type: question.type || "multiple",
    answer: question.answer || "",
    choices: (question.choices || []).join(", "),
    dragTargets: (question.dragTargets || []).join(", "),
    gridRows: (question.gridRows || []).join(", "),
    groupId: question.groupId || "",
    imageUrl: question.imageUrl || "",
    sharedImageUrl: question.sharedImageUrl || "",
    passageTitle: question.passageTitle || "",
    passageText: question.passageText || "",
    questionFont: question.questionFont || "",
    explanation: question.explanation || "",
    sourceQuestionId: question.sourceQuestionId || "",
    sourceGroupId: question.sourceGroupId || question.aiSourceQuestionId || question.sourceQuestionId || "",
  };
  document.querySelectorAll(`[data-bank-q="${question.id}"][data-field]`).forEach((input) => {
    edits[input.dataset.field] = input.value.trim();
  });
  return edits;
}

function selectBankQuestion(id) {
  const editorQuestions = getBankEditorQuestions(getFilteredBankQuestions());
  const index = editorQuestions.findIndex((question) => question.id === id);
  const nextPage = index >= 0 ? Math.floor(index / BANK_PAGE_SIZE) : bankPage;
  selectedBankQuestionId = id;
  if (nextPage === bankPage && updateBankQuestionDetailOnly(id)) return;
  bankPage = nextPage;
  renderAdminPreserveScroll();
}

function updateBankQuestionDetailOnly(id) {
  const detail = document.getElementById("bankQuestionDetail");
  const question = (state.questionBank || []).find((item) => item.id === id);
  if (!detail || !question || adminActiveTab !== "bank" || getAdminSubTab("bank") !== "edit") return false;
  detail.innerHTML = renderBankQuestionDetailPanel(question);
  document.querySelectorAll("[data-bank-nav-id]").forEach((item) => item.classList.toggle("active", item.dataset.bankNavId === id));
  return true;
}

function refreshBankQuestionEditor() {
  const host = document.getElementById("bankQuestionEditorHost");
  if (!host || adminActiveTab !== "bank" || getAdminSubTab("bank") !== "edit") return false;
  const navScrollTop = host.querySelector(".question-nav-list")?.scrollTop || 0;
  const questions = getFilteredBankQuestions();
  const selectedQuestion = questions.find((question) => question.id === selectedBankQuestionId) || questions[0] || null;
  host.outerHTML = renderBankQuestionEditor(questions, selectedQuestion);
  const nextNav = document.querySelector("#bankQuestionEditorHost .question-nav-list");
  if (nextNav) nextNav.scrollTop = navScrollTop;
  return true;
}

function setBankListSort(value) {
  bankListSort = value === "source" ? "source" : "newest";
  bankPage = 0;
  if (!refreshBankQuestionEditor()) renderAdminPreserveScroll("#bankListSort");
}

function changeBankPage(delta) {
  const pageCount = Math.max(1, Math.ceil(getFilteredBankQuestions().length / BANK_PAGE_SIZE));
  bankPage = Math.max(0, Math.min(bankPage + delta, pageCount - 1));
  if (!refreshBankQuestionEditor()) renderAdminPreserveScroll();
}

function toggleBankQuestionSelection(id, checked) {
  if (checked) {
    selectedBankQuestionIds.add(id);
  } else {
    selectedBankQuestionIds.delete(id);
  }
  updateBankSelectionUi();
}

function selectFilteredBankQuestions() {
  getFilteredBankQuestions().forEach((question) => selectedBankQuestionIds.add(question.id));
  updateBankSelectionUi();
}

function selectFirstFilteredBankQuestions() {
  const limit = Math.max(1, Number.parseInt($("#bankSelectLimit")?.value, 10) || 1);
  getFilteredBankQuestions()
    .slice(0, limit)
    .forEach((question) => selectedBankQuestionIds.add(question.id));
  updateBankSelectionUi();
}

function clearBankQuestionSelection() {
  selectedBankQuestionIds = new Set();
  updateBankSelectionUi();
}

function getCheckedBankQuestionIds() {
  const domCheckedIds = [...document.querySelectorAll(".bank-nav-item input[type='checkbox']:checked")]
    .map((input) => input.dataset.questionId)
    .filter(Boolean);
  return [...new Set([...selectedBankQuestionIds, ...domCheckedIds])];
}

function updateBankSelectionUi() {
  document.querySelectorAll(".bank-nav-item input[type='checkbox'][data-question-id]").forEach((input) => {
    input.checked = selectedBankQuestionIds.has(input.dataset.questionId);
  });
  document.querySelectorAll("[data-bank-selection-count]").forEach((item) => {
    item.textContent = String(selectedBankQuestionIds.size);
  });
  document.querySelectorAll("[data-bank-selection-summary]").forEach((item) => {
    item.outerHTML = renderBankSelectionSummary();
  });
}

function selectFirstAvailableBankQuestion() {
  const visibleQuestion = getBankEditorQuestions(getFilteredBankQuestions())[0] || getBankEditorQuestions(state.questionBank || [])[0] || null;
  selectedBankQuestionId = visibleQuestion?.id || null;
  selectedBankQuestionIds = new Set([...selectedBankQuestionIds].filter((id) => state.questionBank?.some((question) => question.id === id)));
}

async function saveBankQuestion(id, options = {}) {
  const question = state.questionBank.find((item) => item.id === id);
  if (!question) {
    await loadAdminState();
    selectFirstAvailableBankQuestion();
    if (!refreshBankQuestionEditor()) renderAdminPreserveScroll();
    return;
  }
  const edits = syncBankQuestionFromDom(question);
  const editedId = String(edits.sourceQuestionId || "").trim().toLowerCase();
  const duplicate = editedId
    ? state.questionBank.find((item) => item.id !== id && String(item.sourceQuestionId || "").trim().toLowerCase() === editedId)
    : null;
  if (duplicate && !confirm(`Another bank question already uses ID "${edits.sourceQuestionId}". Save anyway?`)) return;
  try {
    const result = await api(`/api/admin/question-bank/${id}`, { method: "POST", body: JSON.stringify(edits) });
    state = result.question
      ? { ...state, questionBank: (state.questionBank || []).map((item) => (item.id === id ? result.question : item)) }
      : result;
    selectedBankQuestionId = id;
    if (!refreshBankQuestionEditor()) renderAdminPreserveScroll();
    if (!options.silent) showAdminToast("Question saved.");
  } catch (error) {
    if (/Bank question not found/i.test(error.message)) {
      await loadAdminState();
      selectFirstAvailableBankQuestion();
      renderAdminPreserveScroll();
      alert("That bank question was already removed or changed. I refreshed the Bank list.");
      return;
    }
    alert(error.message);
  }
}

async function deleteBankQuestion(id) {
  const question = state.questionBank.find((item) => item.id === id);
  if (!question || !confirm("Delete this bank question? Exams already created from it will stay unchanged.")) return;
  try {
    const result = await api(`/api/admin/question-bank/${id}`, { method: "DELETE" });
    state = result.deletedQuestionId ? { ...state, questionBank: (state.questionBank || []).filter((item) => item.id !== result.deletedQuestionId) } : result;
    selectedBankQuestionIds.delete(id);
    if (bankInspectorQuestionId === id) {
      bankInspectorQuestionId = "";
      adminActiveTab = "bank";
      adminSubTabs.bank = "cleanup";
    }
    selectFirstAvailableBankQuestion();
    renderAdminPreserveScroll();
  } catch (error) {
    if (/Bank question not found/i.test(error.message)) {
      await loadAdminState();
      selectedBankQuestionIds.delete(id);
      selectFirstAvailableBankQuestion();
      renderAdminPreserveScroll();
      return;
    }
    alert(error.message);
  }
}

async function deleteSelectedBankQuestions() {
  const availableIds = new Set((state.questionBank || []).map((question) => question.id));
  const questionIds = getCheckedBankQuestionIds().filter((id) => availableIds.has(id));
  if (!questionIds.length) {
    alert("Check at least one bank question first.");
    return;
  }
  if (!confirm(`Delete ${questionIds.length} checked bank question${questionIds.length === 1 ? "" : "s"}?\n\nExams already created from them will stay unchanged.`)) return;
  try {
    const result = await api("/api/admin/question-bank/batch-delete", {
      method: "POST",
      body: JSON.stringify({ questionIds }),
    });
    if (Array.isArray(result.deletedQuestionIds)) {
      const deletedIds = new Set(result.deletedQuestionIds);
      state = { ...state, questionBank: (state.questionBank || []).filter((question) => !deletedIds.has(question.id)) };
      bankFilteredCache = null;
    } else {
      state = result;
    }
    selectedBankQuestionIds = new Set();
    selectFirstAvailableBankQuestion();
    adminActiveTab = "bank";
    renderAdminPreserveScroll();
  } catch (error) {
    if (/No matching bank questions found|Bank question not found/i.test(error.message)) {
      await loadAdminState();
      selectedBankQuestionIds = new Set();
      selectFirstAvailableBankQuestion();
      renderAdminPreserveScroll();
      return;
    }
    alert(error.message);
  }
}

async function deleteDuplicateBankQuestions(questionIds = [], label = "duplicate group") {
  const availableIds = new Set((state.questionBank || []).map((question) => question.id));
  const ids = [...new Set((Array.isArray(questionIds) ? questionIds : []).map(String))].filter((id) => availableIds.has(id));
  if (!ids.length) {
    alert("No duplicate questions are available to delete.");
    return;
  }
  const questionLabels = ids
    .map((id) => {
      const question = state.questionBank.find((item) => item.id === id);
      return question?.sourceQuestionId || question?.id || id;
    })
    .join(", ");
  const duplicateWarning = `Delete ${ids.length} duplicate question${ids.length === 1 ? "" : "s"} from "${label}"?\n\nDeleting: ${questionLabels}\n\nThis only removes the extra bank copies from the current duplicate action. Existing exams, submitted reports, and student scores already created from these questions will stay unchanged.`;
  if (!confirm(duplicateWarning)) return;
  try {
    const result = await api("/api/admin/question-bank/batch-delete", {
      method: "POST",
      body: JSON.stringify({ questionIds: ids }),
    });
    if (Array.isArray(result.deletedQuestionIds)) {
      const deletedIds = new Set(result.deletedQuestionIds);
      state = { ...state, questionBank: (state.questionBank || []).filter((question) => !deletedIds.has(question.id)) };
      bankFilteredCache = null;
    } else {
      state = result;
    }
    ids.forEach((id) => selectedBankQuestionIds.delete(id));
    if (ids.includes(selectedBankQuestionId)) selectFirstAvailableBankQuestion();
    bankAiPlan = null;
    adminActiveTab = "bank";
    renderAdminPreserveScroll();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteAllExactTextDuplicateBankQuestions() {
  const ids = getAllExactTextDuplicateExtraIds(getFilteredBankQuestions());
  if (!ids.length) {
    alert("No exact same-text duplicate questions were found in the current filter.");
    return;
  }
  await deleteDuplicateBankQuestions(ids, "All exact same-text duplicate groups");
}

async function regenerateBankQuestionIds() {
  const questions = getFilteredBankQuestions();
  if (!questions.length) {
    alert("No bank questions match the current filter.");
    return;
  }
  const idPrefix = $("#regenerateBankIdPrefix")?.value || "Q";
  const startNumber = Math.max(1, Number.parseInt($("#regenerateBankIdStart")?.value, 10) || 1);
  const exampleFirst = `${String(idPrefix || "Q").toUpperCase()}${String(startNumber).padStart(4, "0")}`;
  const exampleLast = `${String(idPrefix || "Q").toUpperCase()}${String(startNumber + questions.length - 1).padStart(4, "0")}`;
  if (!confirm(`Regenerate IDs for ${questions.length} filtered bank question(s)?\n\nExample: ${exampleFirst} to ${exampleLast}`)) return;

  try {
    state = await api("/api/admin/question-bank/regenerate-ids", {
      method: "POST",
      body: JSON.stringify({ questionIds: questions.map((question) => question.id), idPrefix, startNumber }),
    });
    selectedBankQuestionId = questions[0]?.id || state.questionBank[0]?.id || null;
    adminActiveTab = "bank";
    renderAdminPreserveScroll();
  } catch (error) {
    alert(error.message);
  }
}

async function batchFixBankQuestions() {
  const questions = getFilteredBankQuestions();
  if (!questions.length) {
    alert("No bank questions match the current filter.");
    return;
  }
  const updates = {
    testClass: $("#batchBankTestClass")?.value || "",
    section: $("#batchBankSection")?.value || "",
    skill: $("#batchBankSkill")?.value || "",
    difficulty: $("#batchBankDifficulty")?.value || "",
    type: $("#batchBankType")?.value || "",
    choices: $("#batchBankChoices")?.value || "",
    groupId: $("#batchBankGroupId")?.value || "",
  };
  const changedFields = Object.entries(updates)
    .filter(([, value]) => String(value || "").trim())
    .map(([field]) => field);
  if (!changedFields.length) {
    alert("Enter at least one field to batch fix.");
    return;
  }
  if (!confirm(`Apply ${changedFields.join(", ")} to ${questions.length} filtered bank question(s)?`)) return;

  try {
    const result = await api("/api/admin/question-bank/batch-update", {
      method: "POST",
      body: JSON.stringify({ questionIds: questions.map((question) => question.id), updates }),
    });
    if (Array.isArray(result.questions)) {
      const updatesById = new Map(result.questions.map((question) => [question.id, question]));
      state = { ...state, questionBank: (state.questionBank || []).map((question) => updatesById.get(question.id) || question) };
      bankFilteredCache = null;
    } else {
      state = result;
    }
    selectedBankQuestionId = questions[0]?.id || state.questionBank[0]?.id || null;
    adminActiveTab = "bank";
    renderAdminPreserveScroll();
  } catch (error) {
    alert(error.message);
  }
}

async function createExamFromBank() {
  const candidates = getFilteredBankQuestions();
  const reusePolicy = normalizeQuestionReusePolicy($("#bankExamReusePolicy")?.value);
  const program = $("#bankExamProgram")?.value.trim() || "";
  if (reusePolicy === "different_program" && !program) {
    alert("Enter a Program / Course name before using the program-specific reuse policy.");
    return;
  }
  const policyCandidates = filterQuestionsByReusePolicy(candidates, reusePolicy, program);
  const readiness = getBankExamReadiness(policyCandidates);
  const questionIds = readiness.ready.map((question) => question.id);
  if (!questionIds.length) {
    alert(candidates.length ? "No visible questions are available under this reuse policy, or the remaining questions need review. Choose another policy or fix the highlighted bank questions." : "No bank questions match the current filter.");
    return;
  }
  const openPaperForm = Boolean($("#bankExamPaperForm")?.checked);
  const payload = {
    questionIds,
    title: $("#bankExamTitle")?.value.trim() || "Question Bank Exam",
    code: $("#bankExamCode")?.value.trim() || "",
    minutes: Math.max(1, Number.parseInt($("#bankExamMinutes")?.value, 10) || 65),
    examType: $("#bankExamType")?.value || "english",
    program,
    reusePolicy,
    stepMode: "one",
    shuffle: $("#bankExamShuffle").checked,
    adaptive: $("#bankExamAdaptive").checked,
    targetStudentId: $("#mixTargetStudentId")?.value || "",
  };
  try {
    state = await api("/api/admin/question-bank/create-exam", { method: "POST", body: JSON.stringify(payload) });
    const createdExam = findCreatedBankExam(state.exams, questionIds, payload.title, payload.code);
    if (!createdExam) throw new Error("The exam request finished, but the new exam was not found. Please try again after refreshing.");
    selectedExamId = createdExam.id;
    selectedQuestionId = createdExam.questions[0]?.id || null;
    adminActiveTab = "exams";
    if (openPaperForm) {
      openPaperExamForm(createdExam.id);
      return;
    }
    const omitted = Number(state.examBuild?.omittedVariantCount) || 0;
    const companions = Number(state.examBuild?.expandedPassageCount) || 0;
    const needsReview = readiness.invalid.length;
    alert(`Exam created with ${createdExam.questions.length} bank question${createdExam.questions.length === 1 ? "" : "s"}.${companions ? ` ${companions} companion passage question${companions === 1 ? " was" : "s were"} included automatically.` : ""}${omitted ? ` ${omitted} alternate version${omitted === 1 ? " was" : "s were"} left out so the same source question cannot appear twice.` : ""}${needsReview ? ` ${needsReview} incomplete question${needsReview === 1 ? " was" : "s were"} left out for review.` : ""} All questions remain saved in the bank and can be reused.`);
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function generateQuestionMixDraft() {
  questionMixPlan = buildQuestionMixDraft();
  if (!questionMixPlan.selected.length && !questionMixPlan.configurationErrors?.length) alert("No ready questions match this mix. Check the difficulty levels, reading count, current filters, and requested formats.");
  renderAdminPreserveScroll();
}

function applyShsatEla50Mix() {
  // The preset is only for ELA. Switching the filter first prevents an ELA
  // request from being drafted from a Math bank (or an empty Math filter).
  bankSubjectFilter = "English / Reading";
  const currentClassHasEnglish = bankClassFilter === "all" || (state.questionBank || []).some(
    (question) => getBankQuestionClass(question) === bankClassFilter && inferBankQuestionSubject(question) === "English / Reading"
  );
  if (!currentClassHasEnglish) bankClassFilter = "all";
  if ($("#bankExamType")) $("#bankExamType").value = "english";
  const values = {
    mixTotal: 50,
    mixReadingPercent: 80,
    mixReadingMinPercent: 70,
    mixReadingMaxPercent: 80,
    mixReadingCount: "",
    mixReadingSelected: "Auto",
    mixFillBlank: 0,
    mixDropdown: 0,
    mixDragDrop: 0,
    mixTableGrid: 0,
    mixNumeric: 0,
    mixEquation: 0,
    mixHotText: 0,
    mixHotspot: 0,
  };
  Object.entries(values).forEach(([id, value]) => {
    const input = $(`#${id}`);
    if (input) input.value = String(value);
  });
  updateFlexibleMixTotals();
  generateQuestionMixDraft();
}

function applyShsatMath50Mix() {
  bankSubjectFilter = "Math";
  const currentClassHasMath = bankClassFilter === "all" || (state.questionBank || []).some(
    (question) => getBankQuestionClass(question) === bankClassFilter && inferBankQuestionSubject(question) === "Math"
  );
  if (!currentClassHasMath) bankClassFilter = "all";
  if ($("#bankExamType")) $("#bankExamType").value = "math";
  const values = {
    mixTotal: 50,
    mixReadingPercent: 0,
    mixReadingMinPercent: 0,
    mixReadingMaxPercent: 0,
    mixReadingCount: "",
    mixReadingSelected: "Auto",
    mixFillBlank: 0,
    mixDropdown: 0,
    mixDragDrop: 0,
    mixTableGrid: 0,
    mixNumeric: 3,
    mixEquation: 2,
    mixHotText: 0,
    mixHotspot: 0,
  };
  Object.entries(values).forEach(([id, value]) => {
    const input = $(`#${id}`);
    if (input) input.value = String(value);
  });
  updateFlexibleMixTotals();
  generateQuestionMixDraft();
}

function useQuestionMixDraft() {
  if (!questionMixPlan?.selected?.length) {
    alert("Auto-pick a question mix first.");
    return;
  }
  if (!questionMixPlan.complete) {
    alert("This draft does not exactly match the difficulty levels, reading count, total, and formats you requested. Adjust the mix and Auto-Pick again.");
    return;
  }
  selectedBankQuestionIds = new Set(questionMixPlan.selected.map((question) => question.id));
  selectedBankQuestionId = questionMixPlan.selected[0]?.id || selectedBankQuestionId;
  adminSubTabs.bank = "edit";
  renderAdmin();
}

async function createExamFromQuestionMixDraft() {
  if (!questionMixPlan?.selected?.length) {
    alert("Auto-pick a question mix first.");
    return;
  }
  if (!questionMixPlan.complete) {
    alert(`This mix does not exactly match your requested levels, reading count, total, and formats. Resolve the highlighted shortage before creating the exam.`);
    return;
  }
  const exactQuestionIds = questionMixPlan.selected.map((question) => question.id);
  selectedBankQuestionIds = new Set(exactQuestionIds);
  await createExamFromSelectedBankQuestions(exactQuestionIds, {
    target: questionMixPlan.target,
    typeCounts: questionMixPlan.requested,
    readingTarget: questionMixPlan.readingTarget,
    difficultyLevels: questionMixPlan.difficultyLevels,
  }, questionMixPlan.targetStudentId || "", {
    program: questionMixPlan.program || "",
    reusePolicy: questionMixPlan.reusePolicy || "never_used",
    examType: questionMixPlan.examType || "english",
  });
}

function generateSmartBankExamDraft() {
  const questions = getFilteredBankQuestions();
  if (!questions.length) {
    alert("No bank questions match the current filter.");
    return;
  }
  bankAiPlan = buildSmartBankExamDraft();
  if (!bankAiPlan.selected.length && !bankAiPlan.configurationErrors?.length) {
    alert("No usable questions found. Check that questions have question text/image and correct answers saved.");
  }
  renderAdminPreserveScroll();
}

function useSmartBankDraft() {
  if (!bankAiPlan?.selected?.length) {
    alert("Generate a draft first.");
    return;
  }
  if (!bankAiPlan.complete) {
    alert("This draft does not match the requested total, reading count, and difficulty mix. Adjust the settings and generate again.");
    return;
  }
  selectedBankQuestionIds = new Set(bankAiPlan.selected.map((question) => question.id));
  selectedBankQuestionId = bankAiPlan.selected[0]?.id || selectedBankQuestionId;
  renderAdminPreserveScroll();
}

async function createExamFromSmartBankDraft() {
  if (!bankAiPlan?.selected?.length) {
    alert("Generate a draft first.");
    return;
  }
  if (!bankAiPlan.complete) {
    alert("This draft does not match the requested total, reading count, and difficulty mix, so no exam was created.");
    return;
  }
  selectedBankQuestionIds = new Set(bankAiPlan.selected.map((question) => question.id));
  await createExamFromSelectedBankQuestions(null, null, bankAiPlan.targetStudentId || "", {
    title: bankAiPlan.examTitle || "Smart Question Bank Exam",
    code: bankAiPlan.examCode || "",
    minutes: bankAiPlan.minutes || 65,
    examType: bankAiPlan.options?.subject === "Math" ? "math" : "english",
    program: bankAiPlan.program || "",
    reusePolicy: bankAiPlan.reusePolicy || "never_used",
  });
}

async function createExamFromSelectedBankQuestions(explicitQuestionIds = null, mixConstraints = null, targetStudentId = "", buildOptions = {}) {
  const availableIds = new Set((state.questionBank || []).map((question) => question.id));
  let questionIds = (Array.isArray(explicitQuestionIds) ? explicitQuestionIds : getCheckedBankQuestionIds()).filter((id) => availableIds.has(id));
  if (!questionIds.length && selectedBankQuestionId && availableIds.has(selectedBankQuestionId)) {
    questionIds = [selectedBankQuestionId];
  }
  if (!questionIds.length) {
    alert("Check at least one bank question first, or open one question from the Bank list.");
    return;
  }
  const openPaperForm = Boolean($("#bankExamPaperForm")?.checked);
  targetStudentId = targetStudentId || $("#mixTargetStudentId")?.value || $("#aiExamTargetStudentId")?.value || "";
  const examTitle = String(buildOptions.title || $("#bankExamTitle")?.value || $("#aiExamTitle")?.value || "Question Bank Exam").trim();
  const examCode = String(buildOptions.code || $("#bankExamCode")?.value || $("#aiExamCode")?.value || "").trim();
  const examProgram = String(buildOptions.program || $("#bankExamProgram")?.value || $("#aiExamProgram")?.value || "").trim();
  const reusePolicy = normalizeQuestionReusePolicy(buildOptions.reusePolicy || $("#bankExamReusePolicy")?.value || $("#aiExamReusePolicy")?.value);
  const requestedExamType = buildOptions.examType || $("#bankExamType")?.value || ($("#aiExamSubject")?.value === "Math" ? "math" : "english");
  const payload = {
    questionIds,
    title: examTitle || "Question Bank Exam",
    code: examCode,
    minutes: Math.max(1, Number.parseInt(buildOptions.minutes || $("#bankExamMinutes")?.value || $("#aiExamMinutes")?.value, 10) || 65),
    examType: requestedExamType === "math" ? "math" : "english",
    program: examProgram,
    reusePolicy,
    stepMode: "one",
    shuffle: $("#bankExamShuffle").checked,
    adaptive: $("#bankExamAdaptive").checked,
    targetStudentId,
    ...(mixConstraints ? { mixConstraints } : {}),
  };
  try {
    state = await api("/api/admin/question-bank/create-exam", { method: "POST", body: JSON.stringify(payload) });
    const createdExam = findCreatedBankExam(state.exams, questionIds, payload.title, payload.code);
    if (!createdExam) throw new Error("The exam request finished, but the new exam was not found. Please try again after refreshing.");
    selectedExamId = createdExam.id;
    selectedQuestionId = createdExam.questions[0]?.id || null;
    selectedBankQuestionIds = new Set();
    adminActiveTab = "exams";
    if (openPaperForm) {
      openPaperExamForm(createdExam.id);
      return;
    }
    const omitted = Number(state.examBuild?.omittedVariantCount) || 0;
    const companions = Number(state.examBuild?.expandedPassageCount) || 0;
    const needsReview = Number(state.examBuild?.omittedInvalidCount) || 0;
    alert(`Exam created with ${createdExam.questions.length} bank question${createdExam.questions.length === 1 ? "" : "s"}.${companions ? ` ${companions} companion passage question${companions === 1 ? " was" : "s were"} included automatically.` : ""}${omitted ? ` ${omitted} alternate version${omitted === 1 ? " was" : "s were"} left out so the same source question cannot appear twice.` : ""}${needsReview ? ` ${needsReview} incomplete question${needsReview === 1 ? " was" : "s were"} left out for review.` : ""} All questions remain saved in the bank and can be reused.`);
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function findCreatedBankExam(exams, bankQuestionIds, title, code) {
  const selectedSourceGroups = new Set(
    (state.questionBank || [])
      .filter((question) => bankQuestionIds.includes(question.id))
      .filter((question) => !getBankQuestionReadinessIssues(question).length)
      .map(getBankQuestionSourceGroupId)
  );
  const expectedCode = String(code || title.slice(0, 3) + "-BANK").trim().toUpperCase();
  return [...(exams || [])]
    .filter((exam) => exam.source === "question-bank" || String(exam.code || "").toUpperCase() === expectedCode || exam.title === title)
    .find((exam) => {
      const examSourceGroups = new Set((exam.questions || []).map(getBankQuestionSourceGroupId));
      const hasMatchingQuestions = [...selectedSourceGroups].every((id) => examSourceGroups.has(id));
      return hasMatchingQuestions;
    });
}

async function createExam() {
  try {
    const questionCsv = pendingQuestionCsv || $("#questionCsvText")?.value || "";
    if (questionCsv.trim()) {
      const csvSummary = analyzeQuestionCsv(questionCsv);
      const blockingIssues = (csvSummary.missingAnswer || 0) + (csvSummary.missingQuestion || 0) + (csvSummary.missingUnderlineMarkup || 0) + (csvSummary.passageSetupIssues || 0) + (csvSummary.errors?.length || 0);
      const softIssues = (csvSummary.missingSkill || 0) + (csvSummary.missingDifficulty || 0);
      if (blockingIssues) return alert(`This exam was not created. The CSV has ${blockingIssues} blocking issue(s). Fix every red issue in the preview first.`);
      if (!blockingIssues && softIssues && !confirm(`This CSV has ${softIssues} missing skill/difficulty value(s). Create the exam anyway?`)) return;
    }

    const openPaperForm = Boolean($("#examPaperForm")?.checked);
    const payload = {
      title: $("#examTitle").value.trim() || "Untitled Exam",
      code: $("#examCode").value.trim(),
      minutes: Math.max(1, Number.parseInt($("#examMinutes").value, 10) || 65),
      examType: $("#examType").value,
      stepMode: $("#stepMode").value,
      questionCount: Math.max(1, Number.parseInt($("#questionCount").value, 10) || 20),
      choiceCount: Math.max(4, Math.min(5, Number.parseInt($("#choiceCount").value, 10) || 5)),
      answerKey: $("#answerKey").value,
      questionCsv,
      idPrefix: $("#questionIdPrefix")?.value || $("#examCode")?.value || "Q",
      adaptive: $("#adaptiveExam")?.checked || false,
      shuffle: $("#shuffleQuestions").checked,
    };
    const result = await api("/api/admin/exams", { method: "POST", body: JSON.stringify(payload) });
    state = result;
    selectedExamId = state.exams[0]?.id || null;
    selectedQuestionId = state.exams[0]?.questions[0]?.id || null;
    pendingQuestionCsv = "";
    adminActiveTab = "exams";
    if (questionCsv.trim()) adminSubTabs.exams = "questions";
    if (openPaperForm && selectedExamId) {
      openPaperExamForm(selectedExamId);
      return;
    }
    if (questionCsv.trim()) alert(`CSV exam created closed with ${state.exams[0]?.questions?.length || 0} questions. Review every question, then open the exam when ready.`);
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function selectExam(id) {
  selectedExamId = id;
  adminActiveTab = "exams";
  adminSubTabs.exams = "manage";
  renderAdmin();
}

function setExamListSearch(value) {
  examListSearch = value;
  renderAdminPreserveScroll("#examListSearch");
}

function setExamListSubjectFilter(value) {
  examListSubjectFilter = value;
  renderAdminPreserveScroll();
}

function setExamListStatusFilter(value) {
  examListStatusFilter = value;
  renderAdminPreserveScroll();
}

function selectExamForQuestions(id) {
  selectedExamId = id;
  const exam = state.exams.find((item) => item.id === id);
  selectedQuestionId = exam?.questions?.[0]?.id || null;
  adminActiveTab = "exams";
  adminSubTabs.exams = "questions";
  renderAdmin();
}

async function saveExamSettings(id) {
  const payload = {
    title: $("#editExamTitle").value.trim() || "Untitled Exam",
    code: $("#editExamCode").value.trim(),
    minutes: Math.max(1, Number.parseInt($("#editExamMinutes").value, 10) || 65),
    examType: $("#editExamType").value,
    program: $("#editExamProgram")?.value.trim() || "",
    reusePolicy: normalizeQuestionReusePolicy($("#editExamReusePolicy")?.value),
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
  const relatedAttempts = (state.attempts || []).filter((attempt) => attempt.examId === id && attempt.status !== "submitted").length;
  const message = relatedSubmissions
    ? `Delete "${exam.title}", its ${relatedSubmissions} saved submission/report(s), and ${relatedAttempts} in-progress attempt(s)? This cannot be undone.`
    : `Delete "${exam.title}" and ${relatedAttempts} in-progress attempt(s)? This cannot be undone.`;
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

async function clearExamAttempts(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam) return;
  const relatedAttempts = (state.attempts || []).filter((attempt) => attempt.examId === id && attempt.status !== "submitted").length;
  if (!relatedAttempts) return;
  if (!confirm(`Clear ${relatedAttempts} in-progress attempt(s) for "${exam.title}"? Submitted reports will stay saved.`)) return;

  try {
    state = await api(`/api/admin/exams/${id}/attempts`, { method: "DELETE" });
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteWaitingReport(attemptId) {
  const attempt = (state.attempts || []).find((item) => item.id === attemptId);
  if (!attempt) return;
  if (!confirm(`Delete this waiting report for "${attempt.studentName || "Student"}"? Submitted reports will stay saved.`)) return;

  try {
    state = await api(`/api/admin/attempts/${attemptId}`, { method: "DELETE" });
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteSubmittedReport(submissionId) {
  const submission = (state.submissions || []).find((item) => item.id === submissionId);
  if (!submission) return;
  const exam = (state.exams || []).find((item) => item.id === submission.examId);
  const label = `${submission.studentName || "Student"}${exam ? ` - ${exam.title}` : ""}`;
  if (!confirm(`Delete detailed report for "${label}"?\n\nThe student profile keeps the exam title and score history. This removes the detailed report and its completed attempt record only.`)) return;

  try {
    state = await api(`/api/admin/submissions/${submissionId}`, { method: "DELETE" });
    selectedSubmissionId = state.submissions.find((item) => item.id === selectedSubmissionId)?.id || state.submissions[0]?.id || null;
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

async function repairExamNumbering(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  if (!confirm(`Renumber the current visible order as 1–${exam.questions.length}? Source Question IDs and original source numbers will stay unchanged.`)) return;
  try {
    await saveQuestionEdits(examId, { render: false, silent: true });
    state = await api(`/api/admin/exams/${examId}/questions/renumber`, { method: "POST" });
    selectedExamId = examId;
    alert(`Exam numbering repaired to 1–${exam.questions.length}.`);
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

function updateExamQuestionIdPreview(examId) {
  const preview = $("#examQuestionIdPreview");
  if (!preview) return;
  const exam = state.exams.find((item) => item.id === examId);
  const ids = parseQuestionIdInput($("#examAddQuestionIds")?.value || "");
  preview.innerHTML = ids.length ? renderQuestionIdInspection(inspectQuestionIds(ids, exam), "Questions to Append") : "";
}

async function addQuestionsById(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;
  const ids = parseQuestionIdInput($("#examAddQuestionIds")?.value || "");
  if (!ids.length) return alert("Type at least one Question ID first.");
  const inspection = inspectQuestionIds(ids, exam);
  if (inspection.invalid.length) return alert("Nothing was added. Fix every blocked Question ID shown in the preview first.");
  const activeAttempts = (state.attempts || []).filter((attempt) => attempt.examId === examId && attempt.status !== "submitted").length;
  if ((exam.open || activeAttempts) && !confirm(`This exam is ${exam.open ? "open" : "closed"}${activeAttempts ? ` with ${activeAttempts} active attempt(s)` : ""}. Append ${ids.length} question${ids.length === 1 ? "" : "s"} now?`)) return;
  try {
    await saveQuestionEdits(examId, { render: false, silent: true });
    state = await api(`/api/admin/exams/${examId}/questions/from-bank`, {
      method: "POST",
      body: JSON.stringify({ questionIds: ids }),
    });
    const updatedExam = state.exams.find((item) => item.id === examId);
    const addedInternalIds = state.examUpdate?.addedQuestionInternalIds || [];
    selectedExamId = examId;
    selectedQuestionId = addedInternalIds[addedInternalIds.length - 1] || updatedExam?.questions?.[updatedExam.questions.length - 1]?.id || null;
    alert(`${ids.length} question${ids.length === 1 ? "" : "s"} loaded into the end of the exam in the order entered.`);
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
      dragTargets: (question.dragTargets || []).join(", "),
      gridRows: (question.gridRows || []).join(", "),
      answer: question.answer || "",
      questionText: question.questionText || "",
      imageUrl: question.imageUrl || "",
      sharedImageUrl: question.sharedImageUrl || "",
      passageTitle: question.passageTitle || "",
      passageText: question.passageText || "",
      questionFont: question.questionFont || "",
      skill: question.skill || "",
      difficulty: question.difficulty || "",
      explanation: question.explanation || "",
      sourceQuestionId: question.sourceQuestionId || "",
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
    if (render) renderAdminPreserveScroll();
  } catch (error) {
    alert(error.message);
    throw error;
  }
}

function selectSubmission(id) {
  selectedSubmissionId = id;
  adminActiveTab = "reports";
  adminSubTabs.reports = "results";
  renderAdmin();
}

function selectStudent(id) {
  selectedStudentId = id;
  adminActiveTab = "students";
  adminSubTabs.students = "profile";
  renderAdmin();
}

function scrollStudentProfileSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectClass(id) {
  selectedClassId = id;
  adminActiveTab = "classes";
  renderAdmin();
}

function setClassSubmissionExam(examId) {
  selectedClassSubmissionExamId = examId;
  renderAdmin();
}

function filterClassExamLinks() {
  const search = String($("#classExamSearch")?.value || "").trim().toLowerCase();
  const type = String($("#classExamTypeFilter")?.value || "all").toLowerCase();
  let visibleCount = 0;

  document.querySelectorAll(".exam-link-option").forEach((option) => {
    const matchesSearch = !search || String(option.dataset.title || "").includes(search);
    const matchesType = type === "all" || String(option.dataset.type || "") === type;
    const show = matchesSearch && matchesType;
    option.hidden = !show;
    if (show) visibleCount += 1;
  });

  const countLabel = $("#classExamVisibleCount");
  if (countLabel) countLabel.textContent = `Showing ${visibleCount} exam${visibleCount === 1 ? "" : "s"} · linked exams stay selected even when hidden.`;
}

function toggleVisibleClassExams(checked) {
  document.querySelectorAll(".exam-link-option:not([hidden]) .classExamCheckbox").forEach((input) => {
    input.checked = checked;
  });
  refreshClassExamLinkSummary();
}

function refreshClassExamLinkSummary() {
  document.querySelectorAll(".exam-link-option").forEach((option) => {
    const input = option.querySelector(".classExamCheckbox");
    option.classList.toggle("active", !!input?.checked);
  });

  const checked = [...document.querySelectorAll(".classExamCheckbox:checked")];
  const countLabel = $("#classExamLinkedCount");
  if (countLabel) countLabel.textContent = `${checked.length} linked`;

  const summary = $("#classLinkedExamSummary");
  if (!summary) return;
  if (!checked.length) {
    summary.innerHTML = `<span class="empty">No linked exams yet</span>`;
    return;
  }
  const shown = checked.slice(0, 8);
  summary.innerHTML =
    shown
      .map((input) => `<span>${escapeHtml(input.dataset.label || "Untitled Exam")} <small>${escapeHtml(input.dataset.code || "")}</small></span>`)
      .join("") +
    (checked.length > shown.length ? `<span class="empty">+${checked.length - shown.length} more</span>` : "");
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
  const classRecord = state.classes.find((item) => item.id === id) || {};
  const payload = {
    name: $("#editClassName")?.value.trim() || classRecord.name || "",
    term: $("#editClassTerm")?.value.trim() || classRecord.term || "Unassigned",
    schedule: $("#editClassSchedule")?.value.trim() || classRecord.schedule || "",
    teacher: $("#editClassTeacher")?.value.trim() || classRecord.teacher || "",
    room: $("#editClassRoom")?.value.trim() || classRecord.room || "",
    notes: $("#editClassNotes")?.value.trim() || classRecord.notes || "",
    linkedExamIds: document.querySelectorAll(".classExamCheckbox").length
      ? [...document.querySelectorAll(".classExamCheckbox:checked")].map((input) => input.value)
      : getClassLinkedExamIds(classRecord),
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

async function linkStudentToClass(id) {
  const studentId = $("#linkClassStudentId")?.value;
  if (!studentId) return;

  try {
    state = await api(`/api/admin/classes/${id}/link-student`, {
      method: "POST",
      body: JSON.stringify({ studentId }),
    });
    selectedClassId = id;
    adminActiveTab = "classes";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function linkSubmissionToClass(id) {
  const submissionId = $("#linkClassSubmissionId")?.value;
  if (!submissionId) return;

  try {
    state = await api(`/api/admin/classes/${id}/link-submission`, {
      method: "POST",
      body: JSON.stringify({ submissionId }),
    });
    selectedClassId = id;
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
    address: $("#newStudentAddress").value.trim(),
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
    address: $("#editStudentAddress").value.trim(),
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

async function linkSubmissionToStudent(id) {
  const submissionId = $("#linkSubmissionId")?.value;
  if (!submissionId) return;

  try {
    state = await api(`/api/admin/students/${id}/link-submission`, {
      method: "POST",
      body: JSON.stringify({ submissionId }),
    });
    selectedStudentId = id;
    adminActiveTab = "students";
    renderAdmin();
  } catch (error) {
    alert(error.message);
  }
}

async function deleteStudentScore(studentId, scoreId) {
  const student = state.students.find((item) => item.id === studentId);
  const score = (student?.scoreHistory || []).find((item) => item.id === scoreId);
  if (!student || !score) return;
  if (!confirm(`Delete the saved score for "${score.examTitle || "this exam"}"?\n\nThis removes the score from this student profile. The detailed report stays available only if you have not deleted it separately.`)) return;
  try {
    state = await api(`/api/admin/students/${studentId}/score-history/${encodeURIComponent(scoreId)}`, { method: "DELETE" });
    selectedStudentId = studentId;
    adminActiveTab = "students";
    adminSubTabs.students = "profile";
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

function setReportStudentFilter(value) {
  reportStudentFilter = value;
  renderAdmin();
}

async function startStudentExam(event) {
  if (event) event.preventDefault();
  const name = $("#studentName").value.trim();
  const studentId = $("#studentId").value.trim();
  const code = $("#testCode").value.trim().toUpperCase();
  if (!name || !code) {
    alert("Enter student name and test code.");
    return;
  }

  try {
    const examResponse = await api(`/api/student/exam?code=${encodeURIComponent(code)}`);
    if (examResponse.combined) {
      renderSubjectChoice(examResponse, name, studentId);
      return;
    }
    activeCombinedExamChoices = [];
    await beginStudentExam(examResponse, name, studentId, code);
  } catch (error) {
    alert(error.message);
  }
}

function renderSubjectChoice(bundle, studentName, studentId) {
  activeExamBundle = { ...bundle, studentName, studentId };
  const exams = [...(bundle.exams || [])].sort((left, right) => {
    const subjectOrder = (left.examType === "english" ? 0 : 1) - (right.examType === "english" ? 0 : 1);
    return subjectOrder || String(left.title || "").localeCompare(String(right.title || ""));
  });
  activeCombinedExamChoices = exams.map((exam) => ({ ...exam, code: exam.code || bundle.code }));
  $("#app").innerHTML = `
    <div class="shell">
      ${renderTopbar("student")}
      <main class="locked login-stage">
        <section class="panel login-panel combined-choice-panel stack">
          <div class="login-card-head">
            <span class="login-mode">Choose Subject</span>
            <div>
              <h2>${escapeHtml(bundle.code)} Exam</h2>
              <p class="subtle">${escapeHtml(studentName)}, choose which subject you want to start first. English and Math stay separate and randomize only inside that subject.</p>
            </div>
          </div>
          <div class="combined-subject-grid">
            ${exams
              .map(
                (exam) => `
                  <button class="combined-subject-card" onclick="chooseCombinedExam('${exam.id}')" type="button">
                    <span class="subject-icon ${exam.examType === "math" ? "math" : "english"}">${exam.examType === "math" ? "M" : "E"}</span>
                    <span>
                      <strong>${escapeHtml(exam.examType === "math" ? "Math" : "English / Reading")}</strong>
                      <small>${escapeHtml(exam.title)} · ${exam.questionCount} questions · ${exam.minutes} minutes</small>
                    </span>
                  </button>
                `
              )
              .join("")}
          </div>
          <button class="ghost" onclick="studentEntry()">Back to Student Entry</button>
        </section>
      </main>
    </div>
  `;
}

async function chooseCombinedExam(examId) {
  if (!activeExamBundle) {
    studentEntry();
    return;
  }
  try {
    completedCombinedExamIds = new Set();
    if (!activeCombinedExamChoices.length) activeCombinedExamChoices = (activeExamBundle.exams || []).map((exam) => ({ ...exam, code: exam.code || activeExamBundle.code }));
    const exam = await api(`/api/student/exam?code=${encodeURIComponent(activeExamBundle.code)}&examId=${encodeURIComponent(examId)}`);
    await beginStudentExam(exam, activeExamBundle.studentName, activeExamBundle.studentId, activeExamBundle.code);
  } catch (error) {
    alert(error.message);
  }
}

async function beginStudentExam(exam, name, studentId, combinedCode = "", startContext = {}) {
  const attempt = await api("/api/student/start", {
    method: "POST",
    body: JSON.stringify({
      examId: exam.id,
      studentName: name,
      studentId,
      completedExamId: startContext.completedExamId || "",
      completedSubmissionId: startContext.completedSubmissionId || "",
    }),
  });
  activeExam = exam;
  activeExamBundle = null;
  activeCombinedCode = combinedCode || exam.code || "";
  nextCombinedExam = null;
  activeStudent = name;
  activeStudentId = studentId;
  activeAttemptId = attempt.attemptId || "";
  activeAnswers = {};
  activeDragItems = {};
  activeOrder = Array.isArray(attempt.displayOrder) && attempt.displayOrder.length ? attempt.displayOrder : activeExam.displayOrder;
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
}

function renderExam() {
  stopTimer();
  const oneAtATime = activeExam.stepMode !== "all";
  const visibleQuestions =
    oneAtATime
      ? activeSteps[currentQuestionIndex] || []
      : activeOrder.map((id) => activeExam.questions.find((question) => question.id === id)).filter(Boolean);
  const questionContent = oneAtATime ? renderStudentStep(visibleQuestions, currentQuestionIndex + 1) : renderStudentAllQuestions(visibleQuestions);
  const answeredCount = activeOrder
    .map((id) => activeExam.questions.find((question) => question.id === id))
    .filter((question) => question && isQuestionAnswered(question)).length;
  const totalQuestions = activeOrder.length;
  const currentLabel = oneAtATime ? `Page ${currentQuestionIndex + 1} of ${activeSteps.length}` : `${totalQuestions} questions`;
  const footer =
    oneAtATime
      ? `<div><strong>${visibleQuestions.length > 1 ? "Finish this passage set" : "Finish this question"}</strong><span>${answeredCount} of ${totalQuestions} questions answered</span></div><button class="student-next-button" onclick="nextQuestion()">${currentQuestionIndex === activeSteps.length - 1 ? "Review & submit" : "Continue"}<span aria-hidden="true">→</span></button>`
      : `<div><strong>Review your answers before submitting.</strong><span>${answeredCount} of ${totalQuestions} questions answered</span></div><button class="student-submit-button" onclick="submitExam(false)">Review & submit</button>`;

  $("#app").innerHTML = `
    <div class="student-exam-shell">
      <header class="student-exam-topbar">
        <div class="student-exam-brand" aria-label="Topway Prep">
          <img class="student-exam-logo" src="/assets/topway-prep-logo-transparent.png?v=20260806" alt="Topway Prep" onerror="if (!this.dataset.rootFallback) { this.dataset.rootFallback='1'; this.src='/topway-prep-logo-transparent.png?v=20260806'; } else { this.hidden=true; this.nextElementSibling.hidden=false; }" /><span class="student-exam-wordmark-fallback" hidden><span class="student-exam-wordmark-icon" aria-hidden="true"></span><span>Topway Prep</span></span>
        </div>
        <div class="student-exam-title">
          <span class="student-exam-kicker">${escapeHtml(activeExam.subject || "Practice assessment")}</span>
          <strong>${escapeHtml(activeExam.title)}</strong>
        </div>
        <div class="student-exam-timer" aria-label="Time remaining">
          <span>Time remaining</span>
          <strong class="timer" id="timer">${formatTime(remainingSeconds)}</strong>
        </div>
      </header>
      <div class="student-exam-progress" aria-label="Test progress">
        <div class="student-progress-copy"><strong>${escapeHtml(currentLabel)}</strong><span>${answeredCount} answered</span></div>
        <div class="student-progress-track" aria-hidden="true">
          ${activeSteps.map((step, index) => `<span class="${index < currentQuestionIndex ? "complete" : index === currentQuestionIndex ? "current" : ""}">${index + 1}</span>`).join("")}
        </div>
      </div>
      <main class="student-test-stage">
        <section class="student-test-card">
          <div class="student-test-notice" id="lockNotice"><span aria-hidden="true">◉</span> Focus mode is active. Leaving this test is logged for staff review.</div>
          <div class="questions student-questions">
            ${questionContent}
          </div>
          <footer class="student-exam-footer">
            ${footer}
          </footer>
        </section>
      </main>
    </div>
  `;
  attachLockdown();
  startTimer();
}

function getStudentPassageGroupKey(question) {
  const explicitGroup = String(question?.groupId || "").trim();
  if (explicitGroup) return explicitGroup;
  const hasPassage = Boolean(question?.passageTitle || question?.passageText || question?.sharedImageUrl);
  if (!hasPassage) return "";
  return `auto:${String(question?.passageTitle || question?.section || question?.id || "passage").trim().toLowerCase()}`;
}

function buildStudentSteps(exam, order) {
  const questionMap = new Map(exam.questions.map((question) => [question.id, question]));
  const steps = [];
  const seenGroups = new Set();

  order.forEach((id) => {
    const question = questionMap.get(id);
    if (!question) return;
    const groupId = getStudentPassageGroupKey(question);
    if (!groupId) {
      steps.push([question]);
      return;
    }
    if (seenGroups.has(groupId)) return;
    seenGroups.add(groupId);
    const groupQuestions = order
      .map((orderedId) => questionMap.get(orderedId))
      .filter((item) => item && getStudentPassageGroupKey(item) === groupId);
    steps.push(groupQuestions);
  });

  return steps;
}

function renderStudentAllQuestions(questions) {
  let displayIndex = 0;
  const renderedGroups = new Set();
  return questions
    .map((question) => {
      const groupId = getStudentPassageGroupKey(question);
      if (!groupId) {
        displayIndex += 1;
        return renderStudentQuestion(question, displayIndex, false, true);
      }
      if (renderedGroups.has(groupId)) return "";
      renderedGroups.add(groupId);
      const groupQuestions = questions.filter((item) => getStudentPassageGroupKey(item) === groupId);
      const html = renderStudentPassageGroup(groupQuestions, displayIndex + 1);
      displayIndex += groupQuestions.length;
      return html;
    })
    .join("");
}

function getActiveQuestionDisplayNumber(question) {
  const index = activeOrder.indexOf(question?.id);
  return index >= 0 ? index + 1 : Number(question?.number) || 1;
}

function nextQuestion() {
  const currentStep = activeSteps[currentQuestionIndex] || [];
  const unanswered = currentStep.filter((question) => !isQuestionAnswered(question));
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
  if (questions.length <= 1) {
    const question = questions[0];
    if (!question) return "";
    if (getStudentPassageGroupKey(question)) return renderStudentPassageGroup(questions, stepNumber);
    return renderStudentQuestion(question, getActiveQuestionDisplayNumber(question), false, true);
  }
  return renderStudentPassageGroup(questions, stepNumber);
}

function renderStudentPassageGroup(questions, stepNumber) {
  const groupId = questions[0]?.groupId || `Group ${stepNumber}`;
  const sharedMedia = questions.find((question) => question.sharedImageUrl)?.sharedImageUrl || "";
  const passageQuestion = questions.find((question) => question.passageText || question.passageTitle) || {};
  const hasPassageContent = Boolean(passageQuestion.passageText || passageQuestion.passageTitle || sharedMedia);
  return `
    <section class="question-group student-passage-group">
      <div class="student-group-heading">
        <div><span class="student-section-label">Reading set</span><h2>${escapeHtml(passageQuestion.passageTitle || groupId)}</h2></div>
        <span class="student-question-count">${questions.length} questions</span>
      </div>
      <div class="passage-question-layout ${hasPassageContent ? "" : "no-passage"}">
        ${
          hasPassageContent
            ? `<aside class="passage-column student-passage-pane">
                <div class="student-pane-label"><span>Passage</span><span class="student-pane-help">Scroll passage independently</span></div>
                ${renderPassageTextBlock(passageQuestion, `passage-${stepNumber}`)}
                ${sharedMedia ? renderZoomableMedia(sharedMedia, `shared-${stepNumber}`, "Shared passage image") : ""}
              </aside>`
            : ""
        }
        <div class="question-column student-question-pane">
          <div class="student-pane-label">Questions</div>
          ${questions.map((question) => renderStudentQuestion(question, getActiveQuestionDisplayNumber(question), Boolean(sharedMedia))).join("")}
        </div>
      </div>
    </section>
  `;
}

function renderPassageTextBlock(question, passageId = `passage-${question?.id || "single"}`) {
  if (!question?.passageText) return "";
  const zoom = mediaZooms[passageId] || 100;
  return `
    <section class="passage-text-block" data-media-id="${escapeHtml(passageId)}">
      <div class="media-toolbar">
        <button class="mini" type="button" onclick="adjustMediaZoom('${passageId}', -10)">-</button>
        <span class="pill media-zoom-label">${zoom}%</span>
        <button class="mini" type="button" onclick="adjustMediaZoom('${passageId}', 10)">+</button>
        <button class="mini" type="button" onclick="resetMediaZoom('${passageId}')">Reset</button>
      </div>
      ${question.passageTitle ? `<h3>${escapeHtml(question.passageTitle)}</h3>` : ""}
      <div class="passage-rich-text" style="font-size: ${zoom}%">${formatRichText(question.passageText)}</div>
    </section>
  `;
}

function renderStudentQuestion(question, displayNumber, hideSharedMedia = false, showOwnPassage = false) {
  const current = activeAnswers[question.id] || "";
  const type = normalizeQuestionType(question.type);
  const usesInlineBlank = type === "dropdown" && String(question.questionText || "").includes("[[blank]]");
  const usesHotText = type === "hot_text";
  const usesHotspot = type === "hotspot";
  return `
    <article class="question student-question-card" data-section="${escapeHtml(question.section)}" data-original-number="${question.originalNumber || question.number}">
      <div class="question-title student-question-title">
        <span class="student-question-number">${displayNumber}</span>
        <div><span class="student-section-label">${escapeHtml(question.section || "Practice question")}</span><strong>Question ${displayNumber}</strong></div>
        <span class="student-format-label">${escapeHtml(questionTypeLabel(question.type))}</span>
      </div>
      <p class="question-instruction">${escapeHtml(getQuestionInstruction(question.type))}</p>
      ${question.passageText && (!getStudentPassageGroupKey(question) || showOwnPassage) ? renderPassageTextBlock(question, `passage-${question.id}`) : ""}
      ${usesInlineBlank ? renderDropdownPrompt(question, current) : usesHotText ? renderHotTextPrompt(question, current) : renderQuestionTextWithInlineMedia(question, { mediaPrefix: "student-question" })}
      ${usesHotspot ? "" : renderQuestionMedia(question, hideSharedMedia)}
      ${usesInlineBlank || usesHotText ? "" : renderStudentAnswerControl(question, current, { displayNumber })}
    </article>
  `;
}

function renderShortAnswerInput(question, current, equationMode = false, displayNumber = null) {
  const keypadButtons = equationMode ? [
    ...["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((label) => ({ label, insert: label, offset: 1 })),
    { label: "+", insert: "+", offset: 1 }, { label: "−", insert: "-", offset: 1 }, { label: "×", insert: "×", offset: 1 }, { label: "÷", insert: "÷", offset: 1 },
    { label: "=", insert: "=", offset: 1 }, { label: "≠", insert: "≠", offset: 1 }, { label: "<", insert: "<", offset: 1 }, { label: "≤", insert: "≤", offset: 1 }, { label: ">", insert: ">", offset: 1 }, { label: "≥", insert: "≥", offset: 1 },
    { label: "x", insert: "x", offset: 1 }, { label: "y", insert: "y", offset: 1 }, { label: "√", insert: "√()", offset: 2 }, { label: "x²", insert: "²", offset: 1 }, { label: "x³", insert: "³", offset: 1 },
    { label: "a/b", insert: "/", offset: 1 }, { label: "π", insert: "π", offset: 1 }, { label: "∞", insert: "∞", offset: 1 }, { label: "(", insert: "(", offset: 1 }, { label: ")", insert: ")", offset: 1 }, { label: ".", insert: ".", offset: 1 },
  ] : [
    { label: "√", insert: "√()", offset: 2 },
    { label: "x²", insert: "²", offset: 1 },
    { label: "x³", insert: "³", offset: 1 },
    { label: "a/b", insert: "/", offset: 1 },
    { label: "π", insert: "π", offset: 1 },
    { label: "∞", insert: "∞", offset: 1 },
    { label: "±", insert: "±", offset: 1 },
    { label: "≤", insert: "≤", offset: 1 },
    { label: "≥", insert: "≥", offset: 1 },
    { label: "×", insert: "×", offset: 1 },
    { label: "÷", insert: "÷", offset: 1 },
    { label: "(", insert: "(", offset: 1 },
    { label: ")", insert: ")", offset: 1 },
    { label: ".", insert: ".", offset: 1 },
    { label: "-", insert: "-", offset: 1 },
  ];
  return `
    <div class="short-answer-box">
      <label class="sr-only" for="answer-${escapeHtml(question.id)}">Answer for question ${escapeHtml(displayNumber || getActiveQuestionDisplayNumber(question))}</label>
      <input
        id="answer-${escapeHtml(question.id)}"
        class="short-answer-input"
        value="${escapeHtml(current)}"
        placeholder="${equationMode ? "Build an equation: 5² = 25" : "Type answer: 3/4, √5, 2², π, ∞"}"
        inputmode="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        data-original-number="${question.originalNumber || question.number}"
        data-section="${escapeHtml(question.section)}"
        oninput="setTextAnswer('${question.id}', this.value)"
      />
      <div class="math-keypad ${equationMode ? "equation-keypad" : ""}" aria-label="${equationMode ? "Equation editor" : "Math symbols"}">
        ${keypadButtons.map((button) => `<button class="mini" type="button" onclick="insertMathTemplate('${question.id}', '${escapeJs(button.insert)}', ${button.offset})">${escapeHtml(button.label)}</button>`).join("")}
        <button class="mini wide" type="button" onclick="clearShortAnswer('${question.id}')">Clear</button>
      </div>
      <p class="hint">${equationMode ? "Use the keypad or keyboard. Teachers can list accepted equation forms separated by commas." : "Teachers can enter multiple accepted answers separated by commas, such as √5, sqrt(5) or 1/2, 0.5."}</p>
    </div>
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
  const passageText = container.querySelector(".passage-rich-text");
  const label = container.querySelector(".media-zoom-label");
  if (image) image.style.width = `${zoom}%`;
  if (passageText) passageText.style.fontSize = `${zoom}%`;
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
  activeAnswers[questionId] = String(answer).trim();
}

function setHotspotAnswer(questionId, answer) {
  activeAnswers[questionId] = String(answer).trim();
  refreshExamAfterStructuredAnswer();
}

function toggleHotTextAnswer(questionId, item) {
  const selected = new Set(parseHotTextAnswer(activeAnswers[questionId]).map((value) => value.toUpperCase()));
  const normalized = String(item || "").trim().toUpperCase();
  if (selected.has(normalized)) selected.delete(normalized);
  else selected.add(normalized);
  activeAnswers[questionId] = [...selected].sort().join("|");
  refreshExamAfterStructuredAnswer();
}

function isQuestionAnswered(question) {
  const type = normalizeQuestionType(question.type);
  if (type === "drag_drop") {
    const mapping = parseDragAnswer(activeAnswers[question.id]);
    const items = Array.isArray(question.choices) ? question.choices : [];
    return items.length > 0 && items.every((item) => String(mapping[item] || "").trim());
  }
  if (type === "table_grid") {
    const mapping = parseDragAnswer(activeAnswers[question.id]);
    const rows = Array.isArray(question.gridRows) ? question.gridRows : [];
    return rows.length > 0 && rows.every((_, index) => String(mapping[String(index + 1)] || "").trim());
  }
  if (type === "hot_text") return parseHotTextAnswer(activeAnswers[question.id]).length > 0;
  return Boolean(String(activeAnswers[question.id] || "").trim());
}

function refreshExamAfterStructuredAnswer() {
  const scrollTop = $(".questions")?.scrollTop || 0;
  renderExam();
  const questions = $(".questions");
  if (questions) questions.scrollTop = scrollTop;
}

function selectDragItem(questionId, item) {
  activeDragItems[questionId] = item;
  refreshExamAfterStructuredAnswer();
}

function startDragItem(event, questionId, item) {
  activeDragItems[questionId] = item;
  event.dataTransfer?.setData("text/plain", item);
}

function allowDragDrop(event) {
  event.preventDefault();
}

function assignDragItem(questionId, item, target) {
  if (!item || !target) return;
  const mapping = parseDragAnswer(activeAnswers[questionId]);
  mapping[item] = target;
  activeAnswers[questionId] = JSON.stringify(mapping);
  delete activeDragItems[questionId];
  refreshExamAfterStructuredAnswer();
}

function dropDragItem(event, questionId, target) {
  event.preventDefault();
  const item = event.dataTransfer?.getData("text/plain") || activeDragItems[questionId] || "";
  assignDragItem(questionId, item, target);
}

function assignSelectedDragItem(questionId, target) {
  assignDragItem(questionId, activeDragItems[questionId], target);
}

function removeDragItem(questionId, item) {
  const mapping = parseDragAnswer(activeAnswers[questionId]);
  delete mapping[item];
  activeAnswers[questionId] = JSON.stringify(mapping);
  delete activeDragItems[questionId];
  refreshExamAfterStructuredAnswer();
}

function clearDragAssignments(questionId) {
  activeAnswers[questionId] = "";
  delete activeDragItems[questionId];
  refreshExamAfterStructuredAnswer();
}

function setTableGridAnswer(questionId, rowNumber, answer) {
  const mapping = parseDragAnswer(activeAnswers[questionId]);
  mapping[String(rowNumber)] = String(answer).trim();
  activeAnswers[questionId] = JSON.stringify(mapping);
}

function insertMathTemplate(questionId, template, cursorOffset = template.length) {
  const input = document.getElementById(`answer-${questionId}`);
  if (!input) return;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const nextValue = `${input.value.slice(0, start)}${template}${input.value.slice(end)}`;
  input.value = nextValue;
  activeAnswers[questionId] = nextValue.trim();
  input.focus();
  const cursor = start + Number(cursorOffset || template.length);
  input.setSelectionRange(cursor, cursor);
}

function clearShortAnswer(questionId) {
  const input = document.getElementById(`answer-${questionId}`);
  if (!input) return;
  input.value = "";
  activeAnswers[questionId] = "";
  input.focus();
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
    const submittedExam = activeExam;
    const studentName = activeStudent;
    const studentId = activeStudentId;
    const combinedCode = activeCombinedCode || activeExam.code || "";
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
    if (safeSubmission) {
      state.submissions = [safeSubmission, ...(state.submissions || []).filter((submission) => submission.id !== safeSubmission.id)];
    }
    completedCombinedExamIds.add(submittedExam.id);
    const localNextExam = findNextCombinedChoice(combinedCode, submittedExam.id);
    let nextExam = Array.isArray(result.remainingCombinedExams)
      ? result.remainingCombinedExams.find((exam) => !completedCombinedExamIds.has(exam.id)) || null
      : null;
    if (!nextExam) {
      nextExam = localNextExam || (await findNextCombinedExam(combinedCode, submittedExam.id, studentName, studentId));
    }
    activeExam = null;
    activeStudent = null;
    activeStudentId = "";
    activeAttemptId = "";
    activeAnswers = {};
    activeDragItems = {};
    activeOrder = [];
    activeSteps = [];
    activeCombinedCode = combinedCode;
    nextCombinedExam = nextExam
      ? { ...nextExam, studentName, studentId, code: combinedCode, completedExamId: submittedExam.id, completedSubmissionId: safeSubmission?.id || "" }
      : null;
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
            ${
              nextCombinedExam
                ? `
                  <section class="next-subject-callout no-print">
                    <div class="next-subject-copy">
                      <span class="login-mode">Next Required Step</span>
                      <h3>You still have ${nextCombinedExam.examType === "math" ? "Math" : "English / Reading"} remaining</h3>
                      <p>No need to re-enter your name, ID, or test code. Click the button below to continue to ${escapeHtml(nextCombinedExam.title)}.</p>
                    </div>
                    <button class="next-subject-button" onclick="startNextCombinedExam()">Start ${nextCombinedExam.examType === "math" ? "Math" : "English / Reading"} Now</button>
                  </section>
                `
                : ""
            }
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

function sameStudentSubmission(submission, studentId, studentName) {
  const normalizedStudentId = String(studentId || "").trim().toLowerCase();
  const normalizedSubmissionId = String(submission?.studentId || "").trim().toLowerCase();
  if (normalizedStudentId && normalizedSubmissionId) return normalizedStudentId === normalizedSubmissionId;
  return String(submission?.studentName || "").trim().toLowerCase() === String(studentName || "").trim().toLowerCase();
}

function findNextCombinedChoice(code, submittedExamId) {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode || !activeCombinedExamChoices.length) return null;
  const completedIds = new Set([submittedExamId, ...completedCombinedExamIds]);
  return (
    activeCombinedExamChoices.find(
      (exam) =>
        !completedIds.has(exam.id) &&
        (!exam.code || String(exam.code || "").trim().toUpperCase() === normalizedCode)
    ) || null
  );
}

async function findNextCombinedExam(code, submittedExamId, studentName = "", studentId = "") {
  if (!code) return null;
  try {
    const bundle = await api(`/api/student/exam?code=${encodeURIComponent(code)}`);
    if (!bundle.combined || !Array.isArray(bundle.exams)) return null;
    const completedIds = new Set([submittedExamId, ...completedCombinedExamIds]);
    (state.submissions || []).forEach((submission) => {
      if (sameStudentSubmission(submission, studentId, studentName)) completedIds.add(submission.examId);
    });
    return bundle.exams.find((exam) => !completedIds.has(exam.id)) || null;
  } catch {
    return null;
  }
}

async function startNextCombinedExam() {
  if (!nextCombinedExam) {
    studentEntry();
    return;
  }
  try {
    const nextExam = await api(`/api/student/exam?code=${encodeURIComponent(nextCombinedExam.code)}&examId=${encodeURIComponent(nextCombinedExam.id)}`);
    await beginStudentExam(nextExam, nextCombinedExam.studentName, nextCombinedExam.studentId, nextCombinedExam.code, {
      completedExamId: nextCombinedExam.completedExamId || "",
      completedSubmissionId: nextCombinedExam.completedSubmissionId || "",
    });
  } catch (error) {
    alert(error.message);
  }
}

render();
