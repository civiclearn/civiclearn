(function () {
    // 1. If we are on the login page, STOP. The guard must not run here.
    if (window.location.pathname.toLowerCase().includes("login.html")) {
        return;
    }

    // 2. Dev Bypass
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

    // 3. The Wooden Handshake Logic
    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");
    
    // Day of month + 42
    const today = new Date().getDate();
    const correctPinForToday = today + 42;

    if (isVip && parseInt(savedPin) === correctPinForToday) {
        console.log("Wooden Guard: Access Granted");
        return; 
    } else {
        console.warn("Wooden Guard: Access Denied or Expired.");
        
        // Wipe stale data
        localStorage.removeItem("cl_vip_pass");
        localStorage.removeItem("last_used_pin");

        // Force back to login
        window.location.replace("/australia/login.html");
    }
})();