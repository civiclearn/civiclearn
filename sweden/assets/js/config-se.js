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
     Modelled on DK-PR / Canadian rules
     ───────────────────────────────── */
  simulation: {
    questionCount: 25,
    timeLimitMin: 45,
    passScore: 20,   // 20 / 25 = 80%

    topicQuotas: {
      "Democracy & Government": 8,
      "Laws & Rights": 7,
      "Swedish Society": 6,
      "History & Geography": 4
    }
  },

  /* ─────────────────────────────────
     QUICK TEST
     ───────────────────────────────── */
  quicktest: {
    questionCount: 5
  },

  topics: {
    mode: "microtopics"
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "se",
  bankBase: "/sweden/banks"
};

/* ENGINE BRIDGE */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
