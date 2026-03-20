(function () {
  if (document.getElementById("maintenance-bar")) return;

  /* =========================
     CONFIG
     ========================= */
  var SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
  var SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";

  /* =========================
     DETECT PRODUCT FROM URL
     ========================= */
  // civiclearn.com/denmark/dashboard → "denmark"
  // civiclearn.com/lux/login → "lux"
  // dansk3.dk/dashboard → "pd3" (special case)
  var pathParts = window.location.pathname.split("/").filter(Boolean);
  var host = window.location.hostname;
  var product = "";

  if (host === "dansk3.dk") {
    product = "pd3";
  } else if (pathParts.length > 0) {
    product = pathParts[0];
  }

  /* =========================
     LANGUAGE
     ========================= */
  var lang = (
    window.CIVICEDGE_LANG ||
    document.documentElement.lang ||
    "en"
  ).split("-")[0];

  /* =========================
     FETCH NOTICES
     ========================= */
  var url = SUPABASE_URL + "/rest/v1/site_notices?enabled=eq.true&order=priority.desc,created_at.desc&limit=5";

  fetch(url, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Accept": "application/json"
    }
  })
    .then(function (res) { return res.json(); })
    .then(function (notices) {
      if (!notices || !notices.length) return;

      // Find first notice that targets this product (or all)
      var notice = null;
      for (var i = 0; i < notices.length; i++) {
        var targets = notices[i].targets || [];
        var matches = false;
        for (var j = 0; j < targets.length; j++) {
          if (targets[j] === "*" || targets[j] === product) {
            matches = true;
            break;
          }
        }
        if (matches) {
          notice = notices[i];
          break;
        }
      }

      if (!notice) return;

      // Check if dismissed
      var storageKey = "civiclearn_notice_dismissed_" + notice.id;
      try {
        if (localStorage.getItem(storageKey)) return;
      } catch (e) {}

      // Get message in user's language
      var messages = notice.messages || {};
      var text = messages[lang] || messages["en"] || "";
      if (!text) return;

      // Build bar
      var bar = document.createElement("div");
      bar.id = "maintenance-bar";
      bar.dataset.type = notice.type || "info";

      bar.innerHTML =
        '<span id="maintenance-text"></span>' +
        '<button id="maintenance-close" aria-label="Close">\u00d7</button>';

      // Styles (inject once)
      var style = document.createElement("style");
      style.textContent =
        "#maintenance-bar{position:sticky;top:0;z-index:1000;padding:10px 16px;display:flex;align-items:center;gap:12px;font-size:14px;border-bottom:1px solid transparent;font-family:'Space Grotesk',sans-serif;}" +
        "#maintenance-bar span{flex:1;}" +
        "#maintenance-close{background:none;border:none;font-size:18px;cursor:pointer;line-height:1;}" +
        '#maintenance-bar[data-type="info"]{background:#e0f2fe;color:#075985;border-bottom-color:#bae6fd;}' +
        '#maintenance-bar[data-type="warning"]{background:#fff3cd;color:#4b3f00;border-bottom-color:#e6d8a8;}' +
        '#maintenance-bar[data-type="outage"]{background:#fee2e2;color:#7f1d1d;border-bottom-color:#fecaca;}' +
        '#maintenance-bar[data-type="success"]{background:#dcfce7;color:#14532d;border-bottom-color:#bbf7d0;}';
      document.head.appendChild(style);

      // Mount
      var mount = function () {
        document.body.prepend(bar);
        bar.querySelector("#maintenance-text").textContent = text;
        bar.querySelector("#maintenance-close").addEventListener("click", function () {
          try { localStorage.setItem(storageKey, "1"); } catch (e) {}
          bar.remove();
        });
      };

      if (document.body) {
        mount();
      } else {
        document.addEventListener("DOMContentLoaded", mount);
      }
    })
    .catch(function () {
      // Silent fail — no notice is fine
    });
})();
