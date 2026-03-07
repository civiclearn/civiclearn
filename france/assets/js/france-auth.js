/**
 * CivicAuth — Auth Guard (Examen civique France)
 *
 * Shared by both CR and CSP dashboard pages.
 * Redirects to /france/login.html with return URL if not authenticated.
 *
 * Usage in HTML:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="/france/assets/js/france-auth.js"></script>
 *
 * Global: franceAuth { email, userId, session, supabase, signOut(), ready }
 */

(function () {
  'use strict';

  const SUPABASE_URL      = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';
  const LOGIN_URL         = '/france/login.html';

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

      // Backward compatibility: old engine code checks localStorage
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

      window.dispatchEvent(new CustomEvent('franceAuthReady', { detail: auth }));

    } catch (err) {
      console.error('CivicAuth guard error:', err);
      window.location.href = LOGIN_URL;
    }
  })();

  window.franceAuth = auth;
})();
