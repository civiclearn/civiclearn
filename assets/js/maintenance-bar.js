(function () {
  if (document.getElementById("maintenance-bar")) return;

  /* =========================
     CONFIG
     ========================= */
  var SUPABASE_URL = "https://htgliokekeaovdiafrgs.supabase.co";
  var SUPABASE_KEY = "sb_publishable_QWvR124i4h0hvQumyjBgDw_018SlMbp";
  var MAX_NOTICES = 3; // how many stacked bars to show at once

  /* =========================
     DETECT PRODUCT FROM URL
     ========================= */
  // civiclearn.com/denmark/dashboard → "denmark"
  // civiclearn.com/indfodsret/index.html → "indfodsret"
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
  var url = SUPABASE_URL + "/rest/v1/site_notices?enabled=eq.true&order=priority.desc,created_at.desc&limit=10";

  fetch(url, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Accept": "application/json"
    }
  })
    .then(function (res) { return res.json(); })
    .then(function (notices) {
      if (!notices || !notices.length) return;

      /* Collect ALL notices that target this product (or all) and aren't
         dismissed — up to MAX_NOTICES, in priority order. */
      var toShow = [];
      for (var i = 0; i < notices.length && toShow.length < MAX_NOTICES; i++) {
        var n = notices[i];
        var targets = n.targets || [];
        var matches = false;
        for (var j = 0; j < targets.length; j++) {
          if (targets[j] === "*" || targets[j] === product) { matches = true; break; }
        }
        if (!matches) continue;

        try {
          if (localStorage.getItem("civiclearn_notice_dismissed_" + n.id)) continue;
        } catch (e) {}

        var messages = n.messages || {};
        var text = messages[lang] || messages["en"] || "";
        if (!text) continue;

        toShow.push({ notice: n, text: text });
      }

      if (!toShow.length) return;

      /* =========================
         STYLES (inject once)
         ========================= */
      var style = document.createElement("style");
      style.textContent =
        "#maintenance-bar{position:sticky;top:0;z-index:1000;margin-bottom:20px;display:flex;flex-direction:column;}" +
        ".cl-notice{padding:10px 16px;display:flex;align-items:center;gap:12px;font-size:14px;border-bottom:1px solid transparent;font-family:'Space Grotesk',sans-serif;}" +
        ".cl-notice .cl-notice-text{flex:1;}" +
        ".cl-notice a{color:inherit;font-weight:600;text-decoration:underline;}" +
        ".cl-notice a:hover{opacity:.8;}" +
        ".cl-notice .cl-notice-cta{flex:0 0 auto;text-decoration:none;border:1.5px solid currentColor;border-radius:8px;padding:6px 14px;font-weight:600;white-space:nowrap;}" +
        ".cl-notice .cl-notice-cta:hover{opacity:.85;text-decoration:none;}" +
        ".cl-notice-close{background:none;border:none;font-size:18px;cursor:pointer;line-height:1;color:inherit;flex:0 0 auto;}" +
        '.cl-notice[data-type="info"]{background:#e0f2fe;color:#075985;border-bottom-color:#bae6fd;}' +
        '.cl-notice[data-type="warning"]{background:#fff3cd;color:#4b3f00;border-bottom-color:#e6d8a8;}' +
        '.cl-notice[data-type="outage"]{background:#fee2e2;color:#7f1d1d;border-bottom-color:#fecaca;}' +
        '.cl-notice[data-type="success"]{background:#dcfce7;color:#14532d;border-bottom-color:#bbf7d0;}';
      document.head.appendChild(style);

      /* =========================
         HELPERS
         ========================= */
      function escapeHtml(s) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      }
      // Auto-link bare URLs / domains in the message text (unchanged behaviour)
      function autolink(s) {
        return escapeHtml(s).replace(
          /(https?:\/\/[^\s]+|[a-z0-9][-a-z0-9]*\.[a-z]{2,}(?:\/[^\s]*)?)/gi,
          function (u) {
            var href = u.match(/^https?:\/\//) ? u : "https://" + u;
            return '<a href="' + href + '" target="_blank" rel="noopener">' + u + '</a>';
          }
        );
      }

      var wrap = document.createElement("div");
      wrap.id = "maintenance-bar";

      toShow.forEach(function (item) {
        var n = item.notice;
        var bar = document.createElement("div");
        bar.className = "cl-notice";
        bar.dataset.type = n.type || "info";

        // Optional CTA button: { url, label:{da,en,...} } — renders a button and
        // HIDES the raw URL (shows the label instead).
        var hasCta = n.cta && typeof n.cta === "object" && n.cta.url;
        var ctaHtml = hasCta
          ? '<a class="cl-notice-cta" href="' + String(n.cta.url).replace(/"/g, "&quot;") +
            '" target="_blank" rel="noopener"></a>'
          : "";

        bar.innerHTML =
          '<span class="cl-notice-text">' + autolink(item.text) + '</span>' +
          ctaHtml +
          '<button class="cl-notice-close" aria-label="Close">\u00d7</button>';

        if (hasCta) {
          var label = (n.cta.label && (n.cta.label[lang] || n.cta.label["en"])) || "\u2192";
          bar.querySelector(".cl-notice-cta").textContent = label; // textContent = injection-safe
        }

        bar.querySelector(".cl-notice-close").addEventListener("click", function () {
          try { localStorage.setItem("civiclearn_notice_dismissed_" + n.id, "1"); } catch (e) {}
          bar.remove();
          if (!wrap.querySelector(".cl-notice")) wrap.remove();
        });

        wrap.appendChild(bar);
      });

      /* =========================
         MOUNT
         ========================= */
      var mount = function () {
        var main = document.querySelector("main") || document.querySelector(".main") || document.body;
        main.prepend(wrap);
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
