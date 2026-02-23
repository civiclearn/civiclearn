(async () => {
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;

  if (localStorage.getItem("cl_auth") !== "ok") {
    const parts = location.pathname.split("/").filter(Boolean);
    const loginPath = parts.length > 0 ? `/${parts[0]}/login.html` : "/login.html";
    location.replace(loginPath);
    return;
  }

  const email = localStorage.getItem("cl_email");
  if (!email) return;

  // Use window.SUPABASE_KEY if available, otherwise use hardcoded key
  const supabaseKey = window.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0Z2xpb2tla2Vhb3ZkaWFmcmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NTcxMzMsImV4cCI6MjA3OTEzMzEzM30.nGWQn8GJn7aJct3Fu36p63NQvCqnifiPYQnF8QJKLYs";

  try {
    const res = await fetch(
      "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey
        },
        body: JSON.stringify({ email: email.toLowerCase() })
      }
    );

    if (!res.ok) return;

    const data = await res.json();

    // Store bundle status for dashboard banner
    if (data.bundle) {
      localStorage.setItem("cl_bundle", data.bundle);
    } else {
      localStorage.removeItem("cl_bundle");
    }

    if (data.allowed === false) {
      localStorage.removeItem("cl_auth");
      localStorage.removeItem("cl_login_at");
      localStorage.removeItem("cl_email");
      localStorage.removeItem("cl_bundle");
      location.replace("https://civiclearn.com/access_ended.html");
    }
  } catch (_) {
    // fail-open
  }
})();
