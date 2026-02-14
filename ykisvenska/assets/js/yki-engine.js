// =============================================================================
// YKI Test Engine - Core Logic
// =============================================================================

const YKIEngine = {
  
  // Configuration
  SUPABASE_URL: "https://htgliokekeaovdiafrgs.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs",
  
  // Current test being taken
  currentTest: null,
  currentExamId: null,
  
  // Audio recordings kept in memory only (too large for localStorage)
  _recordings: {},
  
  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  init(examId) {
    this.currentExamId = examId;
    this.currentTest = this.getTestState(examId) || this.createNewTestState(examId);
    
    // Backward-compat: ensure speaking.responses exists (added after initial release)
    if (this.currentTest.sections.speaking && !this.currentTest.sections.speaking.responses) {
      this.currentTest.sections.speaking.responses = {};
      this.saveTestState(examId, this.currentTest);
    }
    
    // Clear stale recording flags — actual audio lives in memory only and doesn't survive reload
    if (this.currentTest.sections.speaking && this.currentTest.sections.speaking.recordings) {
      const flags = this.currentTest.sections.speaking.recordings;
      let cleared = false;
      for (const taskId in flags) {
        if (!this._recordings[taskId]) {
          delete flags[taskId];
          cleared = true;
        }
      }
      if (cleared) this.saveTestState(examId, this.currentTest);
    }
    
    console.log('YKI Engine initialized for:', examId);
  },
  
  // =============================================================================
  // TEST STATE MANAGEMENT (localStorage)
  // =============================================================================
  
  getTestState(examId) {
    const key = `yki_test_${examId}`;
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
        speaking: { completed: false, recordings: {}, responses: {} }
      },
      submitted: false,
      result_id: null
    };
    this.saveTestState(examId, state);
    return state;
  },
  
  saveTestState(examId, state) {
    const key = `yki_test_${examId}`;
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
    let correctCount = 0;
    let totalQuestions = 0;
    
    readingData.tasks.forEach(task => {
      task.questions.forEach(q => {
        totalQuestions++;
        
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
  
  saveSpeakingRecording(taskId, audioBlob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result;
        // Store in memory only — base64 audio is too large for localStorage
        this._recordings[taskId] = base64Audio;
        // Mark in state that a recording exists (lightweight flag)
        this.currentTest.sections.speaking.recordings[taskId] = true;
        this.saveTestState(this.currentExamId, this.currentTest);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  },
  
  // Get actual recording data (base64) from memory
  getRecording(taskId) {
    return this._recordings[taskId] || null;
  },
  
  // Get all recordings for submission
  getAllRecordings() {
    return { ...this._recordings };
  },
  
  saveSpeakingResponse(taskId, text) {
    this.currentTest.sections.speaking.responses[taskId] = text;
    this.saveTestState(this.currentExamId, this.currentTest);
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
          recordings: this.getAllRecordings(),
          responses: this.currentTest.sections.speaking.responses
        }
      },
      submitted_at: new Date().toISOString()
    };
    
    try {
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/yki-submit-test`, {
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
      
      this.currentTest.submitted = true;
      this.currentTest.result_id = result.attempt_id;
      this.saveTestState(this.currentExamId, this.currentTest);
      
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
    
    // Trigger writing evaluation
    console.log('📝 Triggering writing evaluation...');
    fetch(`${this.SUPABASE_URL}/functions/v1/yki-evaluate-writing`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.SUPABASE_KEY}`
      },
      body: JSON.stringify({ attempt_id: attemptId })
    })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(d => console.log('✅ Writing evaluation triggered:', d))
    .catch(err => console.error('❌ Writing evaluation failed:', err));
    
    // Trigger speaking evaluation
    console.log('🗣️ Triggering speaking evaluation...');
    fetch(`${this.SUPABASE_URL}/functions/v1/yki-evaluate-speaking`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.SUPABASE_KEY}`
      },
      body: JSON.stringify({ attempt_id: attemptId })
    })
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(d => console.log('✅ Speaking evaluation triggered:', d))
    .catch(err => console.error('❌ Speaking evaluation failed:', err));
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
  // HELPER FUNCTIONS
  // =============================================================================
  
  getCurrentUserId() {
    return localStorage.getItem('cl_email') || 'anonymous';
  },
  
  clearTestData(examId) {
    const key = `yki_test_${examId}`;
    localStorage.removeItem(key);
  },
  
  getAllTests() {
    const tests = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('yki_test_')) {
        tests.push(JSON.parse(localStorage.getItem(key)));
      }
    }
    return tests;
  }
  
};

// Make globally available
window.YKIEngine = YKIEngine;
