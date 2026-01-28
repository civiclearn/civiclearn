(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  // 1. Must be locally authenticated
  if (localStorage.getItem("cl_auth") !== "ok") {
    location.replace("/denmark/login.html");
    return;
  }

  // 2. Must have identity
  const email = localStorage.getItem("cl_email");
  if (!email) return; // fail-open

  // 3. Entitlement check (refund enforcement)
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
