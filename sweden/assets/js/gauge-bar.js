/* ──────────────────────────────────────────────────────
   CivicLearn — Shared Gauge Bar (all pages)
   Reads from localStorage cache. Dashboard writes cache.
   ────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const CACHE_KEY = "cl_gauge_cache";
  const lang = window.CIVICEDGE_LANG || "en";

  function render() {
    const fill  = document.getElementById("clGaugeFill");
    const pass  = document.getElementById("clGaugePass");
    const score = document.getElementById("clGaugeScore");
    const badge = document.getElementById("clGaugeBadge");

    if (!fill || !pass || !score || !badge) return;

    let data;
    try { data = JSON.parse(localStorage.getItem(CACHE_KEY)); }
    catch { data = null; }

    if (!data) {
      // No cache yet — hide or show defaults
      score.textContent = "–";
      badge.textContent = "";
      badge.removeAttribute("data-state");
      return;
    }

    const pct = Math.min(100, (data.estimated / data.total) * 100);
    const passPct = (data.passScore / data.total) * 100;

    fill.style.width = pct + "%";
    fill.setAttribute("data-state", data.state);

    pass.style.left = passPct + "%";

    score.textContent = data.estimated + " / " + data.total;

    badge.textContent = data.badgeText;
    badge.setAttribute("data-state",
      data.state === "green" ? "pass" :
      data.state === "orange" ? "close" : "fail"
    );
  }

  // Run on load, and listen for updates from dashboard
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  // Dashboard dispatches this event after computing the score
  window.addEventListener("cl:gauge-updated", render);
})();
