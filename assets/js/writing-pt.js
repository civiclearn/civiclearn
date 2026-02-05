/**
 * CIVIC LEARN EXAM ENGINE - WRITING SECTION
 * Robust rewrite with auto-save and upsert logic
 */
(() => {
  const WritingEngine = {
    config: {
      examId: new URLSearchParams(location.search).get("exam") || "ciple-01",
      dataUrl: (id) => `/ciple/assets/data/${id}-writing.json`,
    },
    state: { user: null, examData: null, answers: {}, startTime: null, isSubmitting: false },
    el: {
      taskCard: document.querySelector("#taskCard"),
      timer: document.querySelector("#timer"),
      submitBtn: document.querySelector("#submitWriting")
    },

    async init() {
      try {
        await window.waitForSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Unauthorized");
        this.state.user = session.user;

        const res = await fetch(this.config.dataUrl(this.config.examId));
        this.state.examData = await res.json();

        this.restore();
        this.render();
        this.startTimer();
      } catch (e) {
        this.el.taskCard.innerHTML = `<div style="color:red;padding:20px;">Erro de Autenticação. Por favor, faça login novamente.</div>`;
      }
    },

    restore() {
      const key = `ciple:${this.state.user.id}:${this.config.examId}:writing`;
      this.state.answers = JSON.parse(localStorage.getItem(`${key}:ans`) || "{}");
      this.state.startTime = parseInt(localStorage.getItem(`${key}:ts`)) || Date.now();
      if (!localStorage.getItem(`${key}:ts`)) localStorage.setItem(`${key}:ts`, this.state.startTime);
    },

    saveLocal() {
      const key = `ciple:${this.state.user.id}:${this.config.examId}:writing`;
      localStorage.setItem(`${key}:ans`, JSON.stringify(this.state.answers));
    },

    async doSubmit() {
      if (this.state.isSubmitting) return;
      this.state.isSubmitting = true;
      this.el.submitBtn.innerText = "Enviando...";

      try {
        const payload = {
          user_id: this.state.user.id,
          exam_id: this.config.examId,
          section: "writing",
          result_json: {
            answers: this.state.answers,
            completed_at: new Date().toISOString()
          }
        };

        const { error } = await supabase.from("exam_section_results").upsert(payload, { onConflict: 'user_id,exam_id,section' });
        if (error) throw error;

        localStorage.removeItem(`ciple:${this.state.user.id}:${this.config.examId}:writing:ans`);
        // Move to the next section or dashboard
        window.location.href = `/ciple/dashboard.html?finished=${this.config.examId}`;
      } catch (err) {
        this.state.isSubmitting = false;
        this.el.submitBtn.innerText = "Tentar Novamente";
        alert("Erro ao enviar: " + err.message);
      }
    },

    render() {
      this.el.taskCard.innerHTML = this.state.examData.tasks.map((task, i) => `
        <div class="writing-task">
          <h3>Tarefa ${i + 1}</h3>
          <p class="instructions">${task.instructions}</p>
          <div class="prompt-box">${task.prompt}</div>
          <textarea 
            class="writing-area" 
            data-tid="${task.task_id}" 
            placeholder="Escreva sua resposta aqui..."
          >${this.state.answers[task.task_id] || ""}</textarea>
          <div class="word-count">Palavras: <span id="count-${task.task_id}">0</span></div>
        </div>
      `).join('');

      this.el.taskCard.querySelectorAll(".writing-area").forEach(area => {
        area.oninput = (e) => {
          this.state.answers[e.target.dataset.tid] = e.target.value;
          this.saveLocal();
          this.updateWordCount(e.target);
        };
        this.updateWordCount(area);
      });

      this.el.submitBtn.onclick = () => {
        if (confirm("Deseja finalizar a prova de escrita?")) this.doSubmit();
      };
    },

    updateWordCount(area) {
      const count = area.value.trim() ? area.value.trim().split(/\s+/).length : 0;
      document.querySelector(`#count-${area.dataset.tid}`).textContent = count;
    },

    startTimer() {
      const limit = this.state.examData.time_limit_minutes * 60000;
      const iv = setInterval(() => {
        const diff = limit - (Date.now() - this.state.startTime);
        if (diff <= 0) {
          clearInterval(iv);
          this.doSubmit();
        }
        const m = Math.floor(diff/60000), s = Math.floor((diff%60000)/1000);
        this.el.timer.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
      }, 1000);
    }
  };

  WritingEngine.init();
})();