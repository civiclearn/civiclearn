/* CivicLearn Country Config — France (Carte de séjour pluriannuelle) */

window.CIVICEDGE_CONFIG = {
  country: "france-csp",

  voiceLang: "fr",

  bank: {
    path: "/france/csp/banks/france-csp/questions.json",
    format: "flat"
  },

  manual: {
    chapters: []   // Examen civique: no official manual chapters
  },

  flashcards: {
    mode: "none"   // Not applicable for examen civique
  },
  
  essentiel: {
  questionCount: 12
},

  simulation: {
    questionCount: 40,
    timeLimitMin: 45,
    passScore: 32,          // 80%
    breakdown: {
      knowledge: 28,
      situation: 12
    }
  },

  quicktest: {
    questionCount: 5
  },

  topics: {
    list: [
      "principes-valeurs",
      "systeme-politique",
      "droits-devoirs",
      "histoire-geographie-culture",
      "vivre-societe"
    ],

    topicLabels: {
      "principes-valeurs":           "Principes et valeurs de la République",
      "systeme-politique":           "Système institutionnel et politique",
      "droits-devoirs":              "Droits et devoirs",
      "histoire-geographie-culture": "Histoire géographie et culture",
      "vivre-societe":               "Vivre dans la société française"
    },

    // Topics are informational only (no topic-based exam selection)
    maxSelectable: 0,
    allowMulti: false,
    questionCount: 0
  }
};

window.CivicLearnConfig = {
  country: "france-csp",
  bankBase: "/france/csp/banks/france-csp"
};
