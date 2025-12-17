/* CivicLearn Country Config — United Kingdom */

window.CIVICEDGE_CONFIG = {
  country: "uk",

  voiceLang: "en-gb",

  bank: {
    path: "/uk/banks/uk/questions.json",
    format: "flat"
  },

  manual: {
    chapters: []   // UK uses question bank only
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-uk.jpg"
  },

  /* --------------------------------
     OFFICIAL SIMULATION — LIFE IN THE UK
     -------------------------------- */
  simulation: {
    questionCount: 24,
    timeLimitMin: 45,
    passScore: 75   // percent
  },

  /* --------------------------------
     QUICK TEST
     -------------------------------- */
  quicktest: {
    questionCount: 5
  },

  /* --------------------------------
     TOPICS (MUST MATCH JSON EXACTLY)
     -------------------------------- */
  topics: {
    list: [
      "Values & Principles",
      "What is the UK",
      "History",
      "Society",
      "Government & Law"
    ],

    topicLabels: {
      "Values & Principles": "Values & Principles",
      "What is the UK":      "What is the UK",
      "History":             "History",
      "Society":             "Society",
      "Government & Law":    "Government & Law"
    },

    maxSelectable: 5,
    allowMulti: true,
    questionCount: 10
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "uk",
  bankBase: "/uk/banks/uk"
};

/* ENGINE BRIDGE — REQUIRED */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
