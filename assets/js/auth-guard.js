// /assets/js/auth-guard.js

// Ensure supabase is ready even if scripts load slowly
function waitForSupabase() {
  return new Promise(resolve => {
    const check = () => {
      if (window.supabase) resolve(window.supabase);
      else setTimeout(check, 30); // retry quickly
    };
    check();
  });
}

async function waitForSession(supabase) {
  let { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  return new Promise(resolve => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (newSession) {
          listener.subscription.unsubscribe();
          resolve(newSession);
        }
      }
    );

    setTimeout(async () => {
      let { data: { session } } = await supabase.auth.getSession();
      resolve(session);
    }, 2000);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = await waitForSupabase();
  const session = await waitForSession(supabase);

  if (!session) {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const country = parts[0];
    window.location.replace(`/${country}/login.html${window.location.search}`);
    return;
  }
});
