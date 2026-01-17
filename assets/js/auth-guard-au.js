(function () {
    // 1. Calculate Today's PIN
    const today = new Date().getDate();
    const correctPin = today + 42; 

    // 2. Check Browser Memory
    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");

    // 3. The Decision
    if (isVip && parseInt(savedPin) === correctPin) {
        console.log("Wooden Guard: Access Granted");
        return; 
    } else {
        console.warn("Wooden Guard: Access Denied");
        localStorage.removeItem("cl_vip_pass");
        // Only redirect if we aren't already on the login page
        if (!window.location.pathname.includes("login.html")) {
            window.location.replace("/australia/login.html");
        }
    }
})();