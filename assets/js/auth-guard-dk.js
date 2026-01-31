(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  /* ─────────────────────────────────────────────
     0. Sanity check – repair corrupted auth state
     cl_auth === "ok" MUST imply cl_email exists
     ───────────────────────────────────────────── */
  const auth = localStorage.getItem("cl_auth");
  const email = localStorage.getItem("cl_email");

  if (
    (auth === "ok" && !email) ||
    (auth !== "ok" && email)
  ) {
    localStorage.removeItem("cl_auth");
    localStorage.removeItem("cl_email");
    localStorage.removeItem("cl_login_at");
  }

  /* ─────────────────────────────────────────────
     1. Must be locally authenticated
     ───────────────────────────────────────────── */
  if (localStorage.getItem("cl_auth") !== "ok") {
    location.replace("/denmark/login.html");
    return;
  }

  /* ─────────────────────────────────────────────
     2. Must have identity
     (fail-open but now only for valid states)
     ───────────────────────────────────────────── */
  const verifiedEmail = localStorage.getItem("cl_email");
  if (!verifiedEmail) return;

  /* ─────────────────────────────────────────────
     3. Entitlement check (refund enforcement)
     ───────────────────────────────────────────── */
  try {
    const res = await fetch(
      "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": window.SUPABASE_KEY
        },
        body: JSON.stringify({ email: verifiedEmail.toLowerCase() })
      }
    );

    if (!res.ok) return;

    const { allowed } = await res.json();

    if (allowed === false) {
      localStorage.removeItem("cl_auth");
      localStorage.removeItem("cl_login_at");
      localStorage.removeItem("cl_email");
      location.replace("https://civiclearn.com/access_ended.html");
    }
  } catch (_) {
    // fail-open
  }
})();
