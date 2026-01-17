(async () => {
  if (location.hostname === "localhost") return;

  const token = localStorage.getItem("cl_token");
  if (!token) {
    location.replace("/australia/login.html");
    return;
  }

  try {
    const res = await fetch(
      "https://auth.civiclearn.com/api/session-verify",
      {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + token
        }
      }
    );

    if (!res.ok) {
      localStorage.removeItem("cl_token");
      location.replace("/australia/login.html");
    }
  } catch {
    localStorage.removeItem("cl_token");
    location.replace("/australia/login.html");
  }
})();

