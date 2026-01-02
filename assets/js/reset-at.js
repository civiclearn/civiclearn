(function () {
  const resetBtn = document.getElementById("resetAllFull");
  if (!resetBtn) return;

  resetBtn.addEventListener("click", () => {

    // ------------------------------------------------------------------
    // 1. i18n-friendly confirmation text (UNCHANGED)
    // ------------------------------------------------------------------
    const confirmMessage =
      (window.i18n && typeof window.i18n.t === "function"
        ? window.i18n.t("reset_confirm_message")
        : null) ||
      "Are you sure you want to reset all your training data?";

    if (!window.confirm(confirmMessage)) return;

    // ------------------------------------------------------------------
    // 2. AUSTRIA: HARD RESET (local + session)
    // ------------------------------------------------------------------
    localStorage.clear();
    sessionStorage.clear();

    // ------------------------------------------------------------------
    // 3. AUSTRIA: FORCE Bundesland selection
    // ------------------------------------------------------------------
    window.location.href = "/austria/dashboard/bundesland.html";
  });
})();
