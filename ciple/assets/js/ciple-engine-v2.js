// =============================================================================
// CIPLE Test Engine - Core Logic
// =============================================================================

const CIPLEEngine = {
  
  // Configuration
  SUPABASE_URL: "https://htgliokekeaovdiafrgs.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs",
  
  // Current test being taken
  currentTest: null,
  currentExamId: null,
  
  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  init(examId) {
    this.currentExamId = examId;
    this.currentTest = this.getTestState(examId) || this.createNewTestState(examId);
    console.log('CIPLE Engine initialized for:', examId);
  },
  
  // =============================================================================
  // TEST STATE MANAGEMENT (localStorage)
  // =============================================================================
  
  getTestState(examId) {
    const key = `ciple_test_${examId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  createNewTestState(examId) {
    const state = {
      exam_id: examId,
      started_at: new Date().toISOString(),
      sections: {
        reading: { completed: false, answers: {}, score: null },
        listening: { completed: false, answers: {}, score: null },
        writing: { completed: false, responses: {} },
        speaking: { completed: false, recordings: {} }
      },
      submitted: false,
      result_id: null
    };
    this.saveTestState(examId, state);
    return state;
  },
  
  saveTestState(examId, state) {
    const key = `ciple_test_${examId}`;
    localStorage.setItem(key, JSON.stringify(state));
  },
  
  // =============================================================================
  // READING SECTION
  // =============================================================================
  
  saveReadingAnswer(questionId, selectedOption) {
    this.currentTest.sections.reading.answers[questionId] = selectedOption;
    this.saveTestState(this.currentExamId, this.currentTest);
  },
  
 completeReadingSection(readingData) {
  // Auto-grade reading section
  let correctCount = 0;
  let totalQuestions = 0;
  
  readingData.tasks.forEach(task => {
    task.questions.forEach(q => {
      totalQuestions++;
      
      // FIXED: Look for answer with task prefix
      const answerKey = `${task.task_id}-${q.id}`;
      const userAnswer = this.currentTest.sections.reading.answers[answerKey];
      const correctAnswer = q.correct_option;
      
      console.log(`Checking ${answerKey}: user=${userAnswer}, correct=${correctAnswer}`);
      
      if (userAnswer === correctAnswer) {
        correctCount++;
      }
    });
  });
  
  const score = Math.round((correctCount / totalQuestions) * 100);
  
  this.currentTest.sections.reading.completed = true;
  this.currentTest.sections.reading.score = score;
  this.currentTest.sections.reading.correct_count = correctCount;
  this.currentTest.sections.reading.total_questions = totalQuestions;
  
  this.saveTestState(this.currentExamId, this.currentTest);
  
  return { score, correctCount, totalQuestions };
},
  
  // =============================================================================
  // LISTENING SECTION
  // =============================================================================
  
  saveListeningAnswer(questionId, selectedOption) {
    this.currentTest.sections.listening.answers[questionId] = selectedOption;
    this.saveTestState(this.currentExamId, this.currentTest);
  },
  
  completeListeningSection(listeningData) {
    // Auto-grade listening section
    let correctCount = 0;
    let totalQuestions = 0;
    
    listeningData.tasks.forEach(task => {
      task.questions.forEach(q => {
        totalQuestions++;
        const userAnswer = this.currentTest.sections.listening.answers[q.id];
        const correctAnswer = q.correct_option;
        
        if (userAnswer === correctAnswer) {
          correctCount++;
        }
      });
    });
    
    const score = Math.round((correctCount / totalQuestions) * 100);
    
    this.currentTest.sections.listening.completed = true;
    this.currentTest.sections.listening.score = score;
    this.currentTest.sections.listening.correct_count = correctCount;
    this.currentTest.sections.listening.total_questions = totalQuestions;
    
    this.saveTestState(this.currentExamId, this.currentTest);
    
    return { score, correctCount, totalQuestions };
  },
  
  // =============================================================================
  // WRITING SECTION
  // =============================================================================
  
  saveWritingResponse(taskId, text) {
    this.currentTest.sections.writing.responses[taskId] = text;
    this.saveTestState(this.currentExamId, this.currentTest);
  },
  
  completeWritingSection() {
    this.currentTest.sections.writing.completed = true;
    this.saveTestState(this.currentExamId, this.currentTest);
  },
  
  // =============================================================================
  // SPEAKING SECTION
  // =============================================================================

  // Transient blob URLs for in-session playback — not persisted to localStorage
  _blobUrls: {},

  async saveSpeakingRecording(taskId, audioBlob) {
    // 1. Create a local object URL for immediate in-session playback
    this._blobUrls[taskId] = URL.createObjectURL(audioBlob);

    // 2. Upload blob to Supabase Storage via edge function
    const form = new FormData();
    form.append('file', audioBlob, `${taskId}.webm`);
    form.append('task_id', taskId);
    form.append('exam_id', this.currentExamId);
    form.append('user_id', this.getCurrentUserId());

    const res = await fetch(`${this.SUPABASE_URL}/functions/v1/ciple-upload-audio`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${this.SUPABASE_KEY}` },
      body: form
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Audio upload failed: ${err.error || res.status}`);
    }

    const { path } = await res.json();

    // 3. Store path (not base64) — tiny string in localStorage
    this.currentTest.sections.speaking.recordings[taskId] = path;
    this.saveTestState(this.currentExamId, this.currentTest);
  },

  // Returns blob URL for playback (in-session only); null if page was refreshed
  getPlaybackUrl(taskId) {
    return this._blobUrls[taskId] || null;
  },

  completeSpeakingSection() {
    this.currentTest.sections.speaking.completed = true;
    this.saveTestState(this.currentExamId, this.currentTest);
  },
  
  // =============================================================================
  // FINAL SUBMISSION TO SUPABASE
  // =============================================================================
  
  async submitForEvaluation() {
    if (this.currentTest.submitted) {
      throw new Error('Test already submitted');
    }
    
    // Prepare payload
    const payload = {
      exam_id: this.currentExamId,
      user_id: this.getCurrentUserId(),
      sections: {
        reading: {
          answers: this.currentTest.sections.reading.answers,
          score: this.currentTest.sections.reading.score,
          correct_count: this.currentTest.sections.reading.correct_count,
          total_questions: this.currentTest.sections.reading.total_questions
        },
        listening: {
          answers: this.currentTest.sections.listening.answers,
          score: this.currentTest.sections.listening.score,
          correct_count: this.currentTest.sections.listening.correct_count,
          total_questions: this.currentTest.sections.listening.total_questions
        },
        writing: {
          responses: this.currentTest.sections.writing.responses
        },
        speaking: {
          speaking_storage_paths: this.currentTest.sections.speaking.recordings
        }
      },
      submitted_at: new Date().toISOString()
    };
    
    try {
      // Call submit-test function
      const response = await fetch('https://htgliokekeaovdiafrgs.supabase.co/functions/v1/submit-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SUPABASE_KEY}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Submission failed: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      
      // Mark as submitted
      this.currentTest.submitted = true;
      this.currentTest.result_id = result.attempt_id;
      this.saveTestState(this.currentExamId, this.currentTest);
      
      // Trigger background evaluations
      this.triggerAsyncEvaluations(result.attempt_id);
      
      return result;
      
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  },
  
  // =============================================================================
  // TRIGGER ASYNC EVALUATIONS
  // =============================================================================
  
  triggerAsyncEvaluations(attemptId) {
    console.log('🔥 TRIGGERING EVALUATIONS FOR:', attemptId);
    
    // NO setTimeout - page navigation would cancel it!
    // Trigger immediately so fetches start before navigation
    
    // Trigger writing evaluation
    console.log('📝 Triggering writing evaluation...');
    fetch('https://htgliokekeaovdiafrgs.supabase.co/functions/v1/evaluate-writing', {
      method: 'POST',
	  keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.SUPABASE_KEY}`
      },
      body: JSON.stringify({ attempt_id: attemptId })
    })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(d => console.log('✅ Writing evaluation triggered successfully:', d))
    .catch(err => console.error('❌ Writing evaluation trigger failed:', err));
    
    // Trigger speaking evaluation  
    console.log('🗣️ Triggering speaking evaluation...');
    fetch('https://htgliokekeaovdiafrgs.supabase.co/functions/v1/evaluate-speaking', {
      method: 'POST',
	  keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.SUPABASE_KEY}`
      },
      body: JSON.stringify({ attempt_id: attemptId })
    })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(d => console.log('✅ Speaking evaluation triggered successfully:', d))
    .catch(err => console.error('❌ Speaking evaluation trigger failed:', err));
  },
  
  // =============================================================================
  // PROGRESS TRACKING
  // =============================================================================
  
  getProgress() {
    const sections = this.currentTest.sections;
    const completed = [
      sections.reading.completed,
      sections.listening.completed,
      sections.writing.completed,
      sections.speaking.completed
    ].filter(Boolean).length;
    
    return {
      completed: completed,
      total: 4,
      percentage: Math.round((completed / 4) * 100),
      canSubmit: completed === 4 && !this.currentTest.submitted
    };
  },
  
  // =============================================================================
  // HYDRATE — pull submitted attempts from Supabase onto this device
  // =============================================================================
  //
  // Called by the dashboard before rendering. Fetches all server-side attempts
  // for the logged-in user (via the ciple-hydrate edge function) and writes any
  // that are missing locally into localStorage in the exact shape the dashboard
  // expects. A locally-submitted state is never overwritten — it is richer
  // (it contains the actual answers), while hydrated states carry scores only.

  async hydrate() {
    // Wait for the auth guard to resolve the session first — cl_email is set
    // asynchronously by ciple-auth.js, so on a fresh device it may not exist
    // yet when the dashboard loads. cipleAuth.email is the authoritative source.
    if (window.cipleAuth && window.cipleAuth.ready) {
      try { await window.cipleAuth.ready; } catch (e) { /* guard redirects on failure */ }
    }

    const email = ((window.cipleAuth && window.cipleAuth.email) ||
                   localStorage.getItem('cl_email') || '').toLowerCase().trim();
    if (!email || email === 'anonymous') {
      console.warn('Hydrate skipped: no authenticated email available');
      return { hydrated: 0 };
    }

    let attempts;
    try {
      const res = await fetch(`${this.SUPABASE_URL}/functions/v1/ciple-hydrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SUPABASE_KEY}`
        },
        body: JSON.stringify({ email })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      attempts = data.attempts || [];
    } catch (err) {
      console.error('Hydrate failed:', err);
      return { hydrated: 0, error: err.message };
    }

    let hydratedCount = 0;

    // Attempts arrive oldest-first; if an exam has multiple attempts,
    // the latest one wins by overwriting as we iterate.
    attempts.forEach(a => {
      const local = this.getTestState(a.exam_id);

      // Never clobber a locally-submitted state (it has the full answers)
      if (local && local.submitted && !local.hydrated) return;

      const num = v => (typeof v === 'string' ? parseFloat(v) : v);

      const state = {
        exam_id: a.exam_id,
        started_at: a.submitted_at,
        submitted_at: a.submitted_at,
        sections: {
          reading: {
            completed: true,
            answers: {},
            score: num(a.reading_score),
            correct_count: a.reading_correct,
            total_questions: a.reading_total
          },
          listening: {
            completed: true,
            answers: {},
            score: num(a.listening_score),
            correct_count: a.listening_correct,
            total_questions: a.listening_total
          },
          writing: {
            completed: true,
            responses: {},
            score: num(a.writing_score)
          },
          speaking: {
            completed: true,
            recordings: {},
            score: num(a.speaking_score)
          }
        },
        submitted: true,
        result_id: a.id,
        hydrated: true
      };

      this.saveTestState(a.exam_id, state);
      hydratedCount++;
    });

    console.log(`Hydrated ${hydratedCount} attempt(s) from server`);
    return { hydrated: hydratedCount };
  },

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================
  
  getCurrentUserId() {
    // Return user email from localStorage
    // This will be saved in the user_id column for tracking
    return localStorage.getItem('cl_email') || 'anonymous';
  },
  
  clearTestData(examId) {
    const key = `ciple_test_${examId}`;
    localStorage.removeItem(key);
  },
  
  getAllTests() {
    const tests = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('ciple_test_')) {
        tests.push(JSON.parse(localStorage.getItem(key)));
      }
    }
    return tests;
  }
  
};

// Make globally available
window.CIPLEEngine = CIPLEEngine;