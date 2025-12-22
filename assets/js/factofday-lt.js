CivicLearnI18n.onReady(() => {
  initDashboardQuestion().catch(err =>
    console.error("Dashboard question init error:", err)
  );
});

async function initDashboardQuestion() {
  const card = document.getElementById("factOfDayCard");
  if (!card) return;

  const titleEl = document.getElementById("factTitle");
  const qBlock = document.getElementById("factQuestionBlock");
  const qTextEl = document.getElementById("factQuestion");
  const optionsEl = document.getElementById("factOptions");
  const feedbackEl = document.getElementById("factFeedback");
  const btnPrev = document.getElementById("factPrev");
  const btnNext = document.getElementById("factNext");

  // Get current language (lt, en, or ru)
  

  // 1. Resolve Path from your actual config (CIVICEDGE_CONFIG)
  // No fallbacks to outside domains, just your local path
  const jsonUrl = window.CIVICEDGE_CONFIG?.bank?.path;

  if (!jsonUrl) {
    console.error("FactOfDay: Path not found in CIVICEDGE_CONFIG");
    card.style.display = "none";
    return;
  }

  let questions = [];
  try {
    const res = await fetch(jsonUrl);
    const data = await res.json();
    // Your JSON has a top-level "questions" array
    questions = data.questions; 
  } catch (err) {
    console.error("FactOfDay: Fetch error", err);
    card.style.display = "none";
    return;
  }

  // 2. Daily index based on date
  const dayKey = new Date().toISOString().slice(0, 10);
  const startIndex = hashString(dayKey) % questions.length;
  let currentIndex = startIndex;



  // 3. Render Function
  function render() {
	  
const lang = window.CIVICEDGE_LANG || "lt";
    
	const q = questions[currentIndex];
    if (!q) return;

    optionsEl.innerHTML = "";
    feedbackEl.style.display = "none";
    
    // Set Question Text (using the 'q' key from your JSON)
    qTextEl.textContent = q.q[lang] || q.q["en"];

    // Set Title
    if (titleEl) {
      titleEl.textContent = CivicLearnI18n.t?.("dashboard_fact_title") || "Practice Question";
    }

    // Get options for current language
    const currentOptions = q.options[lang] || q.options["en"];
    const correctIdx = q.correctIndex;

    currentOptions.forEach((optText, i) => {
      const btn = document.createElement("button");
      btn.className = "fact-option-btn";
      btn.textContent = optText;
      
      btn.addEventListener("click", () => {
        const allBtns = optionsEl.querySelectorAll("button");
        allBtns.forEach(b => b.disabled = true);

        if (i === correctIdx) {
          btn.classList.add("fact-correct");
        } else {
          btn.classList.add("fact-wrong");
          allBtns[correctIdx].classList.add("fact-correct");
        }
      });
      optionsEl.appendChild(btn);
    });
  }

  // 4. Navigation
  btnPrev?.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + questions.length) % questions.length;
    render();
  });

  btnNext?.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % questions.length;
    render();
  });

  render();
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}