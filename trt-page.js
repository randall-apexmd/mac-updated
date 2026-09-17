/* Interactions for testosterone.html.
   That page came from a Claude Design export whose FAQ accordion, video player
   and stat counters were driven by a React runtime. The page is static HTML
   now, so those three behaviours are reimplemented here in plain JS to match
   the rest of the site (no framework anywhere else). */
(function () {
  'use strict';

  /* ---------- FAQ accordion ---------- */
  var questions = document.querySelectorAll('.trt-faq__q');
  Array.prototype.forEach.call(questions, function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      var open = btn.getAttribute('aria-expanded') === 'true';
      // one open at a time, mirroring the original component's single faqOpen index
      Array.prototype.forEach.call(questions, function (other) {
        var p = document.getElementById(other.getAttribute('aria-controls'));
        other.setAttribute('aria-expanded', 'false');
        if (p) p.hidden = true;
        var s = other.querySelector('span:last-child');
        if (s) s.innerHTML = '+';
      });
      if (!open) {
        btn.setAttribute('aria-expanded', 'true');
        if (panel) panel.hidden = false;
        var sign = btn.querySelector('span:last-child');
        if (sign) sign.innerHTML = '&minus;';
      }
    });
  });

  /* ---------- Patient video ----------
     The poster is real markup; clicking swaps in the YouTube iframe. Nothing
     from YouTube loads until the visitor asks for it, which keeps their
     cookies off the page for everyone who never plays it. */
  var play = document.getElementById('trt-play');
  if (play) {
    // Set the id in ONE place: data-video-id on the play button in the markup.
    // It deliberately has NO fallback. It previously defaulted to iT8X27Y_UQU,
    // which is Dr. Bowen's peptides video, not this patient's -- a poster
    // captioned "Darick Pope" that played someone else is worse than no player,
    // so with no id the button is removed and the poster stands as a still.
    var configured = (play.getAttribute('data-video-id') || '').trim();
    if (!configured) { play.parentNode.removeChild(play); return; }
    play.addEventListener('click', function () {
      var id = configured;
      var shell = play.parentNode;
      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
      frame.title = 'Patient testimonial';
      frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      frame.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:none;display:block;z-index:3';
      shell.appendChild(frame);
      Array.prototype.forEach.call(shell.children, function (el) {
        if (el !== frame) el.style.display = 'none';
      });
      if (window.dfTrack) { try { window.dfTrack('VideoPlay', { id: id, page: location.pathname }); } catch (e) {} }
    });
  }

  /* ---------- KPI row ----------
     Reveals and counts up the first time the band scrolls into view, once.
     The count-up is the honest bit of motion here: no shared bar across the
     four figures, because "+36%" (a relative increase) and "66%" (a share of
     men) are different units and one track would imply they are comparable. */
  var band = document.getElementById('trt-stats');
  if (band) {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nums = band.querySelectorAll('.trt-kpi__num');
    // Arm only now: until this runs the cards render in their final state, so a
    // JS failure degrades to plain visible content instead of an empty band.
    band.classList.add('is-armed');
    Array.prototype.forEach.call(nums, function (el) { el.textContent = '0'; });

    var run = function () {
      band.classList.add('is-in');
      Array.prototype.forEach.call(nums, function (el, i) {
        var to = parseInt(el.getAttribute('data-to'), 10);
        if (isNaN(to)) return;
        if (reduce) { el.textContent = String(to); return; }
        var start = null, dur = 1000, delay = i * 90, settled = false;
        var finish = function () { if (!settled) { settled = true; el.textContent = String(to); } };
        var step = function (ts) {
          if (settled) return;
          if (start === null) start = ts;
          var p = Math.min(Math.max(ts - start - delay, 0) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(to * eased));
          if (p < 1) requestAnimationFrame(step); else settled = true;
        };
        requestAnimationFrame(step);
        // rAF is paused in background tabs and some low-power modes, which would
        // strand the figure at 0. This guarantees the real number either way.
        setTimeout(finish, dur + delay + 400);
      });
    };

    var done = false;
    var fire = function () {
      if (done) return;
      done = true;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      run();
    };
    var inView = function () {
      var r = band.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top < vh * 0.88 && r.bottom > 0;
    };
    var onScroll = function () { if (inView()) fire(); };

    // Three ways in, because a reveal must never be the reason content is
    // invisible. IntersectionObserver is the cheap path, a scroll handler
    // covers environments where it silently never fires, and the timer is the
    // backstop that shows the band no matter what.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fire(); } });
      // threshold 0: this band is taller than a short viewport, where a
      // fractional threshold can never be satisfied.
      }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
      io.observe(band);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    setTimeout(fire, 2500);
  }
})();
