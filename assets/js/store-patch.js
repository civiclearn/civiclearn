/**
 * store-patch.js  (canadafr only — never deploy to shared /assets/js/)
 *
 * In library mode, transparently redirects civicedge_* localStorage calls
 * to window.CL_STORE (the patron-namespaced store set by library-entry.js).
 *
 * cl_auth, cl_email, and every other key are untouched — they stay on
 * real localStorage as normal. engine.js and sync.js need zero changes.
 *
 * Load order in HTML:
 *   1. library-init.js
 *   2. library-entry.js   ← sets window.CL_STORE + window.CL_LIBRARY_READY
 *   3. store-patch.js     ← this file
 *   4. auth-guard.js
 *   5. engine.js
 *   6. sync.js
 *
 * window.CL_STORE is read at call-time (not patch-time), so it correctly
 * reflects whichever namespaced store the patron chose after the overlay.
 */
(function () {
  // Not in library mode → nothing to do
  if (!sessionStorage.getItem("cl_library_mode")) return;

  // Keys to intercept — everything civicedge_*
  var PATCHED = [
    "civicedge_progress",
    "civicedge_stats",
    "civicedge_saved",
    "civicedge_settings"
  ];

  // Hold references to the real methods before patching
  var _get = localStorage.getItem.bind(localStorage);
  var _set = localStorage.setItem.bind(localStorage);
  var _rm  = localStorage.removeItem.bind(localStorage);

  localStorage.getItem = function (key) {
    if (PATCHED.indexOf(key) !== -1 && window.CL_STORE) {
      return window.CL_STORE.getItem(key);
    }
    return _get(key);
  };

  localStorage.setItem = function (key, value) {
    if (PATCHED.indexOf(key) !== -1 && window.CL_STORE) {
      window.CL_STORE.setItem(key, value);
      return;
    }
    _set(key, value);
  };

  localStorage.removeItem = function (key) {
    if (PATCHED.indexOf(key) !== -1 && window.CL_STORE) {
      window.CL_STORE.removeItem(key);
      return;
    }
    _rm(key);
  };

  console.log("[CivicLearn] Library store patch active.");
})();
