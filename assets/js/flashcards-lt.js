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

  function getTopicLT(q) {
    if (!q || !q.topic) return "";
    if (typeof q.topic === "object") return q.topic.lt || "";
    return q.topic;
  }

  function getTopicDisplay(q) {
    if (!q || !q.topic) return "";
    if (typeof q.topic === "object") {
      const lang = getLang();
      return q.topic[lang] || q.topic.lt || "";
    }
    return q.topic;
  }

  function getQuestionText(q) {
    if (!q.q) return "";
    if (typeof q.q === "object") {
      const lang = getLang();
      return q.q[lang] || q.q.lt || q.q.en || "";
    }
    return q.q;
  }

  function getCorrectAnswer(q) {
    if (!q.options || typeof q.correctIndex !== "number") return "";
    const lang = getLang();
    const opts = q.options[lang] || q.options.lt || q.options.en || [];
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
    const cfg = window.CIVICEDGE_CONFIG;
    if (!cfg?.topics?.list) return;

    topicContainer.innerHTML = "";

    cfg.topics.list.forEach(canonical => {
      const chip = document.createElement("button");
      chip.className = "topic-chip";
      chip.dataset.key = canonical;

      // Find display label from BANK
      let display = canonical;
      for (const q of bank) {
        if (getTopicLT(q) === canonical) {
          display = getTopicDisplay(q);
          break;
        }
      }

      chip.textContent = display;

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
      selectedNorm.includes(normalize(getTopicLT(q)))
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
  async function init() {
    setPlaceholder(true);
    await loadBank();
    renderTopicChips();
  }

  init();

})();
