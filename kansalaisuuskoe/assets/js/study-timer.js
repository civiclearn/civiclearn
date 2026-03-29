/* ────────────────────────────────────────────────────────
   CivicLearn — Visibility-based Study Time Tracker
   Include on every page. Counts seconds the page is visible.
   Writes to civicedge_stats.totalVisibleSec in localStorage.
   ──────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const KEY = "civicedge_stats";
  const INTERVAL = 15; // seconds between writes

  let accumulated = 0;
  let lastTick = null;
  let timer = null;

  function isVisible() {
    return document.visibilityState === "visible";
  }

  function tick() {
    if (!isVisible() || !lastTick) return;

    const now = Date.now();
    const delta = Math.round((now - lastTick) / 1000);
    lastTick = now;

    // Cap at 2x interval to ignore sleep/suspend gaps
    if (delta > 0 && delta < INTERVAL * 2) {
      accumulated += delta;
    }

    // Flush to localStorage periodically
    if (accumulated >= INTERVAL) {
      flush();
    }
  }

  function flush() {
    if (accumulated <= 0) return;
    try {
      const raw = localStorage.getItem(KEY);
      const stats = raw ? JSON.parse(raw) : { history: [] };
      stats.totalVisibleSec = (stats.totalVisibleSec || 0) + accumulated;
      localStorage.setItem(KEY, JSON.stringify(stats));
    } catch {}
    accumulated = 0;
  }

  function start() {
    lastTick = Date.now();
    if (!timer) {
      timer = setInterval(tick, INTERVAL * 1000);
    }
  }

  function stop() {
    tick(); // capture remaining time
    flush();
    lastTick = null;
  }

  // Visibility change handler
  document.addEventListener("visibilitychange", () => {
    if (isVisible()) {
      start();
    } else {
      stop();
    }
  });

  // Flush on unload
  window.addEventListener("beforeunload", () => {
    tick();
    flush();
  });

  // Start if page is already visible
  if (isVisible()) {
    start();
  }
})();
