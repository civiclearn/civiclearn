/* ============================================
   Sproochentest Hydrate v1.0
   On page load, fetches completed test results
   from Supabase and writes them to localStorage
   so the dashboard displays them on any device.
   ============================================ */
(function () {
  "use strict";

  var ENDPOINT = "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/sproochentest-hydrate";
  var APIKEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs";

  function hydrate() {
    if (sessionStorage.getItem("sproochentest_hydrated")) {
      console.log("[Sproochentest Hydrate] Already hydrated this session, skipping.");
      return;
    }

    var email = (localStorage.getItem("cl_email") || "").toLowerCase().trim();
    if (!email) {
      console.log("[Sproochentest Hydrate] No email found, skipping.");
      return;
    }

    console.log("[Sproochentest Hydrate] Fetching cloud data for:", email);

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
          console.log("[Sproochentest Hydrate] No remote data found.");
          sessionStorage.setItem("sproochentest_hydrated", "1");
          return;
        }

        var hydrated = 0;

        attempts.forEach(function (attempt) {
          var examId = attempt.exam_id; // e.g. "sproochentest-01"
          var key = "sproochentest_" + examId;

          // Don't overwrite richer local data
          var existing = localStorage.getItem(key);
          if (existing) {
            try {
              var local = JSON.parse(existing);
              if (local.submitted) return;
            } catch (_) {}
          }

          // Build lightweight localStorage entry matching SproochEngine format
          var state = {
            exam_id: examId,
            started_at: attempt.submitted_at,
            submitted: true,
            submitted_at: attempt.submitted_at,
            result_id: attempt.id,
            sections: {
              speaking: {
                completed: true,
                responses: {},
                score: attempt.speaking_score != null ? Number(attempt.speaking_score) : null,
              },
              listening: {
                completed: true,
                answers: {},
                score: attempt.listening_score != null ? Number(attempt.listening_score) : null,
                correct_count: attempt.listening_correct,
                total_questions: attempt.listening_total,
              },
            },
          };

          localStorage.setItem(key, JSON.stringify(state));
          hydrated++;
        });

        console.log("[Sproochentest Hydrate] Restored", hydrated, "test(s) from cloud.");
        sessionStorage.setItem("sproochentest_hydrated", "1");

        if (hydrated > 0 && !sessionStorage.getItem("sproochentest_hydrate_reloaded")) {
          sessionStorage.setItem("sproochentest_hydrate_reloaded", "1");
          location.reload();
        }
      })
      .catch(function (err) {
        console.warn("[Sproochentest Hydrate] Failed (non-blocking):", err.message);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(hydrate, 300);
    });
  } else {
    setTimeout(hydrate, 300);
  }
})();
