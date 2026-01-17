(function () {
    const url = window.location.href.toLowerCase();
    if (url.indexOf("login") !== -1) return;

    const today = new Date().getDate();
    const correctPin = (today * 123) + 1000; 

    const isVip = localStorage.getItem("cl_vip_pass") === "true";
    const savedPin = localStorage.getItem("last_used_pin");

    if (isVip && parseInt(savedPin) === correctPin) {
        return; 
    } else {
        localStorage.removeItem("cl_vip_pass");
        localStorage.removeItem("last_used_pin");
        window.location.replace("https://civiclearn.com/australia/login.html");
    }
})();