/* ============================================================
   mac.apexmd.com — behaviour layer
   1. Home-club selection, persisted and written into every intake URL
      so each signup is attributable to a specific location.
   2. The 2-minute assessment modal (goal / stage / labs -> program).
   3. The mobile club sheet.
   No layout or styling is set here.
   ============================================================ */
(function () {
  'use strict';

  /* ---- configuration ----
     The M.A.C. intake lives on its own partner subdomain, formmac.apexmd.com. It takes
     a categoryId, not the flow/program names this file used to send.

     Valid categories: weight-loss | trt | hrt | longevity | bloodwork

     The selected home club is appended as &club= so a signup stays traceable
     to a location. The form ignores parameters it does not use; drop the line
     in intakeUrl() if club attribution is handled elsewhere. */
  var INTAKE_BASE = 'https://formmac.apexmd.com';
  var STORAGE_KEY = 'mac.homeStudio';

  /* Default category per CTA kind. An element may override with
     data-category="..." — the generated pages set it per page. */
  var CATEGORY_FOR = {
    'body-scan':  'bloodwork',   /* bloodwork is the diagnostics entry point */
    'assessment': 'weight-loss', /* overridden per page via data-category */
    'rec':        'weight-loss'  /* replaced by the assessment's own recommendation */
  };

  // No club picker: formmac.apexmd.com takes no club param.
  var CLUBS = [];

  var state = { club: null, aGoal: null, aStage: null, aLabs: null, step: 1 };

  function byCode(code) {
    for (var i = 0; i < CLUBS.length; i++) if (CLUBS[i].code === code) return CLUBS[i];
    return null;   // CLUBS is empty on this site; callers must tolerate null
  }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- category + club code -> intake URLs ---------- */
  function intakeUrl(category) {
    /* No &club= on this site: there is no studio picker and the intake form does
       not read the param. Appending an empty one would just be noise in the
       URL and in analytics. */
    return INTAKE_BASE + '/?categoryId=' + encodeURIComponent(category);
  }

  function syncClub() {
    var club = byCode(state.club);
    if (club) {
      $all('[data-club-label]').forEach(function (el) { el.textContent = club.label; });
      $all('[data-club-code]').forEach(function (el) { el.textContent = club.code; });
    }

    $all('[data-intake]').forEach(function (el) {
      var kind = el.getAttribute('data-intake');
      var category = el.getAttribute('data-category') ||
                     (kind === 'rec' ? recommend().category : CATEGORY_FOR[kind]) ||
                     'weight-loss';
      el.href = intakeUrl(category);
    });

    $all('select[data-club-select]').forEach(function (sel) { sel.value = state.club; });

    /* analytics hook. Only fires when a studio was actually chosen; The M.A.C. has
       no studio picker, so on this site it never fires. */
    if (club && window.dataLayer && window.dataLayer.push) {
      window.dataLayer.push({ event: 'club_selected', club_code: club.code, club_name: club.label });
    }
  }

  function setClub(code) {
    var c = byCode(code);
    if (!c) return;              // no studio list on this site
    state.club = c.code;
    try { window.localStorage.setItem(STORAGE_KEY, state.club); } catch (e) {}
    syncClub();
  }

  /* ---------- assessment ---------- */
  function recommend() {
    var g = state.aGoal, stage = state.aStage;
    if (!g) return {
      program: '', goal: 'Answer the three questions',
      copy: 'Your recommendation appears here — then start the intake that begins it.',
      category: 'bloodwork', page: ''
    };
    if (g === 'Lose weight') {
      return stage === 'Training consistently'
        ? { program: 'GLP-1 microdose', goal: 'Metabolic Health', copy: 'You are already training. A microdose targets appetite and metabolic markers without blunting the work you are putting in.', category: 'microdosing', page: 'glp-1-microdosing.html' }
        : { program: 'GLP-1', goal: 'Lose Weight', copy: 'Medically managed weight loss with quarterly labs so your dose stays matched to you.', category: 'weight-loss', page: 'weight-loss.html' };
    }
    if (g === 'Build muscle and recover') return { program: 'Sermorelin', goal: 'Build Muscle', copy: "Supports your own growth hormone production for recovery, sleep and lean mass.", category: 'longevity', page: 'sermorelin.html' };
    if (g === 'Energy and focus') return { program: 'NAD+ · B-12 MIC', goal: 'Energy & Recovery', copy: 'For the stretch where you make it to The M.A.C. but the energy never shows up.', category: 'longevity', page: 'nad.html' };
    if (g === "Men's vitality") return { program: 'TRT', goal: "Men's Vitality", copy: 'Testosterone therapy when your labs and how you feel both point in that direction.', category: 'trt', page: 'testosterone.html' };
    return { program: 'HRT', goal: "Women's Hormones", copy: 'Hormone therapy for sleep, mood and the changes of perimenopause and beyond.', category: 'hrt', page: 'hormones.html' };
  }

  /* The quiz is styled in site.css (.aq-*). Selection is a class, not an
     inline style, so the stylesheet stays the single source of truth. */
  var STEP_KEY = { 1: 'aGoal', 2: 'aStage', 3: 'aLabs' };
  var LAST = 4;   /* step 4 is the protocol card */

  function answeredCount() {
    return [state.aGoal, state.aStage, state.aLabs].filter(Boolean).length;
  }

  function goStep(n) {
    state.step = Math.max(1, Math.min(LAST, n));
    syncAssessment();
  }

  function syncAssessment() {
    $all('[data-pick]').forEach(function (el) {
      var parts = el.getAttribute('data-pick').split('::');
      var on = state[parts[0]] === parts[1];
      el.classList.toggle('is-on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    /* one question on screen at a time */
    $all('[data-step]').forEach(function (el) {
      el.hidden = Number(el.getAttribute('data-step')) !== state.step;
    });

    var rec = recommend();
    var answered = answeredCount();

    /* the meter fills on progress, not on which step you happen to be on,
       so stepping back does not make it look like work was lost */
    $all('[data-aq="bar"]').forEach(function (el) {
      el.style.width = (answered / 3 * 100) + '%';
    });

    $all('[data-rec="goal"]').forEach(function (el) { el.textContent = rec.goal; });
    $all('[data-rec="program"]').forEach(function (el) { el.textContent = rec.program; });
    $all('[data-rec="copy"]').forEach(function (el) { el.textContent = rec.copy; });
    $all('[data-rec="a1"]').forEach(function (el) { el.textContent = state.aGoal  || '\u2014'; });
    $all('[data-rec="a2"]').forEach(function (el) { el.textContent = state.aStage || '\u2014'; });
    $all('[data-rec="a3"]').forEach(function (el) { el.textContent = state.aLabs  || '\u2014'; });
    $all('[data-rec="step"]').forEach(function (el) {
      el.textContent = state.step >= LAST ? 'Matched to your answers' : state.step + ' of 3';
    });
    $all('[data-action="aq-back"]').forEach(function (el) { el.hidden = state.step === 1; });
    $all('[data-rec="page"]').forEach(function (el) {
      if (rec.page) { el.setAttribute('href', rec.page); el.hidden = false; } else { el.hidden = true; }
    });
    syncClub();
  }

  /* ---------- overlays ---------- */
  function toggle(id, open) {
    var el = document.getElementById(id);
    if (!el) return;
    if (open) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      var focusable = el.querySelector('button, [href], select, input');
      if (focusable) focusable.focus();
    }
  }

  /* ---------- wiring ---------- */
  document.addEventListener('click', function (e) {
    var pick = e.target.closest ? e.target.closest('[data-pick]') : null;
    if (pick) {
      var parts = pick.getAttribute('data-pick').split('::');
      var was = state[parts[0]];
      state[parts[0]] = was === parts[1] ? null : parts[1];
      syncAssessment();
      /* advance on a fresh answer, never on an un-pick, and give the tick a
         beat to register so the step does not vanish under the cursor */
      if (state[parts[0]] && state.step < LAST) {
        var from = state.step;
        window.setTimeout(function () { if (state.step === from) goStep(from + 1); }, 260);
      }
      return;
    }
    var act = e.target.closest ? e.target.closest('[data-action]') : null;
    if (!act) return;
    var a = act.getAttribute('data-action');
    if (a === 'open-assess')  { e.preventDefault(); state.step = 1; toggle('assess-modal', true); syncAssessment(); }
    if (a === 'aq-back')      { e.preventDefault(); goStep(state.step - 1); }
    if (a === 'close-assess') { e.preventDefault(); toggle('assess-modal', false); }
    if (a === 'open-sheet')   { e.preventDefault(); toggle('club-sheet', true); }
    if (a === 'close-sheet')  { e.preventDefault(); toggle('club-sheet', false); }
  });

  document.addEventListener('change', function (e) {
    var sel = e.target;
    if (sel && sel.matches && sel.matches('[data-action="club-change"], select[data-club-select]')) setClub(sel.value);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { toggle('assess-modal', false); toggle('club-sheet', false); }
  });

  /* restore the member's saved home club */
  try {
    var saved = window.localStorage.getItem(STORAGE_KEY);
    var found = saved ? byCode(saved) : null;   // byCode returns null when CLUBS is empty
    if (found) state.club = found.code;
  } catch (e) {}

  /* populate every club <select> so the option list can never drift */
  $all('select[data-club-select]').forEach(function (sel) {
    if (sel.options.length) return;
    CLUBS.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.code; o.textContent = c.label;
      sel.appendChild(o);
    });
  });

  syncAssessment();
})();
