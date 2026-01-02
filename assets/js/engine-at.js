/* CivicEdge Engine v6 – i18n + config-based, mode-driven */

(function () {
  "use strict";

  const Engine = {};
   window.CivicEdgeEngine = Engine;
   
     // ===============================
  // Saved questions (My List) — COPIED FROM LU
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

    if (map[questionId]) {
      delete map[questionId];
    } else {
      map[questionId] = true;
    }

    setSavedMap(map);
    return !!map[questionId];
  }

  function getSavedQuestionIds() {
    return Object.keys(getSavedMap());
  }

  // Expose to pages (my-list.js expects these exact names)
  Engine.isQuestionSaved = isQuestionSaved;
  Engine.toggleSavedQuestion = toggleSavedQuestion;
  Engine.getSavedQuestionIds = getSavedQuestionIds;

  // My List also needs access to the loaded bank:
  let __normalizedBank = null;
  Engine.getBank = () => __normalizedBank || [];


  // ------------- Helpers -------------

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

  function createEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined && text !== null) el.textContent = text;
    return el;
  }

  function renderResultBar(label, value, min) {
  const pct = Math.min(100, Math.round((value / min) * 100));
  const ok = value >= 3;

  return `
    <div class="ce-result-bar">
      <div class="ce-result-bar-label">
        ${label} — ${value} / ${min}
      </div>
      <div class="ce-result-bar-track">
        <div class="ce-result-bar-fill ${ok ? "ok" : "fail"}" style="width:${pct}%"></div>
      </div>
    </div>
  `;
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

  // Shuffle in-place
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
      let topicKey = null;
let topicLabel = "";

// Austria bank uses canonical keys
if (typeof q.topic === "string" && topicLabels[q.topic]) {
  topicKey = q.topic;
  topicLabel = topicLabels[q.topic];

// Fallback: label-based banks (AU-style)
} else if (typeof q.topic === "string") {
  const norm = normalizeLabel(q.topic);
  topicKey = labelToKey[norm] || null;
  topicLabel = q.topic;
}


      const id =
        q.id ||
        `${topicKey || "topic"}:${(q.q || "").slice(0, 50)}:${idx}`;

      const options = (q.options || []).map((opt, i) => ({
  text: opt,
  correct: i === q.correctIndex,
  idx: i
}));


      return {
  id,
  scope: q.scope,
  bundesland: q.bundesland,
  topicKey,
  topicLabel,
  text: q.q,
  options
};

    });
  }

  // ------------- State -------------

  let state = null;
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

    // >>> FIX: mode MUST be stored BEFORE state is rebuilt <<<
    state = { mode: mode };

    const quizEl = document.getElementById("quiz");

    if (!quizEl) {
      console.error("#quiz not found");
      return;
    }

    quizEl.innerHTML = "";

    const cfg = getConfig();
    const fullBank = await loadBankIfNeeded(options);
	__normalizedBank = fullBank;
	
	const userBundesland = localStorage.getItem("civiclearn_bundesland");
if (!userBundesland) {
  window.location.href = "/austria/dashboard/bundesland.html";
  return;
}



const filteredBank = fullBank.filter(q =>
  q.scope === "federal" ||
  (q.scope === "bundesland" && q.bundesland === userBundesland)
);

    let questions;

    if (mode === "quick") {
      const n =
        (cfg.quicktest && cfg.quicktest.questionCount) ||
        options.limit ||
        5;
      questions = sample(filteredBank, n);
} else if (mode === "simulation") {

  questions = sample(
  filteredBank,
  (cfg.simulation && cfg.simulation.questionCount) || 20
);


} else if (mode === "topics") {
  const selectedKeys = options.topics || [];
  const limit = options.limit || 20;

  const topicsCfg = cfg.topics || {};
  const topicLabels = topicsCfg.topicLabels || {};

  // Canonical selected topic labels (normalized)
  const selectedLabels = selectedKeys
    .map(k => topicLabels[k])
    .filter(Boolean)
    .map(lbl => normalizeLabel(lbl));

  // 1. Filter full bank by selected topics
  const filtered = filteredBank.filter(q =>
  selectedKeys.includes(q.topicKey)
);

  // 2. Load mastery progress
  const progress = readJsonLS("civicedge_progress", {});

  // 3. Remove already mastered questions
  const unmastered = filtered.filter(q => {
    const key = `${q.topicLabel || q.topicKey || "topic"}:${q.text}`;
    const entry = progress[key];
    return !(entry && entry.correct === 1);
  });

  // 4. Pool is ONLY unmastered questions
  const pool = unmastered;

// 5. Initial wave: if nothing left → finish immediately
  questions = sample(pool, Math.min(limit, pool.length));
  
  // --- FIX C: Save the initial, full set of questions for history logging ---
  if (mode === "topics") {
    initialQuestions = questions.slice();
    attemptLog = []; // FIX: Ensure log is clear when a new test starts
  }
  // -----------------------------------------------------------------------


        } else if (mode === "traps") {
      if (!options.bank || !Array.isArray(options.bank)) {
        console.error("Traps mode requires options.bank array");
        return;
      }
      const limit = options.limit || 20;  // default 20 traps per session
      const normalized = normalizeBank(options.bank);
      questions = sample(normalized, Math.min(limit, normalized.length));
    } else {
      console.error("Unknown mode:", mode);
      return;
    }


    if (!questions.length) {
      quizEl.innerHTML =
        `<div class="ce-card"><p>${t("status_no_data", "Aucune donnée disponible.")}</p></div>`;
      return;
    }

    state = {
      mode,
      cfg,
      questions,
      initialQuestions: initialQuestions, // FIX: Reference the full initial set
      // keep a fixed copy of the full set for stats + Autopilot logic
      allQuestions: questions.slice(),
      wave: 1, // NEW: Start wave counter at 1
      currentIndex: 0,
      answered: 0,
	  attemptLog: [], // NEW: Array to record every single answer attempt
      correct: 0,
      incorrect: 0,
      startedAt: Date.now(),
      finishedAt: null,
      timed:
        mode === "simulation" && !!(cfg.simulation && cfg.simulation.timeLimitMin),
      timeLimitSec:
        mode === "simulation" && cfg.simulation && cfg.simulation.timeLimitMin
          ? cfg.simulation.timeLimitMin * 60
          : null,
      remainingSec:
        mode === "simulation" && cfg.simulation && cfg.simulation.timeLimitMin
          ? cfg.simulation.timeLimitMin * 60
          : null
    };
	
	    // Store selected topic keys (for Continue button)
    if (mode === "topics") {
      state.selectedTopics = Array.isArray(options.topics)
        ? options.topics.slice()
        : [];
    }

 window.state = state; // debug visibility only

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

  // Card wrapper
  const card = createEl("div", "ce-card");
  // ===== Question header (LU structure, AT implementation) =====
const header = createEl("div", "ce-q-header");

// Topic pill
const main = createEl(
  "span",
  "ce-q-main",
  q.topicLabel || q.topicKey || ""
);
header.appendChild(main);

// Counter pill
const meta = createEl(
  "span",
  "ce-q-meta",
  `Frage ${state.currentIndex + 1} von ${state.questions.length}`
);
header.appendChild(meta);

// Right side container
const right = createEl("span", "ce-q-subtopic-wrap");

// Star (My List)
const saveBtn = createEl("button", "ce-save-btn");
saveBtn.type = "button";

if (CivicEdgeEngine.isQuestionSaved(q.id)) {
  saveBtn.classList.add("active");
}

saveBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const saved = CivicEdgeEngine.toggleSavedQuestion(q.id);
  saveBtn.classList.toggle("active", saved);
});

right.appendChild(saveBtn);
header.appendChild(right);

card.appendChild(header);




// ---- Subtopic label (for Denmark PR only; safe for Canada) ----
if (q.subtopic) {
  const subEl = createEl("div", "ce-q-subtopic", q.subtopic);
  card.appendChild(subEl);
}

  // ---- Question text ----

// ---- Question text + speaker ----
const questionWrap = createEl("div", "ce-question-wrap");

const questionEl = createEl("div", "ce-question");
questionEl.innerHTML = q.text;

// Austria: questions have NO images → do not render image container
if (q.image || q.img) {
  const img = createEl("img", "ce-question-image");
  img.src = q.image || q.img;
  questionWrap.appendChild(img);
}

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
    t("test_next", "Next")
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

  // Enable Next button
  const nextBtn = document.querySelector(".ce-next-btn");
  if (nextBtn) nextBtn.disabled = false;

  // Update progress bar
  updateProgressBar();
}



    function goNext() {
    if (!state) return;

    // normal advance inside current wave
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      updateProgressBar();
      return;
    }


// end of wave – Topics (PROGRESSIVE, AU COPY)
if (state.mode === "topics") {

  // IMPORTANT: use CURRENT wave, not initial set
  const source = state.questions;

  const wrong = source.filter(q => q._userCorrect === false);

  if (wrong.length === 0) {
    finishQuiz(false);
    return;
  }

  // NEXT WAVE = mistakes only
  state.questions = wrong;
  state.allQuestions = wrong.slice(); // ← THIS LINE WAS MISSING
  state.currentIndex = 0;

  state.answered = 0;
  state.correct = 0;
  state.incorrect = 0;

  state.wave = (state.wave || 1) + 1;

  renderQuestion();
  updateProgressBar();
  return;
}

    // if nothing left to fix → final screen
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
  const selectedTopics = Array.isArray(state.selectedTopics)
    ? state.selectedTopics
    : [];

  if (!selectedTopics.length) {
    return { total: 0, remaining: 0 };
  }

  // Load FULL bank (same country, same scope rules)
  const fullBank = (await loadBankIfNeeded({})).filter(q =>
    q.scope === "federal" ||
    (q.scope === "bundesland" &&
     q.bundesland === localStorage.getItem("civiclearn_bundesland"))
  );

  let total = 0;
  let remaining = 0;

  fullBank.forEach(q => {
    // 🔑 THIS IS THE KEY LINE (topicKey-based, not label-based)
    if (!selectedTopics.includes(q.topicKey)) return;

    total += 1;

    const key = `${q.topicLabel || q.topicKey}:${q.text}`;
    const entry = progress[key];

    if (!(entry && Number(entry.rights || 0) > 0)) {
      remaining += 1;
    }
  });

  return { total, remaining };
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
      limit: limit
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
          stroke="var(--brand)"
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
        "{n} verbleibende Fragen in den ausgewählten Themen"
      ).replace("{n}", String(safeRemaining))
    );

    wrapper.appendChild(caption);
    container.appendChild(wrapper);
  }

  // ------------- Finish & Results -------------

  function finishQuiz(timeUp) {
    if (!state) return;
    state.finishedAt = Date.now();

    if (timerHandle) {
      clearInterval(timerHandle);
      timerHandle = null;
    }

    saveStats(timeUp);

    const quizEl = document.getElementById("quiz");
    if (!quizEl) return;

    const totalBase =
      state.mode === "topics" && Array.isArray(state.allQuestions)
        ? state.allQuestions.length
        : state.questions.length;

    const total = totalBase || 0;
    const correct = state.correct;
    const incorrect = state.incorrect;
    const percent = total ? Math.round((correct / total) * 100) : 0;
    const cfg = state.cfg;
    let passed = true;

if (state.mode === "simulation") {
  const scoring = cfg.simulation && cfg.simulation.scoring;

  if (scoring && scoring.type === "austria") {

    const perSection = {
      history: 0,
      institutions: 0,
      bundesland: 0
    };

    state.allQuestions.forEach(q => {
      if (q._userCorrect && perSection.hasOwnProperty(q.topicKey)) {
        perSection[q.topicKey] += 1;
      }
    });

    const balancedPass =
      perSection.history >= scoring.balanced.minPerSection &&
      perSection.institutions >= scoring.balanced.minPerSection &&
      perSection.bundesland >= scoring.balanced.minPerSection;

    const totalCorrect = state.correct;
    const overallPass = totalCorrect >= scoring.overall.minTotal;

    passed = balancedPass || overallPass;
  }
}


    const durationSec = Math.round(
      (state.finishedAt - state.startedAt) / 1000
    );
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const durationLabel = `${minutes}m ${seconds}s`;

    const card = createEl("div", "ce-card ce-result");

// ===== SPECIAL ENDING FOR TOPICS (AUTOPILOT) =====
if (state.mode === "topics") {
  const card = createEl("div", "ce-card ce-result");

  // layout: left column = text + buttons, right column = ring
  const layout = createEl("div", "ce-result-layout");
  const mainCol = createEl("div", "ce-result-main");
  const ringCol = createEl("div", "ce-result-ring");

  const h2 = createEl("h2");
  h2.setAttribute("data-i18n", "topics_mastered_title");
  h2.textContent = t(
    "topics_mastered_title",
    "Themenblock abgeschlossen"
  );

  launchConfetti();

  const sub = createEl("p", "muted");
  sub.setAttribute("data-i18n", "topics_mastered_sub");
  sub.textContent = t(
    "topics_mastered_sub",
    "Sie haben alle Fragen dieses Sets korrekt beantwortet."
  );

  const list = createEl("ul", "ce-result-list");
  const liTime = createEl("li");
  liTime.innerHTML =
    `<strong>${t("result_time", "Temps passé")}:</strong> ${durationLabel}`;
  list.appendChild(liTime);

  const btnBar = createEl("div", "ce-result-actions");

  // Primary: Continue (hidden by default, shown only if remaining > 0)
  const continueBtn = createEl(
    "button",
    "btn",
    t("topics_continue", "Continuer")
  );
  continueBtn.id = "topicsContinueBtn";
  continueBtn.style.display = "none";
  continueBtn.addEventListener("click", () => {
    restartTopicsWithSameSelection();
  });
  btnBar.appendChild(continueBtn);

  // Secondary: Back to topics
  const backBtn = createEl(
    "button",
    "btn secondary",
    t("topics_back_to_select", "Zurück zu den Themen")
  );
  backBtn.addEventListener("click", () => {
    window.location.href = "topics.html";
  });
  btnBar.appendChild(backBtn);

  // assemble main column
  mainCol.appendChild(h2);
  mainCol.appendChild(sub);
  mainCol.appendChild(list);
  mainCol.appendChild(btnBar);

  layout.appendChild(mainCol);
  layout.appendChild(ringCol);
  card.appendChild(layout);

  const quizEl = document.getElementById("quiz");
  if (!quizEl) return;

  quizEl.innerHTML = "";
  quizEl.appendChild(card);

  // decide: show Continue? draw ring?
  computeTopicsRemaining()
    .then(({ total, remaining }) => {
      if (continueBtn) {
        if (remaining > 0) {
          continueBtn.style.display = "inline-block";
        } else {
          continueBtn.style.display = "none";
        }
      }

      if (total > 0 && ringCol) {
        renderTopicsRing(ringCol, total, remaining);
      }
    })
    .catch(() => {
      if (continueBtn) continueBtn.style.display = "none";
    });

  const i18n = getI18n();
  if (i18n && typeof i18n.apply === "function") {
    i18n.apply();
  }
  return;
}



    // ===== DEFAULT ENDING (SIMULATION / QUICK / TRAPS) =====
    const h2 = createEl("h2");
    h2.setAttribute("data-i18n", "result_title");
    h2.textContent = t("result_title", "Results");

    const sub = createEl("p", "muted");
    sub.setAttribute("data-i18n", "result_subtitle");
    sub.textContent = t("result_subtitle", "Your performance details");

    const scoreBlock = createEl("div", "ce-result-score");
    scoreBlock.textContent = `${correct} / ${total} (${percent}%)`;

    const list = createEl("ul", "ce-result-list");

    const liScore = createEl("li");
    liScore.innerHTML =
      `<strong>${t("result_score", "Score")}:</strong> ${percent}%`;

    const liCorrect = createEl("li");
    liCorrect.innerHTML =
      `<strong>${t("result_correct_answers", "Bonnes réponses")}:</strong> ${correct}`;

    const liWrong = createEl("li");
    liWrong.innerHTML =
      `<strong>${t("result_wrong_answers", "Mauvaises réponses")}:</strong> ${incorrect}`;

    const liTime = createEl("li");
    liTime.innerHTML =
      `<strong>${t("result_time", "Temps passé")}:</strong> ${durationLabel}`;

    list.appendChild(liScore);
    list.appendChild(liCorrect);
    list.appendChild(liWrong);
    list.appendChild(liTime);
	
	  
    if (timeUp) {
      const timeNote = createEl("p", "muted");
      timeNote.setAttribute("data-i18n", "test_time_up");
      timeNote.textContent = t("test_time_up", "Temps écoulé !");
      card.appendChild(timeNote);
    }

    const btnBar = createEl("div", "ce-result-actions");

    const reviewBtn = createEl(
      "button",
      "btn secondary",
      t("test_review_errors", "Review the mistakes")
    );
    reviewBtn.id = "reviewErrorsBtn";

    const restartBtn = createEl(
      "button",
      "btn",
      t("test_restart", "Recommencer")
    );
    restartBtn.id = "restartBtn";

    btnBar.appendChild(reviewBtn);
    btnBar.appendChild(restartBtn);
    card.appendChild(h2);
    card.appendChild(sub);

// PASS/FAIL only for simulation, unchanged
if (state.mode === "simulation") {
  const gradeEl = createEl("p", "ce-result-grade");
  gradeEl.innerHTML = passed
    ? `<span class="ce-result-status pass">${t("result_passed", "Passed")}</span>`
    : `<span class="ce-result-status fail">${t("result_failed", "Failed")}</span>`;
  card.appendChild(gradeEl);

  if (passed) launchConfetti();
}

if (state.mode === "simulation" && cfg.simulation?.scoring?.type === "austria") {

  const scoring = cfg.simulation.scoring;

  const perSection = {
    history: 0,
    institutions: 0,
    bundesland: 0
  };

  state.allQuestions.forEach(q => {
    if (q._userCorrect && perSection.hasOwnProperty(q.topicKey)) {
      perSection[q.topicKey] += 1;
    }
  });

  const breakdown = createEl("div", "ce-result-breakdown");

  breakdown.innerHTML = `
    <h3>${t("result_breakdown_title", "Ergebnis nach Themen")}</h3>

  ${renderResultBar("Geschichte", perSection.history, 6)}
  ${renderResultBar("Institutionen", perSection.institutions, 6)}
  ${renderResultBar("Bundesland", perSection.bundesland, 6)}

    <p class="ce-result-rule">
      ${t(
        "result_rule_at",
        "Bestanden mit mindestens 12 richtigen Antworten ODER mindestens 3 richtigen Antworten in jedem Themenbereich."
      )}
    </p>
  `;

  card.appendChild(breakdown);
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

function updateProgress(question, correct) {
  // --- Canonical key: LABEL + FULL TEXT ---
  const key =
    `${question.topicLabel || question.topicKey || "topic"}:${question.text}`;

  const progress = readJsonLS("civicedge_progress", {});

  // Entry structure (compatible with dashboard)
  const entry = progress[key] || {
	id: question.id, 
    attempts: 0,
    rights: 0,
    wrongs: 0,
    correct: 0,     // mastered = 1
    topic: question.topicLabel || question.topicKey || null,
	topicKey: question.topicKey || null
  };

  // Count attempts
  entry.attempts += 1;

  if (correct) {
  entry.rights += 1;

  // ❌ DO NOT auto-master on first correct in Topics mode
  if (state.mode !== "topics") {
    entry.correct = 1;
  }

} else {
  entry.wrongs += 1;
}


  entry.lastSeen = Date.now();

  progress[key] = entry;
  writeJsonLS("civicedge_progress", progress);
}


    
  function saveStats(timeUp) {
    const stats = readJsonLS("civicedge_stats", { history: [] });
    stats.history = stats.history || [];

    const totalBase =
      state.mode === "topics" && Array.isArray(state.allQuestions)
        ? state.allQuestions.length
        : state.questions.length;

    const total = totalBase || 0;
    const correct = state.correct;
    const percent = total ? Math.round((correct / total) * 100) : 0;

    const durationSec = Math.round(
      (state.finishedAt - state.startedAt) / 1000
    );

    const topicsSet = new Set();
    const sourceQuestions =
      state.mode === "topics" && Array.isArray(state.initialQuestions) // <-- FIX: Check for initialQuestions
        ? state.initialQuestions                                     // <-- FIX: Use initialQuestions
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
  startedAt: state.startedAt,
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
    <div class="ce-card">
      <h2 style="margin-bottom:20px;">${t("review_title", "Revoir les erreurs")}</h2>
  `;

  wrong.forEach((q, i) => {
    html += `
      <div class="ce-review-item" style="margin-bottom:32px;">

        <div class="ce-q-header">
  <span class="ce-q-main">${q.topicLabel || ""}</span>
  <span class="ce-q-meta">Frage ${i + 1} von ${wrong.length}</span>
</div>
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
          ${t("test_restart", "Recommencer")}
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
