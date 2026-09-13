/* ────────────────────────────────────────────────────────
   CivicLearn Dashboard — sidebar extras + message slot (Denmark / indfødsret)

   1. ENTITLEMENTS live in the sidebar ("Dine ressourcer"): the printable
      revisionssæt (every logged-in user) and the Dansk 3 dashboard (bundle
      owners only). Permanent, zero space on the canvas.
   2. ONE MESSAGE SLOT on the canvas shows at most one message, by priority:
        site notice (Supabase site_notices)         100 + row priority
        revisionssæt not yet downloaded              60
        Prøve i Dansk 3 add-on (non-bundle users)    30   dismiss → 30-day snooze
        personalised recommendation                  10   always present (fallback)
      Each message has its own "done" condition, so the slot empties itself
      down to the recommendation. With several live, a "1/2 ›" pager lets the
      user peek at the rest.

   Replaces: bundle-banner, pd3-addon-banner, rs-card, recommendCard and
   maintenance-bar.js on this page. Reads only — never writes to `users`.
   ──────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var BUCKET = "dk-materials";
  var RS_PATH = "revisionssaet/dk-revisionssaet-2026.pdf";
  var RS_NAME = "CivicLearn-revisionssaet-indfodsret-2026.pdf";
  var PD3_CODE = "PD3DIS26";
  var PD3_URL = "https://dansk3.dk/";

  var KEY_RS_DONE = "cl_dk_rs_downloaded";
  var KEY_PD3_DISMISSED = "pd3_banner_dismissed";       // legacy flag from the old banner — still honoured (never again)
  var KEY_PD3_SNOOZE = "cl_dk_pd3_snooze_until";
  var PD3_SNOOZE_DAYS = 30;
  var NOTICE_TARGETS = ["*", "indfodsret", "denmark", "dk"];

  var T = {
    rsTitle: "Dit revisionssæt er klar",
    rsText: "6 visuelle oversigter – det vigtigste på ét blik, på skærmen eller printet i A4.",
    rsGo: "Hent PDF →", rsBusy: "Henter…",
    rsErr: "Kunne ikke hente filen. Prøv igen, eller kontakt os via Hjælp & Kontakt.",
    pd3Title: "Har du også brug for Prøve i Dansk 3?",
    pd3Text: "10 komplette simulationer · alle 9 delprøver · 7-trins evaluering · Normalpris 899 kr.",
    pd3CodeLabel: "Din rabatkode:", pd3Show: "Vis kode", pd3Copied: "Kopieret ✓", pd3Go: "Gå til Dansk 3 →",
    later: "Senere"
  };

  var $ = function (id) { return document.getElementById(id); };
  var sb = null;

  // ── helpers ──────────────────────────────────────────
  async function downloadRs(btn) {
    if (!sb) return;
    var label = btn ? btn.textContent : null;
    if (btn) { btn.setAttribute("aria-busy", "1"); btn.textContent = T.rsBusy; }
    try {
      var r = await sb.storage.from(BUCKET).createSignedUrl(RS_PATH, 600, { download: RS_NAME });
      if (r.error || !r.data) throw r.error || new Error("no url");
      try { localStorage.setItem(KEY_RS_DONE, String(Date.now())); } catch (e) {}
      window.location.href = r.data.signedUrl;
      setTimeout(render, 500); // the "download your set" message is done now
    } catch (e) {
      alert(T.rsErr);
    } finally { if (btn) { btn.removeAttribute("aria-busy"); btn.textContent = label; } }
  }

  function snoozed(key) {
    try { var until = parseInt(localStorage.getItem(key) || "0", 10); return until && Date.now() < until; } catch (e) { return false; }
  }
  function flag(key) { try { return !!localStorage.getItem(key); } catch (e) { return false; } }

  // ── data: entitlements + notices + recommendation ────
  var state = { session: null, bundle: false, notices: [], rec: null };

  async function loadState() {
    if (window.denmarkAuth && window.denmarkAuth.ready) await window.denmarkAuth.ready;
    sb = window.denmarkAuth && window.denmarkAuth.supabase;
    if (!sb) return;
    var sess = await sb.auth.getSession();
    state.session = sess && sess.data && sess.data.session;
    if (!state.session) return;
    var userId = window.denmarkAuth.userId || state.session.user.id;

    try { state.bundle = localStorage.getItem("cl_bundle") === "dk"; } catch (e) {}
    var tasks = [];

    if (!state.bundle) tasks.push((async function () {
      try {
        var r = await sb.from("users").select("bundle").eq("id", userId).maybeSingle();
        if (r.data && r.data.bundle === "dk") { try { localStorage.setItem("cl_bundle", "dk"); } catch (e) {} state.bundle = true; }
      } catch (e) {}
    })());

    // site notices for this product (same table and dismiss keys as maintenance-bar.js)
    tasks.push((async function () {
      try {
        var r = await sb.from("site_notices").select("id,type,targets,messages,priority,expires_at,cta").eq("enabled", true);
        state.notices = (r.data || []).filter(function (n) {
          var t = n.targets || [];
          if (!t.some(function (x) { return NOTICE_TARGETS.indexOf(x) >= 0; })) return false;
          if (n.expires_at && new Date(n.expires_at) < new Date()) return false;
          if (flag("civiclearn_notice_dismissed_" + n.id)) return false;
          return true;
        });
      } catch (e) {}
    })());

    await Promise.all(tasks);
  }

  // Personalised recommendation (was recommendCard): A new user → Officielle,
  // B everything mastered → simulation, C weakest topic. Needs engine + bank.
  function normalizeLabel(str) {
    return (str || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");
  }
  async function loadRecommendation() {
    var E = window.CivicEdgeEngine;
    if (!E || !E.ensureBankLoaded) return;
    try { await E.ensureBankLoaded(); } catch (e) { return; }
    var bank = E.getBank ? E.getBank() : [];
    if (!bank.length) return;

    var progress = {};
    try { progress = JSON.parse(localStorage.getItem("civicedge_progress") || "{}"); } catch (e) {}

    if (!Object.keys(progress).length) {
      state.rec = { icon: "👋", html: "Velkommen! Vi anbefaler at starte med <strong>Officielle prøvespørgsmål</strong> — det er det vigtigste materiale.", label: "Start →", href: "official.html" };
      return;
    }

    var cfg = window.CIVICEDGE_CONFIG || {};
    var topicLabels = (cfg.topics && cfg.topics.topicLabels) || {};
    var stats = {};
    Object.keys(topicLabels).forEach(function (k) { stats[k] = { label: topicLabels[k] || k, total: 0, mastered: 0 }; });
    var norm = {};
    Object.keys(topicLabels).forEach(function (k) { norm[normalizeLabel(topicLabels[k])] = k; });

    bank.forEach(function (q) {
      if (q.depth === "deep") return;
      var k = norm[normalizeLabel(q.topic || "")];
      if (!k || !stats[k]) return;
      stats[k].total++;
      var e = progress[(q.topic || "topic") + ":" + (q.q || "")];
      if (e && (e.correct === 1 || e.rights > 0)) stats[k].mastered++;
    });

    var weakestKey = null, weakestPct = 101;
    Object.keys(stats).forEach(function (k) {
      var s = stats[k]; if (!s.total) return;
      var pct = s.mastered / s.total * 100;
      if (pct >= 100) return;
      if (pct < weakestPct) { weakestPct = pct; weakestKey = k; }
    });

    if (weakestKey === null) {
      state.rec = { icon: "🏆", html: "Du har mestret alle emner. Test dig selv med en <strong>prøvesimulation</strong>.", label: "Start simulation →", href: "simulation.html" };
      return;
    }
    var w = stats[weakestKey];
    var safe = String(w.label).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    state.rec = { icon: "🎯", html: "Dit svageste emne er <strong>" + safe + "</strong> (" + Math.round(weakestPct) + " %). Brug 10 minutter på det nu.",
      label: "Øv " + w.label + " →", href: "topics.html?topic=" + encodeURIComponent(weakestKey) };
  }

  // ── sidebar extras ───────────────────────────────────
  function renderNav() {
    var group = $("navExtras"); if (!group || !state.session) return;
    var f = $("navRs");
    if (f) f.onclick = function (ev) { ev.preventDefault(); downloadRs(f.querySelector("span")); };
    var b = $("navBundle");
    if (b) b.style.display = state.bundle ? "" : "none";
    group.style.display = "";
  }

  // ── message slot ─────────────────────────────────────
  function buildMessages() {
    var list = [];

    state.notices.forEach(function (n) {
      var msg = (n.messages && (n.messages.da || n.messages.en)) || "";
      if (!msg) return;
      var cta = n.cta && n.cta.url ? { href: n.cta.url, label: (n.cta.label && (n.cta.label.da || n.cta.label.en)) || "→", newTab: true } : null;
      list.push({
        id: "notice-" + n.id, prio: 100 + (n.priority || 0), type: n.type || "info",
        icon: n.type === "warning" || n.type === "outage" ? "⚠️" : (n.type === "success" ? "✅" : "ℹ️"),
        title: "", text: msg, cta: cta,
        dismiss: function () { try { localStorage.setItem("civiclearn_notice_dismissed_" + n.id, "1"); } catch (e) {} }
      });
    });

    if (state.session && !flag(KEY_RS_DONE)) list.push({
      id: "rs", prio: 60, type: "info", icon: "📄", title: T.rsTitle, text: T.rsText,
      cta: { label: T.rsGo, onClick: function (btn) { downloadRs(btn); } }
    });

    if (state.session && !state.bundle && !flag(KEY_PD3_DISMISSED) && !snoozed(KEY_PD3_SNOOZE)) list.push({
      id: "pd3", prio: 30, type: "promo", icon: "📘", title: T.pd3Title, text: T.pd3Text,
      after: renderPd3Code,
      cta: { href: PD3_URL, label: T.pd3Go, newTab: true },
      dismiss: function () { try { localStorage.setItem(KEY_PD3_SNOOZE, String(Date.now() + PD3_SNOOZE_DAYS * 86400000)); } catch (e) {} }
    });

    if (state.rec) list.push({
      id: "rec", prio: 10, type: "info", icon: state.rec.icon, title: "", html: state.rec.html,
      cta: { href: state.rec.href, label: state.rec.label }
    });

    list.sort(function (a, b) { return b.prio - a.prio; });
    return list;
  }

  // discount code line: masked until "Vis kode", then code + copy
  function renderPd3Code(textEl) {
    var ex = document.createElement("span"); ex.className = "db-slot-extra";
    var lab = document.createTextNode(T.pd3CodeLabel + " ");
    var masked = document.createElement("code"); masked.textContent = "••••••••";
    var show = document.createElement("a"); show.href = "#"; show.textContent = T.pd3Show;
    ex.appendChild(lab); ex.appendChild(masked); ex.appendChild(show);
    show.onclick = function (ev) {
      ev.preventDefault();
      masked.textContent = PD3_CODE; masked.className = "db-slot-code";
      show.textContent = "📋";
      show.title = "Kopiér kode";
      show.onclick = function (ev2) {
        ev2.preventDefault();
        var done = function () { show.textContent = T.pd3Copied; setTimeout(function () { show.textContent = "📋"; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(PD3_CODE).then(done, done); else done();
      };
    };
    textEl.appendChild(ex);
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
    if (m.html) { var sp = document.createElement("span"); sp.innerHTML = m.html; textEl.appendChild(sp); }
    else textEl.appendChild(document.createTextNode(m.text || ""));
    if (m.after) m.after(textEl);

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

  async function init() {
    try { await loadState(); } catch (e) {}
    renderNav();
    render();
    // recommendation depends on the engine/bank — may arrive a moment later
    try { await loadRecommendation(); } catch (e) {}
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
