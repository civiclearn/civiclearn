(async () => {
  // Skip local dev and login pages
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  /* ===============================
     1. BASIC AUTH CHECK
     =============================== */
  if (localStorage.getItem("cl_auth") !== "ok") {
    location.replace("/australia/login.html");
    return;
  }

  /* ===============================
     2. GET DECLARED EMAIL (BUSINESS IDENTITY)
     =============================== */
  const email = localStorage.getItem("cl_email");

  // No email → cannot evaluate → allow (fail-open)
  if (!email) return;

  /* ===============================
     3. DENY-LIST CHECK (FAIL-OPEN)
     =============================== */
  try {
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

    // Any error → allow
    if (!res.ok) return;

    const { allowed } = await res.json();

    /* ===============================
       4. ONLY DENIAL CONDITION
       =============================== */
    if (allowed === false) {
      // Clear local auth completely
      localStorage.removeItem("cl_auth");
      localStorage.removeItem("cl_login_at");
      localStorage.removeItem("cl_email");

      // Hard stop
      location.replace("https://civiclearn.com/access_ended.html");
    }
  } catch (_) {
    // fail-open
  }
})();
