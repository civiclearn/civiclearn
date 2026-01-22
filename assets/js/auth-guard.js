(async () => {
  // 1. Safety Checks: Skip for local dev or login pages
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;
  
  // 2. Identify the user
  let email = localStorage.getItem("cl_email");
  
  // If email is missing from localStorage, try to recover it from the Supabase session
  if (!email && window.supabase) {
    try {
      const { data } = await window.supabase.auth.getSession();
      email = data?.session?.user?.email;
      if (email) {
        localStorage.setItem("cl_email", email);
      }
    } catch (_) {}
  }

  // 3. 🔒 Remote entitlement check
  // We MUST wait for this result before moving to the local auth checks
  if (email) {
    try {
      const res = await fetch(
        "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase() })
        }
      );

      if (res.ok) {
        const { allowed } = await res.json();
        // ONLY redirect if the response explicitly tells us access is denied (allowed === false)
        if (allowed === false) {
          localStorage.removeItem("cl_auth");
          localStorage.removeItem("cl_email");
          location.replace("https://civiclearn.com/access_ended.html");
          return; // Kill the script here
        }
      }
    } catch (err) {
      // FAIL-OPEN: If the Edge Function is down or network fails, let the user stay in.
      console.warn("Entitlement server unreachable. Defaulting to allow access.");
    }
  }

  // 4. Local auth validation ('cl_auth' is set during successful login)
  if (localStorage.getItem("cl_auth") === "ok") return;

  // 5. Supabase session hydration
  // Give the Supabase client a moment to restore the session from cookies/storage
  try {
    if (window.supabase) {
      for (let i = 0; i < 10; i++) {
        const { data } = await window.supabase.auth.getSession();
        if (data?.session) {
          // If a session exists, sync our local flags and stay on the page
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

  // 6. Final Redirect: If no valid session or auth flag is found, go to login
  const base = location.origin;
  let loginPath = "/login.html";
  
  // Dynamic path handling for subfolders (e.g., /geneva/ or /lux/)
  const parts = location.pathname.split("/").filter(Boolean);
  if (parts.length > 0) {
    loginPath = `/${parts[0]}/login.html`;
  }

  location.replace(base + loginPath);
})();