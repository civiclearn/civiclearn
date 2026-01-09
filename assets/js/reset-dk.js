(function () {
  const resetBtn = document.getElementById("resetAllFull");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {

    const confirmMessage =
      (window.i18n && typeof window.i18n.t === "function"
        ? window.i18n.t("reset_confirm_message")
        : null) ||
      "Er du sikker på, at du vil nulstille alle dine træningsdata?";

    if (!window.confirm(confirmMessage)) return;

    // Core learning state (DK)
    localStorage.removeItem("civicedge_progress");
    localStorage.removeItem("civicedge_stats");
    localStorage.removeItem("civicedge_testDate");
    localStorage.removeItem("civicedge_saved"); // My List

    const parts = window.location.pathname.split("/").filter(Boolean);
    const root = parts.length > 0 ? parts[0] : "";

    const redirect = root ? `/${root}/dashboard/` : "/dashboard/";
    window.location.href = redirect;
  });
})();

