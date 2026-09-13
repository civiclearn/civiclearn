/* ────────────────────────────────────────────────────────
   CivicLearn Dashboard — sidebar extras + message slot (Luxembourg)

   Two ideas:
   1. ENTITLEMENTS live in the sidebar ("Vos ressources"): audio course,
      revision sheets, bundle product. Permanent, zero space on the canvas.
   2. ONE MESSAGE SLOT on the canvas shows at most one message, by priority:
        site notice (Supabase site_notices)      priority from the row
        audio course not yet activated           80
        revision sheets not yet downloaded       60
        Sproochentest cross-sell                 30
      Each message has its own "done" condition, so the slot empties itself.
      If several are live, a small "1/2 ›" pager lets the user peek at the rest.
   ──────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var lang = ["fr", "de", "en"].indexOf(window.CIVICEDGE_LANG) >= 0 ? window.CIVICEDGE_LANG : "fr";
  var BUCKET = "lux-materials";
  var FILES = {
    fr: { path: "fiches-revision/lu-fiches-revision-2026-27.pdf",    name: "CivicLearn-fiches-revision-vivre-ensemble-2026-27-FR.pdf" },
    en: { path: "fiches-revision/lu-fiches-revision-2026-27-en.pdf", name: "CivicLearn-revision-sheets-vivre-ensemble-2026-27-EN.pdf" },
    de: { path: "fiches-revision/lu-fiches-revision-2026-27-de.pdf", name: "CivicLearn-Lernblaetter-vivre-ensemble-2026-27-DE.pdf" }
  };
  var KEY_FICHES_DONE = "cl_lu_fiches_downloaded";
  var KEY_XSELL_SNOOZE = "cl_lu_xsell_snooze_until";
  var XSELL_SNOOZE_DAYS = 30;

  var T = {
    fr: {
      extras: "Vos ressources", fiches: "Fiches de révision", audio: "Cours audio", bundle: "Sproochentest",
      fichesTitle: "Vos fiches de révision sont prêtes", fichesText: "6 aide-mémoire visuels – l'essentiel du programme en un coup d'œil, à l'écran ou imprimé en A4.",
      fichesGo: "Télécharger le PDF →", fichesBusy: "Chargement…", fichesOther: "Aussi en", fichesErr: "Impossible de récupérer le fichier. Réessayez ou contactez-nous via Aide & contact.",
      audioTitle: "Activez votre cours audio « Vivre ensemble »", audioText: "24 leçons dans Telegram, une par jour (≈10 min) – incluses dans votre accès.",
      audioGo: "Activer →", audioNavDone: "Ouvrir dans Telegram",
      xsellTitle: "Sproochentest Training – 10 simulations complètes", xsellText: "Prix normal 69 €. En tant que client existant, seulement 30 €.", xsellGo: "Ajouter →",
      later: "Plus tard", names: { fr: "Français", en: "English", de: "Deutsch" }
    },
    de: {
      extras: "Ihre Extras", fiches: "Lernblätter", audio: "Audiokurs", bundle: "Sproochentest",
      fichesTitle: "Ihre Lernblätter sind bereit", fichesText: "6 visuelle Übersichten – das Wesentliche des Programms auf einen Blick, am Bildschirm oder als A4-Ausdruck.",
      fichesGo: "PDF herunterladen →", fichesBusy: "Wird geladen…", fichesOther: "Auch auf", fichesErr: "Die Datei konnte nicht geladen werden. Versuchen Sie es erneut oder kontaktieren Sie uns über Hilfe & Kontakt.",
      audioTitle: "Aktivieren Sie Ihren Audiokurs „Vivre ensemble“", audioText: "24 Lektionen in Telegram, eine pro Tag (≈10 Min.) – in Ihrem Zugang enthalten.",
      audioGo: "Aktivieren →", audioNavDone: "In Telegram öffnen",
      xsellTitle: "Sproochentest-Training – 10 komplette Simulationen", xsellText: "Normalpreis 69 €. Als bestehender Kunde nur 30 €.", xsellGo: "Hinzufügen →",
      later: "Später", names: { fr: "Français", en: "English", de: "Deutsch" }
    },
    en: {
      extras: "Your extras", fiches: "Revision sheets", audio: "Audio course", bundle: "Sproochentest",
      fichesTitle: "Your revision sheets are ready", fichesText: "6 visual summaries – the essentials of the syllabus at a glance, on screen or printed in A4.",
      fichesGo: "Download PDF →", fichesBusy: "Fetching…", fichesOther: "Also in", fichesErr: "Could not fetch the file. Try again or contact us via Help & Contact.",
      audioTitle: "Activate your “Vivre ensemble” audio course", audioText: "24 lessons in Telegram, one a day (≈10 min) – included in your access.",
      audioGo: "Activate →", audioNavDone: "Open in Telegram",
      xsellTitle: "Sproochentest Training – 10 complete simulations", xsellText: "Normal price €69. As an existing customer, only €30.", xsellGo: "Add →",
      later: "Later", names: { fr: "Français", en: "English", de: "Deutsch" }
    }
  }[lang];

  var $ = function (id) { return document.getElementById(id); };
  var sb = null;

  // ── helpers ──────────────────────────────────────────
  async function downloadFiches(l, btn) {
    l = FILES[l] ? l : lang;
    var label = btn ? btn.textContent : null;
    if (btn) { btn.setAttribute("aria-busy", "1"); btn.textContent = T.fichesBusy; }
    try {
      var r = await sb.storage.from(BUCKET).createSignedUrl(FILES[l].path, 600, { download: FILES[l].name });
      if (r.error || !r.data) throw r.error || new Error("no url");
      try { localStorage.setItem(KEY_FICHES_DONE, String(Date.now())); } catch (e) {}
      window.location.href = r.data.signedUrl;
      // the fiches message is done now → refresh the slot
      setTimeout(render, 500);
    } catch (e) {
      alert(T.fichesErr);
    } finally { if (btn) { btn.removeAttribute("aria-busy"); btn.textContent = label; } }
  }

  function snoozed(key) {
    try { var until = parseInt(localStorage.getItem(key) || "0", 10); return until && Date.now() < until; } catch (e) { return false; }
  }

  // ── data: entitlements + notices ─────────────────────
  var state = { session: null, audio: null /* {link, claimed} */, bundle: false, xsell: false, notices: [] };

  async function loadState() {
    if (window.luxAuth && window.luxAuth.ready) await window.luxAuth.ready;
    sb = window.luxAuth && window.luxAuth.supabase;
    if (!sb) return;
    var sess = await sb.auth.getSession();
    state.session = sess && sess.data && sess.data.session;
    if (!state.session) return;
    var email = state.session.user && state.session.user.email;
    var userId = window.luxAuth.userId || state.session.user.id;

    // bundle (cached flag first)
    state.bundle = localStorage.getItem("cl_bundle") === "lu";
    var tasks = [];

    if (!state.bundle) tasks.push((async function () {
      try {
        var r = await sb.from("users").select("bundle").eq("id", userId).maybeSingle();
        if (r.data && r.data.bundle === "lux") { localStorage.setItem("cl_bundle", "lu"); state.bundle = true; }
      } catch (e) {}
    })());

    // audio course entitlement (403 = not entitled)
    if (email) tasks.push((async function () {
      try {
        var res = await fetch(window.SUPABASE_URL + "/functions/v1/lux-bot-link", {
          method: "POST", headers: { "Content-Type": "application/json", "apikey": window.SUPABASE_KEY },
          body: JSON.stringify({ email: email })
        });
        if (!res.ok) return;
        var d = await res.json();
        if (d && d.entitled && d.link) state.audio = { link: d.link, claimed: !!d.claimed };
      } catch (e) {}
    })());

    // site notices for this product (same table and dismiss keys as maintenance-bar.js)
    tasks.push((async function () {
      try {
        var r = await sb.from("site_notices").select("id,type,targets,messages,priority,expires_at,cta").eq("enabled", true);
        var rows = (r.data || []).filter(function (n) {
          var t = n.targets || [];
          if (t.indexOf("*") < 0 && t.indexOf("lux") < 0) return false;
          if (n.expires_at && new Date(n.expires_at) < new Date()) return false;
          if (localStorage.getItem("civiclearn_notice_dismissed_" + n.id)) return false;
          return true;
        });
        state.notices = rows;
      } catch (e) {}
    })());

    await Promise.all(tasks);
    state.xsell = !state.bundle && window.stAddon ? await window.stAddon.eligible() : false;
  }

  // ── sidebar extras ───────────────────────────────────
  function renderNav() {
    var group = $("navExtras"); if (!group || !state.session) return;
    $("navExtrasLabel").textContent = T.extras;

    var f = $("navFiches");
    f.querySelector("span").textContent = T.fiches;
    f.onclick = function (ev) { ev.preventDefault(); downloadFiches(lang, f.querySelector("span")); };

    var a = $("navAudio");
    if (state.audio) {
      a.querySelector("span").textContent = T.audio;
      a.href = state.audio.link; a.style.display = "";
      $("navAudioDot").style.display = state.audio.claimed ? "none" : "";
      a.title = state.audio.claimed ? T.audioNavDone : T.audioGo;
    } else a.style.display = "none";

    var b = $("navBundle");
    b.querySelector("span").textContent = T.bundle;
    b.style.display = state.bundle ? "" : "none";

    group.style.display = "";
  }

  // ── message slot ─────────────────────────────────────
  function buildMessages() {
    var list = [];

    state.notices.forEach(function (n) {
      var msg = (n.messages && (n.messages[lang] || n.messages.fr || n.messages.en)) || "";
      if (!msg) return;
      var cta = n.cta && n.cta.url ? { href: n.cta.url, label: (n.cta.label && (n.cta.label[lang] || n.cta.label.fr || n.cta.label.en)) || "→", newTab: true } : null;
      list.push({
        id: "notice-" + n.id, prio: 100 + (n.priority || 0), type: n.type || "info",
        icon: n.type === "warning" || n.type === "outage" ? "⚠️" : (n.type === "success" ? "✅" : "ℹ️"),
        title: "", text: msg, cta: cta,
        dismiss: function () { try { localStorage.setItem("civiclearn_notice_dismissed_" + n.id, "1"); } catch (e) {} }
      });
    });

    if (state.audio && !state.audio.claimed) list.push({
      id: "audio", prio: 80, type: "info", icon: "🎧", title: T.audioTitle, text: T.audioText,
      cta: { href: state.audio.link, label: T.audioGo, newTab: true }
    });

    if (!localStorage.getItem(KEY_FICHES_DONE)) list.push({
      id: "fiches", prio: 60, type: "info", icon: "📄", title: T.fichesTitle, text: T.fichesText,
      cta: { label: T.fichesGo, onClick: function (btn) { downloadFiches(lang, btn); } },
      extra: Object.keys(FILES).filter(function (l) { return l !== lang; })
    });

    if (state.xsell && !snoozed(KEY_XSELL_SNOOZE)) list.push({
      id: "xsell", prio: 30, type: "promo", icon: "🗣️", title: T.xsellTitle, text: T.xsellText,
      cta: { label: T.xsellGo, onClick: function () { window.stAddon.open(); } },
      dismiss: function () { try { localStorage.setItem(KEY_XSELL_SNOOZE, String(Date.now() + XSELL_SNOOZE_DAYS * 86400000)); } catch (e) {} }
    });

    list.sort(function (a, b) { return b.prio - a.prio; });
    return list;
  }

  var idx = 0;
  function render() {
    var slot = $("dbSlot"); if (!slot) return;
    var msgs = buildMessages();
    if (!msgs.length) { slot.style.display = "none"; return; }
    if (idx >= msgs.length) idx = 0;
    var m = msgs[idx];

    slot.className = "db-slot anim d2 db-slot-" + m.type;
    $("dbSlotIcon").textContent = m.icon;
    var textEl = $("dbSlotText"); textEl.innerHTML = "";
    if (m.title) { var st = document.createElement("strong"); st.textContent = m.title; textEl.appendChild(st); }
    textEl.appendChild(document.createTextNode(m.text));
    if (m.extra && m.extra.length) {
      var ex = document.createElement("span"); ex.className = "db-slot-extra"; ex.textContent = T.fichesOther + " ";
      m.extra.forEach(function (l) {
        var a = document.createElement("a"); a.href = "#"; a.textContent = T.names[l];
        a.onclick = function (ev) { ev.preventDefault(); downloadFiches(l, a); };
        ex.appendChild(a);
      });
      textEl.appendChild(ex);
    }

    var go = $("dbSlotGo");
    go.onclick = null; go.removeAttribute("target"); go.removeAttribute("rel");
    if (m.cta) {
      go.style.display = ""; go.textContent = m.cta.label;
      if (m.cta.href) { go.href = m.cta.href; if (m.cta.newTab) { go.target = "_blank"; go.rel = "noopener"; } }
      else { go.href = "#"; go.onclick = function (ev) { ev.preventDefault(); m.cta.onClick(go); }; }
    } else go.style.display = "none";

    var d = $("dbSlotDismiss");
    if (m.dismiss) {
      d.style.display = ""; d.title = T.later;
      d.onclick = function () { m.dismiss(); render(); };
    } else d.style.display = "none";

    var pager = $("dbSlotPager");
    if (msgs.length > 1) {
      pager.style.display = ""; $("dbSlotCount").textContent = (idx + 1) + "/" + msgs.length;
      $("dbSlotPrev").onclick = function () { idx = (idx - 1 + msgs.length) % msgs.length; render(); };
      $("dbSlotNext").onclick = function () { idx = (idx + 1) % msgs.length; render(); };
    } else pager.style.display = "none";

    slot.style.display = "";
  }

  // bundle bought from the modal → update nav + slot without reload
  window.addEventListener("cl:bundle-activated", function () { state.bundle = true; state.xsell = false; renderNav(); render(); });

  async function init() {
    try { await loadState(); } catch (e) {}
    renderNav();
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
