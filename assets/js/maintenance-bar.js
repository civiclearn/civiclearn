(function () {
  if (document.getElementById("maintenance-bar")) return;
  const NOTICE_ID = "maintenance_2026_01";
  const STORAGE_KEY = "civiclearn_notice_dismissed_" + NOTICE_ID;

  const ENABLED = false; // set to false to disable everywhere

  if (!ENABLED) return;
  if (localStorage.getItem(STORAGE_KEY)) return;

  const lang =
    window.CIVICEDGE_LANG ||
    document.documentElement.lang ||
    "en";

  const MESSAGES = {
    en: "We are currently working on improvements to the platform. You may notice brief visual changes or minor interruptions.",
    fr: "Nous travaillons actuellement à l’amélioration de la plateforme. Vous pourriez constater de légers changements visuels ou de brèves interruptions.",
    de: "Wir arbeiten derzeit an Verbesserungen der Plattform. Es kann vereinzelt zu kleineren visuellen Änderungen oder kurzen Unterbrechungen kommen."
  };

  // Inject HTML
  const bar = document.createElement("div");
  bar.id = "maintenance-bar";
  bar.innerHTML = `
    <span id="maintenance-text"></span>
    <button id="maintenance-close" aria-label="Close">×</button>
  `;

  // Inject CSS
  const style = document.createElement("style");
  style.textContent = `
    #maintenance-bar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: #fff3cd;
      color: #4b3f00;
      border-bottom: 1px solid #e6d8a8;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
    }
    #maintenance-bar span { flex: 1; }
    #maintenance-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #4b3f00;
      line-height: 1;
    }
  `;
  document.head.appendChild(style);

  // Mount
  document.body.prepend(bar);

  const text = bar.querySelector("#maintenance-text");
  const close = bar.querySelector("#maintenance-close");

  text.textContent = MESSAGES[lang] || MESSAGES.en;

  close.addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEY, "1");
    bar.remove();
  });
})();
