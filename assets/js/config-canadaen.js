/* CivicEdge Country Config — Canada EN
   Zero-text version (all strings handled by i18n)
*/

window.CIVIC_SITE_CODE = "ca-en";

window.CIVICEDGE_CONFIG = {
  country: "canadaen",

  
    // NEW: voice language for reading assist
  voiceLang: "en-CA",
  
  reviews: {
  enabled: true,
  threshold: 0.85,
  submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
},

  bank: {
    path: "/canada-en/banks/canada-en/questions.json",
    format: "flat"
  },

  manual: {
    chapters: [
      "droits-responsabilites",
      "canadiens",
      "histoire",
      "gouvernement",
      "elections",
      "justice",
      "economie",
      "regions",
      "canada-moderne",
      "symboles"
    ]
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-ca.svg"
  },

  simulation: {
    questionCount: 20,
    timeLimitMin: 45,
    passScore: 15
  },

  quicktest: {
    questionCount: 5
  },

  topics: {
    list: [
      "citizenship",
      "canadians",
      "history",
      "canada-modern",
      "government",
      "elections",
      "justice",
      "symbols",
      "economy",
      "regions"
    ],
    topicLabels: {
      "citizenship":   "Citizenship",
      "canadians":     "Canadians",
      "history":       "History",
      "canada-modern": "Modern Canada",
      "government":    "Government",
      "elections":     "Elections",
      "justice":       "Justice",
      "symbols":       "Symbols",
      "economy":       "Economy",
      "regions":       "Regions"
    },
    maxSelectable: 12,
    allowMulti: true,
	questionCount: 10
  }
};
  
  window.CivicLearnConfig = {
  country: "canadaen",
  bankBase: "/canada-en/banks/canada-en"
};