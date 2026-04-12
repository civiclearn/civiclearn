/* ─────────────────────────────────────────────────────────
   CivicLearn Dashboard Extra — Denmark (v2)
   Unified bar chart (Foundation + Extended combined)
   Readiness gauge calibrated to DK simulation
   100% celebration · Study time · Live updates
   ───────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const CACHE_KEY = "cl_gauge_cache";
  const lang = window.CIVICEDGE_LANG || "da";

  let __barChart = null;

  const TOPIC_COLORS = [
    "#1D9E75", // teal
    "#378ADD", // blue
    "#D85A30", // coral
    "#BA7517", // amber
    "#7F77DD", // purple
    "#D4537E", // pink
    "#639922", // green
    "#EF9F27", // gold
  ];

  function t(key, fallback) {
    if (window.CivicLearnI18n && typeof window.CivicLearnI18n.t === "function") {
      const v = window.CivicLearnI18n.t(key);
      if (v && v !== key) return v;
    }
    return fallback || key;
  }

  function getProgress() {
    try { return JSON.parse(localStorage.getItem("civicedge_progress")) || {}; }
    catch { return {}; }
  }

  function getBank() { return window.__ceBank || []; }

  // ════════════════════════════════════════════════════════
  // QUESTION CLASSIFICATION
  // Foundation: exam + values + begivenheder (non-deep)
  // Extended:   manual / core (non-deep)
  // Bonus:      deep (all sources)
  // ════════════════════════════════════════════════════════

  function classifyQuestion(q) {
    const source = q.source || "";
    const depth = q.depth || "";

    if (depth === "deep") return "bonus";

    if (source === "exam" || source === "values" || source === "begivenheder") {
      return "foundation";
    }

    if (source === "manual" || source === "core") {
      return "extended";
    }

    // Fallback: treat unknown source as extended
    return "extended";
  }

  // ════════════════════════════════════════════════════════
  // TOPIC HELPERS
  // ════════════════════════════════════════════════════════

  function normalizeLabel(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
  }

  function getTopicKey(q) {
    // Use the canonical topic from the question
    const t = q.topic || q.topicLabel || "";
    if (typeof t === "string") return t;
    if (typeof t === "object" && t.en) return t.en;
    return "Misc";
  }

  function getTopicLabel(q) {
    const t = q.topic || q.topicLabel || "";
    if (typeof t === "object") return t[lang] || t.da || t.en || "Misc";
    return t || "Misc";
  }

  // Get progress key matching the engine's key format
  function getProgressKey(q) {
    // Engine uses: `${topicLabel || topicKey || "topic"}:${text}`
    const label = q.topicLabel || q.topicKey || q.topic || "topic";
    const text = q.text || q.q || "";
    const labelStr = typeof label === "string" ? label : (label.en || label.da || "topic");
    const textStr = typeof text === "string" ? text : (text.da || text.en || "");
    return `${labelStr}:${textStr}`;
  }

  // Check mastery from progress entry
  function isMastered(progressEntry) {
    if (!progressEntry) return false;
    return (Number(progressEntry.correct || 0) === 1) ||
           (Number(progressEntry.rights || 0) > 0);
  }

  // ════════════════════════════════════════════════════════
  // COMPUTE TOPIC MASTERY (Foundation + Extended only)
  // ════════════════════════════════════════════════════════

  // Topics to show in bar chart (main 6 + values + current events)
  const CHART_TOPICS = [
    "Demokrati", "Historie", "Kulturliv",
    "Økonomi", "Omverdenen", "Temaopslag"
  ];

  function computeTopicMastery() {
    const bank = getBank();
    const progress = getProgress();
    const topics = {};

    // Initialize chart topics
    CHART_TOPICS.forEach(t => {
      topics[t] = { label: t, total: 0, mastered: 0 };
    });

    // Also track values/events for gauge (but not chart)
    const extras = {
      "Danske værdier": { total: 0, mastered: 0 },
      "Aktuelle begivenheder": { total: 0, mastered: 0 }
    };

    bank.forEach(q => {
      const tier = classifyQuestion(q);
      if (tier === "bonus") return; // Exclude deep from bars + gauge

      const topicKey = getTopicKey(q);
      const normKey = normalizeLabel(topicKey);

      // Check if it's values or current events
      if (normKey === normalizeLabel("Danske værdier")) {
        extras["Danske værdier"].total++;
        return;
      }
      if (normKey === normalizeLabel("Aktuelle begivenheder")) {
        extras["Aktuelle begivenheder"].total++;
        return;
      }

      // Match to chart topic
      const matched = CHART_TOPICS.find(ct => normalizeLabel(ct) === normKey);
      if (matched) {
        topics[matched].total++;
      }
    });

    // Build bank lookup by progress key for entries without _raw
    const bankByKey = new Map();
    bank.forEach(q => {
      const key = getProgressKey(q);
      if (!bankByKey.has(key)) bankByKey.set(key, q);
    });

    // Count mastered from progress
    Object.entries(progress).forEach(([key, entry]) => {
      if (!isMastered(entry)) return;

      // Prefer _raw snapshot; fall back to bank lookup by key
      let raw = entry._raw;
      if (!raw) {
        const bankQ = bankByKey.get(key);
        if (!bankQ) return;
        raw = bankQ; // raw bank question has source, depth, topic
      }

      const tier = classifyQuestion(raw);
      if (tier === "bonus") return;

      const topicKey = raw.topicLabel || raw.topic || "";
      const normKey = normalizeLabel(typeof topicKey === "object" ? (topicKey.da || topicKey.en || "") : topicKey);

      if (normKey === normalizeLabel("Danske værdier")) {
        extras["Danske værdier"].mastered++;
        return;
      }
      if (normKey === normalizeLabel("Aktuelle begivenheder")) {
        extras["Aktuelle begivenheder"].mastered++;
        return;
      }

      const matched = CHART_TOPICS.find(ct => normalizeLabel(ct) === normKey);
      if (matched && topics[matched]) {
        topics[matched].mastered++;
      }
    });

    return { topics, extras };
  }

  function computeOverall() {
    const { topics, extras } = computeTopicMastery();
    let total = 0, mastered = 0;

    Object.values(topics).forEach(t => { total += t.total; mastered += t.mastered; });
    Object.values(extras).forEach(e => { total += e.total; mastered += e.mastered; });

    return {
      topics, extras, total, mastered,
      pct: total > 0 ? Math.round((mastered / total) * 100) : 0
    };
  }

  // ════════════════════════════════════════════════════════
  // BONUS (Advanced) COUNTER
  // ════════════════════════════════════════════════════════

  function computeBonusStats() {
    const bank = getBank();
    const progress = getProgress();

    let total = 0, mastered = 0;
    bank.forEach(q => {
      if (classifyQuestion(q) !== "bonus") return;
      total++;
    });

    Object.entries(progress).forEach(([key, entry]) => {
      if (!isMastered(entry)) return;
      const raw = entry._raw;
      if (!raw) return;
      if (classifyQuestion(raw) !== "bonus") return;
      mastered++;
    });

    return { total, mastered };
  }

  // ════════════════════════════════════════════════════════
  // 1. COMPUTE & CACHE GAUGE
  // ════════════════════════════════════════════════════════

  function computeAndCacheGauge() {
    const cfg = window.CIVICEDGE_CONFIG || {};
    const simCfg = cfg.simulation || {};
    const totalQ = simCfg.questionCount || 45;
    const passScore = simCfg.passScore || 36;
    const quotas = simCfg.topicQuotas || {};
    const { topics, extras } = computeTopicMastery();

    // Merge topics + extras for rate lookup
    const allTopics = { ...topics };
    Object.entries(extras).forEach(([k, v]) => {
      allTopics[k] = { total: v.total, mastered: v.mastered };
    });

    let estimatedCorrect = 0;
    let quotaSum = 0;

    Object.entries(quotas).forEach(([topicName, quota]) => {
      const topicData = allTopics[topicName];
      const rate = topicData && topicData.total > 0
        ? topicData.mastered / topicData.total : 0;
      estimatedCorrect += rate * quota;
      quotaSum += quota;
    });

    // Fill any gap with global rate
    if (quotaSum < totalQ) {
      const allMastered = Object.values(allTopics).reduce((s, t) => s + t.mastered, 0);
      const allTotal = Object.values(allTopics).reduce((s, t) => s + t.total, 0);
      const globalRate = allTotal > 0 ? allMastered / allTotal : 0;
      estimatedCorrect += globalRate * (totalQ - quotaSum);
    }

    // Values veto: DK requires 4/5 on values questions
    const valuesData = extras["Danske værdier"];
    const valuesRate = valuesData && valuesData.total > 0
      ? valuesData.mastered / valuesData.total : 0;
    const estimatedValues = Math.round(valuesRate * 5);

    const estimated = Math.round(estimatedCorrect);
    const passedScore = estimated >= passScore;
    const passedVeto = estimatedValues >= 4;
    const passed = passedScore && passedVeto;
    const close = estimated >= passScore - 4 && !passed;

    let state = "red";
    if (passed) state = "green";
    else if (close) state = "orange";

    let badgeText;
    if (passed) badgeText = t("gauge_pass", "Bestået");
    else if (close) badgeText = t("gauge_close", "Næsten");
    else badgeText = t("gauge_needs_work", "Skal øve mere");

    const cache = { estimated, total: totalQ, passScore, state, badgeText };

    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}

    window.dispatchEvent(new CustomEvent("cl:gauge-updated"));
  }

  // ════════════════════════════════════════════════════════
  // 2. VERTICAL BAR CHART (Foundation + Extended unified)
  // ════════════════════════════════════════════════════════

  function getChartData() {
    const overall = computeOverall();
    const keys = CHART_TOPICS;
    return {
      keys,
      labels: keys, // Danish labels as-is
      data: keys.map(k => {
        const t = overall.topics[k];
        return t && t.total > 0 ? Math.round((t.mastered / t.total) * 100) : 0;
      }),
      overallPct: overall.pct,
      masteredAll: overall.mastered,
      totalAll: overall.total
    };
  }

  function renderChart() {
    const canvas = document.getElementById("polarChart");
    if (!canvas || typeof Chart === "undefined") return;

    const cd = getChartData();
    if (!cd.labels.length) return;

    const colors = cd.labels.map((_, i) => TOPIC_COLORS[i % TOPIC_COLORS.length]);

    if (__barChart) {
      __barChart.destroy();
      __barChart = null;
    }

    // Update overall mastery header
    const hdr = document.getElementById("chartMasteryPct");
    const sub = document.getElementById("chartMasterySub");
    if (hdr) hdr.textContent = cd.overallPct + "%";
    if (sub) sub.textContent = cd.masteredAll + " / " + cd.totalAll;

    // Update background — faded flag reveal
    const bgFill = document.getElementById("chartBgFill");
    if (bgFill) {
      const card = bgFill.parentElement;
      if (card) bgFill.style.setProperty("--card-width", card.offsetWidth + "px");
      requestAnimationFrame(() => { bgFill.style.width = cd.overallPct + "%"; });
    }

    const ctx = canvas.getContext("2d");

    __barChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: cd.labels,
        datasets: [{
          data: cd.data,
          backgroundColor: colors.map(c => c + "CC"),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: 56
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        layout: {
          padding: { top: 24, bottom: 8, left: 0, right: 0 }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 25,
              font: { size: 10, family: "Plus Jakarta Sans" },
              color: "#aaa",
              callback: function (v) { return v + "%"; }
            },
            grid: {
              color: "rgba(136, 135, 128, 0.12)"
            },
            border: { display: false }
          },
          x: {
            ticks: {
              font: { size: 9, weight: "500", family: "Plus Jakarta Sans" },
              color: "#78716c",
              maxRotation: 45,
              minRotation: 25,
              autoSkip: false,
              callback: function(value) {
                if (window.innerWidth < 768) return "";
                var lbl = this.getLabelForValue(value);
                return lbl.length > 22 ? lbl.slice(0, 20) + "…" : lbl;
              }
            },
            grid: { display: false },
            border: { display: false }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.parsed.y + "% mestret";
              }
            }
          }
        }
      },
      plugins: [{
        id: "barTopLabels",
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          const meta = chart.getDatasetMeta(0);

          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.font = "700 12px 'Plus Jakarta Sans', sans-serif";

          meta.data.forEach((bar, i) => {
            const value = chart.data.datasets[0].data[i];
            const color = TOPIC_COLORS[i % TOPIC_COLORS.length];
            ctx.fillStyle = color;
            ctx.fillText(value + "%", bar.x, bar.y - 4);
          });

          ctx.restore();
        }
      }]
    });
  }

  function updateChart() {
    if (!__barChart) { renderChart(); return; }

    const cd = getChartData();

    __barChart.data.datasets[0].data = cd.data;
    __barChart.update();

    const hdr = document.getElementById("chartMasteryPct");
    const sub = document.getElementById("chartMasterySub");
    if (hdr) hdr.textContent = cd.overallPct + "%";
    if (sub) sub.textContent = cd.masteredAll + " / " + cd.totalAll;

    const bgFill = document.getElementById("chartBgFill");
    if (bgFill) {
      const card = bgFill.parentElement;
      if (card) bgFill.style.setProperty("--card-width", card.offsetWidth + "px");
      bgFill.style.width = cd.overallPct + "%";
    }
  }

  // ════════════════════════════════════════════════════════
  // 3. ADVANCED QUESTIONS — SHOW WHEN TIERS 1+2 = 100%
  // ════════════════════════════════════════════════════════

  function updateBonusSection() {
    const overall = computeOverall();
    const bonusRow = document.getElementById("bonusRow");
    if (!bonusRow) return;

    // Only show when Foundation + Extended are fully mastered
    if (overall.total > 0 && overall.mastered >= overall.total) {
      const bonus = computeBonusStats();
      const bonusCount = document.getElementById("bonusCount");
      const bonusMastered = document.getElementById("bonusMastered");
      if (bonusCount) bonusCount.textContent = bonus.total;
      if (bonusMastered) bonusMastered.textContent = bonus.mastered;
      bonusRow.style.display = "";

      // Also show Advanced in sidebar
      const advLink = document.getElementById("advancedNavLink");
      if (advLink) advLink.style.display = "";
    } else {
      bonusRow.style.display = "none";
    }
  }

  // ════════════════════════════════════════════════════════
  // 4. CELEBRATE 100% MASTERY (Foundation + Extended)
  // ════════════════════════════════════════════════════════

  function checkCelebration() {
    const overall = computeOverall();

    if (overall.total > 0 && overall.mastered >= overall.total) {
      const CELEBRATED_KEY = "cl_celebrated_100";
      const alreadyCelebrated = localStorage.getItem(CELEBRATED_KEY);

      document.body.classList.add("mastery-complete");

      if (!alreadyCelebrated) {
        localStorage.setItem(CELEBRATED_KEY, "1");
        launchConfetti();
      }
    }
  }

  function launchConfetti() {
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, {
      position: "fixed", top: "0", left: "0",
      width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "9999"
    });
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const colors = TOPIC_COLORS.slice(0, 5);
    const pieces = Array.from({ length: 200 }, () => ({
      x: Math.random() * W,
      y: -Math.random() * H * 0.5,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vy: 3 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 2 * Math.PI,
      rspeed: (Math.random() - 0.5) * 0.3
    }));

    let raf;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pieces) {
        p.x += p.vx; p.y += p.vy; p.rotation += p.rspeed;
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
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
    setTimeout(() => { cancelAnimationFrame(raf); canvas.remove(); }, 3000);
  }

  // ════════════════════════════════════════════════════════
  // 5. STUDY TIME
  // ════════════════════════════════════════════════════════

  function patchStudyTime() {
    const tmTime = document.getElementById("tmTime");
    if (!tmTime) return;

    try {
      const raw = localStorage.getItem("civicedge_stats");
      const stats = raw ? JSON.parse(raw) : {};

      const history = Array.isArray(stats.history) ? stats.history : [];
      let sessionSec = 0;
      history.forEach(s => { sessionSec += Number(s.durationSec || 0); });

      const visibleSec = Number(stats.totalVisibleSec || 0);
      const totalSec = Math.max(sessionSec, visibleSec);
      const mins = Math.round(totalSec / 60);

      const H = t("time_unit_hour", "t");
      const M = t("time_unit_minute", "m");

      if (mins >= 60) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        tmTime.textContent = `${h}${H} ${String(m).padStart(2, "0")}${M}`;
      } else {
        tmTime.textContent = `${mins}${M}`;
      }
    } catch {}
  }

  // ════════════════════════════════════════════════════════
  // 6. LIVE REFRESH
  // ════════════════════════════════════════════════════════

  function refreshAll() {
    computeAndCacheGauge();
    updateChart();
    checkCelebration();
    updateBonusSection();
    patchStudyTime();
    setTimeout(patchStatCards, 100);
  }

  function patchStatCards() {
    const bank = getBank();
    const progress = getProgress();

    let totalAttempts = 0, mastered = 0, bankNonDeep = 0;
    bank.forEach(q => {
      const tier = classifyQuestion(q);
      if (tier === "bonus") return;
      bankNonDeep++;

      const key = getProgressKey(q);
      const entry = progress[key];
      if (entry) totalAttempts += (entry.attempts || 0);
      if (isMastered(entry)) mastered++;
    });

    const tmAnswered = document.getElementById("tmAnswered");
    const tmAccuracy = document.getElementById("tmAccuracy");
    if (tmAnswered) tmAnswered.textContent = String(totalAttempts);
    if (tmAccuracy) {
      const pct = bankNonDeep > 0 ? Math.round((mastered / bankNonDeep) * 100) : 0;
      tmAccuracy.textContent = pct + "%";
    }

    // Streak
    const tmStreak = document.getElementById("tmStreak");
    if (tmStreak) {
      try {
        const raw = localStorage.getItem("civicedge_stats");
        const stats = raw ? JSON.parse(raw) : {};
        const streak = Number(stats.streakDays || 0);
        const key = streak === 1 ? "dashboard_streak_day_singular" : "dashboard_streak_day_plural";
        const tmpl = t(key, streak === 1 ? "{n} dag" : "{n} dage");
        tmStreak.textContent = tmpl.replace("{n}", streak);
      } catch {}
    }
  }

  // ════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════

  function tryInit() {
    const bank = getBank();
    if (bank.length > 0) {
      computeAndCacheGauge();
      renderChart();
      checkCelebration();
      updateBonusSection();
      patchStudyTime();
      setTimeout(patchStatCards, 200);

      window.addEventListener("civiclearn:progress-updated", refreshAll);
    } else {
      setTimeout(tryInit, 500);
    }
  }

  if (document.readyState === "complete") {
    setTimeout(tryInit, 800);
  } else {
    window.addEventListener("load", () => setTimeout(tryInit, 800));
  }

})();
