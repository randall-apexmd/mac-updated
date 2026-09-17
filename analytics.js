/* The M.A.C. x Apex MD - tracking + lead capture wiring.
   Everything here no-ops until you fill in CONFIG below. See SETUP.md. */
(function () {
  var CONFIG = {
    // ---- paste your IDs here ----
    GTM_ID: 'GTM-MVWKWK6D', // e.g. 'GTM-XXXXXXX'  (preferred: manage GA4 + Meta inside GTM)
    GA4_ID: '',          // e.g. 'G-XXXXXXXXXX' (only if you are NOT using GTM)
    META_PIXEL_ID: '',   // e.g. '1234567890123456'
    LEAD_ENDPOINT: '/api/lead',  // our own Vercel function -> Resend -> info@apexmd.com
    LEAD_METHOD: 'POST',
    LEAD_MODE: 'json',   // 'json' | 'form'  - form services usually want 'form'
    COOKIE_DOMAIN: '.apexmd.com'
  };

  var ATTR_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid', 'ttclid', 'msclkid'];
  var HANDOFF_HOSTS = ['formmac.apexmd.com', 'form.apexmd.com', 'ehr.apexmd.com'];
  var COOKIE = 'mac_attr';

  /* ---------- first-touch attribution, shared across *.apexmd.com ---------- */
  function readCookie(name) {
    var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  }
  function writeCookie(name, value, days) {
    try {
      var d = new Date();
      d.setTime(d.getTime() + days * 864e5);
      var domain = location.hostname.indexOf('apexmd.com') > -1 ? ';domain=' + CONFIG.COOKIE_DOMAIN : '';
      document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/' + domain + ';SameSite=Lax';
    } catch (e) { /* preview hosts will reject the domain attribute; ignore */ }
  }

  var qs = new URLSearchParams(location.search);
  var stored = {};
  try { stored = JSON.parse(readCookie(COOKIE) || '{}'); } catch (e) { stored = {}; }

  var fresh = {};
  ATTR_KEYS.forEach(function (k) { if (qs.get(k)) fresh[k] = qs.get(k); });

  if (!stored.first_seen || Object.keys(fresh).length) {
    var attr = {
      first_seen: stored.first_seen || new Date().toISOString(),
      landing_page: stored.landing_page || location.pathname,
      referrer: stored.referrer || document.referrer || 'direct',
      session_id: stored.session_id || 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    };
    ATTR_KEYS.forEach(function (k) { if (fresh[k] || stored[k]) attr[k] = fresh[k] || stored[k]; });
    stored = attr;
    writeCookie(COOKIE, JSON.stringify(stored), 90);
  }
  window.dfAttribution = stored;

  /* ---------- tag loaders ---------- */
  window.dataLayer = window.dataLayer || [];
  function inject(src, attrs) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    Object.keys(attrs || {}).forEach(function (k) { s.setAttribute(k, attrs[k]); });
    document.head.appendChild(s);
  }

  if (CONFIG.GTM_ID) {
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    inject('https://www.googletagmanager.com/gtm.js?id=' + CONFIG.GTM_ID);
  } else if (CONFIG.GA4_ID) {
    inject('https://www.googletagmanager.com/gtag/js?id=' + CONFIG.GA4_ID);
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', CONFIG.GA4_ID, { cookie_domain: CONFIG.COOKIE_DOMAIN });
  }

  if (CONFIG.META_PIXEL_ID) {
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', CONFIG.META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  /* ---------- one call site for every event ---------- */
  function track(name, params) {
    var payload = params || {};
    window.dataLayer.push(Object.assign({ event: name }, payload, { mac_session: stored.session_id }));
    if (window.fbq) {
      var STANDARD = ['Lead', 'InitiateCheckout', 'ViewContent', 'CompleteRegistration', 'Contact', 'Schedule', 'Subscribe'];
      window.fbq(STANDARD.indexOf(name) > -1 ? 'track' : 'trackCustom', name, payload);
    }
    if (window.gtag) window.gtag('event', name, payload);
  }
  window.dfTrack = track;

  /* ---------- carry attribution across the domain hops ---------- */
  function decorate(url) {
    try {
      var u = new URL(url, location.href);
      if (HANDOFF_HOSTS.indexOf(u.hostname) === -1) return url;
      ATTR_KEYS.forEach(function (k) { if (stored[k] && !u.searchParams.get(k)) u.searchParams.set(k, stored[k]); });
      u.searchParams.set('mac_sid', stored.session_id);
      u.searchParams.set('src', 'mac');
      return u.toString();
    } catch (e) { return url; }
  }
  window.dfDecorate = decorate;

  /* ---------- delegated CTA instrumentation ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var label = (a.textContent || '').trim().slice(0, 60);

    if (href.indexOf('tel:') === 0) { track('Contact', { method: 'phone', cta: label }); return; }
    if (href.indexOf('mailto:') === 0) { track('Contact', { method: 'email', cta: label }); return; }

    try {
      var host = new URL(href, location.href).hostname;
      if (HANDOFF_HOSTS.indexOf(host) > -1) {
        a.setAttribute('href', decorate(href));
        var isPortal = host === 'ehr.apexmd.com';
        track(isPortal ? 'PortalLogin' : 'InitiateCheckout', {
          cta: label,
          program: new URL(a.href).searchParams.get('categoryId') || 'unknown',
          from: location.pathname
        });
      }
    } catch (err) { /* relative link */ }
  }, true);

  /* ---------- lead capture ---------- */
  window.dfSubmitLead = function (fields, kind) {
    var body = Object.assign({}, fields, {
      kind: kind || 'lead',
      page: location.pathname,
      offer_code: /weight-loss|glp-1/.test(location.pathname) ? 'DF100'
                : /bloodwork/.test(location.pathname) ? '' : 'DF50',
      partner: 'MAC'
    }, stored);
    track(kind === 'contact' ? 'Contact' : 'Lead', { kind: kind || 'lead', page: location.pathname });
    if (!CONFIG.LEAD_ENDPOINT) {
      console.info('[mac] LEAD_ENDPOINT not set; captured locally only:', body);
      return Promise.resolve({ ok: false, reason: 'no-endpoint' });
    }
    var init = { method: CONFIG.LEAD_METHOD, mode: 'cors' };
    if (CONFIG.LEAD_MODE === 'form') {
      var fd = new FormData();
      Object.keys(body).forEach(function (k) { fd.append(k, body[k]); });
      init.body = fd;
    } else {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    return fetch(CONFIG.LEAD_ENDPOINT, init)
      .then(function (r) { return { ok: r.ok, status: r.status }; })
      .catch(function (err) { console.warn('[mac] lead post failed', err); return { ok: false, error: String(err) }; });
  };

  /* ---------- decorate handoff links as they render ----------
     The page renders after DOMContentLoaded, so a one-shot pass finds nothing.
     Observe the tree instead and decorate each link once. */
  /* Background video must never make sound. The muted attribute alone is not
     reliable once React owns the element, so enforce it on the property too. */
  function forceMute(root) {
    (root || document).querySelectorAll('video').forEach(function (v) {
      v.muted = true;
      v.defaultMuted = true;
      v.volume = 0;
      v.removeAttribute('controls');
      v.setAttribute('disableremoteplayback', '');
      if (!v.dataset.dfMuted) {
        v.dataset.dfMuted = '1';
        v.addEventListener('volumechange', function () {
          if (!v.muted || v.volume > 0) { v.muted = true; v.volume = 0; }
        });
        v.addEventListener('play', function () { v.muted = true; v.volume = 0; });
      }
    });
  }
  window.dfForceMute = forceMute;

  function decorateAll(root) {
    forceMute(root);
    (root || document).querySelectorAll('a[href]:not([data-mac-dec])').forEach(function (a) {
      var h = a.getAttribute('href') || '';
      try {
        if (HANDOFF_HOSTS.indexOf(new URL(h, location.href).hostname) > -1) {
          a.setAttribute('href', decorate(h));
          a.setAttribute('data-mac-dec', '1');
        }
      } catch (e) { /* relative link */ }
    });
  }
  window.dfDecorateAll = decorateAll;

  function start() {
    decorateAll();
    if (window.MutationObserver) {
      new MutationObserver(function () { decorateAll(); })
        .observe(document.documentElement, { childList: true, subtree: true });
    }
    var page = (location.pathname.split('/').pop() || 'Home.dc.html').replace('.dc.html', '');
    var PROGRAMS = ['Weight-Loss', 'GLP-1-Microdosing', 'NAD', 'Sermorelin', 'Testosterone', 'Hormones', 'Bloodwork'];
    if (PROGRAMS.indexOf(page) > -1) track('ViewContent', { content_name: page, content_type: 'program' });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
