(function () {
  const ALLOWED = ["fi", "sv", "en"];
  let lang = null;
  try { lang = localStorage.getItem("civicedge_lang"); } catch {}
  if (!lang) {
    const nav = navigator.language || navigator.userLanguage || "";
    lang = nav.slice(0, 2).toLowerCase();
  }
  if (!ALLOWED.includes(lang)) lang = "fi";
  window.CIVICEDGE_LANG = lang;
  document.documentElement.lang = lang;
})();
