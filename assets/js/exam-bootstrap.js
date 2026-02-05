// exam-bootstrap.js
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
  
  if (!session) {
    // If no session, send them to login immediately
    window.location.href = "/login.html";
    return;
  }
  
  // Set global ID so other scripts can see it
  window.__cl_uid = session.user.id;
  window.dispatchEvent(new Event("exam:ready"));
})();