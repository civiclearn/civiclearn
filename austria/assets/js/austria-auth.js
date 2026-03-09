/**
 * CivicAuth — Auth Guard (Austria)
 * ═══════════════════════════════════════════════════════════════
 * Include on every protected page. Checks for a valid Supabase Auth
 * session and redirects to login if none exists.
 *
 * Usage in HTML:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="/austria/assets/js/austria-auth.js"></script>
 *
 * After loading, the global `austriaAuth` object is available:
 *   austriaAuth.email      — the logged-in user's email
 *   austriaAuth.userId     — the Supabase Auth user ID (UUID)
 *   austriaAuth.session    — the full session object
 *   austriaAuth.supabase   — the initialized Supabase client
 *   austriaAuth.signOut()  — logs out and redirects to login
 *   austriaAuth.ready      — Promise that resolves when auth check is complete
 */

(function () {
  'use strict';

  const SUPABASE_URL      = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';
  const LOGIN_URL         = '/austria/login.html';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
        const returnUrl = window.location.pathname + window.location.search;
        window.location.href = LOGIN_URL + '?return=' + encodeURIComponent(returnUrl);
        return;
      }

      auth.email   = session.user.email;
      auth.userId  = session.user.id;
      auth.session = session;

      // Backward compatibility: old engine code checks localStorage for cl_email
      localStorage.setItem('cl_auth', 'ok');
      localStorage.setItem('cl_email', session.user.email);

      supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_OUT' || !newSession) {
          window.location.href = LOGIN_URL;
        }
        if (newSession) {
          auth.session = newSession;
        }
      });

      window.dispatchEvent(new CustomEvent('austriaAuthReady', { detail: auth }));

    } catch (err) {
      console.error('CivicAuth guard error:', err);
      window.location.href = LOGIN_URL;
    }
  })();

  window.austriaAuth = auth;
})();
