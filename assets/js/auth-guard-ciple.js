(async () => {
  // 1. Skip if local or already on login
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login.html")) return;

  // 2. Check login status FIRST (No dependencies)
  const isLoggedIn = localStorage.getItem("cl_auth") === "ok";
  if (!isLoggedIn) {
    location.replace("/ciple/login.html");
    return;
  }

  const email = localStorage.getItem("cl_email");
  if (!email) return;

  // 3. Use the keys directly to avoid waiting for bootstrap
  const G_URL = "https://htgliokekeaovdiafrgs.supabase.co";
  const G_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

  try {
    const res = await fetch(`${G_URL}/functions/v1/entitlement-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": G_KEY
      },
      body: JSON.stringify({ email: email.toLowerCase() })
    });

    const data = await res.json();
    if (data && data.allowed === false) {
      localStorage.clear();
      location.replace("https://civiclearn.com/access_ended.html");
    }
  } catch (e) {
    // Fail-open: if the network is slow, let the dashboard try to load
    console.warn("Auth check deferred");
  }
})();