(function () {
    const url = window.location.href.toLowerCase();
    
    // 1. SILENCE ON LOGIN: If URL has 'login', stop.
    if (url.indexOf("login") !== -1) return;

    // 2. THE 4-DIGIT MATH (Must match login page exactly)
    const today = new Date().getDate();
    const correctPin = (today * 123) + 1000; 

    // 3. RETRIEVE CREDENTIALS
    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");
    const userEmail = localStorage.getItem("user_email");

    console.log("[Guard] Checking PIN:", savedPin, "Expected:", correctPin);

    // 4. THE DECISION
    if (isVip && userEmail && parseInt(savedPin) === correctPin) {
        console.log("[Guard] Access Verified.");
        return;
    } else {
        console.warn("[Guard] Handshake Failed. Redirecting...");
        localStorage.removeItem("cl_vip_pass");
        localStorage.removeItem("last_used_pin");
        window.location.replace("https://civiclearn.com/australia/login.html");
    }
})();