(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  // 1. Local auth (PIN / password / reset)
  if (localStorage.getItem("cl_auth") === "ok") return;

  // 2. Supabase session (wait for hydration)
  try {
    if (window.supabase) {
      for (let i = 0; i < 10; i++) {
        const { data } = await window.supabase.auth.getSession();
        if (data?.session) return;
        await new Promise(r => setTimeout(r, 100));
      }
    }
  } catch (_) {}

  // 3. Compute login URL dynamically
  const base = location.origin;
  let loginPath = "/login.html";

  // Handle subfolder sites (e.g. /denmark/, /lux/)
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length > 0) {
    loginPath = `/${parts[0]}/login.html`;
  }

  location.replace(base + loginPath);
})();
