/* =========================================================
   CivicLearn Country Config — Luxembourg (LU)
   ========================================================= */

window.CIVICEDGE_CONFIG = {

  /* --------------------------------
     IDENTITY
     -------------------------------- */
  country: "lu",
  countryKey: "lux",

  /* --------------------------------
     LANGUAGES (INSTITUTIONAL)
     -------------------------------- */
  languages: {
    available: ["fr", "de", "en"],
    default: "fr",
    strict: true   // no silent fallback between languages
  },

  /* --------------------------------
     TEXT-TO-SPEECH
     -------------------------------- */
  voiceLang: (function () {
    const lang = window.CIVICEDGE_LANG || "fr";
    if (lang === "fr") return "fr-FR";
    if (lang === "de") return "de-DE";
    return "en-US";
  })(),

  /* --------------------------------
     QUESTION BANKS
     -------------------------------- */
  bank: {
    path: "/lux/banks/lux/questions.json",
    format: "multilingual"
  },

  essentialTest: {
    enabled: true,
    bank: "/lux/banks/lux/essential.json",
    questionCount: 20,
    timeLimitMin: 20,
    randomize: true
  },

  /* --------------------------------
     SUBTOPICS (STRUCTURAL ONLY)
     -------------------------------- */
  subtopics: {
    enabled: true,
    ui: false,              // never shown as filters
    showOnQuestion: true    // label shown on question card
  },

  /* --------------------------------
     SIMULATION — OFFICIAL EXAM RULES
     -------------------------------- */
  simulation: {
    questionCount: 40,
    timeLimitMin: 60,
    passScore: 28,

    }
  },

  /* --------------------------------
     QUICK TEST
     -------------------------------- */
  quicktest: {
    questionCount: 5
  },

  /* --------------------------------
     FLASHCARDS
     -------------------------------- */
  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-lu.jpg"
  },

  /* --------------------------------
     MANUAL (RESERVED)
     -------------------------------- */
  manual: {
    chapters: []
  }

};


/* =========================================================
   LEGACY COMPATIBILITY
   ========================================================= */

window.CivicLearnConfig = {
  country: "lu",
  bankBase: "/lux/banks/lux"
};


/* =========================================================
   ENGINE BRIDGE — REQUIRED
   ========================================================= */

window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
