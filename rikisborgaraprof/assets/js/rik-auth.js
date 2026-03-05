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
 *   <script src="/rikisborgaraprof/assets/js/rik-auth.js"></script>
 *
 * After loading, the global `rikAuth` object is available:
 *   rikAuth.email      — the logged-in user's email
 *   rikAuth.userId     — the Supabase Auth user ID (UUID)
 *   rikAuth.session    — the full session object
 *   rikAuth.supabase   — the initialized Supabase client
 *   rikAuth.signOut()  — logs out and redirects to login
 *   rikAuth.ready      — Promise that resolves when auth check is complete
 */

(function () {
  'use strict';

  const SUPABASE_URL      = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';
  const LOGIN_URL         = '/rikisborgaraprof/login.html';

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

      supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'SIGNED_OUT' || !newSession) {
          window.location.href = LOGIN_URL;
        }
        if (newSession) {
          auth.session = newSession;
        }
      });

      window.dispatchEvent(new CustomEvent('rikAuthReady', { detail: auth }));

    } catch (err) {
      console.error('CivicAuth guard error:', err);
      window.location.href = LOGIN_URL;
    }
  })();

  window.rikAuth = auth;
})();
