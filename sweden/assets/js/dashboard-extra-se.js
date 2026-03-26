/* ─────────────────────────────────────────────────────────
   CivicLearn Dashboard Extra — Sweden
   Vertical Bar Chart + Gauge + Celebration + Study time
   + Live updates from sequential widget
   ───────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const CACHE_KEY = "cl_gauge_cache";
  const lang = window.CIVICEDGE_LANG || "en";

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

  function getTopicKey(topic) {
    if (!topic) return "Misc";
    if (typeof topic === "object" && topic.en) return topic.en;
    if (typeof topic === "string") return topic;
    return "Misc";
  }

  function getTopicLabel(topic) {
    if (!topic) return "Misc";
    if (typeof topic === "object") return topic[lang] || topic.en || "Misc";
    return topic;
  }

  function computeTopicMastery() {
    const bank = getBank();
    const progress = getProgress();
    const topics = {};

    bank.forEach(q => {
      const key = getTopicKey(q.topic);
      const label = getTopicLabel(q.topic);
      if (!topics[key]) topics[key] = { label, total: 0, mastered: 0 };
      topics[key].total++;
    });

    bank.forEach(q => {
      const topicKey = getTopicKey(q.topic);
      const microKey = q.microtopic && typeof q.microtopic === "object"
        ? q.microtopic.en : (q.microtopic || "");
      const progKey = `${microKey}:${q.id}`;
      const entry = progress[progKey];
      if (entry && entry.correct === 1 && topics[topicKey]) {
        topics[topicKey].mastered++;
      }
    });

    return topics;
  }

  function computeOverall() {
    const topics = computeTopicMastery();
    let total = 0, mastered = 0;
    Object.values(topics).forEach(t => { total += t.total; mastered += t.mastered; });
    return { topics, total, mastered, pct: total > 0 ? Math.round((mastered / total) * 100) : 0 };
  }

  // ════════════════════════════════════════════════════════
  // 1. COMPUTE & CACHE GAUGE
  // ════════════════════════════════════════════════════════

  function computeAndCacheGauge() {
    const cfg     = window.CIVICEDGE_CONFIG || {};
    const simCfg  = cfg.simulation || {};
    const totalQ  = simCfg.questionCount || 25;
    const passScore = simCfg.passScore || 20;
    const quotas  = simCfg.topicQuotas || {};
    const topics  = computeTopicMastery();

    let estimatedCorrect = 0;
    let quotaSum = 0;

    Object.entries(quotas).forEach(([topicName, quota]) => {
      const topicData = topics[topicName];
      const rate = topicData && topicData.total > 0
        ? topicData.mastered / topicData.total : 0;
      estimatedCorrect += rate * quota;
      quotaSum += quota;
    });

    if (quotaSum < totalQ) {
      const allMastered = Object.values(topics).reduce((s, t) => s + t.mastered, 0);
      const allTotal = Object.values(topics).reduce((s, t) => s + t.total, 0);
      const globalRate = allTotal > 0 ? allMastered / allTotal : 0;
      estimatedCorrect += globalRate * (totalQ - quotaSum);
    }

    const estimated = Math.round(estimatedCorrect);
    const passed = estimated >= passScore;
    const close = estimated >= passScore - 3 && !passed;

    let state = "red";
    if (passed) state = "green";
    else if (close) state = "orange";

    let badgeText;
    if (passed) badgeText = lang === "sv" ? "Godkänd" : "Would pass";
    else if (close) badgeText = lang === "sv" ? "Nästan" : "Almost there";
    else badgeText = lang === "sv" ? "Behöver öva mer" : "Needs practice";

    const cache = { estimated, total: totalQ, passScore, state, badgeText };

    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}

    window.dispatchEvent(new CustomEvent("cl:gauge-updated"));
  }

  // ════════════════════════════════════════════════════════
  // 2. VERTICAL BAR CHART
  // ════════════════════════════════════════════════════════

  function getChartData() {
    const overall = computeOverall();
    const keys = Object.keys(overall.topics);
    return {
      keys,
      labels: keys.map(k => overall.topics[k].label),
      data: keys.map(k => {
        const t = overall.topics[k];
        return t.total > 0 ? Math.round((t.mastered / t.total) * 100) : 0;
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
      // Set card width so flag proportions stay correct
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
              callback: function(value, index) {
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
                return ctx.parsed.y + "% mastered";
              }
            }
          }
        }
      },
      plugins: [{
        // Plugin to draw percentage on top of each bar
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
  // 3. CELEBRATE 100% MASTERY
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
  // 4. PATCH STUDY TIME
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

      const H = t("time_unit_hour", "h");
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
  // 5. LIVE REFRESH
  // ════════════════════════════════════════════════════════

  function refreshAll() {
    computeAndCacheGauge();
    updateChart();
    checkCelebration();
    patchStudyTime();
    // Delay so our values override dashboard-v2-lu.js which also reacts to this event
    setTimeout(patchStatCards, 100);
  }

  function patchStatCards() {
    const progress = getProgress();
    const bank = getBank();

    let totalAttempts = 0, mastered = 0;
    bank.forEach(q => {
      const microKey = q.microtopic && typeof q.microtopic === "object"
        ? q.microtopic.en : (q.microtopic || "");
      const key = `${microKey}:${q.id}`;
      const entry = progress[key];
      if (entry) totalAttempts += (entry.attempts || 0);
      if (entry && entry.correct === 1) mastered++;
    });

    const tmAnswered = document.getElementById("tmAnswered");
    const tmAccuracy = document.getElementById("tmAccuracy");
    if (tmAnswered) tmAnswered.textContent = String(totalAttempts);
    if (tmAccuracy) {
      const pct = bank.length > 0 ? Math.round((mastered / bank.length) * 100) : 0;
      tmAccuracy.textContent = pct + "%";
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
      patchStudyTime();
      // Override stat cards after dashboard-v2-lu.js has set its values
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
