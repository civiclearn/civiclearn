/**
 * PD3 Auth Guard
 * Include this script on every protected PD3 page.
 * It checks for a valid Supabase Auth session and redirects to login if none exists.
 *
 * Usage in HTML:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="pd3-auth.js"></script>
 *
 * After loading, the global `pd3Auth` object is available:
 *   pd3Auth.email    — the logged-in user's email
 *   pd3Auth.userId   — the Supabase Auth user ID (UUID)
 *   pd3Auth.session   — the full session object
 *   pd3Auth.supabase  — the initialized Supabase client
 *   pd3Auth.signOut()  — logs out and redirects to login
 *   pd3Auth.ready      — Promise that resolves when auth check is complete
 */

(function () {
  'use strict';

  const SUPABASE_URL = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';
  const LOGIN_URL = '/dansk3/login.html';

  // Initialize Supabase client
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  function redirectToLogin() {
    const returnUrl = window.location.pathname + window.location.search;
    window.location.href = LOGIN_URL + '?return=' + encodeURIComponent(returnUrl);
  }

  const auth = {
    email: null,
    userId: null,
    session: null,
    supabase: supabase,
    ready: null,

    async signOut() {
      await supabase.auth.signOut();
      window.location.href = LOGIN_URL;
    },
  };

  // Check session immediately
  auth.ready = (async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        // No valid session — redirect to login
        redirectToLogin();
        return;
      }

      auth.email = session.user.email;
      auth.userId = session.user.id;
      auth.session = session;

      // Listen for auth state changes (e.g., token refresh, sign out)
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

      // Dispatch a custom event so pages can react when auth is ready
      window.dispatchEvent(new CustomEvent('pd3AuthReady', { detail: auth }));

    } catch (err) {
      console.error('PD3 Auth error:', err);
      redirectToLogin();
    }
  })();

  // Expose globally
  window.pd3Auth = auth;
})();
