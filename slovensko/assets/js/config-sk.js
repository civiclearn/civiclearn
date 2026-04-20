/* CivicLearn Country Config — Slovensko (§ 8 zákona 40/1993 Z. z.) */

window.CIVIC_SITE_CODE = "sk";

window.CIVICEDGE_CONFIG = {
  country: "sk",

  voiceLang: "sk-SK",

  reviews: {
    enabled: true,
    threshold: 0.85,
    submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
  },

  bank: {
    path: "/slovensko/data/questions.json",
    format: "multilingual"
  },

  factofday: {
    path: "/slovensko/data/factofday-sk.json"
  },

  flashcards: {
    mode: "topics-only",
    placeholder: ""
  },

  /* ─────────────────────────────────
     SIMULATION — Slovakia
     No official MCQ format. The pohovor portion of § 8 ods. 6
     písm. a) is free-form Q&A by a 3-person commission, so this
     simulation is presented to users as "a lottery of the kind
     of facts a commission might ask about", not as a mock of an
     official test. 25 questions, 45 min (generous, no hard limit
     in law), 80% internal competence threshold.
     ───────────────────────────────── */
  simulation: {
    questionCount: 25,
    timeLimitMin: 45,
    passScore: 20,   // 20 / 25 = 80% — our internal threshold, not official

    // Topic slugs match q.topic.en in /slovensko/data/questions.json.
    // Distribution is proportional to the 800-question bank composition:
    //   historia 200 · geografia 140 · kultura 140 · kazdodenny-zivot 100
    //   statne-zriadenie 100 · symboly 60 · spolocnost-ekonomika 60
    // Total: 25 questions per simulation.
    topicQuotas: {
      "historia":             6,   // 200 → 6
      "geografia":            5,   // 140 → 5
      "kultura":              4,   // 140 → 4
      "kazdodenny-zivot":     3,   // 100 → 3
      "statne-zriadenie":     3,   // 100 → 3
      "symboly":              2,   //  60 → 2
      "spolocnost-ekonomika": 2    //  60 → 2
    }
  },

  quicktest: {
    questionCount: 5
  },

  topics: {
    mode: "microtopics"
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "sk",
  bankBase: "/slovensko/data"
};

/* ENGINE BRIDGE */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
