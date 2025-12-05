import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
const SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function waitForSession() {
  let { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  return new Promise((resolve) => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) resolve(session);
    });

    setTimeout(async () => {
      let { data: { session } } = await supabase.auth.getSession();
      resolve(session);
    }, 2000);
  });
}

(async function enforceAuth() {
  const session = await waitForSession();

  // Not logged in → redirect to this country’s login page
  if (!session) {
    const parts = window.location.pathname.split("/");
    const country = parts[1]; // e.g. "romania"
    window.location.href = `/${country}/login.html${window.location.search}`;
    return;
  }

  // Logged-in → allow access
})();
