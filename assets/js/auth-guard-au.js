(() => {
  if (location.hostname === "localhost") return;

  // ⛔ Do NOT guard the login page
  if (location.pathname.includes("/login")) return;

  const ok = localStorage.getItem("cl_auth");
  const email = localStorage.getItem("cl_email");

  if (ok !== "ok" || !email) {
    location.replace("/australia/login.html");
  }
})();