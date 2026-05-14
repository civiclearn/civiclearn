/* CivicLearn — Reading Assist (MP3-based)
   ─────────────────────────────────────────
   Replaces the previous SpeechSynthesis-based CivicReading. Looks up a
   pre-generated MP3 for each text by SHA-1 hash (first 16 hex chars) and
   plays it. Same .speak(text) signature, so engine-dkpr.js needs no edits.

   The hash derivation here MUST match generate-audio-dkpr.py exactly:
     sha1(normalize(text)).slice(0, 16)
   where normalize = trim + collapse internal whitespace.

   MP3 path: /medborgerskab/audio/da/{hash}.mp3
*/
(function () {
  "use strict";

  const AUDIO_BASE = "/medborgerskab/audio/da";

  let currentAudio = null;

  function normalize(s) {
    // Match Python's " ".join(s.split()) — trim ends, collapse runs of any
    // whitespace (spaces, tabs, newlines) to single spaces.
    return String(s || "").split(/\s+/).filter(Boolean).join(" ");
  }

  async function sha1Hex16(s) {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 16);
  }

  function stopCurrent() {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (e) { /* ignore */ }
      currentAudio = null;
    }
  }

  async function speak(text) {
    const t = normalize(text);
    if (!t) return;

    // Tapping the speak button while audio is already playing should stop it,
    // not stack a second clip on top.
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
      // Common on mobile if speak() is called without a user gesture, but
      // every speak() in this app IS bound to a click handler, so this
      // should only fire on genuine errors. Don't spam console.
      console.warn("[CivicReading] play failed:", e.name);
      if (currentAudio === audio) currentAudio = null;
    }
  }

  function stop() {
    stopCurrent();
  }

  window.CivicReading = { speak, stop };
})();
