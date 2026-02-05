// /assets/js/reading-pt.js
// PORTUGUESE — READING ADAPTER (SKIN PRESERVED, ENGINE ONLY)

import { ExamEngine } from "/assets/js/exam-engine.js";

(() => {
  const qs = (s) => document.querySelector(s);

  const pageTitle = qs("#pageTitle");
  const pageSub   = qs("#pageSub");
  const taskCard  = qs("#taskCard");
  const taskCnt   = qs("#taskCounter");
  const timerEl   = qs("#timer");
  const prevBtn   = qs("#prevTask");
  const nextBtn   = qs("#nextTask");
  const submitBtn = qs("#submitReading");
  const warnEl    = qs("#warn");

  const params = new URLSearchParams(location.search);
  const examId = params.get("exam") || "ciple-01";

  let examData = null;
  let taskIndex = 0;

  const engine = new ExamEngine({
    examId,
    section: "reading",
    timeLimitMin: null,
    onTimeUp: () => doSubmit()
  });

  /* ---------- INIT ---------- */

  async function init() {
    await engine.init();

    const res = await fetch(`/ciple/assets/data/${examId}-reading.json`);
    examData = await res.json();

    pageTitle.textContent = "Compreensão escrita";
    pageSub.textContent = examData.subtitle || "";

    renderTask();
    bindNav();
  }

  /* ---------- RENDER ---------- */

  function renderTask() {
    const task = examData.tasks[taskIndex];
    taskCnt.textContent = `${taskIndex + 1} / ${examData.tasks.length}`;

    taskCard.innerHTML = `
      <h2>${task.title}</h2>
      ${task.questions.map(q => `
        <div class="q">
          <p>${q.prompt}</p>
          <div class="opts">
            ${q.options.map(opt => {
              const sel = engine.getAnswer(task.task_id, q.id) === opt.id;
              return `
                <button
                  type="button"
                  class="opt-btn ${sel ? "selected" : ""}"
                  data-task="${task.task_id}"
                  data-q="${q.id}"
                  data-opt="${opt.id}"
                >${opt.text}</button>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
    `;

    taskCard.querySelectorAll(".opt-btn").forEach(btn => {
      btn.addEventListener("click", onOptionClick);
    });

    prevBtn.style.display = taskIndex === 0 ? "none" : "";
    nextBtn.style.display = taskIndex === examData.tasks.length - 1 ? "none" : "";
    submitBtn.style.display = taskIndex === examData.tasks.length - 1 ? "" : "none";
  }

  /* ---------- EVENTS ---------- */

  function onOptionClick(e) {
    const b = e.currentTarget;
    engine.setAnswer(b.dataset.task, b.dataset.q, b.dataset.opt);
    renderTask();
  }

  function bindNav() {
    prevBtn.onclick = () => {
      if (taskIndex > 0) {
        taskIndex--;
        renderTask();
      }
    };

    nextBtn.onclick = () => {
      if (taskIndex < examData.tasks.length - 1) {
        taskIndex++;
        renderTask();
      }
    };

    submitBtn.onclick = () => doSubmit();
  }

  /* ---------- SUBMIT ---------- */

  async function doSubmit() {
    if (!examData) return;

    let correct = 0;
    let total = 0;

    examData.tasks.forEach(t =>
      t.questions.forEach(q => {
        total++;
        if (engine.getAnswer(t.task_id, q.id) === q.correct_option) {
          correct++;
        }
      })
    );

    const percent = Math.round((correct / total) * 100);

    await engine.submit({
      score: { percent },
      total_questions: total,
      correct_answers: correct
    });

    location.href = `writing.html?exam=${examId}`;
  }

  /* ---------- TIMER DISPLAY ---------- */

  document.addEventListener("exam:tick", (e) => {
    const ms = e.detail.remainingMs;
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    timerEl.textContent = `${m}:${s < 10 ? "0" : ""}${s}`;
  });

  init().catch(console.error);
})();
