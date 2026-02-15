/* ============================================
   YKI Hydrate v1.0
   On page load, fetches completed test results
   from Supabase and writes them to localStorage
   so the dashboard displays them on any device.
   ============================================ */
(function () {
  "use strict";

  var ENDPOINT = "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/yki-hydrate";
  var APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs";

  function hydrate() {
    // Already hydrated this session?
    if (sessionStorage.getItem("yki_hydrated")) {
      console.log("[YKI Hydrate] Already hydrated this session, skipping.");
      return;
    }

    var email = (localStorage.getItem("cl_email") || "").toLowerCase().trim();
    if (!email) {
      console.log("[YKI Hydrate] No email found, skipping.");
      return;
    }

    console.log("[YKI Hydrate] Fetching cloud data for:", email);

    fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": APIKEY,
        "Authorization": "Bearer " + APIKEY
      },
      body: JSON.stringify({ email: email })
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (result) {
        var attempts = result.attempts || [];
        if (!attempts.length) {
          console.log("[YKI Hydrate] No remote data found.");
          sessionStorage.setItem("yki_hydrated", "1");
          return;
        }

        var hydrated = 0;

        attempts.forEach(function (attempt) {
          var examId = attempt.exam_id; // e.g. "yki-01"
          var key = "yki_test_" + examId;

          // Don't overwrite richer local data (with recordings/responses)
          var existing = localStorage.getItem(key);
          if (existing) {
            try {
              var local = JSON.parse(existing);
              if (local.submitted) {
                // Already have full local data, skip
                return;
              }
            } catch (_) {}
          }

          // Build lightweight localStorage entry matching YKIEngine.getTestState format
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

        console.log("[YKI Hydrate] Restored", hydrated, "test(s) from cloud.");
        sessionStorage.setItem("yki_hydrated", "1");

        // Reload once so dashboard picks up the data
        if (hydrated > 0 && !sessionStorage.getItem("yki_hydrate_reloaded")) {
          sessionStorage.setItem("yki_hydrate_reloaded", "1");
          location.reload();
        }
      })
      .catch(function (err) {
        console.warn("[YKI Hydrate] Failed (non-blocking):", err.message);
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
