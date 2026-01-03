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

    // Training state
    localStorage.removeItem("civicedge_progress");
    localStorage.removeItem("civicedge_stats");
    localStorage.removeItem("civicedge_testDate");

    // Austria-specific dashboard / Bundesland flow
    localStorage.removeItem("civiclearn:at:answer-log");
    localStorage.removeItem("civiclearn:at:progress");
    localStorage.removeItem("civiclearn:at:dashseq:index");
    localStorage.removeItem("civiclearn_bundesland");
    localStorage.removeItem("civiclearn_return_to");

    // Force Bundesland selection
    window.location.href = "/austria/dashboard/bundesland.html";
  });
})();
