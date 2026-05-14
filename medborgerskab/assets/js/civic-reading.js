/* CivicLearn — Reading Assist (MP3-based, /medborgerskab/)
   ─────────────────────────────────────────────────────────
   Drop-in replacement for the previous /assets/js/reading.js, but plays
   pre-generated MP3 files instead of using the browser's SpeechSynthesis.

   Public API and storage are unchanged from reading.js, so this module is
   wire-compatible with the rest of the system:

     window.CivicReading.isEnabled()  - reads from civicedge_settings.reading
     window.CivicReading.speak(text)  - no-op if disabled; otherwise plays MP3
     window.CivicReading.stop()       - stops any currently playing clip

   The #readingToggle sidebar button is bound here exactly as it was in
   reading.js: clicking it flips civicedge_settings.reading, updates the
   icon (🔊/🔇), and reloads the page when turning ON so engine-dkpr.js
   re-renders questions with the inline speaker buttons visible.

   MP3 lookup: each pre-generated file is named for the SHA-1 hash (first
   16 hex chars) of the normalized text. The Python generator script
   (generate-audio-dkpr.py) and this module use the same hashing and
   normalization, so identical text produces identical filenames.
   Files live at /medborgerskab/audio/da/{hash}.mp3.
*/
(function () {
  "use strict";

  const LS_KEY = "civicedge_settings";

  /* Resolve audio folder for the current UI language. The page sets
     window.CIVICEDGE_LANG via lang-bootstrap-dkpr.js + i18n.js before this
     script runs. We accept either "da" or "da-DK" style values and map to
     the short folder name. Falls back to "da" if nothing's set, since this
     module is /medborgerskab/-specific. */
  function getAudioBase() {
    const raw = (window.CIVICEDGE_LANG || "da").toString().toLowerCase();
    const short = raw.split("-")[0];  // "da-DK" → "da", "en-US" → "en"
    return `/medborgerskab/audio/${short}`;
  }

  // ----------------------------------------------------
  // Load/save settings (same key + shape as old reading.js)
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
  // Match old reading.js default exactly: OFF until user explicitly enables.
  let enabled = settings.reading === true;

  // ----------------------------------------------------
  // Text → filename
  // ----------------------------------------------------
  function normalize(s) {
    // Mirror generate-audio-dkpr.py's normalization:
    //   " ".join(s.split())  →  trim + collapse all whitespace to single spaces
    return String(s || "").split(/\s+/).filter(Boolean).join(" ");
  }

  async function sha1Hex16(s) {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }

  // ----------------------------------------------------
  // Playback (single-clip-at-a-time)
  // ----------------------------------------------------
  let currentAudio = null;

  function stopCurrent() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (_) {}
      currentAudio = null;
    }
  }

  async function speakInternal(text) {
    const t = normalize(text);
    if (!t) return;

    // Tapping speak while audio plays should replace, not stack.
    stopCurrent();

    let hash;
    try {
      hash = await sha1Hex16(t);
    } catch (e) {
      console.warn("[CivicReading] hash failed:", e);
      return;
    }

    const url = `${getAudioBase()}/${hash}.mp3`;
    const audio = new Audio(url);
    currentAudio = audio;

    audio.addEventListener("ended", () => {
      if (currentAudio === audio) currentAudio = null;
    });
    audio.addEventListener("error", () => {
      console.warn("[CivicReading] audio load failed:", url, "for text:", t);
      if (currentAudio === audio) currentAudio = null;
    });

    try {
      await audio.play();
    } catch (e) {
      console.warn("[CivicReading] play failed:", e.name || e);
      if (currentAudio === audio) currentAudio = null;
    }
  }

  // ----------------------------------------------------
  // Toggle (mirrors reading.js behavior)
  // ----------------------------------------------------
  function toggle() {
    enabled = !enabled;
    settings.reading = enabled;
    saveSettings(settings);

    const btn = document.getElementById("readingToggle");
    if (btn) btn.textContent = enabled ? "🔊" : "🔇";

    if (enabled) {
      // Reload so engine-dkpr.js re-renders with inline speaker buttons
      // visible next to questions and options. Matches old reading.js.
      setTimeout(() => window.location.reload(), 150);
    }
    // No reload on OFF — inline speaker buttons can stay visible until
    // next render; they just become no-ops because speak() bails when
    // !enabled. Identical to the old behavior.
  }

  // ----------------------------------------------------
  // Initialization — bind the sidebar toggle button
  // ----------------------------------------------------
  function init() {
    const btn = document.getElementById("readingToggle");
    if (!btn) return; // pages without the toggle (e.g. login, help) — skip

    btn.textContent = enabled ? "🔊" : "🔇";
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      toggle();
    });
  }

  // Run init now if DOM is ready, otherwise wait for DOMContentLoaded.
  // (This script tag may load before or after parsing — handle both.)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ----------------------------------------------------
  // Public API — identical signature to the old reading.js
  // ----------------------------------------------------
  window.CivicReading = {
    isEnabled: () => enabled,
    speak(text) {
      if (!enabled) return;
      speakInternal(text);
    },
    stop: stopCurrent,
  };
})();
