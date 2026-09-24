/* ──────────────────────────────────────────────────────
   CivicLearn — Quiz progress bar (Luxembourg)

   The quiz body is rendered by engine-lu.js, which this file
   does not touch. It watches the question-counter element the
   engine writes (".ce-q-meta", e.g. "Question 15 / 40") and
   draws a thin progress bar above the card.

   Entirely defensive: if the counter is missing, or its text
   does not contain an "n / m" pair, the bar stays hidden and
   nothing else changes.
   ────────────────────────────────────────────────────── */

(function () {
  "use strict";

  const HOST_ID = "qzProgress";
  let bar = null;

  function ensureBar(card) {
    if (bar && bar.isConnected) return bar;
    bar = document.getElementById(HOST_ID);
    if (bar) return bar;

    bar = document.createElement("div");
    bar.id = HOST_ID;
    bar.className = "qz-progress";
    bar.hidden = true;
    bar.innerHTML = "<i></i>";
    card.parentNode.insertBefore(bar, card);
    return bar;
  }

  // "Question 15 / 40", "15/40", "Fråg 15 vun 40" — take the first
  // two numbers we find and treat them as current / total.
  function parseCounter(text) {
    const nums = (text || "").match(/\d+/g);
    if (!nums || nums.length < 2) return null;
    const cur = parseInt(nums[0], 10);
    const total = parseInt(nums[1], 10);
    if (!total || total <= 0 || cur < 0 || cur > total) return null;
    return { cur: cur, total: total };
  }

  function update() {
    const card = document.querySelector(".ce-card");
    if (!card) return;

    const el = ensureBar(card);
    const meta = document.querySelector(".ce-q-meta");
    const parsed = meta ? parseCounter(meta.textContent) : null;

    if (!parsed) { el.hidden = true; return; }

    el.hidden = false;
    el.firstChild.style.width = (parsed.cur / parsed.total) * 100 + "%";
  }

  function start() {
    const area = document.getElementById("quizArea") || document.body;
    update();
    new MutationObserver(update).observe(area, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
