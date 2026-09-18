/* The M.A.C. x Apex MD — interactive behaviour for the static build.
   Replaces the Design-canvas runtime. Mirrors the original _SiteHeader component. */
(function () {
  'use strict';

  var FORM = 'https://formmac.apexmd.com/?categoryId=';
  var PROGRAMS = {
    glp1:      { name:'GLP-1 Weight Loss',        price:'$199 first month',        cat:'weight-loss',        page:'weight-loss.html',        labs:'Quarterly, included',
      why:'Physician-guided semaglutide or tirzepatide with titration tuned to your labs, so you lose fat instead of the muscle you built at The M.A.C.' },
    micro:     { name:'GLP-1 Microdosing',        price:'$249.99 / month',         cat:'microdosing',  page:'glp-1-microdosing.html',  labs:'Quarterly, included',
      why:'A low, steady dose aimed at inflammation, appetite signalling and long-term metabolic health rather than the fastest possible drop on the scale.' },
    nad:       { name:'NAD+',                     price:'$249 / month',            cat:'longevity',                page:'nad.html',                labs:'Not required',
      why:'A 2,000mg protocol that replaces the NAD your cells stop making. Used for daytime energy, mental clarity and recovery between hard sessions.' },
    sermorelin:{ name:'Sermorelin',               price:'$249.99 / month',         cat:'longevity',         page:'sermorelin.html',         labs:'Not required',
      why:'Stimulates your own growth hormone production instead of replacing it. Deeper sleep, better muscle tone, faster recovery.' },
    trt:       { name:'Testosterone Replacement', price:'From $199 / month',       cat:'trt',       page:'testosterone.html',       labs:'Baseline panel first',
      why:'Every TRT protocol starts with a comprehensive panel, then a physician brings your levels back into optimal range.' },
    hrt:       { name:'Hormone Replacement',      price:'From $199 / month',       cat:'hrt',                page:'hormones.html',           labs:'Baseline panel first',
      why:'Estrogen drops roughly 60 percent by age 40. A tailored HRT protocol addresses sleep, mood, energy and body composition together.' },
    b12:       { name:'B-12 MIC',                 price:'$149.99 / month',         cat:'longevity',                page:'nad.html',                labs:'Not required',
      why:'The simplest place to start. A weekly B-12 MIC injection supporting energy, fat metabolism and recovery, with no long-term commitment.' },
    bloodwork: { name:'Longevity Bloodwork',      price:'Where TRT and HRT begin', cat:'bloodwork',          page:'bloodwork.html',          labs:'This is the panel',
      why:'Start with data. A full biomarker panel tells you and your provider exactly which protocol is worth your money before you spend it.' }
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function track(ev, data) { if (window.dfTrack) { try { window.dfTrack(ev, data || {}); } catch (e) {} } }

  /* ---------------- quiz ---------------- */
  var quiz = $('#spQuiz'), step1 = $('#spStep1'), result = $('#spResult'), stepLabel = $('#spStepLabel');

  function openQuiz() {
    if (!quiz) return;
    track('QuizStart', { from: location.pathname });
    showStep1();
    quiz.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = $('.mac-quiz__opt', quiz);
    if (first) first.focus();
  }
  function closeQuiz() {
    if (!quiz) return;
    quiz.hidden = true;
    document.body.style.overflow = '';
  }
  function showStep1() {
    if (step1) step1.hidden = false;
    if (result) result.hidden = true;
    if (stepLabel) stepLabel.textContent = '01 / 02';
  }
  function showResult(key) {
    var p = PROGRAMS[key];
    if (!p || !result) return;
    track('QuizComplete', { answer: key, program: p.name });
    $('#spName').textContent  = p.name;
    $('#spWhy').textContent   = p.why;
    $('#spPrice').textContent = p.price;
    $('#spLabs').textContent  = p.labs;
    var fa = $('#spForm');
    fa.setAttribute('href', FORM + p.cat);
    // the intake form opens in its own tab, so the quiz result stays put behind it
    fa.setAttribute('target', '_blank');
    fa.setAttribute('rel', 'noopener');
    $('#spPage').setAttribute('href', p.page);
    if (step1) step1.hidden = true;
    result.hidden = false;
    if (stepLabel) stepLabel.textContent = '02 / 02';
    result.scrollTop = 0;
  }

  window.dfOpenQuiz = openQuiz;

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('[data-spquiz-open]'))  { e.preventDefault(); openQuiz();  return; }
    if (t.closest('[data-spquiz-close]')) { e.preventDefault(); closeQuiz(); return; }
    if (t.closest('[data-spquiz-back]'))  { e.preventDefault(); showStep1(); return; }
    var opt = t.closest('[data-key]');
    if (opt && quiz && !quiz.hidden) { e.preventDefault(); showResult(opt.getAttribute('data-key')); return; }
    if (quiz && !quiz.hidden && t === quiz) { closeQuiz(); return; }
    var burger = t.closest('[data-spburger]');
    if (burger) { e.preventDefault(); toggleMobile(true); return; }
    if (t.closest('[data-spmobile-close]')) { e.preventDefault(); toggleMobile(false); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (quiz && !quiz.hidden) closeQuiz();
    toggleMobile(false);
  });

  /* ---------------- mobile menu ---------------- */
  function toggleMobile(open) {
    var m = $('#spMobile');
    if (!m) return;
    m.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }

  /* ---------------- programs dropdown ---------------- */
  $$('[data-spnav] button').forEach(function (btn) {
    var panel = btn.parentNode && $('.mac-navmenu', btn.parentNode);
    if (!panel) return;
    panel.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
    function set(open) {
      panel.style.display = open ? '' : 'none';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation();
      cancelClose();
      set(panel.style.display === 'none');
    });
    // Close on mouseleave, but not instantly: a small grace period means a
    // pointer that clips a corner or pauses on the way down does not lose the
    // menu. Re-entering the wrapper or the panel cancels the pending close.
    var closeTimer = null;
    function cancelClose() { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } }
    function closeSoon() { cancelClose(); closeTimer = setTimeout(function () { set(false); }, 320); }
    btn.parentNode.addEventListener('mouseleave', closeSoon);
    btn.parentNode.addEventListener('mouseenter', cancelClose);
    panel.addEventListener('mouseenter', cancelClose);
    panel.addEventListener('mouseleave', closeSoon);
    // Escape always closes, and returns focus to the button.
    btn.parentNode.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { cancelClose(); set(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!btn.parentNode.contains(e.target)) set(false);
    });
  });


  /* ---------------- lead + contact forms ----------------
     Every form on the site is tagged data-lead="guide" | "contact". They ship
     with no action attribute, so without this a submit would reload the page
     with the address in the query string -- looking successful while capturing
     nothing, and putting the email in browser history. */
  $$('form[data-lead]').forEach(function (form) {
    var kind = form.getAttribute('data-lead') === 'contact' ? 'contact' : 'lead';
    var btn = $('button[type=submit], button:not([type])', form);
    var note = document.createElement('p');
    note.setAttribute('role', 'status');
    note.setAttribute('aria-live', 'polite');
    note.style.cssText = 'flex:1 1 100%;margin:6px 0 0;font-size:0.82rem;font-weight:700;display:none';
    form.appendChild(note);

    function say(msg, ok) {
      note.textContent = msg;
      note.style.color = ok ? 'var(--mac-red)' : '#B3261E';
      note.style.display = 'block';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.dataset.busy === '1') return;

      var data = {};
      $$('input[name], textarea[name], select[name]', form).forEach(function (el) {
        if (el.type === 'checkbox') { data[el.name] = el.checked ? 'yes' : 'no'; return; }
        data[el.name] = (el.value || '').trim();
      });

      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
        say('Please enter a valid email address.', false);
        var em = $('input[type=email]', form); if (em) em.focus();
        return;
      }

      form.dataset.busy = '1';
      var label = btn ? btn.textContent : '';
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      note.style.display = 'none';

      var done = function (res) {
        form.dataset.busy = '';
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (res && res.ok) {
          form.reset();
          say(kind === 'contact'
            ? 'Thanks — your message is on its way. We usually reply within one business day.'
            : 'Done. Check your inbox for the guide' + (/weight-loss|glp-1/.test(location.pathname) ? ' and your MAC100 code.' : /bloodwork|testosterone|hormones/.test(location.pathname) ? '.' : ' and your MAC50 code.'), true);
        } else {
          say('That did not go through. Please try again, or email info@apexmd.com.', false);
        }
      };

      if (!window.dfSubmitLead) { done({ ok: false }); return; }
      window.dfSubmitLead(data, kind).then(done, function () { done({ ok: false }); });
    });
  });


  /* ---------------- press strip entrance ----------------
     Same three-way trigger used on the TRT page: IntersectionObserver where it
     works, a scroll handler where it silently does not, and a timer backstop.
     The hidden start state is only armed once this runs, so a script failure
     leaves the logos visible rather than blank. */
  (function () {
    var press = document.getElementById('spPress');
    if (!press) return;
    press.classList.add('is-armed');
    var done = false;
    function show() {
      if (done) return;
      done = true;
      window.removeEventListener('scroll', onScroll);
      press.classList.add('is-in');
    }
    function inView() {
      var r = press.getBoundingClientRect();
      return r.top < (window.innerHeight || 0) * 0.92 && r.bottom > 0;
    }
    function onScroll() { if (inView()) show(); }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); show(); } });
      }, { threshold: 0 });
      io.observe(press);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    setTimeout(show, 2000);
  })();

  /* ---------------- current-page nav highlight ---------------- */
  (function syncNav() {
    var here = (location.pathname.split('/').pop() || 'index.html');
    if (here === '') here = 'index.html';
    $$('[data-spnav] a, #spMobile a').forEach(function (a) {
      if ((a.getAttribute('href') || '') === here) {
        a.style.color = 'var(--mac-red)';
        a.setAttribute('aria-current', 'page');
      }
    });
  })();
})();
