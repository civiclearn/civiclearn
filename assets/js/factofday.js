// ============================================================
// CivicLearn — Fact of the Day
// Loads a random fact from facts.json (bankBase/facts.json)
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("factOfDayContainer");
  if (!container) return;

  const factsPath = `${window.CivicLearnConfig.bankBase}/facts.json`;

  fetch(factsPath)
    .then((r) => r.json())
    .then((facts) => {
      if (!Array.isArray(facts)) return;
      initFactOfDay(facts);
    })
    .catch((e) => console.error("Fact of Day load error:", e));
});

function initFactOfDay(facts) {
  const index = Math.floor(Math.random() * facts.length);
  const fact = facts[index];
  renderFact(fact);
}

function renderFact(fact) {
  const container = document.getElementById("factOfDayContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="fact-card">
      <div class="fact-text">${fact.fact}</div>
      <div class="fact-question">${fact.question.text}</div>
      <div class="fact-options"></div>
      <div class="fact-feedback" style="display:none;"></div>
    </div>
  `;

  const optionsEl = container.querySelector(".fact-options");
  const feedbackEl = container.querySelector(".fact-feedback");

  fact.question.options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "fact-option-btn";
    btn.textContent = opt;

    btn.addEventListener("click", () => {
      handleAnswer(idx, fact, optionsEl, feedbackEl);
    });

    optionsEl.appendChild(btn);
  });

  feedbackEl.style.display = "none";
}

function handleAnswer(selectedIndex, fact, optionsEl, feedbackEl) {
  const buttons = [...optionsEl.querySelectorAll("button")];
  const correct = fact.question.correctIndex;

  buttons.forEach((b) => (b.disabled = true));

  if (selectedIndex === correct) {
    buttons[selectedIndex].classList.add("fact-correct");
    feedbackEl.textContent = fact.feedbackCorrect || "Correct!";
  } else {
    buttons[selectedIndex].classList.add("fact-wrong");
    buttons[correct].classList.add("fact-correct");
    feedbackEl.textContent = fact.feedbackWrong || "Incorrect.";
  }

  feedbackEl.style.display = "block";
}

// Optional hash function used in older builds
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
