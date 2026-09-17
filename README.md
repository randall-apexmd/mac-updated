# The M.A.C. × Apex MD — mac.apexmd.com

Static partner microsite for The M.A.C. (Midwest Athletic Club), Cedar Rapids /
Marion, IA. Edit the `*.html` files directly; there is no build step.

Modelled on the DF360 site (`DF360-revamp` repo / df-360-revamp.vercel.app): same
section architecture, quiz, offer bar and page set, rebranded to The M.A.C.

- **Deploy:** Vercel, auto-deploying from `main`. Repo root is the site root.
- **Brand tokens:** `mac-theme.css` (`:root`). The MAC × Apex MD accent is
  `#C50806` deep (CTA fills, red text on light) / `#FF4A38` bright — bright is
  for dark grounds only. Both sampled from the MAC launch kit.
- **Logos:** `img/mac/logo-mac-{white,dark}.webp` is the full lockup
  (mark + MIDWEST ATHLETIC CLUB + EVERY. BODY.); `logo-mac-mark-{white,dark}.webp`
  is the mark alone and is what goes inline in a headline. `assets/js/lockup.js`
  picks light/dark per rendered ground and keeps the two cuts in their own
  families — do not collapse them, a stacked lockup mid-sentence breaks the line.
- **Photography:** `img/mac/` is cropped out of the MAC Intro Launch kit
  (`ApexMD/MAC Full Launch Copy Deck/MAC Launch Kit/`) — real MAC club floors,
  the Xtreme signage, and the Meier/Bowen partnership shot. Source PNGs cap at
  1204–1920px wide, so the hero is a mild upscale. `img/apex/` and `img/hp/`,
  `img/trt/`, `img/product/` are brand-generic Apex MD assets.
- **Intake:** `https://formmac.apexmd.com/?categoryId=<cat>` —
  `weight-loss | microdosing | trt | hrt | longevity | bloodwork`.
- **Affiliate:** iDevAffiliate id **208** (`api/track.js`), fired by `affiliate.js`.
- **Offers:** GLP-1 is $100 off month one through member pricing (no code —
  mac.apexmd.com already shows $199 month one vs $299). Peptides, microdosing
  and NAD+ are $50 off month one with code **MAC50** (`MACFITNESS` also valid).
- **Pricing** follows what mac.apexmd.com sells today: TRT $99 one-time consult
  then from $199/mo; women's HRT $299 panel + consult then from $199/mo; NAD+
  $199 month one then $249/mo; sermorelin $249/mo; bloodwork $99 / $129 / $299.
- **Copy rule:** Apex MD is NOT bundled into a MAC membership. Use
  "The M.A.C. has partnered with…" / "exclusive member access".
  Never "included with your membership".
- **MAC brand facts:** tagline EVERY. BODY.; locally owned and family operated
  since 1984; four clubs (M.A.C. Xtreme + three 24/7 XPRESS); the club's own
  body scan is EVOLT, not InBody.
- **Preview:** `python3 -m http.server` from the repo root.
