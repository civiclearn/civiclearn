(function () {
  // Bypasses check if on localhost
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

  function verifyAccess() {
    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");
    const todayPin = new Date().getDate() + 42; // Same math as login.html

    // Access is only valid if PIN matches today's date + 42
    return isVip && parseInt(savedPin) === todayPin;
  }

  if (!verifyAccess()) {
    console.warn("[Auth-Guard] Access expired or missing. Redirecting...");
    
    // Clear potentially expired data
    localStorage.removeItem("cl_vip_pass");
    localStorage.removeItem("last_used_pin");

    // Redirect to the login page relative to the current folder structure
    const path = window.location.pathname;
    const redirectUrl = path.includes("/dashboard/") ? "../login.html" : "login.html";
    window.location.replace(redirectUrl);
  }
})();