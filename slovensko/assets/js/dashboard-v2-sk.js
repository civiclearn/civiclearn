(() => {
  // ------------------------------------------
  // Required helpers
  // ------------------------------------------

  function safeText(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  // Use the global i18n helper (window.t) provided by i18n.js
  function t(key, fallback = "") {
    if (typeof window.t === "function") {
      const val = window.t(key);
      if (val !== undefined && val !== null && val !== "") return val;
    }
    return fallback;
  }

function getStreakFromHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return 0;

  const days = new Set();

  history.forEach(session => {
    const d = session.startedAt || session.date;
    if (!d) return;

    const date = new Date(d);
    if (isNaN(date)) return;

    // normalize to local calendar day
    const dayKey = date.getFullYear() + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0");

    days.add(dayKey);
  });

  return days.size;
}


  // ------------------------------------------
  // Stats + Progress
  // ------------------------------------------

  function getStats() {
    try {
      const raw = JSON.parse(localStorage.getItem("civicedge_stats")) || {};
      const history = Array.isArray(raw.history) ? raw.history : [];

      let totalQuestions = 0;
      let totalCorrect = 0;
      let totalMinutes = 0;

      history.forEach((s) => {
        const q = Number(s.total || 0);
        const c = Number(s.correct || 0);
        const durSec = Number(s.durationSec || 0);

        totalQuestions += q;
        totalCorrect += c;
        totalMinutes += Math.round(durSec / 60);
      });

      return {
        totalQuestions,
        totalCorrect,
        totalMinutes,
        history
      };
    } catch {
      return { totalQuestions: 0, totalCorrect: 0, totalMinutes: 0, history: [] };
    }
  }

  function getProgress() {
    try {
      const raw = JSON.parse(localStorage.getItem("civicedge_progress")) || {};
      return { raw };
    } catch {
      return { raw: {} };
    }
  }

  function computeGlobalMetrics(stats, bankSize, progress) {
    const progressRaw = progress.raw || {};
    return {
      answered: Object.keys(progressRaw).length,
      accuracy:
        stats.totalQuestions > 0
          ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
          : 0,
      studyMinutes: stats.totalMinutes
    };
  }

  // ------------------------------------------
  // Bank loader
  // ------------------------------------------

  async function loadBankSize() {
    if (window.__ceTotalQuestions) return;

    try {
      const bankPath = window.CIVICEDGE_CONFIG?.bank?.path;
const res = await fetch(bankPath);
      const raw = await res.json();
      const bank =
  Array.isArray(raw) ? raw : Array.isArray(raw.questions) ? raw.questions : [];
      window.__ceTotalQuestions = bank.length;
      window.__ceBank = bank;
    } catch {
      window.__ceTotalQuestions = 0;
      window.__ceBank = [];
    }
  }

// ------------------------------------------
// Chart.js instances (classic dashboard)
// ------------------------------------------
let __globalChart = null;
let __topicsChart = null;
let __trendChart = null;


  // ------------------------------------------
  // Charts helpers
  // ------------------------------------------

function minutesToLabel(mins) {
  // i18n-aware units
  const H = t("time_unit_hour", "h");     // ex: "t" in Danish
  const M = t("time_unit_minute", "m");   // ex: "m" universally fine

  if (!mins || mins <= 0) return `0${M}`;

  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (h > 0) {
    return `${h}${H} ${String(m).padStart(2, "0")}${M}`;
  }

  return `${m}${M}`;
}

function computePerTopicProgressFromHistory(history) {
  const perTopic = {};

  history.forEach((session) => {
    // each session contains an array of answered questions
    const questions = session.questions || [];

    questions.forEach((q) => {
      const topic = q.topic || "Misc";

      if (!perTopic[topic]) {
        perTopic[topic] = { correct: 0, total: 0 };
      }

      perTopic[topic].total += 1;
      if (q.correct) {
        perTopic[topic].correct += 1;
      }
    });
  });

  return perTopic;
}


function computeRollingAccuracy(history) {
  const sessions = Array.isArray(history) ? history : [];
  const last = sessions.slice(-9);

  return last.map((sess, idx) => {
    // Default: fallback to final percent
    let percent = sess.percent || 0;

    // Improve Topics mode only
    if (sess.mode === "topics" && Array.isArray(sess.questions)) {
      let correctFirstWave = 0;
      let totalFirstWave = sess.questions.length;

      sess.questions.forEach((q) => {
        if (q.userAnswer === q.correctAnswer) {
          correctFirstWave += 1;
        }
      });

      // First-wave accuracy
      percent = totalFirstWave
        ? Math.round((correctFirstWave / totalFirstWave) * 100)
        : 0;
    }

    return percent;
  });
}


  // ------------------------------------------
  // Countdown tile
  // ------------------------------------------

  function getCountdownColor(diff) {
    if (isNaN(diff)) return "#e0f2ff";   // default calm
    if (diff <= 3)   return "#ffcccc";   // very close – red
    if (diff <= 7)   return "#ffe6cc";   // close – orange
    if (diff <= 14)  return "#fff7cc";   // approaching – yellow
    return "#e0f2ff";                    // far away
  }


  function initCountdownTile() {
    const card = document.getElementById("countdownCard");
    if (!card) return;

    const countdownValue = document.getElementById("examCountdown");
    const examNoDate = document.getElementById("examNoDate");
    const openDateSheet = document.getElementById("openDateSheet");
    const sheet = document.getElementById("dateSheet");
    const sheetOverlay = document.getElementById("dateSheetOverlay");
    const sheetCancel = document.getElementById("sheetCancel");
    const sheetSave = document.getElementById("sheetSave");

    function renderCountdown() {
      const saved = localStorage.getItem("cl_sk_examDate");

      // No date set → show empty state, wait for user input.
      // (No hardcoded preset — Slovak exam dates aren't fixed sessions like DK.)
      if (!saved) {
        countdownValue.style.display = "none";
        countdownValue.textContent = "";
        examNoDate.style.display = "block";
        openDateSheet.textContent = "Nastaviť dátum →";
        card.style.setProperty("--countdownColor", getCountdownColor(NaN));
        return;
      }

      const today = new Date();
      const examDate = new Date(saved);
      const diff = Math.ceil((examDate - today) / 86400000);

      countdownValue.style.display = "block";
      examNoDate.style.display = "none";
      openDateSheet.textContent = "Upraviť dátum →";

      // "D-N" format: D = Deň (day), N = days until exam
      if (diff >= 0) {
        countdownValue.textContent = `D-${diff}`;
      } else {
        countdownValue.textContent = "Skúška prebehla";
      }

      card.style.setProperty("--countdownColor", getCountdownColor(diff));
    }



    function openSheet() {
      if (!sheet) return;
      sheet.classList.add("active");
      sheetOverlay.classList.add("active");
      const examDateInput = document.getElementById("examDateInput");
      if (examDateInput) {
        examDateInput.value = localStorage.getItem("cl_sk_examDate") || "";
      }
    }

    function closeSheet() {
      sheet.classList.remove("active");
      sheetOverlay.classList.remove("active");
    }

    if (openDateSheet) openDateSheet.addEventListener("click", openSheet);
    if (sheetOverlay) sheetOverlay.addEventListener("click", closeSheet);
    if (sheetCancel) sheetCancel.addEventListener("click", closeSheet);

    if (sheetSave) {
      sheetSave.addEventListener("click", () => {
        const examDateInput = document.getElementById("examDateInput");
        const v = examDateInput?.value;
        if (!v) {
          localStorage.removeItem("cl_sk_examDate");
        } else {
          localStorage.setItem("cl_sk_examDate", v);
        }
        closeSheet();
        renderCountdown();
      });
    }

    renderCountdown();
  }

  // ------------------------------------------
  // Charts init
  // ------------------------------------------
  function initCharts(globalMetrics, perTopic, trendPoints) {
    if (typeof Chart === "undefined") return;

    // ----------------------------
    // Global donut (TWO RINGS)
    //   Ring 1: Phase 1 (exam only, excluding values/events)
    //   Ring 2: Phase 2 (manual + values/events)
    // ----------------------------
    const globalCanvas = document.getElementById("globalChart");
    if (globalCanvas) {
      const ctx = globalCanvas.getContext("2d");

      const p1 = Number(globalMetrics.phase1Pct || 0);
      const p2 = Number(globalMetrics.phase2Pct || 0);

      if (__globalChart) {
        __globalChart.destroy();
        __globalChart = null;
      }

      __globalChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          datasets: [
            // Phase 1 ring (thicker, purple)
            {
              data: [p1, Math.max(0, 100 - p1)],
              backgroundColor: ["#7c3aed", "#ebe7ff"],
              borderWidth: 0,
              weight: 2
            },
            // Phase 2 ring (thinner, muted)
            {
              data: [p2, Math.max(0, 100 - p2)],
              backgroundColor: ["#14b8a6", "#eefaf8"],
              borderWidth: 0,
              weight: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          }
        }
      });
    }

    // ----------------------------
    // Topics chart (TWO OVERLAYS)
    // ----------------------------
    const topicsCanvas = document.getElementById("topicsChart");
    if (topicsCanvas) {
      const ctx = topicsCanvas.getContext("2d");

      const topicKeys = Array.isArray(perTopic.labels) ? perTopic.labels : [];
      const p1Data = Array.isArray(perTopic.phase1) ? perTopic.phase1 : [];
      const p2Data = Array.isArray(perTopic.phase2) ? perTopic.phase2 : [];

      if (__topicsChart) {
        __topicsChart.destroy();
        __topicsChart = null;
      }

      __topicsChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: topicKeys,
          datasets: [
  {
    label: "Phase 1",
    data: p1Data,
    backgroundColor: "#7c3aed",
    borderRadius: 4,
    barThickness: 10
  },
  {
    label: "Phase 2",
    data: p2Data,
    backgroundColor: "#14b8a6",
    borderRadius: 4,
    barThickness: 10
  }
]

        },
        options: {
  indexAxis: "y",
  responsive: true,
  maintainAspectRatio: false,

  scales: {
  x: {
    min: 0,
    max: 100,
    stacked: false
  },
  y: {
    stacked: false,
    ticks: { autoSkip: false }
  }
},

  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label(ctx) {
          const v = Math.round(ctx.raw || 0);
          return ctx.dataset.label + ": " + v + "%";
        }
      }
    }
  }
}

      });
    }

    // Trend line (UNCHANGED)
    const trendCanvas = document.getElementById("trendChart");
    if (trendCanvas && trendPoints.length > 0) {
      const ctx = trendCanvas.getContext("2d");
      const labels = trendPoints.map((_, i) => `S${i + 1}`);

      new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: t("dashboard_trend_accuracy_label", "Nedávna presnosť"),
              data: trendPoints,
              fill: false,
              tension: 0.2,
              borderColor: "#7c3aed",
              backgroundColor: "#7c3aed",
              pointBackgroundColor: "#7c3aed",
              pointBorderColor: "#7c3aed",
              borderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { min: 0, max: 100 } }
        }
      });
    }
  }



function computeTrendPointsFromFirstAttempts(history) {
  const sessions = Array.isArray(history) ? history : [];
  const last = sessions.slice(-9); 

  return last.map((sess) => {
    let sum = 0;
    let questionsInFirstWave = 0;
    let hasFirstAttemptData = false;

    if (Array.isArray(sess.questions) && sess.questions.length > 0) {
      sess.questions.forEach((q) => {
        // Robustly convert to a number. Converts 0, "0", 1, "1" correctly. 
        // Converts null/undefined to 0 (which is why we need to check the topic mode later).
        const firstAttempt = Number(q.firstAttemptCorrect); 

        // Check if the cast resulted in a valid 0 or 1.
        // We ensure it is a number and that it is explicitly 0 or 1.
        if (!isNaN(firstAttempt) && (firstAttempt === 0 || firstAttempt === 1)) {
          questionsInFirstWave += 1;
          sum += firstAttempt;
        }
      });
      
      if (questionsInFirstWave > 0) {
        hasFirstAttemptData = true;
        return Math.round((sum / questionsInFirstWave) * 100);
      }
    }

    // --- FALLBACK LOGIC ---
    
    // 1. Topics Mode: If it's Topics mode and we have no first-attempt data, we return 0%
    //    This is crucial to avoid showing 100% for old, pre-patch tests.
    if (sess.mode === "topics" && !hasFirstAttemptData) {
      return 0;
    }
    
    // 2. All Other Modes: Use the session's overall percent
    return sess.percent || 0;
  });
}


function maybeShowReviewCard() {
  // Removed — review collection now handled by Trustpilot JS integration
}

  // ------------------------------------------
  // MAIN INIT
  // ------------------------------------------

  async function initDashboard() {
    try {
      const stats = getStats();
      const progress = getProgress();
      const progressRaw = progress.raw || {};

      await loadBankSize();

      // Countdown FIRST
      initCountdownTile();

      const bank = window.__ceBank || [];

      // PHASE-AWARE (global + topic)
      const phaseData = computePhaseAwareDashboardData(bank, progressRaw);

      // Keep __ceMastery meaningful: Phase 1 ratio
      window.__ceMastery = phaseData.global.phase1Ratio;

      // Main label under donut = Phase 1 %
      safeText(document.getElementById("globalPct"), phaseData.global.phase1Pct + "%");

      // Under-donut count = Phase 1 mastered questions
      const globalAnsweredEl = document.getElementById("globalAnswered");
      if (globalAnsweredEl) {
        const label = t("dashboard_questions_label", "otázok");
        safeText(globalAnsweredEl, phaseData.global.phase1Mastered + " " + label);
      }

      // Unlock hint = Phase 1 ONLY
      const phaseUnlockHintEl = document.getElementById("phaseUnlockHint");
      if (phaseUnlockHintEl) {
        if (phaseData.global.phase1Ratio < 0.7) {
          const pctLeft = Math.max(0, 70 - Math.round(phaseData.global.phase1Ratio * 100));
          phaseUnlockHintEl.textContent = pctLeft + "% do plnej pripravenosti";
        } else {
          phaseUnlockHintEl.textContent = "";
        }
      }

      // Total distinct questions seen
      const seenCount = Object.keys(progressRaw).length;
      safeText(document.getElementById("tmAnswered"), seenCount);

      // Global accuracy across all sessions
      const avgAcc =
        stats.totalQuestions > 0
          ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100)
          : 0;
      safeText(document.getElementById("tmAccuracy"), avgAcc + "%");

      // Total study time
      safeText(document.getElementById("tmTime"), minutesToLabel(stats.totalMinutes));

      // Study streak — Slovak has three plural forms (1 / 2-4 / 5+)
      const streakDays = getStreakFromHistory(stats.history || []);

      const applyStreak = () => {
        let word;
        if (streakDays === 1) word = "deň";
        else if (streakDays >= 2 && streakDays <= 4) word = "dni";
        else word = "dní";

        safeText(document.getElementById("tmStreak"), `${streakDays} ${word}`);
      };

      applyStreak();

      // Optional gauge (Phase 1)
      const gauge = document.querySelector('.gauge[data-kind="progress"]');
      if (gauge) gauge.setAttribute("data-value", phaseData.global.phase1Ratio.toFixed(3));

      // Charts
      const perTopic = phaseData.perTopicChart;
      const trendPoints = computeTrendPointsFromFirstAttempts(stats.history || []);

      const globalMetrics = computeGlobalMetrics(stats, 1, progress);
      globalMetrics.phase1Pct = phaseData.global.phase1Pct;
      globalMetrics.phase2Pct = phaseData.global.phase2Pct;

      initCharts(globalMetrics, perTopic, trendPoints);

      // Show review card only AFTER charts are rendered
      maybeShowReviewCard({ mastery: phaseData.global.phase1Ratio });
    } catch (err) {
      console.error("Dashboard init error:", err);
    }
  }



function computePhaseAwareDashboardData(bank, progressRaw) {
  const safeBank = Array.isArray(bank) ? bank : [];
  const progress = progressRaw || {};

  // ----------------------------
  // Normalizers + keying (MUST MATCH ENGINE)
  // key = `${topicLabel || topicKey || "topic"}:${text}`
  // ----------------------------
  function normalizeTopic(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function makeKey(topicLabel, text) {
    const a = (topicLabel || "topic").trim();
    const b = (text || "").trim();
    return `${a}:${b}`;
  }

  function getTopicLabelForQuestion(q) {
    return q.topicLabel || q.topicKey || q.topic || "topic";
  }

  function getTextForQuestion(q) {
    return q.text || q.q || "";
  }

  // Build a lookup from canonical key -> question
  const bankByKey = new Map();
  safeBank.forEach(q => {
    const k = makeKey(getTopicLabelForQuestion(q), getTextForQuestion(q));
    if (!bankByKey.has(k)) bankByKey.set(k, q);
  });

  // ----------------------------
  // Phase classifier (POLICY FROZEN)
  // ----------------------------
  function classifyQuestion(q) {
    const topicRaw = q.topic || q.topicLabel || q.topicKey || "";
    const topicNorm = normalizeTopic(topicRaw);

    const isValues = topicNorm === "danske værdier";
    const isEvents = topicNorm === "aktuelle begivenheder";

    const depth = q.depth;
    const source = q.source;

    if (depth === "deep") return { ignore: true };

    // Phase 1: exam ONLY, excluding values/events
    if (source === "exam" && !isValues && !isEvents) {
      return { phase: 1, topicEligible: true };
    }

    // Phase 2: manual/core OR values/events
    if (source === "manual" || source === "core" || isValues || isEvents) {
      return { phase: 2, topicEligible: !(isValues || isEvents) };
    }

    return { ignore: true };
  }

// ----------------------------
// Decide which 6 topics to show in the bar chart
// SOURCE OF TRUTH = CIVICEDGE_CONFIG topicLabels
// ----------------------------
const cfg = window.CIVICEDGE_CONFIG || {};
const topicLabels = cfg.topics?.topicLabels || {};
const topicOrder = Array.isArray(cfg.topics?.topicOrder)
  ? cfg.topics.topicOrder
  : Object.keys(topicLabels);

// Canonical topic key → display label
// We work ONLY with canonical topic keys here
const topicsToShow = topicOrder.slice(0, 6);

// Helper: normalize a label for comparison
function norm(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Map question → canonical topic key
function getCanonicalTopicKey(q) {
  // If engine already provides canonical key, use it directly
  if (q && q.topicKey && Object.prototype.hasOwnProperty.call(topicLabels, q.topicKey)) {
    return q.topicKey;
  }

  // Otherwise, match by label text
  const raw = q?.topicLabel || q?.topic || "";
  const n = norm(raw);

  for (const [key, label] of Object.entries(topicLabels)) {
    if (norm(label) === n) return key;
  }

  return null; // values, events, misc → excluded
}



  // ----------------------------
  // GLOBAL totals (pie)
  //   P1 totals: exam only (excluding values/events)
  //   P2 totals: manual/core + values/events
  // ----------------------------
  const global = {
    phase1Total: 0,
    phase1Mastered: 0,
    phase2Total: 0,
    phase2Mastered: 0
  };

  safeBank.forEach(q => {
    const c = classifyQuestion(q);
    if (c.ignore) return;

    if (c.phase === 1) global.phase1Total += 1;
    if (c.phase === 2) global.phase2Total += 1;
  });

  // ----------------------------
  // PER TOPIC totals (bars) - values/events excluded automatically via topicEligible
  // ----------------------------
  const perTopicTotals = {};
  topicsToShow.forEach(tpc => {
    perTopicTotals[tpc] = {
      p1Total: 0, p1Mastered: 0,
      p2Total: 0, p2Mastered: 0
    };
  });

  safeBank.forEach(q => {
  const c = classifyQuestion(q);
  if (c.ignore || !c.topicEligible) return;

  const key = getCanonicalTopicKey(q);
  if (!key || !perTopicTotals[key]) return;

  if (c.phase === 1) perTopicTotals[key].p1Total += 1;
  if (c.phase === 2) perTopicTotals[key].p2Total += 1;
});


  // ----------------------------
  // MASTERED counts from progressRaw
  // Mastered = (entry.correct === 1) OR (rights > 0)
  // ----------------------------
Object.entries(progress || {}).forEach(([progressKey, entry]) => {
  const isMastered =
    (Number(entry?.correct || 0) === 1) ||
    (Number(entry?.rights || 0) > 0);
  if (!isMastered) return;

  // Prefer engine snapshot, but fall back to bank key lookup for older entries
  const q = entry?._raw || bankByKey.get(progressKey);
  if (!q) return;

  const c = classifyQuestion(q);
  if (c.ignore) return;

  // GLOBAL counters
  if (c.phase === 1) global.phase1Mastered += 1;
  if (c.phase === 2) global.phase2Mastered += 1;

  // PER-TOPIC counters
  if (c.topicEligible) {
    const topicKey = getCanonicalTopicKey(q);
    if (topicKey && perTopicTotals[topicKey]) {
      if (c.phase === 1) perTopicTotals[topicKey].p1Mastered += 1;
      if (c.phase === 2) perTopicTotals[topicKey].p2Mastered += 1;
    }
  }
});


// Percent conversions (global)
const phase1Ratio =
  global.phase1Total > 0 ? (global.phase1Mastered / global.phase1Total) : 0;

const phase2Ratio =
  global.phase2Total > 0 ? (global.phase2Mastered / global.phase2Total) : 0;

// Per-topic chart data (ABSOLUTE percentages)
// Overlay mode: Phase 1 and Phase 2 are drawn independently
const perTopicChart = {
  labels: topicsToShow,

  // Phase 1 — exam questions
  phase1: topicsToShow.map(tpc => {
    const e = perTopicTotals[tpc];
    return e.p1Total > 0
      ? Math.round((e.p1Mastered / e.p1Total) * 100)
      : 0;
  }),

  // Phase 2 — manual / extra preparation questions
  phase2: topicsToShow.map(tpc => {
    const e = perTopicTotals[tpc];
    return e.p2Total > 0
      ? Math.round((e.p2Mastered / e.p2Total) * 100)
      : 0;
  })
};


  return {
    global: {
      phase1Total: global.phase1Total,
      phase1Mastered: global.phase1Mastered,
      phase2Total: global.phase2Total,
      phase2Mastered: global.phase2Mastered,
      phase1Ratio,
      phase2Ratio,
      phase1Pct: Math.round(phase1Ratio * 100),
      phase2Pct: Math.round(phase2Ratio * 100)
    },
    perTopicChart
  };
}


// --- Expose for debug/testing/dashboard internal use ---
  // ADD THIS BLOCK HERE
  if (window.CivicEdgeEngine) {
    window.CivicEdgeEngine.getStats = getStats;
    window.CivicEdgeEngine.computeTrendPointsFromFirstAttempts = computeTrendPointsFromFirstAttempts;
  }

  // start
  initDashboard();

  })();

  