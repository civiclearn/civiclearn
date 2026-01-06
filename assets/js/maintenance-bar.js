(function () {

  // Abort if already injected
  if (document.getElementById("maintenance-bar")) return;

  /* =========================
     NOTICE CONFIGURATION
     ========================= */

  const NOTICE = {
    id: "maintenance_2026_04", // change to re-show for everyone
    enabled: false,                 // global on/off
    type: "outage"                // "info" | "warning" | "outage" | "success"
  };
  
  const TARGET_COUNTRIES = ["uk"]; // "geneva", "denmark-pr", "france-cr", "ccse", etc

  const MESSAGE_KEY = NOTICE.type

  const STORAGE_KEY = "civiclearn_notice_dismissed_" + NOTICE.id;

  if (!NOTICE.enabled) return;
  
  const currentCountry =
  (window.CIVICEDGE_CONFIG &&
   window.CIVICEDGE_CONFIG.country) || "";


if (
  TARGET_COUNTRIES.length > 0 &&
  !TARGET_COUNTRIES.includes(currentCountry)
) return;


  try {
    if (localStorage.getItem(STORAGE_KEY)) return;
  } catch {}

  /* =========================
     LANGUAGE RESOLUTION
     ========================= */

  const lang =
    (window.CIVICEDGE_LANG ||
     document.documentElement.lang ||
     "en").split("-")[0];

  /* =========================
     MESSAGE CATALOG
     ========================= */

const MESSAGES = {
  info: {
    en: "A new feature has just been released on CivicLearn.",
    fr: "Une nouvelle fonctionnalité vient d’être publiée sur CivicLearn.",
    de: "Eine neue Funktion wurde soeben auf CivicLearn veröffentlicht."
  },

  warning: {
    en: "We are currently working on improvements to the platform.",
    fr: "Nous travaillons actuellement à l’amélioration de la plateforme.",
    de: "Wir arbeiten derzeit an Verbesserungen der Plattform."
  },

  outage: {
    en: "Some services are temporarily unavailable.",
    fr: "Certains services sont temporairement indisponibles.",
    de: "Einige Dienste sont derzeit nicht disponibles."
  }
};

  /* =========================
     CREATE BAR
     ========================= */

  const bar = document.createElement("div");
  bar.id = "maintenance-bar";
  bar.dataset.type = NOTICE.type;
  bar.hidden = false;

  bar.innerHTML = `
    <span id="maintenance-text"></span>
    <button id="maintenance-close" aria-label="Close">×</button>
  `;

  /* =========================
     STYLES
     ========================= */

  const style = document.createElement("style");
  style.textContent = `
    #maintenance-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      border-bottom: 1px solid transparent;
    }

    #maintenance-bar span {
      flex: 1;
    }

    #maintenance-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
    }

    #maintenance-bar[data-type="info"] {
      background: #e0f2fe;
      color: #075985;
      border-bottom-color: #bae6fd;
    }

    #maintenance-bar[data-type="warning"] {
      background: #fff3cd;
      color: #4b3f00;
      border-bottom-color: #e6d8a8;
    }

    #maintenance-bar[data-type="outage"] {
      background: #fee2e2;
      color: #7f1d1d;
      border-bottom-color: #fecaca;
    }

    #maintenance-bar[data-type="success"] {
      background: #dcfce7;
      color: #14532d;
      border-bottom-color: #bbf7d0;
    }
  `;
  document.head.appendChild(style);

  /* =========================
     MOUNT
     ========================= */

  if (document.body) {
    document.body.prepend(bar);
  } else {
    document.addEventListener("DOMContentLoaded", () => {
      document.body.prepend(bar);
    });
  }

  /* =========================
     TEXT + DISMISS
     ========================= */

  const textEl = bar.querySelector("#maintenance-text");
  const closeBtn = bar.querySelector("#maintenance-close");

  textEl.textContent =
    (MESSAGES[MESSAGE_KEY] && MESSAGES[MESSAGE_KEY][lang]) ||
    (MESSAGES[MESSAGE_KEY] && MESSAGES[MESSAGE_KEY].en) ||
    "";

  closeBtn.addEventListener("click", () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    bar.remove();
  });

})();
