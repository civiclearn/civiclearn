(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;
  
/*
// 🔒 Remote entitlement check (global, email-based)
(async () => {
  try {
    const email = localStorage.getItem("cl_email");
    if (!email) return;

    const res = await fetch(
      "https://YOUR_PROJECT_ID.supabase.co/functions/v1/entitlement-check",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      }
    );

    const { allowed } = await res.json();

    if (!allowed) {
      localStorage.removeItem("cl_auth");
      location.replace("https://civiclearn.com/access-ended.html");
    }
  } catch (_) {}
})();
*/

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
