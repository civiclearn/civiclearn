// /assets/js/i18n.js
// CivicLearn i18n loader (supports flat and grouped JSON structures)

(function () {
  const I18N = {
    lang: "en",
    dict: {},
    fallbackDict: {},
    ready: false,
    listeners: []
  };

  function detectLang() {
    const htmlLang = (document.documentElement.lang || "").toLowerCase().trim();
    if (htmlLang) {
      // "fr-CA" -> "fr"
      return htmlLang.split("-")[0];
    }
    return "en";
  }

  function flatten(source, target) {
    target = target || {};
    if (!source || typeof source !== "object") return target;

    Object.keys(source).forEach((k) => {
      const val = source[k];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        // Recurse into groups like { nav: { nav_dashboard: "…" } }
        flatten(val, target);
      } else {
        target[k] = val;
      }
    });

    return target;
  }

  async function loadJson(path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error("Failed to load i18n file: " + path);
    return res.json();
  }

  async function loadLanguage(langCode) {
    I18N.lang = langCode || detectLang();

    // Load English as fallback
    try {
      const baseRaw = await loadJson("/assets/i18n/en.json");
      I18N.fallbackDict = flatten(baseRaw);
    } catch (err) {
      console.error("[i18n] Failed to load fallback en.json", err);
      I18N.fallbackDict = {};
    }

    // Load main language
    if (I18N.lang === "en") {
      I18N.dict = I18N.fallbackDict;
    } else {
      try {
        const langRaw = await loadJson(`/assets/i18n/${I18N.lang}.json`);
        I18N.dict = flatten(langRaw);
      } catch (err) {
        console.error("[i18n] Failed to load lang file, using fallback only:", I18N.lang, err);
        I18N.dict = I18N.fallbackDict;
      }
    }

    I18N.ready = true;
    applyToDocument();
    I18N.listeners.forEach((fn) => {
      try { fn(I18N.lang); } catch (e) { console.error(e); }
    });
  }

  function t(key) {
    if (!key) return "";
    if (Object.prototype.hasOwnProperty.call(I18N.dict, key)) {
      return I18N.dict[key];
    }
    if (Object.prototype.hasOwnProperty.call(I18N.fallbackDict, key)) {
      return I18N.fallbackDict[key];
    }
    return key;
  }

  function applyToElement(el) {
    const key = el.getAttribute("data-i18n");
    if (!key) return;

    const attr = el.getAttribute("data-i18n-attr");
    const value = t(key);

    if (attr) {
      // Single attribute, e.g. data-i18n-attr="title"
      el.setAttribute(attr, value);
    } else {
      // Default: replace text content
      el.textContent = value;
    }
  }

function applyToDocument(root) {
  root = root || document;

  // REMOVE hidden class now that translations are ready
  document.documentElement.classList.remove("i18n-hidden");

  const nodes = root.querySelectorAll("[data-i18n]");
  nodes.forEach(applyToElement);
}



  function onReady(callback) {
    if (typeof callback !== "function") return;
    if (I18N.ready) {
      callback(I18N.lang);
    } else {
      I18N.listeners.push(callback);
    }
  }

  // Public API
  const api = {
    init(langCode) {
      return loadLanguage(langCode);
    },
    t,
    apply: applyToDocument,
    onReady,
    get currentLang() {
      return I18N.lang;
    }
  };

  window.CivicLearnI18n = api;
  window.t = t; // convenience for engine.js / flashcards.js
})();
