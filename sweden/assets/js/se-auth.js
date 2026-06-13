/**
 * CivicAuth — Auth Guard (Sweden)
 * ═══════════════════════════════════════════════════════════════
 * Include on every protected page.
 *
 * After loading, the global `swedenAuth` object is available:
 *   swedenAuth.email      — the logged-in user's email
 *   swedenAuth.userId     — the Supabase Auth user ID (UUID)
 *   swedenAuth.session    — the full session object
 *   swedenAuth.supabase   — the initialized Supabase client
 *   swedenAuth.signOut()  — logs out and redirects to login
 *   swedenAuth.ready      — Promise that resolves when auth check is complete
 */

(function () {
  'use strict';

  const SUPABASE_URL      = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';
  const LOGIN_URL         = '/sweden/login.html';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Expose the project URL globally so the shared /assets/js/sync.js can run.
  // sync.js gates on `if (!window.SUPABASE_URL) return;` — without this, cloud
  // sync is silently disabled on every page that loads this guard. (SUPABASE_KEY
  // is left to sync.js's own publishable-key fallback, which the live products use.)
  window.SUPABASE_URL = SUPABASE_URL;

  function redirectToLogin() {
    const returnUrl = window.location.pathname + window.location.search;
    window.location.href = LOGIN_URL + '?return=' + encodeURIComponent(returnUrl);
  }

  const auth = {
    email:    null,
    userId:   null,
    session:  null,
    supabase: supabase,
    ready:    null,

    async signOut() {
      await supabase.auth.signOut();
      window.location.href = LOGIN_URL;
    },
  };

  auth.ready = (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        redirectToLogin();
        return;
      }

      auth.email   = session.user.email;
      auth.userId  = session.user.id;
      auth.session = session;

      localStorage.setItem('cl_auth', 'ok');
      localStorage.setItem('cl_email', session.user.email);

      supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_OUT') {
          redirectToLogin();
          return;
        }
        if (newSession) {
          auth.session = newSession;
        }
      });

      window.dispatchEvent(new CustomEvent('swedenAuthReady', { detail: auth }));

    } catch (err) {
      console.error('CivicAuth guard error:', err);
      redirectToLogin();
    }
  })();

  window.swedenAuth = auth;
})();
