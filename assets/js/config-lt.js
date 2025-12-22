/* CivicLearn Country Config — Lithuania */

window.CIVICEDGE_CONFIG = {
  country: "lt",

 voiceLang: (function () {
  const lang = window.CIVICEDGE_LANG || "en";
  if (lang === "ru") return "ru-RU";
  return "en-US"; // fallback for LT + EN
})(),

  bank: {
    path: "/lt/banks/lt/questions.json",
    format: "multilingual"
  },

  manual: {
    chapters: []
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-lt.jpg"
  },

  /* --------------------------------
     OFFICIAL SIMULATION — CONSTITUTION
     -------------------------------- */
  simulation: {
    questionCount: 20,
    timeLimitMin: 100,
    passScore: 70   // 14 / 20
  },

  /* --------------------------------
     QUICK TEST
     -------------------------------- */
  quicktest: {
    questionCount: 5
  },

  /* --------------------------------
     TOPIC LABELS (FULL → SHORT, LT ONLY)
     -------------------------------- */
topics: {
  list: [
    "Lietuvos valstybė",
    "Žmogus ir valstybė",
    "Visuomenė ir valstybė",
    "Tautos ūkis ir darbas",
    "Seimas",
    "Respublikos Prezidentas",
    "Lietuvos Respublikos Vyriausybė",
    "Konstitucinis Teismas",
    "Teismas",
    "Vietos savivalda ir valdymas",
    "Finansai ir valstybės biudžetas",
    "Valstybės kontrolė",
    "Užsienio politika ir valstybės gynimas",
    "Konstitucijos keitimas"
  ],

  topicLabels: {
    lt: {
      "Lietuvos valstybė": "Valstybė",
      "Žmogus ir valstybė": "Teisės",
      "Visuomenė ir valstybė": "Visuomenė",
      "Tautos ūkis ir darbas": "Ūkis",
      "Seimas": "Seimas",
      "Respublikos Prezidentas": "Prezidentas",
      "Lietuvos Respublikos Vyriausybė": "Vyriausybė",
      "Konstitucinis Teismas": "Konst. Teismas",
      "Teismas": "Teismas",
      "Vietos savivalda ir valdymas": "Savivalda",
      "Finansai ir valstybės biudžetas": "Biudžetas",
      "Valstybės kontrolė": "Kontrolė",
      "Užsienio politika ir valstybės gynimas": "Užsienis / Gynyba",
      "Konstitucijos keitimas": "Keitimas"
    },

    ru: {
      "Lietuvos valstybė": "Государство",
      "Žmogus ir valstybė": "Права",
      "Visuomenė ir valstybė": "Общество",
      "Tautos ūkis ir darbas": "Экономика",
      "Seimas": "Сейм",
      "Respublikos Prezidentas": "Президент",
      "Lietuvos Respublikos Vyriausybė": "Правительство",
      "Konstitucinis Teismas": "КС",
      "Teismas": "Суды",
      "Vietos savivalda ir valdymas": "Самоуправление",
      "Finansai ir valstybės biudžetas": "Бюджет",
      "Valstybės kontrolė": "Контроль",
      "Užsienio politika ir valstybės gynimas": "Внешняя политика",
      "Konstitucijos keitimas": "Поправки"
    },

    en: {
      "Lietuvos valstybė": "State",
      "Žmogus ir valstybė": "Rights",
      "Visuomenė ir valstybė": "Society",
      "Tautos ūkis ir darbas": "Economy",
      "Seimas": "Parliament",
      "Respublikos Prezidentas": "President",
      "Lietuvos Respublikos Vyriausybė": "Government",
      "Konstitucinis Teismas": "Const. Court",
      "Teismas": "Courts",
      "Vietos savivalda ir valdymas": "Local Gov.",
      "Finansai ir valstybės biudžetas": "Budget",
      "Valstybės kontrolė": "Audit",
      "Užsienio politika ir valstybės gynimas": "Foreign Policy",
      "Konstitucijos keitimas": "Amendments"
    }
  }
}


};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "lt",
  bankBase: "/lt/banks/lt"
};

/* ENGINE BRIDGE — REQUIRED */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
