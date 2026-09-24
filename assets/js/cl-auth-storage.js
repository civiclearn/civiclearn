/**
 * CivicLearn — resilient storage for the Supabase login session
 * ═══════════════════════════════════════════════════════════════
 * Load right after supabase-js and BEFORE any createClient() call:
 *   <script src="/assets/js/cl-auth-storage.js"></script>
 * then create clients with:
 *   window.supabase.createClient(URL, KEY, { auth: { storage: window.clAuthStorage } })
 *
 * WHY THIS EXISTS (login bounce loop, Sep 2026)
 * supabase-js tests localStorage once when a client is created. If that test
 * write throws — origin at its storage quota (Chrome stores localStorage as
 * UTF-16, so ~2.5 MB of JSON already fills the 5 MB pool shared by every
 * product on civiclearn.com), or an extension / browser setting blocking site
 * data — it SILENTLY falls back to an in-memory store. Sign-in then succeeds,
 * login_history is written, the page navigates to the dashboard… and the
 * session is gone, because memory does not survive a page load. The guard sees
 * no session and sends the user back to login. Forever, with no error shown.
 *
 * This adapter keeps the session alive instead:
 *   1. localStorage          — normal case, unchanged behaviour
 *   2. sessionStorage        — separate quota; session survives page loads in
 *                              this tab (user must log in again in a new tab)
 *   3. memory                — nothing persists; the login page detects this
 *                              and shows a clear message instead of bouncing
 * The storage key is unchanged (sb-<ref>-auth-token), so existing sessions
 * keep working and signout.js still finds them.
 */
(function () {
  'use strict';
  if (window.clAuthStorage) return;

  var WARN_KEY = 'cl_storage_warn';     // sessionStorage: 'full' | 'blocked'
  var mem = {};
  var state = { level: 'ok', reason: null };   // level: ok | session | memory

  function ls() { try { return window.localStorage || null; } catch (e) { return null; } }
  function ss() { try { return window.sessionStorage || null; } catch (e) { return null; } }

  function reasonOf(err) {
    if (!err) return 'blocked';
    var n = (err.name || '') + ' ' + (err.message || '');
    return /quota|exceeded|full/i.test(n) || err.code === 22 || err.code === 1014 ? 'full' : 'blocked';
  }

  function degrade(level, reason) {
    // Never "upgrade" from memory back to session within one page.
    if (state.level === 'memory' && level === 'session') return;
    state.level = level;
    state.reason = reason || state.reason || 'blocked';
    try { var s = ss(); if (s) s.setItem(WARN_KEY, state.reason); } catch (e) {}
  }

  function recovered() {
    state.level = 'ok'; state.reason = null;
    try { var s = ss(); if (s) s.removeItem(WARN_KEY); } catch (e) {}
  }

  var storage = {
    getItem: function (key) {
      // sessionStorage first: it only holds a copy when localStorage refused
      // the write, and then any localStorage copy is the stale one.
      try {
        var s = ss(), v = s ? s.getItem(key) : null;
        if (v !== null && v !== undefined) {
          if (state.level === 'ok') {
            var r = null; try { r = s.getItem(WARN_KEY); } catch (e) {}
            state.level = 'session'; state.reason = r || 'full';
          }
          return v;
        }
      } catch (e) {}
      try {
        var l = ls(), v2 = l ? l.getItem(key) : null;
        if (v2 !== null && v2 !== undefined) return v2;
      } catch (e) {}
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
    },

    setItem: function (key, value) {
      var err = null;
      try {
        var l = ls();
        if (!l) throw new Error('localStorage unavailable');
        l.setItem(key, value);
        try { var s0 = ss(); if (s0) s0.removeItem(key); } catch (e) {}
        delete mem[key];
        if (state.level !== 'ok') recovered();
        return;
      } catch (e) { err = e; }

      var reason = reasonOf(err);
      // Removing never needs quota — drop any stale copy so it can't win later.
      try { var l2 = ls(); if (l2) l2.removeItem(key); } catch (e) {}

      try {
        var s = ss();
        if (!s) throw new Error('sessionStorage unavailable');
        s.setItem(key, value);
        delete mem[key];
        degrade('session', reason);
        try { console.warn('CivicLearn: localStorage refused the login session (' + reason + '); using sessionStorage.', err); } catch (e) {}
        return;
      } catch (e) {}

      mem[key] = value;
      degrade('memory', reason);
      try { console.warn('CivicLearn: no browser storage available (' + reason + '); login cannot persist.', err); } catch (e) {}
    },

    removeItem: function (key) {
      try { var l = ls(); if (l) l.removeItem(key); } catch (e) {}
      try { var s = ss(); if (s) s.removeItem(key); } catch (e) {}
      delete mem[key];
    },

    /* ── Helpers for login pages and guards ── */

    status: function () { return { level: state.level, reason: state.reason }; },

    /** Deep reset page for the current product, e.g. /sweden/reset-cache.html?deep=1 */
    resetUrl: function () {
      var seg = (location.pathname.split('/')[1] || '').trim();
      return (seg && seg.indexOf('.') === -1 ? '/' + seg : '') + '/reset-cache.html?deep=1';
    },

    /** Localised text. kind: 'full' | 'blocked' | 'session' */
    message: function (kind) {
      var lang = ((document.documentElement && document.documentElement.lang) || 'en').slice(0, 2).toLowerCase();
      var T = {
        sv: {
          full:    'Du är inloggad, men webbläsarens lagring för den här webbplatsen är full, så inloggningen kan inte sparas. Klicka på länken nedan för att rensa den och logga sedan in igen. Dina framsteg finns kvar på servern.',
          blocked: 'Du är inloggad, men webbläsaren blockerar den här webbplatsen från att spara inloggningen. Det beror oftast på ett tillägg (t.ex. antivirus eller annonsblockerare) eller en inställning som blockerar webbplatsdata. Tillåt civiclearn.com i tillägget, eller prova en annan webbläsare.',
          session: 'Webbläsarens lagring för den här webbplatsen är full. Du är inloggad i den här fliken, men nya framsteg kanske inte sparas.',
          fix:     'Rensa lagringen',
          close:   'Stäng'
        },
        da: {
          full:    'Du er logget ind, men browserens lager for dette websted er fuldt, så login kan ikke gemmes. Klik på linket nedenfor for at rydde det, og log derefter ind igen. Dine fremskridt er gemt på serveren.',
          blocked: 'Du er logget ind, men browseren forhindrer dette websted i at gemme dit login. Det skyldes oftest en udvidelse (f.eks. antivirus eller adblocker) eller en indstilling, der blokerer webstedsdata. Tillad civiclearn.com i udvidelsen, eller prøv en anden browser.',
          session: 'Browserens lager for dette websted er fuldt. Du er logget ind i denne fane, men nye fremskridt bliver måske ikke gemt.',
          fix:     'Ryd lageret',
          close:   'Luk'
        },
        fr: {
          full:    'Vous êtes connecté, mais le stockage de votre navigateur pour ce site est plein, la connexion ne peut donc pas être enregistrée. Cliquez sur le lien ci-dessous pour le vider, puis reconnectez-vous. Votre progression est conservée sur notre serveur.',
          blocked: 'Vous êtes connecté, mais votre navigateur empêche ce site d\'enregistrer votre connexion. Cela vient généralement d\'une extension (antivirus, bloqueur de publicité) ou d\'un réglage qui bloque les données des sites. Autorisez civiclearn.com dans l\'extension ou essayez un autre navigateur.',
          session: 'Le stockage de votre navigateur pour ce site est plein. Vous êtes connecté dans cet onglet, mais votre nouvelle progression risque de ne pas être enregistrée.',
          fix:     'Vider le stockage',
          close:   'Fermer'
        },
        de: {
          full:    'Sie sind angemeldet, aber der Browserspeicher für diese Website ist voll, daher kann die Anmeldung nicht gespeichert werden. Klicken Sie auf den Link unten, um ihn zu leeren, und melden Sie sich dann erneut an. Ihr Fortschritt bleibt auf unserem Server erhalten.',
          blocked: 'Sie sind angemeldet, aber Ihr Browser verhindert, dass diese Website Ihre Anmeldung speichert. Meist liegt das an einer Erweiterung (z. B. Virenschutz oder Werbeblocker) oder an einer Einstellung, die Websitedaten blockiert. Erlauben Sie civiclearn.com in der Erweiterung oder verwenden Sie einen anderen Browser.',
          session: 'Der Browserspeicher für diese Website ist voll. Sie sind in diesem Tab angemeldet, aber neuer Fortschritt wird möglicherweise nicht gespeichert.',
          fix:     'Speicher leeren',
          close:   'Schließen'
        },
        en: {
          full:    'You are logged in, but your browser\'s storage for this site is full, so the login cannot be saved. Click the link below to clear it, then log in again. Your progress is kept on our server.',
          blocked: 'You are logged in, but your browser is blocking this site from saving your login. This is usually caused by an extension (e.g. antivirus or ad blocker) or a setting that blocks site data. Allow civiclearn.com in the extension, or try another browser.',
          session: 'Your browser\'s storage for this site is full. You are logged in in this tab, but new progress may not be saved.',
          fix:     'Clear storage',
          close:   'Close'
        }
      };
      var d = T[lang] || T.en;
      return kind ? d[kind] : d;
    },

    /** Small dismissible bar for dashboard pages when running degraded. */
    showBanner: function () {
      if (state.level === 'ok') return;
      var self = this;
      function render() {
        if (document.getElementById('cl-storage-banner')) return;
        var d = self.message();
        var bar = document.createElement('div');
        bar.id = 'cl-storage-banner';
        bar.setAttribute('role', 'alert');
        bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;' +
          'background:#fff4e5;color:#5f3b00;border:1px solid #f0b86e;border-radius:10px;' +
          'padding:12px 14px;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
          'box-shadow:0 4px 18px rgba(0,0,0,.15);display:flex;gap:12px;align-items:center;flex-wrap:wrap';
        var txt = document.createElement('span');
        txt.style.cssText = 'flex:1 1 260px';
        txt.textContent = state.level === 'memory' ? d[state.reason === 'full' ? 'full' : 'blocked'] : d.session;
        bar.appendChild(txt);
        if (state.reason === 'full') {
          var a = document.createElement('a');
          a.href = self.resetUrl();
          a.textContent = d.fix;
          a.style.cssText = 'color:#5f3b00;font-weight:600;text-decoration:underline';
          bar.appendChild(a);
        }
        var x = document.createElement('button');
        x.type = 'button';
        x.textContent = d.close;
        x.style.cssText = 'background:none;border:1px solid #c98a2b;color:#5f3b00;border-radius:6px;padding:4px 10px;cursor:pointer;font:inherit';
        x.onclick = function () { bar.remove(); };
        bar.appendChild(x);
        document.body.appendChild(bar);
      }
      if (document.body) render();
      else document.addEventListener('DOMContentLoaded', render);
    }
  };

  window.clAuthStorage = storage;
})();
