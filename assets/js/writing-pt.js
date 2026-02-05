(() => {
  const Writing = {
    config: { examId: new URLSearchParams(location.search).get("exam") || "ciple-01" },
    state: { user: null, answers: {} },
    async init() {
        await window.waitForSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        this.state.user = session.user;
        this.render();
    },
    async submit() {
        const payload = {
            user_id: this.state.user.id,
            exam_id: this.config.examId,
            section: "writing",
            result_json: { answers: this.state.answers, completed_at: new Date().toISOString() }
        };
        await supabase.from("exam_section_results").upsert(payload, { onConflict: 'user_id,exam_id,section' });
        window.location.href = `listening.html?exam=${this.config.examId}`;
    },
    render() {
        document.querySelector("#submitWriting").onclick = () => this.submit();
        document.querySelectorAll(".writing-area").forEach(area => {
            area.oninput = (e) => { this.state.answers[e.target.dataset.tid] = e.target.value; };
        });
    }
  };
  Writing.init();
})();