/* ──────────────────────────────────────────────────────
   CivicLearn — Slovak Dual Sidebar Gauges

   Reads two localStorage caches:
     cl_gauge_cache       → Knowledge gauge (written by
                            dashboard-extra-sk.js from MCQ mastery)
     cl_language_cache    → Language gauge (written by index.html
                            and article.html from sk_article_attempts)

   Public API (for dashboard + article pages to call):
     window.CLSKGauge.refresh()
     window.CLSKGauge.updateLanguage(score0to100, attemptsCount)
   ────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const KNOWLEDGE_CACHE = "cl_gauge_cache";
  const LANGUAGE_CACHE  = "cl_language_cache";
  const PASS_THRESHOLD  = 75;

  function colorForPct(pct) {
    if (pct >= PASS_THRESHOLD) return "#16a34a"; // green
    if (pct >= 50)             return "#d97706"; // amber
    return "#dc2626";                            // red
  }

  // ---------- Knowledge gauge (MCQ mastery) ----------
  function renderKnowledge() {
    const score = document.getElementById("clGaugeKnowledge");
    const fill  = document.getElementById("clGaugeKnowledgeFill");
    const pass  = document.getElementById("clGaugeKnowledgePass");
    if (!score || !fill) return;

    let data = null;
    try { data = JSON.parse(localStorage.getItem(KNOWLEDGE_CACHE)); } catch {}

    if (!data || !data.total) {
      score.textContent = "–";
      fill.style.width = "0%";
      return;
    }

    const pct = Math.max(0, Math.min(100, (data.estimated / data.total) * 100));
    fill.style.width = pct + "%";
    fill.style.background = colorForPct(pct);
    score.textContent = data.estimated + " / " + data.total;

    if (pass && data.passScore) {
      pass.style.left = ((data.passScore / data.total) * 100) + "%";
    }
  }

  // ---------- Language gauge (article summary grades) ----------
  function renderLanguage() {
    const score = document.getElementById("clGaugeLanguage");
    const fill  = document.getElementById("clGaugeLanguageFill");
    const pass  = document.getElementById("clGaugeLanguagePass");
    if (!score || !fill) return;

    let data = null;
    try { data = JSON.parse(localStorage.getItem(LANGUAGE_CACHE)); } catch {}

    if (!data || !data.attemptsCount) {
      score.textContent = "–";
      fill.style.width = "0%";
      return;
    }

    const pct = Math.max(0, Math.min(100, data.score));
    fill.style.width = pct + "%";
    fill.style.background = colorForPct(pct);
    score.textContent = pct + "%";

    if (pass) pass.style.left = PASS_THRESHOLD + "%";
  }

  function render() {
    renderKnowledge();
    renderLanguage();
  }

  // ---------- Public API ----------
  window.CLSKGauge = {
    refresh: render,

    /**
     * Called from dashboard (when user's attempts are fetched)
     * and from article.html (after an eval completes).
     * score: 0–100 (derived from average Slovak grade 1–5)
     * attemptsCount: how many attempts the avg is based on
     */
    updateLanguage(score, attemptsCount) {
      try {
        localStorage.setItem(LANGUAGE_CACHE, JSON.stringify({
          score: Math.round(score),
          attemptsCount: attemptsCount,
          updated: Date.now()
        }));
      } catch {}
      renderLanguage();
    }
  };

  // ---------- Init ----------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  window.addEventListener("cl:gauge-updated", render);
})();
