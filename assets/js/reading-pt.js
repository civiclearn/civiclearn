(() => {
  const qs = id => document.getElementById(id);

  const pageTitle   = qs("pageTitle");
  const pageSub     = qs("pageSub");
  const taskCounter = qs("taskCounter");
  const timerEl     = qs("timer");
  const card        = qs("taskCard");

  const prevBtn   = qs("prevTask");
  const nextBtn   = qs("nextTask");
  const submitBtn = qs("submitReading");
  const warnBox   = qs("warn");

  const examId =
    new URLSearchParams(location.search).get("exam") || "ciple-01";

  const DATA_URL = `/ciple/assets/data/${examId}-reading.json`;
  const STORE_KEY = "ciple_attempt_v1";

  let exam;
  let taskIndex = 0;
  let answers = {};
  let startedAt = Date.now();
  let totalMs = 45 * 60 * 1000;

  /* ---------- TIMER ---------- */
  function tick() {
    const left = totalMs - (Date.now() - startedAt);
    if (left <= 0) {
      timerEl.textContent = "00:00";
      submit();
      return;
    }
    const s = Math.floor(left / 1000);
    timerEl.textContent =
      `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  /* ---------- HELPERS ---------- */
  function setWarn(msg) {
    warnBox.textContent = msg || "";
  }

  function allAnswered(task) {
    return task.questions.every(q => answers[q.id]);
  }

  /* ---------- RENDER ---------- */
  function render() {
    const task = exam.tasks[taskIndex];

    pageTitle.textContent = "Compreensão escrita";
    pageSub.textContent = examId.toUpperCase();
    taskCounter.textContent = `${taskIndex + 1} / ${exam.tasks.length}`;
    setWarn("");

    card.innerHTML = `
      <div class="ciple-task-header">
        <div class="muted">Tarefa</div>
        <h2>${task.title}</h2>
        <p class="muted">${task.instructions}</p>
      </div>

      

      <div id="questionsMount">
        ${task.questions.map((q, qi) => `
          <div class="q-block">
  ${
    q.text_id && task.content?.texts
      ? (() => {
          const t = task.content.texts.find(x => x.id === q.text_id);
          return t ? `<pre class="ciple-reading-text">${t.text}</pre>` : "";
        })()
      : ""
  }
  <p class="q-prompt">${qi + 1}. ${q.prompt || q.question}</p>
  <div class="opt-grid">
    ...
  </div>
</div>

        `).join("")}
      </div>
    `;

    card.querySelectorAll(".opt-btn").forEach(btn => {
      btn.onclick = () => {
        answers[btn.dataset.q] = btn.dataset.v;
        render();
      };
    });

    prevBtn.style.display =
      taskIndex === 0 ? "none" : "inline-block";

    nextBtn.style.display =
      taskIndex < exam.tasks.length - 1 ? "inline-block" : "none";

    submitBtn.style.display =
      taskIndex === exam.tasks.length - 1 ? "inline-block" : "none";
  }

  /* ---------- SUBMIT ---------- */
  function submit() {
    let total = 0, correct = 0;

    exam.tasks.forEach(t =>
      t.questions.forEach(q => {
        total++;
        if (answers[q.id] === q.correct_option) correct++;
      })
    );

    sessionStorage.setItem(
      STORE_KEY,
      JSON.stringify({
        exam_id: examId,
        reading: {
          answers,
          total,
          correct,
          score_pct: Math.round((correct / total) * 100),
          started_at: new Date(startedAt).toISOString(),
          completed_at: new Date().toISOString()
        }
      })
    );

    location.href = `writing.html?exam=${examId}`;
  }

  /* ---------- NAV ---------- */
  prevBtn.onclick = () => {
    taskIndex--;
    render();
  };

  nextBtn.onclick = () => {
    if (!allAnswered(exam.tasks[taskIndex])) {
      setWarn("Responda a todas as perguntas antes de continuar.");
      return;
    }
    taskIndex++;
    render();
  };

  submitBtn.onclick = () => {
    if (!allAnswered(exam.tasks[taskIndex])) {
      setWarn("Responda a todas as perguntas antes de submeter.");
      return;
    }
    submit();
  };

  /* ---------- INIT ---------- */
  fetch(DATA_URL)
    .then(r => r.json())
    .then(j => {
      exam = j;
      totalMs = (j.time_limit_minutes || 45) * 60 * 1000;
      render();
      tick();
      setInterval(tick, 1000);
    })
    .catch(() => {
      card.innerHTML = "<p>Erro ao carregar leitura.</p>";
    });
})();
