/**
 * CivicAuth — Auth Guard (Portugal)
 * ═══════════════════════════════════════════════════════════════
 * Include on every protected page.
 *
 * After loading, the global `portugalAuth` object is available:
 *   portugalAuth.email      — the logged-in user's email
 *   portugalAuth.userId     — the Supabase Auth user ID (UUID)
 *   portugalAuth.session    — the full session object
 *   portugalAuth.supabase   — the initialized Supabase client
 *   portugalAuth.signOut()  — logs out and redirects to login
 *   portugalAuth.ready      — Promise that resolves when auth check is complete
 */

(function () {
  'use strict';

  const SUPABASE_URL      = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';
  const LOGIN_URL         = '/portugal/login.html';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

      window.dispatchEvent(new CustomEvent('portugalAuthReady', { detail: auth }));

    } catch (err) {
      console.error('CivicAuth guard error:', err);
      redirectToLogin();
    }
  })();

  window.portugalAuth = auth;
})();
