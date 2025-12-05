// /assets/js/auth-guard.js
// Requires: supabase-init.js loaded BEFORE this file

// The window.supabase object will be ready by the time DOMContentLoaded fires
const supabase = window.supabase;

// Waits for Supabase to fully load the session
async function waitForSession() {
  // Use the global client object
  let { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  return new Promise((resolve) => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession) {
          // IMPORTANT: Unsubscribe immediately upon successful session
          listener.subscription.unsubscribe();
          resolve(newSession);
        }
      }
    );

    // Safety fallback: check again after 2 seconds
    // This is useful if the user refreshed the page while Supabase events were mid-flight.
    setTimeout(async () => {
      // Use the global client object
      let { data: { session } } = await supabase.auth.getSession();
      resolve(session);
    }, 2000);
  });
}

// 🌟 FIX: Wait for the DOM and all preceding scripts to load before running guard logic
document.addEventListener('DOMContentLoaded', async function enforceAuth() {
  // The global 'supabase' object is now guaranteed to exist
  const session = await waitForSession();

  if (!session) {
    // Extract country automatically from URL:
    // /romania/dashboard/ → "romania"
    const parts = window.location.pathname.split("/").filter(Boolean);
    const country = parts[0]; 

    // Use replace() to prevent the unauthorized page from being in the browser history
    window.location.replace(`/${country}/login.html${window.location.search}`);
    return;
  }
  // Logged in: script finishes, and the page content loads.
});