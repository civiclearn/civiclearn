/* ──────────────────────────────────────────────────────
   CivicLearn — Sidebar Gauge (all pages)
   Reads estimated score from localStorage cache.
   Dashboard-extra-se.js writes the cache.
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  window.addEventListener("cl:gauge-updated", render);
})();
