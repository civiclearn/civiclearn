/* CivicLearn Country Config — Denmark-PR (Medborgerskabsprøven) */

window.CIVIC_SITE_CODE = "dkpr";

/* Supabase project config — exposed on window so /assets/js/sync.js and
   /assets/js/reset.js can run. sync.js gates auto-sync on `window.SUPABASE_URL`
   being truthy; without these lines it exits silently and nothing syncs.
   Both keys are the same anon JWT used by dkpr-auth.js and the login page. */
window.SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
window.SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs";

/* Site-specific keys to include in sync. The engine writes
   `civiclearn_answered_mcqs` (persistent list of seen question IDs, used to
   filter out repeats) but sync.js's default SYNC_KEYS list doesn't include it.
   Adding it here ensures sync.js's pull and no-arg pushAll cover it. The engine
   also pushes it explicitly at session end (engine-dkpr.js line 1553). */
window.CIVIC_SYNC_EXTRA_KEYS = ["civiclearn_answered_mcqs"];

window.CIVICEDGE_CONFIG = {
  country: "dkpr",

  voiceLang: "da-DK",

  reviews: {
    enabled: true,
    threshold: 0.85,
    submitUrl: "https://civiclearn.app.n8n.cloud/webhook/civiclearn-review"
  },

  bank: {
    path: "/medborgerskab/banks/questions.json",
    format: "multilingual"
  },

  factofday: {
    path: "/medborgerskab/banks/factofday-dkpr.json"
  },

  manual: {
    chapters: []
  },

  flashcards: {
    mode: "topics-only",
    placeholder: ""
  },

  /* ─────────────────────────────────
     SIMULATION — Denmark-PR Citizenship
     30 min, 25 questions, 80% pass
     ───────────────────────────────── */
  simulation: {
    questionCount: 25,
    timeLimitMin: 30,
    passScore: 20,   // 20 / 25 = 80%

    topicQuotas: {
      "Democracy and Law": 6,
      "History and Culture": 5,
      "Work and Economy": 4,
      "Everyday Life": 3,
      "Children and Youth": 3,
      "Denmark in the World": 2,
      "Society and Environment": 2
    }
  },

  /* ─────────────────────────────────
     QUICK TEST
     ───────────────────────────────── */
  quicktest: {
    questionCount: 5
  },

  topics: {
    mode: "microtopics"
  }
};

/* Legacy compatibility */
window.CivicLearnConfig = {
  country: "dkpr",
  bankBase: "/medborgerskab/banks"
};

/* ENGINE BRIDGE */
window.CIVIC_CONFIG = window.CIVICEDGE_CONFIG;
