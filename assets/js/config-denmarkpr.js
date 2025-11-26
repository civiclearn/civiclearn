/* CivicEdge Country Config — Denmark PR (Medborgerskabsprøven)
   Zero-text version (all strings handled by i18n)
*/

window.CIVICEDGE_CONFIG = {
  country: "denmark-pr",


  // Language for i18n loader
  i18n: {
    locale: "da-DK"
  },

  // Voice language for reading assist
  voiceLang: "da-DK",

  // Bank path
  bank: {
    path: "/denmark-pr/banks/denmark-pr/questions.json",
    format: "flat"
  },

  // Flashcards
  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-dk.svg"
  },

  // Simulation (Medborgerskabsprøven)
  simulation: {
    questionCount: 25,
    timeLimitMin: 30,
    passScore: 20
  },

  // Quick test (same as Canada)
  quicktest: {
    questionCount: 5
  },

  // Test-by-topics
  topics: {
    list: [
      "boern-unge",
      "historie-kultur",
      "danskerne",
      "demokrati",
      "erhvervsliv",
      "omverdenen"
    ],

    topicLabels: {
      "boern-unge":       "Børn og unge",
      "historie-kultur":  "Historie og kultur",
      "danskerne":        "Danskere",
      "demokrati":        "Demokrati",
      "erhvervsliv":      "Erhvervsliv",
      "omverdenen":       "Omverdenen"
    },

    maxSelectable: 12,
    allowMulti: true,
    questionCount: 10
  }
};

  
  window.CivicLearnConfig = {
  country: "denmarkpr",
  bankBase: "/denmark-pr/banks/denmark-pr"
};
