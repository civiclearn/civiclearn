/* CivicLearn Country Config — Luxembourg */

window.CIVICEDGE_CONFIG = {
  country: "lu",

  voiceLang: (function () {
    const lang = window.CIVICEDGE_LANG || "en";
    if (lang === "fr") return "fr-FR";
    if (lang === "de") return "de-DE";
    return "en-US"; // fallback
  })(),

  bank: {
    path: "/lux/banks/lux/questions.json",
    format: "multilingual"
  },
  
  factofday: {
  path: "/lux/banks/lux/factofday-lu.json"
},

  manual: {
    chapters: []
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-lu.jpg"
  },

  /* --------------------------------
     OFFICIAL SIMULATION — LUXEMBOURG
     -------------------------------- */
  simulation: {
    questionCount: 40,
    timeLimitMin: 60,
    passScore: 28,   // 28 / 40

    // Quotas per main category (must sum to questionCount)
    topicQuotas: {
     "History": 10,
     "Institutions": 20,
     "Fundamental Rights": 10
    }
  },

  /* --------------------------------
     QUICK TEST
     -------------------------------- */
  quicktest: {
    questionCount: 5
  },   

  topics: {
    mode: "microtopics"
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "lu",
  bankBase: "/lux/banks/lux"
};

/* ENGINE BRIDGE — REQUIRED */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
