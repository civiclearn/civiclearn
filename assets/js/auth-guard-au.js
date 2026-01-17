(function () {
    // 1. Localhost Bypass
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;

    // 2. The Math Check
    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");
    
    // Day of month + 42 (Matches the login page)
    const today = new Date().getDate();
    const correctPinForToday = today + 42;

    if (isVip && parseInt(savedPin) === correctPinForToday) {
        console.log("Wooden Handshake: Verified");
        return; // Access granted, do nothing else.
    } else {
        console.warn("Wooden Handshake: Failed. Redirecting to login...");
        
        // Clear old credentials to prevent loops
        localStorage.removeItem("cl_vip_pass");
        localStorage.removeItem("last_used_pin");

        // Force redirect to login
        window.location.replace("/australia/login.html");
    }
})();