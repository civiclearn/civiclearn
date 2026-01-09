// /assets/js/phase-switch.js
(() => {
  function initPhaseSwitch() {
    const switchEl = document.getElementById("phaseSwitch");
    if (!switchEl) return;

    const infoEl = document.getElementById("phaseSwitchInfo");

    const PHASE_EXAM_ONLY = "exam_only";
    const PHASE_FULL_PREP = "full_prep";

    const STORAGE_ACTIVE = "dk_active_phase";
    const STORAGE_UNLOCKED = "dk_phase2_unlocked";
    const STORAGE_FORCE = "dk_phase2_force_unlocked";

    // Default: locked until mastery reaches 70%
    if (localStorage.getItem(STORAGE_UNLOCKED) === null) {
      localStorage.setItem(STORAGE_UNLOCKED, "false");
    }

    function getActivePhase() {
      const v = localStorage.getItem(STORAGE_ACTIVE);
      return v === PHASE_FULL_PREP ? PHASE_FULL_PREP : PHASE_EXAM_ONLY;
    }

    function setActivePhase(phase) {
      localStorage.setItem(STORAGE_ACTIVE, phase);
    }

    function isPhaseUnlocked() {
      if (localStorage.getItem(STORAGE_FORCE) === "true") return true;
      return localStorage.getItem(STORAGE_UNLOCKED) === "true";
    }

    function getOptions() {
      const coreOpt = switchEl.querySelector('.phase-option[data-phase="exam_only"]');
      const fullOpt = switchEl.querySelector('.phase-option[data-phase="full_prep"]');
      return { coreOpt, fullOpt };
    }

function computeMastery() {
  return Number(window.__ceMastery || 0);
}


    function maybeAutoUnlock() {
      if (isPhaseUnlocked()) return;

      const mastery = computeMastery();
      if (mastery >= 0.7) {
        localStorage.setItem(STORAGE_UNLOCKED, "true");
      }
    }

    function render() {
      // auto-unlock before reading final state
      maybeAutoUnlock();

      const unlocked = isPhaseUnlocked();

      let active = getActivePhase();
      if (active === PHASE_FULL_PREP && !unlocked) {
        active = PHASE_EXAM_ONLY;
        setActivePhase(PHASE_EXAM_ONLY);
      }

      const { coreOpt, fullOpt } = getOptions();
      if (!coreOpt || !fullOpt) return;

      // reset
      switchEl.classList.remove("locked");
      coreOpt.classList.remove("active");
      fullOpt.classList.remove("active");
      fullOpt.classList.remove("disabled");
      fullOpt.removeAttribute("aria-disabled");

      // locked
      if (!unlocked) {
        switchEl.classList.add("locked");
        coreOpt.classList.add("active");
        fullOpt.classList.add("disabled");
        fullOpt.setAttribute("aria-disabled", "true");

        if (infoEl) {
          infoEl.textContent =
            "Kerntesten er afgørende. Når du har mestret mindst 70 % af " +
            "eksamensspørgsmålene, låses fuld forberedelse automatisk op.";
        }
        return;
      }

      // unlocked states
      if (active === PHASE_EXAM_ONLY) {
        coreOpt.classList.add("active");
        if (infoEl) {
          infoEl.textContent =
            "Du har låst fuld forberedelse op. Du kan nu skifte til fuld forberedelse, hvis du ønsker det.";
        }
        return;
      }

      fullOpt.classList.add("active");
      if (infoEl) {
        infoEl.textContent =
          "Du er nu i fuld forberedelse. Her møder du også ekstra og mere avancerede spørgsmål.";
      }
    }

    // bind once
    if (!switchEl.dataset.phaseBound) {
      switchEl.dataset.phaseBound = "1";

      switchEl.addEventListener("click", (e) => {
        const opt = e.target.closest(".phase-option");
        if (!opt || !switchEl.contains(opt)) return;

        const phase = opt.dataset.phase;
        if (!phase) return;

        if (phase === PHASE_FULL_PREP && !isPhaseUnlocked()) return;

        setActivePhase(phase);
        location.reload();
      });
    }

    render();
  }

  // script may be injected after DOMContentLoaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPhaseSwitch);
  } else {
    initPhaseSwitch();
  }
})();
