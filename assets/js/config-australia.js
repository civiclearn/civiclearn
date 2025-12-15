/* CivicLearn Country Config — Australia */

window.CIVICEDGE_CONFIG = {
  country: "australia",

  voiceLang: "en-au",

  bank: {
    path: "/australia/banks/australia/questions.json",
    format: "flat"
  },

  manual: {
    chapters: []   // Australia uses question bank only
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-au.png"
  },

  /* --------------------------------
     OFFICIAL SIMULATION (ENGINE SAFE)
     -------------------------------- */
  simulation: {
    questionCount: 20,
    timeLimitMin: 45,

    /* Overall pass condition */
    passScore: 74,        // percent

    /* Australian special rule */
    essentialTopic: "Australian values",
    essentialCount: 5,
    essentialMustAllBeCorrect: true
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
      "Australia and its People",
      "Beliefs, rights and liberties",
      "Government and the law",
      "Australian values"
    ],

    topicLabels: {
      "Australia and its People":        "Australia and its People",
      "Beliefs, rights and liberties":   "Beliefs, rights and liberties",
      "Government and the law":          "Government and the law",
      "Australian values":               "Australian values"
    },

    maxSelectable: 4,
    allowMulti: true,
    questionCount: 10
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "australia",
  bankBase: "/australia/banks/australia"
};

/* ENGINE BRIDGE — REQUIRED */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;