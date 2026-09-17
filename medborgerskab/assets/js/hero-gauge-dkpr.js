/* ──────────────────────────────────────────────────────
   CivicLearn — Dashboard hero gauge (Denmark-PR — medborgerskabsprøven)

   Draws the estimated-score ring inside the first stat
   card. Reads the same "cl_gauge_cache" that the sidebar
   gauge uses; dashboard-extra-dkpr.js writes it and fires
   "cl:gauge-updated" when it changes.

   The arc is filled with the Dannebrog colours
   (red → white → red), so a full ring = a full flag.
   ────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const CACHE_KEY = "cl_gauge_cache";
  const R = 54;                      // ring radius in viewBox units
  const C = Math.PI * R;             // length of the half-circle arc
  const GRAD = "clHeroGrad";

  function markup() {
    return (
      '<svg class="hero-ring" width="118" height="72" viewBox="0 0 130 78" aria-hidden="true">' +
        '<defs><linearGradient id="' + GRAD + '" x1="0" y1="0" x2="1" y2="0">' +
          '<stop offset="0%"   stop-color="#C8102E"/>' +
          '<stop offset="38%"  stop-color="#C8102E"/>' +
          '<stop offset="50%"  stop-color="#FFFFFF"/>' +
          '<stop offset="62%"  stop-color="#C8102E"/>' +
          '<stop offset="100%" stop-color="#C8102E"/>' +
        '</linearGradient></defs>' +
        '<path d="M11 68 A54 54 0 0 1 119 68" fill="none" stroke="rgba(255,255,255,.18)" ' +
              'stroke-width="11" stroke-linecap="round"/>' +
        '<path id="clHeroArc" d="M11 68 A54 54 0 0 1 119 68" fill="none" ' +
              'stroke="url(#' + GRAD + ')" stroke-width="11" stroke-linecap="round" ' +
              'stroke-dasharray="' + C + ' ' + C + '" stroke-dashoffset="' + C + '"/>' +
        '<text id="clHeroScore" class="hero-ring-score" x="65" y="59" text-anchor="middle">–</text>' +
        '<text id="clHeroTotal" class="hero-ring-total" x="65" y="74" text-anchor="middle"></text>' +
      '</svg>'
    );
  }

  function mount() {
    const slot = document.getElementById("heroRingSlot");
    if (slot && !slot.firstChild) slot.innerHTML = markup();
  }

  function render() {
    mount();

    const arc   = document.getElementById("clHeroArc");
    const score = document.getElementById("clHeroScore");
    const total = document.getElementById("clHeroTotal");
    const badge = document.getElementById("heroGaugeBadge");
    if (!arc || !score || !total) return;

    let data;
    try { data = JSON.parse(localStorage.getItem(CACHE_KEY)); }
    catch { data = null; }

    if (!data) {
      arc.style.strokeDashoffset = C;
      score.textContent = "–";
      total.textContent = "";
      if (badge) { badge.textContent = ""; badge.removeAttribute("data-state"); }
      return;
    }

    const pct = Math.max(0, Math.min(1, data.estimated / data.total));

    // rAF so the dash offset animates from empty on first paint
    requestAnimationFrame(function () {
      arc.style.strokeDashoffset = C * (1 - pct);
    });

    score.textContent = data.estimated;
    total.textContent = "/ " + data.total;

    if (badge) {
      badge.textContent = data.badgeText || "";
      badge.setAttribute("data-state",
        data.state === "green"  ? "pass"  :
        data.state === "orange" ? "close" : "fail"
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", render);
  } else {
    render();
  }

  window.addEventListener("cl:gauge-updated", render);
})();
