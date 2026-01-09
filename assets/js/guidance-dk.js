(function () {
  const STORAGE_KEY = "civiclearn:guidance:dismissed";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function daysBetween(a, b) {
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}

const DK_EXAM_SCHEDULE = {
  testDate: "2026-06-03",
  registrationDeadline: "2026-01-12"
};


function getDynamicTips() {
  const out = [];

  const now = new Date();

  const testDate = new Date(DK_EXAM_SCHEDULE.testDate);
  const registrationDeadline = new Date(DK_EXAM_SCHEDULE.registrationDeadline);

  const daysToTest = daysBetween(now, testDate);
  const daysToRegistrationEnd = daysBetween(now, registrationDeadline);

  // ===============================
  // MAIN DK INFO CARD (always shown before test)
  // ===============================

  if (daysToTest >= 0) {
    out.push({
      id: "dk-exam-info",
      title: "Næste officielle indfødsretsprøve",
      text:
        `Den næste indfødsretsprøve afholdes den ${formatDate(DK_EXAM_SCHEDULE.testDate)} ` +
        `(${daysToTest} dage tilbage).\n\n` +
        `Tilmeldingsfristen er den ${formatDate(DK_EXAM_SCHEDULE.registrationDeadline)} ` +
        `(${daysToRegistrationEnd} dage tilbage).\n\n` +
        `Husk at tilmelde dig i tide og finde dit teststed via ` +
`<a href="https://civiclearn.com" target="_blank" rel="noopener">testcenter-oversigten</a>.`
    });
  }

  // ===============================
  // URGENCY CARDS
  // ===============================

  if (daysToRegistrationEnd > 0 && daysToRegistrationEnd <= 7) {
    out.push({
      id: "dk-registration-closing",
      title: "Tilmelding lukker snart",
      text:
        "Tilmeldingen til den kommende indfødsretsprøve lukker om få dage. Sørg for at være tilmeldt i tide."
    });
  }

  if (daysToRegistrationEnd <= 0 && daysToTest > 0) {
    out.push({
      id: "dk-registration-closed",
      title: "Tilmelding er lukket",
      text:
        "Tilmeldingen til den kommende indfødsretsprøve er lukket. Du kan stadig forberede dig til næste prøve."
    });
  }

  if (daysToTest > 0 && daysToTest <= 3) {
    out.push({
      id: "dk-test-soon",
      title: "Prøven er lige om hjørnet",
      text:
        "Indfødsretsprøven afholdes meget snart. Fokusér på repetition og overvej at tage en simulation."
    });
  }

  if (daysToTest === 0) {
    out.push({
      id: "dk-test-today",
      title: "Prøven er i dag",
      text:
        "Held og lykke med indfødsretsprøven i dag."
    });
  }

  return out;
}



const tips = [
  ...getDynamicTips(),

  {
    id: "start-core",
    title: "Start med kernetesten",
    text:
      "Kernetesten indeholder spørgsmål fra tidligere officielle prøver. Arbejd dig systematisk gennem dem, før du går videre til fuld forberedelse."
  },
  {
    id: "use-topics-smart",
    title: "Brug emnetests strategisk",
    text:
      "Emnetests er opdelt i serier på 10 spørgsmål. Forkerte spørgsmål kommer igen, indtil de er mestret – det er helt bevidst."
  },

{
    id: "use-topics-smart",
    title: "Brug emnetests strategisk",
    text:
      "Emnetests er opdelt i serier på 10 spørgsmål. Forkerte spørgsmål kommer igen, indtil de er mestret – det er helt bevidst."
  },
  {
    id: "simulations-last",
    title: "Gem simulationer til sidst",
    text:
      "Simulationer fungerer bedst som generalprøve tæt på testen – ikke som primært læringsværktøj."
  }
];


  // ===============================
  // DOM HOOKS (UNCHANGED)
  // ===============================

  const container = document.getElementById("guidance-row");
  if (!container) return;

  const cardsWrap = container.querySelector(".guidance-cards");
  const collapsed = container.querySelector("#guidance-collapsed");
  const toggleBtn = container.querySelector("#guidance-toggle");
  const toggleLabel = container.querySelector("#guidance-toggle-label");

  if (toggleLabel) {
    toggleLabel.textContent = "Tips til effektiv forberedelse";
  }

  // ===============================
  // STATE
  // ===============================

  let dismissed = new Set(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  );

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  }

  // ===============================
  // RENDER (UNCHANGED LOGIC)
  // ===============================

  function render() {
    cardsWrap.innerHTML = "";

    const visibleTips = tips.filter(t => !dismissed.has(t.id));

    if (visibleTips.length === 0) {
      cardsWrap.style.display = "none";
      collapsed.hidden = false;
      return;
    }

    cardsWrap.style.display = "";
    collapsed.hidden = true;

    visibleTips.forEach(tip => {
      const card = document.createElement("div");
      card.className = "guidance-card";

      card.innerHTML = `
        <button class="guidance-dismiss" aria-label="Luk tip">×</button>
        <h4>${tip.title}</h4>
        <p>${tip.text}</p>
      `;

      card.querySelector(".guidance-dismiss").addEventListener("click", () => {
        dismissed.add(tip.id);
        save();
        render();
      });

      cardsWrap.appendChild(card);
    });
  }

  // ===============================
  // TOGGLE (UNCHANGED)
  // ===============================

  toggleBtn.addEventListener("click", () => {
    dismissed.clear();
    save();
    render();
  });

  render();
})();
