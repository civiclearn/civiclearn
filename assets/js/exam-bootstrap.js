/**
 * EXAM BOOTSTRAP + ENTITLEMENT GUARD
 * This is the new "Front Door" for your app.
 */
window.waitForSupabase = () => {
  return new Promise(resolve => {
    if (window.supabase) return resolve(window.supabase);
    const iv = setInterval(() => {
      if (window.supabase) { clearInterval(iv); resolve(window.supabase); }
    }, 50);
  });
};

(async () => {
  const supabase = await window.waitForSupabase();

  // 1. Identity Check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "/login.html"; // Root login
    return;
  }

  const email = session.user.email;
  const userId = session.user.id;

  // 2. Entitlement Check (RESTORED)
  // We use the direct Supabase Cloud Function call you had before
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
      // If the function says they aren't allowed, boot them
      localStorage.clear();
      window.location.href = "https://civiclearn.com/access_ended.html";
      return;
    }
  } catch (e) {
    // Fail-open: If the function is down, don't block the user
    console.warn("Entitlement check deferred");
  }

  // 3. Success: Set globals and let the page load
  window.__cl_uid = userId;
  window.dispatchEvent(new Event("exam:ready"));
})();