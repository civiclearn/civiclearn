/**
 * CivicReading v6 – Quality-ranked voice selection
 * --------------------------------------------------
 * Same as v5, but picks the HIGHEST-QUALITY voice available
 * for the configured language instead of the first match.
 *
 * Cross-platform name heuristics (no per-language hardcoding):
 *   "neural" | "natural" | "premium" | "wavenet" | "studio"  → +100
 *   "online"  (Microsoft Edge online voices, Azure Neural)   → +80
 *   "siri"    (Apple Siri voices on iOS)                     → +70
 *   "enhanced" (Apple Enhanced, downloaded)                  → +50
 *   "google"  (Google network voices)                        → +40
 *   localService === false (any network-backed voice)        → +10
 *   "compact" | "eloquence" (low-quality fallbacks)          → penalty
 *
 * Effect: when a good voice exists on the user's device, we use it.
 * When only basic voices exist, we fall back to the same default as before.
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
  // Voice quality scoring (cross-platform)
  // ----------------------------------------------------
  function scoreVoice(voice) {
    const name = (voice.name || "").toLowerCase();
    let score = 0;

    // High-quality neural/network tiers
    if (/neural|natural|premium|wavenet|studio/.test(name)) score += 100;
    if (/\bonline\b/.test(name))   score += 80;   // Microsoft Online (Edge)
    if (/\bsiri\b/.test(name))     score += 70;   // Apple Siri (iOS)
    if (/\benhanced\b/.test(name)) score += 50;   // Apple Enhanced
    if (/\bgoogle\b/.test(name))   score += 40;   // Google network voices

    // Network-backed voices tend to outrank local
    if (voice.localService === false) score += 10;

    // Penalties for known low-quality variants
    if (/\bcompact\b/.test(name))   score -= 10;
    if (/\beloquence\b/.test(name)) score -= 20;

    return score;
  }

  function pickBestVoice(lang) {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const prefix = lang.split("-")[0];
    const exact    = voices.filter(v => v.lang === lang);
    const prefixed = voices.filter(v => v.lang.startsWith(prefix) && v.lang !== lang);

    // Prefer exact-language matches; only fall through to prefix matches if none.
    const candidates = exact.length ? exact : prefixed;
    if (!candidates.length) return null;

    candidates.sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return candidates[0];
  }

  // ----------------------------------------------------
  // SAFE speak() – uses best available voice for the language
  // ----------------------------------------------------
  function speak(text) {
    try {
      const cfg = getConfig();
      const lang = cfg.voiceLang || "en-US";

      const msg = new SpeechSynthesisUtterance(text);
      msg.lang = lang;

      const voice = pickBestVoice(lang);
      if (voice) {
        msg.voice = voice;
      }

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
      // NO refresh on OFF — safe, breaks nothing
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
