/* CivicLearn Country Config — Sweden */

window.CIVIC_SITE_CODE = "se";

window.CIVICEDGE_CONFIG = {
  country: "se",

  voiceLang: (function () {
    const lang = window.CIVICEDGE_LANG || "en";
    if (lang === "sv") return "sv-SE";
    return "en-US";
  })(),

  reviews: {
    enabled: true,
    threshold: 0.85,
    submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
  },

  bank: {
    path: "/sweden/banks/questions.json",
    format: "multilingual"
  },

  factofday: {
    path: "/sweden/banks/factofday-se.json"
  },

  manual: {
    chapters: []
  },

  flashcards: {
    mode: "topics-only",
    placeholder: ""
  },

  /* ─────────────────────────────────
     SIMULATION — Sweden Citizenship
     1015-question bank, 13 chapters
     Quotas proportional to bank size
     ───────────────────────────────── */
  simulation: {
    questionCount: 25,
    timeLimitMin: 45,
    passScore: 20,   // 20 / 25 = 80%

    topicQuotas: {
      "Modern History": 5,                                // bank: 200
      "Sweden the Country": 3,                            // bank: 110
      "Human Rights": 2,                                  // bank: 95
      "Law and Justice": 2,                               // bank: 75
      "A Secular State and a Multireligious Country": 2,  // bank: 70
      "How Sweden is Governed": 2,                        // bank: 65
      "Sweden and the World": 2,                          // bank: 65
      "Traditions and Holidays": 2,                       // bank: 65
      "Labour Market and Personal Finance": 1,            // bank: 60
      "The Welfare Society": 1,                           // bank: 60
      "Sweden's Democratic System": 1,                    // bank: 50
      "Elections and Political Parties": 1,               // bank: 50
      "The Role of Media": 1                              // bank: 50
    }
    // Total: 25 — every chapter represented at least once
  },

  /* ─────────────────────────────────
     QUICK TEST
     ───────────────────────────────── */
  quicktest: {
    questionCount: 5
  },

  /* ─────────────────────────────────
     TOPICS — 13 chapters, no microtopics
     Microtopics exist in the JSON but are
     suppressed in the UI by topics-only mode
     ───────────────────────────────── */
  topics: {
    mode: "topics-only"
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "se",
  bankBase: "/sweden/banks"
};

/* ENGINE BRIDGE */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
