const ATTEMPT_KEY = "ciple_attempt_v1";

export function loadAttempt(examId) {
  const raw = sessionStorage.getItem(ATTEMPT_KEY);
  if (!raw) {
    return {
      exam_id: examId,
      started_at: new Date().toISOString(),
      reading: null,
      listening: null,
      writing: null,
      speaking: null,
      finalized: false
    };
  }

  const parsed = JSON.parse(raw);
  if (parsed.exam_id !== examId) {
    sessionStorage.removeItem(ATTEMPT_KEY);
    return loadAttempt(examId);
  }

  return parsed;
}

export function saveAttempt(attempt) {
  sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
}

export function markReading(attempt, payload) {
  attempt.reading = {
    ...payload,
    completed_at: new Date().toISOString()
  };
  saveAttempt(attempt);
}

export function isReadingDone(attempt) {
  return !!attempt.reading;
}
