// ============================================================
// FACT OF THE DAY — CivicLearn Dashboard
// Loads facts.json, selects one stable fact per day,
// displays fact, question, options, and feedback.
// ============================================================

CivicLearnI18n.onReady(() => {
  initFactOfDay().catch(err =>
    console.error("Fact of the Day init error:", err)
  );
});

async function initFactOfDay() {
  const card = document.getElementById("factOfDayCard");
  if (!card) return;

  const dateEl = document.getElementById("factDate");
  const titleEl = document.getElementById("factTitle");
  const factTextEl = document.getElementById("factText");
  const qBlock = document.getElementById("factQuestionBlock");
  const qTextEl = document.getElementById("factQuestion");
  const optionsEl = document.getElementById("factOptions");
  const feedbackEl = document.getElementById("factFeedback");

  const btnPrev = document.getElementById("factPrev");
  const btnNext = document.getElementById("factNext");

  function t(key, fallback) {
    try {
      if (window.CivicLearnI18n && typeof window.CivicLearnI18n.t === "function") {
        return window.CivicLearnI18n.t(key, fallback);
      }
      return fallback || key;
    } catch {
      return fallback || key;
    }
  }

  if (titleEl) {
    titleEl.textContent = t("dashboard_fact_title", "Fact of the Day");
  }

  let facts = [];
  try {
    const res = await fetch(`${window.CivicLearnConfig.bankBase}/facts.json`);
    facts = await res.json();
    if (!Array.isArray(facts)) throw new Error("facts.json invalid");
  } catch (err) {
    console.error("Failed to load facts.json:", err);
    card.style.display = "none";
    return;
  }

  if (facts.length === 0) {
    card.style.display = "none";
    return;
  }

  // --- DAILY INDEX ---
  const dayKey = new Date().toISOString().slice(0, 10);
  const startIndex = hashString(dayKey) % facts.length;

  let currentIndex = startIndex;

  // ------------------------------------------------------------
  // RENDER FUNCTION (with safe randomization added)
  // ------------------------------------------------------------
  function render() {
    const fact = facts[currentIndex];

    dateEl.textContent = ""; // still hidden by CSS
    factTextEl.textContent = fact.fact || "";

    if (!fact.question) {
      qBlock.style.display = "none";
      return;
    }

    qBlock.style.display = "block";
    qTextEl.textContent = fact.question.text || "";
    optionsEl.innerHTML = "";
    feedbackEl.style.display = "none";

    // --------------------------------------------------------
    // RANDOMIZE OPTIONS WITHOUT MODIFYING fact.question
    // --------------------------------------------------------
    const originalOptions = fact.question.options;
    const originalCorrectIndex = fact.question.correctIndex;

    // Build objects
    let optionObjects = originalOptions.map((opt, i) => ({
      text: opt,
      isCorrect: i === originalCorrectIndex
    }));

    // Fisher–Yates shuffle
    for (let i = optionObjects.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [optionObjects[i], optionObjects[j]] = [optionObjects[j], optionObjects[i]];
    }

    // Find new correct index
    const newCorrectIndex = optionObjects.findIndex(o => o.isCorrect);

    // Render shuffled buttons
    optionObjects.forEach((obj, i) => {
      const btn = document.createElement("button");
      btn.className = "fact-option-btn";
      btn.textContent = obj.text;
      btn.addEventListener("click", () => handleAnswer(i, newCorrectIndex));
      optionsEl.appendChild(btn);
    });
  }

  // ------------------------------------------------------------
  // HANDLE ANSWER (now receives the *shuffled* correct index)
  // ------------------------------------------------------------
  function handleAnswer(selectedIndex, correctIndex) {
    const btns = optionsEl.querySelectorAll("button");

    btns.forEach((b, idx) => {
      b.disabled = true;
      if (idx === correctIndex) b.classList.add("fact-correct");
      if (idx === selectedIndex && idx !== correctIndex) b.classList.add("fact-wrong");
    });

    feedbackEl.textContent = selectedIndex === correctIndex ? "✓" : "✗";
    feedbackEl.style.display = "none"; // remains hidden
  }

  // --- NAVIGATION ---
  btnPrev.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + facts.length) % facts.length;
    render();
  });

  btnNext.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % facts.length;
    render();
  });

  // INITIAL LOAD
  render();
}

// ---- Utility: simple deterministic hash ----
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
