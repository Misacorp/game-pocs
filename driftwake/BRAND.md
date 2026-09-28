# Driftwake — Visual Brand: "Scrimshaw & Lanternlight"

Reference implementation: `src/client/brand/tokens.css` (tokens + motif SVGs) and
`src/client/brand/components.css` (`.dwb-*` components). Live board: `npm run dev` → `/brand-board.html`.

## Concept
Driftwake's people live on the backs of Skywhales. Their folk art is **scrimshaw** — fine line engravings
scratched into whalebone by harpooners — and their nights are lit by **lanterns** and the Tidekeepers'
**bioluminescent** song-light. The UI is built from those three materials:

| Material | Role in UI |
|---|---|
| **Whale hide** — dark slate-teal with a faint barnacle speckle | every panel / surface |
| **Scrimshaw bone** — ivory engraved line-work | text, borders, ornaments, dividers |
| **Lantern glass** — warm amber glow | primary actions, focus, "you should look here" |
| **Tideglow** — bioluminescent teal | magic, selection, success, the mystical choices |

The recurring brand mark is **the wake**: three flowing lines left behind a swimming whale. It is the
divider, the title flourish, the loading motif and the logo underline. The **fluke** (whale tail) glyph is
the logo mark, favicon, list bullet and dialogue-option marker.

## Rules
1. **Surfaces are hide, never flat navy.** Use the hide gradient + `--dw-tex-hide` speckle + a 1px inner
   engraved line (`--dw-bone-faint`) 5px inside the edge. Major windows get the four scrimshaw corner ornaments.
2. **Amber means act.** Lantern color is reserved for primary CTAs, focus rings, hover glow, selected tabs,
   currency and the current objective. Never decorate with it. One lantern button per view.
3. **Teal means magic.** Tideglow marks mystical/choice moments (the "true ending" choice, buffs, success,
   stat increases). Coral marks danger/HP/stat decreases.
4. **Four typefaces, four jobs.** IM Fell English SC for names of places, people and windows (titles,
   banners, nameplates, logo) — never for body text or numbers. Alegreya Sans for reading. Alegreya Sans SC
   (letter-spaced) for labels, tabs and buttons. Pixelify Sans for every number the player tracks in play
   (HP/MP values, levels, damage numbers, gold, key caps, stack counts, timers) — it ties the UI to the
   pixel world.
5. **Bars are glass vials** (capsule, dark glass, liquid with meniscus highlight). HP coral, MP tideglass,
   XP whalesong gradient.
6. **Slots are sockets** — recessed bone-rimmed squares; rarity shows as an inner colored ring (epic and
   legendary also glow). Cooldowns sweep as dark ink.
7. **Portraits sit in portholes** (round brass-and-bone rim).
8. **Motion is tidal**: ease `--dw-ease`, windows rise 6px and fade in over 200ms, nothing bounces.
   Respect `prefers-reduced-motion`.
9. **Density**: 15px body, 13px secondary, 11px labels; panels breathe (≥12px padding); no text below 11px.

## Palette
Deep Current `#0B1519` · Whale Hide `#16242B` · Hide Ridge `#1D3038` · Hide Light `#27424C` ·
Scrimshaw Bone `#F1E6CF` · Bone Shadow `#B7AA90` · Lantern `#FFB347` · Tideglow `#5FE3C6` ·
Coral Heart `#FF6B6B` · Tideglass `#4CB8FF` · Whalesong `#B58CFF → #5FE3C6`.
Rarity: common `#E9E1CF`, uncommon `#7EE08A`, rare `#62B6FF`, epic `#C98BFF`, legendary `#FFB347`.
