// /assets/js/exam-engine.js
// STABLE CORE — NO DOM CREATION, NO RERENDERS, NO GLOBAL LEAKS

export class ExamEngine {
  constructor(config) {
    this.examId = config.examId;
    this.section = config.section; // reading | listening | writing | speaking
    this.timeLimitMin = config.timeLimitMin || null;
    this.onTimeUp = config.onTimeUp || null;

    this.state = {
      user: null,
      startedAt: null,
      answers: {},
      submitted: false
    };

    this._timer = null;
  }

  /* ---------- INIT ---------- */

  async init() {
    await this._requireSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("AUTH_REQUIRED");

    this.state.user = session.user;
    this.state.startedAt = Date.now();

    if (this.timeLimitMin) {
      this._startTimer();
    }
  }

  /* ---------- ANSWERS ---------- */

  setAnswer(taskId, questionId, value) {
    if (this.state.submitted) return;
    if (!this.state.answers[taskId]) {
      this.state.answers[taskId] = {};
    }
    this.state.answers[taskId][questionId] = value;
  }

  getAnswer(taskId, questionId) {
    return this.state.answers[taskId]?.[questionId] ?? null;
  }

  getAllAnswers() {
    return structuredClone(this.state.answers);
  }

  /* ---------- TIMER ---------- */

  _startTimer() {
    const limitMs = this.timeLimitMin * 60_000;

    this._timer = setInterval(() => {
      const elapsed = Date.now() - this.state.startedAt;
      const remaining = Math.max(0, limitMs - elapsed);

      document.dispatchEvent(new CustomEvent("exam:tick", {
        detail: { remainingMs: remaining }
      }));

      if (remaining === 0) {
        clearInterval(this._timer);
        this._timer = null;
        if (this.onTimeUp) this.onTimeUp();
      }
    }, 1000);
  }

  /* ---------- SUBMIT ---------- */

  async submit(resultPayload) {
    if (this.state.submitted) return;
    this.state.submitted = true;

    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }

    const payload = {
      user_id: this.state.user.id,
      exam_id: this.examId,
      section: this.section,
      result_json: {
        ...resultPayload,
        answers: this.state.answers,
        completed_at: new Date().toISOString()
      }
    };

    const { error } = await supabase
      .from("exam_section_results")
      .upsert(payload, {
        onConflict: "user_id,exam_id,section"
      });

    if (error) throw error;
  }

  /* ---------- INTERNAL ---------- */

  async _requireSupabase() {
    if (window.supabase) return;
    await new Promise((resolve, reject) => {
      const iv = setInterval(() => {
        if (window.supabase) {
          clearInterval(iv);
          resolve();
        }
      }, 20);
      setTimeout(() => {
        clearInterval(iv);
        reject(new Error("SUPABASE_NOT_LOADED"));
      }, 3000);
    });
  }
}
