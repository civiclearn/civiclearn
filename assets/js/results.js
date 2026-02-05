(async function initResults() {
  // -----------------------------
  // Wait for Supabase bootstrap
  // -----------------------------
  for (let i = 0; i < 50; i++) {
    if (window.supabase) break;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!window.supabase) return;

  const mount = document.getElementById("cipleResults");
  if (!mount) return;
  



  const EXAM_ID = new URLSearchParams(location.search).get("exam") || "ciple-01";
  
  const titleEl = document.getElementById("examTitle");
if (titleEl) {
  titleEl.textContent =
    EXAM_ID.toUpperCase().replace("-", " ") + " – Simulação";
}


  // -----------------------------
  // Load exam JSONs (used to render context + option texts)
  // -----------------------------
  const READING_JSON_URL = `/ciple/assets/data/${EXAM_ID}-reading.json`;
  const LISTENING_JSON_URL = `/ciple/assets/data/${EXAM_ID}-listening.json`;

  let readingExam = null;
  let listeningExam = null;

  try {
    const res = await fetch(READING_JSON_URL, { cache: "no-store" });
    if (res.ok) readingExam = await res.json();
  } catch {}

  try {
    const res = await fetch(LISTENING_JSON_URL, { cache: "no-store" });
    if (res.ok) listeningExam = await res.json();
  } catch {}

  // -----------------------------
  // Sections (official weights)
  // -----------------------------
  const SECTIONS = [
    { id: "reading",   label: "Compreensão escrita", weight: 0.45 },
    { id: "listening", label: "Compreensão oral",   weight: 0.30 },
    { id: "writing",   label: "Produção escrita",   weight: null },
    { id: "speaking",  label: "Produção oral",      weight: 0.25 }
  ];

  // -----------------------------
  // Auth
  // -----------------------------
  const { data: { user } } = await window.supabase.auth.getUser();
  if (!user) return;

  // -----------------------------
  // Fetch stored results
  // -----------------------------
  const { data: rows, error } = await window.supabase
    .from("exam_section_results")
    .select("section, result_json")
    .eq("user_id", user.id)
    .eq("exam_id", EXAM_ID);

  if (error) return;

  const bySection = {};
  rows.forEach(r => (bySection[r.section] = r.result_json));
  
  // --------------------------------------------------
// Reading answers adapter (HTML bridge, safe fallback)
// --------------------------------------------------
if (bySection.reading?.answers) {
  const adapterEl = document.getElementById("reading-answers-adapter");

  if (adapterEl && adapterEl.textContent.trim()) {
    try {
      bySection.reading.answers = JSON.parse(adapterEl.textContent);
    } catch (e) {
      console.warn("Invalid reading answers adapter JSON", e);
    }
  }
}


  // -----------------------------
  // Helpers
  // -----------------------------
  const numOrNull = v => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const pctText = v => (v === null ? "—" : `${Math.round(v)}%`);

  const readingPct   = numOrNull(bySection.reading?.score?.percent);
  const listeningPct = numOrNull(bySection.listening?.score?.percent);
  const writingPct   = numOrNull(bySection.writing?.score?.percent);
  const speakingPct  = numOrNull(bySection.speaking?.score?.percent);

  // ---- Official aggregation ----
  let leComponent = null;
  if (readingPct !== null && writingPct !== null) leComponent = (readingPct + writingPct) / 2;

  let finalScore = null;
  let minRuleFailed = false;

  if (leComponent !== null && listeningPct !== null && speakingPct !== null) {
    if (leComponent < 25 || listeningPct < 25 || speakingPct < 25) minRuleFailed = true;

    finalScore = leComponent * 0.45 + listeningPct * 0.30 + speakingPct * 0.25;
    finalScore = Math.round(finalScore);
  }

let decision = "—";
let classification = null;

if (finalScore !== null) {
  if (minRuleFailed || finalScore < 55) {
    decision = "Reprovado";
    classification = null;
  } else {
    decision = "Aprovado";

    if (finalScore >= 85) classification = "Muito Bom";
    else if (finalScore >= 70) classification = "Bom";
    else classification = "Suficiente";
  }
}


  // -----------------------------
  // Render: sections (vertical)
  // -----------------------------
  mount.innerHTML = "";

  SECTIONS.forEach(sec => {
    const data = bySection[sec.id] || null;

    const li = document.createElement("li");
    li.className = "result-section";

    const status = data ? "Concluído" : "Não realizado";
    const statusClass = data ? "done" : "pending";

    let scoreLine = "";
    let details = "";

    if (sec.id === "reading") {
      scoreLine = data ? `Pontuação: ${pctText(readingPct)}` : "";
      details = data ? renderTaskListDetails({
        sectionId: "reading",
        exam: readingExam,
        result: bySection.reading,
        contextResolver: resolveReadingTaskContext,
        questionResolver: resolveQuestionLabel,
        optionTextResolver: resolveOptionText
      }) : "";
    }

    if (sec.id === "listening") {
      scoreLine = data ? `Pontuação: ${pctText(listeningPct)}` : "";
      details = data ? renderTaskListDetails({
        sectionId: "listening",
        exam: listeningExam,
        result: bySection.listening,
        contextResolver: resolveListeningTaskContext,
        questionResolver: resolveQuestionLabel,
        optionTextResolver: resolveOptionText,
        extrasPerTask: taskId => renderMiniAudio(taskId)
      }) : "";
    }

    if (sec.id === "writing") {
      // Writing may be "stored but not evaluated" (percent null) — show submissions for review.
      scoreLine = data ? `Pontuação: ${pctText(writingPct)}` : "";
      details = data ? renderWritingDetails(bySection.writing) : "";
    }

    if (sec.id === "speaking") {
      scoreLine = data ? `Pontuação: ${pctText(speakingPct)}` : "";
      details = data ? renderSpeakingDetails(bySection.speaking) : "";
    }

    li.innerHTML = `
  <div class="section-header">
    <div class="section-title">
      <strong>${sec.label}</strong>
      ${scoreLine ? `<span class="section-score">${pctText(
        sec.id === "reading" ? readingPct :
        sec.id === "listening" ? listeningPct :
        sec.id === "writing" ? writingPct :
        speakingPct
      )}</span>` : ""}
    </div>
    <span class="status ${statusClass}">${status}</span>
  </div>
  ${details}
`;


    mount.appendChild(li);
  });

// -----------------------------
// Summary header (TOP)
// -----------------------------
if (finalScore !== null) {

const card = document.getElementById("cipleResults")?.closest(".ciple-result-card");


if (card) {
  card.insertAdjacentHTML(
    "afterbegin",
    `
    <div class="exam-final-summary ${decision === "Aprovado" ? "pass" : "fail"}">
      <div class="final-score-circle">
        ${finalScore}%
      </div>

      <div class="final-score-text">
        <span class="final-badge ${decision === "Aprovado" ? "badge-pass" : "badge-fail"}">
          ${decision}
        </span>

        ${classification ? `<div class="final-classification">${classification}</div>` : ``}
      </div>
    </div>
    `
  );
}

  
const existingSpeaking = bySection.speaking || {};

await window.supabase
  .from("exam_section_results")
  .update({
    result_json: {
      ...existingSpeaking,
      final_score: finalScore
    }
  })
  .eq("user_id", user.id)
  .eq("exam_id", EXAM_ID)
  .eq("section", "speaking");






}


  // -----------------------------
  // Expand/collapse (reading + listening)
  // -----------------------------
  mount.addEventListener("click", e => {
    const header = e.target.closest(".result-task-header");
    if (!header) return;

    const body = header.nextElementSibling;
    if (!body || !body.classList.contains("result-task-body")) return;

    const expanded = header.getAttribute("aria-expanded") === "true";
    header.setAttribute("aria-expanded", String(!expanded));
    body.hidden = expanded;
  });

  // ============================================================
  // Generic renderer for sections with tasks/questions/options
  // ============================================================
  function renderTaskListDetails({ sectionId, exam, result, contextResolver, questionResolver, optionTextResolver, extrasPerTask }) {
    if (!result?.score?.tasks) return "";
    if (!exam?.tasks) return "";

    return `
      <div class="${sectionId}-tasks result-tasks">
        ${result.score.tasks.map(taskScore => renderOneTask({
          sectionId,
          exam,
          result,
          taskScore,
          contextResolver,
          questionResolver,
          optionTextResolver,
          extrasPerTask
        })).join("")}
      </div>
    `;
  }

  function renderOneTask({ sectionId, exam, result, taskScore, contextResolver, questionResolver, optionTextResolver, extrasPerTask }) {
    const taskId = taskScore.task_id;
    const total = taskScore.total;
    const correct = taskScore.correct;

    const task = exam.tasks.find(t => t.task_id === taskId) || null;
    const taskContext = null;
    const mistakesByText = {};

    // THE FIX: Standardize Reading answers so they are never "hidden" in nested objects
    let answersForThisTask = null;
    if (sectionId === "reading") {
      answersForThisTask = result?.answers?.[taskId] || null;
      // Check if data is nested inside part1/part2 instead of taskId
      if (!answersForThisTask && result?.answers) {
        let flattened = {};
        Object.values(result.answers).forEach(val => {
          if (val && typeof val === "object") Object.assign(flattened, val);
        });
        answersForThisTask = flattened;
      }
    } else {
      answersForThisTask = result?.answers || null;
    }

if (task?.questions && answersForThisTask) {
  for (const q of task.questions) {
    const qid = q.id;
    if (!(qid in answersForThisTask)) continue;

    const givenId = answersForThisTask[qid];
    if (givenId === q.correct_option) continue;

    const textId = q.text_id || "__no_text__";

    if (!mistakesByText[textId]) {
      mistakesByText[textId] = {
        text: task.content?.texts?.find(t => t.id === textId)?.text || null,
        items: []
      };
    }

    mistakesByText[textId].items.push({
      question: questionResolver(q),
      givenText: optionTextResolver(q, givenId, task),
      correctText: optionTextResolver(q, q.correct_option, task)
    });
  }
}



    const allCorrect = Object.keys(mistakesByText).length === 0;

    const statusClass = allCorrect ? "task-ok" : "task-error";

    // Fully correct: non-clickable, no body
    if (allCorrect) {
      return `
        <div class="result-task ${statusClass}">
          <div class="result-task-header static">
            <div class="result-task-title">
  ${sectionId === "reading" ? "Texto " : sectionId === "listening" ? "Áudio " : "Tarefa "}
  ${taskId.split("-").pop()}
</div>
            <div class="result-task-score">Nota: ${correct} / ${total}</div>
            <div class="result-task-status">✔ Correto </div>
          </div>
        </div>
      `;
    }

    // Has mistakes: clickable; expand down
    return `
      <div class="result-task ${statusClass}">
        <button class="result-task-header" aria-expanded="false">
          <div class="result-task-title">
  ${sectionId === "reading" ? "Texto " : sectionId === "listening" ? "Áudio " : "Tarefa "}
  ${taskId.split("-").pop()}
</div>
          <div class="result-task-score">Nota: ${correct} / ${total}</div>
          <div class="result-task-toggle">▼ Ver erros</div>
        </button>

        <div class="result-task-body" hidden>

          ${typeof extrasPerTask === "function" ? extrasPerTask(taskId) : ""}

          <div class="result-mistakes">
  ${Object.values(mistakesByText).map(group => `
    ${group.text ? `
      <div class="result-task-context">
        ${group.text.replace(/<hr\s*\/?>/gi, "<hr>")}
      </div>
    ` : ""}

    ${group.items.map(m => `
      <div class="result-mistake">
        ${m.question ? `<div class="result-question">${escapeHtml(m.question)}</div>` : ""}
        <div class="result-answer wrong">❌ ${escapeHtml(m.givenText)}</div>
        <div class="result-answer correct">✅ ${escapeHtml(m.correctText)}</div>
      </div>
    `).join("")}
  `).join("")}
</div>

        </div>
      </div>
    `;
  }

  // ============================================================
  // Context resolver per section (driven by JSON schema)
  // ============================================================
  function resolveReadingTaskContext(task) {
    if (!task) return null;

    // Your reading JSON is heterogeneous (confirmed from ciple-01-reading.json):
    // - match_one: no shared text; each question has its own prompt
    // - single_text_mcq: shared text in task.content.texts[0].text
    // - long_text_mcq: shared text in task.content.text
    if (task.type === "match_one") return null;

    if (task.type === "single_text_mcq") {
  return task.content?.texts
    ?.map(t => t.text)
    .filter(Boolean)
    .join("<hr>");
}


    if (task.type === "long_text_mcq") {
      return task.content?.text || null;
    }

    // fallback (safe)
    return task.content?.text || task.content?.texts?.[0]?.text || null;
  }

  function resolveListeningTaskContext(task) {
    if (!task) return null;

    // Listening schemas usually mirror: shared instructions or context under content.
    // If your listening JSON has different keys, we adjust once here only.
    return (
      task.content?.text ||
      task.content?.texts?.[0]?.text ||
      task.instructions ||
      null
    );
  }

  function resolveQuestionLabel(q) {
    // reading JSON uses "question" for mcq types; match_one uses "prompt"
    return q.question || q.prompt || null;
  }

    function resolveOptionText(q, optionId) {
    if (!optionId) return "—";

    if (q?.options) {
      // 1) Normal case: stored answer is the real option id (e.g. "m2")
      const opt = q.options.find(o => o.id === optionId);
      if (opt) {
        return opt.text || opt.label || opt.value || String(optionId);
      }

      // 2) Reading-1 (match_one) case: stored answer is a letter ("a","b","c"...)
      if (typeof optionId === "string" && /^[a-z]$/i.test(optionId)) {
        const idx = optionId.toLowerCase().charCodeAt(0) - 97; // a->0, b->1, c->2
        const opt2 = q.options[idx];
        if (opt2) {
          return opt2.text || opt2.label || opt2.value || String(optionId);
        }
      }
    }

    return String(optionId);
  }




  // ============================================================
  // Writing / Speaking detail renderers (simple, consistent)
  // ============================================================
function renderWritingDetails(result) {
  const tasks = Array.isArray(result?.tasks) ? result.tasks : [];
  const globalFeedback = typeof result?.feedback === "string" ? result.feedback : "";
  const percent = typeof result?.score?.percent === "number"
    ? `${Math.round(result.score.percent)}%`
    : "—";

  return `
    <div class="writing-evaluation">

      ${tasks.map(t => `
  <div class="writing-task-eval task-block">

<div class="writing-task-header">
  <strong>Tarefa ${t.task_index}</strong>
  <span class="score-badge ${t.score.raw <= 3 ? "fail" : t.score.raw <= 6 ? "mid" : "pass"}">
    ${t.score.raw} / 10
  </span>
</div>
          <div class="criteria-grid">
  <div class="criteria-card">
    <div class="criteria-label">Adequação</div>
    <div class="criteria-score">${t.score.criteria.adequacao_tarefa} / 3</div>
  </div>

  <div class="criteria-card">
    <div class="criteria-label">Gramática</div>
    <div class="criteria-score">${t.score.criteria.gramatica} / 3</div>
  </div>

  <div class="criteria-card">
    <div class="criteria-label">Vocabulário</div>
    <div class="criteria-score">${t.score.criteria.vocabulario} / 2</div>
  </div>

  <div class="criteria-card">
    <div class="criteria-label">Coesão</div>
    <div class="criteria-score">${t.score.criteria.coesao_clareza} / 2</div>
  </div>
</div>


          ${t.feedback
            ? `<div class="ia-comment">${escapeHtml(t.feedback)}</div>`
            : ""
          }
        </div>
      `).join("")}

      <hr>

<div class="writing-global">
  <div class="writing-global-title">
    <strong>Avaliação global da produção escrita</strong>
  </div>

  <div class="writing-global-score badge-large">
  ${percent}
</div>


  ${globalFeedback
    ? `<div class="ia-comment">${escapeHtml(globalFeedback)}</div>`
    : ""
  }
</div>


    </div>
  `;
}


function renderSpeakingDetails(result) {
  const tasks = Array.isArray(result?.tasks) ? result.tasks : [];
  const globalFeedback =
    typeof result?.feedback === "string" ? result.feedback : "";

  const percent =
    typeof result?.score?.percent === "number"
      ? `${Math.round(result.score.percent)}%`
      : "—";

  return `
    <div class="speaking-evaluation">

      ${tasks.map(t => `
  <div class="speaking-task-eval task-block">


          <div class="speaking-task-header">
  <strong>${t.taskId.replace(/^TAREFA\s+/i, "Tarefa ")}</strong>
  <span class="score-badge ${t.score?.raw <= 3 ? "fail" : t.score?.raw <= 6 ? "mid" : "pass"}">
    ${t.score?.raw ?? "—"} / 10
  </span>
</div>


          ${t.text ? `
            <div class="speaking-transcript">
              <strong>Transcrição:</strong>
              <div class="transcript-text">
                ${escapeHtml(t.text)}
              </div>
            </div>
          ` : ""}

          ${t.feedback ? `
            <div class="ia-comment">
              ${escapeHtml(t.feedback)}
            </div>
          ` : ""}

        </div>
      `).join("")}

      <hr>

      <div class="speaking-global">
        <div class="speaking-global-title">
          <strong>Avaliação global da produção oral</strong>
        </div>

        <div class="speaking-global-score badge-large">
  ${percent}
</div>


        ${globalFeedback ? `
          <div class="ia-comment">
            ${escapeHtml(globalFeedback)}
          </div>
        ` : ""}
      </div>

    </div>
  `;
}



  // ============================================================
  // Listening: mini audio
  // ============================================================
  function renderMiniAudio(taskId) {
    // Keep your existing mapping; change later if audio filenames differ.
    const src = `/assets/audio/ciple/${taskId}.mp3`;
    return `
      <div class="mini-audio">
        <audio controls preload="none" src="${src}"></audio>
      </div>
    `;
  }

  // ============================================================
  // Minimal HTML escaping to avoid breaking layout
  // ============================================================
  function escapeHtml(str) {
    const s = String(str ?? "");
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
