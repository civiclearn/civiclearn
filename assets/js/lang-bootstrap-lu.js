/* CivicEdge Language Bootstrap — Luxembourg */

(function () {
  const ALLOWED = ["fr", "de", "en"];

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

  // 3) Final fallback (INSTITUTIONAL)
  if (!ALLOWED.includes(lang)) {
    lang = "fr";
  }

  // Global single source of truth
  window.CIVICEDGE_LANG = lang;
  document.documentElement.lang = lang;

})();
