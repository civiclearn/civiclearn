// /assets/js/ciple/speaking-pt.js

(() => {

  const tasks = document.querySelectorAll(".oral-task");
  const submitBtn = document.getElementById("submitSpeaking");

  if (!tasks.length || !submitBtn) return;

  const recordings = {};
sessionStorage.setItem("speaking-exam", new URLSearchParams(location.search).get("exam") || "ciple-01");
     // task_id -> Blob
  const recordingURLs = {};   // task_id -> ObjectURL
  let mediaRecorder = null;
  let chunks = [];

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------
  function updateSubmitState() {
    const allDone = Array.from(tasks).every(t => {
      const id = t.dataset.taskId;
      return recordings[id];
    });

    submitBtn.disabled = !allDone;
    submitBtn.classList.toggle("enabled", allDone);
  }

  // --------------------------------------------------
  // Recording
  // --------------------------------------------------
  async function startRecording(taskEl) {
    if (mediaRecorder) return;

    const taskId = taskEl.dataset.taskId;
    chunks = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      recordings[taskId] = blob;

      if (recordingURLs[taskId]) {
        URL.revokeObjectURL(recordingURLs[taskId]);
      }

      const url = URL.createObjectURL(blob);
      recordingURLs[taskId] = url;

      const playback = taskEl.querySelector(".playback");
      const audio = playback.querySelector("audio");
      audio.src = url;
      playback.hidden = false;

      taskEl.querySelector(".status").textContent =
        "Gravado — pode ouvir ou gravar novamente";

      updateSubmitState();

      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorder = null;
      chunks = [];
    };

    taskEl.querySelector(".start").disabled = true;
    taskEl.querySelector(".stop").disabled = false;
    taskEl.querySelector(".status").textContent = "A gravar…";
  }

  function stopRecording(taskEl) {
    if (!mediaRecorder) return;
    mediaRecorder.stop();

    taskEl.querySelector(".start").disabled = false;
    taskEl.querySelector(".stop").disabled = true;
  }

  // --------------------------------------------------
  // Bind buttons
  // --------------------------------------------------
  tasks.forEach(task => {
    task.querySelector(".start")
      .addEventListener("click", () => startRecording(task));

    task.querySelector(".stop")
      .addEventListener("click", () => stopRecording(task));
  });

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------
  submitBtn.addEventListener("click", async () => {
    if (submitBtn.disabled) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "A enviar…";

    const ctx = window.CIPLE_EXAM_CONTEXT;
if (!ctx || !ctx.userId) {
  alert("Sessão não disponível. Atualize a página.");
  submitBtn.disabled = false;
  submitBtn.textContent = "Submeter Produção Oral";
  return;
}

const { data: { session } } = await window.supabase.auth.getSession();
if (!session || !session.access_token) {
  alert("Sessão expirada. Atualize a página.");
  submitBtn.disabled = false;
  submitBtn.textContent = "Submeter Produção Oral";
  return;
}


    const formData = new FormData();
    const examId = new URLSearchParams(location.search).get("exam") || "ciple-01";
formData.append("exam_id", examId);
    formData.append("section", "speaking");

    tasks.forEach(task => {
      const taskId = task.dataset.taskId;

      // REQUIRED by Edge Function
      const taskType = task.dataset.taskType;
      const prompt = task.dataset.prompt || "";

      if (!taskType) {
        console.error(`Missing task_type for ${taskId}`);
        return;
      }

      formData.append(`task_type_${taskId}`, taskType);
      formData.append(`prompt_${taskId}`, prompt);

      // Only for image_description
      if (taskType === "image_description") {
        const evalCtx = task.dataset.evaluationContext;
        if (evalCtx) {
          formData.append(`evaluation_context_${taskId}`, evalCtx);
        }
      }

      if (recordings[taskId]) {
        formData.append(
          `audio_${taskId}`,
          recordings[taskId],
          `${taskId}.webm`
        );
      }
    });

    try {
      const res = await fetch(
        "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/evaluate-speaking",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          },
          body: formData
        }
      );

     // Show waiting state
submitBtn.textContent = "⏳ Avaliação em curso…";
submitBtn.disabled = true;
submitBtn.classList.remove("enabled");

// Redirect deterministically to results
const exam = new URLSearchParams(location.search).get("exam") || "ciple-01";
setTimeout(() => {
  window.location.href = `/ciple/dashboard/results.html?exam=${encodeURIComponent(exam)}`;
}, 1200);



    } catch (e) {
      console.error(e);
      alert("Erro ao enviar a produção oral.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Submeter Produção Oral";
    }
  });

  submitBtn.disabled = true;

})();
