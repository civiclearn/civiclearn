/* CivicLearn Country Config — Spain CCSE
   Monolingual · Classic engine · Topic-constrained simulation
*/

window.CIVICEDGE_CONFIG = {
  country: "ccse",

  
  voiceLang: "es-ES",



  bank: {
    path: "/ccse/banks/ccse/questions.json",
    format: "flat"
  },



  ccse: {
    
    blocks: {
      gobierno: {
        weight: 0.6,
        topics: ["Tarea 1", "Tarea 2", "Tarea 3"]
      },
      cultura: {
        weight: 0.4,
        topics: ["Tarea 4", "Tarea 5"]
      }
    }
  },



simulation: {
  /* Simulation type */
  mode: "topic-quotas",

  /* Official CCSE exam format */
  questionCount: 25,
  timeLimitMin: 45,
  passScore: 15,

  /* Scoring rules */
  scoring: {
    correct: 1,
    incorrect: 0,
    blank: 0
  },

  /* OFFICIAL CCSE DISTRIBUTION (BY TAREA) */
  topicCounts: {
    "Tarea 1": 10,
    "Tarea 2": 3,
    "Tarea 3": 2,
    "Tarea 4": 3,
    "Tarea 5": 7
  }
},



  quicktest: {
    questionCount: 5
  },

  flashcards: {
    mode: "topics-only",
    placeholder: "/assets/images/icons/flag-watermark-es.jpg"
  },



topics: {
  list: [
    "Tarea 1",
    "Tarea 2",
    "Tarea 3",
    "Tarea 4",
    "Tarea 5"
  ],

  topicLabels: {
    "Tarea 1": "Tarea 1",
    "Tarea 2": "Tarea 2",
    "Tarea 3": "Tarea 3",
    "Tarea 4": "Tarea 4",
    "Tarea 5": "Tarea 5"
  },

  allowMulti: true
}

};


window.CivicLearnConfig = {
  country: "ccse",
  bankBase: "/ccse/banks/ccse"
};
