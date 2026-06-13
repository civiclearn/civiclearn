window.CIVIC_SITE_CODE = "fi";
window.SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
window.SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

window.CIVICEDGE_CONFIG = {
  country: "fi",
  voiceLang: (function () {
    const lang = window.CIVICEDGE_LANG || "en";
    if (lang === "fi") return "fi-FI";
    if (lang === "sv") return "sv-FI";
    return "en-US";
  })(),
  reviews: {
    enabled: true,
    threshold: 0.85,
    submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
  },
  bank: {
    path: "/kansalaisuuskoe/banks/questions.json",
    format: "multilingual"
  },
  factofday: {
    path: "/kansalaisuuskoe/banks/factofday-fi.json"
  },
  manual: { chapters: [] },
  flashcards: { mode: "topics-only", placeholder: "" },
  simulation: {
    questionCount: 25,
    timeLimitMin: 45,
    passScore: 20,
    topicQuotas: {
      "Constitutional Values & Democracy": 6,
      "Rights & Obligations": 5,
      "Finnish History & Culture": 6,
      "Society & Everyday Life": 5,
      "Equality & Safety": 3
    }
  },
  quicktest: { questionCount: 5 },
  topics: { mode: "microtopics" }
};

window.CivicLearnConfig = { country: "fi", bankBase: "/kansalaisuuskoe/banks" };
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
