/* CivicEdge Language Bootstrap — Lithuania (Multilingual, TTS-safe) */

(function () {
  const ALLOWED = ["lt", "en", "ru"];

  let lang = null;

  // ----------------------------------------------------
  // 1) Explicit user choice
  // ----------------------------------------------------
  try {
    lang = localStorage.getItem("civicedge_lang");
  } catch {}

  // ----------------------------------------------------
  // 2) Browser language fallback
  // ----------------------------------------------------
  if (!lang) {
    const nav = navigator.language || navigator.userLanguage || "";
    lang = nav.slice(0, 2).toLowerCase();
  }

  // ----------------------------------------------------
  // 3) Final fallback
  // ----------------------------------------------------
  if (!ALLOWED.includes(lang)) {
    lang = "en";
  }

  // ----------------------------------------------------
  // Global single source of truth (UI language)
  // ----------------------------------------------------
  window.CIVICEDGE_LANG = lang;
  document.documentElement.lang = lang;

  // ----------------------------------------------------
  // TTS VOICE OVERRIDE (CRITICAL FIX)
  // ----------------------------------------------------
  // Country config is LT-based, but voice must follow UI language
  if (window.CIVICEDGE_CONFIG) {
    const VOICE_BY_LANG = {
      ru: "ru-RU",   // Russian available on most systems
      en: "en-US",   // Safe default
      lt: "en-US"    // Intentional fallback (LT voices rarely exist)
    };

    window.CIVICEDGE_CONFIG.voiceLang =
      VOICE_BY_LANG[lang] || "en-US";
  }

})();
