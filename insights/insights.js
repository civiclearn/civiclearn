/*  insights.js  —  CivicLearn Insights shared module
 *  Reads /insights/insights.json once and powers:
 *    1. Related-articles block at the bottom of every article page
 *    2. The full index page (featured card + grid)
 *    3. An optional "Latest Insights" widget for the homepage
 *
 *  Usage in an article page:
 *    <div id="related-articles" data-current="denmark-failure-rate" data-max="3"></div>
 *    <script src="/insights/insights.js"></script>
 *
 *  Usage in index.html:
 *    <div id="insights-featured"></div>
 *    <div id="insights-grid"></div>
 *    <script src="/insights/insights.js"></script>
 *
 *  Usage on homepage:
 *    <div id="insights-homepage" data-max="3"></div>
 *    <script src="/insights/insights.js"></script>
 */

(function () {
  'use strict';

  var BASE = '/insights';
  var JSON_URL = BASE + '/insights.json';

  function fetchData(cb) {
    var x = new XMLHttpRequest();
    x.open('GET', JSON_URL, true);
    x.onload = function () {
      if (x.status >= 200 && x.status < 400) {
        try { cb(JSON.parse(x.responseText)); } catch (e) { console.error('Insights JSON parse error', e); }
      }
    };
    x.onerror = function () { console.error('Insights JSON load error'); };
    x.send();
  }

  /* ── helpers ─────────────────────────── */

  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function articleURL(slug) {
    return BASE + '/' + slug;
  }

  /* ── related articles (article pages) ── */

  function renderRelated(articles) {
    var el = document.getElementById('related-articles');
    if (!el) return;

    var current = el.getAttribute('data-current') || '';
    var max = parseInt(el.getAttribute('data-max'), 10) || 3;

    // Exclude current article, sort by date descending
    var pool = articles.filter(function (a) { return a.slug !== current; });
    pool.sort(function (a, b) { return b.date.localeCompare(a.date); });
    var items = pool.slice(0, max);

    var html = '<div class="related-section">' +
      '<div class="related-header">More from CivicLearn Insights</div>' +
      '<div class="related-grid">';

    items.forEach(function (a) {
      html += '<a href="' + articleURL(a.slug) + '" class="related-card">' +
        '<div class="rc-category">' + esc(a.category) + '</div>' +
        '<div class="rc-title">' + esc(a.title) + '</div>' +
        '<div class="rc-excerpt">' + esc(a.excerpt) + '</div>' +
        '<div class="rc-meta">' + esc(a.dateLabel) + '</div>' +
        '</a>';
    });

    html += '</div></div>';
    el.innerHTML = html;
  }

  /* ── index page ────────────────────────── */

  function renderIndex(articles) {
    var featuredEl = document.getElementById('insights-featured');
    var gridEl = document.getElementById('insights-grid');
    if (!featuredEl && !gridEl) return;

    // Sort by date descending
    var sorted = articles.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });

    // Featured = the one with featured:true (or first cornerstone)
    var feat = sorted.find(function (a) { return a.featured; }) || sorted[0];
    var grid = sorted.filter(function (a) { return a.slug !== feat.slug; });

    // Render featured
    if (featuredEl) {
      featuredEl.setAttribute('data-type', feat.type);
      featuredEl.innerHTML =
        '<a href="' + articleURL(feat.slug) + '" class="featured-card">' +
          '<div class="featured-visual">' +
            '<div class="fv-icon">🧬</div>' +
            '<div class="fv-label">Cornerstone Article</div>' +
          '</div>' +
          '<div class="featured-content">' +
            '<div class="featured-category">' + esc(feat.category) + '</div>' +
            '<div class="featured-title">' + esc(feat.title) + '</div>' +
            '<div class="featured-excerpt">' + esc(feat.excerpt) + '</div>' +
            '<div class="featured-meta">' + esc(feat.dateLabel) + ' · ' + esc(feat.readTime) + '</div>' +
          '</div>' +
        '</a>';
    }

    // Render grid
    if (gridEl) {
      var html = '';
      grid.forEach(function (a) {
        html += '<a href="' + articleURL(a.slug) + '" class="article-card" data-type="' + esc(a.type) + '">' +
          '<div class="ac-category">' + esc(a.category) + '</div>' +
          '<div class="ac-title">' + esc(a.title) + '</div>' +
          '<div class="ac-excerpt">' + esc(a.excerpt) + '</div>' +
          '<div class="ac-footer">' +
            '<span>' + esc(a.dateLabel) + '</span>' +
            '<span class="ac-type-badge">' + esc(a.badge) + '</span>' +
          '</div>' +
        '</a>';
      });
      gridEl.innerHTML = html;
    }
  }

  /* ── homepage widget ───────────────────── */

  function renderHomepage(articles) {
    var el = document.getElementById('insights-homepage');
    if (!el) return;

    var max = parseInt(el.getAttribute('data-max'), 10) || 3;
    var sorted = articles.slice().sort(function (a, b) { return b.date.localeCompare(a.date); });
    var items = sorted.slice(0, max);

    var html = '';
    items.forEach(function (a) {
      html += '<a href="' + articleURL(a.slug) + '" class="insight-card">' +
        '<div class="ic-category">' + esc(a.category) + '</div>' +
        '<div class="ic-title">' + esc(a.title) + '</div>' +
        '<div class="ic-excerpt">' + esc(a.excerpt) + '</div>' +
        '<div class="ic-meta">' + esc(a.dateLabel) + ' · ' + esc(a.readTime) + '</div>' +
        '</a>';
    });

    el.innerHTML = html;
  }

  /* ── init ────────────────────────────── */

  fetchData(function (articles) {
    renderRelated(articles);
    renderIndex(articles);
    renderHomepage(articles);
  });

})();
