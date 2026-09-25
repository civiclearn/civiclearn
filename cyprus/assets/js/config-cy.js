/* CivicLearn Country Config — Cyprus (Cyprus Citizenship Test) */

window.CIVIC_SITE_CODE = "cy";
window.SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
window.SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

window.CIVICEDGE_CONFIG = {
  country: "cy",
  voiceLang: (function () {
    const lang = window.CIVICEDGE_LANG || "el";
    if (lang === "el") return "el-GR";
    if (lang === "ru") return "ru-RU";
    return "en-US";
  })(),
  reviews: {
    enabled: true,
    threshold: 0.85,
    submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
  },
  bank: {
    path: "/cyprus/banks/questions.json",
    format: "multilingual"
  },
  factofday: {
    path: "/cyprus/banks/factofday-cy.json"
  },
  manual: { chapters: [] },
  flashcards: { mode: "topics-only", placeholder: "" },
  simulation: {
    questionCount: 25,
    timeLimitMin: 45,
    passScore: 15,
    // Keyed by topic.en — must sum to questionCount (25). Every official topic
    // area gets at least one question; the largest banks are weighted heavier.
    topicQuotas: {
      "Political system": 4,
      "Geography and districts": 3,
      "Modern history": 3,
      "Customs and traditions": 3,
      "Current affairs": 2,
      "Economy": 2,
      "Hours & holidays": 1,
      "Telecommunications": 1,
      "Weather and climate": 1,
      "Transport": 1,
      "Entry requirements": 1,
      "Languages and religions": 1,
      "Health and safety": 1,
      "Currency and exchange": 1
    }
  },
  quicktest: { questionCount: 5 },
  topics: { mode: "microtopics" }
};

window.CivicLearnConfig = { country: "cy", bankBase: "/cyprus/banks" };
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
