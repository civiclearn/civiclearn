(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  // 1. PIN fallback
  if (
    localStorage.getItem("cl_auth") === "ok" &&
    localStorage.getItem("cl_email")
  ) {
    return;
  }

  // 2. Supabase session
  try {
    if (window.supabase) {
      const { data } = await window.supabase.auth.getSession();
      if (data && data.session) return;
    }
  } catch (_) {}

  // 3. Redirect to DK login
  location.replace("/denmark/login.html");
})();
