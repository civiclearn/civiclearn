// CivicEdge History v6 – Topics wave-strip redesign, no toggles, single answer

(function () {
  "use strict";

  let historySessions = [];
  let currentOpenIndex = -1;

  // --------- Helpers ---------

  function getI18n() {
    return window.CivicLearnI18n || null;
  }

  function t(key, fallback) {
    const i18n = getI18n();
    if (i18n && typeof i18n.t === "function") {
      return i18n.t(key, fallback);
    }
    return fallback || key;
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
      (typeof session.date === "string" && session.date.length >= 10
        ? session.date.slice(0, 10)
        : null);

    return key || "0000-00-00";
  }

  // ===============================================================
  // PATCH: universal localized date formatter based on <html lang="">
  // ===============================================================

  function localizedDate(d, opts) {
    const htmlLang = document.documentElement.lang || "en";
    const locale = htmlLang.replace("_", "-");
    return d.toLocaleDateString(locale, opts);
  }

  function formatDayHeader(dateKey, count) {
    const countLabel =
      count === 1
        ? t("history_one_session", "1 session")
        : t("history_sessions_count", "{n} sessions").replace("{n}", String(count));

    if (!dateKey || dateKey === "0000-00-00") {
      return t("history_unknown_date_header", "Unknown date • {count}").replace(
        "{count}",
        countLabel
      );
    }

    const d = new Date(dateKey + "T00:00:00");

    // -------- PATCHED --------
    const weekday = localizedDate(d, { weekday: "long" });
    const fullDate = localizedDate(d, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    // --------------------------

    return t("history_day_header", "{weekday} — {date} • {count}")
      .replace("{weekday}", weekdayCap)
      .replace("{date}", fullDate)
      .replace("{count}", countLabel);
  }

  function modeLabel(mode) {
    switch (mode) {
      case "simulation":
        return t("mode_simulation", "Official simulation");
      case "quick":
        return t("mode_quick", "Quick test");
      case "topics":
        return t("mode_topics", "By topics");
      case "traps":
        return t("mode_traps", "Frequent traps");
      default:
        return t("mode_session", "Session");
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

    const sessions = readStats();
    if (!sessions.length) {
      listEl.innerHTML =
        `<p class="muted" data-i18n="history_no_sessions">` +
        t("history_no_sessions", "No practice history yet.") +
        `</p>`;
      return;
    }

    historySessions = sessions;

    const groups = new Map();
    sessions.forEach((s, idx) => {
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
      countSpan.textContent =
        count === 1
          ? t("history_day_one_session", "1 session")
          : t("history_day_sessions", "{n} sessions").replace(
              "{n}",
              String(count)
            );

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

        const dur = getDurationMin(session);
        const meta = document.createElement("div");
        meta.className = "history-item-meta";

        const metaStr = t(
          "history_item_meta",
          "{percent}% — {total} questions — {minutes} min"
        )
          .replace("{percent}", session.percent ?? "—")
          .replace("{total}", session.total ?? "?")
          .replace("{minutes}", dur ?? "—");

        meta.textContent = metaStr;

        const pill = document.createElement("div");
        pill.className = `history-item-score ${scoreClass(
          session.percent,
          session.total
        )}`;
        pill.textContent = session.total
          ? `${session.percent ?? 0}%`
          : t("history_no_score", "No score");

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

    const i18n = getI18n();
    if (i18n && typeof i18n.apply === "function") {
      i18n.apply(listEl);
    }
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

    const dateKey = getDateKey(session);
    let longDate;

    if (dateKey && dateKey !== "0000-00-00") {
      const d = new Date(dateKey + "T00:00:00");

      // -------- PATCHED --------
      longDate = localizedDate(d, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      longDate = longDate.charAt(0).toUpperCase() + longDate.slice(1);
      // --------------------------

    } else {
      longDate = t("history_unknown_date", "Unknown date");
    }

    const dur = getDurationMin(session);
    const durationLabel =
      dur != null
        ? `${dur} ${t("history_minutes", "min")}`
        : t("history_no_time", "Not available");

    let html = `
      <div class="history-details-header">
        <div class="hd-title"><strong>${longDate}</strong></div>
        <button class="close-btn" id="closeHistoryDetails" aria-label="${t(
          "history_close",
          "Close"
        )}">×</button>
      </div>

      <div class="history-review-summary">
        <div><strong>${t("history_score", "Score")}:</strong>
          ${session.percent ?? "—"}% (${session.correct ?? "?"}/${session.total ?? "?"})
        </div>
        <div><strong>${t("history_duration", "Duration")}:</strong> ${durationLabel}</div>
        <div><strong>${t("history_mode", "Mode")}:</strong> ${modeLabel(
          session.mode
        )}</div>
      </div>

      <h3 style="margin-top:8px;margin-bottom:10px;">
        ${t("history_questions_header", "Questions in this session")}
      </h3>
    `;

    const qList = Array.isArray(session.questions)
      ? session.questions
      : [];

    const attemptLog = Array.isArray(session.attemptLog)
      ? session.attemptLog
      : [];

    // --------------------------
    // TOPICS MODE (NEW DESIGN)
    // --------------------------

    if (session.mode === "topics" &&
        attemptLog.length > qList.length) {

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

        html += `
          <div class="question-row history-full-detail">

            <div class="question-topic-label">${canonicalQ.topic || "—"}</div>

            <div class="question-q">
              ${qIndex}. ${canonicalQ.qText || canonicalQ.id || "Question"}
            </div>

            <div class="wave-strip">
        `;

        attempts.forEach((attempt) => {
          const cls = attempt.correct ? "correct" : "incorrect";
          html += `
              <span class="wave-pill ${cls}">Vague ${attempt.wave}</span>
          `;
        });

        html += `
            </div>

            <div class="final-answer-row">
              <span class="final-answer-pill">Réponse</span>
              ${canonicalQ.correctAnswerText || "—"}
            </div>

          </div>
        `;
      }
    }

    // --------------------------
    // OTHER MODES (UNCHANGED)
    // --------------------------

    else {
      qList.forEach((q, i) => {
        const topic = q.topicLabel || q.topic || "";

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
              <strong>${t("history_your_answer", "Your answer")}:</strong>
              ${userText}<br>
              <strong>${t("history_correct_answer", "Correct answer")}:</strong>
              ${correctText}
            </div>

          </div>
        `;
      });
    }

    panel.innerHTML = html;
    attachClose(panel, anchorEl);

    const i18n = getI18n();
    if (i18n && typeof i18n.apply === "function") {
      i18n.apply(panel);
    }
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

  // --------- Init ---------

  function initHistory() {
    const i18n = getI18n();
    if (i18n && typeof i18n.onReady === "function") {
      i18n.onReady(() => {
        renderHistory().catch((e) =>
          console.error("History: render failed after i18n ready", e)
        );
      });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        renderHistory().catch((e) =>
          console.error("History: render failed (fallback)", e)
        );
      });
    }
  }

  initHistory();
})();
