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

      // Do NOT clear progress here
      window.location.href = "https://civiclearn.com/";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogout);
  } else {
    initLogout();
  }
})();
