/* reset.js — CivicLearn full progress reset (universal)
   Clears BOTH Supabase user_sync rows AND localStorage,
   so sync.js cannot resurrect old data after the redirect.

   Works for all products — DK-specific keys are harmless
   no-ops on non-DK sites. */

(function () {
  var resetBtn = document.getElementById("resetAllFull");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", async function () {

    var confirmMessage =
      (window.i18n && typeof window.i18n.t === "function"
        ? window.i18n.t("reset_confirm_message")
        : null) ||
      "Are you sure you want to reset all your training data?";

    if (!window.confirm(confirmMessage)) return;

    // Disable button while working
    resetBtn.disabled = true;
    var originalText = resetBtn.textContent;
    resetBtn.textContent = "…";

    // 1. Wipe Supabase sync rows (bypass merge protection)
    var email = (localStorage.getItem("cl_email") || "").toLowerCase().trim();
    var site  = window.CIVIC_SITE_CODE || "unknown";

    if (email) {
      try {
        var endpoint = "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/sync";
        var apikey   = window.SUPABASE_KEY || "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

        var res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apikey,
          },
          body: JSON.stringify({ action: "reset", email: email, site: site }),
        });

        if (!res.ok) {
          console.warn("[Reset] Server reset failed:", res.status);
        } else {
          console.log("[Reset] Supabase sync rows deleted.");
        }
      } catch (err) {
        console.warn("[Reset] Server reset error (continuing anyway):", err.message);
      }
    }

    // 2. Clear all synced localStorage keys (superset across all products)
    localStorage.removeItem("civicedge_progress");
    localStorage.removeItem("civicedge_stats");
    localStorage.removeItem("civicedge_saved");
    localStorage.removeItem("civicedge_testDate");
    localStorage.removeItem("dk_active_phase");
    localStorage.removeItem("dk_phase2_unlocked");
    localStorage.removeItem("dk_phase1_progress");

    // 3. Clear the sync reload guard
    sessionStorage.removeItem("civicsync_loaded");

    // 4. Redirect to dashboard
    var parts = window.location.pathname.split("/").filter(Boolean);
    var root = parts.length > 0 ? parts[0] : "";
    var redirect = root ? "/" + root + "/dashboard/" : "/dashboard/";
    window.location.href = redirect;
  });
})();
