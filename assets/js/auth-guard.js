// /assets/js/auth-guard.js

// Ensures Supabase is ready before anything runs
function waitForSupabase() {
  return new Promise(resolve => {
    const check = () => {
      if (window.supabase) resolve(window.supabase);
      else setTimeout(check, 20);
    };
    check();
  });
}

// Session fetch that works even under slow refresh or mid-transition
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

    // Safety fallback — avoids ghost refresh issues
    setTimeout(async () => {
      let { data: { session } } = await supabase.auth.getSession();
      resolve(session || null);
    }, 2000);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const supabase = await waitForSupabase();
  const session = await waitForSession(supabase);

  if (!session) {
const parts = window.location.pathname.split("/").filter(Boolean);

// supports /france/cr/, /france/csp/, /denmark-pr/, /canadafr/, etc.
const base =
  parts.length >= 2 && parts[1].length <= 3
    ? `/${parts[0]}/${parts[1]}`
    : `/${parts[0]}`;

window.location.replace(`${base}/login.html${window.location.search}`);

    return;
  }
});
