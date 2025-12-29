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

      // 1. Get the current path (e.g., /australia/dashboard/index.html)
      const path = window.location.pathname;
      
      // 2. Extract the country part (the first folder name)
      // This splits "/australia/dashboard/" into ["australia", "dashboard"]
      const parts = path.split("/").filter(Boolean);
      
      // 3. Determine the redirect base
      // If we are in a subfolder like /australia/, redirect there. 
      // If we are at the root, redirect to /
      const countryBase = parts.length > 0 ? `/${parts[0]}/` : "/";

      // 4. Perform the redirect
      window.location.href = countryBase;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLogout);
  } else {
    initLogout();
  }
})();