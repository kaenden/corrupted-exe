# CORRUPTED.EXE — CrazyGames Submission Package

**Status:** code is release-ready for a **Basic Launch** (first) submission. This file is the fill‑and‑go
package: build/upload steps, the exact text to paste into the developer form, the marketing‑asset spec
(covers + videos you produce), the pre‑submission QA checklist, and the few things to confirm live in the
portal. Researched against the official docs (docs.crazygames.com) on 2026‑06; source URLs are inline.

---

## 0. Decisions (read first)

- **Launch tier: BASIC LAUNCH** (every new game's first submission → ~2‑week soft test of engagement KPIs,
  then you can request **Full Launch**). (docs.crazygames.com/requirements/intro/)
- **Ads: OFF for this submission.** CrazyGames **force‑disables ads during Basic Launch and shares no
  revenue** — and QA **rejects** a game that shows dead rewarded‑ad buttons while ads are off.
  (docs.crazygames.com/requirements/ads/, /requirements/technical/) Our build ships `adsEnabled = false`
  so the "2× shards" reward **grants instantly** (button reads **CLAIM**, not WATCH) and interstitials are
  skipped — while the SDK's loading + `gameplayStart/Stop` events still fire so CrazyGames detects the SDK.
  After CG approves Full Launch, flip **one flag** (`AdSystem.adsEnabled = true`) to turn on real ads.
- **SDK: CrazyGames HTML5 SDK v3** — `https://sdk.crazygames.com/crazygames-sdk-v3.js`, `await SDK.init()`.
  (docs.crazygames.com/sdk/intro/)

---

## 1. Build & upload

```bash
npm install
npm run build:cg      # vite build --mode crazygames → selects the CrazyGames SDK provider, ads OFF, progression LOCKED
```

- Output is in **`dist/`** (relative asset paths via `base:'./'` → runs from CrazyGames' CDN as‑is).
- **Zip the *contents* of `dist/`** (so `index.html` is at the zip root, not inside a `dist/` folder) and
  upload at **developer.crazygames.com/games → New game**.
- Total size ≈ **2.2 MB** (JS ~368 KB gzip + ~0.6 MB images) — well within CG limits (≤50 MB initial /
  ≤250 MB total / ≤1500 files). (docs.crazygames.com/requirements/technical/)
- Plain `npm run build` (no SDK, ad‑free) is what GitHub Pages auto‑deploys — **do not** upload that one to
  CrazyGames; use `build:cg`.

> Note: with the release build, the public GitHub Pages site is now **locked** (must clear levels to
> progress — dev unlock is off in production). For unlocked local testing run **`npm run dev`**.

---

## 2. Submission form — paste‑ready text

> Char limits live inside the gated portal form (couldn't be read from public docs) — trim to fit there.

**Title**
```
Corrupted.exe
```

**Short description / tagline**
```
The simulation lies to you. Every platform, every exit, every promise can be a trap — read the glitch, outrun the corruption, and escape the system.
```

**Long description**
```
You are UNIT_7, a process that woke up inside a simulation that does not want you to leave.

CORRUPTED.EXE is a neon precision platformer built on one rule: trust nothing. Platforms drop, fade, or were never solid. Spikes hide until you land. The exit slides away as you reach it. Gravity flips on a lie, the screen fakes your progress, and a wall of corruption is always closing in behind you — in every single level. Read the tells, commit to the jump, and don't believe what the system shows you.

• 60 hand‑built campaign levels across two simulations — SIM_ALPHA and the harder, faster SIM_BETA — each a wide, escalating gauntlet of deception traps and a chasing corruption wall.
• ESCAPE: an endless, accelerating high‑score run — bank checkpoints, grab backdoor keys, chase your best distance.
• Earn permanent abilities by beating each world: AIR DASH (clear SIM_ALPHA) and GHOST STEP (clear SIM_BETA).
• Spend CORE SHARDS in the shop on robot skins, death effects, and trails.
• Tight controls, coyote time, and a fair "learn‑by‑dying" design — every trap is readable the second time.

Mouse, keyboard, and full touch support. How far into the lie can you get?
```

**Controls / instructions** (the form's "Instructions" field)
```
Keyboard:
• Move — Arrow keys or A / D
• Jump — Up, W, or Space  (press jump again in mid‑air to AIR DASH, once unlocked)
• Ghost Step (phase through hazards, once unlocked) — Shift or X
• Pause — Esc

Touch:
• Move — left side of the screen
• Jump — right side of the screen  (multi‑touch: move and jump together)

Goal: reach the reality‑tear exit before the corruption wall catches you. Watch for fake platforms, hidden spikes, ceiling drop‑traps, and exits that lie.
```

**Category / Genre** (pick from the portal's fixed list)
```
Primary: Arcade  (alt: Adventure / Skill)
```

**Tags** (choose those CrazyGames offers; suggested set)
```
Platformer · Skill · Precision · Difficult · Arcade · 1 Player · Singleplayer · Neon · Trap
```

**Language:** English (mandatory; the game UI is English‑only).
**Age rating:** PEGI 12 compliant — audience 13+, no gore (death is a neon glitch‑burst), no real‑money,
no chat. (docs.crazygames.com/requirements/intro/)
**Privacy/T&C notice:** not required — the game collects no personal data (no `fetch`/XHR/tracking in the
build; saves are local `localStorage` only; only the CG SDK's own analytics events fire).

---

## 3. Marketing assets you produce (exact specs)

All dimensions verified at **docs.crazygames.com/requirements/game-covers/**. Five assets are required:
**3 covers + 2 preview videos.** (File format / cover max‑size are genuinely not specified by CG — use
standard web formats: PNG or JPG for covers, MP4 for video.)

| Asset | Exact size | Aspect | Format | Notes |
|---|---|---|---|---|
| Cover — **Landscape** | **1920 × 1080** | 16:9 | PNG/JPG | required |
| Cover — **Portrait** | **800 × 1200** | 2:3 | PNG/JPG | required |
| Cover — **Square** | **800 × 800** | 1:1 | PNG/JPG | required — also used as the grid thumbnail |
| Preview video — **Landscape** | **1080p** | 16:9 | MP4 | required · **15–20 s** · **≤ 50 MB** · **no sound** |
| Preview video — **Portrait** | **1080p** | 2:3 | MP4 | required · 15–20 s · ≤ 50 MB · no sound |

**Cover rules (CG, verbatim intent):** put the game's name on the cover; use a font that fits the game's
look; keep it clean, balanced, legible. **Don't** add borders; **don't** write anything but the title (no
"New/Updated/Play/Play now"); no store/platform icons or logos; avoid raw in‑game screenshots; nothing
blurry or pixelated.

**Video rules:** no opening/black‑screen transition, no black bars, no visible mouse cursor, no promo text,
no app/social icons, no fast‑forwarding — just clean gameplay.

> There is **no** separate screenshot / logo / app‑icon spec in CG's public docs — exactly the 3 covers +
> 2 videos above. Capture from the **`build:cg`** build at 1080p.

---

## 4. Pre‑submission QA checklist (already handled in code unless noted)

- [x] Loads straight into the game in ≤ 20 s, single click to play.
- [x] Mouse + keyboard + touch supported; landscape; portrait shows a "rotate" prompt on phones.
- [x] No external links / redirects / pop‑ups out of the game; no cross‑promo; no own ads.
- [x] No third‑party/brand IP in assets, prompts, or title; original art + procedural audio.
- [x] All resources first‑party — fonts are **self‑hosted** (no Google Fonts CDN request).
- [x] Ads gated off (`adsEnabled=false`) → no dead rewarded buttons during Basic Launch.
- [x] No dev backdoors in the production build (level unlock, skip keys, `window.game`/`GameState`,
      `LEVEL COMPLETE` log all stripped from the `build:cg` output — verified).
- [x] Clean console (0 errors verified on the built bundle).
- [x] Relative asset paths (`base:'./'`) → runs from CG's CDN.
- [ ] **You:** play the zipped `build:cg` once end‑to‑end on desktop **and** a phone before uploading.
- [ ] **You:** confirm the SDK shows `environment: "crazygames"` once hosted on CG (it's `"local"` on
      localhost, `"disabled"` on unapproved domains → the game safely falls back to ad‑free there).

---

## 5. After Basic Launch → Full Launch (later)

1. CrazyGames reviews Basic‑Launch engagement metrics; when eligible, request **Full Launch**.
2. Flip **`AdSystem.adsEnabled = true`** (`src/systems/ad/AdSystem.js`) → real rewarded ("WATCH FOR 2×")
   + interstitials switch on (cadence already wired: 1 per 5 clears, skipped after high‑death levels).
3. Rebuild `build:cg`, re‑upload. (Optional: in‑game purchases via CG/Xsolla — provider seam exists.)
4. Payouts (verified): min **€100**, monthly, ~by the 10th of the following month. Revenue‑share % is set
   in the signed Developer Portal terms (not published publicly — confirm there).

---

## 6. Confirm live in the portal (not answerable from public docs)

- Exact char limits for title / short / long description / tags.
- Whether an **AI‑content disclosure** is required (we have `AI_ART_DISCLOSURE.md` ready to provide — see §7).
- That CG accepts the cover format you export (PNG/JPG) and your MP4 codec.
- First‑submission review turnaround (only the post‑live *update* SLA is documented).

---

## 7. AI disclosure

`AI_ART_DISCLOSURE.md` (in repo root) is ready to attach/paste if CrazyGames asks. Summary: the small set
of raster images is FLUX.2‑Klein (local InvokeAI) generated from generic geometric/neon prompts with **no
third‑party IP**; most in‑game visuals and **all audio** are procedural (code‑generated). Original game,
code, and level design.
