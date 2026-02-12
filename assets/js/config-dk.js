/* CivicLearn Country Config — Denmark (Citizenship)
   Engine: engine-dk.js
   Keys = Danish labels (as in Sheets / JSON)
*/
window.CIVIC_SITE_CODE = "dk";

window.CIVICEDGE_CONFIG = {
  country: "denmark",
  
  /* -------------------------------
     LANGUAGE / ACCESSIBILITY
     ------------------------------- */
  i18n: {
    locale: "da-DK"
  },

  voiceLang: "da-DK",
  
    reviews: {
  enabled: true,
  threshold: 0.85,
  submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
},

  /* -------------------------------
     QUESTION BANK
     ------------------------------- */
  bank: {
    path: "/denmark/banks/denmark/questions.json",
    format: "flat"
  },

  /* -------------------------------
     FLASHCARDS
     ------------------------------- */
  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-dk.svg"
  },

  /* =================================================
     OFFICIAL SIMULATION — DANISH RULES
     ================================================= */
  simulation: {
    questionCount: 45,
    timeLimitMin: 45,

    structure: {
      manual: 35,
      values: 5,
      current: 5
    },

    rules: {
      totalCorrectRequired: 36,

      values: {
        minCorrect: 4,
        hardVeto: true
      }
    },

    selection: {
      manual: "random",
      values: "sequential-exhaustive",
      current: "sequential-exhaustive"
    }
  },

  /* -------------------------------
     QUICK TEST
     ------------------------------- */
  quicktest: {
    questionCount: 5
  },

  /* =================================================
     TOPICS (PROGRESS BARS ONLY)
     =================================================
     NOTE:
     - These are NOT all content topics
     - Values & Current are excluded on purpose
  */
  topics: {
    list: [
      "Demokrati",
      "Historie",
      "Kulturliv",
      "Økonomi",
      "Omverdenen",
      "Temaopslag"
    ],

    topicLabels: {
      "Demokrati":      "Demokrati",
      "Historie":       "Historie",
      "Kulturliv":      "Kulturliv",
      "Økonomi":        "Økonomi",
      "Omverdenen":     "Omverdenen",
      "Temaopslag":     "Temaopslag"
    },

    maxSelectable: 6,
    allowMulti: true,
    questionCount: 10,

    progressModel: {
      layers: ["core", "full"],

      core: {
        source: "exam",
        immutable: true
      },

      full: {
        source: ["manual", "structure"],
        unlockAtCorePercent: 70
      }
    }
  },

  /* =================================================
     STRUCTURAL TOPICS (NO BARS)
     ================================================= */
  structural: {
    valuesKey: "Danske værdier",
    currentKey: "Aktuelle begivenheder",

    contributeTo: {
      layer1: false,
      layer2: true
    }
  }
};

/* --------------------------------
   LEGACY / ENGINE BRIDGE
   -------------------------------- */
window.CivicLearnConfig = {
  country: "denmark",
  bankBase: "/denmark/banks/denmark"
};

window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
