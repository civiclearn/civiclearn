(function () {
  const resetBtn = document.getElementById("resetAllFull");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {

    const confirmMessage =
      (window.i18n && typeof window.i18n.t === "function"
        ? window.i18n.t("reset_confirm_message")
        : null) ||
      "Are you sure you want to reset all your training data?";

    if (!window.confirm(confirmMessage)) return;

localStorage.removeItem("civicedge_progress");
localStorage.removeItem("civicedge_stats");
localStorage.removeItem("civicedge_testDate");

// Dashboard sequential (Luxembourg)
localStorage.removeItem("civiclearn:lu:answer-log");
localStorage.removeItem("civiclearn:lu:progress");
localStorage.removeItem("civiclearn:lu:dashseq:index");

    const parts = window.location.pathname.split("/").filter(Boolean);
    const root = parts.length > 0 ? parts[0] : "";

    // Fallback if site root is empty
    const redirect = root ? `/${root}/dashboard/` : "/dashboard/";

    window.location.href = redirect;
  });
})();
