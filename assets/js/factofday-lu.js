(async function () {
  async function initDashboardQuestion() {
    const card = document.getElementById("factOfDayCard");
    if (!card) return;

    const titleEl = document.getElementById("factTitle");
    const qTextEl = document.getElementById("factQuestion");
    const optionsEl = document.getElementById("factOptions");
    const feedbackEl = document.getElementById("factFeedback");
    const btnPrev = document.getElementById("factPrev");
    const btnNext = document.getElementById("factNext");

    const jsonUrl = window.CIVICEDGE_CONFIG?.factofday?.path;

    if (!jsonUrl) {
      console.error("FactOfDay: Missing CIVICEDGE_CONFIG.factofday.path");
      card.style.display = "none";
      return;
    }

    let questions = [];
    try {
      const res = await fetch(jsonUrl, { cache: "no-store" });
      const data = await res.json();
      questions = data.questions || [];
    } catch (err) {
      console.error("FactOfDay: Fetch error", err);
      card.style.display = "none";
      return;
    }

    if (!questions.length) {
      console.error("FactOfDay: No questions in JSON");
      card.style.display = "none";
      return;
    }

    const dayKey = new Date().toISOString().slice(0, 10);
    const startIndex = hashString(dayKey) % questions.length;
    let currentIndex = startIndex;

    function getLang() {
      return window.CIVICEDGE_LANG || "fr";
    }

    function render() {
      const lang = getLang();
      const q = questions[currentIndex];
      if (!q) return;

      optionsEl.innerHTML = "";
      feedbackEl.style.display = "none";

      qTextEl.textContent = (q.q && (q.q[lang] || q.q.en || q.q.fr || q.q.de)) || "";

      if (titleEl) {
        titleEl.textContent = window.CivicLearnI18n?.t?.("dashboard_fact_title") || "Question du jour";
      }

      const currentOptions =
        (q.options && (q.options[lang] || q.options.en || q.options.fr || q.options.de)) || [];

      const correctIdx = q.correctIndex;

      currentOptions.forEach((optText, i) => {
        const btn = document.createElement("button");
        btn.className = "fact-option-btn";
        btn.textContent = optText;

        btn.addEventListener("click", () => {
          const allBtns = optionsEl.querySelectorAll("button");
          allBtns.forEach(b => (b.disabled = true));

          if (i === correctIdx) {
            btn.classList.add("fact-correct");
          } else {
            btn.classList.add("fact-wrong");
            if (allBtns[correctIdx]) allBtns[correctIdx].classList.add("fact-correct");
          }
        });

        optionsEl.appendChild(btn);
      });
    }

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

  try {
    await initDashboardQuestion();
  } catch (e) {
    console.error("Dashboard question init error:", e);
  }
})();
