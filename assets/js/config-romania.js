/* CivicEdge Country Config — Romania
   Zero-text version (all strings handled by i18n)
*/

window.CIVICEDGE_CONFIG = {
  country: "romania",

  // Voice language for reading assist
  voiceLang: "ro-RO",

  bank: {
    path: "/romania/banks/romania/questions.json",
    format: "flat"
  },

  manual: {
    chapters: [
      // Add later if Romania includes a manual
    ]
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-ro.svg"
  },

  simulation: {
    questionCount: 25,   // UPDATED
    timeLimitMin: 30,    // UPDATED
    passScore: 18        // UPDATED
  },

  quicktest: {
    questionCount: 5
  },

  topics: {
    list: [
      "constitutie-drepturi",
      "istoria-romaniei",
      "date-istorice",
      "geografia-romaniei",
      "cultura-romaniei",
      "limba-romana",
      "romania-ue",
      "simbolurile-romaniei",
      "cunostinte-generale"
    ],

    topicLabels: {
      "constitutie-drepturi":    "Constituție și Drepturi",
      "istoria-romaniei":        "Istoria României",
      "date-istorice":           "Date Istorice",
      "geografia-romaniei":      "Geografia României",
      "cultura-romaniei":        "Cultura României",
      "limba-romana":            "Limba Română",
      "romania-ue":              "România și UE",
      "simbolurile-romaniei":    "Simbolurile României",
      "cunostinte-generale":     "Cunoștințe Generale"
    },

    maxSelectable: 12,
    allowMulti: true,
    questionCount: 10   // number of Q picked per-topic test (as in Canada)
  }
};


window.CivicLearnConfig = {
  country: "romania",
  bankBase: "/romania/banks/romania"
};
