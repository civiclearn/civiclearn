window.waitForSupabase = () => {
  return new Promise(resolve => {
    if (window.supabase) return resolve(window.supabase);
    const iv = setInterval(() => {
      if (window.supabase) { clearInterval(iv); resolve(window.supabase); }
    }, 50);
  });
};

(async () => {
  const supabase = await window.waitForSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { window.location.href = "/login.html"; return; }
  window.__cl_uid = session.user.id;
  window.dispatchEvent(new Event("exam:ready"));
})();