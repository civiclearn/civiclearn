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

  // ----------------------------------------------------------------------
  // Exam schedule
  // ----------------------------------------------------------------------
  // Add new exam terms here as SIRI publishes them on danskogproever.dk.
  // Order doesn't matter — getNextExam() picks the soonest upcoming one
  // and the card auto-advances to the next term once an exam date passes.
  // ----------------------------------------------------------------------
  const DK_EXAM_SCHEDULE = [
    { testDate: "2026-06-03", registrationDeadline: "2026-04-29" }, // sommer 2026
    { testDate: "2026-11-25", registrationDeadline: "2026-10-21" }  // vinter 2026
  ];

  function getNextExam() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return DK_EXAM_SCHEDULE
      .filter(e => new Date(e.testDate) >= today)
      .sort((a, b) => new Date(a.testDate) - new Date(b.testDate))[0];
  }

  function getDynamicTips() {
    const out = [];
    const exam = getNextExam();
    if (!exam) return out;

    const now = new Date();
    const testDate = new Date(exam.testDate);
    const registrationDeadline = new Date(exam.registrationDeadline);

    const daysToTest = daysBetween(now, testDate);
    const daysToRegistrationEnd = daysBetween(now, registrationDeadline);

    const registrationInfo = daysToRegistrationEnd > 0
      ? `
Tilmeldingsfristen er den ${formatDate(exam.registrationDeadline)}
(${daysToRegistrationEnd} dage tilbage).

Husk at tilmelde dig i tide og finde dit teststed via
<a href="https://indfodsretsprove.dk/find-dit-testcenter/" target="_blank" rel="noopener">
testcenter-oversigten
</a>.
`.trim()
      : `
Tilmeldingen til denne prøve er lukket. Hvis du allerede er tilmeldt,
kan du finde dit teststed via
<a href="https://indfodsretsprove.dk/find-dit-testcenter/" target="_blank" rel="noopener">
testcenter-oversigten
</a>.
`.trim();

    out.push({
      id: "dk-exam-info",
      title: 'Næste officielle indfødsretsprøve <span class="gc-pill info">Officiel</span>',
      text: `
Den næste indfødsretsprøve afholdes den ${formatDate(exam.testDate)}
(${daysToTest} dage tilbage).

${registrationInfo}
`.trim()
    });

    return out;
  }

  const tips = [
    ...getDynamicTips(),

    {
      id: "start-with-topics",
      title: 'Start med tests efter emne <span class="gc-pill primary">Anbefalet</span>',
      text: `
Spørgsmålene præsenteres i små overskuelige batches, og de spørgsmål,
du svarer forkert på, vender automatisk tilbage, indtil du har dem helt på plads.

Dette er den mest effektive træningsform og den bedste måde at opbygge
sikker viden på.
`.trim()
    },

    {
      id: "phase-1-kernetest",
      title: 'Fase 1: Kernetesten <span class="gc-pill neutral">Fase 1</span>',
      text: `
Den første fase af din træning er Kernetesten, som udelukkende består
af tidligere officielle spørgsmål fra indfødsretsprøven.

Alle kendte prøvespørgsmål siden 2009 er samlet her.
Når du har opnået 70 %, låses Fase 2 (Fuld forberedelse) automatisk op.
`.trim()
    },

    {
      id: "my-list",
      title: "Brug “Min liste” til svære spørgsmål",
      text: `
Ved at klikke på den lille ⭐ i øverste højre hjørne kan du gemme ethvert
spørgsmål på din egen liste.

Her kan du senere gennemgå netop de spørgsmål, du har haft svært ved,
og gentage dem, når det passer dig.
`.trim()
    },

    {
      id: "reading-assist",
      title: "Brug læsehjælp",
      text: `
Du kan aktivere læsehjælp direkte i nederste venstre hjørne af dit dashboard.

Funktionen hjælper med oplæsning og støtte til forståelsen og kan være
særligt nyttig, hvis du foretrækker at lytte eller har brug for ekstra
hjælp under læsningen.
`.trim()
    },

    {
      id: "simulations-last",
      title: 'Gem simulationer til sidst <span class="gc-pill neutral">Avanceret</span>',
      text: `
Simulationer fungerer bedst som en generalprøve tæt på testen –
ikke som primært læringsværktøj.

Brug dem til at teste dit niveau og din tidsfornemmelse, når du allerede
har gennemført den målrettede træning.
`.trim()
    }
  ];

  const container = document.getElementById("guidance-row");
  if (!container) return;

  const cardsWrap = container.querySelector(".guidance-cards");
  const collapsed = container.querySelector("#guidance-collapsed");
  const toggleBtn = container.querySelector("#guidance-toggle");
  const toggleLabel = container.querySelector("#guidance-toggle-label");

  if (toggleLabel) {
    toggleLabel.textContent = "Tips til effektiv forberedelse";
  }

  let dismissed = new Set(
    JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  );

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
  }

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

  toggleBtn.addEventListener("click", () => {
    dismissed.clear();
    save();
    render();
  });

  render();
})();
