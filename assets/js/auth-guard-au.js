(async () => {
  if (location.hostname === "localhost") return;

  try {
    const res = await fetch(
      "https://auth.civiclearn.com/api/session-verify",
      {
        method: "GET",
        credentials: "include"
      }
    );

    if (!res.ok) {
      location.replace("/australia/login.html");
    }
  } catch {
    location.replace("/australia/login.html");
  }
})();
