/* ────────────────────────────────────────────────────────
   Dashboard Sequential Practice — Slovensko (v2)
   Uses main questions.json. Sequential order by topic+id.
   Writes to civicedge_progress (same keys as engine)
   so dashboard metrics update in real time.
   ──────────────────────────────────────────────────────── */

(function () {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  function boot() {
    initSequential().catch(err =>
      console.error("[Sequential] Init error:", err)
    );
  }

  async function initSequential() {
    const card = document.getElementById("seqCard");
    if (!card) return;

    const qTextEl    = document.getElementById("seqQuestion");
    const optionsEl  = document.getElementById("seqOptions");
    const counterEl  = document.getElementById("seqCounter");
    const btnPrev    = document.getElementById("seqPrev");
    const btnNext    = document.getElementById("seqNext");

    if (!qTextEl || !optionsEl || !btnPrev || !btnNext) {
      console.warn("[Sequential] Missing DOM elements");
      return;
    }

    const COUNTRY = (window.CIVICEDGE_CONFIG && window.CIVICEDGE_CONFIG.country) || "sk";
    const KEY_INDEX = `civiclearn:${COUNTRY}:dashseq:index`;
    const lang = window.CIVICEDGE_LANG || "sk";

    // Load bank
    const bankPath = window.CIVICEDGE_CONFIG?.bank?.path;
    if (!bankPath) { card.style.display = "none"; return; }

    let questions = [];
    try {
      const res = await fetch(bankPath);
      const raw = await res.json();
      questions = Array.isArray(raw) ? raw : (raw.questions || []);
    } catch (err) {
      console.error("[Sequential] Failed to load bank:", err);
      card.style.display = "none";
      return;
    }

    if (!questions.length) { card.style.display = "none"; return; }

    // Sort by topic then ID for stable sequential order
    questions.sort((a, b) => {
      const ta = (a.topic?.en || "").toLowerCase();
      const tb = (b.topic?.en || "").toLowerCase();
      if (ta !== tb) return ta.localeCompare(tb);
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    let currentIndex = clampIndex(readInt(KEY_INDEX, 0), questions.length);
    let answered = false;

    function render() {
      const q = questions[currentIndex];
      if (!q) return;

      writeInt(KEY_INDEX, currentIndex);

      const text = (typeof q.q === "object") ? (q.q[lang] || q.q.en || "") : (q.q || "");
      qTextEl.textContent = text;

      if (counterEl) {
        counterEl.textContent = `${currentIndex + 1} / ${questions.length}`;
      }

      optionsEl.innerHTML = "";
      answered = false;

      const rawOpts = (typeof q.options === "object" && !Array.isArray(q.options))
        ? (q.options[lang] || q.options.en || [])
        : (q.options || []);

      const correctIdx = typeof q.correctIndex === "number" ? q.correctIndex : 0;

      const optionObjects = rawOpts.map((text, i) => ({
        text: String(text),
        correct: i === correctIdx,
        originalIndex: i
      }));

      const shuffled = shuffleCopy(optionObjects);

      shuffled.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "seq-option";
        btn.textContent = opt.text;

        btn.addEventListener("click", () => {
          if (answered) return;
          answered = true;

          const isCorrect = opt.correct;

          recordToProgress(q, isCorrect);

          const correctOpt = shuffled.find(o => o.correct);
          recordToStats(q, isCorrect, opt.text, correctOpt ? correctOpt.text : "");

          const btns = optionsEl.querySelectorAll("button");
          btns.forEach(b => {
            b.disabled = true;
            b.classList.add("seq-answered");
          });

          btns.forEach(b => {
            const matchOpt = shuffled.find(o => o.text === b.textContent);
            if (matchOpt && matchOpt.correct) b.classList.add("seq-correct");
          });

          if (!isCorrect) btn.classList.add("seq-wrong");

          // Auto-advance after short delay
          setTimeout(() => {
            currentIndex = (currentIndex + 1) % questions.length;
            render();
          }, 1200);

          // Notify dashboard to refresh
          try {
            window.dispatchEvent(new CustomEvent("civiclearn:progress-updated", {
              detail: { country: COUNTRY }
            }));
          } catch {}
        });

        optionsEl.appendChild(btn);
      });
    }

    btnPrev.addEventListener("click", () => {
      currentIndex = (currentIndex - 1 + questions.length) % questions.length;
      render();
    });

    btnNext.addEventListener("click", () => {
      currentIndex = (currentIndex + 1) % questions.length;
      render();
    });

    render();

    // ── Write to civicedge_progress (engine-compatible format) ──

    function recordToProgress(q, correct) {
      try {
        const progress = JSON.parse(localStorage.getItem("civicedge_progress") || "{}");

        const microKey = q.microtopic && typeof q.microtopic === "object"
          ? q.microtopic.en : (q.microtopic || "");
        const key = `${microKey}:${q.id}`;

        const entry = progress[key] || {
          attempts: 0,
          rights: 0,
          wrongs: 0,
          correct: 0,
          topic: microKey
        };

        entry.attempts += 1;
        if (correct) {
          entry.rights += 1;
          entry.correct = 1;
        } else {
          entry.wrongs += 1;
        }
        entry.lastSeen = Date.now();

        progress[key] = entry;
        localStorage.setItem("civicedge_progress", JSON.stringify(progress));

        const answered = JSON.parse(localStorage.getItem("civiclearn_answered_mcqs") || "[]");
        if (!answered.includes(q.id)) {
          answered.push(q.id);
          localStorage.setItem("civiclearn_answered_mcqs", JSON.stringify(answered));
        }
      } catch {}
    }

    function recordToStats(q, correct, userAnswerText, correctAnswerText) {
      try {
        const raw = localStorage.getItem("civicedge_stats");
        const stats = raw ? JSON.parse(raw) : { history: [] };
        stats.history = stats.history || [];

        const todayKey = new Date().toISOString().slice(0, 10);
        const sessionId = `sess-sequential-${todayKey}`;

        let session = stats.history.find(s => s.id === sessionId);
        if (!session) {
          session = {
            id: sessionId,
            mode: "sequential",
            correct: 0,
            total: 0,
            percent: 0,
            startedAt: Date.now(),
            finishedAt: Date.now(),
            durationSec: 0,
            questions: []
          };
          stats.history.push(session);
        }
        session.mode = "sequential";

        session.total += 1;
        if (correct) session.correct += 1;
        session.percent = session.total > 0
          ? Math.round((session.correct / session.total) * 100) : 0;
        session.finishedAt = Date.now();
        session.durationSec = Math.round((session.finishedAt - session.startedAt) / 1000);

        session.questions.push({
          id: q.id,
          topic: q.microtopic?.en || "",
          topic_i18n: q.microtopic || {},
          correct: !!correct,
          firstAttemptCorrect: correct ? 1 : 0,
          qText: (typeof q.q === "object") ? (q.q[lang] || q.q.en || "") : (q.q || ""),
          userAnswerText: userAnswerText || "—",
          correctAnswerText: correctAnswerText || "—"
        });

        localStorage.setItem("civicedge_stats", JSON.stringify(stats));
      } catch {}
    }
  }

  // ── Utilities ──

  function shuffleCopy(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function readInt(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v === null) return fallback;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : fallback;
    } catch { return fallback; }
  }

  function writeInt(key, n) {
    try { localStorage.setItem(key, String(n)); } catch {}
  }

  function clampIndex(i, len) {
    if (!Number.isFinite(i) || len <= 0) return 0;
    return Math.max(0, Math.min(i, len - 1));
  }
})();
