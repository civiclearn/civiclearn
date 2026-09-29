/* ============================================================
   CivicLearn — World Challenge invitation
   Shown once per product when a learner masters 100% of the questions,
   plus a small inline link after a passed mock exam.
   Links to civiclearn.com/insights/hardest-citizenship-questions
   Usage (all calls are safe to repeat):
     CLWorldChallenge.celebrate()      → modal, once per product per browser
     CLWorldChallenge.inline(element)  → appends a small link inside element
   ============================================================ */
(function () {
  if (window.CLWorldChallenge) return;

  var URL_BASE = "https://civiclearn.com/insights/hardest-citizenship-questions";
  var FLAGS = ["dk", "lu", "ca", "ro", "se", "ch", "es", "fr", "at", "cy", "gb", "au", "fi", "lt", "pt", "sk"];

  var T = {
    en: { title: "You've mastered every question!", sub: "You're ready for the test.", body: "One last challenge: the hardest questions from 16 countries' citizenship tests. How many citizenships can you earn?", note: "", cta: "Take the world challenge →", later: "Maybe later", inline: "Passed! Now try the hardest citizenship questions in the world →" },
    da: { title: "Du mestrer alle spørgsmålene!", sub: "Du er klar til prøven.", body: "En sidste udfordring: de sværeste spørgsmål fra 16 landes statsborgerskabsprøver. Hvor mange statsborgerskaber kan du vinde?", note: "Udfordringen er på engelsk.", cta: "Tag verdensudfordringen →", later: "Måske senere", inline: "Bestået! Prøv nu verdens sværeste statsborgerskabsspørgsmål →" },
    fr: { title: "Vous maîtrisez toutes les questions !", sub: "Vous êtes prêt(e) pour l'examen.", body: "Un dernier défi : les questions les plus difficiles des tests de citoyenneté de 16 pays. Combien de citoyennetés pouvez-vous obtenir ?", note: "Le défi est en anglais.", cta: "Relever le défi mondial →", later: "Plus tard", inline: "Réussi ! Essayez maintenant les questions de citoyenneté les plus difficiles du monde →" },
    de: { title: "Sie beherrschen alle Fragen!", sub: "Sie sind bereit für den Test.", body: "Eine letzte Herausforderung: die schwierigsten Fragen aus den Staatsbürgerschaftstests von 16 Ländern. Wie viele Staatsbürgerschaften erreichen Sie?", note: "Die Challenge ist auf Englisch.", cta: "Zur Welt-Challenge →", later: "Später", inline: "Bestanden! Jetzt die schwierigsten Staatsbürgerschaftsfragen der Welt ausprobieren →" },
    sv: { title: "Du behärskar alla frågor!", sub: "Du är redo för provet.", body: "En sista utmaning: de svåraste frågorna från 16 länders medborgarskapsprov. Hur många medborgarskap kan du ta?", note: "Utmaningen är på engelska.", cta: "Anta världsutmaningen →", later: "Kanske senare", inline: "Godkänd! Testa nu världens svåraste medborgarskapsfrågor →" },
    fi: { title: "Hallitset kaikki kysymykset!", sub: "Olet valmis kokeeseen.", body: "Vielä yksi haaste: 16 maan kansalaisuuskokeiden vaikeimmat kysymykset. Kuinka monta kansalaisuutta ansaitset?", note: "Haaste on englanniksi.", cta: "Ota maailmanhaaste vastaan →", later: "Ehkä myöhemmin", inline: "Hyväksytty! Kokeile nyt maailman vaikeimpia kansalaisuuskysymyksiä →" },
    el: { title: "Κατακτήσατε όλες τις ερωτήσεις!", sub: "Είστε έτοιμοι για την εξέταση.", body: "Μια τελευταία πρόκληση: οι πιο δύσκολες ερωτήσεις από τις εξετάσεις ιθαγένειας 16 χωρών. Πόσες ιθαγένειες μπορείτε να κερδίσετε;", note: "Η πρόκληση είναι στα αγγλικά.", cta: "Δεχτείτε την παγκόσμια πρόκληση →", later: "Ίσως αργότερα", inline: "Επιτυχία! Δοκιμάστε τώρα τις πιο δύσκολες ερωτήσεις ιθαγένειας στον κόσμο →" },
    ru: { title: "Вы освоили все вопросы!", sub: "Вы готовы к экзамену.", body: "Последнее испытание: самые сложные вопросы из экзаменов на гражданство 16 стран. Сколько гражданств вы сможете получить?", note: "Испытание на английском языке.", cta: "Принять мировой вызов →", later: "Может быть, позже", inline: "Сдано! Теперь попробуйте самые сложные вопросы на гражданство в мире →" },
    pt: { title: "Domina todas as perguntas!", sub: "Está pronto(a) para o teste.", body: "Um último desafio: as perguntas mais difíceis dos testes de cidadania de 16 países. Quantas cidadanias consegue conquistar?", note: "O desafio é em inglês.", cta: "Aceitar o desafio mundial →", later: "Talvez mais tarde", inline: "Aprovado! Experimente agora as perguntas de cidadania mais difíceis do mundo →" },
    sk: { title: "Ovládate všetky otázky!", sub: "Ste pripravení na skúšku.", body: "Posledná výzva: najťažšie otázky z testov na občianstvo zo 16 krajín. Koľko občianstiev získate?", note: "Výzva je v angličtine.", cta: "Prijať svetovú výzvu →", later: "Možno neskôr", inline: "Úspech! Teraz vyskúšajte najťažšie otázky o občianstve na svete →" },
    es: { title: "¡Dominas todas las preguntas!", sub: "Estás listo/a para el examen.", body: "Un último reto: las preguntas más difíciles de los exámenes de ciudadanía de 16 países. ¿Cuántas ciudadanías puedes conseguir?", note: "El reto está en inglés.", cta: "Aceptar el reto mundial →", later: "Quizá más tarde", inline: "¡Aprobado! Prueba ahora las preguntas de ciudadanía más difíciles del mundo →" },
    ro: { title: "Stăpânești toate întrebările!", sub: "Ești pregătit(ă) pentru interviu.", body: "O ultimă provocare: cele mai grele întrebări din testele de cetățenie a 16 țări. Câte cetățenii poți câștiga?", note: "Provocarea este în limba engleză.", cta: "Acceptă provocarea mondială →", later: "Poate mai târziu", inline: "Admis! Încearcă acum cele mai grele întrebări de cetățenie din lume →" },
    lt: { title: "Įvaldėte visus klausimus!", sub: "Esate pasiruošę egzaminui.", body: "Paskutinis iššūkis: sunkiausi 16 šalių pilietybės egzaminų klausimai. Kiek pilietybių galite laimėti?", note: "Iššūkis vyksta anglų kalba.", cta: "Priimti pasaulio iššūkį →", later: "Galbūt vėliau", inline: "Išlaikyta! Dabar išbandykite sunkiausius pasaulio pilietybės klausimus →" }
  };

  function product() {
    var seg = (location.pathname.split("/")[1] || "civiclearn").toLowerCase();
    if (seg === "france") seg += "-" + (location.pathname.split("/")[2] || "");
    return seg.replace(/[^a-z0-9-]/g, "") || "civiclearn";
  }
  function lang() {
    var l = (window.CIVICEDGE_LANG || document.documentElement.lang || "en").toLowerCase().slice(0, 2);
    if (l === "ch") l = "fr"; // Geneva dashboard is French
    return T[l] ? l : "en";
  }
  function link(medium) {
    return URL_BASE + "?utm_source=" + encodeURIComponent(product()) + "&utm_medium=" + medium + "&utm_campaign=world-challenge";
  }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }
  function accent() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      return v || "#0d7377";
    } catch (e) { return "#0d7377"; }
  }

  function injectStyles() {
    if (document.getElementById("clwc-style")) return;
    var s = document.createElement("style");
    s.id = "clwc-style";
    s.textContent =
      ".clwc-overlay{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .3s}" +
      ".clwc-overlay.show{opacity:1}" +
      ".clwc-overlay *{box-sizing:border-box}" +
      ".clwc-card{background:#fff;color:#111;border-radius:20px;max-width:440px;width:100%;padding:28px 26px 22px;box-shadow:0 20px 60px rgba(0,0,0,.25);text-align:center;font-family:inherit;transform:translateY(12px) scale(.97);transition:transform .35s}" +
      ".clwc-overlay.show .clwc-card{transform:none}" +
      ".clwc-emoji{font-size:44px;line-height:1;margin-bottom:10px}" +
      ".clwc-title{font-size:21px;font-weight:700;margin:0 0 4px;letter-spacing:-.01em}" +
      ".clwc-sub{font-size:14.5px;color:#555;margin:0 0 18px}" +
      ".clwc-box{background:#f7f7f5;border-radius:14px;padding:16px 16px 14px;margin-bottom:18px}" +
      ".clwc-flags{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;max-width:232px;margin:0 auto 12px}" +
      ".clwc-flags img{width:24px;height:16px;object-fit:cover;border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.1)}" +
      ".clwc-body{font-size:14.5px;line-height:1.5;margin:0;color:#222}" +
      ".clwc-note{font-size:12px;color:#777;margin:8px 0 0}" +
      ".clwc-cta{display:block;width:100%;padding:13px 16px;border-radius:999px;border:0;color:#fff;font-weight:600;font-size:15px;text-decoration:none;cursor:pointer;font-family:inherit}" +
      ".clwc-cta:hover{filter:brightness(1.08)}" +
      ".clwc-later{background:none;border:0;color:#777;font-size:13.5px;margin-top:10px;cursor:pointer;font-family:inherit;padding:6px}" +
      ".clwc-inline{margin-top:14px;font-size:14px}" +
      ".clwc-inline a{font-weight:600;text-decoration:none}" +
      ".clwc-inline a:hover{text-decoration:underline}";
    document.head.appendChild(s);
  }

  function celebrate() {
    var key = "cl_world_challenge_" + product();
    if (store(key)) return;
    store(key, "1");
    setTimeout(show, 1400); // let the confetti play first
  }

  function show() {
    injectStyles();
    var t = T[lang()], col = accent();
    var ov = document.createElement("div");
    ov.className = "clwc-overlay";
    ov.setAttribute("role", "dialog");
    ov.setAttribute("aria-modal", "true");
    ov.innerHTML =
      '<div class="clwc-card">' +
        '<div class="clwc-emoji">🎉</div>' +
        '<h2 class="clwc-title"></h2>' +
        '<p class="clwc-sub"></p>' +
        '<div class="clwc-box">' +
          '<div class="clwc-flags">' + FLAGS.map(function (f) { return '<img src="https://flagcdn.com/' + f + '.svg" alt="">'; }).join("") + '</div>' +
          '<p class="clwc-body"></p>' +
          (t.note ? '<p class="clwc-note"></p>' : "") +
        '</div>' +
        '<a class="clwc-cta" target="_blank" rel="noopener"></a>' +
        '<button type="button" class="clwc-later"></button>' +
      '</div>';
    ov.querySelector(".clwc-title").textContent = t.title;
    ov.querySelector(".clwc-sub").textContent = t.sub;
    ov.querySelector(".clwc-body").textContent = t.body;
    if (t.note) ov.querySelector(".clwc-note").textContent = t.note;
    var cta = ov.querySelector(".clwc-cta");
    cta.textContent = t.cta;
    cta.href = link("celebration");
    cta.style.background = col;
    var later = ov.querySelector(".clwc-later");
    later.textContent = t.later;

    function close() {
      ov.classList.remove("show");
      document.removeEventListener("keydown", onKey);
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 300);
    }
    function onKey(e) { if (e.key === "Escape") close(); }
    later.onclick = close;
    cta.addEventListener("click", function () { setTimeout(close, 100); });
    ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
    document.addEventListener("keydown", onKey);

    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add("show"); });
    setTimeout(function () { cta.focus(); }, 350);
  }

  function inline(el) {
    if (!el || el.querySelector(".clwc-inline")) return;
    injectStyles();
    var t = T[lang()];
    var p = document.createElement("p");
    p.className = "clwc-inline";
    var a = document.createElement("a");
    a.href = link("mock-exam-passed");
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "🌍 " + t.inline;
    a.style.color = accent();
    p.appendChild(a);
    el.appendChild(p);
  }

  window.CLWorldChallenge = { celebrate: celebrate, inline: inline, show: show };
})();
