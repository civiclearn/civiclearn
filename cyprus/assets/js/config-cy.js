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
      "Form of government, political system, powers, parties, ministers, party leaders, heads of key state institutions": 4,
      "Geography of Cyprus, districts and cities": 3,
      "Important events of modern Cypriot history (1960 onwards)": 3,
      "Customs, traditions, events and traditional products": 3,
      "Current affairs": 2,
      "Economy – development sectors": 2,
      "Working hours, festivals and public holidays": 1,
      "Telecommunications in Cyprus": 1,
      "Weather and climate": 1,
      "Means of transport": 1,
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
