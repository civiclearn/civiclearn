// === CivicEdge universal audio player ===
(function() {

  const btn = document.getElementById("listenBtn");
  if (!btn) return; // nothing to do if page has no Listen button

  // Create floating player
  const playerBar = document.createElement("div");
  playerBar.id = "playerBar";
  playerBar.style.cssText = `
    display:none;margin-top:24px;background:var(--card);
    border-radius:12px;box-shadow:var(--shadow);
    padding:10px 16px;display:flex;align-items:center;gap:12px;
  `;

  playerBar.innerHTML = `
    <button id="playerToggle" class="btn soft mini">⏸️ Pause</button>
    <div id="playerTitle" class="muted" style="flex:1;">Lecture…</div>
    <audio id="chapterAudio" controls style="flex:2;"></audio>
  `;

  // Insert player at the end of main
  const main = document.querySelector("main");
  if (main) main.appendChild(playerBar);

  // Assign elements
  const player = playerBar.querySelector("#chapterAudio");
  const playerTitle = playerBar.querySelector("#playerTitle");
  const playerToggle = playerBar.querySelector("#playerToggle");

// Set source only — omit title to keep layout clean
const src = btn.dataset.audio;
player.src = src;
playerTitle.remove(); // 🧹 remove the text span entirely


  // Button logic
  btn.addEventListener("click", () => {
    playerBar.style.display = "flex";
    if (player.paused) {
      player.play();
      playerToggle.textContent = "⏸️ Pause";
    } else {
      player.pause();
      playerToggle.textContent = "▶️ Lecture";
    }
  });

  playerToggle.addEventListener("click", () => {
    if (player.paused) {
      player.play();
      playerToggle.textContent = "⏸️ Pause";
    } else {
      player.pause();
      playerToggle.textContent = "▶️ Lecture";
    }
  });

  player.addEventListener("ended", () => {
    playerToggle.textContent = "▶️ Lecture";
  });
})();
