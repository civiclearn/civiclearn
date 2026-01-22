(async () => {
  // 1. Safety Checks: Skip for local dev or login pages
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;
  
  // 2. Identify the user
  let email = localStorage.getItem("cl_email");
  
  // Fallback: Check Supabase session if localStorage is empty
  if (!email && window.supabase) {
    try (async () => {
  if (location.hostname === "localhost" || location.pathname.includes("/login")) return;

  let email = localStorage.getItem("cl_email");

  // Remote check
  if (email) {
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

      const { allowed } = await res.json();
      if (allowed === false) {
        localStorage.removeItem("cl_auth");
        location.replace("https://civiclearn.com/access_ended.html");
        return;
      }
    } catch (err) {
      console.warn("Entitlement check skipped.");
    }
  }

  // Standard Login Check
  if (localStorage.getItem("cl_auth") !== "ok") {
    const parts = location.pathname.split("/").filter(Boolean);
    const loginPath = parts.length > 0 ? `/${parts[0]}/login.html` : "/login.html";
    location.replace(location.origin + loginPath);
  }
})();
      const { data } = await window.supabase.auth.getSession();
      email = data?.session?.user?.email;
      if (email) localStorage.setItem("cl_email", email);
    } catch (_) {}
  }

  // 3. 🔒 Remote entitlement check
  if (email) {
    try {
      const res = await fetch(
        "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
        {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "apikey": window.SUPABASE_KEY // Identified from login.html
          },
          body: JSON.stringify({ email: email.toLowerCase() })
        }
      );

      if (res.ok) {
        const { allowed } = await res.json();
        if (allowed === false) {
          localStorage.removeItem("cl_auth");
          localStorage.removeItem("cl_email");
          location.replace("https://civiclearn.com/access_ended.html");
          return; 
        }
      }
    } catch (err) {
      console.warn("Entitlement check unreachable. Defaulting to allow access.");
    }
  }

  // 4. Local auth validation
  if (localStorage.getItem("cl_auth") === "ok") return;

  // 5. Supabase session hydration
  try {
    if (window.supabase) {
      for (let i = 0; i < 10; i++) {
        const { data } = await window.supabase.auth.getSession();
        if (data?.session) {
          localStorage.setItem("cl_auth", "ok");
          if (data.session.user.email) {
            localStorage.setItem("cl_email", data.session.user.email);
          }
          return;
        }
        await new Promise(r => setTimeout(r, 100));
      }
    }
  } catch (_) {}

  // 6. Final Redirect to Login
  const base = location.origin;
  let loginPath = "/login.html";
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length > 0) {
    loginPath = `/${parts[0]}/login.html`;
  }

  location.replace(base + loginPath);
})();