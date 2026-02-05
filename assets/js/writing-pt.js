(function initWriting() {

  // If DOM is not ready yet, wait once
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWriting);
    return;
  }

  const sectionEl = document.querySelector(".ciple-section[data-section='writing']");
  if (!sectionEl) return;
  
  const examId = new URLSearchParams(location.search).get("exam") || "ciple-01";
  
    document.getElementById("writingTitle").textContent =
    `Produção Escrita – ${examId.toUpperCase()}`;

let rwStartedAt = null;

(async () => {
  if (!window.supabase || !window.supabase.auth) return;
const ctx = window.CIPLE_EXAM_CONTEXT;
if (!ctx || !ctx.userId) return;

const { data } = await window.supabase
  .from("exam_section_results")
  .select("section, started_at")
  .eq("user_id", ctx.userId)
  .eq("exam_id", examId)
  .eq("section", "rw_started");


  if (!data || !data[0] || !data[0].started_at) {
  const now = new Date().toISOString();

  await window.supabase
    .from("exam_section_results")
    .insert({
      user_id: ctx.userId,
      exam_id: examId,
      section: "rw_started",
      started_at: now
    });

  rwStartedAt = new Date(now).getTime();
} else {
  rwStartedAt = new Date(data[0].started_at).getTime();
}

})();


(async () => {
  if (!window.supabase || !window.supabase.auth) return;
const { data: { session } } = await window.supabase.auth.getSession();
  if (!session) return;

  const { data: results } = await window.supabase
    .from("exam_section_results")
    .select("section")
    .eq("exam_id", examId)
    .eq("user_id", session.user.id);

  const readingDone = (results || []).some(r => r.section === "reading");

  if (!readingDone) {
    window.location.href = `reading.html?exam=${examId}`;
  }
})();


  const submitBtn = document.getElementById("submitWriting");
  const timerEl = document.createElement("div");
timerEl.className = "ciple-timer";
sectionEl.prepend(timerEl);

const TOTAL_MS = 75 * 60 * 1000; // 1h15

function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

setInterval(() => {
  if (!rwStartedAt) return;

  const remaining = TOTAL_MS - (Date.now() - rwStartedAt);

  if (remaining <= 0) {
    timerEl.textContent = "Tempo esgotado";
    submitBtn.click();
    return;
  }

  timerEl.textContent = `Tempo restante: ${formatTime(remaining)}`;
}, 1000);

  const tasksContainer = sectionEl.querySelector("#writingTasks");
  if (!tasksContainer || !submitBtn) return;

  let tasks = [];

  fetch(`/ciple/assets/data/${examId}-writing.json`)
    .then(r => {
      if (!r.ok) throw new Error("Writing JSON not found");
      return r.json();
    })
    .then(json => {
      json.tasks.forEach(task => {
        const el = document.createElement("div");
        el.className = "ciple-task";
        el.dataset.taskId = task.task_id;
        el.dataset.min = task.constraints.min_words;
        el.dataset.max = task.constraints.max_words;

        el.innerHTML = `
          <div class="ciple-task-prompt">
            <p>${task.prompt.context}</p>

            ${task.prompt.incoming_message ? `
              <blockquote class="ciple-quote">
                ${task.prompt.incoming_message}
              </blockquote>
            ` : ""}

            ${task.prompt.email_opening ? `
              <blockquote class="ciple-quote">
                ${task.prompt.email_opening.replace(/\\n/g, "<br>")}
              </blockquote>
            ` : ""}

            <p class="ciple-instruction">
              ${task.instructions}
              (<strong>${task.constraints.min_words}–${task.constraints.max_words} palavras</strong>)
            </p>
          </div>

          <textarea class="ciple-textarea" rows="6"></textarea>

          <div class="ciple-meta">
            <span class="word-count">0 palavras</span>
            <span class="word-warning"></span>
          </div>
        `;

        tasksContainer.appendChild(el);
        tasks.push(el);
      });

      attachListeners();
      submitBtn.disabled = true;
    })
    .catch(err => {
      console.error(err);
      alert("Erro ao carregar a prova de escrita.");
    });

  function countWords(text) {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }

  function attachListeners() {
    tasks.forEach(task => {
      const textarea = task.querySelector(".ciple-textarea");
      textarea.addEventListener("input", () => {
        validateTask(task);
        validateAll();
      });
    });
  }

  function validateTask(task) {
    const textarea = task.querySelector(".ciple-textarea");
    const countEl = task.querySelector(".word-count");
    const warnEl = task.querySelector(".word-warning");

    const min = parseInt(task.dataset.min, 10);
    const max = parseInt(task.dataset.max, 10);
    const words = countWords(textarea.value);

    countEl.textContent = `${words} palavras`;

    if (words === 0) {
      warnEl.textContent = "";
      return false;
    }

    if (words < min) {
      warnEl.textContent = `Mínimo ${min} palavras`;
      return false;
    }

    if (words > max) {
      warnEl.textContent = `Máximo ${max} palavras`;
      return false;
    }

    warnEl.textContent = "";
    return true;
  }

  function validateAll() {
    let ok = true;
    tasks.forEach(task => {
      if (!validateTask(task)) ok = false;
    });
    submitBtn.disabled = !ok;
  }

  // Submit handler
  submitBtn.addEventListener("click", async () => {
	  
	  submitBtn.disabled = true;
submitBtn.textContent = "A avaliar…";
submitBtn.classList.add("is-waiting");

document.body.classList.add("is-submitting");

	  
 const examId = new URLSearchParams(location.search).get("exam") || "ciple-01";
    submitBtn.disabled = true;
    submitBtn.textContent = "A avaliar… ⏳";

    const ctx = window.CIPLE_EXAM_CONTEXT;
if (!ctx || !ctx.userId) {
  alert("Sessão não disponível. Atualize a página.");
  submitBtn.disabled = false;
  submitBtn.textContent = "Submeter Produção Escrita";
  return;
}

const { data: { session } } =
  await window.supabase.auth.getSession();

if (!session || !session.access_token) {
  alert("Sessão expirada. Atualize a página.");
  submitBtn.disabled = false;
  submitBtn.textContent = "Submeter Produção Escrita";
  return;
}


    const payload = {
  exam_id: examId,
  section: "writing",
  submissions: []
};


   tasks.forEach(task => {
  const promptEl = task.querySelector(".ciple-task-prompt");
  const taskPrompt = promptEl ? promptEl.innerText.trim() : task.dataset.taskId;

  payload.submissions.push({
    task_id: task.dataset.taskId,
    task_prompt: taskPrompt,
    text: task.querySelector(".ciple-textarea").value.trim()
  });
});


    try {
     
	 const res = await fetch(
  "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/evaluate-writing",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  }
);

// Show waiting state (same UX as Speaking)
submitBtn.textContent = "⏳ Avaliação em curso…";
submitBtn.disabled = true;

// Redirect deterministically to Listening
setTimeout(() => {
  window.location.href =
    "listening.html?exam=" + encodeURIComponent(examId);
}, 1200);




    } catch (err) {
      console.error(err);
      alert("Erro ao avaliar a produção escrita. Tente novamente.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submeter Produção Escrita";
    }
  });

})();
