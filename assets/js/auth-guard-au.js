(() => {
  if (location.hostname === "localhost") return;

  const ok = localStorage.getItem("cl_auth");
  const email = localStorage.getItem("cl_email");

  if (ok !== "ok" || !email) {
    location.replace("/australia/login.html");
  }
})();
