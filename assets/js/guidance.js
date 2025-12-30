(function () {
  const STORAGE_KEY = "civiclearn:guidance:dismissed";
  const LANG = window.CIVICEDGE_LANG || "en";
  
const tips = [
  {
    id: "start-topics",
    title: {
      en: "Start with tests by topic",
      fr: "Commencez par les tests par thème",
      de: "Beginnen Sie mit thematischen Tests"
    },
    text: {
      en: "Topic-based tests are the most effective way to learn. Questions are presented in small batches of 10 and follow a progressive logic: you must answer everything correctly before moving on. Mistakes come back, helping you truly understand and retain the material.",
      fr: "Les tests par thème sont la manière la plus efficace d’apprendre. Les questions sont proposées par séries de 10 et suivent une logique progressive : vous devez tout réussir avant d’avancer. Les erreurs reviennent, ce qui permet un apprentissage réel et durable.",
      de: "Thematische Tests sind der effektivste Weg zu lernen. Die Fragen werden in kleinen Serien von 10 gestellt und folgen einer progressiven Logik: Sie müssen alle korrekt beantworten, bevor Sie weitermachen. Fehler tauchen erneut auf und fördern ein nachhaltiges Lernen."
    }
  },
  {
    id: "mark-difficult-questions",
    title: {
      en: "Mark difficult questions as you go",
      fr: "Marquez les questions difficiles",
      de: "Markieren Sie schwierige Fragen"
    },
    text: {
      en: "If a question feels hard or confusing, mark it using the star in the top-right corner. This helps you build a personal list of questions that deserve extra attention later.",
      fr: "Si une question vous semble compliquée ou peu claire, marquez-la avec l’étoile en haut à droite. Vous constituez ainsi une liste personnelle de questions à revoir plus attentivement.",
      de: "Wenn Ihnen eine Frage schwierig oder unklar erscheint, markieren Sie sie mit dem Stern oben rechts. So erstellen Sie eine persönliche Liste von Fragen, die später besondere Aufmerksamkeit verdienen."
    }
  },
  {
    id: "use-simulations-and-reviews",
    title: {
      en: "Use simulations as rehearsals",
      fr: "Utilisez les simulations comme des répétitions",
      de: "Nutzen Sie Simulationen als Probeläufe"
    },
    text: {
      en: "Simulations are best used as exam rehearsals, not as a primary learning tool. Some questions may repeat — that’s normal. If you’re short on time, use a quick test. After a few days of practice, review Your List and Traps to focus on your most challenging questions.",
      fr: "Les simulations servent avant tout à s’entraîner dans des conditions d’examen, pas à apprendre. Certaines questions peuvent revenir, c’est normal. Si vous manquez de temps, utilisez un test rapide. Après quelques jours de pratique, consultez Votre liste et les Pièges pour cibler les questions les plus complexes.",
      de: "Simulationen eignen sich am besten als Prüfungsvorbereitung, nicht als Lernmethode. Einige Fragen können sich wiederholen – das ist normal. Wenn Sie wenig Zeit haben, nutzen Sie einen Kurztest. Nach einigen Tagen Übung sollten Sie Ihre Liste und die Fallen durchgehen, um sich auf die anspruchsvollsten Fragen zu konzentrieren."
    }
  }
];



  const container = document.getElementById("guidance-row");
  if (!container) return;

const cardsWrap = container.querySelector(".guidance-cards");
const collapsed = container.querySelector("#guidance-collapsed");
const toggleBtn = container.querySelector("#guidance-toggle");

  const toggleLabel = container.querySelector("#guidance-toggle-label");

  const TOGGLE_TEXT = {
  en: "Tips to prepare effectively",
  fr: "Conseils pour bien se préparer",
  de: "Tipps für eine effektive Vorbereitung"
};

  if (toggleLabel) {
  toggleLabel.textContent = TOGGLE_TEXT[LANG] || TOGGLE_TEXT.en;
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
      <button class="guidance-dismiss" aria-label="Dismiss tip">×</button>
     <h4>${tip.title[LANG] || tip.title.en}</h4>
<p>${tip.text[LANG] || tip.text.en}</p>

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
