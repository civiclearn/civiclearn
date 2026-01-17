(function () {
    const url = window.location.href.toLowerCase();
    if (url.indexOf("login") !== -1) return;

    // 4-Digit PIN Logic
    const today = new Date().getDate();
    const correctPin = (today * 123) + 1000; 

    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");
    const userEmail = localStorage.getItem("user_email");

    if (isVip && userEmail && parseInt(savedPin) === correctPin) {
        console.log("Access Verified.");
        return;
    } else {
        localStorage.removeItem("cl_vip_pass");
        localStorage.removeItem("last_used_pin");
        window.location.replace("https://civiclearn.com/australia/login.html");
    }
})();