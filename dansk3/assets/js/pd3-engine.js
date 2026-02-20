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

  }; // end return

})(); // end IIFE
