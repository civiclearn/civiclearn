// =============================================================================
// Sproochentest Engine - Core Logic
// Lëtzebuergesch Sproochentest (A2) — Speaking (text) + Listening (MCQ)
// =============================================================================

const SproochEngine = {
  
  // Configuration
  SUPABASE_URL: "https://htgliokekeaovdiafrgs.supabase.co",
  SUPABASE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs",
  
  TOTAL_EXAMS: 11,
  
  // Current test state
  currentTest: null,
  currentExamId: null,
  
  // =============================================================================
  // INITIALIZATION
  // =============================================================================
  
  init(examId) {
    this.currentExamId = examId;
    this.currentTest = this.getTestState(examId) || this.createNewTestState(examId);
    console.log('Sproochentest Engine initialized for:', examId);
  },
  
  // =============================================================================
  // TEST STATE MANAGEMENT (localStorage)
  // =============================================================================
  
  getTestState(examId) {
    const key = `sproochentest_${examId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  createNewTestState(examId) {
    const state = {
      exam_id: examId,
      started_at: new Date().toISOString(),
      sections: {
        speaking: { completed: false, responses: {}, score: null },
        listening: { completed: false, answers: {}, score: null }
      },
      submitted: false,
      result_id: null
    };
    this.saveTestState(examId, state);
    return state;
  },
  
  saveTestState(examId, state) {
    const key = `sproochentest_${examId}`;
    localStorage.setItem(key, JSON.stringify(state));
  },
  
  // =============================================================================
  // SPEAKING SECTION (text-based, like writing)
  // =============================================================================
  
  saveSpeakingResponse(responseKey, text) {
    // responseKey: speaking_1_prompt_1, speaking_1_prompt_2, speaking_1_prompt_3, speaking_2
    this.currentTest.sections.speaking.responses[responseKey] = text;
    this.saveTestState(this.currentExamId, this.currentTest);
  },
  
  completeSpeakingSection() {
    this.currentTest.sections.speaking.completed = true;
    this.saveTestState(this.currentExamId, this.currentTest);
  },
  
  // =============================================================================
  // LISTENING SECTION (MCQ)
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
        if (userAnswer === q.correct_option) {
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
  // FINAL SUBMISSION TO SUPABASE
  // =============================================================================
  
  async submitForEvaluation() {
    if (this.currentTest.submitted) {
      throw new Error('Test scho ageschéckt');
    }
    
    const payload = {
      exam_id: this.currentExamId,
      user_id: this.getCurrentUserId(),
      sections: {
        listening: {
          answers: this.currentTest.sections.listening.answers,
          score: this.currentTest.sections.listening.score,
          correct_count: this.currentTest.sections.listening.correct_count,
          total_questions: this.currentTest.sections.listening.total_questions
        },
        speaking: {
          responses: this.currentTest.sections.speaking.responses
        }
      },
      submitted_at: new Date().toISOString()
    };
    
    try {
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/sproochentest-submit-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SUPABASE_KEY}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Ofschécke fehlgeschloen: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      
      this.currentTest.submitted = true;
      this.currentTest.result_id = result.attempt_id;
      this.saveTestState(this.currentExamId, this.currentTest);
      
      // Trigger async speaking evaluation
      this.triggerSpeakingEvaluation(result.attempt_id);
      
      return result;
      
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
  },
  
  // =============================================================================
  // TRIGGER ASYNC EVALUATION
  // =============================================================================
  
  triggerSpeakingEvaluation(attemptId) {
    console.log('🗣️ Triggering speaking evaluation for:', attemptId);
    
    fetch(`${this.SUPABASE_URL}/functions/v1/sproochentest-evaluate-speaking`, {
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
      sections.speaking.completed,
      sections.listening.completed
    ].filter(Boolean).length;
    
    return {
      completed,
      total: 2,
      percentage: Math.round((completed / 2) * 100),
      canSubmit: completed === 2 && !this.currentTest.submitted
    };
  },
  
  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================
  
  getCurrentUserId() {
    return localStorage.getItem('cl_email') || 'anonymous';
  },
  
  clearTestData(examId) {
    localStorage.removeItem(`sproochentest_${examId}`);
  },
  
  getExamLabel(examId) {
    const num = examId.replace('sproochentest-', '');
    return `Test ${parseInt(num, 10)}`;
  }
};

// Make globally available
window.SproochEngine = SproochEngine;
