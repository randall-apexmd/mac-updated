/* ============================================================
   eos.apexmd.com — motion layer
   Scroll-triggered entrances, in the restrained style of a
   product marketing page: a short rise + fade as a block enters,
   a light stagger across siblings, a slow settle on large imagery
   and a count-up on stat figures.

   Rules this file follows:
   - Content is visible by default. The hiding class is only added
     once we know an observer exists, so a JS failure or an old
     browser degrades to a normal static page.
   - prefers-reduced-motion disables everything.
   - Each element animates once. Nothing re-animates on scroll up.
   ============================================================ */
(function () {
  'use strict';

  var root = document.documentElement;

  /* --- bail out cleanly where motion is unwanted or unsupported --- */
  if (!('IntersectionObserver' in window)) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduce && reduce.matches) return;

  var RISE       = 18;    /* px a block travels on entry */
  var STAGGER    = 70;    /* ms between siblings */
  var MAX_STEPS  = 5;     /* cap so wide grids don't crawl in */
  var COUNT_MS   = 1100;

  /* Blocks that should animate: the direct children of each page
     rendering (the authored sections), plus the cells inside their
     grids so rows arrive in sequence rather than all at once. */
  function targets() {
    var out = [];
    ['.page--desktop', '.page--mobile'].forEach(function (pageSel) {
      var page = document.querySelector(pageSel);
      if (!page) return;
      [].forEach.call(page.children, function (section) {
        if (section.classList.contains('overlay')) return;   /* modals never animate */
        out.push({ el: section, delay: 0 });
        /* stagger one level of grid cells inside the section */
        [].forEach.call(section.querySelectorAll(':scope > div[style*="grid"] > div'), function (cell, i) {
          out.push({ el: cell, delay: Math.min(i, MAX_STEPS) * STAGGER });
        });
      });
    });
    return out;
  }

  var items = targets();
  if (!items.length) return;

  /* Only now commit to hiding anything. */
  root.classList.add('js-motion');

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.style.transitionDelay = (el.getAttribute('data-delay') || 0) + 'ms';
      el.classList.add('is-in');
      io.unobserve(el);
      if (el.hasAttribute('data-count')) countUp(el);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });

  items.forEach(function (it) {
    it.el.setAttribute('data-reveal', '');
    if (it.delay) it.el.setAttribute('data-delay', it.delay);
    io.observe(it.el);
  });

  /* --- large imagery settles from a slight over-scale --- */
  [].forEach.call(document.querySelectorAll('img'), function (img) {
    var r = img.getBoundingClientRect();
    if (r.width >= 260 || img.style.width === '100%') img.setAttribute('data-settle', '');
  });

  /* --- stat figures count up --- */
  function countUp(el) {
    var raw = el.getAttribute('data-count');
    var num = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (!isFinite(num)) return;
    var prefix = raw.slice(0, raw.search(/[0-9]/));
    var suffix = raw.slice(raw.search(/[0-9]/) + String(num).length);
    var t0 = null;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = Math.min((ts - t0) / COUNT_MS, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = num * eased;
      el.textContent = prefix + (num % 1 ? v.toFixed(1) : Math.round(v)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = prefix + '0' + suffix;
    requestAnimationFrame(step);
  }

  /* Circuit breaker. A marketing page that renders blank is far worse
     than one that doesn't animate, so if the observer has produced no
     reveals at all shortly after load — zero-size viewport, an inert
     observer, a hidden tab that never intersects — drop the motion layer
     entirely and show the static page. */
  window.addEventListener('load', function () {
    setTimeout(function () {
      if (!document.querySelector('[data-reveal].is-in') && document.body.scrollHeight > 0) {
        root.classList.remove('js-motion');
        return;
      }
      /* otherwise just catch anything already on screen but missed */
      [].forEach.call(document.querySelectorAll('[data-reveal]:not(.is-in)'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.height && r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
      });
    }, 1500);
  });

})();
