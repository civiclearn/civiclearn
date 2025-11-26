/**
 * CivicReading v5 – Fully international, safe, final
 * --------------------------------------------------
 * - Reads voice language from country config (voiceLang)
 * - Speaks ON/OFF messages using i18n keys (reading_on / reading_off)
 * - Falls back to English if i18n not ready
 * - Auto-refreshes on ON for immediate availability
 * - No French hardcoded anywhere
 * - 100% safe if toggle not present on page
 */

(function () {
  "use strict";

  const LS_KEY = "civicedge_settings";

  // ----------------------------------------------------
  // Load/save local settings
  // ----------------------------------------------------
  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY)) || {};
    } catch (_) {
      return {};
    }
  }

  function saveSettings(obj) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  let settings = loadSettings();
  let enabled = settings.reading === true;

  // ----------------------------------------------------
  // CONFIG helper
  // ----------------------------------------------------
  function getConfig() {
    return window.CIVICEDGE_CONFIG || {};
  }

  // ----------------------------------------------------
  // SAFE speak() – international
  // ----------------------------------------------------
  function speak(text) {
    try {
      const cfg = getConfig();

      // International voice:
      //  - uses country config voice
      //  - falls back to English
      const lang = cfg.voiceLang || "en-US";

      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = lang;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(msg);
    } catch (_) {}
  }

  // ----------------------------------------------------
  // Toggle reading assist
  // ----------------------------------------------------
  function toggle() {
    enabled = !enabled;

    // Save new state
    settings.reading = enabled;
    saveSettings(settings);

    // Update UI icon if the button exists
    const btn = document.getElementById("readingToggle");
    if (btn) btn.textContent = enabled ? "🔊" : "🔇";

    // i18n access
    const i18n = window.CivicLearnI18n;

    if (enabled) {
      // Multilingual ON message
      speak(i18n ? i18n.t("reading_on") : "Reading assist enabled.");

      // Refresh so speakers appear immediately
      setTimeout(() => {
        window.location.reload();
      }, 300);

    } else {
      // Multilingual OFF message
      speak(i18n ? i18n.t("reading_off") : "Reading assist disabled.");
      // NO refresh on OFF — safe, brakes nothing
    }
  }

  // ----------------------------------------------------
  // Initialization
  // ----------------------------------------------------
  function init() {
    const btn = document.getElementById("readingToggle");
    if (!btn) return; // Safe exit if not a quiz page

    // Set initial icon
    btn.textContent = enabled ? "🔊" : "🔇";

    // Bind toggle
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      toggle();
    });
  }

  document.addEventListener("DOMContentLoaded", init);

  // ----------------------------------------------------
  // Public API for engine.js
  // ----------------------------------------------------
  window.CivicReading = {
    isEnabled: () => enabled,
    speak(text) {
      if (!enabled) return;
      speak(text);
    },
  };
})();
