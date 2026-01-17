(async () => {
  // Allow local dev
  if (location.hostname === "localhost") return;

  // Never guard the login page itself
  if (location.pathname.includes("/login")) return;

  /* ---------------------------------
     1. PIN-based access (backup path)
     --------------------------------- */
  const pinAuth = localStorage.getItem("cl_auth");
  const pinEmail = localStorage.getItem("cl_email");

  if (pinAuth === "ok" && pinEmail) {
    // PIN login is valid → allow access
    return;
  }

  /* ---------------------------------
     2. Supabase session (primary path)
     --------------------------------- */
  try {
    if (window.supabase) {
      const { data } = await window.supabase.auth.getSession();

      if (data && data.session) {
        // Normal auth session exists → allow access
        return;
      }
    }
  } catch (e) {
    // Ignore and fall through to redirect
  }

  /* ---------------------------------
     3. Nothing worked → redirect
     --------------------------------- */
  location.replace("/australia/login.html");
})();
