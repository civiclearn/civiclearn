/* ────────────────────────────────────────────────────────
   CivicEdge History — Slovensko
   Reads from localStorage (MCQ sessions) and Supabase
   (sk_article_attempts). Slovak strings inlined — no i18n.
   ──────────────────────────────────────────────────────── */

(function () {
  "use strict";

  let historySessions = [];
  let articleAttempts = [];
  let currentOpenIndex = -1;
  let currentOpenArticleId = null;

  // --------- Slovak pluralization helpers ---------

  function pluralRelacie(n) {
    if (n === 1) return "1 relácia";
    if (n >= 2 && n <= 4) return n + " relácie";
    return n + " relácií";
  }

  function pluralOtazok(n) {
    if (n === 1) return "1 otázka";
    if (n >= 2 && n <= 4) return n + " otázky";
    return n + " otázok";
  }

  // --------- Helpers ---------

  function getTopicDisplayFromRaw(raw) {
    if (!raw) return "";
    const lang = (document.documentElement.lang || "sk").split("-")[0];

    if (raw.topic_i18n && raw.topic_i18n[lang]) return raw.topic_i18n[lang];
    if (raw.topic_i18n && raw.topic_i18n.en) return raw.topic_i18n.en;

    return raw.topicLabel || raw.topic || "";
  }

  function readStats() {
    try {
      const raw = localStorage.getItem("civicedge_stats") || "{}";
      const stats = JSON.parse(raw);
      if (!stats || typeof stats !== "object") return [];
      return Array.isArray(stats.history) ? stats.history.slice().reverse() : [];
    } catch (e) {
      console.error("History: failed to read civicedge_stats", e);
      return [];
    }
  }

  async function readArticleAttempts() {
    if (!window.supabase) return [];
    const SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
    // Try to get anon key from existing auth or fall back
    const anonKey = (window.slovenskoAuth?.supabase?.supabaseKey)
      || document.querySelector('script[data-sb-anon-key]')?.dataset?.sbAnonKey
      || null;

    // If we have a session already, use it directly
    let sb;
    if (window.slovenskoAuth?.supabase) {
      sb = window.slovenskoAuth.supabase;
    } else {
      // Best-effort: rely on a globally-created client on the page
      sb = window.__skSupabase || null;
    }
    if (!sb) return [];

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return [];

      const { data, error } = await sb
        .from("sk_article_attempts")
        .select("id, article_id, created_at, completed_at, eval_status, grade_overall, grade_fidelity, grade_completeness, grade_language, grade_coherence, feedback_captured, feedback_missed, feedback_language, summary_text")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("sk_article_attempts read:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn("article attempts fetch:", e);
      return [];
    }
  }

  function getDateKey(session) {
    const tryMake = (val) => {
      if (!val) return null;
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
      } catch (e) {}
      return null;
    };

    const key =
      tryMake(session.startedAt) ||
      tryMake(session.timestamp) ||
      tryMake(session.created_at) ||
      (typeof session.date === "string" && session.date.length >= 10
        ? session.date.slice(0, 10)
        : null);

    return key || "0000-00-00";
  }

  function localizedDate(d, opts) {
    return d.toLocaleDateString("sk-SK", opts);
  }

  function formatDayHeader(dateKey, count) {
    const countLabel = pluralRelacie(count);

    if (!dateKey || dateKey === "0000-00-00") {
      return `Neznámy dátum • ${countLabel}`;
    }

    const d = new Date(dateKey + "T00:00:00");
    const weekday = localizedDate(d, { weekday: "long" });
    const fullDate = localizedDate(d, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);

    return `${weekdayCap} — ${fullDate} • ${countLabel}`;
  }

  function modeLabel(mode) {
    switch (mode) {
      case "simulation": return "Simulácia";
      case "quick":      return "Rýchly test";
      case "sequential": return "Postupné precvičovanie";
      case "topics":     return "Podľa tém";
      case "traps":      return "Časté chyby";
      case "article":    return "Článok a súhrn";
      default:           return "Relácia";
    }
  }

  function scoreClass(percent, total) {
    if (!total || !Number.isFinite(percent)) return "score-empty";
    if (percent >= 80) return "score-good";
    if (percent >= 50) return "score-mid";
    return "score-bad";
  }

  function getDurationMin(session) {
    if (session.durationSec != null && Number.isFinite(session.durationSec)) {
      const m = Math.round(session.durationSec / 60);
      return m > 0 ? m : 1;
    }
    if (session.durationMin != null && Number.isFinite(session.durationMin)) {
      return session.durationMin;
    }
    if (session.duration != null && Number.isFinite(session.duration)) {
      return session.duration;
    }
    return null;
  }

  // --------- Rendering main list ---------

  async function renderHistory() {
    const listEl = document.getElementById("historyList");
    if (!listEl) return;

    const mcqSessions = readStats();
    articleAttempts = await readArticleAttempts();

    // Convert article attempts into session-like objects so they group with MCQ history
    const articleSessions = articleAttempts.map((a, i) => ({
      _type: "article",
      _attempt: a,
      id: `article-${a.id}`,
      mode: "article",
      created_at: a.created_at,
      percent: a.grade_overall != null ? gradeToPercent(a.grade_overall) : null,
      total: null,                    // not a question count
      correct: null,
      durationSec: null,
      questions: [],
      article_grade: a.grade_overall,
      eval_status: a.eval_status
    }));

    const allSessions = [...mcqSessions, ...articleSessions].sort((a, b) => {
      const keyA = getDateKey(a);
      const keyB = getDateKey(b);
      return keyB.localeCompare(keyA);
    });

    if (!allSessions.length) {
      listEl.innerHTML = `<p class="muted">Zatiaľ žiadna história cvičenia.</p>`;
      return;
    }

    historySessions = allSessions;

    const groups = new Map();
    allSessions.forEach((s, idx) => {
      const key = getDateKey(s);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ index: idx, session: s });
    });

    const keys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

    listEl.innerHTML = "";

    keys.forEach((key) => {
      const group = groups.get(key);
      const count = group.length;

      const day = document.createElement("div");
      day.className = "history-day";
      day.setAttribute("data-open", "false");

      const headerBtn = document.createElement("button");
      headerBtn.type = "button";
      headerBtn.className = "history-day-header";

      const main = document.createElement("div");
      main.className = "history-day-header-main";
      main.innerHTML = `
        <svg class="day-arrow" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M5 3l5 5-5 5"
            fill="none" stroke="currentColor"
            stroke-width="1.8" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
        <span class="history-day-header-text">
          ${formatDayHeader(key, count)}
        </span>
      `;

      const countSpan = document.createElement("span");
      countSpan.className = "history-day-count";
      countSpan.textContent = pluralRelacie(count);

      headerBtn.appendChild(main);
      headerBtn.appendChild(countSpan);

      const body = document.createElement("div");
      body.className = "history-day-body";

      group.forEach(({ index, session }) => {
        const itemWrapper = document.createElement("div");
        itemWrapper.className = "item-wrapper";

        const item = document.createElement("div");
        item.className = "item";
        item.dataset.index = index;

        const h = document.createElement("div");
        h.className = "history-item-header";
        h.textContent = modeLabel(session.mode);

        const meta = document.createElement("div");
        meta.className = "history-item-meta";

        if (session._type === "article") {
          // Article-specific meta
          const g = session.article_grade;
          const statusText = session.eval_status === "done" ? (g != null ? `Známka: ${g}` : "—")
                           : session.eval_status === "failed" ? "Vyhodnotenie zlyhalo"
                           : "Čaká na vyhodnotenie";
          meta.textContent = statusText;
        } else {
          const dur = getDurationMin(session);
          meta.textContent = `${session.percent ?? "—"}% — ${pluralOtazok(session.total ?? 0)} — ${dur ?? "—"} min`;
        }

        const pill = document.createElement("div");
        if (session._type === "article") {
          if (session.eval_status === "done" && session.article_grade != null) {
            pill.className = `history-item-score ${articleGradeClass(session.article_grade)}`;
            pill.textContent = String(session.article_grade);
          } else {
            pill.className = "history-item-score score-empty";
            pill.textContent = "–";
          }
        } else {
          pill.className = `history-item-score ${scoreClass(session.percent, session.total)}`;
          pill.textContent = session.total ? `${session.percent ?? 0}%` : "Bez skóre";
        }

        item.appendChild(h);
        item.appendChild(meta);
        item.appendChild(pill);

        itemWrapper.appendChild(item);
        item.addEventListener("click", () =>
          openHistoryDetails(index, itemWrapper)
        );

        body.appendChild(itemWrapper);
      });

      headerBtn.addEventListener("click", () => {
        const isOpen = day.getAttribute("data-open") === "true";
        const nowOpen = !isOpen;
        day.setAttribute("data-open", nowOpen ? "true" : "false");
        body.style.display = nowOpen ? "block" : "none";
      });

      day.appendChild(headerBtn);
      day.appendChild(body);
      listEl.appendChild(day);
    });
  }

  // Grade 1-5 → approx. percent
  function gradeToPercent(g) {
    return Math.round((6 - g) * 20);
  }

  function articleGradeClass(g) {
    if (g <= 2) return "score-good";
    if (g <= 3) return "score-mid";
    return "score-bad";
  }

  // --------- Details panel ---------

  async function openHistoryDetails(idx, anchorEl) {
    const session = historySessions[idx];
    if (!session || !anchorEl) return;

    if (currentOpenIndex === idx) {
      currentOpenIndex = -1;
      anchorEl.querySelector(".inline-details-panel")?.remove();
      anchorEl.classList.remove("item-open");
      return;
    }

    document.querySelectorAll(".item-wrapper").forEach((el) => {
      el.querySelector(".inline-details-panel")?.remove();
      el.classList.remove("item-open");
    });

    currentOpenIndex = idx;

    const panel = document.createElement("div");
    panel.className = "inline-details-panel";
    panel.style.marginTop = "10px";
    panel.style.marginBottom = "20px";
    panel.style.padding = "18px 18px 22px";
    panel.style.borderRadius = "12px";
    panel.style.background = "var(--card)";
    panel.style.border = "1px solid var(--line)";
    panel.style.position = "relative";

    anchorEl.appendChild(panel);
    anchorEl.classList.add("item-open");

    if (session._type === "article") {
      panel.innerHTML = renderArticleDetails(session._attempt);
    } else {
      panel.innerHTML = renderMcqDetails(session);
    }
    attachClose(panel, anchorEl);
  }

  function renderArticleDetails(a) {
    const dateKey = a.created_at ? a.created_at.slice(0, 10) : "0000-00-00";
    let longDate;
    if (dateKey && dateKey !== "0000-00-00") {
      const d = new Date(dateKey + "T00:00:00");
      longDate = localizedDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      longDate = longDate.charAt(0).toUpperCase() + longDate.slice(1);
    } else {
      longDate = "Neznámy dátum";
    }

    const g = a.grade_overall;
    const gradeNames = { 1: "Výborný", 2: "Chválitebný", 3: "Dobrý", 4: "Dostatočný", 5: "Nedostatočný" };

    if (a.eval_status !== "done") {
      return `
        <div class="history-details-header">
          <div class="hd-title"><strong>${longDate}</strong></div>
          <button class="close-btn" id="closeHistoryDetails" aria-label="Zavrieť">×</button>
        </div>
        <div class="history-review-summary">
          <div><strong>Článok:</strong> ${a.article_id}</div>
          <div><strong>Stav:</strong> ${a.eval_status === "failed" ? "Vyhodnotenie zlyhalo" : "Čaká na vyhodnotenie"}</div>
        </div>
        <h3 style="margin-top:16px;margin-bottom:10px;">Váš súhrn</h3>
        <div style="background:var(--bg-muted,#f9fafb);padding:14px;border-radius:8px;white-space:pre-wrap;font-size:0.92rem;line-height:1.6;">
          ${escapeHtml(a.summary_text || "")}
        </div>
      `;
    }

    return `
      <div class="history-details-header">
        <div class="hd-title"><strong>${longDate}</strong></div>
        <button class="close-btn" id="closeHistoryDetails" aria-label="Zavrieť">×</button>
      </div>

      <div class="history-review-summary">
        <div><strong>Článok:</strong> ${a.article_id}</div>
        <div><strong>Celková známka:</strong> ${g} — ${gradeNames[g] || ""}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:8px;margin:16px 0;">
        <div style="background:var(--accent-soft,#e8efff);padding:10px 12px;border-radius:8px;">
          <div style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Vernosť obsahu</div>
          <div style="font-size:1.1rem;font-weight:700;">${a.grade_fidelity ?? "–"}</div>
        </div>
        <div style="background:var(--accent-soft,#e8efff);padding:10px 12px;border-radius:8px;">
          <div style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Úplnosť</div>
          <div style="font-size:1.1rem;font-weight:700;">${a.grade_completeness ?? "–"}</div>
        </div>
        <div style="background:var(--accent-soft,#e8efff);padding:10px 12px;border-radius:8px;">
          <div style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Jazyk</div>
          <div style="font-size:1.1rem;font-weight:700;">${a.grade_language ?? "–"}</div>
        </div>
        <div style="background:var(--accent-soft,#e8efff);padding:10px 12px;border-radius:8px;">
          <div style="font-size:0.78rem;color:var(--text-muted,#6b7280);">Súdržnosť</div>
          <div style="font-size:1.1rem;font-weight:700;">${a.grade_coherence ?? "–"}</div>
        </div>
      </div>

      <h4 style="margin:18px 0 6px 0;font-size:0.88rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--accent,#0B4EA2);">✓ Čo sa vám podarilo</h4>
      <p style="white-space:pre-wrap;margin:0 0 12px 0;font-size:0.92rem;line-height:1.6;">${escapeHtml(a.feedback_captured || "")}</p>

      <h4 style="margin:18px 0 6px 0;font-size:0.88rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--accent,#0B4EA2);">⚠ Čo bolo nepresné alebo chýbalo</h4>
      <p style="white-space:pre-wrap;margin:0 0 12px 0;font-size:0.92rem;line-height:1.6;">${escapeHtml(a.feedback_missed || "")}</p>

      <h4 style="margin:18px 0 6px 0;font-size:0.88rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--accent,#0B4EA2);">✎ Jazykové odporúčania</h4>
      <p style="white-space:pre-wrap;margin:0 0 16px 0;font-size:0.92rem;line-height:1.6;">${escapeHtml(a.feedback_language || "")}</p>

      <details style="margin-top:16px;">
        <summary style="cursor:pointer;font-size:0.88rem;color:var(--text-muted,#6b7280);">Zobraziť môj súhrn</summary>
        <div style="background:var(--bg-muted,#f9fafb);padding:14px;border-radius:8px;white-space:pre-wrap;font-size:0.9rem;line-height:1.6;margin-top:8px;">
          ${escapeHtml(a.summary_text || "")}
        </div>
      </details>
    `;
  }

  function renderMcqDetails(session) {
    const dateKey = getDateKey(session);
    let longDate;
    if (dateKey && dateKey !== "0000-00-00") {
      const d = new Date(dateKey + "T00:00:00");
      longDate = localizedDate(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      longDate = longDate.charAt(0).toUpperCase() + longDate.slice(1);
    } else {
      longDate = "Neznámy dátum";
    }

    const dur = getDurationMin(session);
    const durationLabel = dur != null ? `${dur} min` : "Nedostupné";

    let html = `
      <div class="history-details-header">
        <div class="hd-title"><strong>${longDate}</strong></div>
        <button class="close-btn" id="closeHistoryDetails" aria-label="Zavrieť">×</button>
      </div>

      <div class="history-review-summary">
        <div><strong>Skóre:</strong>
          ${session.percent ?? "—"}% (${session.correct ?? "?"}/${session.total ?? "?"})
        </div>
        <div><strong>Trvanie:</strong> ${durationLabel}</div>
        <div><strong>Režim:</strong> ${modeLabel(session.mode)}</div>
      </div>

      <h3 style="margin-top:8px;margin-bottom:10px;">Otázky v tejto relácii</h3>
    `;

    const qList = Array.isArray(session.questions) ? session.questions : [];
    const attemptLog = Array.isArray(session.attemptLog) ? session.attemptLog : [];

    // TOPICS MODE (wave display)
    if (session.mode === "topics" && attemptLog.length > qList.length) {
      const qMap = new Map();
      qList.forEach((q) => qMap.set(q.id, q));

      const groupedAttempts = attemptLog.reduce((acc, attempt) => {
        if (!acc[attempt.qId]) acc[attempt.qId] = [];
        acc[attempt.qId].push(attempt);
        return acc;
      }, {});

      let qIndex = 0;

      for (const [qId, attempts] of Object.entries(groupedAttempts)) {
        const canonicalQ = qMap.get(qId);
        if (!canonicalQ) continue;

        qIndex++;
        const topic = getTopicDisplayFromRaw(canonicalQ) || "—";

        html += `
          <div class="question-row history-full-detail">
            <div class="question-topic-label">${topic}</div>
            <div class="question-q">
              ${qIndex}. ${canonicalQ.qText || canonicalQ.id || "Otázka"}
            </div>
            <div class="wave-strip">
        `;

        attempts.forEach((attempt) => {
          const cls = attempt.correct ? "correct" : "incorrect";
          html += `
            <span class="wave-pill ${cls}">
              Vlna ${attempt.wave}
            </span>
          `;
        });

        html += `
            </div>
            <div class="final-answer-row">
              <span class="final-answer-pill">Odpoveď</span>
              ${canonicalQ.correctAnswerText || "—"}
            </div>
          </div>
        `;
      }
    }

    // OTHER MODES
    else {
      qList.forEach((q, i) => {
        const topic = q.topicDisplay || getTopicDisplayFromRaw(q) || "—";

        let questionText = q.qText || q.id || "";
        questionText = questionText.replace(/Sujet\s*:\s*/i, "").trim();

        const userText = q.userAnswerText || "—";
        const correctText = q.correctAnswerText || "—";
        const isCorrect = !!q.correct;

        html += `
          <div class="question-row ${isCorrect ? "correct" : "incorrect"}">
            <div class="question-topic-label">${topic || "—"}</div>
            <div class="question-q">
              ${i + 1}. ${questionText}
            </div>
            <div class="question-a">
              <strong>Vaša odpoveď:</strong>
              ${userText}<br>
              <strong>Správna odpoveď:</strong>
              ${correctText}
            </div>
          </div>
        `;
      });
    }

    return html;
  }

  function attachClose(panel, anchorEl) {
    const btn = panel.querySelector("#closeHistoryDetails");
    if (btn) {
      btn.onclick = () => {
        panel.remove();
        anchorEl.classList.remove("item-open");
        anchorEl.scrollIntoView({ behavior: "smooth", block: "center" });
      };
    }
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    }[c]));
  }

  // --------- Init ---------

  function initHistory() {
    document.addEventListener("DOMContentLoaded", () => {
      renderHistory().catch((e) =>
        console.error("History: render failed", e)
      );
    });
  }

  // If DOM already ready, just render now
  if (document.readyState !== "loading") {
    renderHistory().catch((e) => console.error("History: render failed", e));
  } else {
    initHistory();
  }
})();
