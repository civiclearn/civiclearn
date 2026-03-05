/**
 * rik-engine.js
 * Shared runtime for all Ríkisborgarapróf exam pages.
 *
 * Load AFTER rik-auth.js, BEFORE page-specific scripts:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="/rikisborgaraprof/assets/js/rik-auth.js"></script>
 *   <script src="/rikisborgaraprof/assets/js/rik-engine.js"></script>
 *
 * All pages then get window.RIK with:
 *   RIK.init(defaultElemKey)          → { user, attemptId, simId, simNum, elemKey }
 *   RIK.isSubmitted(email, aid, ek)   → boolean
 *   RIK.getStatus(email, aid, ek)     → string
 *   RIK.hydrateData(email, aid)       → object|null
 *   RIK.submit({ attemptId, elemKey, text, json })
 *   RIK.skip({ attemptId, elemKey })
 *   RIK.uploadAudio(attemptId, filename, blob) → { path }
 *   RIK.goBack(simId, attemptId)
 *   RIK.hideLoading()
 *   RIK.showError(msg, simId, attemptId)
 *   RIK.toast(msg)
 *   RIK.escapeHtml(str)
 *   RIK.countWords(str)
 *   RIK.apiFetch(fnName, body)
 *   RIK.FN(edgeFunctionName) → full URL
 *   RIK.SUPABASE_URL
 */

window.RIK = (function () {

  // ─── CONFIG ──────────────────────────────────────────────────────
  const SUPABASE_URL = 'https://htgliokekeaovdiafrgs.supabase.co';
  const FN = name => `${SUPABASE_URL}/functions/v1/${name}`;

  // ─── INTERNAL STATE ──────────────────────────────────────────────
  let _user            = null;
  let _hydrateCache    = null;
  let _hydrateCacheKey = '';

  // ─── LOW-LEVEL FETCH ─────────────────────────────────────────────
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

  // ─── HYDRATE (cached) ────────────────────────────────────────────
  async function hydrate(email, attemptId, forceRefresh = false) {
    if (!email || !attemptId) return null;

    const cacheKey = `${email}::${attemptId}`;
    if (!forceRefresh && _hydrateCache && _hydrateCacheKey === cacheKey) {
      return _hydrateCache;
    }

    try {
      const data = await apiFetch('rik-hydrate', { email });
      _hydrateCache    = data;
      _hydrateCacheKey = cacheKey;
      return data;
    } catch (err) {
      console.warn('[RIK] hydrate failed:', err.message);
      return null;
    }
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────
  return {

    FN,
    SUPABASE_URL,

    async apiFetch(fnName, body) {
      return apiFetch(fnName, body);
    },

    /**
     * Must be called at the top of every page's DOMContentLoaded.
     *
     *   const { user, attemptId, simId, simNum, elemKey } = await RIK.init('lestur');
     */
    async init(defaultElemKey = '') {
      await rikAuth.ready;
      _user = {
        email:        rikAuth.email,
        access_token: rikAuth.session.access_token,
        id:           rikAuth.userId,
      };

      const p         = new URLSearchParams(location.search);
      const attemptId = p.get('attempt') || '';
      const simId     = p.get('sim')     || 'sim-01';
      const elemKey   = p.get('key')     || defaultElemKey;
      const simNum    = parseInt(simId.replace('sim-', ''), 10) || 1;

      return { user: _user, attemptId, simId, simNum, elemKey };
    },

    /**
     * Check whether a specific element has already been submitted or skipped.
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
     * Returns raw submission_status:
     * 'not_started' | 'in_progress' | 'submitted' | 'skipped'
     */
    async getStatus(email, attemptId, elemKey) {
      const data = await hydrate(email, attemptId);
      if (!data) return 'not_started';
      const attempt = (data.attempts || []).find(a => a.id === attemptId);
      const elem    = (attempt?.elements || []).find(e => e.element_key === elemKey);
      return elem?.submission_status || 'not_started';
    },

    /**
     * Fetch the raw hydrate payload for pages that need full element lists.
     */
    async hydrateData(email, attemptId, forceRefresh = false) {
      return hydrate(email, attemptId, forceRefresh);
    },

    /**
     * Submit a completed element response.
     * Server-side: rik-submit-element saves response and triggers AI eval.
     * Silently tolerates "already submitted" errors.
     */
    async submit({ attemptId, elemKey, text = '', json = {} }) {
      const token = _user?.access_token || '';
      const res = await fetch(FN('rik-submit-element'), {
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
      if (!res.ok && !(data.error || '').toLowerCase().includes('already')) {
        throw new Error(data.error || `rik-submit-element HTTP ${res.status}`);
      }
      return data;
    },

    /**
     * Skip an element (0 points). Non-throwing.
     */
    async skip({ attemptId, elemKey }) {
      const token = _user?.access_token || '';
      try {
        await fetch(FN('rik-submit-element'), {
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
        console.warn('[RIK] skip failed (non-fatal):', err.message);
      }
    },

    /**
     * Upload audio blob to Supabase Storage via rik-upload-audio.
     * Returns { path } on success.
     *
     *   const { path } = await RIK.uploadAudio(attemptId, 'tal.webm', blob);
     */
    async uploadAudio(attemptId, filename, blob) {
      const token = _user?.access_token || '';
      const res = await fetch(FN('rik-upload-audio'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-attempt-id':  attemptId,
          'x-filename':    filename,
        },
        body: blob,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`rik-upload-audio HTTP ${res.status}: ${text}`);
      }
      return res.json();
    },

    // ─── NAVIGATION ──────────────────────────────────────────────────

    /**
     * Navigate back to the exam hub.
     */
    goBack(simId, attemptId) {
      window.location.href = `/rikisborgaraprof/dashboard/exam.html?sim=${simId}&attempt=${attemptId}`;
    },

    // ─── UI HELPERS ──────────────────────────────────────────────────

    hideLoading() {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) {
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 400);
      }
    },

    showError(msg, simId, attemptId) {
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.remove();

      const el = document.createElement('div');
      el.style.cssText = 'position:fixed;inset:0;background:#f8f7f4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;z-index:9999;padding:24px;text-align:center;';
      el.innerHTML = `
        <div style="font-size:1.5rem;">⚠️</div>
        <div style="font-size:1rem;font-weight:700;color:#0f172a;">Villa kom upp</div>
        <div style="font-size:0.85rem;color:#64748b;max-width:400px;line-height:1.5;">${this.escapeHtml(msg)}</div>
        ${simId && attemptId
          ? `<a href="/rikisborgaraprof/dashboard/exam.html?sim=${simId}&attempt=${attemptId}" style="margin-top:12px;font-size:0.85rem;color:#003897;font-weight:600;">← Til baka í próf</a>`
          : `<a href="/rikisborgaraprof/dashboard/index.html" style="margin-top:12px;font-size:0.85rem;color:#003897;font-weight:600;">← Til baka</a>`}
      `;
      document.body.appendChild(el);
    },

    toast(msg, duration = 3500) {
      const existing = document.getElementById('rik-toast');
      if (existing) existing.remove();

      const el = document.createElement('div');
      el.id = 'rik-toast';
      el.textContent = msg;
      el.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        background:#0f172a; color:white; padding:10px 22px; border-radius:10px;
        font-family:"DM Sans",system-ui,sans-serif; font-size:0.85rem; font-weight:500;
        box-shadow:0 4px 20px rgba(0,0,0,0.2); z-index:10000;
        opacity:0; transition:opacity 0.25s;
      `;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.style.opacity = '1');
      setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }, duration);
    },

    // ─── STRING UTILS ────────────────────────────────────────────────

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    },

    countWords(str) {
      if (!str) return 0;
      return str.trim().split(/\s+/).filter(w => w.length > 0).length;
    },

    // ─── TTS (warmup for speaking pages) ─────────────────────────────

    /**
     * Warmup browser TTS for Icelandic voices.
     * Call early (e.g. on first user interaction).
     */
    warmupTTS() {
      if (!window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance('');
      u.lang = 'is-IS';
      u.volume = 0;
      window.speechSynthesis.speak(u);
    },

  }; // end return

})(); // end IIFE
