/* ─────────────────────────────────────────────────────────
   CivicLearn Dashboard Extra — Sweden (final)
   Computes estimated score → caches to localStorage
   Renders radar chart with mastery % in center
   ───────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const CACHE_KEY = "cl_gauge_cache";
  const lang = window.CIVICEDGE_LANG || "en";

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

  // ════════════════════════════════════════════════════════
  // 1. COMPUTE & CACHE ESTIMATED SCORE
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

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch {}

    // Notify the shared gauge-bar.js to re-render
    window.dispatchEvent(new CustomEvent("cl:gauge-updated"));
  }

  // ════════════════════════════════════════════════════════
  // 2. RADAR WITH CENTER MASTERY %
  // ════════════════════════════════════════════════════════

  // Chart.js plugin to draw text in the center of a radar
  const centerTextPlugin = {
    id: "radarCenterText",
    afterDraw(chart) {
      if (chart.config.type !== "radar") return;

      const meta = chart.config.options?.plugins?.radarCenterText;
      if (!meta || !meta.text) return;

      const { ctx, chartArea } = chart;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;

      // Big percentage
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.font = "800 28px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = meta.color || "#1a1816";
      ctx.fillText(meta.text, cx, cy - 6);

      // Sub label
      if (meta.sub) {
        ctx.font = "500 11px 'Plus Jakarta Sans', sans-serif";
        ctx.fillStyle = meta.subColor || "#a8a29e";
        ctx.fillText(meta.sub, cx, cy + 14);
      }

      ctx.restore();
    }
  };

  function renderRadar() {
    const canvas = document.getElementById("radarChart");
    if (!canvas || typeof Chart === "undefined") return;

    // Register plugin
    Chart.register(centerTextPlugin);

    const topics = computeTopicMastery();
    const keys = Object.keys(topics);
    if (!keys.length) return;

    const labels = keys.map(k => topics[k].label);
    const data = keys.map(k => {
      const t = topics[k];
      return t.total > 0 ? Math.round((t.mastered / t.total) * 100) : 0;
    });

    // Overall mastery for center text
    let totalAll = 0, masteredAll = 0;
    Object.values(topics).forEach(t => {
      totalAll += t.total;
      masteredAll += t.mastered;
    });
    const overallPct = totalAll > 0 ? Math.round((masteredAll / totalAll) * 100) : 0;

    const ctx = canvas.getContext("2d");

    new Chart(ctx, {
      type: "radar",
      data: {
        labels: labels,
        datasets: [{
          label: lang === "sv" ? "Behärskning" : "Mastery",
          data: data,
          backgroundColor: "rgba(13, 115, 119, 0.12)",
          borderColor: "rgba(13, 115, 119, 0.75)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(13, 115, 119, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (ctx) { return ctx.parsed.r + "%"; }
            }
          },
          radarCenterText: {
            text: overallPct + "%",
            color: "#1a1816",
            sub: masteredAll + " / " + totalAll,
            subColor: "#a8a29e"
          }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 25,
              font: { size: 10, family: "Plus Jakarta Sans" },
              backdropColor: "transparent",
              color: "#a8a29e"
            },
            grid: { color: "#e7e5e1" },
            angleLines: { color: "#e7e5e1" },
            pointLabels: {
              font: { size: 11.5, weight: "600", family: "Plus Jakarta Sans" },
              color: "#57534e"
            }
          }
        }
      }
    });
  }

  // ════════════════════════════════════════════════════════
  // 3. CELEBRATE 100% MASTERY
  // ════════════════════════════════════════════════════════

  function checkCelebration() {
    const topics = computeTopicMastery();
    let totalAll = 0, masteredAll = 0;
    Object.values(topics).forEach(t => {
      totalAll += t.total;
      masteredAll += t.mastered;
    });

    if (totalAll > 0 && masteredAll >= totalAll) {
      const CELEBRATED_KEY = "cl_celebrated_100";
      const alreadyCelebrated = localStorage.getItem(CELEBRATED_KEY);

      // Visual state — always apply when at 100%
      document.body.classList.add("mastery-complete");

      // One-time confetti
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

    const colors = ["#0d7377", "#16a34a", "#fbbf24", "#f87171", "#a78bfa"];
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
  // 4. PATCH STUDY TIME — use visibility-based timer
  // ════════════════════════════════════════════════════════

  function patchStudyTime() {
    const tmTime = document.getElementById("tmTime");
    if (!tmTime) return;

    try {
      const raw = localStorage.getItem("civicedge_stats");
      const stats = raw ? JSON.parse(raw) : {};

      // Session-based time
      const history = Array.isArray(stats.history) ? stats.history : [];
      let sessionSec = 0;
      history.forEach(s => { sessionSec += Number(s.durationSec || 0); });

      // Visibility-based time (from study-timer.js)
      const visibleSec = Number(stats.totalVisibleSec || 0);

      // Use whichever is larger (visibility timer is more accurate)
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
  // INIT
  // ════════════════════════════════════════════════════════

  function tryInit() {
    const bank = getBank();
    if (bank.length > 0) {
      computeAndCacheGauge();
      renderRadar();
      checkCelebration();
      patchStudyTime();
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
