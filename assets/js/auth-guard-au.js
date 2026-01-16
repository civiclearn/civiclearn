(async () => {
  // Allow local dev
  if (location.hostname === "localhost") return;

  try {
    const res = await fetch(
      "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/session-verify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ probe: true }) // body required by CSP; ignored server-side
      }
    );

    if (!res.ok) {
      location.replace("/australia/login.html");
    }
  } catch {
    location.replace("/australia/login.html");
  }
})();
