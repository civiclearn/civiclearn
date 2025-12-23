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

// Dashboard sequential (Spain CCSE)
localStorage.removeItem("civiclearn:ccse:answers");
localStorage.removeItem("civiclearn:ccse:stats");
localStorage.removeItem("civiclearn:ccse:dashseq:index");

    const parts = window.location.pathname.split("/").filter(Boolean);
    const root = parts.length > 0 ? parts[0] : "";

    // Fallback if site root is empty
    const redirect = root ? `/${root}/dashboard/` : "/dashboard/";

    window.location.href = redirect;
  });
})();
