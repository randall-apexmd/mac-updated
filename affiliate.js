/*
 * Fires the iDevAffiliate referral hit for this microsite.
 * The real work happens server-side in /api/track.js - this only triggers it,
 * because the browser cannot supply the visitor's real IP to iDevAffiliate.
 *
 * NOTE ON TIMING: the WordPress original called usleep(2000000) before firing.
 * That delayed page rendering by 2s server-side; it was not a deliberate
 * "only count visitors who stay" rule, since the hit fired either way. Here the
 * request goes out as soon as the page loads, so a visitor who bounces after
 * one second is still attributed to the partner. That maximises correct
 * commission attribution, which is the point of the tracking.
 */
(function () {
  // localStorage, not sessionStorage: a visitor who closes the tab and returns
  // an hour later should not generate a second click for the same referral.
  var GUARD = 'idev_fired_at';
  var TTL_MS = 24 * 60 * 60 * 1000; // matches the 24h server-side cookie

  function alreadyFired() {
    try {
      var t = window.localStorage.getItem(GUARD);
      return t && (Date.now() - parseInt(t, 10)) < TTL_MS;
    } catch (e) {
      return false; // private mode / storage blocked: let the server decide
    }
  }

  function markFired() {
    try { window.localStorage.setItem(GUARD, String(Date.now())); } catch (e) {}
  }

  function fire() {
    if (alreadyFired()) return;
    markFired();
    var url = '/api/track?url=' + encodeURIComponent(window.location.href);
    try {
      fetch(url, { method: 'GET', credentials: 'same-origin', keepalive: true })
        .catch(function () {});
    } catch (e) {
      var img = new Image(); // fallback for very old browsers
      img.src = url;
    }
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    fire();
  } else {
    document.addEventListener('DOMContentLoaded', fire);
  }
})();
