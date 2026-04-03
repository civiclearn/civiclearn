/* CivicLearn Country Config — Denmark-PR (Medborgerskabsprøven) */

window.CIVIC_SITE_CODE = "dkpr";

window.CIVICEDGE_CONFIG = {
  country: "dkpr",

  voiceLang: "da-DK",

  reviews: {
    enabled: true,
    threshold: 0.85,
    submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
  },

  bank: {
    path: "/medborgerskab/banks/questions.json",
    format: "multilingual"
  },

  factofday: {
    path: "/medborgerskab/banks/factofday-dkpr.json"
  },

  manual: {
    chapters: []
  },

  flashcards: {
    mode: "topics-only",
    placeholder: ""
  },

  /* ─────────────────────────────────
     SIMULATION — Denmark-PR Citizenship
     30 min, 25 questions, 80% pass
     ───────────────────────────────── */
  simulation: {
    questionCount: 25,
    timeLimitMin: 30,
    passScore: 20,   // 20 / 25 = 80%

    topicQuotas: {
      "Democracy and Law": 6,
      "History and Culture": 5,
      "Work and Economy": 4,
      "Everyday Life": 3,
      "Children and Youth": 3,
      "Denmark in the World": 2,
      "Society and Environment": 2
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
  country: "dkpr",
  bankBase: "/medborgerskab/banks"
};

/* ENGINE BRIDGE */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
