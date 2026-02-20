/**
 * pd3-engine.js
 * Shared runtime for all Prøve i Dansk 3 exam pages.
 *
 * Load AFTER auth-guard-dansk3.js, BEFORE page-specific scripts:
 *   <script src="/assets/js/auth-guard-dansk3.js"></script>
 *   <script src="/assets/js/pd3-engine.js"></script>
 *
 * All pages then get window.PD3 with:
 *   PD3.init(defaultElemKey)   → { user, attemptId, simId, simNum, elemKey }
 *   PD3.isSubmitted(key)       → boolean (uses cached hydrate)
 *   PD3.submit({...})          → submits element response
 *   PD3.skip({...})            → submits skip action
 *   PD3.goBack(simId, attemptId)
 *   PD3.hideLoading()
 *   PD3.showError(msg, simId, attemptId)
 *   PD3.toast(msg)
 *   PD3.escapeHtml(str)
 *   PD3.countWords(str)
 *   PD3.FN(edgeFunctionName)   → full URL (for pages that call other edge functions directly)
 */

window.PD3 = (function () {

  // ─── CONFIG ──────────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://htgliokekeaovdiafrgs.supabase.co';
  const FN = name => `${SUPABASE_URL}/functions/v1/${name}`;

  // ─── INTERNAL STATE ───────────────────────────────────────────────────
  let _user         = null;   // window.civicUser after auth resolves
  let _hydrateCache = null;   // cached pd3-hydrate response (keyed below)
  let _hydrateCacheKey = '';  // "email::attemptId" — invalidate if different

  // ─── AUTH ─────────────────────────────────────────────────────────────
  /**
   * Waits up to 5 s for auth-guard to set window.civicUser.
   * Resolves immediately if already set (i.e. returning visit).
   */
  function waitForAuth() {
    return new Promise(resolve => {
      if (window.civicUser) return resolve(window.civicUser);
      const t = setInterval(() => {
        if (window.civicUser) { clearInterval(t); resolve(window.civicUser); }
      }, 80);
      setTimeout(() => { clearInterval(t); resolve(window.civicUser || {}); }, 5000);
    });
  }

  // ─── LOW-LEVEL FETCH ──────────────────────────────────────────────────
  /**
   * POST to a Supabase Edge Function with the current user's bearer token.
   * Throws a descriptive Error on non-2xx responses.
   */
  async function apiFetch(fnName, body) {
    const token = _user?.access_token || '';
    const res = await fetch(FN(fnName), {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`${fnName} HTTP ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ─── HYDRATE (cached) ─────────────────────────────────────────────────
  /**
   * Fetches pd3-hydrate for the current user.
   * The result is cached for the lifetime of the page so that:
   *   - isSubmitted() called multiple times costs only one network request
   *   - skriftlig_del2's two-key check is free
   *
   * Pass forceRefresh = true to bust the cache (used after polling on exam.html).
   */
  async function hydrate(email, attemptId, forceRefresh = false) {
    if (!email || !attemptId) return null;

    const cacheKey = `${email}::${attemptId}`;
    if (!forceRefresh && _hydrateCache && _hydrateCacheKey === cacheKey) {
      return _hydrateCache;
    }

    try {
      const data = await apiFetch('pd3-hydrate', { email });
      _hydrateCache    = data;
      _hydrateCacheKey = cacheKey;
      return data;
    } catch (err) {
      console.warn('[PD3] hydrate failed:', err.message);
      return null;
    }
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────
  return {

    // Expose for pages that call additional edge functions directly
    FN,
    SUPABASE_URL,

    /**
     * Raw authenticated POST to any Edge Function.
     * Throws on non-2xx. Use for pages that need custom payloads
     * beyond what PD3.submit() supports (e.g. browser-scored elements).
     *
     *   await PD3.apiFetch('pd3-submit-element', { attempt_id, element_key, ... });
     */
    async apiFetch(fnName, body) {
      return apiFetch(fnName, body);
    },

    /**
     * Must be called at the top of every page's DOMContentLoaded.
     *
     *   const { user, attemptId, simId, simNum, elemKey } = await PD3.init('laese_del1');
     *
     * @param {string} defaultElemKey  Fallback if ?key= is absent from the URL.
     * @returns {{ user, attemptId, simId, simNum, elemKey }}
     */
    async init(defaultElemKey = '') {
      _user = await waitForAuth();

      const p       = new URLSearchParams(location.search);
      const attemptId = p.get('attempt') || '';
      const simId     = p.get('sim')     || 'sim01';
      const elemKey   = p.get('key')     || defaultElemKey;
      const simNum    = parseInt(simId.replace('sim', ''), 10) || 1;

      return { user: _user, attemptId, simId, simNum, elemKey };
    },

    /**
     * Check whether a specific element has already been submitted or skipped.
     * Internally calls hydrate() which is cached, so multiple calls are free.
     *
     *   const done = await PD3.isSubmitted(user.email, attemptId, elemKey);
     *
     * @param {string} email
     * @param {string} attemptId
     * @param {string} elemKey
     * @returns {boolean}
     */
    async isSubmitted(email, attemptId, elemKey) {
      const data = await hydrate(email, attemptId);
      if (!data) return false;
      const attempt = (data.attempts || []).find(a => a.id === attemptId);
      const elem    = (attempt?.elements || []).find(e => e.element_key === elemKey);
      return elem?.submission_status === 'submitted'
          || elem?.submission_status === 'skipped';
    },

    /**
     * Fetch the raw hydrate payload for pages that need deeper inspection
     * (e.g. skriftlig_del2 which needs to check both del2a and del2b keys,
     * or exam.html which needs the full elements list).
     *
     * @param {string} email
     * @param {string} attemptId
     * @param {boolean} [forceRefresh]
     * @returns {object|null}
     */
    async hydrateData(email, attemptId, forceRefresh = false) {
      return hydrate(email, attemptId, forceRefresh);
    },

    /**
     * Submit a completed element response.
     *
     *   await PD3.submit({ attemptId, elemKey, text, json });
     *
     * Silently tolerates "already submitted" errors so double-taps are safe.
     * Throws on any other network / server error.
     *
     * @param {{ attemptId, elemKey, text, json }} opts
     */
    async submit({ attemptId, elemKey, text = '', json = {} }) {
      const token = _user?.access_token || '';
      const res = await fetch(FN('pd3-submit-element'), {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          attempt_id:    attemptId,
          element_key:   elemKey,
          response_text: text,
          response_json: json,
        }),
      });
      const data = await res.json();
      // "already" in the error message means the element was submitted twice — not fatal
      if (!res.ok && !(data.error || '').toLowerCase().includes('already')) {
        throw new Error(data.error || `pd3-submit-element HTTP ${res.status}`);
      }
      return data;
    },

    /**
     * Skip an element (contributes 0 points, marks as done so exam can progress).
     * Non-throwing — skip failures should never block the user.
     *
     *   await PD3.skip({ attemptId, elemKey });
     */
    async skip({ attemptId, elemKey }) {
      const token = _user?.access_token || '';
      try {
        await fetch(FN('pd3-submit-element'), {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            attempt_id:  attemptId,
            element_key: elemKey,
            action:      'skip',
          }),
        });
      } catch (err) {
        console.warn('[PD3] skip failed (non-fatal):', err.message);
      }
    },

    // ─── NAVIGATION ─────────────────────────────────────────────────────

    /**
     * Navigate back to the exam hub.
     *   PD3.goBack(simId, attemptId);
     */
    goBack(simId, attemptId) {
      window.location.href = `exam.html?sim=${simId}&attempt=${attemptId}`;
    },

    // ─── UI HELPERS ──────────────────────────────────────────────────────

    /**
     * Fade-out and remove the #loading-overlay element.
     * Safe to call if the element is already gone.
     */
    hideLoading() {
      const ol = document.getElementById('loading-overlay');
      if (!ol) return;
      ol.classList.add('hidden');
      setTimeout(() => ol.remove(), 400);
    },

    /**
     * Replace the entire page body with a friendly error screen.
     * Includes a "back to exam" link when simId + attemptId are available.
     *
     *   PD3.showError('Filen blev ikke fundet.', simId, attemptId);
     */
    showError(msg, simId = '', attemptId = '') {
      this.hideLoading();
      const backHref  = simId && attemptId
        ? `exam.html?sim=${simId}&attempt=${attemptId}`
        : 'index.html';
      const backLabel = simId && attemptId ? 'Tilbage til simulering' : 'Tilbage til forsiden';
      document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;
                    min-height:100vh;padding:24px;background:#f8f7f4;">
          <div style="text-align:center;max-width:400px;">
            <div style="font-size:2.5rem;margin-bottom:16px;">⚠️</div>
            <h2 style="font-family:'Fraunces',serif;font-size:1.4rem;
                       font-weight:700;margin-bottom:10px;color:#0f172a;">
              Noget gik galt
            </h2>
            <p style="color:#64748b;font-size:0.9rem;
                      margin-bottom:24px;line-height:1.6;">${msg}</p>
            <a href="${backHref}"
               style="background:#0f172a;color:white;padding:12px 28px;
                      border-radius:10px;text-decoration:none;
                      font-family:'DM Sans',sans-serif;font-size:0.9rem;
                      font-weight:600;">
              ${backLabel}
            </a>
          </div>
        </div>`;
    },

    /**
     * Show a brief toast notification at the bottom of the screen.
     *
     *   PD3.toast('Noget gik galt. Prøv igen.');
     *
     * @param {string} msg
     * @param {number} [duration=3500]  ms before the toast disappears
     */
    toast(msg, duration = 3500) {
      const el = document.createElement('div');
      el.textContent = msg;
      el.style.cssText = [
        'position:fixed',
        'bottom:24px',
        'left:50%',
        'transform:translateX(-50%)',
        'background:#1e293b',
        'color:white',
        'padding:10px 22px',
        'border-radius:10px',
        'font-family:"DM Sans",sans-serif',
        'font-size:0.85rem',
        'z-index:9999',
        'box-shadow:0 4px 18px rgba(0,0,0,0.22)',
        'pointer-events:none',
        'white-space:nowrap',
      ].join(';');
      document.body.appendChild(el);
      setTimeout(() => el.remove(), duration);
    },

    // ─── STRING UTILITIES ────────────────────────────────────────────────

    /**
     * Escape a string for safe insertion into innerHTML.
     *   PD3.escapeHtml(userText)
     */
    escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },

    /**
     * Count whitespace-delimited words in a string.
     * Returns 0 for blank/empty input.
     *
     *   PD3.countWords(textarea.value)
     */
    countWords(text) {
      const t = text.trim();
      return t.length === 0 ? 0 : t.split(/\s+/).filter(w => w.length > 0).length;
    },

    /**
     * Warm up the TTS engine on a user gesture (e.g. button click).
     * Call this as early as possible — ideally on the first click the user
     * makes on the page — so that voices are fully loaded by the time
     * FollowupRecorder needs them.
     *
     *   PD3.warmupTTS('da-DK');
     */
    /**
     * Upload an audio Blob directly to Supabase Storage.
     * Returns the storage path (string) on success, null on failure.
     *
     * The path format is: pd3-audio/{attemptId}/{filename}
     * Edge functions read audio from this path via the service role key.
     *
     *   const path = await PD3.uploadAudio(blob, attemptId, 'round1_main.webm');
     */
    async uploadAudio(blob, attemptId, filename) {
      if (!blob || blob.size === 0) return null;

      // Upload via edge function (service role) — avoids Supabase Auth JWT requirement
      const url = FN('pd3-upload-audio');

      try {
        const res = await fetch(url, {
          method:  'POST',
          headers: {
            'Content-Type':   blob.type || 'audio/webm',
            'x-attempt-id':   attemptId,
            'x-filename':     filename,
          },
          body: blob,   // raw binary — no base64 inflation, no auth token needed
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          console.error(`[PD3.uploadAudio] HTTP ${res.status}:`, txt);
          return null;
        }

        const data = await res.json();
        console.log(`[PD3.uploadAudio] uploaded: ${data.path} (${(blob.size/1024).toFixed(0)} KB)`);
        return data.path;
      } catch (err) {
        console.error('[PD3.uploadAudio] network error:', err);
        return null;
      }
    },

    warmupTTS(lang = 'da-DK') {
      if (!window.speechSynthesis) return;
      try {
        // Speak a zero-width space — triggers voice loading, inaudible
        const utt = new SpeechSynthesisUtterance('​');
        utt.lang   = lang;
        utt.volume = 0;
        window.speechSynthesis.speak(utt);
        // Also force-load voices
        window.speechSynthesis.getVoices();
      } catch (_) {}
    },

    // ─── FOLLOWUP RECORDER ──────────────────────────────────────────────

    /**
     * Creates a TTS → countdown → record flow for follow-up questions.
     * See module header for full usage docs.
     *
     *   const rec = PD3.FollowupRecorder({ container, questions, micStream, onComplete, onSkipAll });
     *   rec.start();
     */
    // ═══════════════════════════════════════════════════════════════════════
// PD3.FollowupRecorder
// ═══════════════════════════════════════════════════════════════════════
//
// Runs a fully automated TTS → countdown → record → next flow for
// a list of follow-up questions. No playback between questions —
// simulates real exam conversation pressure.
//
// Usage:
//   const recorder = PD3.FollowupRecorder({
//     container:    document.getElementById('followupArea'),
//     questions:    ['Question 1', 'Question 2', 'Question 3'],
//     micStream:    existingStream,          // optional — reuse from main recording
//     onComplete:   (results) => { ... },   // called when all questions done
//     onSkipAll:    () => { ... },           // called if user skips entire section
//   });
//   recorder.start();
//
// results is an array of:
//   { question, audio_base64, duration_sec, response_time_sec, skipped }
//
// ═══════════════════════════════════════════════════════════════════════

FollowupRecorder: function({ container, questions = [], micStream = null, onComplete, onSkipAll }) {

  // ── State ──────────────────────────────────────────────────────────
  let currentIdx      = 0;
  let results         = [];
  let mediaRecorder   = null;
  let audioChunks     = [];
  let recStartTime    = null;
  let timerInterval   = null;
  let recSeconds      = 0;
  let activeStream    = micStream || null;
  let ttsUtterance    = null;
  let countdownTimer  = null;
  const MAX_REC_SEC   = 90;

  // ── Helpers ────────────────────────────────────────────────────────
  function blobToBase64(blob) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result.split(',')[1]);
      r.onerror = () => rej(new Error('Base64 conversion failed'));
      r.readAsDataURL(blob);
    });
  }

  function formatTime(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // Wait for voices to load (Chrome loads them async on first call)
  function getVoices() {
    return new Promise(resolve => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) { resolve(voices); return; }
      window.speechSynthesis.onvoiceschanged = () => {
        resolve(window.speechSynthesis.getVoices());
      };
      // Fallback if event never fires
      setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
    });
  }

  function speak(text) {
    return new Promise(async resolve => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();

      const voices  = await getVoices();

      // Prefer: da-DK local voices first (best quality), then any Danish voice
      // Voice name hints for good Danish voices across platforms:
      //   macOS: "Ida" (da-DK) — excellent
      //   Windows: "Helle" (da-DK) — decent
      //   iOS:  "Ida" or "Caroline"
      //   Android/Linux: may only have generic TTS
      const daVoice = voices.find(v => v.lang === 'da-DK' && v.localService)
                   || voices.find(v => v.lang === 'da-DK')
                   || voices.find(v => v.lang.startsWith('da'))
                   || null;

      const utt = new SpeechSynthesisUtterance(text);
      utt.lang  = 'da-DK';
      utt.rate  = 0.88;   // slightly slower = clearer for non-native listeners
      utt.pitch = 1.0;
      if (daVoice) utt.voice = daVoice;

      utt.onend   = resolve;
      utt.onerror = resolve;
      ttsUtterance = utt;
      window.speechSynthesis.speak(utt);
    });
  }

  // ── UI Rendering ───────────────────────────────────────────────────
  function renderShell() {
    container.innerHTML = `
      <div class="fup-shell">

        <!-- Progress dots -->
        <div class="fup-progress" id="fupProgress"></div>

        <!-- Question card -->
        <div class="fup-question-card" id="fupQuestionCard">
          <div class="fup-q-eyebrow">
            <span class="fup-q-dot"></span>
            <span id="fupQLabel">Opfølgende spørgsmål 1 / ${questions.length}</span>
          </div>
          <div class="fup-q-text" id="fupQText"></div>
          <div class="fup-tts-row" id="fupTtsRow">
            <span class="fup-tts-icon">🔊</span>
            <span class="fup-tts-label" id="fupTtsLabel">Læser spørgsmålet op…</span>
          </div>
        </div>

        <!-- Countdown overlay (shown during 3-2-1) -->
        <div class="fup-countdown" id="fupCountdown" style="display:none">
          <div class="fup-cd-number" id="fupCdNumber">3</div>
          <div class="fup-cd-label">Svar nu</div>
        </div>

        <!-- Recorder area -->
        <div class="fup-recorder" id="fupRecorder" style="display:none">
          <div class="fup-rec-header">
            <span class="fup-rec-dot" id="fupRecDot"></span>
            <span class="fup-rec-status" id="fupRecStatus">Optager…</span>
            <span class="fup-rec-timer" id="fupRecTimer">0:00</span>
          </div>
          <canvas class="fup-waveform" id="fupWaveform" width="400" height="56"></canvas>
          <div class="fup-rec-hint">Tal naturligt — mindst 4–5 sætninger. Stop når du er færdig.</div>
          <button class="fup-stop-btn" id="fupStopBtn" onclick="__fupStop()">
            <span>■</span> Stop optagelse
          </button>
          <div class="fup-skip-row">
            <span class="fup-skip-q-link" onclick="__fupSkipQuestion()">Spring dette spørgsmål over</span>
          </div>
        </div>

        <!-- Saved confirmation (flashes between questions) -->
        <div class="fup-saved" id="fupSaved" style="display:none">
          <span>✓</span> Svar gemt
        </div>

        <!-- Skip all link -->
        <div class="fup-skip-all-row" id="fupSkipAllRow">
          <span class="fup-skip-all-link" onclick="__fupSkipAll()">Spring alle opfølgende spørgsmål over</span>
        </div>

      </div>`;

    // Inject CSS once
    if (!document.getElementById('fup-styles')) {
      const style = document.createElement('style');
      style.id = 'fup-styles';
      style.textContent = `
        .fup-shell { margin-top: 28px; }

        .fup-progress {
          display: flex; gap: 8px; justify-content: center;
          margin-bottom: 20px;
        }
        .fup-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #e2e8f0; transition: background 0.3s;
        }
        .fup-dot.active  { background: #0f172a; }
        .fup-dot.done    { background: #22c55e; }
        .fup-dot.skipped { background: #cbd5e1; }

        .fup-question-card {
          background: white; border: 2px solid #0f172a;
          border-radius: 14px; padding: 20px 22px;
          margin-bottom: 16px;
          animation: fupSlideIn 0.3s ease;
        }
        @keyframes fupSlideIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fup-q-eyebrow {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #64748b; margin-bottom: 10px;
        }
        .fup-q-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ef4444; display: inline-block;
        }
        .fup-q-text {
          font-size: 1.05rem; font-weight: 600; color: #0f172a;
          line-height: 1.45; margin-bottom: 12px;
        }
        .fup-tts-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.8rem; color: #64748b;
        }
        .fup-tts-icon { font-size: 1rem; }

        .fup-countdown {
          text-align: center; padding: 32px 0 24px;
        }
        .fup-cd-number {
          font-size: 5rem; font-weight: 900; color: #ef4444;
          font-family: 'Fraunces', serif;
          animation: fupPulse 0.8s ease-in-out infinite;
          line-height: 1;
        }
        @keyframes fupPulse {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.08); }
        }
        .fup-cd-label {
          font-size: 1rem; font-weight: 700; color: #0f172a;
          text-transform: uppercase; letter-spacing: 0.1em;
          margin-top: 8px;
        }

        .fup-recorder {
          background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 12px; padding: 16px 18px;
          margin-bottom: 16px;
        }
        .fup-rec-header {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 10px;
        }
        .fup-rec-dot {
          width: 10px; height: 10px; border-radius: 50%;
          background: #ef4444;
          animation: fupRecPulse 1.1s ease-in-out infinite;
        }
        @keyframes fupRecPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .fup-rec-dot.done { background: #22c55e; animation: none; }
        .fup-rec-status { flex: 1; font-size: 0.85rem; color: #475569; font-weight: 500; }
        .fup-rec-timer  { font-size: 0.85rem; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }

        .fup-waveform {
          width: 100%; height: 56px; display: block;
          background: white; border-radius: 8px;
          margin-bottom: 10px;
        }
        .fup-rec-hint { font-size: 0.78rem; color: #94a3b8; margin-bottom: 12px; }

        .fup-stop-btn {
          width: 100%; padding: 12px;
          background: #0f172a; color: white; border: none;
          border-radius: 10px; font-size: 0.9rem; font-weight: 600;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
        }
        .fup-stop-btn:hover { opacity: 0.88; }

        .fup-skip-row { text-align: center; margin-top: 10px; }
        .fup-skip-q-link {
          font-size: 0.78rem; color: #94a3b8; cursor: pointer;
        }
        .fup-skip-q-link:hover { color: #64748b; }

        .fup-saved {
          text-align: center; color: #22c55e;
          font-weight: 700; font-size: 0.95rem;
          padding: 16px 0;
          animation: fupFadeIn 0.3s ease;
        }
        @keyframes fupFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }

        .fup-skip-all-row { text-align: center; margin-top: 16px; }
        .fup-skip-all-link {
          font-size: 0.78rem; color: #cbd5e1; cursor: pointer;
        }
        .fup-skip-all-link:hover { color: #94a3b8; }
      `;
      document.head.appendChild(style);
    }

    // Wire global handlers (easiest way to handle inline onclick in injected HTML)
    window.__fupStop         = () => instance.stopRecording();
    window.__fupSkipQuestion = () => instance.skipQuestion();
    window.__fupSkipAll      = () => instance.skipAll();

    renderProgressDots();
  }

  function renderProgressDots() {
    const bar = document.getElementById('fupProgress');
    if (!bar) return;
    bar.innerHTML = questions.map((_, i) => {
      const state = i < currentIdx ? (results[i]?.skipped ? 'skipped' : 'done')
                  : i === currentIdx ? 'active' : '';
      return `<div class="fup-dot ${state}"></div>`;
    }).join('');
  }

  // ── Waveform ───────────────────────────────────────────────────────
  let waveRAF = null;
  let analyser = null;

  function setupWaveform(stream) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source   = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      drawWaveform();
    } catch(e) { /* waveform optional */ }
  }

  function drawWaveform() {
    const canvas = document.getElementById('fupWaveform');
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const buf = new Uint8Array(analyser.frequencyBinCount);

    function frame() {
      waveRAF = requestAnimationFrame(frame);
      analyser.getByteTimeDomainData(buf);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const step = W / buf.length;
      buf.forEach((v, i) => {
        const x = i * step;
        const y = ((v / 128) - 1) * (H * 0.38) + H / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    frame();
  }

  function stopWaveform() {
    if (waveRAF) { cancelAnimationFrame(waveRAF); waveRAF = null; }
    analyser = null;
  }

  // ── Core flow ──────────────────────────────────────────────────────
  async function runQuestion(idx) {
    currentIdx = idx;
    const q = questions[idx];
    renderProgressDots();

    // Show question card, hide recorder + countdown
    document.getElementById('fupQuestionCard').style.display = '';
    document.getElementById('fupCountdown').style.display    = 'none';
    document.getElementById('fupRecorder').style.display     = 'none';
    document.getElementById('fupSaved').style.display        = 'none';

    document.getElementById('fupQLabel').textContent =
      `Opfølgende spørgsmål ${idx + 1} / ${questions.length}`;
    document.getElementById('fupQText').textContent = q;
    document.getElementById('fupTtsRow').style.display = '';
    document.getElementById('fupTtsLabel').textContent = 'Læser spørgsmålet op…';

    // TTS
    await speak(q);

    // Hide TTS row after speaking
    document.getElementById('fupTtsRow').style.display = 'none';

    // 3-2-1 countdown
    await runCountdown();

    // Start recording
    await startRecording();
  }

  function runCountdown() {
    return new Promise(resolve => {
      document.getElementById('fupCountdown').style.display = '';
      let n = 3;
      document.getElementById('fupCdNumber').textContent = n;

      countdownTimer = setInterval(() => {
        n--;
        if (n <= 0) {
          clearInterval(countdownTimer);
          document.getElementById('fupCountdown').style.display = 'none';
          resolve();
        } else {
          document.getElementById('fupCdNumber').textContent = n;
        }
      }, 800);
    });
  }

  async function startRecording() {
    audioChunks = [];
    recSeconds  = 0;
    recStartTime = Date.now();

    // Acquire stream if not already available
    if (!activeStream) {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        // Mic denied — skip this question silently
        await saveResult(null, 0, true);
        return;
      }
    }

    setupWaveform(activeStream);

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus' : 'audio/webm';
    mediaRecorder = new MediaRecorder(activeStream, { mimeType, audioBitsPerSecond: 16000 });

    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };
    mediaRecorder.onstop = async () => {
      stopWaveform();
      clearInterval(timerInterval);
      const blob    = new Blob(audioChunks, { type: mimeType });
      const b64     = blob.size > 0 ? await blobToBase64(blob) : null;
      const elapsed = Math.round((Date.now() - recStartTime) / 1000);
      await saveResult(b64, elapsed, false);
    };

    mediaRecorder.start(250);

    // Show recorder UI
    document.getElementById('fupRecorder').style.display = '';
    document.getElementById('fupRecDot').className       = 'fup-rec-dot';
    document.getElementById('fupRecStatus').textContent  = 'Optager…';
    document.getElementById('fupRecTimer').textContent   = '0:00';
    document.getElementById('fupStopBtn').disabled       = false;

    // Timer
    timerInterval = setInterval(() => {
      recSeconds++;
      document.getElementById('fupRecTimer').textContent = formatTime(recSeconds);
      if (recSeconds >= MAX_REC_SEC) instance.stopRecording();
    }, 1000);
  }

  async function saveResult(audio_base64, duration_sec, skipped) {
    const q = questions[currentIdx];
    const response_time_sec = recStartTime
      ? Math.max(0, Math.round((Date.now() - recStartTime) / 1000) - duration_sec)
      : 0;

    results[currentIdx] = { question: q, audio_base64, duration_sec, response_time_sec, skipped: !!skipped };

    // Flash saved
    document.getElementById('fupRecorder').style.display = 'none';
    document.getElementById('fupQuestionCard').style.display = 'none';
    if (!skipped) {
      document.getElementById('fupSaved').style.display = '';
      await new Promise(r => setTimeout(r, 900));
    }

    renderProgressDots();

    // Advance or finish
    if (currentIdx + 1 < questions.length) {
      await runQuestion(currentIdx + 1);
    } else {
      finish();
    }
  }

  function finish() {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px 0;">
        <div style="font-size:1.8rem; margin-bottom:10px;">✅</div>
        <div style="font-weight:700; color:#0f172a; font-size:1rem;">Alle opfølgende spørgsmål besvaret</div>
        <div style="color:#64748b; font-size:0.85rem; margin-top:6px;">Dine svar sendes med aflevering.</div>
      </div>`;
    if (onComplete) onComplete(results);
  }

  // ── Public instance ────────────────────────────────────────────────
  const instance = {

    start() {
      renderShell();
      runQuestion(0);
    },

    stopRecording() {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        document.getElementById('fupRecDot').className      = 'fup-rec-dot done';
        document.getElementById('fupRecStatus').textContent = 'Optagelse færdig';
        document.getElementById('fupStopBtn').disabled      = true;
        mediaRecorder.stop();
      }
    },

    skipQuestion() {
      if (!confirm(`Spring spørgsmål ${currentIdx + 1} over?`)) return;
      // Cancel any active recording
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        audioChunks = []; // discard
        mediaRecorder.onstop = async () => {
          stopWaveform();
          clearInterval(timerInterval);
          await saveResult(null, 0, true);
        };
        mediaRecorder.stop();
      } else {
        // Might be in TTS or countdown phase
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        if (countdownTimer) clearInterval(countdownTimer);
        saveResult(null, 0, true);
      }
    },

    skipAll() {
      if (!confirm('Spring alle opfølgende spørgsmål over?')) return;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (countdownTimer) clearInterval(countdownTimer);
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        audioChunks = [];
        mediaRecorder.onstop = () => {
          stopWaveform();
          clearInterval(timerInterval);
          // Fill remaining results as skipped
          for (let i = currentIdx; i < questions.length; i++) {
            results[i] = { question: questions[i], audio_base64: null, duration_sec: 0, response_time_sec: 0, skipped: true };
          }
          container.innerHTML = '';
          if (onSkipAll) onSkipAll();
        };
        mediaRecorder.stop();
      } else {
        for (let i = currentIdx; i < questions.length; i++) {
          results[i] = { question: questions[i], audio_base64: null, duration_sec: 0, response_time_sec: 0, skipped: true };
        }
        container.innerHTML = '';
        if (onSkipAll) onSkipAll();
      }
    },

    // Expose stream so caller can release it after all recordings done
    getStream() { return activeStream; },
  };

  return instance;
},

    }; // end return

})(); // end IIFE
