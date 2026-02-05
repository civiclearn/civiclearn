(() => {
  const qs = s => document.querySelector(s);

  const pageTitle   = qs("#pageTitle");
  const pageSub     = qs("#pageSub");
  const taskCounter = qs("#taskCounter");
  const timerEl     = qs("#timer");
  const taskCard    = qs("#taskCard");

  const prevBtn   = qs("#prevTask");
  const nextBtn   = qs("#nextTask");
  const submitBtn = qs("#submitReading");
  const warnEl    = qs("#warn");

  const examId =
    new URLSearchParams(location.search).get("exam") || "ciple-01";

  const DATA_URL = `/ciple/assets/data/${examId}-reading.json`;
  const ATTEMPT_KEY = "ciple_attempt_v1";

  let examJson;
  let taskIndex = 0;
  let answers = {};

  /* ---------- ATTEMPT STORAGE ---------- */

  function loadAttempt() {
    try {
      const raw = sessionStorage.getItem(ATTEMPT_KEY);
      return raw ? JSON.parse(raw) : { exam_id: examId };
    } catch {
      return { exam_id: examId };
    }
  }

  function saveAttempt(attempt) {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
  }

  /* ---------- TIMER ---------- */

  let startMs = Date.now();
  let totalMs = 45 * 60 * 1000;

  function tickTimer() {
    const left = totalMs - (Date.now() - startMs);
    if (left <= 0) {
      timerEl.textContent = "Tempo esgotado";
      submit();
      return;
    }
    const s = Math.floor(left / 1000);
    timerEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2,"0")}`;
  }

  /* ---------- RENDER ---------- */

  function renderTask() {
    const task = examJson.tasks[taskIndex];
    if (!task) return;

    taskCounter.textContent = `Tarefa ${taskIndex + 1} / ${examJson.tasks.length}`;
    warnEl.textContent = "";

    let contentHtml = "";
    if (task.content?.texts) {
      contentHtml = `
        <div class="ciple-reading-content">
          ${task.content.texts.map(t => `
            <div class="ciple-reading-text">
              <pre>${t.text}</pre>
            </div>
          `).join("")}
        </div>
      `;
    }

    taskCard.innerHTML = `
      <div class="ciple-reading-task">
        <h3>${task.title}</h3>
        <p class="muted">${task.instructions}</p>
        ${contentHtml}

        ${task.questions.map(q => `
          <div class="ciple-reading-question">
            <p><strong>${q.prompt || q.question}</strong></p>
            ${q.options.map(o => `
              <label class="ciple-opt">
                <input type="radio"
                       name="${q.id}"
                       value="${o.id}"
                       ${answers[q.id] === o.id ? "checked" : ""}>
                ${o.text}
              </label>
            `).join("")}
          </div>
        `).join("")}
      </div>
    `;

    taskCard.querySelectorAll("input[type=radio]").forEach(i => {
      i.onchange = () => answers[i.name] = i.value;
    });

    prevBtn.style.display   = taskIndex === 0 ? "none" : "inline-block";
    nextBtn.style.display   = taskIndex < examJson.tasks.length - 1 ? "inline-block" : "none";
    submitBtn.style.display = taskIndex === examJson.tasks.length - 1 ? "inline-block" : "none";
  }

  /* ---------- SUBMIT ---------- */

  function submit() {
    let correct = 0;
    let total = 0;

    examJson.tasks.forEach(t => {
      t.questions.forEach(q => {
        total++;
        if (answers[q.id] === q.correct_option) correct++;
      });
    });

    const attempt = loadAttempt();
    attempt.reading = {
      answers,
      correct,
      total,
      score_pct: Math.round((correct / total) * 100),
      completed_at: new Date().toISOString()
    };

    saveAttempt(attempt);
    location.href = `writing.html?exam=${examId}`;
  }

  /* ---------- INIT ---------- */

  fetch(DATA_URL)
    .then(r => r.json())
    .then(json => {
      examJson = json;
      totalMs = (json.time_limit_minutes || 45) * 60 * 1000;
      renderTask();
      setInterval(tickTimer, 1000);
    });

  prevBtn.onclick   = () => { taskIndex--; renderTask(); };
  nextBtn.onclick   = () => { taskIndex++; renderTask(); };
  submitBtn.onclick = submit;

})();
