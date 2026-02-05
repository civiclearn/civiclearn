/**
 * CIVIC LEARN EXAM ENGINE v2
 * A robust, state-managed architecture for Portuguese Exams
 */

const CiviclearnExam = {
    // --- 1. CONFIG & STATE ---
    config: {
        examId: new URLSearchParams(location.search).get("exam") || "ciple-01",
        dataUrl: (id) => `/ciple/assets/data/${id}-reading.json`,
    },
    state: {
        user: null,
        examData: null,
        taskIndex: 0,
        answers: {},
        startTime: null,
        isSubmitting: false
    },

    // --- 2. CORE ORCHESTRATOR ---
    async init() {
        try {
            this.showLoading(true);
            
            // Step A: Ensure Supabase exists
            await this.waitForSupabase();
            
            // Step B: Ensure User is logged in
            await this.checkAuth();
            
            // Step C: Load Exam Content
            await this.loadContent();
            
            // Step D: Restore Progress from LocalStorage or DB
            this.restoreState();
            
            // Step E: Start UI
            this.render();
            this.setupListeners();
            this.startTimer();
            
            this.showLoading(false);
        } catch (error) {
            this.handleFatalError(error);
        }
    },

    // --- 3. AUTH & DATA ---
    async waitForSupabase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const check = setInterval(() => {
                if (window.supabase) {
                    clearInterval(check);
                    resolve();
                }
                if (attempts++ > 50) reject("Supabase failed to load.");
            }, 100);
        });
    },

    async checkAuth() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            // Redirect to login if session is invalid
            window.location.href = "/login.html?reason=expired";
            throw new Error("Unauthorized: Please log in.");
        }
        this.state.user = session.user;
    },

    async loadContent() {
        const url = this.config.dataUrl(this.config.examId);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error("Could not load exam data.");
        this.state.examData = await res.json();
    },

    // --- 4. PERSISTENCE ---
    saveToLocal() {
        const key = `exam_${this.state.user.id}_${this.config.examId}`;
        const data = {
            answers: this.state.answers,
            taskIndex: this.state.taskIndex,
            startTime: this.state.startTime
        };
        localStorage.setItem(key, JSON.stringify(data));
    },

    restoreState() {
        const key = `exam_${this.state.user.id}_${this.config.examId}`;
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved) {
            this.state.answers = saved.answers || {};
            this.state.taskIndex = saved.taskIndex || 0;
            this.state.startTime = saved.startTime || Date.now();
        } else {
            this.state.startTime = Date.now();
        }
    },

    // --- 5. SUBMISSION ---
    async doSubmit() {
        if (this.state.isSubmitting) return;
        this.state.isSubmitting = true;

        try {
            const payload = {
                user_id: this.state.user.id,
                exam_id: this.config.examId,
                section: "reading",
                result_json: {
                    score: this.calculateScore(),
                    answers: this.state.answers,
                    completed_at: new Date().toISOString()
                }
            };

            // UPSERT prevents the "Delete-then-fail" bug
            const { error } = await supabase
                .from("exam_section_results")
                .upsert(payload, { onConflict: 'user_id,exam_id,section' });

            if (error) throw error;

            // Clear progress and move on
            localStorage.removeItem(`exam_${this.state.user.id}_${this.config.examId}`);
            window.location.href = `writing.html?exam=${this.config.examId}`;

        } catch (err) {
            this.state.isSubmitting = false;
            alert("Erro ao submeter: " + err.message);
        }
    },

    // --- 6. HELPERS (UI & Scoring) ---
    calculateScore() {
        // Logic for grading based on this.state.examData and this.state.answers
        // ... (Transferred from your original grading logic)
    },

    render() {
        // Updated rendering logic using this.state
    },

    handleFatalError(err) {
        console.error(err);
        document.getElementById("taskCard").innerHTML = `<div class="error">${err}</div>`;
    },
    
    showLoading(show) {
        // Visual feedback for the user
    }
};

// Start the engine
CiviclearnExam.init();