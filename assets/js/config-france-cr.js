/* CivicLearn Country Config — France (Carte de résident) */

window.CIVICEDGE_CONFIG = {
  country: "france-cr",

  voiceLang: "fr",

  bank: {
    path: "/france/cr/banks/france-cr/questions.json",
    format: "flat"
  },

  manual: {
    chapters: []   // 
  },

  flashcards: {
    mode: "none"
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

    // Informational only – exam composition is fixed
    maxSelectable: 0,
    allowMulti: false,
    questionCount: 0
  }
};

window.CivicLearnConfig = {
  country: "france-cr",
  bankBase: "/france/cr/banks/france-cr"
};
