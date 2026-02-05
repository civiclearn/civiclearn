// /assets/js/supabase-bootstrap.js

// ---- Supabase project config ----
window.SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
window.SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

// ---- Load Supabase UMD + create client ----
(function bootstrapSupabase() {

  // Avoid double-loading
  if (window.supabase && window.supabase.auth) return;

  const script = document.createElement("script");
  script.src =
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.7.1/dist/umd/supabase.js";

  script.onload = () => {
    window.supabase = supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_KEY
    );
  };

  document.head.appendChild(script);

})();
