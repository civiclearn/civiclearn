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
        const userAnswer = this.currentTest.sections.reading.answers[q.id];
        const correctAnswer = q.correct_option;
        
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
  
  saveSpeakingRecording(taskId, audioBlob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result;
        this.currentTest.sections.speaking.recordings[taskId] = base64Audio;
        this.saveTestState(this.currentExamId, this.currentTest);
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
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
    
    // Prepare payload for Edge Function
    const payload = {
      exam_id: this.currentExamId,
      user_id: this.getCurrentUserId(), // You'll need to implement this
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
          recordings: this.currentTest.sections.speaking.recordings
        }
      },
      submitted_at: new Date().toISOString()
    };
    
    try {
      // Call Supabase Edge Function
      const response = await fetch(`${this.SUPABASE_URL}/functions/v1/evaluate-ciple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SUPABASE_KEY}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Submission failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Mark as submitted and store result ID
      this.currentTest.submitted = true;
      this.currentTest.result_id = result.attempt_id;
      this.saveTestState(this.currentExamId, this.currentTest);
      
      return result;
      
    } catch (error) {
      console.error('Submission error:', error);
      throw error;
    }
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
    // TODO: Integrate with your existing CivicLearn auth system
    // For now, return a placeholder
    return localStorage.getItem('civiclearn_user_id') || 'anonymous';
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