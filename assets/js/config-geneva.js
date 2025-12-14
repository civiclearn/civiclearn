/* CivicLearn Country Config — Geneva */

window.CIVICEDGE_CONFIG = {
  country: "geneva",

  voiceLang: "ch",
  
  bank: {
    path: "/geneva/banks/geneva/questions.json",
    format: "flat"
  },

  manual: {
    chapters: []   // Geneva has no manual chapters
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-ge.png"
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
    "origines-moyen-age",
    "reforme-modernes",
    "geneve-contemporaine",
    "histoire-suisse",
    "organisation-federale",
    "droits-democratie",
    "geographie-culture-suisse",
    "institutions-geneve",
    "services-publics-geneve",
    "geneve-quotidien",
	"questions-essentielles"
  ],

  topicLabels: {
    "origines-moyen-age":              "Origines et Moyen Âge",
    "reforme-modernes":                "Réforme et Temps Modernes",
    "geneve-contemporaine":            "Genève contemporaine",
    "histoire-suisse":                 "Histoire de la Suisse",
    "organisation-federale":           "Organisation politique fédérale",
    "droits-democratie":               "Droits civiques & démocratie directe",
    "geographie-culture-suisse":       "Géographie, culture et société suisse",
    "institutions-geneve":             "Institutions politiques du canton de Genève",
    "services-publics-geneve":         "Services publics genevois",
    "geneve-quotidien":                "Genève au quotidien",
	"questions-essentielles":          "Questions essentielles"
  },

    maxSelectable: 12,
    allowMulti: true,
    questionCount: 10
  }
};

window.CivicLearnConfig = {
  country: "geneva",
  bankBase: "/geneva/banks/geneva"
};
