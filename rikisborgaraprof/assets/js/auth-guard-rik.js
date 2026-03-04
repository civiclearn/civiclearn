/**
 * auth-guard-rik.js
 * Included in the <head> of every protected RIK page.
 * Redirects to login if no valid session is found.
 * Mirrors the auth-guard pattern used across all CivicLearn platforms.
 */
(function () {
  'use strict';

  const LOGIN_URL    = '/rikisborgaraprof/login.html';
  const DASHBOARD_URL = '/rikisborgaraprof/index.html';
  const ACCESS_PATH  = '/rikisborgaraprof/dashboard';

  const SUPABASE_URL = 'https://htgliokekeaovdiafrgs.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs';

  function getSession() {
    try {
      const email = localStorage.getItem('cl_email');
      const token = localStorage.getItem('cl_token');
      return email && token ? { email, token } : null;
    } catch (e) { return null; }
  }

  function redirectToLogin() {
    const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.replace(LOGIN_URL + '?return=' + returnUrl);
  }

  async function verifyAccess(email, token) {
    try {
      // Check entitlement via Supabase users table
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=access_path`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || data.length === 0) return false;

      const ap = data[0].access_path || '';
      return ap === ACCESS_PATH || ap.startsWith('/rikisborgaraprof');
    } catch (e) {
      // On network error, allow through — don't lock out users
      return true;
    }
  }

  const session = getSession();
  if (!session) {
    redirectToLogin();
  } else {
    // Expose email globally for pages that need it
    window.CL_EMAIL = session.email;
    window.CL_TOKEN = session.token;

    // Background access check — redirect if no entitlement
    verifyAccess(session.email, session.token).then(function (ok) {
      if (!ok) {
        localStorage.removeItem('cl_email');
        localStorage.removeItem('cl_token');
        redirectToLogin();
      }
    });
  }
})();
