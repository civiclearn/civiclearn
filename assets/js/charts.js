/* ==========================================================================
   CivicEdge — Tests & Simulations Charts
   File: charts.js
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------------------------------------------------------
     1) TOP METRICS (small header strip)
     --------------------------------------------------------------- */
  const stats = JSON.parse(localStorage.getItem("civicedge_stats") || "{}");
  const settings = JSON.parse(localStorage.getItem("civicedge_settings") || "{}");

  // Helper: safe element setter
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // Countdown
  if (settings.test_date) {
    const d = new Date(settings.test_date);
    const diff = Math.ceil((d - Date.now()) / 86400000);
    setText("tmCountdown", diff > 0 ? `J-${diff}` : "Aujourd’hui");
  } else {
    setText("tmCountdown", "—");
  }

  // Total answered
  setText("tmAnswered", stats.answered || 0);

  // Total time spent
  const minutes = stats.minutes || 0;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  setText("tmTime", `${h}h ${String(m).padStart(2, "0")}m`);

  // Question of the day
  setText("tmQOTD", localStorage.getItem("civicedge_qotd") || "…");


  /* ---------------------------------------------------------------
     2) SAFETY: exit if Chart.js is not available
     --------------------------------------------------------------- */
  if (typeof Chart === "undefined") {
    console.warn("Chart.js not loaded — charts not displayed.");
    return;
  }


  /* ---------------------------------------------------------------
     3) GLOBAL PROGRESSION (donut)
     --------------------------------------------------------------- */
  const globalCanvas = document.getElementById("globalChart");
  if (globalCanvas) {
    const globalCtx = globalCanvas.getContext("2d");

    new Chart(globalCtx, {
      type: "doughnut",
      data: {
        labels: ["Maîtrisé", "Reste"],
        datasets: [
          {
            data: [35, 65], // placeholder
            backgroundColor: ["#4f46e5", "#e5e7eb"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false },
        },
      },
    });
  }


  /* ---------------------------------------------------------------
     4) PAR CHAPITRES (bar chart)
     --------------------------------------------------------------- */
  const topicsCanvas = document.getElementById("topicsChart");
  if (topicsCanvas) {
    const topicsCtx = topicsCanvas.getContext("2d");

    new Chart(topicsCtx, {
      type: "bar",
      data: {
        labels: ["Histoire", "Gouv.", "Société", "Culture", "Valeurs"],
        datasets: [
          {
            label: "Pourcentage maîtrisé",
            data: [40, 60, 20, 50, 70], // placeholder
            backgroundColor: "#7c3aed",
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: { beginAtZero: true, max: 100 },
          x: { ticks: { color: "var(--ink)" } },
        },
      },
    });
  }


  /* ---------------------------------------------------------------
     5) COUNTDOWN TEST (donut)
     --------------------------------------------------------------- */
  const countdownCanvas = document.getElementById("countdownChart");
  if (countdownCanvas) {
    const countdownCtx = countdownCanvas.getContext("2d");

    new Chart(countdownCtx, {
      type: "doughnut",
      data: {
        labels: ["Restant", "Passé"],
        datasets: [
          {
            data: [12, 18], // placeholder
            backgroundColor: ["#10b981", "#e5e7eb"],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { display: false },
        },
      },
    });
  }
});


/* ---------------------------------------------------------------
   TOP METRICS (small header strip)
   --------------------------------------------------------------- */

const stats = JSON.parse(localStorage.getItem("civicedge_stats") || "{}");
const settings = JSON.parse(localStorage.getItem("civicedge_settings") || "{}");

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* Countdown */
const picker = document.getElementById("tmPicker");
if (picker) {
  picker.value = settings.test_date || "";
  picker.addEventListener("change", () => {
    settings.test_date = picker.value;
    localStorage.setItem("civicedge_settings", JSON.stringify(settings));
    location.reload();
  });
}

if (settings.test_date) {
  const d = new Date(settings.test_date);
  const diff = Math.ceil((d - Date.now()) / 86400000);
  setValue("tmCountdown", diff > 0 ? `J-${diff}` : "Aujourd’hui");
} else {
  setValue("tmCountdown", "—");
}

/* Total answered */
setValue("tmAnswered", stats.answered || 0);

/* Time spent */
const minutes = stats.minutes || 0;
const h = Math.floor(minutes / 60);
const m = minutes % 60;
setValue("tmTime", `${h}h ${String(m).padStart(2, "0")}m`);

/* Question of the day */
setValue("tmQOTD", localStorage.getItem("civicedge_qotd") || "…");

/* ===========================================================
   STACKED AREA — CORRECT / INCORRECT / NON TENTÉ
   WITH ALWAYS-VISIBLE INLINE LABELS (NO HOVER)
   =========================================================== */

if (document.getElementById("stackedAreaChart")) {

  const ctx = document.getElementById("stackedAreaChart").getContext("2d");

  // Example data
  const labels = ["S1","S2","S3","S4","S5","S6","S7","S8","S9","S10"];
  const correct =     [20, 22, 25, 28, 32, 40, 48, 55, 60, 70];
  const incorrect =   [50, 48, 45, 40, 35, 30, 25, 20, 15, 10];
  const unattempted = [30, 30, 30, 32, 33, 30, 27, 25, 25, 20];

  new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Correct",
          data: correct,
          fill: true,
          tension: 0,
          backgroundColor: "rgba(16, 185, 129, 0.40)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 2
        },
        {
          label: "Incorrect",
          data: incorrect,
          fill: true,
          tension: 0,
          backgroundColor: "rgba(239, 68, 68, 0.35)",
          borderColor: "rgba(239, 68, 68, 1)",
          borderWidth: 2
        },
        {
          label: "Non tenté",
          data: unattempted,
          fill: true,
          tension: 0,
          backgroundColor: "rgba(234, 179, 8, 0.35)",
          borderColor: "rgba(234, 179, 8, 1)",
          borderWidth: 2
        }
      ]
    },

    options: {
      maintainAspectRatio: false,
      responsive: true,

      plugins: {
  legend: {
    display: false,
    position: "bottom",
    labels: {
      usePointStyle: true,
      pointStyle: "circle",
      padding: 20,
      font: {
        size: 14,
        weight: "600"
      },
      color: "#111"
    }
  },
  datalabels: { display: false }   // ← Remove all point labels
},


      scales: {
        x: {
          display: true,
          title: { display: true, text: "Progression dans le temps" }
        },
        y: {
          display: true,
          min: 0,
          max: 100,
          title: { display: true, text: "Distribution des réponses (%)" }
        }
      }
    },

    plugins: [ChartDataLabels]
  });
}
/* =======================================================================
   DASHBOARD METRICS (ACCURACY + STUDY STREAK)
   Entire block is self-contained — no other calls needed.
   ======================================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* --- ACCURACY ------------------------------------------------------- */
  (function updateAccuracy() {
    let stats = JSON.parse(localStorage.getItem("civicedge_stats") || "{}");

    let correct = stats.correct || 0;
    let incorrect = stats.incorrect || 0;
    let total = correct + incorrect;

    let accuracy = 0;
    if (total > 0) {
      accuracy = Math.round((correct / total) * 100);
    }

    const el = document.getElementById("tmAccuracy");
    if (el) el.textContent = accuracy + "%";
  })();


  /* --- STUDY STREAK --------------------------------------------------- */
  (function updateStreak() {
    const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD

    let streak = parseInt(localStorage.getItem("studyStreak") || "0", 10);
    let lastStudy = localStorage.getItem("lastStudyDate");

    // If never studied before → initialize
    if (!lastStudy) {
      localStorage.setItem("lastStudyDate", today);
      localStorage.setItem("studyStreak", "0");

      const el = document.getElementById("tmStreak");
      if (el) el.textContent = "0 jour";
      return;
    }

    // Compare days
    let diffDays = Math.floor(
      (new Date(today) - new Date(lastStudy)) / (1000*60*60*24)
    );

    if (diffDays === 0) {
      // Studied today → streak unchanged
    } else if (diffDays === 1) {
      // Studied yesterday → streak +1
      streak += 1;
    } else {
      // Missed 2+ days → reset
      streak = 0;
    }

    // Save new values
    localStorage.setItem("studyStreak", streak.toString());
    localStorage.setItem("lastStudyDate", today);

    // Write to tile
    const el = document.getElementById("tmStreak");
    if (el) el.textContent = streak + (streak <= 1 ? " jour" : " jours");
  })();

});
