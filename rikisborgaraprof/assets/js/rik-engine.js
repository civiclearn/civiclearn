// =============================================================================
// RIK Test Engine — Core Logic
// Ríkisborgarapróf Simulation Platform
// Architecture mirrors YKIEngine exactly (yki-engine.js)
// =============================================================================

const RIKEngine = {

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------
  SUPABASE_URL: 'https://htgliokekeaovdiafrgs.supabase.co',
  SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs',

  // ---------------------------------------------------------------------------
  // Runtime state
  // ---------------------------------------------------------------------------
  currentSimId:    null,
  currentTest:     null,
  currentAttemptId: null,   // DB row in rik_attempts — set by startAttempt()
  _recordings:     {},      // in-memory only — base64 audio is too large for localStorage

  // ---------------------------------------------------------------------------
  // INITIALIZATION
  // ---------------------------------------------------------------------------

  init(simId) {
    this.currentSimId = simId;
    const saved = this.getTestState(simId);
    if (saved) {
      // Ensure all section keys exist — partial state from DB hydration may be missing some
      if (!saved.lestur)  saved.lestur  = { answers: {}, pct: null, correct: null, total: null, ts: null };
      if (!saved.hlustun) saved.hlustun = { answers: {}, pct: null, correct: null, total: null, ts: null };
      if (!saved.ritun)   saved.ritun   = { responses: {}, status: null, pct: null, evaluation: null, error: null, ts: null };
      if (!saved.tal)     saved.tal     = { recordings: {}, responses: {}, status: null, pct: null, evaluation: null, error: null, ts: null };
      this.currentTest = saved;
    } else {
      this.createNewTestState(simId);
    }

    // Restore attempt_id if already stored
    this.currentAttemptId = this.currentTest._attemptId || null;

    // Clear stale recording flags — actual audio lives in memory and is lost on reload
    const tal = this.currentTest.tal;
    if (tal && tal.recordings) {
      let cleared = false;
      Object.keys(tal.recordings).forEach(id => {
        if (!this._recordings[id]) { delete tal.recordings[id]; cleared = true; }
      });
      if (cleared) this._save();
    }

    // Register/resume DB attempt (non-blocking — runs in background)
    this.startAttempt().catch(e => console.warn('[RIKEngine] startAttempt failed (offline?):', e.message));

    console.log('[RIKEngine] Initialized for:', simId);
    return this;
  },

  // ---------------------------------------------------------------------------
  // AUTH helpers
  // ---------------------------------------------------------------------------

  getSession() {
    try {
      const email = localStorage.getItem('cl_email');
      const token = localStorage.getItem('cl_token');
      return (email && token) ? { email, token } : null;
    } catch(e) { return null; }
  },

  // ---------------------------------------------------------------------------
  // DB ATTEMPT — create or resume row in rik_attempts
  // Called automatically from init(). Pages don't need to call this directly.
  // ---------------------------------------------------------------------------

  async startAttempt() {
    const session = this.getSession();
    if (!session) return;   // Not logged in — localStorage-only mode

    if (this.currentAttemptId) {
      console.log('[RIKEngine] Resuming attempt:', this.currentAttemptId);
      return;
    }

    const res = await fetch(`${this.SUPABASE_URL}/functions/v1/rik-submit-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.SUPABASE_KEY}`
      },
      body: JSON.stringify({
        user_id: session.email,
        simulation_id: this.currentSimId
      })
    });

    if (!res.ok) throw new Error(`rik-submit-test HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'rik-submit-test failed');

    this.currentAttemptId = data.attempt.id;
    this.currentTest._attemptId = data.attempt.id;
    this._save();

    console.log('[RIKEngine] Attempt', data.resumed ? 'resumed' : 'created', ':', data.attempt.id);
  },

  // ---------------------------------------------------------------------------
  // STATE MANAGEMENT (localStorage)
  // Key kept as 'rikisborgaraprof-{simId}' for compatibility with index.html dashboard
  // ---------------------------------------------------------------------------

  _key(simId) {
    return `rikisborgaraprof-${simId || this.currentSimId}`;
  },

  getTestState(simId) {
    try {
      const raw = localStorage.getItem(this._key(simId));
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  createNewTestState() {
    const state = {
      lestur:  { answers: {}, pct: null, correct: null, total: null, ts: null },
      hlustun: { answers: {}, pct: null, correct: null, total: null, ts: null },
      ritun:   { responses: {}, status: null, pct: null, evaluation: null, error: null, ts: null },
      tal:     { recordings: {}, responses: {}, status: null, pct: null, evaluation: null, error: null, ts: null }
    };
    this.currentTest = state;
    this._save();
    return state;
  },

  _save() {
    try {
      localStorage.setItem(this._key(), JSON.stringify(this.currentTest));
    } catch(e) { console.error('[RIKEngine] localStorage write failed:', e); }
  },

  // ---------------------------------------------------------------------------
  // LESSKILNINGUR — Auto-scored MCQ (2 texts × 5 questions)
  // ---------------------------------------------------------------------------

  saveLesskilningurAnswer(questionId, label) {
    this.currentTest.lestur.answers[questionId] = label;
    this._save();
  },

  getSavedLesskilningurAnswer(questionId) {
    return this.currentTest.lestur.answers[questionId] || null;
  },

  getAnsweredCountLestur() {
    return Object.keys(this.currentTest.lestur.answers).length;
  },

  completeLesskilningur(examData) {
    let correct = 0, total = 0;
    examData.texts.forEach(text => {
      text.questions.forEach(q => {
        total++;
        if (this.currentTest.lestur.answers[q.questionId] === q.correctAnswer) correct++;
      });
    });
    const pct = Math.round((correct / total) * 100);
    Object.assign(this.currentTest.lestur, { pct, correct, total, ts: Date.now() });
    this._save();
    this._persistAutoScores();
    return { pct, correct, total };
  },

  // ---------------------------------------------------------------------------
  // HLUSTUN — Auto-scored MCQ (3 segments × ~3-4 questions)
  // Same pattern as Lesskilningur
  // ---------------------------------------------------------------------------

  saveHlustunAnswer(questionId, label) {
    this.currentTest.hlustun.answers[questionId] = label;
    this._save();
  },

  getSavedHlustunAnswer(questionId) {
    return this.currentTest.hlustun.answers[questionId] || null;
  },

  getAnsweredCountHlustun() {
    return Object.keys(this.currentTest.hlustun.answers).length;
  },

  completeHlustun(examData) {
    let correct = 0, total = 0;
    examData.segments.forEach(seg => {
      seg.questions.forEach(q => {
        total++;
        if (this.currentTest.hlustun.answers[q.questionId] === q.correctAnswer) correct++;
      });
    });
    const pct = Math.round((correct / total) * 100);
    Object.assign(this.currentTest.hlustun, { pct, correct, total, ts: Date.now() });
    this._save();
    this._persistAutoScores();
    return { pct, correct, total };
  },

  // ---------------------------------------------------------------------------
  // RITUN — AI-evaluated writing (2 tasks: picture description + topic)
  // ---------------------------------------------------------------------------

  saveDraft(taskId, text) {
    try { localStorage.setItem(`rik-draft-${this.currentSimId}-${taskId}`, text); } catch(e) {}
  },

  getDraft(taskId) {
    try { return localStorage.getItem(`rik-draft-${this.currentSimId}-${taskId}`) || ''; } catch(e) { return ''; }
  },

  clearDraft(taskId) {
    try { localStorage.removeItem(`rik-draft-${this.currentSimId}-${taskId}`); } catch(e) {}
  },

  submitRitun(responses) {
    // responses: { taskId: { taskId, taskNumber, type, text }, ... }
    this.currentTest.ritun.responses = responses;
    this.currentTest.ritun.status    = 'submitted';
    this.currentTest.ritun.ts        = Date.now();
    this._save();
  },

  // ---------------------------------------------------------------------------
  // TAL — AI-evaluated speaking (Part 1: 5 pictures + Part 2: topic)
  // ---------------------------------------------------------------------------

  // Convert blob → base64; store in memory, flag in localStorage
  saveRecording(id, blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        this._recordings[id] = reader.result;          // base64 data URL, memory only
        this.currentTest.tal.recordings[id] = true;    // lightweight existence flag
        this._save();
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  },

  getRecording(id) {
    return this._recordings[id] || null;
  },

  getAllRecordings() {
    return { ...this._recordings };
  },

  saveFallbackText(id, text) {
    this.currentTest.tal.responses[id] = { type: 'text', data: text };
    this._save();
  },

  submitTal(responses) {
    // responses: { id: { type: 'audio'|'text', data: base64|string }, ... }
    this.currentTest.tal.responses = responses;
    this.currentTest.tal.status    = 'submitted';
    this.currentTest.tal.ts        = Date.now();
    this._save();
  },

  // ---------------------------------------------------------------------------
  // PERSIST AUTO SCORES to DB (non-blocking, best-effort)
  // ---------------------------------------------------------------------------

  _persistAutoScores() {
    if (!this.currentAttemptId) return;
    const l = this.currentTest.lestur;
    const h = this.currentTest.hlustun;
    const update = { updated_at: new Date().toISOString() };
    if (l && l.pct !== null) {
      update.reading_score   = l.pct;
      update.reading_correct = l.correct;
      update.reading_total   = l.total;
      update.reading_answers = l.answers || {};
    }
    if (h && h.pct !== null) {
      update.listening_score   = h.pct;
      update.listening_correct = h.correct;
      update.listening_total   = h.total;
      update.listening_answers = h.answers || {};
    }
    fetch(`${this.SUPABASE_URL}/rest/v1/rik_attempts?id=eq.${this.currentAttemptId}`, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         this.SUPABASE_KEY,
        'Authorization':  `Bearer ${this.SUPABASE_KEY}`,
        'Prefer':         'return=minimal'
      },
      body: JSON.stringify(update)
    }).catch(e => console.warn('[RIKEngine] _persistAutoScores failed:', e.message));
  },

  // ---------------------------------------------------------------------------
  // SKIP any section (saves 0 score, marks complete, allows navigation forward)
  // ---------------------------------------------------------------------------

  skipSection(sectionKey) {
    if (sectionKey === 'lestur') {
      Object.assign(this.currentTest.lestur,  { pct: 0, correct: 0, total: 1, ts: Date.now() });
    } else if (sectionKey === 'hlustun') {
      Object.assign(this.currentTest.hlustun, { pct: 0, correct: 0, total: 1, ts: Date.now() });
    } else if (sectionKey === 'ritun') {
      // 'skipped' — not 'complete' — so nidurstodur short-circuits before checking section.responses
      Object.assign(this.currentTest.ritun,   { pct: 0, status: 'skipped', evaluation: null, ts: Date.now() });
    } else if (sectionKey === 'tal') {
      Object.assign(this.currentTest.tal,     { pct: 0, status: 'skipped', evaluation: null, ts: Date.now() });
    }
    this._save();
  },

  // ---------------------------------------------------------------------------
  // EVALUATION — called from nidurstodur.html
  // ---------------------------------------------------------------------------

  async evaluateWriting() {
    const ritun = this.currentTest.ritun;
    if (!ritun || !ritun.responses) throw new Error('No writing responses found');

    const responses = Object.values(ritun.responses).map(r => ({
      taskId: r.taskId, taskNumber: r.taskNumber, type: r.type, text: r.text
    }));

    const payload = {
      simulationId:      this.currentSimId,
      section:           'ritun',
      writing_responses: responses,  // edge fn reads from body and saves to DB for retries
      responses                      // legacy fallback
    };
    if (this.currentAttemptId) payload.attempt_id = this.currentAttemptId;

    const res = await fetch(`${this.SUPABASE_URL}/functions/v1/rik-evaluate-writing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.SUPABASE_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Evaluation failed');

    // Re-read from localStorage to avoid overwriting any parallel changes
    const stored = this.getTestState(this.currentSimId) || this.currentTest;
    stored.ritun.status     = 'complete';
    stored.ritun.pct        = result.overallScore;
    stored.ritun.evaluation = result;
    localStorage.setItem(this._key(), JSON.stringify(stored));
    this.currentTest = stored;

    return result;
  },

  async evaluateSpeaking() {
    const tal = this.currentTest.tal;
    if (!tal || !tal.responses) throw new Error('No speaking responses found');

    const speaking_recordings = {};
    const speaking_responses  = {};

    Object.entries(tal.responses).forEach(([id, item]) => {
      if (item.type === 'audio') speaking_recordings[id] = item.data;
      else speaking_responses[id] = item.data;
    });

    const payload2 = { simulationId: this.currentSimId, speaking_recordings, speaking_responses };
    if (this.currentAttemptId) payload2.attempt_id = this.currentAttemptId;

    const res = await fetch(`${this.SUPABASE_URL}/functions/v1/rik-evaluate-speaking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.SUPABASE_KEY}`
      },
      body: JSON.stringify(payload2)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const result = await res.json();
    if (!result.success) throw new Error(result.error || 'Evaluation failed');

    const stored = this.getTestState(this.currentSimId) || this.currentTest;
    stored.tal.status     = 'complete';
    stored.tal.pct        = result.overallScore;
    stored.tal.evaluation = result;
    delete stored.tal.responses; // free up large audio blobs from storage
    localStorage.setItem(this._key(), JSON.stringify(stored));
    this.currentTest = stored;

    return result;
  },

  // ---------------------------------------------------------------------------
  // ERROR / RETRY helpers (used by nidurstodur.html)
  // ---------------------------------------------------------------------------

  markEvalFailed(sectionKey, errorMsg) {
    this.currentTest[sectionKey].status = 'failed';
    this.currentTest[sectionKey].error  = errorMsg;
    this._save();
  },

  retryFailed() {
    ['ritun', 'tal'].forEach(key => {
      if (this.currentTest[key] && this.currentTest[key].status === 'failed') {
        this.currentTest[key].status = 'submitted';
        delete this.currentTest[key].error;
      }
    });
    this._save();
  },

  // ---------------------------------------------------------------------------
  // PROGRESS — mirrors YKIEngine.getProgress()
  // ---------------------------------------------------------------------------

  getProgress() {
    const t = this.currentTest;
    const sectionDone = {
      lestur:  !!(t.lestur  && t.lestur.pct  !== null),
      hlustun: !!(t.hlustun && t.hlustun.pct !== null),
      ritun:   !!(t.ritun   && t.ritun.status),
      tal:     !!(t.tal     && t.tal.status)
    };
    const completed = Object.values(sectionDone).filter(Boolean).length;

    return {
      completed,
      total:      4,
      percentage: Math.round((completed / 4) * 100),
      sections:   sectionDone,
      canSubmit:  completed === 4
    };
  },

  // ---------------------------------------------------------------------------
  // RESET — clears all data for a simulation (used by restart / redo)
  // ---------------------------------------------------------------------------

  resetTest(simId) {
    const id = simId || this.currentSimId;
    try {
      localStorage.removeItem(this._key(id));
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`rik-draft-${id}`)) toRemove.push(k);
      }
      toRemove.forEach(k => localStorage.removeItem(k));
    } catch(e) {}
    this._recordings      = {};
    this.currentTest      = null;
    this.currentAttemptId = null;
    console.log('[RIKEngine] Test reset for:', id);
  },

};

// Make globally available — same pattern as YKIEngine
window.RIKEngine = RIKEngine;
