/* ──────────────────────────────────────────────────────
   CivicLearn — Slovak Dual Sidebar Gauges

   Reads two localStorage caches:
     cl_gauge_cache       → Knowledge gauge (written by
                            dashboard-extra-sk.js from MCQ mastery)
     cl_language_cache    → Language gauge (written by index.html
                            and article.html from sk_article_attempts)

   Renders a small colored status badge under each gauge
   ("Pripravený" / "Takmer" / "Treba cvičiť") so the bar colors
   and the pass-marker tick are self-explanatory without a
   separate legend.

   Public API (for dashboard + article pages to call):
     window.CLSKGauge.refresh()
     window.CLSKGauge.updateLanguage(score0to100, attemptsCount)
   ────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const KNOWLEDGE_CACHE = "cl_gauge_cache";
  const LANGUAGE_CACHE  = "cl_language_cache";
  const PASS_THRESHOLD  = 75;
  const CLOSE_THRESHOLD = 50;

  const STATE_COLORS = {
    green:  "#16a34a",
    orange: "#d97706",
    red:    "#dc2626"
  };

  const BADGE_TEXT = {
    green:  "Pripravený",
    orange: "Takmer",
    red:    "Treba cvičiť"
  };

  // ---------- One-time: inject badge styles ----------
  function ensureStyles() {
    if (document.getElementById("cl-gauge-badge-styles")) return;
    const s = document.createElement("style");
    s.id = "cl-gauge-badge-styles";
    s.textContent = `
      .sidebar-gauge-badge {
        display: inline-block;
        margin-top: 6px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.01em;
        line-height: 1.4;
        background: transparent;
        color: #94a3b8;
        transition: color 0.2s, background 0.2s;
      }
      .sidebar-gauge-badge[data-state="green"]  { color: #16a34a; background: rgba(22,163,74,0.12); }
      .sidebar-gauge-badge[data-state="orange"] { color: #d97706; background: rgba(217,119,6,0.12); }
      .sidebar-gauge-badge[data-state="red"]    { color: #dc2626; background: rgba(220,38,38,0.12); }
      .sidebar-gauge-badge[data-state=""]       { display: none; }
    `;
    document.head.appendChild(s);
  }

  // ---------- Badge element helpers ----------
  function ensureBadge(fillEl, badgeId) {
    let badge = document.getElementById(badgeId);
    if (badge) return badge;
    const gauge = fillEl.closest(".sidebar-gauge");
    if (!gauge) return null;
    badge = document.createElement("div");
    badge.className = "sidebar-gauge-badge";
    badge.id = badgeId;
    badge.dataset.state = "";
    gauge.appendChild(badge);
    return badge;
  }

  function applyBadge(badge, state, text) {
    if (!badge) return;
    badge.dataset.state = state || "";
    badge.textContent = text || "";
  }

  function stateForPct(pct) {
    if (pct >= PASS_THRESHOLD) return "green";
    if (pct >= CLOSE_THRESHOLD) return "orange";
    return "red";
  }

  function colorForState(state) {
    return STATE_COLORS[state] || STATE_COLORS.red;
  }

  // ---------- Knowledge gauge (MCQ mastery) ----------
  function renderKnowledge() {
    const score = document.getElementById("clGaugeKnowledge");
    const fill  = document.getElementById("clGaugeKnowledgeFill");
    const pass  = document.getElementById("clGaugeKnowledgePass");
    if (!score || !fill) return;

    const badge = ensureBadge(fill, "clGaugeKnowledgeBadge");

    let data = null;
    try { data = JSON.parse(localStorage.getItem(KNOWLEDGE_CACHE)); } catch {}

    if (!data || !data.total) {
      score.textContent = "–";
      fill.style.width = "0%";
      applyBadge(badge, "", "");
      return;
    }

    const pct = Math.max(0, Math.min(100, (data.estimated / data.total) * 100));
    // Prefer the richer state/badge computed by dashboard-extra-sk.js
    // (it uses passScore ± 3, not the 50/75 percent bands). Fall back
    // to percent-band logic if those fields are absent.
    const state = data.state || stateForPct(pct);
    const text  = data.badgeText || BADGE_TEXT[state];

    fill.style.width = pct + "%";
    fill.style.background = colorForState(state);
    score.textContent = data.estimated + " / " + data.total;

    if (pass && data.passScore && data.total) {
      pass.style.left = ((data.passScore / data.total) * 100) + "%";
    }

    applyBadge(badge, state, text);
  }

  // ---------- Language gauge (article summary grades) ----------
  function renderLanguage() {
    const score = document.getElementById("clGaugeLanguage");
    const fill  = document.getElementById("clGaugeLanguageFill");
    const pass  = document.getElementById("clGaugeLanguagePass");
    if (!score || !fill) return;

    const badge = ensureBadge(fill, "clGaugeLanguageBadge");

    let data = null;
    try { data = JSON.parse(localStorage.getItem(LANGUAGE_CACHE)); } catch {}

    if (!data || !data.attemptsCount) {
      score.textContent = "–";
      fill.style.width = "0%";
      applyBadge(badge, "", "");
      return;
    }

    const pct = Math.max(0, Math.min(100, data.score));
    const state = stateForPct(pct);

    fill.style.width = pct + "%";
    fill.style.background = colorForState(state);
    score.textContent = pct + "%";

    if (pass) pass.style.left = PASS_THRESHOLD + "%";

    applyBadge(badge, state, BADGE_TEXT[state]);
  }

  function render() {
    ensureStyles();
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
      ensureStyles();
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
