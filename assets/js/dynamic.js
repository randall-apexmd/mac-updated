/* ============================================================
   mac.apexmd.com — dynamic layer
   Additive behaviour only. Nothing here changes the authored
   layout; every feature is opt-in, degrades to the static page,
   and is disabled under prefers-reduced-motion.

     1. Condensed sticky header after the hero scrolls away
     2. Scroll-linked progress rail on the timeline sections
     3. Sticky price bar once the pricing block leaves view
     4. Directional entry for split sections

   Loaded after app.js and motion.js.
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------------
     1. Condensed sticky header
     The pages run 6,000-12,000px; the nav and the primary CTA leave
     the screen in the first viewport and never come back. This puts
     them back without occupying space on arrival.
     --------------------------------------------------------------- */
  function stickyHeader() {
    var page = $('.page--desktop') || $('.page--mobile');
    if (!page) return;
    var header = page.children[0];
    if (!header) return;

    var bar = document.createElement('div');
    bar.className = 'mac-stickybar';
    bar.setAttribute('aria-hidden', 'true');       /* the real header stays the a11y entry point */
    bar.innerHTML =
      '<div class="mac-stickybar__inner">' +
        '<a class="mac-stickybar__logo" href="index.html">' +
          /* The MAC mark leads the lockup, then Apex MD, per the MAC launch kit. */
          '<img src="img/mac/logo-mac-dark.webp" alt="" width="360" height="180">' +
          '<span>Powered by</span>' +
          '<img src="img/mac/logo-apex-dark.webp" alt="" width="900" height="241">' +
        '</a>' +
        '<a class="btn btn-primary mac-stickybar__cta" data-intake="body-scan" ' +
           'href="https://formmac.apexmd.com/?categoryId=bloodwork" target="_blank" rel="noopener">Claim your offer</a>' +
      '</div>';
    document.body.appendChild(bar);

    /* app.js rewrites [data-intake] hrefs with the selected club on load;
       this element arrives after that, so mirror whatever the page already has. */
    var existing = $('[data-intake="body-scan"]');
    var cta = $('.mac-stickybar__cta', bar);
    if (existing && existing.href) cta.href = existing.href;
    document.addEventListener('change', function () {
      var e = $('[data-intake="body-scan"]');
      if (e && e.href) cta.href = e.href;
    });

    var threshold = Math.max(360, header.getBoundingClientRect().height + 320);
    var shown = false;
    function onScroll() {
      var should = window.scrollY > threshold;
      if (should !== shown) {
        shown = should;
        bar.classList.toggle('is-shown', shown);
        bar.setAttribute('aria-hidden', shown ? 'false' : 'true');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------
     2. Timeline progress rail
     The month-by-month and journey sections are four cells in a row.
     A rail that fills with scroll turns them into a sequence.
     --------------------------------------------------------------- */
  function timelineRail() {
    if (reduce) return;
    $$('.page--desktop > div, .page--mobile > div').forEach(function (sec) {
      var t = (sec.textContent || '');
      if (!/Month 1|Your Sermorelin journey|What to expect|month by month/i.test(t)) return;
      var grid = sec.querySelector('div[style*="grid-template-columns:repeat(4"]');
      if (!grid || grid.classList.contains('mac-rail-host')) return;
      grid.classList.add('mac-rail-host');
      var rail = document.createElement('div');
      rail.className = 'mac-rail';
      rail.innerHTML = '<i></i>';
      grid.parentNode.insertBefore(rail, grid);

      var fill = rail.firstChild;
      function onScroll() {
        var r = grid.getBoundingClientRect();
        var vh = window.innerHeight;
        var p = (vh - r.top) / (vh + r.height);
        fill.style.width = Math.max(0, Math.min(1, p)) * 100 + '%';
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    });
  }

  /* ---------------------------------------------------------------
     3. Sticky price bar
     Once the pricing block is above the fold the price and the CTA
     are gone for the rest of a very long page.
     --------------------------------------------------------------- */
  function priceBar() {
    /* weight-loss.html predates the generic builder and uses id="plans";
       every other product page uses id="plan". Accept either. */
    var plan = document.getElementById('plan') || document.getElementById('plans');
    if (!plan) return;
    var priceEl = plan.querySelector('[style*="font-size:42px"], [style*="font-size:38px"]');
    if (!priceEl) return;

    var bar = document.createElement('div');
    bar.className = 'mac-pricebar';
    bar.innerHTML =
      '<div class="mac-pricebar__inner">' +
        '<span class="mac-pricebar__label">' + (document.title.split('—')[0].split('|')[0].trim()) + '</span>' +
        '<span class="mac-pricebar__price">' + priceEl.textContent.trim() + '</span>' +
        '<a class="btn btn-primary" data-intake="assessment" ' +
           'href="https://formmac.apexmd.com/?categoryId=bloodwork" target="_blank" rel="noopener">Start your intake</a>' +
      '</div>';
    document.body.appendChild(bar);

    var src = plan.querySelector('[data-intake="assessment"]');
    var cta = bar.querySelector('a');
    if (src && src.href) cta.href = src.href;
    document.addEventListener('change', function () {
      var s = plan.querySelector('[data-intake="assessment"]');
      if (s && s.href) cta.href = s.href;
    });

    /* Scroll-position driven rather than IntersectionObserver: the bar must
       reflect where the page IS, not only fire on a crossing, so it stays
       correct after in-page anchors and restored scroll positions. Hidden
       again near the foot of the page so it never covers the final CTA. */
    var footer = document.querySelector('.mac-pricebar');
    function onScroll() {
      var r = plan.getBoundingClientRect();
      var past = r.bottom < 0;
      var nearEnd = (window.innerHeight + window.scrollY) > (document.documentElement.scrollHeight - 900);
      bar.classList.toggle('is-shown', past && !nearEnd);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------
     4. Directional entry for split sections
     Everything currently rises. On two-column sections the image can
     arrive from the outside edge instead, which reads less uniform.
     --------------------------------------------------------------- */
  function directionalEntry() {
    if (reduce) return;
    $$('.page--desktop > div').forEach(function (sec) {
      var grid = sec.querySelector(':scope > div[style*="grid-template-columns:1fr 1fr"]');
      if (!grid || grid.children.length !== 2) return;
      var a = grid.children[0], b = grid.children[1];
      var aHasImg = !!a.querySelector('img'), bHasImg = !!b.querySelector('img');
      if (aHasImg === bHasImg) return;              /* only when one side is the image */
      (aHasImg ? a : b).classList.add('mac-from-side');
      (aHasImg ? b : a).classList.add('mac-from-below');
    });
  }

  function init() {
    try { stickyHeader(); }     catch (e) {}
    try { timelineRail(); }     catch (e) {}
    try { priceBar(); }         catch (e) {}
    try { directionalEntry(); } catch (e) {}
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();
