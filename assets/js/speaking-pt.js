/**
 * CIVIC LEARN - SPEAKING ENGINE
 */
(() => {
  const SpeakingEngine = {
    config: {
      examId: new URLSearchParams(location.search).get("exam") || "ciple-01",
      dataUrl: (id) => `/ciple/assets/data/${id}-speaking.json`,
    },
    state: { user: null, examData: null, answers: {}, isSubmitting: false },
    el: {
      taskCard: document.querySelector("#taskCard"),
      submitBtn: document.querySelector("#submitSpeaking")
    },

    async init() {
      try {
        await window.waitForSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Unauthorized");
        this.state.user = session.user;

        const res = await fetch(this.config.dataUrl(this.config.examId));
        this.state.examData = await res.json();

        this.render();
      } catch (e) {
        this.el.taskCard.innerHTML = `<div class="error">Erro: ${e.message}</div>`;
      }
    },

    async doSubmit() {
      if (this.state.isSubmitting) return;
      this.state.isSubmitting = true;

      try {
        const payload = {
          user_id: this.state.user.id,
          exam_id: this.config.examId,
          section: "speaking",
          result_json: {
            final_score: 75, // Replace with your AI grading logic if applicable
            answers: this.state.answers,
            completed_at: new Date().toISOString()
          }
        };

        const { error } = await supabase.from("exam_section_results").upsert(payload, { onConflict: 'user_id,exam_id,section' });
        if (error) throw error;

        window.location.href = `results.html?exam=${this.config.examId}`;
      } catch (err) {
        this.state.isSubmitting = false;
        alert("Erro ao enviar: " + err.message);
      }
    },

    render() {
      // Basic render for tasks - adjust based on your specific speaking UI
      this.el.taskCard.innerHTML = `<h2>Expressão Oral</h2><p>Grave suas respostas para as tarefas abaixo.</p>`;
      this.el.submitBtn.onclick = () => this.doSubmit();
    }
  };

  SpeakingEngine.init();
})();