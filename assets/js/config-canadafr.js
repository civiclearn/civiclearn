/* CivicEdge Country Config — Canada FR
   Zero-text version (all strings handled by i18n)
*/

window.CIVICEDGE_CONFIG = {
  country: "canadafr",

  
    // NEW: voice language for reading assist
  voiceLang: "fr-CA",

  bank: {
    path: "/canadafr/banks/canada-fr/questions.json",
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
    timeLimitMin: 30,
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
      "citizenship":   "Citoyenneté",
      "canadians":     "Les Canadiens",
      "history":       "Histoire",
      "canada-modern": "Le Canada moderne",
      "government":    "Gouvernement",
      "elections":     "Élections",
      "justice":       "Justice",
      "symbols":       "Symboles",
      "economy":       "Économie",
      "regions":       "Régions"
    },
    maxSelectable: 12,
    allowMulti: true,
	questionCount: 10
  }
};
  
  window.CivicLearnConfig = {
  country: "canadafr",
  bankBase: "/canadafr/banks/canada-fr"
};