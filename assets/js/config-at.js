/* CivicLearn Country Config — Austria */

window.CIVICEDGE_CONFIG = {
  country: "austria",

  voiceLang: "de-at",

  bank: {
    path: "/austria/banks/austria/questions.json",
    format: "flat"
  },

  manual: {
    chapters: []   // Austria uses question bank only
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-at.png"
  },

  /* --------------------------------
     OFFICIAL SIMULATION
     -------------------------------- */
simulation: {
  questionCount: 18,
  timeLimitMin: 45,

  scoring: {
    type: "austria",

    sections: {
      history: 6,
      institutions: 6,
      bundesland: 6
    },

    balanced: {
      minPerSection: 3
    },

    overall: {
      minTotal: 12
    }
  }
},


  /* --------------------------------
     QUICK TEST
     -------------------------------- */
  quicktest: {
    questionCount: 5
  },

  /* --------------------------------
     TOPICS / UI / CHARTS
     -------------------------------- */
  topics: {
    list: [
      "history",
      "institutions",
      "bundesland"
    ],

    topicLabels: {
      history: "Geschichte Österreichs",
      institutions: "Demokratische Ordnung",
      bundesland: "Ihr Bundesland"
    },

    maxSelectable: 3,
    allowMulti: true,
    questionCount: 10
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "austria",
  bankBase: "/austria/banks/austria"
};

/* ENGINE BRIDGE — REQUIRED */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
