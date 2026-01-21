(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  // 1. Local auth (PIN or password)
  if (localStorage.getItem("cl_auth") === "ok") return;

  // 2. Supabase session (wait briefly for init / hydration)
  try {
    if (window.supabase) {
      for (let i = 0; i < 10; i++) {
        const { data } = await window.supabase.auth.getSession();
        if (data?.session) return;
        await new Promise(r => setTimeout(r, 100));
      }
    }
  } catch (_) {}

  // 3. Redirect only after auth truly absent
  location.replace("/denmark-pr/login.html");
})();
