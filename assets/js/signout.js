(function () {
  function getSupabaseClient() {
    // Try all known auth guard globals
    var guards = [
      'denmarkAuth', 'denmarkprAuth', 'sproochentestAuth', 'luxAuth',
      'austriaAuth', 'ykisvenskaAuth', 'ykifinnishAuth', 'cipleAuth',
      'franceAuth', 'genevaAuth', 'celpeAuth', 'pd3Auth', 'rikAuth'
    ];
    for (var i = 0; i < guards.length; i++) {
      var g = window[guards[i]];
      if (g && g.supabase && g.supabase.auth) return g.supabase;
    }
    // Fallback: old-style window.supabase client (has auth.signOut)
    if (window.supabase && window.supabase.auth && typeof window.supabase.auth.signOut === 'function') {
      return window.supabase;
    }
    return null;
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
