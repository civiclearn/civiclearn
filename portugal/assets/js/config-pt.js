/* CivicLearn Country Config — Portugal */

window.CIVIC_SITE_CODE = "pt";

window.CIVICEDGE_CONFIG = {
  country: "pt",

  voiceLang: "pt-PT",

  reviews: {
    enabled: true,
    threshold: 0.85,
    submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
  },

  bank: {
    path: "/portugal/banks/questions.json",
    format: "multilingual"
  },

  factofday: {
    path: "/portugal/banks/factofday-pt.json"
  },

  manual: {
    chapters: []
  },

  flashcards: {
    mode: "topics-only",
    placeholder: ""
  },

  /* ─────────────────────────────────
     SIMULATION — Portugal Citizenship
     ───────────────────────────────── */
  simulation: {
    questionCount: 25,
    timeLimitMin: 45,
    passScore: 20,   // 20 / 25 = 80%

    topicQuotas: {
      "History of Portugal": 6,
      "Culture & National Identity": 5,
      "Political System & Institutions": 6,
      "Rights & Duties of Citizens": 5,
      "Portuguese Society": 3
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
  country: "pt",
  bankBase: "/portugal/banks"
};

/* ENGINE BRIDGE */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
