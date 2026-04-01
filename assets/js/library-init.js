/**
 * library-init.js
 * Load this BEFORE auth-guard.js on every dashboard page.
 * Detects ?library=TOKEN, validates it, sets sessionStorage flag, cleans URL.
 */
(function () {
  const TOKENS = {
    "bml": "bml"
  };

  const token = new URLSearchParams(location.search).get("library");
  if (!token || !TOKENS[token]) return;

  sessionStorage.setItem("cl_library_mode", TOKENS[token]);
  sessionStorage.setItem("cl_library_name", "Bibliothèque de Montréal");

  // Strip token from address bar — patron can't see/copy it
  const clean = new URL(location.href);
  clean.searchParams.delete("library");
  history.replaceState({}, "", clean);
})();
