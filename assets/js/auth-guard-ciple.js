(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  // 1. Canonical CivicLearn check
  if (localStorage.getItem("cl_auth") !== "ok") {
    location.replace("/ciple/login.html");
    return;
  }

  // 2. Ensure Supabase client exists
  function waitForSupabase() {
    return new Promise(resolve => {
      if (window.supabase) return resolve(window.supabase);
      const iv = setInterval(() => {
        if (window.supabase) {
          clearInterval(iv);
          resolve(window.supabase);
        }
      }, 0);
    });
  }

  const supabase = await waitForSupabase();

  // 3. HARD SYNC POINT: session must exist
  const { data } = await supabase.auth.getSession();

  if (!data?.session?.user) {
    // Session is missing → system is inconsistent → reset ONCE
    localStorage.removeItem("cl_auth");
    localStorage.removeItem("cl_email");
    localStorage.removeItem("cl_login_at");
    location.replace("/ciple/login.html");
    return;
  }

  // 4. Entitlement check (unchanged)
  try {
    const email = data.session.user.email;
    if (!email) return;

    const res = await fetch(
      "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
      {
        method: "POST",
       headers: {
  "Content-Type": "application/json",
  "apikey": "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp"
},
        body: JSON.stringify({ email: email.toLowerCase() })
      }
    );

    if (!res.ok) return;

    const { allowed } = await res.json();
    if (allowed === false) {
      localStorage.removeItem("cl_auth");
      localStorage.removeItem("cl_email");
      localStorage.removeItem("cl_login_at");
      location.replace("https://civiclearn.com/access_ended.html");
    }
  } catch {
    // fail-open
  }
})();
