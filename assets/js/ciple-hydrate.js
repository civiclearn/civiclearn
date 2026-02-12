/* ============================================
   CIPLE Hydrate v1.0
   On page load, fetches completed test results
   from Supabase and writes them to localStorage
   so the dashboard displays them on any device.
   ============================================ */

(function () {
  "use strict";

  var ENDPOINT = "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/ciple-hydrate";
  var API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs";

  function getEmail() {
    return (localStorage.getItem("cl_email") || "").toLowerCase().trim();
  }

  function hydrate() {
    var email = getEmail();
    if (!email) return;

    // Don't hydrate if already done this session
    if (sessionStorage.getItem("ciple_hydrated")) return;

    fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY,
      },
      body: JSON.stringify({ email: email }),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("Hydrate HTTP " + res.status);
        return res.json();
      })
      .then(function (result) {
        var attempts = result.attempts || [];

        if (!attempts.length) {
          console.log("[CIPLE Hydrate] No remote attempts found.");
          sessionStorage.setItem("ciple_hydrated", "1");
          return;
        }

        var hydrated = 0;

        attempts.forEach(function (attempt) {
          var examId = attempt.exam_id;
          var key = "ciple_test_" + examId;

          // Check if we already have this test locally with a submission
          var existing = null;
          try {
            var raw = localStorage.getItem(key);
            if (raw) existing = JSON.parse(raw);
          } catch (e) {}

          // Skip if already submitted locally (local data is richer)
          if (existing && existing.submitted) return;

          // Build a lightweight test state from Supabase data
          var state = {
            exam_id: examId,
            started_at: attempt.submitted_at,
            submitted: true,
            submitted_at: attempt.submitted_at,
            result_id: attempt.id,
            sections: {
              reading: {
                completed: true,
                answers: {},
                score: attempt.reading_score != null ? Number(attempt.reading_score) : null,
                correct_count: attempt.reading_correct,
                total_questions: attempt.reading_total,
              },
              listening: {
                completed: true,
                answers: {},
                score: attempt.listening_score != null ? Number(attempt.listening_score) : null,
                correct_count: attempt.listening_correct,
                total_questions: attempt.listening_total,
              },
              writing: {
                completed: true,
                responses: {},
                score: attempt.writing_score != null ? Number(attempt.writing_score) : null,
              },
              speaking: {
                completed: true,
                recordings: {},
                score: attempt.speaking_score != null ? Number(attempt.speaking_score) : null,
              },
            },
          };

          localStorage.setItem(key, JSON.stringify(state));
          hydrated++;
        });

        console.log("[CIPLE Hydrate] Restored", hydrated, "test(s) from cloud.");
        sessionStorage.setItem("ciple_hydrated", "1");

        // Reload once so dashboard picks up the data
        if (hydrated > 0 && !sessionStorage.getItem("ciple_hydrate_reloaded")) {
          sessionStorage.setItem("ciple_hydrate_reloaded", "1");
          location.reload();
        }
      })
      .catch(function (err) {
        console.warn("[CIPLE Hydrate] Failed (non-blocking):", err.message);
      });
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(hydrate, 300);
    });
  } else {
    setTimeout(hydrate, 300);
  }
})();