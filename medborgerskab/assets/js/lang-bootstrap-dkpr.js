/* CivicLearn Language Bootstrap — /medborgerskab/ (Medborgerskabsprøven) */

(function () {
  const ALLOWED = ["da", "en"];

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

  // 3) Final fallback (Danish is institutional default)
  if (!ALLOWED.includes(lang)) {
    lang = "da";
  }

  window.CIVICEDGE_LANG = lang;
  document.documentElement.lang = lang;
})();