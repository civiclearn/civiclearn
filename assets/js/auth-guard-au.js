(function () {
  // 1. Skip if on localhost
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

  // 2. The Verification Logic
  function hasValidAccess() {
    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");
    const userEmail = localStorage.getItem("user_email");
    
    // Calculate Today's required PIN
    const today = new Date().getDate();
    const correctPinForToday = today + 42;

    // Check if everything matches
    return isVip && userEmail && parseInt(savedPin) === correctPinForToday;
  }

  // 3. The Execution
  if (!hasValidAccess()) {
    console.warn("[Auth-Guard] Invalid or expired PIN. Redirecting...");
    
    // Clear old data
    localStorage.removeItem("cl_vip_pass");
    localStorage.removeItem("last_used_pin");

    // Redirect to login
    window.location.replace("/australia/login.html");
  } else {
    console.log("[Auth-Guard] Wooden Handshake verified.");
  }
})();