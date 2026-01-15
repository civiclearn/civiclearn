(function () {
  const resetBtn = document.getElementById("resetAllFull");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {

    // ------------------------------------------------------------------
    // 1. i18n-friendly confirmation text
    // ------------------------------------------------------------------
    const confirmMessage =
      (window.i18n && typeof window.i18n.t === "function"
        ? window.i18n.t("reset_confirm_message")
        : null) ||
      "Are you sure you want to reset all your training data?";

    if (!window.confirm(confirmMessage)) return;

    // ------------------------------------------------------------------
    // 2. Clear all CivicLearn training keys
    // ------------------------------------------------------------------
    localStorage.removeItem("civicedge_progress");
    localStorage.removeItem("civicedge_stats");
    localStorage.removeItem("civicedge_testDate");


    // Optional but recommended:
    // localStorage.removeItem("civicedge_fontSize");
    // localStorage.removeItem("civicedge_theme");

    // ------------------------------------------------------------------
    // 3. Universal redirect:
    // Detect the root folder ("canadafr", "denmark-pr", etc.)
    // ------------------------------------------------------------------
 // ------------------------------------------------------------------
// 3. France-specific redirect (CR vs CSP)
// ------------------------------------------------------------------
const path = window.location.pathname;

// Detect product from URL
let redirect;

if (path.includes("/france/cr/")) {
  redirect = "/france/cr/dashboard/";
} else if (path.includes("/france/csp/")) {
  redirect = "/france/csp/dashboard/";
} else {
  // Safety fallback (should never happen)
  redirect = "/france/";
}

// ------------------------------------------------------------------
// 4. Redirect to correct dashboard
// ------------------------------------------------------------------
window.location.href = redirect;

  });
})();
