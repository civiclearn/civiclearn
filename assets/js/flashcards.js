/* ---------------------------------------------------------
   CivicEdge Flashcards v4 — config + i18n compatible, stable
   --------------------------------------------------------- */

(function () {

  // -------------------------------------------------------
  // 2. DOM references
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
  // 3. State
  // -------------------------------------------------------
  // Accent-insensitive normalization
function normalizeTopic(str) {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .toLowerCase()
    .trim();
}

  let bank = [];
  let filtered = [];
  let index = 0;
  let selectedCanonicals = [];
  let selectedLabels = [];

  // Card flip helpers
  function showFront() {
    card.classList.remove("flipped");
  }

  function showBack() {
    card.classList.add("flipped");
  }

function setPlaceholder(on) {
  if (!card) return;

  // Ensure config is safe
  let img = "";
  try {
    img = window?.CIVICEDGE_CONFIG?.flashcards?.placeholder || "";
  } catch (e) {
    img = "";
  }

  if (on) {
    card.classList.add("placeholder");
    if (img) {
      card.style.backgroundImage = `url("${img}")`;
    } else {
      card.style.backgroundImage = "none";
    }
  } else {
    card.classList.remove("placeholder");
    card.style.backgroundImage = "none";
  }
}



  // -------------------------------------------------------
  // 4. Load question bank (config-driven)
  // -------------------------------------------------------
  async function loadBank() {
    const cfg = window.CIVICEDGE_CONFIG;
    if (!cfg || !cfg.bank || !cfg.bank.path) {
      console.error("Missing bank config for flashcards");
      return;
    }

    try {
      const res = await fetch(cfg.bank.path);
      const raw = await res.json();
      bank = Array.isArray(raw) ? raw : (raw.questions || []);
    } catch (e) {
      console.error("Erreur de chargement de la banque pour les flashcards", e);
      bank = [];
    }
  }

  // -------------------------------------------------------
  // 5. Build topic chips from CONFIG → topics.list + topicLabels
  // -------------------------------------------------------
  function renderTopicChips() {
    const cfg = window.CIVICEDGE_CONFIG;
    if (!cfg || !cfg.topics || !cfg.topics.list) return;

    const list   = cfg.topics.list;
    const labels = cfg.topics.topicLabels || {};

    topicContainer.innerHTML = "";

    list.forEach(canonical => {
      const chip = document.createElement("button");
      chip.className = "topic-chip";
      chip.dataset.key = canonical;

      const lbl = labels[canonical] || canonical;
      chip.textContent = lbl;

      chip.addEventListener("click", () => {
        chip.classList.toggle("selected");
        collectSelected();
      });

      topicContainer.appendChild(chip);
    });
  }

 function collectSelected() {
  const cfg = window.CIVICEDGE_CONFIG;
  const labels = cfg.topics.topicLabels || {};

  selectedCanonicals = [...document.querySelectorAll(".topic-chip.selected")]
    .map(btn => btn.dataset.key);

  selectedLabels = selectedCanonicals.map(c => labels[c] || c);
}


  // -------------------------------------------------------
  // 6. Filter bank by selected topics (supports canonical or label in JSON)
  // -------------------------------------------------------
  function buildFilteredSet() {


filtered = bank.filter(q => {
  const t = normalizeTopic(q.topic || "");

  // Compare normalized versions
  const matchCanonical = selectedCanonicals
    .map(normalizeTopic)
    .includes(t);

  const matchLabel = selectedLabels
    .map(normalizeTopic)
    .includes(t);

  return matchCanonical || matchLabel;
});


    shuffle(filtered);
    index = 0;
  }

  // -------------------------------------------------------
  // 7. Rendering card
  // -------------------------------------------------------
  function renderCard() {
    if (!filtered || filtered.length === 0) {
      qText.textContent = "";
      aText.textContent = "";
      statusEl.textContent = "";
      setPlaceholder(true);
      showFront();
      return;
    }

    const q = filtered[index];
    if (!q) {
      qText.textContent = "";
      aText.textContent = "";
      statusEl.textContent = "";
      setPlaceholder(true);
      showFront();
      return;
    }

    qText.textContent = q.q || "";
    aText.textContent = extractAnswer(q) || "";

    statusEl.textContent = `${index + 1} / ${filtered.length}`;
    setPlaceholder(false);
    showFront();
  }

  function extractAnswer(q) {
    if (!q.options) return "";
    const correct = q.options.find(o => o.correct);
    return correct ? correct.t : "";
  }

  // -------------------------------------------------------
  // 8. Navigation — flash-free
  // -------------------------------------------------------
  if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    if (!filtered.length) return;

    if (index > 0) {
      index--;
    } else {
      index = filtered.length - 1;  // loop to end
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


if (nextBtn) {
  nextBtn.addEventListener("click", () => {
    if (!filtered.length) return;

    if (index < filtered.length - 1) {
      index++;
    } else {
      index = 0;  // loop to start
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


  // -------------------------------------------------------
  // 9. Flashcard actions
  // -------------------------------------------------------
  if (flipBtn) {
    flipBtn.addEventListener("click", () => {
      if (!filtered.length) return;
      if (card.classList.contains("flipped")) showFront();
      else showBack();
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
        if (typeof CivicLearnI18n !== "undefined" && CivicLearnI18n.t) {
          statusEl.textContent = CivicLearnI18n.t("flashcards_mastered");
        } else {
          statusEl.textContent = "Ensemble maîtrisé";
        }
        setPlaceholder(true);
        showFront();
        return;
      }

// FIX: prevent micro-flash by disabling transition for 1 frame
card.classList.add("no-transition");
card.classList.remove("flipped");

// Force layout so removal is applied immediately
void card.offsetWidth;

// Next frame: re-enable transitions + render the next card
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

// FIX: prevent micro-flash by disabling transition for 1 frame
card.classList.add("no-transition");
card.classList.remove("flipped");

// Force layout so removal is applied immediately
void card.offsetWidth;

// Next frame: re-enable transitions + render the next card
requestAnimationFrame(() => {
  card.classList.remove("no-transition");
  renderCard();
});


    });
  }

  // -------------------------------------------------------
  // 10. Start button
  // -------------------------------------------------------
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      collectSelected();
      buildFilteredSet();
      renderCard();
    });
  }

  // -------------------------------------------------------
  // 11. Utility: shuffle
  // -------------------------------------------------------
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // -------------------------------------------------------
  // 12. Init
  // -------------------------------------------------------
  async function init() {
    setPlaceholder(true);
    await loadBank();
    renderTopicChips();
  }

  init();

})();
