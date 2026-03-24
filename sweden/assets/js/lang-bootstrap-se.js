/* CivicLearn Language Bootstrap — Sweden */

(function () {
  const ALLOWED = ["sv", "en"];

  let lang = null;

  // 1) Explicit user choice
  try {
    lang = localStorage.getItem("civicedge_lang");
  } catch {}

  // 2) Browser language fallback
  if (!lang) {
    const nav = navigator.language || navigator.userLanguage || "";
    lang = nav.slice(0, 2).toLowerCase();
  }

  // 3) Final fallback (Swedish is institutional default)
  if (!ALLOWED.includes(lang)) {
    lang = "sv";
  }

  window.CIVICEDGE_LANG = lang;
  document.documentElement.lang = lang;
})();
