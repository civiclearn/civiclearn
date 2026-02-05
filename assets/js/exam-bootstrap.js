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

  let user = null;

  try {
    const res = await supabase.auth.getUser();
    user = res?.data?.user ?? null;
  } catch (_) {
    user = null;
  }

  window.CIPLE_EXAM_CONTEXT = {
    userId: user ? user.id : null,
    email: user ? user.email : null
  };

  window.dispatchEvent(new Event("exam:ready"));
})();
