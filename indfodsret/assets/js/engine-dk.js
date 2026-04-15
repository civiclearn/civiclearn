/* CivicEdge Engine v6 – i18n + config-based, mode-driven */

(function () {
  "use strict";

  const Engine = {};
  window.CivicEdgeEngine = Engine;

let __normalizedBank = null;
let __trickySet = null;

// Load tricky questions list (static JSON, regenerated monthly)
async function loadTrickySet() {
  if (__trickySet) return __trickySet;
  try {
    const res = await fetch("/indfodsret/banks/tricky-dk.json");
    if (!res.ok) { __trickySet = new Set(); return __trickySet; }
    const data = await res.json();
    __trickySet = new Set(data.questions || []);
  } catch (e) {
    console.warn("[Engine] Could not load tricky-dk.json:", e.message);
    __trickySet = new Set();
  }
  return __trickySet;
}

function isTricky(questionText) {
  return __trickySet && __trickySet.has(questionText);
}

// expose bank helpers (required by My List)
Engine.getBank = () => __normalizedBank || [];

Engine.ensureBankLoaded = async function () {
  if (__normalizedBank && __normalizedBank.length) return;

  const fullBank = await loadBankIfNeeded({});
  __normalizedBank = fullBank;
};


  // ------------- Helpers -------------
  
// expose saved-questions helpers
Engine.isQuestionSaved = isQuestionSaved;
Engine.toggleSavedQuestion = toggleSavedQuestion;
Engine.getSavedQuestionIds = getSavedQuestionIds;


const PHASE_EXAM_ONLY = "exam_only";
const PHASE_FULL_PREP = "full_prep";

function getActivePhase() {
  return localStorage.getItem("dk_active_phase") || PHASE_EXAM_ONLY;
}

function setActivePhase(phase) {
  if (phase !== PHASE_EXAM_ONLY && phase !== PHASE_FULL_PREP) return;
  localStorage.setItem("dk_active_phase", phase);
}

function isPhaseUnlocked() {
  return readJsonLS("dk_phase2_unlocked", false) === true;
}

  function getConfig() {
    return window.CIVICEDGE_CONFIG || {};
  }

  function getI18n() {
    return window.CivicLearnI18n || null;
  }

  function t(key, fallback) {
    const i18n = getI18n();
    if (i18n && typeof i18n.t === "function") {
      return i18n.t(key, fallback);
    }
    return fallback || key;
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  // Normalize label to compare topic names across accents and variants
  function normalizeLabel(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/^l['’]\s*/i, "")        // strip "l'" style prefixes
      .replace(/^(le|la|les)\s+/i, "")  // strip French articles
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function getQueue(key, fullList) {
    const stored = readJsonLS(key, null);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    const shuffled = shuffle(fullList.slice());
    writeJsonLS(key, shuffled);
    return shuffled;
  }

  function consumeFromQueue(key, fullList, n) {
    let queue = getQueue(key, fullList);
    const taken = [];

    while (taken.length < n) {
      if (queue.length === 0) {
        queue = shuffle(fullList.slice());
      }
      taken.push(queue.shift());
    }

    writeJsonLS(key, queue);
    return taken;
  }

// ==============================
// DK PHASE BANK FILTER
// ==============================

function filterBankByPhase(fullBank) {
  // Always exclude deep (Advanced/Bonus) from practice modes
  const nonDeep = fullBank.filter(q => {
    const depth = q._raw?.depth || q.depth;
    return depth !== "deep";
  });

  // If Phase 2 is unlocked, auto-switch and serve all non-deep questions
  if (isPhaseUnlocked()) {
    setActivePhase(PHASE_FULL_PREP);
    return nonDeep;
  }

  // Phase 1: Foundation only (exam + values + current events)
  return nonDeep.filter(q => {
    const src = q._raw?.source || q.source;
    return (
      src === "exam" ||
      src === "values" ||
      src === "begivenheder"
    );
  });
}



// ==============================
// DK PHASE 1 — ELIGIBILITY RULES
// ==============================

const DK_CURRENT_LABEL = "Aktuelle begivenheder";

function isPhase1Eligible(question) {
  const src = question._raw?.source || question.source;
  if (src !== "exam") return false;

  const topic = normalizeLabel(question.topicLabel || "");
  if (topic === normalizeLabel(DK_CURRENT_LABEL)) return false;

  return true;
}

// ==============================
// DOM HELPER
// ==============================

function createEl(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Sample N items (without replacement)
  function sample(arr, n) {
    if (n >= arr.length) return arr.slice();
    const copy = arr.slice();
    shuffle(copy);
    return copy.slice(0, n);
  }

  // LocalStorage helpers (safe)
  function readJsonLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("LS read failed for", key, e);
      return fallback;
    }
  }

  function writeJsonLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn("LS write failed for", key, e);
    }
  }

// ===============================
// Saved questions (My List)
// ===============================

const SAVED_KEY = "civicedge_saved";

function getSavedMap() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY)) || {};
  } catch {
    return {};
  }
}

function setSavedMap(map) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(map));
}

function isQuestionSaved(questionId) {
  const map = getSavedMap();
  return !!map[questionId];
}

function toggleSavedQuestion(questionId) {
  const map = getSavedMap();
  if (map[questionId] && map[questionId] !== false) {
    delete map[questionId];  // truly remove so push sends object without this key
  } else {
    map[questionId] = Date.now();  // timestamp when saved
  }
  setSavedMap(map);
  if (window.CivicSync) CivicSync.push("civicedge_saved");
  return !!map[questionId];
}

function getSavedQuestionIds() {
  const map = getSavedMap();
  return Object.keys(map).filter(k => k !== "_ts" && map[k] && map[k] !== false);
}



  // ------------- Bank loading / normalization -------------

  async function loadBankIfNeeded(modeOptions) {
    // If a pre-filtered bank is passed (e.g. traps), use it as-is
    if (modeOptions && Array.isArray(modeOptions.bank)) {
      return normalizeBank(modeOptions.bank);
    }

    const cfg = getConfig();
    const path = cfg.bank && cfg.bank.path;
    if (!path) {
      throw new Error("Missing bank.path in CIVICEDGE_CONFIG");
    }

    const res = await fetch(path);
    const raw = await res.json();
    const questionsArray = Array.isArray(raw) ? raw : (raw.questions || []);
    return normalizeBank(questionsArray);
  }

  function normalizeBank(rawQuestions) {
    const cfg = getConfig();
    const topicsCfg = cfg.topics || {};
    const topicLabels = topicsCfg.topicLabels || {};

    // Map from normalized label -> canonical key
    const labelToKey = {};
    Object.entries(topicLabels).forEach(([key, label]) => {
      labelToKey[normalizeLabel(label)] = key;
    });

    return rawQuestions.map((q, idx) => {
      const originalTopicLabel = q.topic || "";
      const norm = normalizeLabel(originalTopicLabel);
      const topicKey = labelToKey[norm] || null;

      const id =
        q.id ||
        `${topicKey || "topic"}:${(q.q || "").slice(0, 50)}:${idx}`;

      const options = (q.options || []).map((opt, i) => ({
        text: opt.t,
        correct: !!opt.correct,
        idx: i
      }));

return {
  id,
  topicKey,
  topicLabel: originalTopicLabel,
  subtopic: q.subtopic || null,     // ✅ KEEP SUBTOPIC
  text: q.q,
  options,

  // keep raw for filtering if needed later
  _raw: q,

  // ---- DK PHASE SUPPORT ----
  source: q.source || null,
  depth: q.depth || null
};


    });
  }

  // ------------- State -------------

  let state = null;
  window.__CE_STATE__ = () => state;
  let timerHandle = null;
  let initialQuestions = null; // NEW: Holds the full set for Topics history
  let attemptLog = [];        // NEW: Array to record every single answer attempt
  
  function resetState() {
    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
    state = null;
  }

  // ------------- Public API -------------

Engine.start = async function start(mode, options = {}) {
  resetState();
  document.body.classList.remove("review-mode");

  const quizEl = document.getElementById("quiz");
  if (!quizEl) return;
  quizEl.innerHTML = "";

  const cfg = getConfig();

  // ---- LOAD + FILTER BANK ----
  const fullBankRaw = await loadBankIfNeeded(options);
  const fullBank = filterBankByPhase(fullBankRaw);

  Engine._activeBank = fullBank;
__normalizedBank = fullBankRaw;

  // Load tricky questions set (non-blocking, no auth)
  await loadTrickySet();

  // ---- PHASE 1 FREEZE ----
  if (!readJsonLS("dk_exam_index", null)) {
    const examIndex = fullBankRaw.filter(q => isPhase1Eligible(q));
    writeJsonLS("dk_exam_index", examIndex);
  }

  let questions = [];
  let filtered = null;
  let unmastered = null;

// 🔒 SAFE GLOBAL (used only by Topics)
let stateScopeQuestions = null;

  // =====================================================
  // QUICK
  // =====================================================
  if (mode === "quick") {
    const n =
      (cfg.quicktest && cfg.quicktest.questionCount) ||
      options.limit ||
      5;
    questions = sample(fullBank, n);
  }

  // =====================================================
  // SIMULATION
  // =====================================================
  else if (mode === "simulation") {
    const VALUES_LABEL = "Danske værdier";
    const CURRENT_LABEL = "Aktuelle begivenheder";

    const valuesPool = fullBank.filter(q =>
      normalizeLabel(q.topicLabel) === normalizeLabel(VALUES_LABEL)
    );

    const currentPool = fullBankRaw.filter(q =>
      normalizeLabel(q.topicLabel) === normalizeLabel(CURRENT_LABEL)
    );

    const manualPool = fullBank.filter(q => {
      const t = normalizeLabel(q.topicLabel);
      return (
        t !== normalizeLabel(VALUES_LABEL) &&
        t !== normalizeLabel(CURRENT_LABEL)
      );
    });

    const valuesIds = valuesPool.map(q => q.id);
    const currentIds = currentPool.map(q => q.id);

    const takenValuesIds = consumeFromQueue("dk_values_queue", valuesIds, 5);
    const takenCurrentIds = consumeFromQueue("dk_current_queue", currentIds, 5);

    const takenValues = valuesPool.filter(q => takenValuesIds.includes(q.id));
    const takenCurrent = currentPool.filter(q => takenCurrentIds.includes(q.id));

    const manualSelected = sample(manualPool, 35);

    questions = [
      ...manualSelected,
      ...takenCurrent,
      ...takenValues
    ];

    if (questions.length < 45) {
      const used = new Set(questions.map(q => q.id));
      const fillers = fullBank.filter(q => !used.has(q.id));
      questions = questions.concat(sample(fillers, 45 - questions.length));
    }
  }

  // =====================================================
  // TOPICS
  // =====================================================
  else if (mode === "topics") {

// ---------- EXPLICIT QUESTIONS (PHASE 2 BUTTONS / SUBTOPIC PILLS) ----------
if (Array.isArray(options.questions) && options.questions.length > 0) {

  const topicsCfg = (cfg.topics || {});
  const limit =
    options.practice === true
      ? 100000
      : (topicsCfg.questionCount || 10);

  const normalizedAll = normalizeBank(
    options.questions
      .map(q => q && (q._raw || q))
      .filter(Boolean)
  );

  // ✅ FILTER OUT MASTERED (THIS IS THE MISSING PIECE)
  const progress = readJsonLS("civicedge_progress", {});
  const pool =
    options.practice === true
      ? normalizedAll.slice()
      : normalizedAll.filter(q => {
          const key = `${q.topicLabel || q.topicKey || "topic"}:${q.text}`;
          const entry = progress[key];
          return !(entry && entry.correct === 1);
        });

  // If fully mastered, show the mastered screen (remaining = 0)
  if (normalizedAll.length > 0 && pool.length === 0) {
    state = {
      mode: "topics",
      cfg,
	  fromTopicsUI: options.fromTopicsUI === true,
      questions: [],
      playedQuestions: [],
      scopeQuestions: normalizedAll.slice(),
      initialQuestions: normalizedAll.slice(),
      allQuestions: normalizedAll.slice(),
      wave: 1,
      currentIndex: 0,
      answered: normalizedAll.length,
      attemptLog: [],
      correct: normalizedAll.length,
      incorrect: 0,
      startedAt: Date.now(),
      finishedAt: Date.now(),
      timed: false,
      selectedTopics: [],
      selectedSubtopic: options.subtopic || (function () {
        const subs = new Set(
          normalizedAll.map(q => q.subtopic).filter(Boolean)
        );
        return subs.size === 1 ? Array.from(subs)[0] : null;
      })()
    };
    finishQuiz(false);
    return;
  }

  const picked = sample(pool, Math.min(limit, pool.length));

  state = {
    mode: "topics",
    cfg,
	fromTopicsUI: options.fromTopicsUI === true,

    // current wave
    questions: picked,

    // FIX: the actual sampled questions the user will play (for history only)
    playedQuestions: picked.slice(),

    // 🔒 FULL SCOPE (for ring + remaining)
    scopeQuestions: normalizedAll.slice(),

    // keep legacy fields (safe)
    initialQuestions: normalizedAll.slice(),
    allQuestions: normalizedAll.slice(),

    wave: 1,
    currentIndex: 0,
    answered: 0,
    attemptLog: [],
    correct: 0,
    incorrect: 0,
    startedAt: Date.now(),
    finishedAt: null,
    timed: false,

    selectedTopics: [],
    selectedSubtopic: options.subtopic || (function () {
      const subs = new Set(
        normalizedAll.map(q => q.subtopic).filter(Boolean)
      );
      return subs.size === 1 ? Array.from(subs)[0] : null;
    })()
  };

  renderQuestion();
  updateProgressBar();
  return;
}



    // ---------- NORMAL TOPIC FLOW ----------
    const selectedKeys =
      options.topics || (options.topic ? [options.topic] : []);

    const topicLabels = (cfg.topics && cfg.topics.topicLabels) || {};
    const topicsCfg = cfg.topics || {};

    const limit =
      options.practice === true
        ? 100000
        : (topicsCfg.questionCount || 10);

    const selectedLabels = selectedKeys
      .map(k => topicLabels[k] || k)
      .map(lbl => normalizeLabel(lbl));

    filtered = fullBank.filter(q =>
      selectedLabels.includes(normalizeLabel(q.topicLabel)) ||
      selectedLabels.includes(normalizeLabel(q.topic))
    );

   // --- PHASE 2 SUBTOPIC FILTER + FREEZE SCOPE ---

if (options.subtopic && options.subtopic !== "Alle spørgsmål") {
  const subNorm = normalizeLabel(options.subtopic);
  filtered = filtered.filter(q =>
    normalizeLabel(q.subtopic) === subNorm
  );

  // 🔒 FREEZE FULL SUBTOPIC SCOPE (CRITICAL)
  stateScopeQuestions = filtered.slice();
}




    const progress = readJsonLS("civicedge_progress", {});

    unmastered =
      options.practice === true
        ? filtered.slice()
        : filtered.filter(q => {
            const key = `${q.topicLabel || q.topicKey || "topic"}:${q.text}`;
            const entry = progress[key];
            return !(entry && entry.correct === 1);
          });

    if (!filtered.length) {
      quizEl.innerHTML = `
        <div class="ce-card">
          <h2>Ingen spørgsmål i denne fase</h2>
          <button class="btn secondary" onclick="location.href='topics.html'">
            Tilbage til emner
          </button>
        </div>`;
      return;
    }

    questions = sample(unmastered, Math.min(limit, unmastered.length));
  }

  // =====================================================
  // TRAPS
  // =====================================================
  else if (mode === "traps") {
    if (!options.bank || !Array.isArray(options.bank)) return;
    const normalized = normalizeBank(options.bank);
    questions = sample(normalized, options.limit || 20);
  }

  else {
    return;
  }

  // =====================================================
  // FINAL STATE (NORMAL PATH ONLY)
  // =====================================================
state = {
  mode,
  cfg,
  fromTopicsUI: options.fromTopicsUI === true,
  questions,

  // SAFE FOR ALL MODES
  initialQuestions:
    mode === "topics" && Array.isArray(unmastered)
      ? unmastered.slice()
      : questions.slice(),

  allQuestions:
    mode === "topics" && Array.isArray(unmastered)
      ? unmastered.slice()
      : questions.slice(),

  // FIX: the actual sampled questions the user will play (for history only)
  playedQuestions: questions.slice(),

  scopeQuestions:
    mode === "topics" ? stateScopeQuestions || null : null,

  wave: 1,
  currentIndex: 0,
  answered: 0,
  attemptLog: [],
  correct: 0,
  incorrect: 0,
  startedAt: Date.now(),
  finishedAt: null,
  timed:
    mode === "simulation" &&
    !!(cfg.simulation && cfg.simulation.timeLimitMin),
  timeLimitSec:
    mode === "simulation" &&
    cfg.simulation &&
    cfg.simulation.timeLimitMin
      ? cfg.simulation.timeLimitMin * 60
      : null,
  remainingSec:
    mode === "simulation" &&
    cfg.simulation &&
    cfg.simulation.timeLimitMin
      ? cfg.simulation.timeLimitMin * 60
      : null
};



  if (mode === "topics") {
    state.selectedTopics = Array.isArray(options.topics)
      ? options.topics.slice()
      : [];
    state.selectedSubtopic = options.subtopic || null;
  }

  renderQuestion();
  updateProgressBar();
  if (state.timed) startTimer();
};

/* ============================================================
   CLEAN CIVICEDGE TIMER MODULE — LABEL-FREE, ROBUST, SIMPLE
   ============================================================ */

/**
 * Injects and updates the circular SVG timer ring.
 * Always safe — never depends on other DOM elements.
 */
function renderTimerRing(secRemaining, secTotal) {
  const ring = document.getElementById("ce-timer-ring");
  if (!ring) return; // DOM not ready

  // Critical flash (≤ 30s)
  if (secRemaining <= 30) {
    ring.classList.add("ce-timer-critical");
  } else {
    ring.classList.remove("ce-timer-critical");
  }

  // Color transitions
  let color = "var(--brand)";
  if (secRemaining <= 5 * 60) color = "#ef4444";      // red
  else if (secRemaining <= 10 * 60) color = "#f59e0b"; // orange

  const pct = secRemaining / secTotal;
  const dash = Math.round(100 * pct);

  // SVG injection with smaller timer text
  ring.innerHTML = `
    <svg viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet">

      <path class="track"
        fill="none"
        stroke="#e5e7eb"
        stroke-width="3"
        d="
          M18 2
          a 16 16 0 0 1 0 32
          a 16 16 0 0 1 0 -32
        "/>

      <path class="fill"
        fill="none"
        stroke="${color}"
        stroke-width="3"
        stroke-dasharray="${dash}, 100"
        d="
          M18 2
          a 16 16 0 0 1 0 32
          a 16 16 0 0 1 0 -32
        "/>

      <!-- SMALLER TIME INSIDE RING -->
      <text x="18" y="19.5" 
        text-anchor="middle" 
        fill="${color}" 
        font-size="7.5px" 
        font-weight="600">
        ${Math.floor(secRemaining/60)}:${("0"+secRemaining%60).slice(-2)}
      </text>
    </svg>
  `;
}

/**
 * Decreases remaining time once per second and updates the ring.
 */
function startTimer() {

  // First draw immediately
  renderTimerRing(state.remainingSec, state.timeLimitSec);

  timerHandle = setInterval(() => {

    if (!state) {
      clearInterval(timerHandle);
      timerHandle = null;
      return;
    }

    state.remainingSec -= 1;

    if (state.remainingSec <= 0) {
      state.remainingSec = 0;
      renderTimerRing(0, state.timeLimitSec);

      clearInterval(timerHandle);
      timerHandle = null;

      finishQuiz(true); // time up
      return;
    }

    renderTimerRing(state.remainingSec, state.timeLimitSec);

  }, 1000);
}



// ------------- Rendering -------------
function renderQuestion() {
  if (!state) return;
  const quizEl = document.getElementById("quiz");
  if (!quizEl) return;

  const q = state.questions[state.currentIndex];
  const card = createEl("div", "ce-card");
  
// ===== QUESTION HEADER (v2 style) =====
const header = createEl("div", "ce-q-header");

// LEFT: topic label
let topicLabel = "";
const cfg = getConfig();
const topicsCfg = cfg.topics || {};
const topicLabels = topicsCfg.topicLabels || {};

if (q.topicKey && topicLabels[q.topicKey]) {
  topicLabel = topicLabels[q.topicKey];
} else if (q.topicLabel) {
  topicLabel = q.topicLabel;
}

if (topicLabel) {
  const main = createEl("div", "ce-q-main", topicLabel);
  header.appendChild(main);
}

// MIDDLE: question counter
const idxText = t("question_x_of_y", "Spørgsmål {x} af {y}")
  .replace("{x}", String(state.currentIndex + 1))
  .replace("{y}", String(state.questions.length));

const meta = createEl("div", "ce-q-meta", idxText);
header.appendChild(meta);

// RIGHT: subtopic + save star
const subtopicText = q.subtopic || "";
if (subtopicText || q.id) {
  const wrap = createEl("div", "ce-q-subtopic-wrap");

  if (subtopicText) {
    wrap.appendChild(createEl("div", "ce-q-subtopic", subtopicText));
  }

  const saveBtn = createEl("button", "ce-save-btn", "");
  const qid = q.id;
  if (Engine.isQuestionSaved(qid)) {
    saveBtn.classList.add("active");
  }
  saveBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const saved = Engine.toggleSavedQuestion(qid);
    saveBtn.classList.toggle("active", saved);
  });
  wrap.appendChild(saveBtn);
  header.appendChild(wrap);
}

// Official exam question badge
if (q.source === "exam") {
  header.appendChild(createEl("div", "ce-q-official", "Officiel"));
}

// Tricky badge
if (isTricky(q.text)) {
  header.appendChild(createEl("div", "ce-q-official ce-q-tricky", "Hyppigt forkert"));
  card.classList.add("ce-card-tricky");
}

card.appendChild(header);

  // ---- Question text ----

// ---- Question text + speaker ----
const questionWrap = createEl("div", "ce-question-wrap");

const questionEl = createEl("div", "ce-question");
questionEl.textContent = q.text;
questionWrap.appendChild(questionEl);

// Speaker icon (only if Reading Assist is enabled)
if (
  window.CivicReading &&
  typeof window.CivicReading.speak === "function" &&
  window.CivicReading.isEnabled()
) {

  const qSpeakBtn = createEl("button", "ce-speak-btn", "🔊");
  qSpeakBtn.type = "button";
  qSpeakBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    window.CivicReading.speak(q.text);
  });
  questionWrap.appendChild(qSpeakBtn);
}

card.appendChild(questionWrap);


  // ---- Options ----
  const optionsWrap = createEl("div", "ce-options");

  // Shuffle a copy so question.options stays stable for review/stats
  const shuffledOptions = shuffle(q.options.slice());

  // Official format: reduce to 3 options by removing one random wrong answer
  if (readJsonLS("dk_official_format", false) && shuffledOptions.length > 3) {
    const wrongIndexes = [];
    shuffledOptions.forEach((o, i) => { if (!o.correct) wrongIndexes.push(i); });
    if (wrongIndexes.length > 1) shuffledOptions.splice(wrongIndexes[Math.floor(Math.random() * wrongIndexes.length)], 1);
  }

shuffledOptions.forEach((opt) => {

  const btn = createEl("button", "ce-option");
  btn.dataset.index = String(opt.idx);

  // Label text
  const labelSpan = createEl("span", "ce-option-label", opt.text);
  btn.appendChild(labelSpan);

 // Speaker icon (only if Reading Assist is enabled)
if (
  window.CivicReading &&
  typeof window.CivicReading.speak === "function" &&
  window.CivicReading.isEnabled()
) {
    const speakBtn = createEl("button", "ce-speak-btn ce-speak-small", "🔊");
    speakBtn.type = "button";
    speakBtn.addEventListener("click", (ev) => {
      ev.stopPropagation(); // don’t trigger answer click
      window.CivicReading.speak(opt.text);
    });
    btn.appendChild(speakBtn);
  }

  if (!document.body.classList.contains("review-mode")) {
    btn.addEventListener("click", () => handleAnswerClick(btn, q, opt));
  }

  optionsWrap.appendChild(btn);
});



  // ---- Review mode styling ----
  if (document.body.classList.contains("review-mode")) {
    const allButtons = optionsWrap.querySelectorAll("button.ce-option");

    allButtons.forEach((b, idx) => {
      const o = q.options[idx];

      if (o.correct) b.classList.add("correct");

      if (!o.correct && q.userAnswer === o.idx) {
        b.classList.add("wrong");
      }

      b.disabled = true;
    });
  }

  card.appendChild(optionsWrap);

  // ---- Footer with Next button ----
  const footer = createEl("div", "ce-q-footer");

  const nextBtn = createEl(
    "button",
    "btn ce-next-btn",
    t("test_next", "Næste")
  );
  nextBtn.disabled = true;
  nextBtn.addEventListener("click", () => goNext());

  footer.appendChild(nextBtn);
  card.appendChild(footer);

  // ---- Final assembly ----
  quizEl.innerHTML = "";
  quizEl.appendChild(card);

  // Re-apply i18n
  const i18n = getI18n();
  if (i18n && typeof i18n.apply === "function") {
    i18n.apply();
  }
}

function handleAnswerClick(btn, question, opt) {
  if (!state) return;

  const optionsWrap = btn.parentElement;
  if (!optionsWrap) return;
	  
  question.userAnswer = opt.idx;
  // Save correct answer index (required for dashboard)
question.correctAnswer = question.options.findIndex(o => o.correct === true);


  // Prevent answering twice
  if (optionsWrap.classList.contains("answered")) return;
  optionsWrap.classList.add("answered");

  const allButtons = optionsWrap.querySelectorAll("button.ce-option");

  allButtons.forEach(b => {
    const idx = Number(b.dataset.index || 0);
    const o = question.options[idx];

    if (o.correct) {
      b.classList.add("correct");
    }
    if (b === btn && !o.correct) {
      b.classList.add("wrong");
    }
    b.disabled = true;
  });

if (typeof question.firstAttemptCorrect === "undefined") {
  const trueCorrect = question.options[opt.idx].correct ? 1 : 0;
  question.firstAttemptCorrect = trueCorrect;
}



// --- FIX: Log this attempt for detailed history review ---
  if (state.mode === "topics") {
    attemptLog.push({
      qId: question.id,
      correct: !!opt.correct,
      wave: state.wave
    });
  }
  // ---------------------------------------------------------
  
  // Update session counters
  state.answered += 1;
  if (opt.correct) {
    state.correct += 1;
  } else {
    state.incorrect += 1;
  }

  // Update tricky-questions / progress store
  updateProgress(question, opt.correct);
  question._userCorrect = !!opt.correct;

// Enable Next button (scoped, reliable)
const card = btn.closest(".ce-card");
if (card) {
  const nextBtn = card.querySelector(".ce-next-btn");
  if (nextBtn) nextBtn.disabled = false;
}


  // Update progress bar
  updateProgressBar();
}



    function goNext() {
  if (!state) return;

  const isLastQuestion =
    state.currentIndex >= state.questions.length - 1;

  // ---- NORMAL ADVANCE ----
  if (!isLastQuestion) {
    state.currentIndex += 1;
    renderQuestion();
    updateProgressBar();
    return;
  }

  // ---- TOPICS AUTOPILOT (only applies in topics mode) ----
  if (state.mode === "topics" && state.questions.length > 0) {
    const source = state.allQuestions || [];
    const wrong = source.filter(q => q._userCorrect === false);

    if (wrong.length > 0) {
      // Reset for next wave
      state.questions = wrong;
      state.allQuestions = wrong.slice();
      state.wave = (state.wave || 1) + 1;

      state.currentIndex = 0;
      state.answered = 0;
      state.correct = 0;
      state.incorrect = 0;

      renderQuestion();
      updateProgressBar();
      return;
    }
  }

  // ---- HARD STOP: FINISH QUIZ EXACTLY ONCE ----
  state.currentIndex = state.questions.length;
  state.finishedAt = Date.now();

  finishQuiz(false);
}



function updateProgressBar() {
  if (!state) return;

  const total = state.questions.length || 1;
  const pct = Math.round((state.answered / total) * 100);

  let barId = null;
  if (state.mode === "simulation") {
    barId = "simProgress";

  } else if (state.mode === "quick") {
    barId = "quickProgress";

  } else if (state.mode === "traps") {
    barId = "trapsProgress";

  } else if (state.mode === "topics") {
    barId = "topicsProgress";      // ← ADD THIS

  } else {
    return; // unknown mode, avoid crash
  }

  const bar = document.getElementById(barId);
  if (!bar) return;

  bar.style.width = pct + "%";
  bar.setAttribute("data-value", String(pct));   // ← KEEP THIS
}

  // ----------------------------------------------------------
  // Helpers for Topics Mode: compute remaining & restart
  // ----------------------------------------------------------

async function computeTopicsRemaining() {
  if (!state || state.mode !== "topics") {
    return { total: 0, remaining: 0 };
  }

  const progress = readJsonLS("civicedge_progress", {});

  // =====================================================
  // PHASE 2 — SUBTOPIC (STRICT: FROZEN SCOPE ONLY)
  // =====================================================
  if (Array.isArray(state.scopeQuestions) && state.scopeQuestions.length > 0) {
    const total = state.scopeQuestions.length;
    let remaining = 0;

    state.scopeQuestions.forEach(q => {
      const key = `${q.topicLabel || q.topicKey || "topic"}:${q.text}`;
      const entry = progress[key];
      if (!(entry && entry.correct === 1)) remaining += 1;
    });

    return { total, remaining };
  }

  // =====================================================
  // PHASE 1 — TOPIC (STRICT: INITIAL QUESTIONS ONLY)
  // =====================================================
  if (Array.isArray(state.initialQuestions) && state.initialQuestions.length > 0) {
    const total = state.initialQuestions.length;
    let remaining = 0;

    state.initialQuestions.forEach(q => {
      const key = `${q.topicLabel || q.topicKey || "topic"}:${q.text}`;
      const entry = progress[key];
      if (!(entry && entry.correct === 1)) remaining += 1;
    });

    return { total, remaining };
  }

  return { total: 0, remaining: 0 };
}


  function restartTopicsWithSameSelection() {
    if (!state || state.mode !== "topics") return;

    const cfg = getConfig();
    const topicsCfg = cfg.topics || {};

    const limit =
      (topicsCfg && topicsCfg.questionCount)
        ? topicsCfg.questionCount
        : 10;

    const selected = Array.isArray(state.selectedTopics)
      ? state.selectedTopics.slice()
      : [];

    CivicEdgeEngine.start("topics", {
  topics: selected,
  subtopic: state.selectedSubtopic || null
});


    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderTopicsRing(container, total, remaining) {
    if (!container) return;
    container.innerHTML = "";

    if (!total || total <= 0) return;

    const safeRemaining = Math.max(0, remaining || 0);
    const done = Math.max(0, total - safeRemaining);
    const pctDone = Math.max(0, Math.min(1, total ? done / total : 0));
    const dash = Math.round(pctDone * 100);

    const wrapper = createEl("div", "ce-topics-ring");

    // SVG donut
    wrapper.innerHTML = `
      <svg viewBox="0 0 36 36" class="ce-topics-ring-svg" aria-hidden="true">
        <path
          class="track"
          fill="none"
          stroke="#e5e7eb"
          stroke-width="3.2"
          d="
            M18 2
            a 16 16 0 0 1 0 32
            a 16 16 0 0 1 0 -32
          "
        />
        <path
          class="fill"
          fill="none"
          stroke="var(--accent)"
          stroke-width="3.2"
          stroke-linecap="round"
          stroke-dasharray="${dash}, 100"
          d="
            M18 2
            a 16 16 0 0 1 0 32
            a 16 16 0 0 1 0 -32
          "
        />
        <text
          x="18"
          y="20"
          text-anchor="middle"
          fill="#111827"
          font-size="9"
          font-weight="600">
          ${safeRemaining}
        </text>
      </svg>
    `;

    // Caption: "{n} questions left in selected topics"
    const caption = createEl(
      "div",
      "ce-topics-ring-caption",
      t(
        "topics_ring_caption",
        "{n} spørgsmål tilbage i de valgte emner"
      ).replace("{n}", String(safeRemaining))
    );

    wrapper.appendChild(caption);
    container.appendChild(wrapper);
  }

function evaluateDanishSimulation(state, cfg) {
  const simCfg = cfg.simulation || {};
  const rules = simCfg.rules || {};

  const totalCorrect = state.correct;

  // --- Rule A: total score ---
  const minTotal = rules.totalCorrectRequired || 36;
  if (totalCorrect < minTotal) {
    return {
      passed: false,
      reason: "total"
    };
  }

  // --- Rule B: Danish values hard veto ---
  const valuesCfg = rules.values || {};
  const minValues = valuesCfg.minCorrect || 4;

  const valuesQuestions = state.questions.filter(q =>
    normalizeLabel(q.topicLabel) === normalizeLabel("Danske værdier")
  );

  const valuesCorrect = valuesQuestions.filter(q =>
    q._userCorrect === true
  ).length;

  // Safety check: simulation must contain 5 values questions
  if (valuesQuestions.length !== 5) {
    console.warn(
      "[DK SIM] Expected 5 values questions, found",
      valuesQuestions.length
    );
  }

  if (valuesCorrect < minValues) {
    return {
      passed: false,
      reason: "values",
      valuesCorrect
    };
  }

  // --- PASS ---
  return {
    passed: true
  };
}


  // ------------- Finish & Results -------------

function finishQuiz(timeUp) {
  if (!state) return;

  const cfg = state.cfg;

  state.finishedAt = Date.now();

  if (timerHandle) {
    clearInterval(timerHandle);
    timerHandle = null;
  }

  saveStats(timeUp);

  const quizEl = document.getElementById("quiz");
  if (!quizEl) return;

  const totalBase =
    state.mode === "topics" && Array.isArray(state.playedQuestions)
      ? state.playedQuestions.length
      : state.mode === "topics" && Array.isArray(state.allQuestions)
        ? state.allQuestions.length
        : state.questions.length;

  const total = totalBase || 0;
  const correct = state.correct;
  const incorrect = state.incorrect;
  const percent = total ? Math.round((correct / total) * 100) : 0;

  let passed = true;
  let failReason = null;
  let valuesCorrect = null;

  // ===================================================
  // DANISH CITIZENSHIP TEST — OFFICIAL RULES
  // ===================================================
  if (state.mode === "simulation") {
    const result = evaluateDanishSimulation(state, cfg);
    passed = result.passed;
    failReason = result.reason || null;
    valuesCorrect =
      result.reason === "values" && typeof result.valuesCorrect === "number"
        ? result.valuesCorrect
        : null;
  }

  const durationSec = Math.round((state.finishedAt - state.startedAt) / 1000);
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  const durationLabel = `${minutes}m ${seconds}s`;

  // ===================================================
  // TOPICS ENDING (Continue vs Redo, Phase 1 + Phase 2)
  // ===================================================
  if (state.mode === "topics") {
    const card = createEl("div", "ce-card ce-result");

    const layout = createEl("div", "ce-result-layout");
    const mainCol = createEl("div", "ce-result-main");
    const ringCol = createEl("div", "ce-result-ring");

    const h2 = createEl("h2");
    h2.setAttribute("data-i18n", "topics_mastered_title");
    h2.textContent = t("topics_mastered_title", "Sæt mestret 🎉");

    const sub = createEl("p", "muted");
    sub.setAttribute("data-i18n", "topics_mastered_sub");
    sub.textContent = t(
      "topics_mastered_sub",
      "Du har besvaret alle spørgsmål korrekt."
    );

    const list = createEl("ul", "ce-result-list");
    const liTime = createEl("li");
    liTime.innerHTML = `<strong>${t("result_time", "Tid brugt")}:</strong> ${durationLabel}`;
    list.appendChild(liTime);

    const btnBar = createEl("div", "ce-result-actions");

    // Redo (shown only when remaining === 0)
    const practiceBtn = createEl(
      "button",
      "btn",
      t("topics_practice_again", "Øv dette emne igen")
    );
    practiceBtn.style.display = "none";
    practiceBtn.addEventListener("click", () => {
      // Phase 2: redo exact subtopic scope as one batch
      if (Array.isArray(state.scopeQuestions) && state.scopeQuestions.length) {
        CivicEdgeEngine.start("topics", {
          questions: state.scopeQuestions,
          subtopic: state.selectedSubtopic || null,
          practice: true
        });
        return;
      }

      // Phase 1: redo selected topic(s) as one batch
      CivicEdgeEngine.start("topics", {
        topics: Array.isArray(state.selectedTopics) ? state.selectedTopics.slice() : [],
        practice: true
      });
    });
    btnBar.appendChild(practiceBtn);

    // Continue (shown only when remaining > 0)
    const continueBtn = createEl(
      "button",
      "btn",
      t("topics_continue", "Fortsæt")
    );
    continueBtn.id = "topicsContinueBtn";
    continueBtn.style.display = "none";
    continueBtn.addEventListener("click", () => {
      // Phase 2: continue within the same frozen scope
      if (Array.isArray(state.scopeQuestions) && state.scopeQuestions.length) {
        CivicEdgeEngine.start("topics", {
          questions: state.scopeQuestions,
          subtopic: state.selectedSubtopic || null,
          practice: false
        });
        return;
      }

      // Phase 1: next batch in same topic selection
      restartTopicsWithSameSelection();
    });
    btnBar.appendChild(continueBtn);

    // Show "Back to topics" ONLY when the run originated from topics.html
if (state.fromTopicsUI === true) {
  const backBtn = createEl(
    "button",
    "btn secondary",
    t("topics_back_to_select", "Tilbage til emner")
  );

  backBtn.addEventListener("click", () => {
    window.location.href = "topics.html";
  });

  btnBar.appendChild(backBtn);
}


    mainCol.appendChild(h2);
    mainCol.appendChild(sub);
    mainCol.appendChild(list);
    mainCol.appendChild(btnBar);

    layout.appendChild(mainCol);
    layout.appendChild(ringCol);
    card.appendChild(layout);

    quizEl.innerHTML = "";
    quizEl.appendChild(card);

    computeTopicsRemaining()
      .then(({ total, remaining }) => {
        continueBtn.style.display = remaining > 0 ? "inline-block" : "none";
        practiceBtn.style.display = remaining === 0 ? "inline-block" : "none";

        if (total > 0) renderTopicsRing(ringCol, total, remaining);

        // Confetti only when FULL set is mastered
        if (remaining === 0) launchConfetti();

        const i18n = getI18n();
        if (i18n && typeof i18n.apply === "function") i18n.apply();
      })
      .catch(() => {
        continueBtn.style.display = "none";
        const i18n = getI18n();
        if (i18n && typeof i18n.apply === "function") i18n.apply();
      });

    return;
  }

  // ===================================================
  // DEFAULT ENDING (SIMULATION / QUICK / TRAPS)
  // ===================================================
  const card = createEl("div", "ce-card ce-result");

  const h2 = createEl("h2");
  h2.setAttribute("data-i18n", "result_title");
  h2.textContent = t("result_title", "Resultater");

  const sub = createEl("p", "muted");
  sub.setAttribute("data-i18n", "result_subtitle");
  sub.textContent = t("result_subtitle", "Résumé de vos performances");

  const scoreBlock = createEl("div", "ce-result-score");
  scoreBlock.textContent = `${correct} / ${total} (${percent}%)`;

  const list = createEl("ul", "ce-result-list");

  const liScore = createEl("li");
  liScore.innerHTML = `<strong>${t("result_score", "Score")}:</strong> ${percent}%`;

  const liCorrect = createEl("li");
  liCorrect.innerHTML = `<strong>${t("result_correct_answers", "Bonnes réponses")}:</strong> ${correct}`;

  const liWrong = createEl("li");
  liWrong.innerHTML = `<strong>${t("result_wrong_answers", "Mauvaises réponses")}:</strong> ${incorrect}`;

  const liTime = createEl("li");
  liTime.innerHTML = `<strong>${t("result_time", "Tid brugt")}:</strong> ${durationLabel}`;

  list.appendChild(liScore);
  list.appendChild(liCorrect);
  list.appendChild(liWrong);
  list.appendChild(liTime);


  if (timeUp) {
    const timeNote = createEl("p", "muted");
    timeNote.setAttribute("data-i18n", "test_time_up");
    timeNote.textContent = t("test_time_up", "Tiden er udløbet!");
    card.appendChild(timeNote);
  }

  const btnBar = createEl("div", "ce-result-actions");

  const reviewBtn = createEl("button", "btn secondary", t("test_review_errors", "Revoir les erreurs"));
  reviewBtn.id = "reviewErrorsBtn";

  const restartBtn = createEl("button", "btn", t("test_restart", "Start forfra"));
  restartBtn.id = "restartBtn";

  btnBar.appendChild(reviewBtn);
  btnBar.appendChild(restartBtn);

  card.appendChild(h2);
  card.appendChild(sub);

  // PASS/FAIL only for simulation
  if (state.mode === "simulation") {
    const gradeEl = createEl("p", "ce-result-grade");
    gradeEl.innerHTML = passed
      ? `<span class="ce-result-status pass">${t("result_passed", "Passed")}</span>`
      : `<span class="ce-result-status fail">${t("result_failed", "Failed")}</span>`;
    card.appendChild(gradeEl);

    if (passed) launchConfetti();
  }

  if (state.mode === "simulation" && !passed && failReason === "values" && typeof valuesCorrect === "number") {
    const explain = createEl("p", "ce-result-explain");
    explain.textContent =
      `Du svarede kun korrekt på ${valuesCorrect} ud af 5 spørgsmål om danske værdier. ` +
      `Der kræves mindst 4 korrekte svar i denne kategori for at bestå prøven.`;
    card.appendChild(explain);
  }

  card.appendChild(scoreBlock);
  card.appendChild(list);
  card.appendChild(btnBar);

  quizEl.innerHTML = "";
  quizEl.appendChild(card);

  const i18n = getI18n();
  if (i18n && typeof i18n.apply === "function") {
    i18n.apply();
  }
}


// ------------- Progress & Stats -------------

// ==============================
// DK PHASE 1 — COMPLETION CHECK
// ==============================
function evaluatePhase1Completion() {
  const progress = readJsonLS("civicedge_progress", {});
  const bank = readJsonLS("dk_exam_index", []);

  if (!Array.isArray(bank) || bank.length === 0) return;

  let total = 0;
  let mastered = 0;

  bank.forEach(q => {
    if (!isPhase1Eligible(q)) return;

    total += 1;

    const key =
      `${q.topicLabel || q.topicKey || "topic"}:${q.text}`;

    const entry = progress[key];
    if (entry && entry.correct === 1) {
      mastered += 1;
    }
  });

  if (!total) return;

  const percent = Math.round((mastered / total) * 100);

  writeJsonLS("dk_phase1_progress", {
    mastered,
    total,
    percent,
    updatedAt: Date.now()
  });

  // One-way unlock
  if (percent >= 70) {
    writeJsonLS("dk_phase2_unlocked", true);
  }
}

function updateProgress(question, correct) {

  // --- Canonical key: LABEL + FULL TEXT ---
  const key =
    `${question.topicLabel || question.topicKey || "topic"}:${question.text}`;

  const progress = readJsonLS("civicedge_progress", {});

  // Entry structure (compatible with dashboard)
    // Entry structure (compatible with dashboard + phase-aware reporting)
  const entry = progress[key] || {
    attempts: 0,
    rights: 0,
    wrongs: 0,
    correct: 0,     // mastered = 1
    topic: question.topicLabel || question.topicKey || null,

    // Snapshot of the answered question for dashboard classification
    _raw: null
  };

  // Always refresh snapshot (covers old entries that lacked _raw)
  entry._raw = {
    source: question.source || question._raw?.source || null,
    depth: question.depth || question._raw?.depth || null,

    // topic identity
    topicKey: question.topicKey || null,
    topicLabel: question.topicLabel || null,
    topic: question.topicLabel || question.topicKey || null
  };


  // Count attempts
  entry.attempts += 1;

  if (correct) {
    entry.rights += 1;

    // Mastered = 1 correct answer (universal rule)
    entry.correct = 1;
  } else {
    entry.wrongs += 1;
  }

  entry.lastSeen = Date.now();

    progress[key] = entry;
  writeJsonLS("civicedge_progress", progress);

  // ==============================
  // DK PHASE 1 — PROGRESS UPDATE
  // ==============================
  if (correct && isPhase1Eligible(question)) {
    evaluatePhase1Completion();
  }
}



    
  function saveStats(timeUp) {
    const stats = readJsonLS("civicedge_stats", { history: [] });
    stats.history = stats.history || [];

    const totalBase =
      state.mode === "topics" && Array.isArray(state.playedQuestions)
        ? state.playedQuestions.length
        : state.questions.length;

    const total = totalBase || 0;
    const correct =
      state.mode === "topics" && Array.isArray(state.playedQuestions)
        ? state.playedQuestions.length
        : state.correct;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    const durationSec = Math.round(
      (state.finishedAt - state.startedAt) / 1000
    );

    const topicsSet = new Set();
    const sourceQuestions =
      state.mode === "topics" && Array.isArray(state.playedQuestions)
        ? state.playedQuestions                                     
        : state.questions;

    sourceQuestions.forEach(q => {
      if (q.topicLabel) topicsSet.add(q.topicLabel);
    });

// Build per-question history for this session
const answeredQuestions = sourceQuestions.map(q => {
  
  // --- NEW: Retrieve the actual text of the options selected/correct ---
  const userOption = q.options.find(o => o.idx === q.userAnswer);
  const correctOption = q.options.find(o => o.correct === true);

  return {
    id: q.id,
    topic: q.topicLabel || null,

    // Kept for backward compatibility (final correctness after Autopilot)
    correct: !!q._userCorrect,

    // New: first attempt correctness (0/1). Default to NaN if not recorded, 
    firstAttemptCorrect:
      typeof q.firstAttemptCorrect === "number"
        ? q.firstAttemptCorrect
        : NaN,

    // NEWLY SAVED TEXT DATA (makes history self-contained)
    qText: q.text,
    userAnswerText: userOption ? userOption.text : null,
    correctAnswerText: correctOption ? correctOption.text : null,
    
    // Original indexes (for debugging, but not used for display anymore)
    userAnswer: q.userAnswer ?? null,
    correctAnswer: q.correctAnswer ?? null
  };
});


const session = {
  id: `sess-${state.mode}-${state.startedAt}`,
  mode: state.mode,
  correct,
  total,
  percent,
  startedAt: state.startedAt || Date.now(),
  finishedAt: state.finishedAt,
  durationSec,
  topics: Array.from(topicsSet),
  timed: !!state.timed,
  timeUp: !!timeUp,
  
  attemptLog: attemptLog, // FIX: Save the full history of every single attempt

  // NEW: full detailed per-question history

  // NEW: full detailed per-question history
  questions: answeredQuestions
};


    stats.history.push(session);
    writeJsonLS("civicedge_stats", stats);
	
	  // Sync to cloud
    if (window.CivicSync) {
      CivicSync.push(["civicedge_stats", "civicedge_progress"]);
    }
  }

    // === Delegated click handler for Result Screen ===
  document.addEventListener("click", (e) => {
    const target = e.target;

    // --- RESTART BUTTON ---
    if (target && target.id === "restartBtn") {
      window.location.reload();
      return;
    }

    // --- REVIEW ERRORS BUTTON ---
    if (target && target.id === "reviewErrorsBtn") {
      startReviewMode();
      return;
    }
  });
  
function startReviewMode() {
  if (!state) return;

  const quizEl = document.getElementById("quiz");
  if (!quizEl) return;

  // Wrong questions
  const wrong = state.questions.filter(q => q._userCorrect === false);

  if (!wrong.length) {
    quizEl.innerHTML = `
      <div class="ce-card"><p>${t("alert_no_errors", "Aucune erreur")}</p></div>
    `;
    return;
  }

  let html = `
    <div class="ce-card" style="padding:24px;">
      <h2 style="margin-bottom:20px;">${t("review_title", "Revoir les erreurs")}</h2>
  `;

  wrong.forEach((q, i) => {
    html += `
      <div class="ce-review-item" style="margin-bottom:32px;">

        <div class="ce-q-meta">Spørgsmål ${i + 1} af ${wrong.length}</div>
        <div class="ce-q-topic">${q.topicLabel || ""}</div>
        <div class="ce-question">${q.text}</div>

        <div class="ce-options">
    `;

    q.options.forEach((opt) => {
      const isCorrect = opt.correct === true;
      const isWrongChoice = opt.idx === q.userAnswer && !opt.correct;

      html += `
        <div class="ce-option
          ${isCorrect ? "correct" : ""}
          ${isWrongChoice ? "wrong" : ""}
        ">
          ${opt.text}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  html += `
      <div style="text-align:center; margin-top:20px;">
        <button id="reviewRestartBtn" class="btn">
          ${t("test_restart", "Start forfra")}
        </button>
      </div>
    </div>
  `;

  quizEl.innerHTML = html;

  // Restart button
  document.getElementById("reviewRestartBtn").addEventListener("click", () => {
    location.reload();
  });
}
// === CONFETTI EFFECT (final tuned version – fast & realistic) ===
function launchConfetti() {
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 9999,
  });
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth;
  const H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  const colors = ["#22c55e", "#3b82f6", "#fbbf24", "#f87171", "#a78bfa"];

  // 180 pieces = dense & celebratory
  const pieces = Array.from({ length: 180 }, () => ({
    x: Math.random() * W,
    y: -Math.random() * H * 0.5, // start near top
    size: 2 + Math.random() * 3, // small paper squares
    color: colors[Math.floor(Math.random() * colors.length)],
    vy: 3 + Math.random() * 6,   // fast drop
    vx: (Math.random() - 0.5) * 2, // light drift
    rotation: Math.random() * 2 * Math.PI,
    rspeed: (Math.random() - 0.5) * 0.3, // rotation speed
  }));

  let raf;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rspeed;

      // recycle piece when it drops off screen
      if (p.y > H + 10) {
        p.y = -10 - Math.random() * H * 0.2;
        p.x = Math.random() * W;
        p.vy = 3 + Math.random() * 6;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);

  // stop and clean up after 2.5s
  setTimeout(() => {
    cancelAnimationFrame(raf);
    canvas.remove();
  }, 2500);
}

})();
