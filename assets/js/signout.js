(function () {
  function initLogout() {
    const link = document.getElementById("logoutLink");
    if (!link) return;

    link.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        if (window.supabase?.auth) {
          await supabase.auth.signOut();
        }
      } catch (err) {
        console.warn("Supabase sign-out failed:", err);
      }

      // 🔒 Clear local auth state
      localStorage.removeItem("cl_auth");
      localStorage.removeItem("cl_login_at");
      localStorage.removeItem("cl_email");

      // Redirect to country login page
      const path = window.location.pathname;
      const parts = path.split("/").filter(Boolean);
      const country = parts.length > 0 ? parts[0] : "";
      const loginUrl = country ? `/${country}/login.html` : "/login.html";

      window.location.href = loginUrl;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogout);
  } else {
    initLogout();
  }
})();
