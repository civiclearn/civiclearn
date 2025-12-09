// =============================================
//   CivicLearn – Fact of the Day (Patched)
//   - Adds full option randomization
//   - Correctly handles correctIndex after shuffle
// =============================================

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("factOfDayContainer");
  if (!container) return;

  fetch("/geneva/facts/fait-du-jour.json")
    .then((res) => res.json())
    .then((facts) => {
      if (!Array.isArray(facts)) return;
      initFactOfDay(facts);
    })
    .catch((err) => console.error("Fact-of-Day load error:", err));
});

function initFactOfDay(facts) {
  const randomFact = facts[Math.floor(Math.random() * facts.length)];
  renderFact(randomFact);
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

  // ---------------------------
  // Shuffle answer options
  // ---------------------------
  const shuffled = fact.question.options.map((opt, idx) => ({
    text: opt,
    isCorrect: idx === fact.question.correctIndex
  }));

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Render buttons
  shuffled.forEach((entry) => {
    const btn = document.createElement("button");
    btn.className = "fact-option-btn";
    btn.textContent = entry.text;

    btn.addEventListener("click", () => {
      handleAnswer(entry.isCorrect, btn, optionsEl, shuffled, fact);
    });

    optionsEl.appendChild(btn);
  });

  // Hide feedback until clicked
  feedbackEl.style.display = "none";
}

// ------------------------------------------------
//  Handle answer selection (correct + wrong answer)
// ------------------------------------------------
function handleAnswer(isCorrect, clickedBtn, optionsEl, shuffled, fact) {
  const buttons = [...optionsEl.querySelectorAll("button")];
  const feedbackEl = document.querySelector(".fact-feedback");

  // Disable all buttons after selection
  buttons.forEach((b) => (b.disabled = true));

  if (isCorrect) {
    clickedBtn.classList.add("fact-correct");
    feedbackEl.textContent = "Bonne réponse !";
  } else {
    clickedBtn.classList.add("fact-wrong");
    feedbackEl.textContent = "Mauvaise réponse.";

    // Highlight the real correct option
    buttons.forEach((b) => {
      const option = shuffled.find((o) => o.text === b.textContent);
      if (option && option.isCorrect) {
        b.classList.add("fact-correct");
      }
    });
  }

  feedbackEl.style.display = "block";
}
