/* CivicLearn presale homepages: free practice questions.
   One shared engine for every site. Each site only provides its questions and texts
   in /assets/js/hometest-*.js as window.CL_QUIZ = { i18n: {...}, questions: [...] }.
   Multilingual sites give i18n and questions per language ({ en: {...}, el: {...} })
   and switch with window.initQuiz(lang).
   Change the look in presale-home.css, the behaviour here. Raise ?v= on the pages after editing. */
(function () {
  'use strict';
  var PER_ROW = 3;
  var cfg = window.CL_QUIZ;
  if (!cfg) return;

  function multi() {
    return cfg.questions && !Array.isArray(cfg.questions);
  }

  function shuffle(q) {
    var correct = typeof q.correct === 'number' ? q.correct : 0;
    var items = q.a.map(function (t, i) { return { t: t, ok: i === correct }; });
    for (var i = items.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = items[i]; items[i] = items[j]; items[j] = x;
    }
    return {
      q: q.q,
      a: items.map(function (it) { return it.t; }),
      correct: items.findIndex(function (it) { return it.ok; })
    };
  }

  function progressText(t, n, total) {
    if (t.progressFmt) return t.progressFmt.replace('{n}', n).replace('{t}', total);
    return t.progress + ': ' + n + ' / ' + total + (t.questions ? ' ' + t.questions : '');
  }

  function donut(pct) {
    var C = 2 * Math.PI * 40, on = (pct / 100) * C;
    return '<div class="donut-wrapper">' +
      '<svg width="120" height="120" viewBox="0 0 100 100" aria-hidden="true">' +
      '<circle class="donut-track" cx="50" cy="50" r="40" stroke="#efeaff" stroke-width="12" fill="none"></circle>' +
      (pct > 0 ? '<circle class="donut-value" cx="50" cy="50" r="40" stroke="#6d4aff" stroke-width="12" fill="none"' +
        ' stroke-dasharray="' + on.toFixed(2) + ' ' + (C - on).toFixed(2) + '" transform="rotate(-90 50 50)" stroke-linecap="round"></circle>' : '') +
      '</svg><div class="donut-center">' + pct + '%</div></div>';
  }

  function build(lang) {
    var container = document.getElementById('inline-test-questions');
    if (!container) return;

    var t, source;
    if (multi()) {
      if (!lang || !cfg.questions[lang]) lang = cfg.defaultLang || Object.keys(cfg.questions)[0];
      t = cfg.i18n[lang]; source = cfg.questions[lang];
    } else {
      t = cfg.i18n; source = cfg.questions;
    }

    var pool = source.map(shuffle);
    // The result card always takes the free slot next to the last question,
    // so the last row needs exactly one free slot.
    while (pool.length > PER_ROW && pool.length % PER_ROW !== PER_ROW - 1) pool.pop();

    var total = pool.length, answered = 0, correct = 0, shownRows = 0;
    var rows = [];
    for (var i = 0; i < total; i += PER_ROW) rows.push(pool.slice(i, i + PER_ROW));
    var rowDone = rows.map(function () { return 0; });

    container.innerHTML = '';

    function updateProgress() {
      var txt = document.getElementById('inline-progress-text');
      var bar = document.getElementById('inline-progressbar');
      if (txt) txt.textContent = progressText(t, answered, total);
      if (bar) bar.style.width = (answered / total * 100) + '%';
    }

    function endCard() {
      var pct = Math.round(correct / total * 100);
      var title = pct >= 80 ? t.t80 : pct >= 50 ? t.t50 : pct >= 25 ? t.t25 : t.t0;
      var card = document.createElement('div');
      card.className = 'inline-question-card end-card';
      card.innerHTML = '<h3>' + title + '</h3>' + donut(pct) +
        '<p>' + t.body + '</p>' +
        '<a href="' + t.ctaUrl + '" class="hero-primary-btn">' + t.cta + '</a>';
      return card;
    }

    function showRow(r) {
      if (r !== shownRows || !rows[r]) return;
      shownRows++;
      rows[r].forEach(function (q) { container.appendChild(questionCard(q, r)); });
    }

    function questionCard(q, r) {
      var card = document.createElement('div');
      card.className = 'inline-question-card';
      var h = document.createElement('h3');
      h.textContent = q.q;
      card.appendChild(h);

      q.a.forEach(function (text, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'inline-option-btn';
        btn.textContent = text;
        btn.addEventListener('click', function () {
          var btns = card.querySelectorAll('.inline-option-btn');
          btns.forEach(function (b) { b.disabled = true; });
          var right = i === q.correct;
          answered++; rowDone[r]++;
          if (right) correct++;
          btn.classList.add(right ? 'is-correct' : 'is-wrong');
          if (!right) btns[q.correct].classList.add('is-correct');

          var fb = document.createElement('div');
          fb.className = 'inline-feedback ' + (right ? 'inline-correct' : 'inline-wrong');
          fb.setAttribute('role', 'status');
          fb.textContent = right ? t.correct : t.wrongPfx + q.a[q.correct];
          card.appendChild(fb);
          updateProgress();

          if (answered === total) {
            setTimeout(function () { container.appendChild(endCard()); }, 250);
          } else if (rowDone[r] === rows[r].length || card === container.lastElementChild) {
            showRow(r + 1);
          }
        });
        card.appendChild(btn);
      });
      return card;
    }

    showRow(0);
    updateProgress();
  }

  var started = false;
  window.initQuiz = function (lang) { started = true; build(lang); };

  // Phones: the questions are a swipeable row that moves on after each answer
  function phoneAdvance() {
    var c = document.getElementById('inline-test-questions');
    if (!c || !window.matchMedia || c.dataset.advance) return;
    c.dataset.advance = '1';
    var mq = window.matchMedia('(max-width:860px)');
    c.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.inline-option-btn');
      if (!b || !mq.matches) return;
      var card = b.closest('.inline-question-card');
      if (!card) return;
      var wrong = b.classList.contains('is-wrong');
      setTimeout(function () {
        var n = card.nextElementSibling;
        if (!n) return;
        var pad = parseInt(getComputedStyle(c).paddingLeft, 10) || 0;
        c.scrollTo({ left: n.offsetLeft - pad, behavior: 'smooth' });
      }, wrong ? 2000 : 1000);
    });
  }

  function start() {
    phoneAdvance();
    if (started || cfg.autoInit === false) return;
    window.initQuiz(typeof cfg.initialLang === 'function' ? cfg.initialLang() : undefined);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
