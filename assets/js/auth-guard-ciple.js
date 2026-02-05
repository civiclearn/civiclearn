(async () => {
  // Allow localhost and login page
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  // Wait for Supabase
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

  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user) {
    location.replace("/ciple/login.html");
    return;
  }

  // Optional: entitlement check (KEEP fail-open)
  try {
    const res = await fetch(
      "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp"
        },
        body: JSON.stringify({ email: session.user.email.toLowerCase() })
      }
    );

    const data = await res.json();
    if (data?.allowed === false) {
      await supabase.auth.signOut();
      location.replace("https://civiclearn.com/access_ended.html");
    }
  } catch {
    // fail-open
  }
})();
