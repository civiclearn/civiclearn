// /assets/js/auth-guard.js
// Requires: supabase-init.js loaded BEFORE this file

const supabase = window.supabase;

// Waits for Supabase to fully load the session
async function waitForSession() {
  let { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  return new Promise((resolve) => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession) {
          listener.subscription.unsubscribe();
          resolve(newSession);
        }
      }
    );

    // Safety fallback: check again after 2 seconds
    setTimeout(async () => {
      let { data: { session } } = await supabase.auth.getSession();
      resolve(session);
    }, 2000);
  });
}

(async function enforceAuth() {
  const session = await waitForSession();

  if (!session) {
    // Extract country automatically from URL:
    // /romania/dashboard/ → "romania"
    const parts = window.location.pathname.split("/").filter(Boolean);
    const country = parts[0]; 

    window.location.replace(`/${country}/login.html${window.location.search}`);
    return;
  }
})();
