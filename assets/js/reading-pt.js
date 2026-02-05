// /assets/js/reading-pt.js
// Reads:  /ciple/assets/data/<examId>-reading.json
// Writes: sessionStorage["ciple_attempt_v1"] (browser-only)
// Renders using your JSON schema: tasks[] -> questions[] (prompt/question, options[], correct_option)

(() => {
  const qs = (s) => document.querySelector(s);

  const pageTitle = qs("#pageTitle");
  const pageSub = qs("#pageSub");
  const taskCounter = qs("#taskCounter");
  const timerEl = qs("#timer");
  const taskCard = qs("#taskCard");

  const prevBtn = qs("#prevTask");
  const nextBtn = qs("#nextTask");
  const submitBtn = qs("#submitReading");
  const warnEl = qs("#warn");

  const url = new URL(location.href);
  const examId = url.searchParams.get("exam") || "ciple-01";

  const DATA_URL = `/ciple/assets/data/${examId}-reading.json`;

  const ATTEMPT_KEY = "ciple_attempt_v1";
  const START_KEY = `ciple_reading_started_at:${examId}`;

  let examJson = null;

  // Flat question index:
  // [
  //   { taskIndex, questionIndex, task_id, task_title, instructions, type, content, q }
  // ]
  let idx = [];
  let cursor = 0;

  // answers: { [questionId]: optionId }
  let answers = {};

  // timer
  let startedAtMs = null;
  let totalMs = 45 * 60 * 1000;

  function safeText(s) {
    return (s ?? "").toString();
  }

  function loadAttempt() {
    try {
      const raw = sessionStorage.getItem(ATTEMPT_KEY);
      if (!raw) return { exam_id: examId };
      const parsed = JSON.parse(raw);
      if (parsed && parsed.exam_id === examId) return parsed;
      return { exam_id: examId };
    } catch {
      return { exam_id: examId };
    }
  }

  function saveAttempt(attempt) {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  }

  function setWarn(msg) {
    if (!warnEl) return;
    warnEl.textContent = msg || "";
  }

  function ensureStartTime() {
    const existing = sessionStorage.getItem(START_KEY);
    if (existing) {
      const n = Number(existing);
      if (!Number.isNaN(n)) {
        startedAtMs = n;
        return;
      }
    }
    startedAtMs = Date.now();
    sessionStorage.setItem(START_KEY, String(startedAtMs));
  }

  function tickTimer() {
    if (!timerEl) return;
    if (!startedAtMs) return;

    const remaining = totalMs - (Date.now() - startedAtMs);
    if (remaining <= 0) {
      timerEl.textContent = "Tempo esgotado";
      // Auto-submit once
      doSubmit();
      return;
    }

    const totalSec = Math.floor(remaining / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    timerEl.textContent = `${m}:${String(s).padStart(2, "0")}`;
  }

  function buildIndex() {
    idx = [];
    (examJson.tasks || []).forEach((task, taskIndex) => {
      const questions = Array.isArray(task.questions) ? task.questions : [];
      questions.forEach((q, questionIndex) => {
        idx.push({
          taskIndex,
          questionIndex,
          task_id: task.task_id,
          task_title: task.title,
          instructions: task.instructions,
          type: task.type,
          content: task.content || null,
          q
        });
      });
    });
  }

  function getTaskTexts(task) {
    // Supports: task.content.texts = [{id,text}]
    const texts = task?.content?.texts;
    if (!Array.isArray(texts) || !texts.length) return null;

    // Map id -> text
    const map = new Map();
    texts.forEach(t => map.set(t.id, t.text));

    return { texts, map };
  }

  function render() {
    setWarn("");

    if (!idx.length) {
      taskCard.innerHTML = `<p>Erro: prova de leitura sem questões.</p>`;
      nextBtn.style.display = "none";
      submitBtn.style.display = "none";
      prevBtn.style.display = "none";
      return;
    }

    if (cursor < 0) cursor = 0;
    if (cursor > idx.length - 1) cursor = idx.length - 1;

    const item = idx[cursor];
    const task = examJson.tasks[item.taskIndex];
    const q = item.q;

    const qId = safeText(q.id);
    const prompt = safeText(q.prompt || q.question);
    const options = Array.isArray(q.options) ? q.options : [];

    // Counter: show global question counter
    if (taskCounter) taskCounter.textContent = `${cursor + 1} / ${idx.length}`;

    // Header
    const taskTitle = safeText(task.title);
    const instructions = safeText(task.instructions);

    // Optional content panel for tasks that include texts
    let contentHtml = "";
    const tctx = getTaskTexts(task);
    if (tctx) {
      // If question references one text_id, show that one first (if present), then all texts collapsed
      const textId = q.text_id ? safeText(q.text_id) : "";
      const primary = textId && tctx.map.has(textId) ? tctx.map.get(textId) : null;

      const block = (id, text) => `
        <div class="ciple-reading-text">
          <div class="ciple-reading-text-id">${safeText(id)}</div>
          <pre class="ciple-reading-text-body">${safeText(text)}</pre>
        </div>
      `;

      let blocks = "";
      if (primary) blocks += block(textId, primary);

      // show all texts (including primary) as well
      blocks += tctx.texts.map(t => block(t.id, t.text)).join("");

      contentHtml = `
        <div class="ciple-reading-content">
          ${blocks}
        </div>
      `;
    }

    // Options HTML
    const chosen = answers[qId] || "";
    const optionsHtml = options.map(o => {
      const oid = safeText(o.id);
      const otext = safeText(o.text);
      const checked = chosen === oid ? "checked" : "";
      return `
        <label class="ciple-opt">
          <input type="radio" name="reading-${qId}" value="${oid}" ${checked}>
          <span class="ciple-opt-text">${otext}</span>
        </label>
      `;
    }).join("");

    taskCard.innerHTML = `
      <div class="ciple-reading-head">
        <div class="ciple-reading-tasktitle">${taskTitle}</div>
        <div class="ciple-reading-instr">${instructions}</div>
      </div>

      ${contentHtml}

      <div class="ciple-reading-q">
        <div class="ciple-reading-qprompt">${prompt}</div>
        <div class="ciple-reading-options">
          ${optionsHtml || `<div class="muted">Sem opções.</div>`}
        </div>
      </div>
    `;

    // Wire answer selection
    taskCard.querySelectorAll("input[type='radio']").forEach(inp => {
      inp.addEventListener("change", () => {
        answers[qId] = inp.value;
        setWarn("");
        refreshNav();
      });
    });

    refreshNav();
  }

  function refreshNav() {
    const atFirst = cursor === 0;
    const atLast = cursor === idx.length - 1;

    // Prev button exists in HTML but initially hidden
    if (prevBtn) prevBtn.style.display = atFirst ? "none" : "inline-block";

    if (nextBtn) nextBtn.style.display = atLast ? "none" : "inline-block";
    if (submitBtn) submitBtn.style.display = atLast ? "inline-block" : "none";
  }

  function grade() {
    let correct = 0;
    let total = 0;

    idx.forEach(item => {
      const q = item.q;
      const qId = safeText(q.id);
      const correctOpt = safeText(q.correct_option);
      if (!qId || !correctOpt) return;

      total += 1;
      if (answers[qId] === correctOpt) correct += 1;
    });

    const scorePct = total ? Math.round((correct / total) * 100) : 0;
    return { correct, total, score_pct: scorePct };
  }

  function doSubmit() {
    // prevent double submit
    if (doSubmit._done) return;
    doSubmit._done = true;

    const g = grade();
    const attempt = loadAttempt();

    attempt.exam_id = examId;
    attempt.reading = {
      answers,
      correct: g.correct,
      total: g.total,
      score_pct: g.score_pct,
      completed_at: new Date().toISOString(),
      started_at: startedAtMs ? new Date(startedAtMs).toISOString() : null
    };

    saveAttempt(attempt);

    // go next section
    location.href = `writing.html?exam=${encodeURIComponent(examId)}`;
  }
  doSubmit._done = false;

  function attachNav() {
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        if (cursor > 0) {
          cursor -= 1;
          render();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        if (cursor < idx.length - 1) {
          cursor += 1;
          render();
        }
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const item = idx[cursor];
        const qId = safeText(item.q.id);
        if (!answers[qId]) {
          setWarn("Selecione uma resposta para continuar.");
          doSubmit._done = false;
          return;
        }
        doSubmit();
      });
    }
  }

  async function init() {
    if (pageTitle) pageTitle.textContent = "Compreensão escrita";
    if (pageSub) pageSub.textContent = examId.toUpperCase();

    ensureStartTime();

    try {
      const res = await fetch(DATA_URL, { cache: "no-store" });
      if (!res.ok) throw new Error(`JSON not found: ${DATA_URL}`);
      examJson = await res.json();

      totalMs = (Number(examJson.time_limit_minutes) || 45) * 60 * 1000;

      buildIndex();
      attachNav();
      render();

      tickTimer();
      setInterval(tickTimer, 1000);
    } catch (err) {
      console.error(err);
      taskCard.innerHTML = `<p>Erro ao carregar leitura.</p>`;
      if (nextBtn) nextBtn.style.display = "none";
      if (submitBtn) submitBtn.style.display = "none";
      if (prevBtn) prevBtn.style.display = "none";
    }
  }

  init();
})();
