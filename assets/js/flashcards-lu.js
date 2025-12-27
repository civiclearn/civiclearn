/* ---------------------------------------------------------
   CivicEdge Flashcards — multilingual topics, canonical-safe
   --------------------------------------------------------- */

(function () {

  // -------------------------------------------------------
  // 1. DOM references
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // 2. State
  // -------------------------------------------------------
  let bank = [];
  let filtered = [];
  let index = 0;
  let selectedCanonicals = [];

  // -------------------------------------------------------
  // 3. Helpers
  // -------------------------------------------------------
  function getLang() {
    return window.CIVICEDGE_LANG || "en";
  }

  function normalize(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

function getMicrotopicCanonical(q) {
  if (!q || !q.microtopic) return "";
  if (typeof q.microtopic === "object") return q.microtopic.en || "";
  return q.microtopic;
}

function getMicrotopicDisplay(q) {
  if (!q || !q.microtopic) return "";
  if (typeof q.microtopic === "object") {
    const lang = getLang();
    return q.microtopic[lang] || q.microtopic.en || "";
  }
  return q.microtopic;
}



  function getQuestionText(q) {
  if (!q.q) return "";
  if (typeof q.q === "object") {
    const lang = getLang();
    return q.q[lang] || q.q.en || "";
  }
  return q.q;
}

function readProgress() {
  try {
    return JSON.parse(localStorage.getItem("civicedge_progress")) || {};
  } catch {
    return {};
  }
}

function computeWeakMicrotopics() {
  const progress = readProgress();
  const totals = {};
  const mastered = {};

  bank.forEach(q => {
    const canon = getMicrotopicCanonical(q);
    if (!canon) return;
    totals[canon] = (totals[canon] || 0) + 1;
  });

  Object.entries(progress).forEach(([key, entry]) => {
    if (!entry || entry.correct !== 1) return;
    const canon = key.split(":")[0];
    mastered[canon] = (mastered[canon] || 0) + 1;
  });

  const weak = new Set();
  Object.keys(totals).forEach(canon => {
    if ((mastered[canon] || 0) < totals[canon]) {
      weak.add(canon);
    }
  });

  return weak;
}


  function getCorrectAnswer(q) {
  if (!q.options || typeof q.correctIndex !== "number") return "";
  const lang = getLang();
  const opts = q.options[lang] || q.options.en || [];
  return opts[q.correctIndex] || "";
}


  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  function showFront() {
    card.classList.remove("flipped");
  }

  function showBack() {
    card.classList.add("flipped");
  }

  function setPlaceholder(on) {
    if (!card) return;

    let img = "";
    try {
      img = window?.CIVICEDGE_CONFIG?.flashcards?.placeholder || "";
    } catch {}

    if (on) {
      card.classList.add("placeholder");
      card.style.backgroundImage = img ? `url("${img}")` : "none";
    } else {
      card.classList.remove("placeholder");
      card.style.backgroundImage = "none";
    }
  }

  // -------------------------------------------------------
  // 4. Load bank
  // -------------------------------------------------------
  async function loadBank() {
    const cfg = window.CIVICEDGE_CONFIG;
    if (!cfg?.bank?.path) {
      console.error("Missing bank.path for flashcards");
      return;
    }

    try {
      const res = await fetch(cfg.bank.path);
      const raw = await res.json();
      bank = Array.isArray(raw) ? raw : (raw.questions || []);
    } catch (e) {
      console.error("Failed to load flashcards bank", e);
      bank = [];
    }
  }

  // -------------------------------------------------------
  // 5. Topic chips (BANK-driven labels)
  // -------------------------------------------------------
function renderTopicChips() {
  topicContainer.innerHTML = "";

const weakMode = document
  .getElementById("fcWeakTopics")
  ?.classList.contains("active");

const weakSet = weakMode ? computeWeakMicrotopics() : null;

  const seen = new Map();

  bank.forEach(q => {
    const canon = getMicrotopicCanonical(q);
    if (!canon || seen.has(canon)) return;

    if (weakSet && !weakSet.has(canon)) return;

    seen.set(canon, getMicrotopicDisplay(q));
  });

  if (seen.size === 0) {
    const msg = document.createElement("div");
    msg.className = "muted";
    msg.textContent =
      window.CivicLearnI18n?.t?.("flashcards_all_mastered")
      || "All topics are mastered";
    topicContainer.appendChild(msg);
    return;
  }


  seen.forEach((label, canon) => {
    const chip = document.createElement("button");
    chip.className = "topic-chip";
    chip.dataset.key = canon;
    chip.textContent = label;

    chip.addEventListener("click", () => {
      chip.classList.toggle("selected");
      collectSelected();
    });

    topicContainer.appendChild(chip);
  });
}



  function collectSelected() {
    selectedCanonicals = [...document.querySelectorAll(".topic-chip.selected")]
      .map(btn => btn.dataset.key);
  }

  // -------------------------------------------------------
  // 6. Filter bank (CANONICAL ONLY)
  // -------------------------------------------------------
  function buildFilteredSet() {
    const selectedNorm = selectedCanonicals.map(normalize);

   filtered = bank.filter(q =>
  selectedNorm.includes(normalize(getMicrotopicCanonical(q)))
);


    shuffle(filtered);
    index = 0;
  }

  // -------------------------------------------------------
  // 7. Render card
  // -------------------------------------------------------
  function renderCard() {
    if (!filtered.length) {
      qText.textContent = "";
      aText.textContent = "";
      statusEl.textContent = "";
      setPlaceholder(true);
      showFront();
      return;
    }

    const q = filtered[index];
    if (!q) return;

    qText.textContent = getQuestionText(q);
    aText.textContent = getCorrectAnswer(q);

    statusEl.textContent = `${index + 1} / ${filtered.length}`;
    setPlaceholder(false);
    showFront();
  }

  // -------------------------------------------------------
  // 8. Navigation
  // -------------------------------------------------------
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      index = index > 0 ? index - 1 : filtered.length - 1;
      card.classList.add("no-transition");
      card.classList.remove("flipped");
      void card.offsetWidth;
      requestAnimationFrame(() => {
        card.classList.remove("no-transition");
        renderCard();
      });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      index = index < filtered.length - 1 ? index + 1 : 0;
      card.classList.add("no-transition");
      card.classList.remove("flipped");
      void card.offsetWidth;
      requestAnimationFrame(() => {
        card.classList.remove("no-transition");
        renderCard();
      });
    });
  }

  // -------------------------------------------------------
  // 9. Actions
  // -------------------------------------------------------
  if (flipBtn) {
    flipBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      card.classList.contains("flipped") ? showFront() : showBack();
    });
  }

  if (knownBtn) {
    knownBtn.addEventListener("click", () => {
      if (!filtered.length) return;

      filtered.splice(index, 1);
      if (index >= filtered.length) index = filtered.length - 1;
      if (index < 0) index = 0;

      if (!filtered.length) {
        qText.textContent = "";
        aText.textContent = "";
        statusEl.textContent =
          window.CivicLearnI18n?.t?.("flashcards_mastered") || "Ensemble maîtrisé";
        setPlaceholder(true);
        showFront();
        return;
      }

      card.classList.add("no-transition");
      card.classList.remove("flipped");
      void card.offsetWidth;
      requestAnimationFrame(() => {
        card.classList.remove("no-transition");
        renderCard();
      });
    });
  }

  if (againBtn) {
    againBtn.addEventListener("click", () => {
      if (!filtered.length) return;

      const current = filtered.splice(index, 1)[0];
      filtered.push(current);
      if (index >= filtered.length) index = filtered.length - 1;

      card.classList.add("no-transition");
      card.classList.remove("flipped");
      void card.offsetWidth;
      requestAnimationFrame(() => {
        card.classList.remove("no-transition");
        renderCard();
      });
    });
  }

  // -------------------------------------------------------
  // 10. Start
  // -------------------------------------------------------
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      collectSelected();
      buildFilteredSet();
      renderCard();
    });
  }

  // -------------------------------------------------------
  // 11. Init
  // -------------------------------------------------------
const allBtn = document.getElementById("fcAllTopics");
const weakBtn = document.getElementById("fcWeakTopics");

if (allBtn && weakBtn) {
  allBtn.addEventListener("click", () => {
    allBtn.classList.add("active");
    weakBtn.classList.remove("active");
    selectedCanonicals = [];
    renderTopicChips();
  });

  weakBtn.addEventListener("click", () => {
    weakBtn.classList.add("active");
    allBtn.classList.remove("active");
    selectedCanonicals = [];
    renderTopicChips();
  });
}


  async function init() {
    setPlaceholder(true);
    await loadBank();
    renderTopicChips();
  }

  init();

})();
