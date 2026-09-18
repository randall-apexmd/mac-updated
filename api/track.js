/*
 * iDevAffiliate referral tracking - Vercel serverless port.
 *
 * WHY THIS EXISTS
 * The other Apex MD partner sites run WordPress, where this logic lives in a
 * `template_redirect` hook (see Tracking Items/iDevAffiliate Code Snippet.docx).
 * This microsite is static, so there is no PHP to run it. This function is the
 * faithful equivalent: it makes the same server-side call to iDevAffiliate with
 * the visitor's real IP, which is what makes commission attribution work.
 *
 * HOW ATTRIBUTION WORKS
 * iDevAffiliate is in IP-tracking mode - it records "this IP was referred by
 * affiliate 208". When that visitor later converts on formmac.apexmd.com,
 * iDev matches on IP and credits the partner. The call MUST be server-side and
 * MUST carry the visitor's real IP, or the partner does not get paid.
 *
 * AFFILIATE ID: mac.apexmd.com is iDev partner 208 (form: formmac.apexmd.com).
 */

const crypto = require('crypto');

const AFFILIATE_ID = 208; // mac.apexmd.com (iDev partner "mac")
const IDEV_ENDPOINT = 'https://apexmd.idevaffiliate.com/idevaffiliate.php';
const COOKIE_TTL = 86400; // 24 hours.
// The WordPress original used 600s (10 min), which re-fires for any visitor who
// browses longer than that - duplicate clicks in the iDev log for one real
// visit. iDevAffiliate only needs a single hit to attribute (it sets its own
// long-lived cookie and tracks by IP), so a wider window means one click per
// visitor per day with no loss of attribution.
const BLOCKED_AGENTS = ['godaddy', 'uptime', 'monitor', 'bot', 'crawl', 'spider'];

function md5(s) {
  return crypto.createHash('md5').update(s).digest('hex');
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach(function (part) {
    const i = part.indexOf('=');
    if (i > -1) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  });
  return out;
}

module.exports = async function handler(req, res) {
  // Never cache: every visitor must be evaluated individually.
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const ua = String(req.headers['user-agent'] || '').toLowerCase();
  for (const agent of BLOCKED_AGENTS) {
    if (ua.indexOf(agent) !== -1) {
      return res.status(204).end(); // bot - do not fire
    }
  }

  // Visitor's real IP, same precedence as the WordPress version.
  let ip = '';
  if (req.headers['cf-connecting-ip']) {
    ip = String(req.headers['cf-connecting-ip']);
  } else if (req.headers['x-forwarded-for']) {
    ip = String(req.headers['x-forwarded-for']).split(',')[0];
  } else if (req.headers['x-real-ip']) {
    ip = String(req.headers['x-real-ip']);
  } else if (req.socket && req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  }
  ip = ip.trim();
  if (!ip) return res.status(204).end();

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const cookies = parseCookies(req.headers.cookie);

  // Two guards, mirroring the WP version's two session keys: one keyed on the
  // IP, one on a per-browser id (covers a visitor whose IP shifts mid-session).
  const ipKey = 'idev_tracking_' + md5(ip + host);
  let vid = cookies['idev_vid'];
  const vidKey = vid ? 'idev_tracking_id_' + md5(vid + host) : null;

  if (cookies[ipKey] || (vidKey && cookies[vidKey])) {
    return res.status(204).end(); // already counted within the last 10 min
  }

  if (!vid) vid = crypto.randomBytes(16).toString('hex');
  const newVidKey = 'idev_tracking_id_' + md5(vid + host);

  // The page the visitor actually landed on.
  let pageUrl = '';
  try {
    pageUrl = String((req.query && req.query.url) || req.headers.referer || '');
  } catch (e) {
    pageUrl = String(req.headers.referer || '');
  }
  if (!pageUrl && host) pageUrl = 'https://' + host + '/';

  const trackingUrl =
    IDEV_ENDPOINT +
    '?ip_address=' + encodeURIComponent(ip) +
    '&id=' + AFFILIATE_ID +
    '&url=' + encodeURIComponent(pageUrl);

  let status = 'unknown';
  try {
    const controller = new AbortController();
    // The PHP original used a 2s curl timeout, but PHP had no cold start: the
    // WordPress process was already warm. A Vercel function's FIRST invocation
    // after idling has to boot before it can even open the socket, and 2s is
    // not enough -- observed live as `x-idev-status: error:AbortError` on a
    // cold call, then a clean 301 (~0.3s) on every warm one. An aborted hit is
    // a lost referral and an unpaid partner, and cold starts are common on a
    // low-traffic microsite, so the budget is 8s. It costs nothing: the
    // browser already has its 204 and nobody is waiting on this.
    const timer = setTimeout(function () { controller.abort(); }, 8000);
    // redirect:'manual' is REQUIRED, not a detail. idevaffiliate.php answers
    // with a 301 to www.apexmd.com, and the referral is recorded at that point.
    // Following the redirect pulls in the full WordPress homepage, which blows
    // past the 2s budget and aborts the request - the hit is then lost and the
    // partner goes unpaid. The PHP original behaves this way implicitly because
    // curl does not follow redirects unless CURLOPT_FOLLOWLOCATION is set.
    const r = await fetch(trackingUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'User-Agent': 'ApexMD-MAC-Tracker/1.0' }
    });
    clearTimeout(timer);
    // 301/302 is the success case here, not an error.
    status = String(r.status);
  } catch (err) {
    status = 'error:' + (err && err.name ? err.name : 'unknown');
  }

  // Replaces wc_get_logger() - visible in the Vercel dashboard under Logs.
  console.log(JSON.stringify({
    event: 'idev_track',
    affiliate_id: AFFILIATE_ID,
    ip: ip,
    host: host,
    url: pageUrl,
    ua: ua.slice(0, 120),
    idev_status: status
  }));

  // Verification aid: /api/track?debug=1 echoes the upstream iDevAffiliate
  // status in a response header. Exposes no visitor data - only whether the
  // referral hit was accepted. Safe to leave enabled.
  try {
    if (req.query && req.query.debug === '1') {
      res.setHeader('X-Idev-Status', status);
      res.setHeader('X-Idev-Affiliate', String(AFFILIATE_ID));
      res.setHeader('X-Idev-Ip-Seen', ip);
    }
  } catch (e) {}

  const attrs = '; Max-Age=' + COOKIE_TTL + '; Path=/; SameSite=Lax; Secure';
  res.setHeader('Set-Cookie', [
    ipKey + '=1' + attrs + '; HttpOnly',
    newVidKey + '=1' + attrs + '; HttpOnly',
    'idev_vid=' + vid + '; Max-Age=' + COOKIE_TTL + '; Path=/; SameSite=Lax; Secure; HttpOnly'
  ]);

  return res.status(204).end();
};
