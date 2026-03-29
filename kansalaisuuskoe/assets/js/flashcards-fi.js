/* ---------------------------------------------------------
   CivicLearn Flashcards — Finland (v2, clean)
   --------------------------------------------------------- */

(function () {
  "use strict";

  // ── DOM ──
  const topicContainer = document.getElementById("topicContainer");
  const startBtn       = document.getElementById("startBtn");
  const card           = document.getElementById("card");
  const qText          = document.getElementById("qText");
  const aText          = document.getElementById("aText");
  const flipBtn        = document.getElementById("flipBtn");
  const knownBtn       = document.getElementById("knownBtn");
  const againBtn       = document.getElementById("againBtn");
  const prevBtn        = document.getElementById("fcPrev");
  const nextBtn        = document.getElementById("fcNext");
  const statusEl       = document.getElementById("status");

  // ── State ──
  let bank = [];
  let filtered = [];
  let index = 0;
  let selectedKeys = new Set();

  // ── Helpers ──
  function lang() { return window.CIVICEDGE_LANG || "en"; }

  function canonical(q) {
    if (!q || !q.topic) return "";
    return (typeof q.topic === "object") ? (q.topic.en || "") : String(q.topic);
  }

  function display(q) {
    if (!q || !q.topic) return "";
    if (typeof q.topic === "object") return q.topic[lang()] || q.topic.en || "";
    return String(q.topic);
  }

  function questionText(q) {
    if (!q || !q.q) return "";
    return (typeof q.q === "object") ? (q.q[lang()] || q.q.en || "") : String(q.q);
  }

  function correctAnswer(q) {
    if (!q || !q.options || typeof q.correctIndex !== "number") return "";
    const opts = (typeof q.options === "object" && !Array.isArray(q.options))
      ? (q.options[lang()] || q.options.en || [])
      : q.options;
    return opts[q.correctIndex] || "";
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function t(key, fallback) {
    const i18n = window.CivicLearnI18n;
    if (i18n && typeof i18n.t === "function") return i18n.t(key, fallback);
    return fallback || key;
  }

  function readProgress() {
    try { return JSON.parse(localStorage.getItem("civicedge_progress")) || {}; }
    catch { return {}; }
  }

  // ── Placeholder ──
  function setPlaceholder(on) {
    if (!card) return;
    if (on) {
      card.classList.add("placeholder");
    } else {
      card.classList.remove("placeholder");
    }
  }

  // ── Weak topics ──
  function computeWeakTopics() {
    const progress = readProgress();
    const totals = {};
    const mastered = {};

    bank.forEach(q => {
      const topicKey = canonical(q);
      if (!topicKey) return;
      totals[topicKey] = (totals[topicKey] || 0) + 1;

      // Progress key uses microtopic:id
      const microKey = q.microtopic && typeof q.microtopic === "object"
        ? q.microtopic.en : (q.microtopic || "");
      const pKey = `${microKey}:${q.id}`;
      const entry = progress[pKey];
      if (entry && entry.correct === 1) {
        mastered[topicKey] = (mastered[topicKey] || 0) + 1;
      }
    });

    const weak = new Set();
    Object.keys(totals).forEach(c => {
      if ((mastered[c] || 0) < totals[c]) weak.add(c);
    });
    return weak;
  }

  // ── Load bank ──
  async function loadBank() {
    const cfg = window.CIVICEDGE_CONFIG;
    const path = cfg && cfg.bank && cfg.bank.path;
    if (!path) {
      console.error("[Flashcards] Missing bank.path in config");
      return;
    }

    try {
      console.log("[Flashcards] Loading bank from:", path);
      const res = await fetch(path);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const raw = await res.json();
      bank = Array.isArray(raw) ? raw : (raw.questions || []);
      console.log("[Flashcards] Bank loaded:", bank.length, "questions");
    } catch (e) {
      console.error("[Flashcards] Failed to load bank:", e);
      bank = [];
    }
  }

  // ── Render topic chips ──
  function renderChips() {
    if (!topicContainer) return;
    topicContainer.innerHTML = "";
    selectedKeys.clear();

    const weakMode = document.getElementById("fcWeakTopics")?.classList.contains("active");
    const weakSet = weakMode ? computeWeakTopics() : null;

    // Collect unique microtopics from bank
    const seen = new Map();
    bank.forEach(q => {
      const c = canonical(q);
      if (!c || seen.has(c)) return;
      if (weakSet && !weakSet.has(c)) return;
      seen.set(c, display(q));
    });

    if (seen.size === 0) {
      const msg = document.createElement("div");
      msg.className = "muted";
      msg.textContent = t("flashcards_all_mastered", "All topics are mastered");
      topicContainer.appendChild(msg);
      return;
    }

    console.log("[Flashcards] Rendering", seen.size, "topic chips");

    seen.forEach((label, key) => {
      const chip = document.createElement("button");
      chip.className = "topic-chip";
      chip.dataset.key = key;
      chip.textContent = label;

      chip.addEventListener("click", () => {
        const isSelected = chip.classList.toggle("selected");
        if (isSelected) {
          selectedKeys.add(key);
        } else {
          selectedKeys.delete(key);
        }
        console.log("[Flashcards] Selected:", [...selectedKeys]);
      });

      topicContainer.appendChild(chip);
    });
  }

  // ── Build filtered set ──
  function buildFiltered() {
    filtered = bank.filter(q => selectedKeys.has(canonical(q)));
    shuffle(filtered);
    index = 0;
    console.log("[Flashcards] Filtered:", filtered.length, "cards from", selectedKeys.size, "topics");
  }

  // ── Render card ──
  function renderCard() {
    if (!filtered.length) {
      if (qText) qText.textContent = "";
      if (aText) aText.textContent = "";
      if (statusEl) statusEl.textContent = "";
      setPlaceholder(true);
      return;
    }

    const q = filtered[index];
    if (!q) return;

    if (qText) qText.textContent = questionText(q);
    if (aText) aText.textContent = correctAnswer(q);
    if (statusEl) statusEl.textContent = `${index + 1} / ${filtered.length}`;

    setPlaceholder(false);
    if (card) card.classList.remove("flipped");
  }

  // ── Smooth card transition helper ──
  function transitionCard(fn) {
    if (!card) { fn(); return; }
    card.classList.add("no-transition");
    card.classList.remove("flipped");
    void card.offsetWidth;
    requestAnimationFrame(() => {
      card.classList.remove("no-transition");
      fn();
    });
  }

  // ── Navigation ──
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      index = index > 0 ? index - 1 : filtered.length - 1;
      transitionCard(renderCard);
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      index = index < filtered.length - 1 ? index + 1 : 0;
      transitionCard(renderCard);
    });
  }

  // ── Actions ──
  if (flipBtn) {
    flipBtn.addEventListener("click", () => {
      if (!filtered.length || !card) return;
      card.classList.toggle("flipped");
    });
  }

  if (knownBtn) {
    knownBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      filtered.splice(index, 1);
      if (index >= filtered.length) index = Math.max(0, filtered.length - 1);

      if (!filtered.length) {
        if (qText) qText.textContent = "";
        if (aText) aText.textContent = "";
        if (statusEl) statusEl.textContent = t("flashcards_mastered", "Set mastered!");
        setPlaceholder(true);
        return;
      }

      transitionCard(renderCard);
    });
  }

  if (againBtn) {
    againBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      const current = filtered.splice(index, 1)[0];
      filtered.push(current);
      if (index >= filtered.length) index = Math.max(0, filtered.length - 1);
      transitionCard(renderCard);
    });
  }

  // ── Start button ──
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (selectedKeys.size === 0) {
        console.warn("[Flashcards] No topics selected");
        return;
      }
      buildFiltered();
      renderCard();
    });
  }

  // ── All / Weak toggle ──
  const allBtn = document.getElementById("fcAllTopics");
  const weakBtn = document.getElementById("fcWeakTopics");

  if (allBtn && weakBtn) {
    allBtn.addEventListener("click", () => {
      allBtn.classList.add("active");
      weakBtn.classList.remove("active");
      renderChips();
    });

    weakBtn.addEventListener("click", () => {
      weakBtn.classList.add("active");
      allBtn.classList.remove("active");
      renderChips();
    });
  }

  // ── Init ──
  async function init() {
    console.log("[Flashcards] Initializing...");
    setPlaceholder(true);
    await loadBank();
    renderChips();
    console.log("[Flashcards] Ready");
  }

  init();

})();
