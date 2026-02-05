/**
 * CIVIC LEARN - LISTENING ENGINE
 */
(() => {
  const ListeningEngine = {
    config: {
      examId: new URLSearchParams(location.search).get("exam") || "ciple-01",
      dataUrl: (id) => `/ciple/assets/data/${id}-listening.json`,
    },
    state: { 
      user: null, 
      examData: null, 
      taskIndex: 0, 
      answers: {}, 
      audioPlayCount: {}, 
      startTime: null, 
      isSubmitting: false 
    },
    el: {
      mount: document.getElementById("questionsMount"),
      submitBtn: document.getElementById("submitBtn"),
      timerText: document.getElementById("timerText"),
      audioEl: document.getElementById("audioEl"),
      audioPlaysLeft: document.getElementById("audioPlaysLeft"),
      warnBox: document.getElementById("warnBox")
    },

    async init() {
      try {
        await window.waitForSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessão expirada.");
        this.state.user = session.user;

        const res = await fetch(this.config.dataUrl(this.config.examId));
        this.state.examData = await res.json();

        this.restore();
        this.render();
        this.startTimer();
      } catch (e) {
        this.el.mount.innerHTML = `<div class="error">Erro Fatal: ${e.message}</div>`;
      }
    },

    // --- PERSISTENCE ---
    getStorageKey() { return `ciple:${this.state.user.id}:${this.config.examId}:listening`; },

    saveLocal() {
      const key = this.getStorageKey();
      const data = {
        answers: this.state.answers,
        taskIndex: this.state.taskIndex,
        startTime: this.state.startTime,
        audioPlayCount: this.state.audioPlayCount
      };
      localStorage.setItem(key, JSON.stringify(data));
    },

    restore() {
      const saved = JSON.parse(localStorage.getItem(this.getStorageKey()) || "{}");
      this.state.answers = saved.answers || {};
      this.state.taskIndex = saved.taskIndex || 0;
      this.state.startTime = saved.startTime || Date.now();
      this.state.audioPlayCount = saved.audioPlayCount || {};
    },

    // --- GRADING & SUBMISSION ---
    calculateScore() {
      let correct = 0, total = 0;
      const tasks = this.state.examData.tasks;
      tasks.forEach(t => {
        t.questions.forEach(q => {
          total++;
          if (this.state.answers[q.id] === q.correct_option) correct++;
        });
      });
      return { total, correct, percent: Math.round((correct / total) * 100) };
    },

    async doSubmit() {
      if (this.state.isSubmitting) return;
      this.state.isSubmitting = true;
      this.el.submitBtn.innerText = "Enviando...";

      try {
        const payload = {
          user_id: this.state.user.id,
          exam_id: this.config.examId,
          section: "listening",
          result_json: {
            score: this.calculateScore(),
            answers: this.state.answers,
            completed_at: new Date().toISOString()
          }
        };

        const { error } = await supabase
          .from("exam_section_results")
          .upsert(payload, { onConflict: 'user_id,exam_id,section' });

        if (error) throw error;

        localStorage.removeItem(this.getStorageKey());
        window.location.href = `speaking.html?exam=${this.config.examId}`;
      } catch (err) {
        this.state.isSubmitting = false;
        this.el.submitBtn.innerText = "Tentar Novamente";
        alert("Erro na submissão: " + err.message);
      }
    },

    // --- UI & AUDIO ---
    render() {
      const task = this.state.examData.tasks[this.state.taskIndex];
      document.getElementById("taskTitle").textContent = task.title;
      document.getElementById("taskInstructions").textContent = task.instructions;
      
      this.renderAudio(task);
      this.renderQuestions(task);
      
      const isLast = this.state.taskIndex === this.state.examData.tasks.length - 1;
      this.el.submitBtn.textContent = isLast ? "Submeter Listening" : "Próxima Tarefa";
      this.el.submitBtn.onclick = () => isLast ? this.doSubmit() : this.nextTask();
    },

    renderAudio(task) {
      const used = this.state.audioPlayCount[task.task_id] || 0;
      const left = Math.max(0, 2 - used);
      this.el.audioPlaysLeft.textContent = `Reproduções restantes: ${left}`;
      
      this.el.audioEl.src = task.content.audio;
      this.el.audioEl.onplay = () => {
        if (!this.state.audioPlayCount[task.task_id]) {
          this.state.audioPlayCount[task.task_id] = 1;
        } else if (this.state.audioPlayCount[task.task_id] < 2) {
          // You could add logic here for more strict play counting
        }
        this.saveLocal();
      };
    },

    renderQuestions(task) {
      // Simplification of your MCQ and Match logic
      this.el.mount.innerHTML = task.questions.map(q => `
        <div class="q-block">
          <p>${q.prompt}</p>
          <div class="opt-grid">
            ${q.options.map(opt => `
              <button class="opt-btn ${this.state.answers[q.id] === opt ? 'selected' : ''}" 
                onclick="ListeningEngine.setAnswer('${q.id}', '${opt}')">
                ${opt}
              </button>
            `).join('')}
          </div>
        </div>
      `).join('');
    },

    setAnswer(qid, val) {
      this.state.answers[qid] = val;
      this.saveLocal();
      this.render();
    },

    nextTask() {
      this.state.taskIndex++;
      this.saveLocal();
      this.render();
    },

    startTimer() {
      const limit = (this.state.examData.time_limit_minutes || 30) * 60000;
      setInterval(() => {
        const diff = limit - (Date.now() - this.state.startTime);
        if (diff <= 0) this.doSubmit();
        const m = Math.floor(diff/60000), s = Math.floor((diff%60000)/1000);
        this.el.timerText.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
      }, 1000);
    }
  };

  window.ListeningEngine = ListeningEngine; // Expose for onclick
  ListeningEngine.init();
})();