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

      const path = window.location.pathname;
      const parts = path.split("/").filter(Boolean);
      const countryBase = parts.length > 0 ? `/${parts[0]}/` : "/";
      window.location.href = countryBase;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogout);
  } else {
    initLogout();
  }
})();