// /assets/js/reading-pt.js
(() => {
  /* =========================================================
     HARD GUARD — ONLY RUN ON READING PAGE
     ========================================================= */
  const qs = (s) => document.querySelector(s);
  const taskCard = qs("#taskCard");
  if (!taskCard) return;

  /* =========================================================
     DOM
     ========================================================= */
  const pageTitle = qs("#pageTitle");
  const pageSub = qs("#pageSub");
  const taskCounter = qs("#taskCounter");
  const timerEl = qs("#timer");

  const prevBtn = qs("#prevTask");
  const nextBtn = qs("#nextTask");
  const submitBtn = qs("#submitReading");
  const warnEl = qs("#warn");

  /* =========================================================
     CONTEXT
     ========================================================= */
  const url = new URL(location.href);
  const examId = url.searchParams.get("exam") || "ciple-01";
  const DATA_URL = `/ciple/assets/data/${examId}-reading.json?t=${Date.now()}`;

  /* =========================================================
     STATE
     ========================================================= */
  let exam = null;
  let taskIndex = 0;
  let answers = {}; // { [task_id]: { [question_id]: option_id } }
  let startTs = null;

  /* =========================================================
     SUPABASE (NON-BLOCKING, OPTIONAL)
     ========================================================= */
  async function getSessionSafe() {
    try {
      if (!window.supabase?.auth) return null;
      const { data } = await window.supabase.auth.getSession();
      return data?.session ?? null;
    } catch {
      return null;
    }
  }

  /* =========================================================
     LOCAL STORAGE (ANON-SAFE)
     ========================================================= */
  function storageKey(uid = "anon") {
    return `ciple:${uid}:${examId}:reading`;
  }

  function persistLocal(uid) {
    const k = storageKey(uid);
    localStorage.setItem(`${k}:answers`, JSON.stringify(answers));
    localStorage.setItem(`${k}:taskIndex`, String(taskIndex));
    if (startTs) localStorage.setItem(`${k}:startTs`, String(startTs));
  }

  function restoreLocal(uid) {
    const k = storageKey(uid);
    try {
      answers = JSON.parse(localStorage.getItem(`${k}:answers`) || "{}") || {};
    } catch {
      answers = {};
    }
    const ti = parseInt(localStorage.getItem(`${k}:taskIndex`) || "0", 10);
    taskIndex = Number.isFinite(ti) ? Math.max(0, ti) : 0;
    const st = parseInt(localStorage.getItem(`${k}:startTs`) || "0", 10);
    startTs = Number.isFinite(st) && st > 0 ? st : null;
  }

  function clearLocal(uid) {
    const k = storageKey(uid);
    localStorage.removeItem(`${k}:answers`);
    localStorage.removeItem(`${k}:taskIndex`);
    localStorage.removeItem(`${k}:startTs`);
  }

  /* =========================================================
     UI HELPERS
     ========================================================= */
  function setWarn(msg) {
    warnEl.textContent = msg || "";
  }

  function countAnswered(task) {
    const a = answers[task.task_id] || {};
    return task.questions.filter(q => a[q.id]).length;
  }

  function isTaskComplete(task) {
    return countAnswered(task) === task.questions.length;
  }

  function setNav() {
    const task = exam.tasks[taskIndex];
    const last = taskIndex === exam.tasks.length - 1;
    const ok = isTaskComplete(task);

    prevBtn.style.display = taskIndex === 0 ? "none" : "";
    nextBtn.style.display = last ? "none" : "";
    submitBtn.style.display = last ? "" : "";

    nextBtn.disabled = !ok;
    submitBtn.disabled = !ok;

    setWarn(ok ? "" : "Responda a todas as questões desta página para continuar.");
  }

  function formatTime(ms) {
    if (ms <= 0) return "00:00";
    const t = Math.floor(ms / 1000);
    return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  }

  /* =========================================================
     RENDERING
     ========================================================= */
  function renderOptions(task, q) {
    return (q.options || []).map(opt => {
      const sel = answers[task.task_id]?.[q.id] === opt.id ? "selected" : "";
      return `
        <button type="button" class="opt-btn ${sel}"
          data-q="${q.id}" data-opt="${opt.id}">
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
        <div class="opt-grid">${renderOptions(task, q)}</div>
      </div>
    `).join("");

    taskCard.innerHTML = html;

    taskCard.querySelectorAll(".opt-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const tid = task.task_id;
        const qid = btn.dataset.q;
        const opt = btn.dataset.opt;

        answers[tid] ??= {};
        answers[tid][qid] = opt;

        btn.closest(".opt-grid")
          .querySelectorAll(".opt-btn")
          .forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");

        const session = await getSessionSafe();
        persistLocal(session?.user?.id || "anon");
        setNav();
      });
    });

    setNav();
  }

  /* =========================================================
     SCORING
     ========================================================= */
  function grade() {
    let correct = 0;
    let total = 0;

    const tasks = exam.tasks.map(t => {
      let c = 0;
      t.questions.forEach(q => {
        total++;
        if (answers[t.task_id]?.[q.id] === q.correct_option) {
          correct++; c++;
        }
      });
      return { task_id: t.task_id, correct: c, total: t.questions.length };
    });

    return {
      correct,
      total,
      percent: total ? Math.round((correct / total) * 100) : 0,
      tasks
    };
  }

  /* =========================================================
     SUBMIT (FAIL-SAFE)
     ========================================================= */
  async function submit() {
    const task = exam.tasks[taskIndex];
    if (!isTaskComplete(task)) return;

    const payload = {
      section: "reading",
      exam_id: examId,
      started_at: startTs ? new Date(startTs).toISOString() : null,
      completed_at: new Date().toISOString(),
      score: grade(),
      answers
    };

    const session = await getSessionSafe();

    if (session?.user?.id && window.supabase) {
      try {
        await window.supabase
          .from("exam_section_results")
          .delete()
          .eq("user_id", session.user.id)
          .eq("exam_id", examId)
          .eq("section", "reading");

        await window.supabase
          .from("exam_section_results")
          .insert({
            user_id: session.user.id,
            exam_id: examId,
            section: "reading",
            result_json: payload
          });

        clearLocal(session.user.id);
      } catch {
        // silent fail
      }
    }

    location.href = `writing.html?exam=${encodeURIComponent(examId)}`;
  }

  /* =========================================================
     TIMER
     ========================================================= */
  function tick() {
    if (!exam?.time_limit_minutes) {
      timerEl.textContent = "—";
      return;
    }
    if (!startTs) startTs = Date.now();

    const left =
      exam.time_limit_minutes * 60000 - (Date.now() - startTs);

    timerEl.textContent = formatTime(left);

    if (left <= 0) {
      submitBtn.disabled = true;
      submit();
    }
  }

  /* =========================================================
     INIT
     ========================================================= */
  async function init() {
    const session = await getSessionSafe();
    const uid = session?.user?.id || "anon";

    if (url.searchParams.get("reset") === "1") {
      clearLocal(uid);
      answers = {};
    } else {
      restoreLocal(uid);
    }

    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error("READING_JSON_MISSING");
    exam = await res.json();

    prevBtn.onclick = () => {
      if (taskIndex > 0) {
        taskIndex--;
        persistLocal(uid);
        renderTask();
      }
    };

    nextBtn.onclick = () => {
      if (taskIndex < exam.tasks.length - 1 && isTaskComplete(exam.tasks[taskIndex])) {
        taskIndex++;
        persistLocal(uid);
        renderTask();
      }
    };

    submitBtn.onclick = submit;

    renderTask();
    if (exam.time_limit_minutes && !startTs) startTs = Date.now();
    tick();
    setInterval(tick, 1000);
  }

  init().catch(() => {
    taskCard.innerHTML = `
      <h2>Erro</h2>
      <p>Não foi possível carregar a leitura.</p>
    `;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    submitBtn.disabled = true;
  });
})();
