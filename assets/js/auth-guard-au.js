(async () => {
  // Skip local dev and login pages
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  /* ===============================
     0. REVOCATION CUTOFF (AU TEST)
     =============================== */
  const REVOKE_AFTER = Date.now(); // AU-only, testing enabled

  /* ===============================
     1. BASIC AUTH CHECK
     =============================== */
  if (localStorage.getItem("cl_auth") !== "ok") {
    location.replace("/australia/login.html");
    return;
  }

  /* ===============================
     2. GET EMAIL (ONLY IF AVAILABLE)
     =============================== */
  let email = null;

  try {
    if (window.supabase) {
      const { data } = await window.supabase.auth.getSession();
      email = data?.session?.user?.email || null;
    }
  } catch (_) {}

  // No email → cannot enforce → ALLOW
  if (!email) return;

  /* ===============================
     3. SESSION TIME GUARD
     =============================== */
  const loginAtRaw = localStorage.getItem("cl_login_at");
  const loginAt = loginAtRaw ? Number(loginAtRaw) : null;

  // Missing / invalid timestamp → ALLOW
  if (!loginAt || Number.isNaN(loginAt)) return;

  // Session newer than cutoff → ALLOW
  if (loginAt >= REVOKE_AFTER) return;

  /* ===============================
     4. ENTITLEMENT CHECK (FAIL-OPEN)
     =============================== */
  try {
    // SUPABASE_KEY may be undefined on some pages — intentional
    const res = await fetch(
      "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SUPABASE_KEY
        },
        body: JSON.stringify({ email: email.toLowerCase() })
      }
    );

    // Any non-200 → ALLOW
    if (!res.ok) return;

    const { allowed } = await res.json();

    // 🔒 ONLY denial condition
    if (allowed === false) {
      localStorage.removeItem("cl_auth");
      location.replace("https://civiclearn.com/access_ended.html");
    }
  } catch (_) {
    // fail-open: do nothing
  }
})();
