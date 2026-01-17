(async () => {
  if (location.hostname === "localhost") return;

  const token = localStorage.getItem("cl_token");
  if (!token) {
    location.replace("/australia/login.html");
    return;
  }

  try {
    const res = await fetch("/api/session-verify", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!res.ok) {
      localStorage.removeItem("cl_token");
      location.replace("/australia/login.html");
    }
  } catch {
    localStorage.removeItem("cl_token");
    location.replace("/australia/login.html");
  }
})();
