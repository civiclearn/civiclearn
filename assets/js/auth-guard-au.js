(() => {
  if (location.hostname === "localhost") return;

  // Never guard the login page
  if (location.pathname.includes("/login")) return;

  const ok = localStorage.getItem("cl_auth");
  const email = localStorage.getItem("cl_email");
  if (ok !== "ok" || !email) {
    location.replace("/australia/login.html");
    return;
  }

  // Optional expiry window check (UTC hour-based)
  // If you don't want expiry, delete this block.
  const pinWindow = localStorage.getItem("cl_pin_window");
  if (!pinWindow) return;

  function utcDayOfYear(d) {
    const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
    return Math.floor((d.getTime() - start.getTime()) / 86400000);
  }

  const now = new Date();
  const currentWindow = `${now.getUTCFullYear()}-${utcDayOfYear(now)}-${now.getUTCHours()}`;

  if (pinWindow !== currentWindow) {
    localStorage.removeItem("cl_auth");
    location.replace("/australia/login.html");
  }
})();
