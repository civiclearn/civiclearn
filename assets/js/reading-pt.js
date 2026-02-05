// /assets/js/reading-pt.js
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

  /* =========================================================
     SUPABASE SESSION (AUTHORITATIVE, CACHED)
     ========================================================= */

  let __session = null;

  async function requireSession() {
    if (__session) return __session;

    if (!window.supabase || !window.supabase.auth) {
      throw new Error("Supabase not ready");
    }

    const { data, error } = await window.supabase.auth.getSession();
    if (error || !data?.session) {
      throw new Error("No session");
    }

    __session = data.session;
    return __session;
  }

  /* =========================================================
     STATE
     ========================================================= */

  let exam = null;
  let taskIndex = 0;
  let answers = {}; // { [task_id]: { [question_id]: option_id } }
  let startTs = null;

  function userKeyPrefix(userId) {
    return `ciple:${userId}:${examId}:reading`;
  }

  /* =========================================================
     LOCAL PERSISTENCE
     ========================================================= */

  function persistLocal(userId) {
    const key = userKeyPrefix(userId);
    localStorage.setItem(`${key}:answers`, JSON.stringify(answers));
    localStorage.setItem(`${key}:taskIndex`, String(taskIndex));
    if (startTs) localStorage.setItem(`${key}:startTs`, String(startTs));
  }

  function restoreLocal(userId) {
    const key = userKeyPrefix(userId);

    try {
      const a = JSON.parse(localStorage.getItem(`${key}:answers`) || "{}");
      if (a && typeof a === "object") answers = a;
    } catch {}

    const ti = parseInt(localStorage.getItem(`${key}:taskIndex`) || "0", 10);
    taskIndex = Number.isFinite(ti) ? Math.max(0, ti) : 0;

    const st = parseInt(localStorage.getItem(`${key}:startTs`) || "0", 10);
    startTs = Number.isFinite(st) && st > 0 ? st : null;
  }

  function clearLocal(userId) {
    const key = userKeyPrefix(userId);
    localStorage.removeItem(`${key}:answers`);
    localStorage.removeItem(`${key}:taskIndex`);
    localStorage.removeItem(`${key}:startTs`);
  }

  /* =========================================================
     HELPERS
     ========================================================= */

  function setWarn(msg) {
    warnEl.textContent = msg || "";
  }

  function countAnswered(task) {
    const taskAnswers = answers[task.task_id] || {};
    return task.questions.filter(q => taskAnswers[q.id]).length;
  }

  function isTaskComplete(task) {
    return countAnswered(task) === task.questions.length;
  }

  function setNavButtons() {
    const task = exam.tasks[taskIndex];
    const last = taskIndex === exam.tasks.length - 1;
    const complete = isTaskComplete(task);

    prevBtn.style.display = taskIndex === 0 ? "none" : "";
    nextBtn.style.display = last ? "none" : "";
    submitBtn.style.display = last ? "" : "none";

    if (!last) nextBtn.disabled = !complete;
    if (last) submitBtn.disabled = !complete;

    setWarn(
      complete
        ? ""
        : "Responda a todas as questões desta página para continuar."
    );
  }

  function formatTimeLeft(ms) {
    if (ms <= 0) return "00:00";
    const t = Math.floor(ms / 1000);
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }

  /* =========================================================
     RENDERING
     ========================================================= */

  function renderOptions(task, q) {
    return q.options.map(opt => {
      const selected =
        answers[task.task_id]?.[q.id] === opt.id ? "selected" : "";
      return `
        <button
          type="button"
          class="opt-btn ${selected}"
          data-q="${q.id}"
          data-opt="${opt.id}">
          ${opt.text}
        </button>`;
    }).join("");
  }

  function renderTask() {
    const task = exam.tasks[taskIndex];

    pageTitle.textContent = "Compreensão escrita";
    pageSub.textContent = `${examId.toUpperCase()} • ${task.title}`;
    taskCounter.textContent = `${taskIndex + 1} / ${exam.tasks.length}`;

    let html = `
      <h2 class="task-title">${task.title}</h2>
      <p class="task-instructions">${task.instructions || ""}</p>
    `;

    if (task.content?.text) {
      html += `<div class="text-block"><pre>${task.content.text}</pre></div>`;
    }

    html += task.questions.map((q, i) => `
      <div class="q">
        <p class="q-prompt">${i + 1}. ${q.prompt || q.question}</p>
        <div class="opt-grid">
          ${renderOptions(task, q)}
        </div>
      </div>
    `).join("");

    taskCard.innerHTML = html;

    taskCard.querySelectorAll(".opt-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const qid = btn.dataset.q;
        const opt = btn.dataset.opt;
        const tid = task.task_id;

        answers[tid] ??= {};
        answers[tid][qid] = opt;

        btn.closest(".opt-grid")
          .querySelectorAll(".opt-btn")
          .forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");

        const session = await requireSession();
        persistLocal(session.user.id);
        setNavButtons();
      });
    });

    setNavButtons();
  }

  /* =========================================================
     SCORING + STORAGE
     ========================================================= */

  function gradeReading() {
    let correct = 0;
    let total = 0;

    const tasks = exam.tasks.map(t => {
      let tc = 0;
      t.questions.forEach(q => {
        total++;
        if (answers[t.task_id]?.[q.id] === q.correct_option) {
          correct++;
          tc++;
        }
      });
      return { task_id: t.task_id, correct: tc, total: t.questions.length };
    });

    return {
      correct,
      total,
      percent: total ? Math.round((correct / total) * 100) : 0,
      tasks
    };
  }

  async function storeResult(resultJson) {
    const session = await requireSession();
    const userId = session.user.id;

    await window.supabase
      .from("exam_section_results")
      .delete()
      .eq("user_id", userId)
      .eq("exam_id", examId)
      .eq("section", "reading");

    const { error } = await window.supabase
      .from("exam_section_results")
      .insert({
        user_id: userId,
        exam_id: examId,
        section: "reading",
        result_json: resultJson
      });

    if (error) throw error;
  }

  /* =========================================================
     TIMER
     ========================================================= */

  function tickTimer() {
    if (!exam?.time_limit_minutes) {
      timerEl.textContent = "—";
      return;
    }
    if (!startTs) startTs = Date.now();

    const left =
      exam.time_limit_minutes * 60 * 1000 - (Date.now() - startTs);

    timerEl.textContent = formatTimeLeft(left);

    if (left <= 0) {
      submitBtn.disabled = true;
      doSubmit(true).catch(() => {
        setWarn("Erro ao submeter automaticamente.");
      });
    }
  }

  /* =========================================================
     SUBMIT
     ========================================================= */

  async function doSubmit() {
    const task = exam.tasks[taskIndex];
    if (!isTaskComplete(task)) {
      setWarn("Responda a todas as questões antes de submeter.");
      return;
    }

    const score = gradeReading();

    await storeResult({
      section: "reading",
      exam_id: examId,
      started_at: startTs ? new Date(startTs).toISOString() : null,
      completed_at: new Date().toISOString(),
      score,
      answers
    });

    const session = await requireSession();
    clearLocal(session.user.id);

    location.href = `writing.html?exam=${encodeURIComponent(examId)}`;
  }

  /* =========================================================
     INIT
     ========================================================= */

  async function init() {
    const session = await requireSession();
    const userId = session.user.id;

    if (url.searchParams.get("reset") === "1") {
      clearLocal(userId);
      answers = {};
    } else {
      restoreLocal(userId);
    }

    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Missing JSON: ${DATA_URL}`);
    exam = await res.json();

    prevBtn.onclick = () => {
      if (taskIndex > 0) {
        taskIndex--;
        persistLocal(userId);
        renderTask();
      }
    };

    nextBtn.onclick = () => {
      if (taskIndex < exam.tasks.length - 1 && isTaskComplete(exam.tasks[taskIndex])) {
        taskIndex++;
        persistLocal(userId);
        renderTask();
      }
    };

    submitBtn.onclick = () => doSubmit();

    renderTask();
    if (exam.time_limit_minutes && !startTs) startTs = Date.now();
    tickTimer();
    setInterval(tickTimer, 1000);
  }

  init().catch(e => {
    console.error(e);
    taskCard.innerHTML = `
      <h2>Erro</h2>
      <p>${String(e.message || e)}</p>
    `;
    submitBtn.disabled = true;
    nextBtn.disabled = true;
  });
})();
