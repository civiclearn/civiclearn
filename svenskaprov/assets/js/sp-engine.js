/**
 * sp-engine.js
 * Shared runtime for all SvenskaProv exam pages.
 * Clone of celpe-engine.js (canonical pattern).
 *
 * Load AFTER sp-auth.js:
 *   <script src="/svenskaprov/assets/js/sp-auth.js"></script>
 *   <script src="/svenskaprov/assets/js/sp-engine.js"></script>
 *
 * Exposes window.SP with same API as CELPE.
 */

window.SP = (function () {

  const SUPABASE_URL = 'https://htgliokekeaovdiafrgs.supabase.co';
  const FN = name => `${SUPABASE_URL}/functions/v1/${name}`;

  let _user         = null;
  let _hydrateCache  = null;
  let _hydrateCacheKey = '';

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

  async function hydrate(userId, attemptId, forceRefresh = false) {
    if (!userId) return null;
    const cacheKey = `${userId}::${attemptId}`;
    if (!forceRefresh && _hydrateCache && _hydrateCacheKey === cacheKey) return _hydrateCache;
    try {
      const data = await apiFetch('sp-hydrate', { user_id: userId });
      _hydrateCache    = data;
      _hydrateCacheKey = cacheKey;
      return data;
    } catch (err) {
      console.warn('[SP] hydrate failed:', err.message);
      return null;
    }
  }

  return {

    FN,
    SUPABASE_URL,

    async apiFetch(fnName, body) { return apiFetch(fnName, body); },

    async init(defaultElemKey = '') {
      await spAuth.ready;
      _user = {
        email:        spAuth.email,
        access_token: spAuth.session.access_token,
        id:           spAuth.userId,
      };
      const p         = new URLSearchParams(location.search);
      const attemptId = p.get('attempt') || '';
      const simId     = p.get('sim')     || 'sim01';
      const elemKey   = p.get('key')     || defaultElemKey;
      const simNum    = parseInt(simId.replace('sim', ''), 10) || 1;
      return { user: _user, attemptId, simId, simNum, elemKey };
    },

    async isSubmitted(userId, attemptId, elemKey) {
      const data = await hydrate(userId, attemptId);
      if (!data) return false;
      const attempt = (data.attempts || []).find(a => a.id === attemptId);
      const elem    = (attempt?.elements || []).find(e => e.element_key === elemKey);
      return elem?.submission_status === 'submitted' || elem?.submission_status === 'skipped';
    },

    async getStatus(userId, attemptId, elemKey) {
      const data = await hydrate(userId, attemptId);
      if (!data) return 'not_started';
      const attempt = (data.attempts || []).find(a => a.id === attemptId);
      const elem    = (attempt?.elements || []).find(e => e.element_key === elemKey);
      return elem?.submission_status || 'not_started';
    },

    async hydrateData(userId, attemptId, forceRefresh = false) {
      return hydrate(userId, attemptId, forceRefresh);
    },

    async submit({ attemptId, elemKey, text = '', json = {}, score, total_questions, correct_answers }) {
      const token = _user?.access_token || '';
      const body = {
        attempt_id:    attemptId,
        element_key:   elemKey,
        response_text: text,
        response_json: json,
      };
      // Auto-graded elements send score directly
      if (score !== undefined) {
        body.score = score;
        body.total_questions = total_questions;
        body.correct_answers = correct_answers;
      }
      const res = await fetch(FN('sp-submit-element'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok && !(data.error || '').toLowerCase().includes('already')) {
        throw new Error(data.error || `sp-submit-element HTTP ${res.status}`);
      }
      return data;
    },

    async submitAudio({ attemptId, elemKey, audioBase64, responseJson }) {
      const token = _user?.access_token || '';
      const res = await fetch(FN('sp-submit-element'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          attempt_id:  attemptId,
          element_key: elemKey,
          audio_base64: audioBase64,
          response_json: responseJson || {},
        }),
      });
      const data = await res.json();
      if (!res.ok && !(data.error || '').toLowerCase().includes('already')) {
        throw new Error(data.error || `sp-submit-element HTTP ${res.status}`);
      }
      return data;
    },

    async skip({ attemptId, elemKey }) {
      const token = _user?.access_token || '';
      try {
        await fetch(FN('sp-submit-element'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ attempt_id: attemptId, element_key: elemKey, action: 'skip' }),
        });
      } catch (err) { console.warn('[SP] skip failed (non-fatal):', err.message); }
    },

    goBack(simId, attemptId) {
      window.location.href = `/svenskaprov/dashboard/exam.html?sim=${simId}&attempt=${attemptId}`;
    },

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
        <div style="font-size:1rem;font-weight:700;color:#0f172a;">Något gick fel</div>
        <div style="font-size:0.85rem;color:#64748b;max-width:400px;line-height:1.5;">${this.escapeHtml(msg)}</div>
        ${simId && attemptId
          ? `<a href="/svenskaprov/dashboard/exam.html?sim=${simId}&attempt=${attemptId}" style="margin-top:12px;font-size:0.85rem;color:#006AA7;font-weight:600;">← Tillbaka till provet</a>`
          : `<a href="/svenskaprov/dashboard/index.html" style="margin-top:12px;font-size:0.85rem;color:#006AA7;font-weight:600;">← Tillbaka till start</a>`}
      `;
      document.body.appendChild(el);
    },

    toast(msg, duration = 3500) {
      const existing = document.getElementById('sp-toast');
      if (existing) existing.remove();
      const el = document.createElement('div');
      el.id = 'sp-toast';
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

    escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    },

    countWords(str) {
      if (!str) return 0;
      return str.trim().split(/\s+/).filter(w => w.length > 0).length;
    },
  };
})();
