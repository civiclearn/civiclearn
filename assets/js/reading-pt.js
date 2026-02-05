// /assets/js/ciple/reading.js
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
  const sentNote = qs("#sentNote");

  const url = new URL(location.href);
  const examId = url.searchParams.get("exam") || "ciple-01";

  // If you keep the JSON at a different path, change only this line.
  const DATA_URL = `/ciple/assets/data/${examId}-reading.json`;

  // Local persistence keys (per user + exam)
  const userKeyPrefix = () => {
    const uid = window.__cl_uid || "anon"; // will be set after auth
    return `ciple:${uid}:${examId}:reading`;
  };

  let exam = null;
  let taskIndex = 0;
  let answers = {}; // { [questionId]: optionId }
  let startTs = null; // timer start
  
  function waitForExamContext() {
  return new Promise(resolve => {
    if (window.CIPLE_EXAM_CONTEXT) return resolve(window.CIPLE_EXAM_CONTEXT);
    window.addEventListener("exam:ready", () => resolve(window.CIPLE_EXAM_CONTEXT), { once: true });
  });
}


  // ---------- helpers ----------
  function countAnsweredForTask(task) {
    const qIds = task.questions.map(q => q.id);
    const taskAnswers = answers[task.task_id] || {};
return qIds.filter(id => taskAnswers[id]).length;

  }

  function isTaskComplete(task) {
    return countAnsweredForTask(task) === task.questions.length;
  }

  function formatTimeLeft(ms) {
    if (ms <= 0) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function persistLocal() {
    const key = userKeyPrefix();
    localStorage.setItem(`${key}:answers`, JSON.stringify(answers));
    localStorage.setItem(`${key}:taskIndex`, String(taskIndex));
    if (startTs) localStorage.setItem(`${key}:startTs`, String(startTs));
  }

  function restoreLocal() {
    const key = userKeyPrefix();
    try {
      const a = JSON.parse(localStorage.getItem(`${key}:answers`) || "{}");
      if (a && typeof a === "object") answers = a;
    } catch {}
    const ti = parseInt(localStorage.getItem(`${key}:taskIndex`) || "0", 10);
    taskIndex = Number.isFinite(ti) ? Math.max(0, ti) : 0;
    const st = parseInt(localStorage.getItem(`${key}:startTs`) || "0", 10);
    startTs = Number.isFinite(st) && st > 0 ? st : null;
  }

  function clearLocal() {
    const key = userKeyPrefix();
    localStorage.removeItem(`${key}:answers`);
    localStorage.removeItem(`${key}:taskIndex`);
    localStorage.removeItem(`${key}:startTs`);
  }

  function setWarn(msg) {
    warnEl.textContent = msg || "";
  }

  function setNavButtons() {
    if (taskIndex === 0) {
  prevBtn.style.display = "none";
} else {
  prevBtn.style.display = "";
  prevBtn.disabled = false;
}
    const last = taskIndex === exam.tasks.length - 1;

    nextBtn.style.display = last ? "none" : "";
    submitBtn.style.display = last ? "" : "none";

    // Require completion before moving on (matches exam feel)
    const task = exam.tasks[taskIndex];
    const complete = isTaskComplete(task);

    if (!last) nextBtn.disabled = !complete;
    if (last) submitBtn.disabled = !complete;

    if (!complete) {
      setWarn("Responda a todas as questões desta página para continuar.");
    } else {
      setWarn("");
    }
  }

  // ---------- renderers ----------
  function renderMatchOne(task) {
   
   const optsHtml = (q) => {
  return (q.options || []).map(opt => {
    const selected =
  answers[task.task_id]?.[q.id] === opt.id ? "selected" : "";
    return `
      <button
  type="button"
  class="opt-btn ${selected}"
  data-q="${q.id}"
  data-opt="${opt.id}"
>

        ${opt.text}
      </button>
    `;
  }).join("");
};


    return `
      <h2 class="task-title">${task.title}</h2>
      <p class="task-instructions">${task.instructions || ""}</p>

      ${task.questions.map((q, idx) => `
        <div class="q">
          <p class="q-prompt">${idx + 1}. ${q.prompt}</p>
          <div class="opt-grid">
            ${optsHtml(q)}
          </div>
        </div>
      `).join("")}
    `;
  }

  function renderSingleTextMCQ(task) {
    const texts = task.content?.texts || [];
    const byText = new Map(texts.map(t => [t.id, t.text]));

    // group questions by text_id (so the text prints once)
    const groups = {};
    for (const q of task.questions) {
      const tid = q.text_id || "no-text";
      groups[tid] = groups[tid] || [];
      groups[tid].push(q);
    }

    const groupHtml = Object.entries(groups).map(([tid, qsList]) => {
      const txt = byText.get(tid) || "";
      return `
        ${txt ? `<div class="text-block"><pre>${txt}</pre></div>` : ""}

        ${qsList.map((q, i) => `
          <div class="q">
            <p class="q-prompt">${q.question}</p>
            <div class="opt-grid">
              ${q.options.map(opt => {
                const selected =
  answers[task.task_id]?.[q.id] === opt.id ? "selected" : "";
                return `
                  <button
  type="button"
  class="opt-btn ${selected}"
  data-q="${q.id}"
  data-opt="${opt.id}"
>

                    ${opt.text}
                  </button>
                `;
              }).join("")}
            </div>
          </div>
        `).join("")}
      `;
    }).join("");

    return `
      <h2 class="task-title">${task.title}</h2>
      <p class="task-instructions">${task.instructions || ""}</p>
      ${groupHtml}
    `;
  }

  function renderLongTextMCQ(task) {
    const text = task.content?.text || "";
    return `
      <h2 class="task-title">${task.title}</h2>
      <p class="task-instructions">${task.instructions || ""}</p>

      ${text ? `<div class="text-block"><pre>${text}</pre></div>` : ""}

      ${task.questions.map((q, idx) => `
        <div class="q">
          <p class="q-prompt">${idx + 1}. ${q.question}</p>
          <div class="opt-grid">
            ${q.options.map(opt => {
              const selected =
  answers[task.task_id]?.[q.id] === opt.id ? "selected" : "";
              return `
                <button
  type="button"
  class="opt-btn ${selected}"
  data-q="${q.id}"
  data-opt="${opt.id}"
>


                  ${opt.text}
                </button>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    `;
  }

  function renderTask() {
    const task = exam.tasks[taskIndex];
    const total = exam.tasks.length;

    pageTitle.textContent = "Compreensão escrita";
    pageSub.textContent = `${examId.toUpperCase()} • ${task.title}`;
    taskCounter.textContent = `${taskIndex + 1} / ${total}`;

    let html = "";
    if (task.type === "match_one") html = renderMatchOne(task);
    else if (task.type === "single_text_mcq") html = renderSingleTextMCQ(task);
    else if (task.type === "long_text_mcq") html = renderLongTextMCQ(task);
    else html = `<p>Tipo de tarefa não suportado: ${task.type}</p>`;

    taskCard.innerHTML = html;
	

    // click handler (event delegation)
    taskCard.querySelectorAll(".opt-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const qid = btn.getAttribute("data-q");
        const opt = btn.getAttribute("data-opt");
        const tid = task.task_id;

        // Save data
        if (!answers[tid]) { answers[tid] = {}; }
        answers[tid][qid] = opt;

        // Update UI: Find the box containing ONLY this question's buttons
        const box = btn.closest('.opt-grid');
        
        // Clear old selection in this box
        box.querySelectorAll(".opt-btn").forEach(b => {
          b.classList.remove("selected");
        });

        // Highlight the one you just clicked
        btn.classList.add("selected");

        persistLocal();
        setNavButtons();
      });
    });

    setNavButtons();
  }

  // ---------- scoring + storage ----------
  function gradeReading() {
    let correct = 0;
    let total = 0;

    const byTask = exam.tasks.map(t => {
      let tCorrect = 0;
      let tTotal = t.questions.length;

      for (const q of t.questions) {
        total += 1;
        const chosen = answers[t.task_id]?.[q.id] || null;

        // match_one: correct_option
        if (q.correct_option && chosen === q.correct_option) {
          correct += 1;
          tCorrect += 1;
        }

        // mcq: correct_option
        if (!q.correct_option && q.correct_option !== "" && q.correct_option !== 0) {
          // no-op (defensive)
        }
      }

      

      // Fix double counting risk: We counted correct per question in the first loop,
      // but only when q.correct_option exists. That is correct for our schema.

      return { task_id: t.task_id, correct: tCorrect, total: tTotal };
    });

    // The loop above counts correct only once per question.
    // total is correct; percent computed from total.
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

    return { correct, total, percent, tasks: byTask };
  }

  async function storeResult(resultJson) {
    // Store in same table as writing/speaking (consistent with what you already built)
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) throw new Error("No user");

    // Upsert-like behavior: delete existing then insert, to avoid requiring unique constraints.
    // If you already have a unique constraint on (user_id, exam_id, section), replace with upsert.
    await window.supabase
      .from("exam_section_results")
      .delete()
      .eq("user_id", user.id)
      .eq("exam_id", examId)
      .eq("section", "reading");

    const ins = await window.supabase
      .from("exam_section_results")
      .insert({
        user_id: user.id,
        exam_id: examId,
        section: "reading",
        result_json: resultJson
      });

    if (ins.error) throw ins.error;
  }

  // ---------- timer ----------
  function tickTimer() {
    if (!exam?.time_limit_minutes) {
      timerEl.textContent = "—";
      return;
    }
    if (!startTs) startTs = Date.now();

    const limitMs = exam.time_limit_minutes * 60 * 1000;
    const elapsed = Date.now() - startTs;
    const left = limitMs - elapsed;

    timerEl.textContent = formatTimeLeft(left);

    if (left <= 0) {
      // Auto-submit once
      submitBtn.disabled = true;
      setWarn("Tempo terminado. A submeter…");
      doSubmit(true).catch(() => {
        // if submit fails, leave a visible warning
        setWarn("Tempo terminado, mas ocorreu um erro ao submeter.");
      });
    }
  }

  // ---------- submit ----------
  async function doSubmit(isAuto = false) {
    const task = exam.tasks[taskIndex];
    if (!isTaskComplete(task)) {
      setWarn("Responda a todas as questões desta página antes de submeter.");
      return;
    }

    const score = gradeReading();
    const payload = {
      section: "reading",
      exam_id: examId,
      time_limit_minutes: exam.time_limit_minutes || null,
      started_at: startTs ? new Date(startTs).toISOString() : null,
      completed_at: new Date().toISOString(),
      score,
      answers
    };

    await storeResult(payload);

    clearLocal();
setWarn("");

// redirect directly to Writing (Reading + Writing = one block)
location.href = "writing.html?exam=" + encodeURIComponent(examId);

  }

  // ---------- init ----------
  async function init() {
   
    const { userId } = await waitForExamContext();
window.__cl_uid = userId;

const params = new URLSearchParams(location.search);
if (params.get("reset") === "1") {
  clearLocal();
  answers = {};
} else {
  restoreLocal();
}



// --- START shared Reading+Writing timer (only once) ---
const { data: { user } } = await window.supabase.auth.getUser();
if (user) {
  const { data: existing } = await window.supabase
    .from("exam_section_results")
    .select("section")
    .eq("user_id", user.id)
    .eq("exam_id", examId)
    .eq("section", "rw_started");

  if (!existing || existing.length === 0) {
    await window.supabase.from("exam_section_results").insert({
      user_id: user.id,
      exam_id: examId,
      section: "rw_started",
      started_at: new Date().toISOString()
    });
  }
}
// --- END shared timer init ---


    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(`Missing JSON: ${DATA_URL}`);
    exam = await res.json();

    // defensive normalisation
    if (!exam.tasks || !Array.isArray(exam.tasks)) exam.tasks = [];
    if (taskIndex >= exam.tasks.length) taskIndex = 0;

    // Bind nav
    prevBtn.addEventListener("click", () => {
      if (taskIndex <= 0) return;
      taskIndex -= 1;
      persistLocal();
      renderTask();
    });

    nextBtn.addEventListener("click", () => {
      const task = exam.tasks[taskIndex];
      if (!isTaskComplete(task)) return;
      if (taskIndex >= exam.tasks.length - 1) return;
      taskIndex += 1;
      persistLocal();
      renderTask();
    });

    submitBtn.addEventListener("click", async () => {
      try {
        submitBtn.disabled = true;
        await doSubmit(false);
      } catch (e) {
        submitBtn.disabled = false;
        alert("Erro ao submeter a leitura. Tente novamente.");
        console.error(e);
      }
    });

    renderTask();

    // start timer loop
    if (exam.time_limit_minutes && !startTs) startTs = Date.now();
    tickTimer();
    setInterval(tickTimer, 1000);
  }

  init().catch((e) => {
    console.error(e);
    taskCard.innerHTML = `
      <h2 class="task-title">Erro</h2>
      <p class="task-instructions">Não foi possível carregar a leitura.</p>
      <div class="inline-warn">${String(e.message || e)}</div>
      <div class="text-block"><pre>JSON esperado em: ${DATA_URL}</pre></div>
    `;
    timerEl.textContent = "—";
    nextBtn.disabled = true;
    submitBtn.disabled = true;
  });

})();
