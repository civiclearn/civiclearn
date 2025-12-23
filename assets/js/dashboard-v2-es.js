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
    if (!Array.isArray(history)) return 0;

    let streak = 0;
    let lastDate = null;

    for (let i = history.length - 1; i >= 0; i--) {
      const session = history[i];

      // SUPPORT BOTH SCHEMES:
      const d =
        session.startedAt ||
        session.date || // old format
        null;

      if (!d) break;

      const sessionDate = new Date(d).toDateString();

      if (!lastDate) {
        lastDate = sessionDate;
        streak = 1;
        continue;
      }

      const yesterday = new Date(lastDate);
      yesterday.setDate(yesterday.getDate() - 1);

      if (new Date(sessionDate).toDateString() === yesterday.toDateString()) {
        streak++;
        lastDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }
  
  function getDashboardSequentialStats() {
  try {
    return JSON.parse(localStorage.getItem("civiclearn:ccse:stats")) || null;
  } catch {
    return null;
  }
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
  // Chart.js instances (must be destroyed on re-init)
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
    const sheetInput = document.getElementById("examDateInput");
    const sheetCancel = document.getElementById("sheetCancel");
    const sheetSave = document.getElementById("sheetSave");

    function renderCountdown() {
      const saved = localStorage.getItem("civicedge_testDate");

      // No date set
if (!saved) {
  countdownValue.style.display = "none";
  examNoDate.style.display = "block";

  // NEW: proper first-time messages
  examNoDate.textContent = t("countdown_enter_date");
  openDateSheet.textContent = t("countdown_set_date_btn");

  card.style.setProperty("--countdownColor", "#e0f2ff");
  return;
}


      const today = new Date();
      const examDate = new Date(saved);
      const diff = Math.ceil((examDate - today) / 86400000);

      countdownValue.style.display = "block";
      examNoDate.style.display = "none";
	  openDateSheet.textContent = t("countdown_modify_date_btn");

      // Text update (with i18n, but bullet-proof against raw keys)
      const applyText = () => {
        if (diff >= 0) {
          let prefix = t("dashboard_countdown_prefix", "J").trim();
          // if i18n not ready and we got the key back, fall back to J
          if (!prefix || prefix === "dashboard_countdown_prefix") prefix = "J";
          countdownValue.textContent = `${prefix}-${diff}`;
        } else {
          let finished = t("dashboard_countdown_finished", "Terminé");
          if (!finished || finished === "dashboard_countdown_finished") {
            finished = "Terminé";
          }
          countdownValue.textContent = finished;
        }
      };

      if (
        window.CivicLearnI18n &&
        typeof window.CivicLearnI18n.onReady === "function"
      ) {
        window.CivicLearnI18n.onReady(applyText);
      } else {
        applyText();
      }

      // Gradient tied directly to the numeric diff
      card.style.setProperty("--countdownColor", getCountdownColor(diff));
    }



    function openSheet() {
      if (!sheet) return;
      sheet.classList.add("active");
      sheetOverlay.classList.add("active");
      sheetInput.value = localStorage.getItem("civicedge_testDate") || "";
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
        const v = sheetInput.value;
        if (!v) return;
        localStorage.setItem("civicedge_testDate", v);
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

    // Global donut
    const globalCanvas = document.getElementById("globalChart");
    if (globalCanvas) {
      const ctx = globalCanvas.getContext("2d");
      const masteryPct = (globalMetrics.masteryPct ?? globalMetrics.accuracy ?? 0);

         if (__globalChart) {
        __globalChart.destroy();
        __globalChart = null;
      }

      __globalChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: [
            t("dashboard_mastered_label", "Mastered"),
            t("dashboard_remaining_label", "Remaining")
          ],
          datasets: [
            {
              data: [masteryPct, Math.max(0, 100 - masteryPct)],
              backgroundColor: ["#7c3aed", "#ebe7ff"],
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: { 
            legend: { display: false },
            tooltip: { enabled: false } // <--- MODIFICATION HERE
          }
        }
      });
    }

    // Topic bar chart
    const topicsCanvas = document.getElementById("topicsChart");
    if (topicsCanvas) {
      const ctx = topicsCanvas.getContext("2d");
      const topicKeys = Object.keys(perTopic);
      const data = topicKeys.map((k) => {
        const entry = perTopic[k];
        return entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
      });

            if (__topicsChart) {
        __topicsChart.destroy();
        __topicsChart = null;
      }

      __topicsChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: topicKeys, // ALL topics, not only those with progress
          datasets: [
            {
              label: t("dashboard_topics_mastery_label", "Mastery (%)"),
              data,                        // 0..100 per topic
              backgroundColor: "#7c3aed",
              borderRadius: 4,
              barThickness: 14            // thin horizontal bars like your old design
            }
          ]
        },
        options: {
          indexAxis: "y",                 // <<< MAKE IT HORIZONTAL
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false } // Disable tooltips for bar chart
          },
          scales: {
            x: { beginAtZero: true, max: 100 },
            y: {
              ticks: {
                autoSkip: false           // <<< SHOW ALL TOPICS ALWAYS
              }
            }
          }
        }
      });
    }

    // Trend line
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
              label: t("dashboard_trend_accuracy_label", "Recent Accuracy"),
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


  // ------------------------------------------
  // MAIN INIT
  // ------------------------------------------

  async function initDashboard() {
    try {
      const stats = getStats();
      const progress = getProgress();
	  
	  
	  // --- Merge Dashboard Sequential stats ---
const dashSeq = getDashboardSequentialStats();

let dashSeqAnswered = 0;
let dashSeqCorrect = 0;
let dashSeqByTopic = {};

if (dashSeq) {
  dashSeqAnswered = Number(dashSeq.answered || 0);
  dashSeqCorrect = Number(dashSeq.correct || 0);
  dashSeqByTopic = dashSeq.byTopic || {};
}

	  
      const progressRaw = progress.raw || {};

      await loadBankSize();

      // Countdown FIRST
      initCountdownTile();

      const bank = window.__ceBank || [];
      const bankSize = window.__ceTotalQuestions || bank.length || 1;


      // 2. Metrics
      const entries = Object.values(progressRaw);
      const masteredQuestions = entries.filter((e) => Number(e.rights || 0) > 0).length;
      const mastery = bankSize > 0
  ? (masteredQuestions + dashSeqCorrect) / bankSize
  : 0;

      // Global mastery percentage (donut + label)
      safeText(document.getElementById("globalPct"), Math.round(mastery * 100) + "%");

      const globalAnsweredEl = document.getElementById("globalAnswered");
      if (globalAnsweredEl) {
        const label = t("dashboard_questions_label", "questions");
safeText(
  document.getElementById("globalAnswered"),
  (masteredQuestions + dashSeqCorrect) + " " + label
);

      }

      // Total distinct questions seen
const seenCount = Object.keys(progressRaw).length;
safeText(
  document.getElementById("tmAnswered"),
  seenCount + dashSeqAnswered
);

      // Global accuracy across all sessions
const totalQ = stats.totalQuestions + dashSeqAnswered;
const totalC = stats.totalCorrect + dashSeqCorrect;

const avgAcc =
  totalQ > 0
    ? Math.round((totalC / totalQ) * 100)
    : 0;

      safeText(document.getElementById("tmAccuracy"), avgAcc + "%");

      // Total study time
      safeText(document.getElementById("tmTime"), minutesToLabel(stats.totalMinutes));

      // Study streak
      const streakDays = getStreakFromHistory(stats.history || []);
      const streakKey =
        streakDays <= 1
          ? "dashboard_streak_day_singular"
          : "dashboard_streak_day_plural";

      const applyStreak = () => {
        let label = t(streakKey, "{n} jour").replace("{n}", String(streakDays));
        // avoid raw key if i18n not ready
        if (label.includes("dashboard_streak_day_")) {
          label = `${streakDays} jour`;
        }
        safeText(document.getElementById("tmStreak"), label);
      };

      if (
        window.CivicLearnI18n &&
        typeof window.CivicLearnI18n.onReady === "function"
      ) {
        window.CivicLearnI18n.onReady(applyStreak);
      } else {
        applyStreak();
      }


      // Optional gauge (if present)
      const gauge = document.querySelector('.gauge[data-kind="progress"]');
      if (gauge) gauge.setAttribute("data-value", mastery.toFixed(3));

      // 3. Charts
      const perTopic = computePerTopicProgressFromProgressRaw(progressRaw);
      const trendPoints = computeTrendPointsFromFirstAttempts(stats.history || []);

      const globalMetrics = computeGlobalMetrics(stats, bankSize, progress);
      globalMetrics.masteryPct = Math.round(mastery * 100);

      initCharts(globalMetrics, perTopic, trendPoints);
    } catch (err) {
      console.error("Dashboard init error:", err);
    }
  }

function computePerTopicProgressFromProgressRaw(progressRaw) {
  const result = {};

  const bank = window.__ceBank || [];
  if (!bank.length) return result;

  // First, initialize totals using the full bank
  bank.forEach(q => {
    const topic = q.topic || "Misc";
    if (!result[topic]) {
      result[topic] = { correct: 0, total: 0 };
    }
    result[topic].total += 1;          // TRUE total questions in this topic
  });

  // Now count mastered questions (correct once)
  Object.entries(progressRaw || {}).forEach(([key, entry]) => {
    const topic = entry.topic || "Misc";
    const rights = Number(entry.rights || 0);

    if (rights > 0 && result[topic]) {
      result[topic].correct += 1;
    }
  });
  
    // --- Merge Dashboard Sequential per-topic stats ---
  try {
    const dashSeq = JSON.parse(localStorage.getItem("civiclearn:ccse:stats"));
    if (dashSeq && dashSeq.byTopic) {
      Object.entries(dashSeq.byTopic).forEach(([topic, data]) => {
        if (!result[topic]) {
          result[topic] = { correct: 0, total: 0 };
        }
result[topic].correct += Number(data.correct || 0);
// DO NOT touch result[topic].total here

      });
    }
  } catch (e) {
    // silent fail – dashboard sequential stats are optional
  }


  return result;
}

// --- Expose for debug/testing/dashboard internal use ---
  // ADD THIS BLOCK HERE
  if (window.CivicEdgeEngine) {
    window.CivicEdgeEngine.getStats = getStats;
    window.CivicEdgeEngine.computeTrendPointsFromFirstAttempts = computeTrendPointsFromFirstAttempts;
  }

window.addEventListener("civiclearn:progress-updated", initDashboard);
  // start
    if (window.CivicLearnI18n && typeof window.CivicLearnI18n.onReady === "function") {
    window.CivicLearnI18n.onReady(initDashboard);
  } else {
    initDashboard();
  }

  })();

  