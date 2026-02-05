(() => {
  const Engine = {
    config: { examId: new URLSearchParams(location.search).get("exam") || "ciple-01" },
    state: { user: null, examData: null, taskIndex: 0, answers: {}, startTime: Date.now() },
    el: { taskCard: document.querySelector("#taskCard"), timer: document.querySelector("#timer"), submitBtn: document.querySelector("#submitReading") },

    async init() {
        await window.waitForSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        this.state.user = session.user;
        const res = await fetch(`/ciple/assets/data/${this.config.examId}-reading.json`);
        this.state.examData = await res.json();
        this.render();
        this.startTimer();
    },

    async doSubmit() {
        const payload = {
            user_id: this.state.user.id,
            exam_id: this.config.examId,
            section: "reading",
            result_json: { score: this.calculateScore(), answers: this.state.answers, completed_at: new Date().toISOString() }
        };
        const { error } = await supabase.from("exam_section_results").upsert(payload, { onConflict: 'user_id,exam_id,section' });
        if (!error) window.location.href = `writing.html?exam=${this.config.examId}`;
        else alert("Erro: " + error.message);
    },

    calculateScore() {
        let correct = 0, total = 0;
        this.state.examData.tasks.forEach(t => t.questions.forEach(q => {
            total++;
            if (this.state.answers[t.task_id]?.[q.id] === q.correct_option) correct++;
        }));
        return { percent: Math.round((correct/total)*100) };
    },

    render() {
        const task = this.state.examData.tasks[this.state.taskIndex];
        this.el.taskCard.innerHTML = `<h2>${task.title}</h2>` + task.questions.map(q => `
            <div class="q"><p>${q.prompt}</p>
            ${q.options.map(opt => `<button class="opt-btn ${this.state.answers[task.task_id]?.[q.id] === opt.id ? 'selected' : ''}" onclick="window.setAns('${task.task_id}','${q.id}','${opt.id}')">${opt.text}</button>`).join('')}
            </div>`).join('');
        this.el.submitBtn.onclick = () => this.doSubmit();
    },

    startTimer() {
        setInterval(() => {
            const diff = (this.state.examData.time_limit_minutes * 60000) - (Date.now() - this.state.startTime);
            const m = Math.floor(diff/60000), s = Math.floor((diff%60000)/1000);
            this.el.timer.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
        }, 1000);
    }
  };
  window.setAns = (tid, qid, oid) => { if(!Engine.state.answers[tid]) Engine.state.answers[tid] = {}; Engine.state.answers[tid][qid] = oid; Engine.render(); };
  Engine.init();
})();