(function () {
  function getSupabaseClient() {
    // Product-agnostic discovery of the page's auth-guard Supabase client.
    //
    // The previous version used a hardcoded list of guard globals
    // (denmarkAuth, luxAuth, … rikAuth) and never included products added
    // afterwards — sweden, portugal, slovensko, kansalaisuuskoe, dele, etc.
    // On those pages it found nothing; the old window.supabase fallback was a
    // no-op (window.supabase is the library, not a client — it has no .auth),
    // so signOut() never ran, the session survived, and the login page bounced
    // the user straight back to the dashboard. This version finds ANY
    // window.<product>Auth guard exposing a real client, so it works for every
    // current and future clone with no edits.
    try {
      var keys = Object.keys(window).filter(function (k) { return /Auth$/.test(k); });
      for (var i = 0; i < keys.length; i++) {
        var g = window[keys[i]];
        if (g && g.supabase && g.supabase.auth && typeof g.supabase.auth.signOut === "function") {
          return g.supabase;
        }
      }
    } catch (e) { /* ignore */ }

    // Fallback: build a client from config globals if a guard isn't found.
    if (window.supabase && typeof window.supabase.createClient === "function"
        && window.SUPABASE_URL && window.SUPABASE_KEY) {
      try { return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY); }
      catch (e) { /* ignore */ }
    }
    return null;
  }

  function clearPersistedSession() {
    // Drop the persisted Supabase session token directly, so that even if
    // signOut() fails or no client is found, a live session can't survive the
    // redirect and re-authenticate the user back onto the dashboard.
    try {
      Object.keys(localStorage).forEach(function (k) {
        if (/^sb-.*-auth-token$/.test(k)) localStorage.removeItem(k);
      });
    } catch (e) { /* ignore */ }
  }

  function initLogout() {
    var link = document.getElementById("logoutLink");
    if (!link) return;

    link.addEventListener("click", async function (e) {
      e.preventDefault();

      try {
        var sb = getSupabaseClient();
        if (sb) await sb.auth.signOut();
      } catch (err) {
        console.warn("Supabase sign-out failed:", err);
      }

      // Clear local auth state
      localStorage.removeItem("cl_auth");
      localStorage.removeItem("cl_login_at");
      localStorage.removeItem("cl_email");
      localStorage.removeItem("cl_bundle");
      clearPersistedSession();

      // Redirect to country login page
      var path = window.location.pathname;
      var parts = path.split("/").filter(Boolean);
      var country = parts.length > 0 ? parts[0] : "";
      var loginUrl = country ? "/" + country + "/login.html" : "/login.html";

      window.location.href = loginUrl;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogout);
  } else {
    initLogout();
  }
})();
