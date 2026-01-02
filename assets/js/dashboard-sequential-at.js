// ============================================================
// DASHBOARD SEQUENTIAL PRACTICE — Austria
// VERSION: v1 (LAUNCH / REAL-LIFE TESTING)
// - Uses questions.json (real exam questions)
// - Sequential navigation, starting from Tarea 1
// - Persists last position
// - Records answers + aggregates stats in localStorage
// - Emits "civiclearn:progress-updated" for dashboard refresh
// ============================================================

(function () {
  // If injected after DOMContentLoaded, run immediately.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function boot() {
    initDashboardSequential().catch(err =>
      console.error("Dashboard sequential init error:", err)
    );
  }

  async function initDashboardSequential() {
    const card = document.getElementById("factOfDayCard");
    if (!card) return;

    const dateEl = document.getElementById("factDate");
    const factTextEl = document.getElementById("factText");
    const qBlock = document.getElementById("factQuestionBlock");
    const qTextEl = document.getElementById("factQuestion");
    const optionsEl = document.getElementById("factOptions");
    const feedbackEl = document.getElementById("factFeedback");

    const btnPrev = document.getElementById("factPrev");
    const btnNext = document.getElementById("factNext");

    // Hard fail if markup missing (prevents silent empty card)
    if (!qBlock || !qTextEl || !optionsEl || !btnPrev || !btnNext) {
      console.warn("Dashboard sequential: missing required DOM elements.");
      card.style.display = "none";
      return;
    }

    // Hide unused elements (we keep UI label as "Fact of the Day" but run sequential practice)
    if (factTextEl) factTextEl.style.display = "none";
    if (dateEl) dateEl.textContent = "";
    if (feedbackEl) feedbackEl.style.display = "none";

    // Country scope (keeps DK/LU clean later)
    const COUNTRY = (window.CIVICEDGE_CONFIG && window.CIVICEDGE_CONFIG.country) || "austria";

    // Storage keys (namespaced)
    const KEY_INDEX = `civiclearn:${COUNTRY}:dashseq:index`;
    const KEY_LOG = `civiclearn:${COUNTRY}:answers`;          // append-only log
    const KEY_STATS = `civiclearn:${COUNTRY}:stats`;          // aggregated stats

    // Ensure bank base is available
// Hard bind CCSE question bank (dashboard module must be autonomous)
    const bankBase = "/austria/banks/austria";

    let questions = [];
    try {
      const res = await fetch(`${bankBase}/questions.json`, { cache: "no-store" });
      questions = await res.json();
      if (!Array.isArray(questions)) throw new Error("questions.json invalid");
    } catch (err) {
      console.error("Failed to load questions.json:", err);
      card.style.display = "none";
      return;
    }
    // Austria dashboard: federal-only questions
questions = questions.filter(q => q.scope === "federal");

    if (questions.length === 0) {
      card.style.display = "none";
      return;
    }

    // Sort by Tarea number, then by id for stability
    questions.sort((a, b) => {
      const ta = tareaNumber(a && a.topic);
      const tb = tareaNumber(b && b.topic);
      if (ta !== tb) return ta - tb;
      return String(a && a.id || "").localeCompare(String(b && b.id || ""));
    });

    // Start from persisted index, otherwise 0 (Tarea 1)
    let currentIndex = clampIndex(readInt(KEY_INDEX, 0), questions.length);

    // Current render state: store shuffled options so navigation doesn't change order mid-question
    let currentShuffled = null; // [{text, correct}]
    let answered = false;

    function render() {
      const q = questions[currentIndex];
      if (!q || !q.q || !Array.isArray(q.options)) {
        card.style.display = "none";
        return;
      }

      // Persist position
      writeInt(KEY_INDEX, currentIndex);

      qBlock.style.display = "block";
      qTextEl.textContent = q.q;

      // Reset UI
      optionsEl.innerHTML = "";
      if (feedbackEl) feedbackEl.style.display = "none";
      answered = false;

      // Build option objects (2–3 options supported)
      const optionObjects = (Array.isArray(q.options) ? q.options : [])
  .filter(opt => typeof opt === "string" && opt.trim() !== "")
  .map((opt, idx) => ({
    text: opt.trim(),
    correct: idx === q.correctIndex
  }));


      if (optionObjects.length === 0) {
        card.style.display = "none";
        return;
      }

      // Shuffle per-render (but keep stable until you navigate away)
      currentShuffled = shuffleCopy(optionObjects);

      const correctIndex = currentShuffled.findIndex(o => o.correct);

      currentShuffled.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "fact-option-btn";
        btn.textContent = opt.text;

        btn.addEventListener("click", () => {
          if (answered) return;
          answered = true;

          const isCorrect = idx === correctIndex;

          // Record to storage (log + aggregates)
          recordAnswer({
            id: q.id,
            topic: q.topic,
            correct: isCorrect,
            mode: "dashboard"
          });

          // Paint UI feedback
          const btns = optionsEl.querySelectorAll("button");
          btns.forEach((b, i) => {
            b.disabled = true;
            if (i === correctIndex) b.classList.add("fact-correct");
            if (i === idx && i !== correctIndex) b.classList.add("fact-wrong");
          });

          // Optional tick/cross element (kept hidden by your CSS; leave it here for future)
          if (feedbackEl) {
            feedbackEl.textContent = isCorrect ? "✓" : "✗";
            feedbackEl.style.display = "none";
          }

          // Notify dashboard to refresh counters/bars if it knows how
          try {
            window.dispatchEvent(new CustomEvent("civiclearn:progress-updated", {
              detail: { country: COUNTRY, source: "dashboard-sequential" }
            }));
          } catch {}
        });

        optionsEl.appendChild(btn);
      });
    }

    // Navigation: keep it sequential
    btnPrev.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + questions.length) % questions.length;
      render();
    });

    btnNext.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % questions.length;
      render();
    });

    render();

    // ------------------------------
    // Recording + Aggregation
    // ------------------------------

    function recordAnswer({ id, topic, correct, mode }) {
      const ts = Date.now();

      // 1) Append-only log
      try {
        const raw = localStorage.getItem(KEY_LOG);
        const arr = raw ? JSON.parse(raw) : [];
        arr.push({ id, topic, correct: !!correct, mode: mode || "dashboard", ts });
        localStorage.setItem(KEY_LOG, JSON.stringify(arr));
      } catch (e) {
        console.warn("Dashboard sequential: failed to write answer log:", e);
      }

      // 2) Aggregated stats (fast for dashboard bars)
      try {
        const rawS = localStorage.getItem(KEY_STATS);
        const stats = rawS ? JSON.parse(rawS) : {
          answered: 0,
          correct: 0,
          wrong: 0,
          byTopic: {} // topic -> { answered, correct, wrong }
        };

        stats.answered = (stats.answered || 0) + 1;
        if (correct) stats.correct = (stats.correct || 0) + 1;
        else stats.wrong = (stats.wrong || 0) + 1;

        const t = String(topic || "unknown");
        if (!stats.byTopic[t]) stats.byTopic[t] = { answered: 0, correct: 0, wrong: 0 };
        stats.byTopic[t].answered += 1;
        if (correct) stats.byTopic[t].correct += 1;
        else stats.byTopic[t].wrong += 1;

        localStorage.setItem(KEY_STATS, JSON.stringify(stats));
      } catch (e) {
        console.warn("Dashboard sequential: failed to write aggregated stats:", e);
      }
    }
  }

  // ------------------------------
  // Utilities
  // ------------------------------

  function shuffleCopy(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function tareaNumber(topic) {
    const s = String(topic || "").toLowerCase();
    // Accept "Tarea 1", "tarea 1", "TAREA 1"
    const m = s.match(/tarea\s*(\d+)/);
    if (!m) return 999;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : 999;
  }

  function readInt(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v === null || v === undefined) return fallback;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }

  function writeInt(key, n) {
    try {
      localStorage.setItem(key, String(n));
    } catch {}
  }

  function clampIndex(i, len) {
    if (!Number.isFinite(i) || len <= 0) return 0;
    if (i < 0) return 0;
    if (i >= len) return len - 1;
    return i;
  }
})();
