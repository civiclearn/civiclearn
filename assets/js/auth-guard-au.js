(function () {
  // 1. DEV BYPASS — Localhost only
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
    console.warn("[auth-guard] bypassed on localhost");
    return;
  }

  // 2. THE WOODEN HANDSHAKE ENGINE
  function checkWoodenAccess() {
    const hasVipPass = localStorage.getItem("cl_vip_pass") === "true";
    const lastPin = localStorage.getItem("last_used_pin");
    const userEmail = localStorage.getItem("user_email");

    // Calculate what the PIN MUST be today (Day + 42)
    const today = new Date().getDate();
    const correctPinForToday = today + 42;

    // VALIDATION: Does the stored PIN match today's math?
    if (hasVipPass && userEmail && parseInt(lastPin) === correctPinForToday) {
      console.log("[Auth-Guard-AU] Daily Handshake confirmed for: " + userEmail);
      return true; // Access Granted
    }

    return false; // Access Denied
  }

  // 3. EXECUTION
  document.addEventListener("DOMContentLoaded", () => {
    if (!checkWoodenAccess()) {
      console.warn("[Auth-Guard-AU] No valid daily PIN found. Redirecting to login...");

      // Wipe old/expired credentials
      localStorage.removeItem("cl_vip_pass");
      localStorage.removeItem("last_used_pin");

      // Build redirect path to Australia login
      const parts = window.location.pathname.split("/").filter(Boolean);
      const base = parts.length >= 2 && parts[1].length <= 3 
                   ? `/${parts[0]}/${parts[1]}` 
                   : `/${parts[0]}`;

      window.location.replace(`${base}/login.html${window.location.search}`);
    }
  });
})();