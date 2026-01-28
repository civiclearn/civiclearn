(async () => {
	
  if (location.hostname === "localhost") return;
  if (location.pathname.includes("/login")) return;


if (localStorage.getItem("cl_auth") !== "ok") {
  const parts = location.pathname.split("/").filter(Boolean);
  const loginPath = parts.length > 0 ? `/${parts[0]}/login.html` : "/login.html";
  location.replace(loginPath);
  return;
}

const email = localStorage.getItem("cl_email");
if (!email) return; 

try {
  const res = await fetch(
    "https://htgliokekeaovdiafrgs.supabase.co/functions/v1/entitlement-check",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.SUPABASE_KEY
      },
      body: JSON.stringify({ email: email.toLowerCase() })
    }
  );

  if (!res.ok) return;

  const { allowed } = await res.json();

  if (allowed === false) {
    localStorage.removeItem("cl_auth");
    localStorage.removeItem("cl_login_at");
    localStorage.removeItem("cl_email");
    location.replace("https://civiclearn.com/access_ended.html");
  }
} catch (_) {
  
}