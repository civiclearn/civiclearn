/**
 * library-entry.js
 * Load this AFTER library-init.js, BEFORE engine.js / dashboard scripts.
 *
 * When in library mode:
 *  - Sets window.CL_STORE (namespaced localStorage or sessionStorage)
 *  - Sets window.CL_LIBRARY_READY (Promise) — dashboard scripts must await this
 *  - Shows blocking overlay until patron chooses New Session or Enter Code
 */
(function () {
  const mode = sessionStorage.getItem("cl_library_mode");
  if (!mode) return;

  const libraryName = sessionStorage.getItem("cl_library_name") || "Bibliothèque";

  // ── Storage helpers ────────────────────────────────────────────────────────

  function makeNamespacedStore(code) {
    const prefix = "cl_lib_" + code + "_";
    return {
      getItem:    function (k) { return localStorage.getItem(prefix + k); },
      setItem:    function (k, v) { localStorage.setItem(prefix + k, v); },
      removeItem: function (k) { localStorage.removeItem(prefix + k); },
      _code: code,
      _prefix: prefix
    };
  }

  function generateCode() {
    // 4-digit, never starts with 0
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  function codeHasData(code) {
    const prefix = "cl_lib_" + code + "_";
    for (var i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i).startsWith(prefix)) return true;
    }
    return false;
  }

  // Default store is sessionStorage (safe until patron chooses)
  window.CL_STORE = sessionStorage;

  // Promise that dashboard scripts await before reading storage
  window.CL_LIBRARY_READY = new Promise(function (resolve) {
    window._cl_library_resolve = resolve;
  });

  // ── CSS ───────────────────────────────────────────────────────────────────

  var style = document.createElement("style");
  style.textContent = [
    "#cl-lib-overlay {",
    "  position:fixed; inset:0; z-index:99999;",
    "  background:rgba(0,0,0,0.82);",
    "  display:flex; align-items:center; justify-content:center;",
    "  font-family:'Lexend','Space Grotesk',system-ui,sans-serif;",
    "  animation:cl-fade-in 0.2s ease;",
    "}",
    "@keyframes cl-fade-in { from{opacity:0} to{opacity:1} }",

    "#cl-lib-box {",
    "  background:#fff; border-radius:22px;",
    "  padding:40px 36px 32px; max-width:360px; width:90%;",
    "  text-align:center;",
    "  box-shadow:0 24px 64px rgba(0,0,0,0.35);",
    "  animation:cl-slide-up 0.25s ease;",
    "}",
    "@keyframes cl-slide-up { from{transform:translateY(16px);opacity:0} to{transform:none;opacity:1} }",

    "#cl-lib-icon { font-size:38px; margin-bottom:10px; }",
    "#cl-lib-title { font-size:17px; font-weight:700; color:#111; margin-bottom:3px; }",
    "#cl-lib-sub {",
    "  font-size:12px; color:#888; margin-bottom:28px;",
    "  padding-bottom:22px; border-bottom:1px solid #f0f0f0;",
    "}",

    ".cl-lib-btn {",
    "  display:block; width:100%; padding:14px 18px;",
    "  border-radius:12px; border:none;",
    "  font-size:15px; font-weight:600; font-family:inherit;",
    "  cursor:pointer; margin-bottom:10px; transition:opacity 0.15s;",
    "}",
    ".cl-lib-btn:last-child { margin-bottom:0; }",
    ".cl-lib-btn:hover { opacity:0.88; }",
    ".cl-lib-btn:active { opacity:0.75; }",
    ".cl-lib-primary { background:#7c3aed; color:#fff; }",
    ".cl-lib-secondary { background:#f3ebff; color:#7c3aed; }",
    ".cl-lib-ghost {",
    "  background:none; color:#aaa; font-size:13px; padding:10px;",
    "}",

    "#cl-lib-code-badge {",
    "  background:#f3ebff; border-radius:14px; padding:18px 20px 16px;",
    "  margin:16px 0 20px;",
    "}",
    "#cl-lib-code-label { font-size:12px; color:#7c3aed; font-weight:600; margin-bottom:8px; }",
    "#cl-lib-code-value {",
    "  font-size:52px; font-weight:700; letter-spacing:12px;",
    "  color:#7c3aed; line-height:1; margin-bottom:12px;",
    "}",
    "#cl-lib-code-note {",
    "  font-size:12px; color:#666; line-height:1.5;",
    "  background:#fff; border-radius:8px; padding:8px 10px;",
    "}",

    "#cl-lib-code-input {",
    "  width:100%; padding:14px; font-size:32px;",
    "  text-align:center; letter-spacing:10px;",
    "  border:2px solid #e5dfd2; border-radius:12px;",
    "  margin:12px 0; font-family:inherit; box-sizing:border-box;",
    "  transition:border-color 0.15s;",
    "}",
    "#cl-lib-code-input:focus {",
    "  outline:none; border-color:#7c3aed;",
    "  box-shadow:0 0 0 3px rgba(124,58,237,0.12);",
    "}",
    "#cl-lib-error {",
    "  font-size:13px; color:#dc2626;",
    "  background:#fee2e2; border-radius:8px;",
    "  padding:9px 12px; margin-bottom:12px; display:none;",
    "}"
  ].join("\n");

  document.head.appendChild(style);

  // ── HTML ──────────────────────────────────────────────────────────────────

  var overlay = document.createElement("div");
  overlay.id = "cl-lib-overlay";
  overlay.innerHTML =
    '<div id="cl-lib-box">' +

      // Header
      '<div id="cl-lib-icon">📚</div>' +
      '<div id="cl-lib-title">' + libraryName + '</div>' +
      '<div id="cl-lib-sub">Accès gratuit · Examen de citoyenneté canadienne</div>' +

      // Panel 1: choose action
      '<div id="cl-lib-panel-main">' +
        '<button class="cl-lib-btn cl-lib-primary" id="cl-lib-btn-new">Nouvelle session</button>' +
        '<button class="cl-lib-btn cl-lib-secondary" id="cl-lib-btn-return">Reprendre ma progression →</button>' +
      '</div>' +

      // Panel 2: new session — show generated code
      '<div id="cl-lib-panel-new" style="display:none;">' +
        '<div id="cl-lib-code-badge">' +
          '<div id="cl-lib-code-label">VOTRE CODE DE REPRISE</div>' +
          '<div id="cl-lib-code-value">----</div>' +
          '<div id="cl-lib-code-note">📝 Notez ce code — il vous permettra de reprendre votre progression lors de votre prochaine visite à la bibliothèque.</div>' +
        '</div>' +
        '<button class="cl-lib-btn cl-lib-primary" id="cl-lib-btn-start">Commencer →</button>' +
      '</div>' +

      // Panel 3: return — enter code
      '<div id="cl-lib-panel-return" style="display:none;">' +
        '<div id="cl-lib-code-label" style="text-align:left;font-size:13px;font-weight:600;color:#555;margin-bottom:4px;">Code à 4 chiffres</div>' +
        '<input id="cl-lib-code-input" type="text" maxlength="4" inputmode="numeric" placeholder="0000" autocomplete="off">' +
        '<div id="cl-lib-error">Code introuvable. Vérifiez ou démarrez une nouvelle session.</div>' +
        '<button class="cl-lib-btn cl-lib-primary" id="cl-lib-btn-confirm">Reprendre →</button>' +
        '<button class="cl-lib-btn cl-lib-ghost" id="cl-lib-btn-back">← Retour</button>' +
      '</div>' +

    '</div>';

  // Append after body is available (or immediately if already ready)
  function mountOverlay() {
    document.body.appendChild(overlay);
    bindEvents();
  }

  if (document.body) {
    mountOverlay();
  } else {
    document.addEventListener("DOMContentLoaded", mountOverlay);
  }

  // ── Event logic ───────────────────────────────────────────────────────────

  function show(panelId) {
    ["cl-lib-panel-main","cl-lib-panel-new","cl-lib-panel-return"].forEach(function(id) {
      document.getElementById(id).style.display = (id === panelId) ? "block" : "none";
    });
  }

  function dismiss() {
    var el = document.getElementById("cl-lib-overlay");
    if (el) {
      el.style.animation = "cl-fade-in 0.15s ease reverse forwards";
      setTimeout(function () { el.remove(); }, 150);
    }
    window._cl_library_resolve();
  }

  function bindEvents() {

    // NEW SESSION
    document.getElementById("cl-lib-btn-new").addEventListener("click", function () {
      var code = generateCode();
      window.CL_STORE = makeNamespacedStore(code);
      sessionStorage.setItem("cl_lib_code", code);
      document.getElementById("cl-lib-code-value").textContent = code;
      show("cl-lib-panel-new");
    });

    // START after seeing code
    document.getElementById("cl-lib-btn-start").addEventListener("click", dismiss);

    // RETURN — show input panel
    document.getElementById("cl-lib-btn-return").addEventListener("click", function () {
      show("cl-lib-panel-return");
      document.getElementById("cl-lib-code-input").focus();
    });

    // CONFIRM return code
    document.getElementById("cl-lib-btn-confirm").addEventListener("click", function () {
      var code = document.getElementById("cl-lib-code-input").value.trim();
      var errEl = document.getElementById("cl-lib-error");

      if (code.length !== 4 || !codeHasData(code)) {
        errEl.style.display = "block";
        document.getElementById("cl-lib-code-input").focus();
        return;
      }

      errEl.style.display = "none";
      window.CL_STORE = makeNamespacedStore(code);
      sessionStorage.setItem("cl_lib_code", code);
      dismiss();
    });

    // Enter key on code input
    document.getElementById("cl-lib-code-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") document.getElementById("cl-lib-btn-confirm").click();
    });

    // BACK
    document.getElementById("cl-lib-btn-back").addEventListener("click", function () {
      document.getElementById("cl-lib-error").style.display = "none";
      document.getElementById("cl-lib-code-input").value = "";
      show("cl-lib-panel-main");
    });
  }

})();
