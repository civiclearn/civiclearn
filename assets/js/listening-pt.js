
const EXAM_DEFAULT = "ciple-01";

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function lsKey(examId) {
  return `ciple_${examId}_listening_state_v1`;
}

function shuffleCopy(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function clamp01(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  return n;
}



async function replaceSectionRow({ userId, examId, section, resultJson }) {
  // Ensure single row per (user, exam, section) without relying on unique constraints
  await window.supabase
    .from("exam_section_results")
    .delete()
    .eq("user_id", userId)
    .eq("exam_id", examId)
    .eq("section", section);

  const { error: insertError } = await window.supabase
    .from("exam_section_results")
    .insert({
      user_id: userId,
      exam_id: examId,
      section,
      result_json: resultJson
    });

  if (insertError) throw new Error(insertError.message);
}

function ensureAllAnswered(task, answers) {
  if (!task?.questions?.length) return false;

  // MCQ types: answer is selected option text
  if (task.type === "single_audio_mcq" || task.type === "long_audio_mcq") {
    return task.questions.every(q => typeof answers[q.id] === "string" && answers[q.id].trim().length > 0);
  }

  // match_one: answer is selected option text, and should be non-empty for all
  if (task.type === "match_one") {
    return task.questions.every(q => typeof answers[q.id] === "string" && answers[q.id].trim().length > 0);
  }

  return false;
}

function detectDuplicateSelectionsForMatchOne(task, answers) {
  if (task.type !== "match_one") return null;
  const vals = task.questions
    .map(q => answers[q.id])
    .filter(v => typeof v === "string" && v.trim().length > 0);

  const seen = new Set();
  const dup = new Set();
  for (const v of vals) {
    if (seen.has(v)) dup.add(v);
    seen.add(v);
  }
  if (dup.size === 0) return null;
  return Array.from(dup);
}

function gradeAll(tasks, answers) {
  const perTask = [];
  let total = 0;
  let correct = 0;

  for (const t of tasks) {
    let tTotal = 0;
    let tCorrect = 0;

    for (const q of t.questions || []) {
      tTotal += 1;
      const chosen = answers[q.id];

      // We store options as strings in JSON; correct_option is the correct string
      if (typeof chosen === "string" && chosen === q.correct_option) {
        tCorrect += 1;
      }
    }

    perTask.push({
      task_id: t.task_id,
      total: tTotal,
      correct: tCorrect
    });

    total += tTotal;
    correct += tCorrect;
  }

  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { perTask, total, correct, percent };
}

(async function main() {
  const examId = qs("exam") || EXAM_DEFAULT;

  const taskKicker = document.getElementById("taskKicker");
  const taskTitle = document.getElementById("taskTitle");
  const taskInstructions = document.getElementById("taskInstructions");

  const audioBox = document.getElementById("audioBox");
  const audioEl = document.getElementById("audioEl");
  const audioPlaysLeft = document.getElementById("audioPlaysLeft");

  const warnBox = document.getElementById("warnBox");

  const mount = document.getElementById("questionsMount");
  const submitBtn = document.getElementById("submitBtn");
  const progressLine = document.getElementById("progressLine");
  const timerText = document.getElementById("timerText");

  const submittedBox = document.getElementById("listening-submitted");

  // ---- Load JSON ----
  const jsonUrl = `/ciple/assets/data/${examId}-listening.json`;
  const res = await fetch(jsonUrl, { cache: "no-store" });
  if (!res.ok) {
    mount.innerHTML = `<p class="warn">Não foi possível carregar o ficheiro de Listening: ${jsonUrl}</p>`;
    return;
  }
  const exam = await res.json();

  const tasks = Array.isArray(exam.tasks) ? exam.tasks : [];
  const timeLimitMin = clamp01(exam.time_limit_minutes) ?? 30;
  const timeLimitSec = timeLimitMin * 60;

  // ---- State ----
  const savedRaw = localStorage.getItem(lsKey(examId));
  const saved = savedRaw ? JSON.parse(savedRaw) : null;

  let taskIndex = saved?.taskIndex ?? 0;
  if (taskIndex < 0) taskIndex = 0;
  if (taskIndex >= tasks.length) taskIndex = tasks.length - 1;

  const answers = saved?.answers ?? {};
  const audioPlayCount = saved?.audioPlayCount ?? {}; // key: task_id -> number of plays started
  const startedAt = saved?.startedAt ?? nowIso();

  function persist() {
    localStorage.setItem(lsKey(examId), JSON.stringify({
      taskIndex,
      answers,
      audioPlayCount,
      startedAt
    }));
  }

  // ---- Timer ----
  const startMs = new Date(startedAt).getTime();
  const tick = () => {
    const elapsed = Math.floor((Date.now() - startMs) / 1000);
    const remain = timeLimitSec - elapsed;
    timerText.textContent = fmtTime(remain);
    if (remain <= 0) {
      // Auto-submit when time ends
      submitBtn.click();
    }
  };
  tick();
  const timerHandle = setInterval(tick, 1000);

  // ---- Audio play limiting (2 plays per task, pause/resume does not consume extra) ----
  let currentTaskAudioId = null;
  let hasConsumedPlayThisSession = false;

  function setWarn(msg) {
    if (!msg) {
      warnBox.hidden = true;
      warnBox.textContent = "";
      return;
    }
    warnBox.hidden = false;
    warnBox.textContent = msg;
  }

  function renderAudioForTask(t) {
    const audioSrc = t?.content?.audio;
    if (!audioSrc) {
      audioBox.hidden = true;
      audioEl.removeAttribute("src");
      audioEl.load();
      currentTaskAudioId = null;
      hasConsumedPlayThisSession = false;
      return;
    }

    audioBox.hidden = false;
    audioEl.src = audioSrc;
    audioEl.load();

    currentTaskAudioId = t.task_id;
    hasConsumedPlayThisSession = false;

    const used = audioPlayCount[currentTaskAudioId] ?? 0;
    const left = Math.max(0, 2 - used);
    audioPlaysLeft.textContent = `Reproduções restantes: ${left}`;

// If already exhausted, disable audio completely
if (left <= 0) {
  audioEl.pause();
  audioEl.removeAttribute("src");
  audioEl.load();
  audioEl.controls = false;
  audioEl.style.display = "none";
  setWarn("Já utilizou as 2 reproduções permitidas para este áudio.");
  return;
} else {
  audioEl.controls = true;
  audioEl.style.display = "";
  setWarn(null);
}

  audioEl.addEventListener("play", () => {
    if (!currentTaskAudioId) return;

    const used = audioPlayCount[currentTaskAudioId] ?? 0;
    const left = Math.max(0, 2 - used);

    if (left <= 0) {
      audioEl.pause();
      setWarn("Já utilizou as 2 reproduções permitidas para este áudio.");
      return;
    }

    // Count only the first play start per “fresh load” of the task
    if (!hasConsumedPlayThisSession) {
      audioPlayCount[currentTaskAudioId] = used + 1;
      hasConsumedPlayThisSession = true;
      persist();

      const newLeft = Math.max(0, 2 - (audioPlayCount[currentTaskAudioId] ?? 0));
      audioPlaysLeft.textContent = `Reproduções restantes: ${newLeft}`;
      if (newLeft <= 0) {
        // Keep controls, but block further plays via handler
      }
    }
  });
  }

  // ---- Rendering ----
  function renderTask() {
    const t = tasks[taskIndex];
    if (!t) return;

    taskKicker.textContent = `Tarefa ${taskIndex + 1} de ${tasks.length}`;
    taskTitle.textContent = t.title || `Compreensão do oral ${taskIndex + 1}`;
    taskInstructions.textContent = t.instructions || "";

    renderAudioForTask(t);

    // Render questions
    if (t.type === "single_audio_mcq" || t.type === "long_audio_mcq") {
      mount.innerHTML = renderMcqTask(t);
    } else if (t.type === "match_one") {
      mount.innerHTML = renderMatchOneTask(t);
    } else {
      mount.innerHTML = `<p class="warn">Tipo de tarefa não suportado: ${t.type}</p>`;
    }


    // Submit enabled only when all answered on last task
    const allAnswered = ensureAllAnswered(t, answers);
    
    progressLine.textContent = `Progresso: ${taskIndex + 1}/${tasks.length}`;
	// Button label logic
if (taskIndex < tasks.length - 1) {
  submitBtn.textContent = "Próxima pergunta";
  submitBtn.disabled = !ensureAllAnswered(t, answers);
} else {
  submitBtn.textContent = "Submeter Compreensão do Oral";
  submitBtn.disabled = !ensureAllAnswered(t, answers);
}


    // Warn duplicates for match_one
    const dups = detectDuplicateSelectionsForMatchOne(t, answers);
    if (dups && dups.length > 0) {
      setWarn("Atenção: escolheu a mesma opção mais do que uma vez. No exame, cada opção normalmente é usada apenas uma vez.");
    } else {
      if (audioBox.hidden === false) {
        // keep audio warnings if any
        const used = audioPlayCount[currentTaskAudioId] ?? 0;
        const left = Math.max(0, 2 - used);
        if (left > 0) setWarn(null);
      } else {
        setWarn(null);
      }
    }
  }

  function renderMcqTask(t) {
  const blocks = (t.questions || []).map((q, idx) => {
    const opts = shuffleCopy(q.options || []);
    const chosen = answers[q.id] || "";

    return `
      <div class="q-block" data-qid="${q.id}">
        <p class="q-prompt">${idx + 1}. ${q.prompt}</p>
        <div class="opt-list buttons">
          ${opts.map(optText => {
            const selected = chosen === optText ? "selected" : "";
            return `
              <button
                type="button"
                class="opt-btn ${selected}"
                data-qid="${q.id}"
                data-value="${escapeHtml(optText)}">
                ${escapeHtml(optText)}
              </button>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }).join("");

  return blocks;
}


  function renderMatchOneTask(t) {
    const options = shuffleCopy(t.content?.options || []);
    const rows = (t.questions || []).map((q) => {
      const chosen = answers[q.id] || "";
      return `
        <div class="match-row" data-qid="${q.id}">
          <label>${escapeHtml(q.prompt)}</label>
          <select data-qid="${q.id}">
            <option value="">— selecionar —</option>
            ${options.map(opt => {
              const selected = chosen === opt ? "selected" : "";
              return `<option value="${escapeHtml(opt)}" ${selected}>${escapeHtml(opt)}</option>`;
            }).join("")}
          </select>
        </div>
      `;
    }).join("");

    return `<div class="match-grid">${rows}</div>`;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  
  // MCQ buttons MUST use click (change never fires on <button>)
mount.addEventListener("click", (e) => {
  if (!e.target || !e.target.matches("button.opt-btn")) return;

  const qid = e.target.getAttribute("data-qid");
  const val = e.target.getAttribute("data-value");

  answers[qid] = val;
  persist();

  // visual selection
  const group = e.target.closest(".opt-list");
  group.querySelectorAll(".opt-btn").forEach(b => b.classList.remove("selected"));
  e.target.classList.add("selected");

  submitBtn.disabled = !ensureAllAnswered(tasks[taskIndex], answers);
});


  // ---- Events ----
  mount.addEventListener("change", (e) => {
    const t = tasks[taskIndex];
    if (!t) return;





    // Select (match_one)
   if (e.target && e.target.matches("select[data-qid]")) {
  const qid = e.target.getAttribute("data-qid");
  const val = e.target.value;
  answers[qid] = val;
  persist();

  // ENABLE button when task is complete
  submitBtn.disabled = !ensureAllAnswered(t, answers);

  const dups = detectDuplicateSelectionsForMatchOne(t, answers);

      if (dups && dups.length > 0) {
        setWarn("Atenção: escolheu a mesma opção mais do que uma vez. No exame, cada opção normalmente é usada apenas uma vez.");
      } else {
        setWarn(null);
      }
    }
  });

  submitBtn.addEventListener("click", async () => {
  try {
    const t = tasks[taskIndex];

    // If NOT last task → advance
    if (taskIndex < tasks.length - 1) {
      if (!ensureAllAnswered(t, answers)) {
        setWarn("Complete todas as respostas desta tarefa antes de avançar.");
        return;
      }
      setWarn(null);
      taskIndex += 1;
      persist();
      renderTask();
      return;
    }

      if (!ensureAllAnswered(t, answers)) {
        setWarn("Complete todas as respostas antes de submeter.");
        return;
      }

      // Grade
      const g = gradeAll(tasks, answers);

      const resultJson = {
        exam_id: examId,
        section: "listening",
        started_at: startedAt,
        completed_at: nowIso(),
        time_limit_minutes: timeLimitMin,
        score: {
          tasks: g.perTask,
          total: g.total,
          correct: g.correct,
          percent: g.percent
        },
        answers
      };

      // Store
     // Store
const { userId } = window.CIPLE_EXAM_CONTEXT || {};
if (!userId) throw new Error("No user context");

await replaceSectionRow({
  userId,
  examId,
  section: "listening",
  resultJson
});


      // UI: submitted
      clearInterval(timerHandle);
      document.querySelector(".task-card").hidden = true;
      submittedBox.hidden = false;

      // Clear persisted state (optional: keep it; here we clear to avoid resubmission confusion)
      localStorage.removeItem(lsKey(examId));
	  location.href = "speaking.html?exam=" + encodeURIComponent(examId);

    } catch (err) {
      console.error(err);
      setWarn("Erro ao submeter os resultados. Tente novamente.");
    }
  });

  // ---- Initial render ----
  renderTask();

})();
