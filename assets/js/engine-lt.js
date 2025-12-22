/* CivicEdge Engine v6 – classic behavior preserved, multilingual bank support */

(function () {
  "use strict";

  const Engine = {};
  window.CivicEdgeEngine = Engine;

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

  // ------------- Multilingual helpers (NEW, minimal) -------------

  function getLang() {
    return window.CIVICEDGE_LANG || "en";
  }

  // canonical LT topic key (stable for filtering/progress)
  function getTopicLT(rawQ) {
    if (!rawQ) return "";
    const topic = rawQ.topic;
    if (!topic) return "";
    if (typeof topic === "object") return topic.lt || "";
    return String(topic || "");
  }

  // display topic in current language (for UI)
  function getTopicDisplay(rawQ) {
    if (!rawQ) return "";
    const topic = rawQ.topic;
    if (!topic) return "";
    if (typeof topic === "object") {
      const lang = getLang();
      return topic[lang] || topic.lt || "";
    }
    return String(topic || "");
  }

  function getTextForLang(objOrStr) {
    const lang = getLang();
    if (!objOrStr) return "";
    if (typeof objOrStr === "object") {
      return objOrStr[lang] || objOrStr.en || objOrStr.lt || "";
    }
    return String(objOrStr);
  }

  function getOptionsForLang(rawQ) {
    const lang = getLang();
    const opts = rawQ && rawQ.options;
    if (!opts) return [];

    // New format: options: {lt:[], en:[], ru:[]}
    if (typeof opts === "object" && !Array.isArray(opts)) {
      return opts[lang] || opts.en || opts.lt || [];
    }

    // Legacy fallback: options: [{t, correct}, ...] OR plain strings
    if (Array.isArray(opts)) {
      // if strings, return as-is; if objects, map later in normalizeBank
      return opts;
    }

    return [];
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
    // Classic engine expects:
    // {
    //   id, topicLabel (canonical), topicDisplay (UI),
    //   text, options:[{text,correct,idx}]
    // }
    return rawQuestions.map((rawQ, idx) => {
      const id =
        rawQ.id ||
        `q:${idx}`;

      // Canonical LT label for keys/progress/filtering
      const topicLabel = getTopicLT(rawQ);

      // Display label (RU/EN/LT) for UI
      const topicDisplay = getTopicDisplay(rawQ);

      // Question text (RU/EN/LT)
      const text = getTextForLang(rawQ.q);

      // Options (RU/EN/LT)
      const optList = getOptionsForLang(rawQ);

      let options = [];

      // New schema: optList is array of strings, correctIndex provided
      if (Array.isArray(optList) && (optList.length === 0 || typeof optList[0] === "string")) {
        const correctIndex = Number.isFinite(rawQ.correctIndex) ? rawQ.correctIndex : 0;
        options = optList.map((s, i) => ({
          text: String(s),
          correct: i === correctIndex,
          idx: i
        }));
      } else if (Array.isArray(optList) && typeof optList[0] === "object") {
        // Legacy objects: {t, correct}
        options = optList.map((opt, i) => ({
          text: opt.t != null ? String(opt.t) : String(opt.text || ""),
          correct: !!opt.correct,
          idx: i
        }));
      } else {
        options = [];
      }

      return {
        id,
        topicKey: null,           // kept for compatibility; not used for LT multilingual
        topicLabel,               // canonical LT key
        topicDisplay,             // UI label in current language
        text,
        options,
		_raw: rawQ
      };
    });
  }

  // ------------- State -------------

  let state = null;
  let timerHandle = null;
  let initialQuestions = null; // Holds the full set for Topics history
  let attemptLog = [];         // Records every single answer attempt

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

    // mode MUST be stored BEFORE state is rebuilt
    state = { mode: mode };

    const quizEl = document.getElementById("quiz");
    if (!quizEl) {
      console.error("#quiz not found");
      return;
    }

    quizEl.innerHTML = "";

    const cfg = getConfig();
    const fullBank = await loadBankIfNeeded(options);

    let questions;

    if (mode === "quick") {
      const n =
        (cfg.quicktest && cfg.quicktest.questionCount) ||
        options.limit ||
        5;
      questions = sample(fullBank, n);

    } else if (mode === "simulation") {
      const n =
        (cfg.simulation && cfg.simulation.questionCount) ||
        options.limit ||
        20;
      questions = sample(fullBank, n);

    } else if (mode === "topics") {
      const selectedKeys = options.topics || []; // these are canonical LT strings now
      const limit = options.limit || 20;

      const selectedNorm = selectedKeys.map(k => normalizeLabel(k));

      // 1. Filter full bank by selected topics (CANONICAL LT)
      const filtered = fullBank.filter(q =>
        selectedNorm.includes(normalizeLabel(q.topicLabel))
      );

      // 2. Load mastery progress
      const progress = readJsonLS("civicedge_progress", {});

      // 3. Remove already mastered questions
const unmastered = filtered.filter(q => {
  const qTextLT =
    q._raw &&
    q._raw.q &&
    typeof q._raw.q === "object"
      ? q._raw.q.lt
      : q.text;

  const key = `${q.topicLabel || "topic"}:${qTextLT}`;
  const entry = progress[key];
  return !(entry && entry.correct === 1);
});


      // 4. Pool is ONLY unmastered questions
      const pool = unmastered;

      // 5. Initial wave
      questions = sample(pool, Math.min(limit, pool.length));

      // Save initial set for history logging
      initialQuestions = questions.slice();
      attemptLog = [];
    } else if (mode === "traps") {
      if (!options.bank || !Array.isArray(options.bank)) {
        console.error("Traps mode requires options.bank array");
        return;
      }
      const limit = options.limit || 20;
      const normalized = normalizeBank(options.bank);
      questions = sample(normalized, Math.min(limit, normalized.length));
    } else {
      console.error("Unknown mode:", mode);
      return;
    }

    if (!questions.length) {
      quizEl.innerHTML =
        `<div class="ce-card"><p>${t("status_no_data", "Данные отсутствуют")}</p></div>`;
      return;
    }

    state = {
      mode,
      cfg,
      questions,
      initialQuestions: initialQuestions,
      allQuestions: questions.slice(),
      wave: 1,
      currentIndex: 0,
      answered: 0,
      attemptLog: [],
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
     CLEAN TIMER RING MODULE
     ============================================================ */

  function renderTimerRing(secRemaining, secTotal) {
    const ring = document.getElementById("ce-timer-ring");
    if (!ring) return;

    if (secRemaining <= 30) ring.classList.add("ce-timer-critical");
    else ring.classList.remove("ce-timer-critical");

    let color = "var(--brand)";
    if (secRemaining <= 5 * 60) color = "#ef4444";
    else if (secRemaining <= 10 * 60) color = "#f59e0b";

    const pct = secRemaining / secTotal;
    const dash = Math.round(100 * pct);

    ring.innerHTML = `
      <svg viewBox="0 0 36 36" preserveAspectRatio="xMidYMid meet">
        <path class="track"
          fill="none"
          stroke="#e5e7eb"
          stroke-width="3"
          d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"/>
        <path class="fill"
          fill="none"
          stroke="${color}"
          stroke-width="3"
          stroke-dasharray="${dash}, 100"
          d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"/>
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

  function startTimer() {
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

        finishQuiz(true);
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

    // Meta
    const meta = createEl("div", "ce-q-meta");
    const idxText = t("question_x_of_y", "Question {x} sur {y}")
      .replace("{x}", String(state.currentIndex + 1))
      .replace("{y}", String(state.questions.length));
    meta.textContent = idxText;
    card.appendChild(meta);

    // Topic label (DISPLAY in current language, canonical is stored separately)
    const topicLabel = q.topicDisplay || q.topicLabel || "";
    const topicEl = createEl("div", "ce-q-topic", topicLabel || "");
    if (topicLabel) card.appendChild(topicEl);

    // Subtopic label (safe)
    if (q.subtopic) {
      const subEl = createEl("div", "ce-q-subtopic", q.subtopic);
      card.appendChild(subEl);
    }

    // Question text + speaker
    const questionWrap = createEl("div", "ce-question-wrap");

    const questionEl = createEl("div", "ce-question");
    questionEl.textContent = q.text;
    questionWrap.appendChild(questionEl);

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

    // Options
    const optionsWrap = createEl("div", "ce-options");
    const shuffledOptions = shuffle(q.options.slice());

    shuffledOptions.forEach((opt) => {
      const btn = createEl("button", "ce-option");
      btn.dataset.index = String(opt.idx);

      const labelSpan = createEl("span", "ce-option-label", opt.text);
      btn.appendChild(labelSpan);

      if (
        window.CivicReading &&
        typeof window.CivicReading.speak === "function" &&
        window.CivicReading.isEnabled()
      ) {
        const speakBtn = createEl("button", "ce-speak-btn ce-speak-small", "🔊");
        speakBtn.type = "button";
        speakBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          window.CivicReading.speak(opt.text);
        });
        btn.appendChild(speakBtn);
      }

      if (!document.body.classList.contains("review-mode")) {
        btn.addEventListener("click", () => handleAnswerClick(btn, q, opt));
      }

      optionsWrap.appendChild(btn);
    });

    // Review mode styling (kept as-is from classic engine)
    if (document.body.classList.contains("review-mode")) {
      const allButtons = optionsWrap.querySelectorAll("button.ce-option");

      allButtons.forEach((b, idx) => {
        const o = q.options[idx];
        if (o && o.correct) b.classList.add("correct");
        if (o && !o.correct && q.userAnswer === o.idx) b.classList.add("wrong");
        b.disabled = true;
      });
    }

    card.appendChild(optionsWrap);

    // Footer with Next button
    const footer = createEl("div", "ce-q-footer");

    const nextBtn = createEl(
      "button",
      "btn ce-next-btn",
      t("test_next", "Suivant")
    );
    nextBtn.disabled = true;
    nextBtn.addEventListener("click", () => goNext());

    footer.appendChild(nextBtn);
    card.appendChild(footer);

    quizEl.innerHTML = "";
    quizEl.appendChild(card);

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
    question.correctAnswer = question.options.findIndex(o => o.correct === true);

    if (optionsWrap.classList.contains("answered")) return;
    optionsWrap.classList.add("answered");

    const allButtons = optionsWrap.querySelectorAll("button.ce-option");

    allButtons.forEach(b => {
      const idx = Number(b.dataset.index || 0);
      const o = question.options[idx];

      if (o && o.correct) b.classList.add("correct");
      if (b === btn && o && !o.correct) b.classList.add("wrong");
      b.disabled = true;
    });

    if (typeof question.firstAttemptCorrect === "undefined") {
      const trueCorrect = question.options[opt.idx].correct ? 1 : 0;
      question.firstAttemptCorrect = trueCorrect;
    }

    if (state.mode === "topics") {
      attemptLog.push({
        qId: question.id,
        correct: !!opt.correct,
        wave: state.wave
      });
    }

    state.answered += 1;
    if (opt.correct) state.correct += 1;
    else state.incorrect += 1;

    updateProgress(question, opt.correct);
    question._userCorrect = !!opt.correct;

    const nextBtn = document.querySelector(".ce-next-btn");
    if (nextBtn) nextBtn.disabled = false;

    updateProgressBar();
  }

  function goNext() {
    if (!state) return;

    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
      updateProgressBar();
      return;
    }

    // end of wave – Autopilot logic only for Topics
    if (state.mode === "topics") {
      const source = state.allQuestions;
      const wrong = source.filter(q => q._userCorrect === false);

      if (wrong.length > 0) {
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

    finishQuiz(false);
  }

  function updateProgressBar() {
    if (!state) return;

    const total = state.questions.length || 1;
    const pct = Math.round((state.answered / total) * 100);

    let barId = null;
    if (state.mode === "simulation") barId = "simProgress";
    else if (state.mode === "quick") barId = "quickProgress";
    else if (state.mode === "traps") barId = "trapsProgress";
    else if (state.mode === "topics") barId = "topicsProgress";
    else return;

    const bar = document.getElementById(barId);
    if (!bar) return;

    bar.style.width = pct + "%";
    bar.setAttribute("data-value", String(pct));
  }

  // ----------------------------------------------------------
  // Topics Mode: compute remaining & restart (patched to canonical LT)
  // ----------------------------------------------------------

  async function computeTopicsRemaining() {
    if (!state || state.mode !== "topics") {
      return { total: 0, remaining: 0 };
    }

    let selectedNorm = [];

    // Primary: use explicit selected topics (CANONICAL LT)
    if (Array.isArray(state.selectedTopics) && state.selectedTopics.length) {
      selectedNorm = state.selectedTopics.map(k => normalizeLabel(k));
    } else if (Array.isArray(state.initialQuestions)) {
      // Fallback: infer from what we actually saw
      const s = new Set();
      state.initialQuestions.forEach(q => {
        if (q.topicLabel) s.add(normalizeLabel(q.topicLabel));
      });
      selectedNorm = Array.from(s);
    }

    if (!selectedNorm.length) {
      return { total: 0, remaining: 0 };
    }

    const fullBank = await loadBankIfNeeded({});
    const progress = readJsonLS("civicedge_progress", {});

    let total = 0;
    let remaining = 0;

    fullBank.forEach(q => {
      const topicNorm = normalizeLabel(q.topicLabel);
      if (!selectedNorm.includes(topicNorm)) return;

      total += 1;

const qTextLT =
  q._raw &&
  q._raw.q &&
  typeof q._raw.q === "object"
    ? q._raw.q.lt
    : q.text;

const key = `${q.topicLabel || "topic"}:${qTextLT}`;
const entry = progress[key];


      if (!(entry && entry.correct === 1)) {
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

    wrapper.innerHTML = `
      <svg viewBox="0 0 36 36" class="ce-topics-ring-svg" aria-hidden="true">
        <path class="track" fill="none" stroke="#e5e7eb" stroke-width="3.2"
          d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"/>
        <path class="fill" fill="none" stroke="var(--brand)" stroke-width="3.2"
          stroke-linecap="round" stroke-dasharray="${dash}, 100"
          d="M18 2 a 16 16 0 0 1 0 32 a 16 16 0 0 1 0 -32"/>
        <text x="18" y="20" text-anchor="middle" fill="#111827"
          font-size="9" font-weight="600">${safeRemaining}</text>
      </svg>
    `;

    const caption = createEl(
      "div",
      "ce-topics-ring-caption",
      t("topics_ring_caption", "{n} questions restantes dans les sujets sélectionnés")
        .replace("{n}", String(safeRemaining))
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

    const simCfg = state.cfg.simulation || {};
    const required = simCfg.passScore || null;
    let passed = null;

    if (required !== null) {
      passed = correct >= required;
    }

    const durationSec = Math.round((state.finishedAt - state.startedAt) / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const durationLabel = `${minutes}m ${seconds}s`;

    // ===== SPECIAL ENDING FOR TOPICS (AUTOPILOT) =====
    if (state.mode === "topics") {
      const card = createEl("div", "ce-card ce-result");

      const layout = createEl("div", "ce-result-layout");
      const mainCol = createEl("div", "ce-result-main");
      const ringCol = createEl("div", "ce-result-ring");

      const h2 = createEl("h2");
      h2.setAttribute("data-i18n", "topics_mastered_title");
      h2.textContent = t("topics_mastered_title", "Ensemble maîtrisé 🎉");

      launchConfetti();

      const sub = createEl("p", "muted");
      sub.setAttribute("data-i18n", "topics_mastered_sub");
      sub.textContent = t("topics_mastered_sub", "Vous avez répondu correctement à toutes les questions de ce lot.");

      const list = createEl("ul", "ce-result-list");
      const liTime = createEl("li");
      liTime.innerHTML = `<strong>${t("result_time", "Temps passé")}:</strong> ${durationLabel}`;
      list.appendChild(liTime);

      const btnBar = createEl("div", "ce-result-actions");

      const continueBtn = createEl("button", "btn", t("topics_continue", "Continuer"));
      continueBtn.id = "topicsContinueBtn";
      continueBtn.style.display = "none";
      continueBtn.addEventListener("click", () => {
        restartTopicsWithSameSelection();
      });
      btnBar.appendChild(continueBtn);

      const backBtn = createEl("button", "btn secondary", t("topics_back_to_select", "Retour aux sujets"));
      backBtn.addEventListener("click", () => {
        window.location.href = "topics.html";
      });
      btnBar.appendChild(backBtn);

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
          if (continueBtn) {
            continueBtn.style.display = remaining > 0 ? "inline-block" : "none";
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
    const card = createEl("div", "ce-card ce-result");

    const h2 = createEl("h2");
    h2.setAttribute("data-i18n", "result_title");
    h2.textContent = t("result_title", "Résultats");

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
    liTime.innerHTML = `<strong>${t("result_time", "Temps passé")}:</strong> ${durationLabel}`;

    list.appendChild(liScore);
    list.appendChild(liCorrect);
    list.appendChild(liWrong);
    list.appendChild(liTime);

    if (state.mode === "traps") {
      const progress = readJsonLS("civicedge_progress", {});
      let remaining = 0;
      let cleaned = 0;

      Object.values(progress).forEach(p => {
        const attempts = p.attempts || 0;
        const correctFlag = p.correct || 0;
        if (attempts >= 3) {
          if (correctFlag === 0) remaining += 1;
          else cleaned += 1;
        }
      });

      const trapsTitle = createEl("h3", "ce-result-traps-title");
      trapsTitle.setAttribute("data-i18n", "traps_fixed_title");
      trapsTitle.textContent = t("traps_fixed_title", "Pièges corrigés");

      const trapsLine = createEl("p", "ce-result-traps-line");
      const tmpl = t("traps_fixed_line", "Vous avez corrigé {fixed}. Il en reste {remaining}.");
      trapsLine.textContent = tmpl
        .replace("{fixed}", String(cleaned))
        .replace("{remaining}", String(remaining));

      card.appendChild(trapsTitle);
      card.appendChild(trapsLine);
    }

    if (timeUp) {
      const timeNote = createEl("p", "muted");
      timeNote.setAttribute("data-i18n", "test_time_up");
      timeNote.textContent = t("test_time_up", "Temps écoulé !");
      card.appendChild(timeNote);
    }

    const btnBar = createEl("div", "ce-result-actions");

    const reviewBtn = createEl("button", "btn secondary", t("test_review_errors", "Revoir les erreurs"));
    reviewBtn.id = "reviewErrorsBtn";

    const restartBtn = createEl("button", "btn", t("test_restart", "Recommencer"));
    restartBtn.id = "restartBtn";

    btnBar.appendChild(reviewBtn);
    btnBar.appendChild(restartBtn);

    card.appendChild(h2);
    card.appendChild(sub);

    if (state.mode === "simulation" && required !== null) {
      const gradeEl = createEl("p", "ce-result-grade");
      gradeEl.innerHTML = passed
        ? `<span class="ce-result-status pass">${t("result_passed")}</span>`
        : `<span class="ce-result-status fail">${t("result_failed")}</span>`;
      card.appendChild(gradeEl);
      if (passed) launchConfetti();
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
    // Canonical key: LT topic + full question text (already in current language; stable enough per-language banks)
   const topicLT = question.topicLabel || "topic";

const qTextLT =
  question._raw &&
  question._raw.q &&
  typeof question._raw.q === "object"
    ? question._raw.q.lt
    : question.text;

const key = `${topicLT}:${qTextLT}`;


    const progress = readJsonLS("civicedge_progress", {});

    const entry = progress[key] || {
      attempts: 0,
      rights: 0,
      wrongs: 0,
      correct: 0,
      topic: question.topicLabel || null
    };

    entry.attempts += 1;

    if (correct) {
      entry.rights += 1;
      entry.correct = 1;
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

    const durationSec = Math.round((state.finishedAt - state.startedAt) / 1000);

    const topicsSet = new Set();
    const sourceQuestions =
      state.mode === "topics" && Array.isArray(state.initialQuestions)
        ? state.initialQuestions
        : state.questions;

    sourceQuestions.forEach(q => {
      if (q.topicLabel) topicsSet.add(q.topicLabel);
    });

    const answeredQuestions = sourceQuestions.map(q => {
      const userOption = q.options.find(o => o.idx === q.userAnswer);
      const correctOption = q.options.find(o => o.correct === true);

      return {
        id: q.id,
        topic: q.topicLabel || null,
		topicDisplay: q.topicDisplay || null,
        correct: !!q._userCorrect,
        firstAttemptCorrect:
          typeof q.firstAttemptCorrect === "number"
            ? q.firstAttemptCorrect
            : NaN,
        qText: q.text,
        userAnswerText: userOption ? userOption.text : null,
        correctAnswerText: correctOption ? correctOption.text : null,
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
      attemptLog: attemptLog,
      questions: answeredQuestions
    };

    stats.history.push(session);
    writeJsonLS("civicedge_stats", stats);
  }

  // Delegated click handler for Result Screen
  document.addEventListener("click", (e) => {
    const target = e.target;

    if (target && target.id === "restartBtn") {
      window.location.reload();
      return;
    }

    if (target && target.id === "reviewErrorsBtn") {
      startReviewMode();
      return;
    }
  });

  function startReviewMode() {
    if (!state) return;

    const quizEl = document.getElementById("quiz");
    if (!quizEl) return;

    const wrong = state.questions.filter(q => q._userCorrect === false);

    if (!wrong.length) {
      quizEl.innerHTML = `
        <div class="ce-card"><p>${t("alert_no_errors", "Aucune erreur")}</p></div>
      `;
	  
	  const i18n = getI18n();
if (i18n && typeof i18n.apply === "function") {
  i18n.apply();
}
      return;
    }

    let html = `
      <div class="ce-card" style="padding:24px;">
        <h2 style="margin-bottom:20px;">${t("review_title", "Revoir les erreurs")}</h2>
    `;

    wrong.forEach((q, i) => {
      html += `
        <div class="ce-review-item" style="margin-bottom:32px;">
<div class="ce-q-meta">${
  t("question_x_of_y", "Question {x} of {y}")
    .replace("{x}", i + 1)
    .replace("{y}", wrong.length)
}</div>

          <div class="ce-q-topic">${q.topicDisplay || q.topicLabel || ""}</div>
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

    document.getElementById("reviewRestartBtn").addEventListener("click", () => {
      location.reload();
    });
  }

  // CONFETTI EFFECT
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

    const pieces = Array.from({ length: 180 }, () => ({
      x: Math.random() * W,
      y: -Math.random() * H * 0.5,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 3 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 2 * Math.PI,
      rspeed: (Math.random() - 0.5) * 0.3,
    }));

    let raf;

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rspeed;

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

    setTimeout(() => {
      cancelAnimationFrame(raf);
      canvas.remove();
    }, 2500);
  }

})();
