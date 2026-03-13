/**
 * CivicAuth — Auth Guard
 * ═══════════════════════════════════════════════════════════════
 * Include on every protected page. Checks for a valid Supabase Auth
 * session and redirects to login if none exists.
 *
 * Pattern: CivicAuth (standard across all CivicLearn products)
 *
 * Usage in HTML:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="/celpe/assets/js/celpe-auth.js"></script>
 *
 * After loading, the global `celpeAuth` object is available:
 *   celpeAuth.email      — the logged-in user's email
 *   celpeAuth.userId     — the Supabase Auth user ID (UUID)
 *   celpeAuth.session    — the full session object
 *   celpeAuth.supabase   — the initialized Supabase client
 *   celpeAuth.signOut()  — logs out and redirects to login
 *   celpeAuth.ready      — Promise that resolves when auth check is complete
 */

(function () {
  'use strict';

  const SUPABASE_URL      = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';
  const LOGIN_URL         = '/celpe/login.html';

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

      supabase.auth.onAuthStateChange((event, newSession) => {
        // Only redirect on an explicit sign-out event.
        // Do NOT act on !newSession alone — Supabase can fire TOKEN_REFRESHED
        // with a briefly-null session, which would cause spurious logouts and
        // lose the user's current page.
        if (event === 'SIGNED_OUT') {
          redirectToLogin();
          return;
        }
        if (newSession) {
          auth.session = newSession;
        }
      });

      window.dispatchEvent(new CustomEvent('celpeAuthReady', { detail: auth }));

    } catch (err) {
      console.error('CivicAuth guard error:', err);
      redirectToLogin();
    }
  })();

  window.celpeAuth = auth;
})();
