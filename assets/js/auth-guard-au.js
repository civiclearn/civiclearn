(async () => {
  if (location.hostname === "localhost") return;

  const res = await fetch("/functions/v1/bypass-verify", {
    credentials: "include"
  });

  if (!res.ok) {
    location.replace("/australia/login-bypass.html");
  }
})();
