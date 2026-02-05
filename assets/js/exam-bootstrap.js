function waitForSupabase() {
  return new Promise(resolve => {
    if (window.supabase) return resolve(window.supabase);

    const iv = setInterval(() => {
      if (window.supabase) {
        clearInterval(iv);
        resolve(window.supabase);
      }
    }, 0);
  });
}

(async () => {
  const supabase = await waitForSupabase();

  const { data } = await supabase.auth.getSession();
const user = data?.session?.user || null;

if (!user) {
  return; // DO NOT BLOCK PAGE
}


  window.CIPLE_EXAM_CONTEXT = {
    userId: user.id,
    email: user.email
  };

  window.dispatchEvent(new Event("exam:ready"));
})();
