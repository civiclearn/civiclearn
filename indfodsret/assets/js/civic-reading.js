/* CivicLearn — Reading Assist (MP3-based, /indfodsret/)
   ─────────────────────────────────────────────────────────
   Drop-in replacement for the previous /indfodsret/assets/js/reading.js,
   but plays pre-generated MP3 files instead of using the browser's
   SpeechSynthesis.

   Public API and storage are unchanged from reading.js, so this module is
   wire-compatible with the rest of the system:

     window.CivicReading.isEnabled()  - reads from civicedge_settings.reading
     window.CivicReading.speak(text)  - no-op if disabled; otherwise plays MP3
     window.CivicReading.stop()       - stops any currently playing clip

   The #readingToggle sidebar button is bound here exactly as it was in
   reading.js: clicking it flips civicedge_settings.reading, updates the
   icon (🔊/🔇), and reloads the page when turning ON so engine-dk.js
   re-renders questions with the inline speaker buttons visible.

   MP3 lookup: each pre-generated file is named for the SHA-1 hash (first
   16 hex chars) of the normalized text. The Python generator script
   (generate-audio-indfodsret.py) and this module use the same hashing and
   normalization, so identical text produces identical filenames.

   Files live at /indfodsret/audio/da/{hash}.mp3.

   NOTE: /indfodsret/ is monolingual (the question bank is flat Danish
   strings — q.q for questions, opt.t for options). The medborgerskab
   version of this file has a getAudioBase() helper that resolves to
   /da or /en based on window.CIVICEDGE_LANG. We deliberately drop that
   here: even when the UI is set to English, the question content is
   still Danish, so the audio must be Danish too. If you ever bilingualize
   the indfodsret bank, port the getAudioBase() helper from medborgerskab.
*/
(function () {
  "use strict";

  const LS_KEY = "civicedge_settings";
  const AUDIO_BASE = "/indfodsret/audio/da";

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
    // Mirror generate-audio-indfodsret.py's normalization:
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

    const url = `${AUDIO_BASE}/${hash}.mp3`;
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

    // Reload regardless of direction so engine-dk.js re-renders questions
    // and either adds (enable) or removes (disable) the inline 🔊 buttons.
    // Without the reload on disable, leftover speaker icons stay on screen
    // until the next question loads, which is visually inconsistent — even
    // though they'd be no-ops because speak() bails when !enabled.
    setTimeout(() => window.location.reload(), 150);
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
