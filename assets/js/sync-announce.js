/* ============================================
   CivicLearn Sync Announcement Bar v1.0
   Shows once per user, never again after dismissal.
   
   Usage: Add to any page:
   <script src="/assets/js/sync-announce.js"></script>
   
   Set window.CIVIC_SYNC_ANNOUNCE_LANG before loading,
   or it auto-detects from <html lang="...">.
   ============================================ */

(function () {
  "use strict";

  var LS_KEY = "civiclearn_sync_announced";

  // Already dismissed — exit immediately
  if (localStorage.getItem(LS_KEY) === "1") return;

  // Only show to logged-in users
  if (localStorage.getItem("cl_auth") !== "ok") return;

  // Messages per language
  var messages = {
    da: {
      text: "Ny funktion: Din progression synkroniseres nu automatisk mellem alle dine enheder. Log bare ind med den samme e-mail — dine data er altid med dig.",
      cta: "Forstået"
    },
    fr: {
      text: "Nouveauté\u00a0: Votre progression est désormais synchronisée automatiquement entre tous vos appareils. Connectez-vous simplement avec la même adresse e-mail\u00a0— vos données vous suivent partout.",
      cta: "Compris"
    },
	
	ch: {
      text: "Nouveauté\u00a0: Votre progression est désormais synchronisée automatiquement entre tous vos appareils. Connectez-vous simplement avec la même adresse e-mail\u00a0— vos données vous suivent partout.",
      cta: "Compris"
    },
    de: {
      text: "Neu: Ihr Fortschritt wird jetzt automatisch zwischen all Ihren Geräten synchronisiert. Melden Sie sich einfach mit derselben E-Mail-Adresse an — Ihre Daten sind immer dabei.",
      cta: "Verstanden"
    },
    pt: {
      text: "Novidade: O seu progresso é agora sincronizado automaticamente entre todos os seus dispositivos. Basta iniciar sessão com o mesmo e-mail — os seus dados acompanham-no sempre.",
      cta: "Entendido"
    },
    en: {
      text: "New: Your progress now syncs automatically across all your devices. Just log in with the same email — your data follows you everywhere.",
      cta: "Got it"
    },
    es: {
      text: "Novedad: Tu progreso ahora se sincroniza automáticamente entre todos tus dispositivos. Solo inicia sesión con el mismo correo electrónico — tus datos te acompañan siempre.",
      cta: "Entendido"
    },
    ro: {
      text: "Noutate: Progresul tău se sincronizează acum automat între toate dispozitivele tale. Conectează-te cu același e-mail — datele tale te urmează peste tot.",
      cta: "Am înțeles"
    },
    lt: {
      text: "Naujiena: Jūsų pažanga dabar automatiškai sinchronizuojama visuose jūsų įrenginiuose. Tiesiog prisijunkite su tuo pačiu el. paštu — jūsų duomenys visada su jumis.",
      cta: "Supratau"
    }
  };

  // Detect language
  var lang = window.CIVIC_SYNC_ANNOUNCE_LANG
    || (document.documentElement.lang || "en").split("-")[0];
  var msg = messages[lang] || messages.en;

  // Inject styles
  var style = document.createElement("style");
  style.textContent = [
    ".cl-sync-bar {",
    "  position: fixed;",
    "  bottom: 0;",
    "  left: 0;",
    "  right: 0;",
    "  z-index: 10000;",
    "  background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);",
    "  color: #fff;",
    "  display: flex;",
    "  align-items: center;",
    "  justify-content: center;",
    "  gap: 16px;",
    "  padding: 14px 24px;",
    "  font-family: 'Space Grotesk', system-ui, sans-serif;",
    "  font-size: 0.92rem;",
    "  line-height: 1.4;",
    "  box-shadow: 0 -2px 16px rgba(0,0,0,0.15);",
    "  transform: translateY(100%);",
    "  animation: cl-sync-slide-up 0.4s ease forwards;",
    "  animation-delay: 1s;",
    "}",
    "",
    ".cl-sync-bar-icon {",
    "  font-size: 1.3rem;",
    "  flex-shrink: 0;",
    "}",
    "",
    ".cl-sync-bar-text {",
    "  flex: 1;",
    "  max-width: 720px;",
    "}",
    "",
    ".cl-sync-bar-btn {",
    "  flex-shrink: 0;",
    "  background: rgba(255,255,255,0.2);",
    "  color: #fff;",
    "  border: 1px solid rgba(255,255,255,0.35);",
    "  border-radius: 6px;",
    "  padding: 7px 18px;",
    "  font-family: inherit;",
    "  font-size: 0.85rem;",
    "  font-weight: 600;",
    "  cursor: pointer;",
    "  transition: background 0.2s;",
    "}",
    "",
    ".cl-sync-bar-btn:hover {",
    "  background: rgba(255,255,255,0.35);",
    "}",
    "",
    "@keyframes cl-sync-slide-up {",
    "  from { transform: translateY(100%); }",
    "  to   { transform: translateY(0); }",
    "}",
    "",
    "@keyframes cl-sync-slide-down {",
    "  from { transform: translateY(0); }",
    "  to   { transform: translateY(100%); }",
    "}",
    "",
    "@media (max-width: 600px) {",
    "  .cl-sync-bar {",
    "    flex-direction: column;",
    "    text-align: center;",
    "    gap: 10px;",
    "    padding: 16px 18px;",
    "  }",
    "}",
  ].join("\n");
  document.head.appendChild(style);

  // Build the bar
  function show() {
    var bar = document.createElement("div");
    bar.className = "cl-sync-bar";

    bar.innerHTML =
      '<span class="cl-sync-bar-icon">&#x2601;&#xFE0F;</span>' +
      '<span class="cl-sync-bar-text">' + msg.text + '</span>' +
      '<button class="cl-sync-bar-btn">' + msg.cta + '</button>';

    document.body.appendChild(bar);

    bar.querySelector(".cl-sync-bar-btn").addEventListener("click", function () {
      localStorage.setItem(LS_KEY, "1");
      bar.style.animation = "cl-sync-slide-down 0.3s ease forwards";
      setTimeout(function () { bar.remove(); }, 350);
    });
  }

  // Show after page is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", show);
  } else {
    show();
  }
})();