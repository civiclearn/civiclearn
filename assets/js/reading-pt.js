import {
  loadAttempt,
  markReading
} from "/assets/js/ciple/attempt-store.js";

(function initReading() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initReading);
    return;
  }

  const examId =
    new URLSearchParams(location.search).get("exam") || "ciple-01";

  const attempt = loadAttempt(examId);

  const pageTitle = document.getElementById("pageTitle");
  const taskCounter = document.getElementById("taskCounter");
  const taskCard = document.getElementById("taskCard");
  const nextBtn = document.getElementById("nextTask");
  const submitBtn = document.getElementById("submitReading");

  pageTitle.textContent = "Compreensão escrita";

  fetch(`/ciple/assets/data/${examId}-reading.json`)
    .then(r => r.json())
    .then(json => start(json))
    .catch(() => {
      taskCard.innerHTML = "<p>Erro ao carregar leitura.</p>";
    });

  let current = 0;
  let answers = {};

  function start(data) {
    renderTask(data.tasks[current], data.tasks.length);

    nextBtn.onclick = () => {
      current++;
      renderTask(data.tasks[current], data.tasks.length);
    };

    submitBtn.onclick = () => {
      const result = grade(data.tasks);
      markReading(attempt, result);
      window.location.href =
        `writing.html?exam=${encodeURIComponent(examId)}`;
    };
  }

  function renderTask(task, total) {
    taskCounter.textContent = `${current + 1} / ${total}`;

    taskCard.innerHTML = `
      <p>${task.text}</p>
      ${task.options.map(o => `
        <label>
          <input type="radio"
                 name="q"
                 value="${o.id}"
                 ${answers[task.id] === o.id ? "checked" : ""}>
          ${o.text}
        </label>
      `).join("")}
    `;

    taskCard.querySelectorAll("input").forEach(input => {
      input.onchange = () => {
        answers[task.id] = input.value;
        submitBtn.style.display =
          current === total - 1 ? "inline-block" : "none";
      };
    });

    nextBtn.style.display =
      current < total - 1 ? "inline-block" : "none";
  }

  function grade(tasks) {
    let correct = 0;

    tasks.forEach(t => {
      if (answers[t.id] === t.correct_option) {
        correct++;
      }
    });

    return {
      answers,
      correct,
      total: tasks.length,
      score_pct: Math.round((correct / tasks.length) * 100)
    };
  }
})();
