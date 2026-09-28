/**
 * Injects the UI stylesheet once. All Driftwake UI classes are prefixed `dw-`.
 */
let injected = false;

export function injectStyles(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement('style');
  style.id = 'dw-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const CSS = `
/* All colors/fonts/motifs below draw on the brand tokens in src/client/brand/tokens.css
   ("Scrimshaw & Lanternlight" — see /BRAND.md). This file restyles the game's own \`dw-*\`
   classes to match that brand exactly, rather than duplicating markup with \`dwb-*\`. */

#ui, #ui * { box-sizing: border-box; }
#ui {
  font-family: var(--dw-font-body);
  cursor: var(--dw-cursor-default);
}
#ui a, #ui button, #ui .dw-slot, #ui .dw-tab, #ui .dw-charcard, #ui .dw-class-card,
#ui .dw-choice-card:not(.dw-locked), #ui .dw-swatch, #ui .dw-tracker-quest, #ui .dw-mon-card,
#ui .dw-dlg-opt, #ui .dw-map-node, #ui .dw-titlebar, #ui .dw-bind-key {
  cursor: var(--dw-cursor-point);
}
#ui input, #ui textarea, #ui select { cursor: text; }
#ui .dw-titlebar { cursor: var(--dw-cursor-point); }

.dw-caps { text-transform: uppercase; letter-spacing: var(--dw-track-label); font-family: var(--dw-font-label); }

/* ---------- Panel chrome (whale hide) ---------- */
.dw-panel {
  position: relative;
  background:
    var(--dw-tex-hide),
    radial-gradient(120% 80% at 50% 0%, rgba(255, 179, 71, 0.06), transparent 60%),
    linear-gradient(180deg, var(--dw-hide-2), var(--dw-hide) 38%, #121e24);
  border: 1px solid var(--dw-hide-edge);
  border-radius: var(--dw-radius);
  box-shadow: var(--dw-shadow), inset 0 1px 0 rgba(241, 230, 207, 0.08);
  color: var(--dw-bone);
  font-family: var(--dw-font-body);
  font-size: var(--dw-fs-md);
  line-height: 1.45;
}
/* inner engraved line, 5px inside the edge (BRAND.md rule 1) — border only, so it never needs to
   sit above panel content in z-order (no fill to occlude anything). */
.dw-panel::before { content: ''; position: absolute; inset: 5px; pointer-events: none; border: 1px solid var(--dw-bone-faint); border-radius: calc(var(--dw-radius) - 2px); }

.dw-window {
  position: absolute;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  min-width: 240px;
  transform-origin: top center;
  animation: dw-window-in var(--dw-dur-slow) var(--dw-ease) both;
}
@keyframes dw-window-in { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
.dw-window.dw-closing { animation: dw-window-out var(--dw-dur) var(--dw-ease) both; }
@keyframes dw-window-out { to { opacity:0; transform: translateY(4px); } }
@media (prefers-reduced-motion: reduce) { .dw-window, .dw-window.dw-closing { animation: none; } }

/* Nameplate header with wake flourishes either side (reuses .dwb-nameplate's look on the game's
   own .dw-titlebar so no window-creation code needs to change). */
.dw-titlebar {
  display:flex; align-items:center; justify-content:center; gap:10px;
  padding: 10px 40px 8px; position: relative;
  border-bottom: 1px solid var(--dw-bone-faint);
  user-select:none;
}
.dw-titlebar::before, .dw-titlebar::after {
  content: ''; width: 40px; height: 14px; flex: none;
  background: var(--dw-wake) center / 100% 100% no-repeat; opacity: 0.5;
}
.dw-titlebar::after { transform: scaleX(-1); }
.dw-titlebar .dw-title {
  font-family: var(--dw-font-display); font-size: var(--dw-fs-lg); letter-spacing: 0.03em;
  color: var(--dw-bone); text-shadow: 0 1px 0 #000, 0 0 12px rgba(255, 179, 71, 0.22);
  text-transform: none; font-weight: 400;
}
.dw-titlebar .dw-icon { width:18px; height:18px; image-rendering: pixelated; }
.dw-close {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--dw-bone-faint);
  background: radial-gradient(circle at 35% 30%, #3a5560, #16242b 70%);
  color: var(--dw-bone-dim); font: 600 12px/1 var(--dw-font-body); cursor: var(--dw-cursor-point);
  display:flex; align-items:center; justify-content:center;
}
.dw-close:hover { color: var(--dw-lantern-hot); box-shadow: var(--dw-glow-lantern); }

.dw-body { padding: 12px; overflow: auto; }

/* ---------- Buttons / inputs ---------- */
.dw-btn {
  background: linear-gradient(180deg, #2f4a54, #1d3038);
  border: 1px solid rgba(241, 230, 207, 0.28); color: var(--dw-bone);
  border-radius: var(--dw-radius-sm); padding: 0 14px; min-height: 30px;
  font: 700 var(--dw-fs-sm) / 1 var(--dw-font-label); letter-spacing: var(--dw-track-label);
  cursor: var(--dw-cursor-point); text-transform: uppercase;
  box-shadow: inset 0 1px 0 rgba(241, 230, 207, 0.12), 0 2px 0 rgba(0, 0, 0, 0.45);
  transition: filter var(--dw-dur) var(--dw-ease), box-shadow var(--dw-dur) var(--dw-ease), transform var(--dw-dur-fast) var(--dw-ease);
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
}
.dw-btn:hover { filter: brightness(1.14); }
.dw-btn:active { transform: translateY(1px); }
.dw-btn:disabled { opacity:0.45; cursor:default; filter: saturate(0.4); }
.dw-btn.dw-btn-primary {
  background: linear-gradient(180deg, var(--dw-lantern-hot), var(--dw-lantern) 48%, var(--dw-lantern-deep));
  color:#2a1606; border-color:#7a4212; text-shadow: 0 1px 0 rgba(255,240,200,.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 2px 0 #5e3310, 0 0 16px rgba(255,179,71,.25);
}
.dw-btn.dw-btn-primary:hover { box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 2px 0 #5e3310, 0 0 24px rgba(255,179,71,.5); }
.dw-btn.dw-btn-danger { background: linear-gradient(180deg, #d24e5c, #8e2438); border-color:#ff9a9a55; color:#ffe9e9; }
.dw-btn.dw-btn-ghost { background: transparent; border-color: var(--dw-bone-faint); box-shadow:none; color: var(--dw-bone-dim); }
.dw-btn.dw-btn-ghost:hover { color: var(--dw-bone); border-color: rgba(241,230,207,.45); }
.dw-btn-sm { min-height:24px; padding: 0 10px; font-size: var(--dw-fs-xs); }

input.dw-input, select.dw-select {
  background: rgba(5,11,13,0.55); border: 1px solid var(--dw-bone-faint); color: var(--dw-bone);
  border-radius: var(--dw-radius-sm); padding: 6px 9px; font: 400 var(--dw-fs-md) / 1.3 var(--dw-font-body); outline: none;
}
input.dw-input:focus, select.dw-select:focus { border-color: var(--dw-lantern); box-shadow: var(--dw-glow-lantern); }
input.dw-input::placeholder { color: var(--dw-bone-dim); }

/* ---------- Tabs ---------- */
.dw-tabs { display:flex; gap:2px; border-bottom: 1px solid var(--dw-bone-faint); padding: 0 8px; }
.dw-tab {
  padding: 7px 12px 6px; font: 700 var(--dw-fs-xs) / 1 var(--dw-font-label); letter-spacing: var(--dw-track-label);
  cursor:var(--dw-cursor-point); color: var(--dw-bone-dim); border-radius: 4px 4px 0 0;
  border: 1px solid transparent; border-bottom: none; text-transform: uppercase;
}
.dw-tab:hover { color: var(--dw-bone); }
.dw-tab.dw-active { color: var(--dw-lantern-hot); background: linear-gradient(180deg, rgba(255,179,71,0.14), transparent); border-color: var(--dw-bone-faint); box-shadow: 0 1px 0 var(--dw-hide-2); }

/* ---------- Slot grid (inventory / hotbar / skills) — recessed bone sockets ---------- */
.dw-slot {
  width: 44px; height: 44px; border-radius: 5px; position: relative;
  background: radial-gradient(circle at 50% 35%, #22393f, #0c171b 75%);
  border: 1px solid rgba(241, 230, 207, 0.22);
  box-shadow: inset 0 0 0 2px #0a1215, inset 0 2px 6px rgba(0,0,0,0.7);
  display:flex; align-items:center; justify-content:center; cursor: var(--dw-cursor-point);
}
.dw-slot:hover { border-color: rgba(255,179,71,0.6); box-shadow: inset 0 0 0 2px #0a1215, var(--dw-glow-lantern); }
.dw-slot img { width: 32px; height: 32px; image-rendering: pixelated; pointer-events:none; filter: drop-shadow(0 1px 0 rgba(0,0,0,.6)); }
.dw-slot .dw-count {
  position:absolute; right:3px; bottom:2px; font: 600 11px/1 var(--dw-font-pixel); color:#fff;
  text-shadow: 0 1px 0 #000, 0 0 2px #000;
}
.dw-slot .dw-keycap {
  position:absolute; left:2px; top:1px; font: 600 10px/1 var(--dw-font-pixel); color: var(--dw-bone-dim);
  text-shadow: 0 1px 0 #000;
}
.dw-slot.dw-empty { border-style: dashed; }
.dw-slot.dw-dragover { border-color: var(--dw-tide); box-shadow: inset 0 0 0 2px #0a1215, var(--dw-glow-tide); }
.dw-slot .dw-cd-sweep {
  position:absolute; inset:0; border-radius: inherit; background: conic-gradient(rgba(5,11,13,0.8) calc(var(--p) * 1%), transparent 0);
  pointer-events:none;
}
.dw-slot .dw-cd-text { position:absolute; font: 600 11px/1 var(--dw-font-pixel); color:#fff; text-shadow:0 1px 0 #000; }
.dw-grid { display:grid; grid-template-columns: repeat(auto-fill, 44px); gap: 6px; }

/* rarity socket rings */
.dw-rarity-common { color: var(--dw-r-common); }
.dw-rarity-uncommon { color: var(--dw-r-uncommon); }
.dw-rarity-rare { color: var(--dw-r-rare); }
.dw-rarity-epic { color: var(--dw-r-epic); }
.dw-rarity-legendary { color: var(--dw-r-legendary); }

/* ---------- Tooltip ---------- */
.dw-tooltip {
  position: fixed; z-index: 9999; pointer-events:none; width: 260px;
  padding: 12px 14px; font: 400 var(--dw-fs-sm) / 1.45 var(--dw-font-body);
  border-color: var(--rar, var(--dw-bone-faint));
  box-shadow: var(--dw-shadow), 0 0 22px color-mix(in srgb, var(--rar, transparent) 25%, transparent);
}
.dw-tooltip .dw-tt-name { font: 400 var(--dw-fs-lg) / 1.15 var(--dw-font-display); margin-bottom:3px; }
.dw-tooltip .dw-tt-sub { color: var(--dw-bone-dim); font: 500 var(--dw-fs-xs) / 1 var(--dw-font-label); letter-spacing: var(--dw-track-label); text-transform: uppercase; margin-bottom:6px; }
.dw-tooltip hr { border: none; border-top: 1px solid var(--dw-bone-faint); margin: 8px 0; }
.dw-tooltip .dw-stat-row { display:flex; justify-content:space-between; gap: 10px; font-variant-numeric: tabular-nums; font-family: var(--dw-font-pixel); font-size: var(--dw-fs-sm); }
.dw-tt-delta-pos { color: var(--dw-tide); }
.dw-tt-delta-neg { color: var(--dw-coral); }
.dw-tt-unmet { color: var(--dw-coral); }
.dw-tt-desc { color: var(--dw-bone-dim); font-style: italic; margin-top: 6px; font-family: var(--dw-font-body); }

/* ---------- HUD ---------- */
#dw-hud { position:absolute; inset:0; pointer-events:none; }
.dw-hud-bottom {
  position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:row; align-items:flex-end; justify-content:center;
  padding: 0 12px 10px; gap:10px; pointer-events:none;
}
/* level medallion — porthole-rimmed, job label on a little plate beneath */
.dw-medallion {
  width: 54px; height: 54px; border-radius: 50%; flex:none; position:relative; pointer-events:auto;
  display:grid; place-items:center; margin-bottom: 4px;
  background: radial-gradient(circle at 40% 30%, #3b5a63, #0d181c 70%);
  box-shadow: 0 0 0 2px #0b1417, 0 0 0 4px #b58a4a, 0 0 0 5px #4a3319, 0 0 16px rgba(255,179,71,.28);
}
.dw-medallion b { font: 600 20px/1 var(--dw-font-pixel); color: var(--dw-lantern-hot); text-shadow: 0 1px 0 #000; }
.dw-medallion small {
  position:absolute; bottom:-9px; left:50%; transform: translateX(-50%); white-space:nowrap;
  font: 700 9px/1 var(--dw-font-label); letter-spacing: var(--dw-track-label); color: var(--dw-bone-dim);
  background: #0b1417; padding: 2px 6px; border-radius: 3px; border: 1px solid var(--dw-bone-faint);
}
.dw-bars { display:flex; flex-direction:column; gap:4px; width: 320px; pointer-events:auto; padding-bottom: 3px; }
.dw-bar-row { display:flex; align-items:center; gap:6px; }
.dw-bar-label { width: 16px; font: 700 var(--dw-fs-xs) / 1 var(--dw-font-label); color: var(--dw-bone-dim); text-align:right; }
/* bars are glass vials (BRAND.md rule 5) */
.dw-bar-track {
  --pct: 0%; flex:1; height: 15px; border-radius: var(--dw-radius-vial); overflow:hidden; position: relative;
  background: linear-gradient(180deg, #050b0d, #13232a); border: 1px solid rgba(241,230,207,0.3);
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 0 rgba(241,230,207,0.08);
}
.dw-bar-track::after { content:''; position:absolute; left:8px; right:8px; top:2px; height:4px; border-radius:4px; background: linear-gradient(180deg, rgba(255,255,255,0.32), transparent); pointer-events:none; }
.dw-bar-fill {
  position:absolute; inset: 1px auto 1px 1px; width: var(--pct); height:auto; border-radius: inherit;
  transition: width var(--dw-dur-slow) var(--dw-ease); overflow:hidden;
}
.dw-bar-fill::after {
  content:''; position:absolute; inset:0; border-radius:inherit;
  background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.26) 45%, transparent 60%) -120% 0 / 60% 100% no-repeat;
  animation: dw-shimmer 4.5s linear infinite;
}
@keyframes dw-shimmer { to { background-position: 220% 0; } }
@media (prefers-reduced-motion: reduce) { .dw-bar-fill::after { animation:none; } }
.dw-bar-fill.dw-hp { background: linear-gradient(180deg, color-mix(in srgb, var(--dw-coral) 70%, white), var(--dw-coral) 40%, var(--dw-coral-deep)); box-shadow: 0 0 10px color-mix(in srgb, var(--dw-coral) 55%, transparent); }
.dw-bar-fill.dw-mp { background: linear-gradient(180deg, color-mix(in srgb, var(--dw-mana) 70%, white), var(--dw-mana) 40%, var(--dw-mana-deep)); box-shadow: 0 0 10px color-mix(in srgb, var(--dw-mana) 55%, transparent); }
.dw-bar-fill.dw-xp { background: linear-gradient(90deg, var(--dw-song-a), var(--dw-song-b)); }
.dw-bar-text {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font: 600 11px/1 var(--dw-font-pixel); letter-spacing:0.03em; color:#fff; text-shadow: 0 1px 0 #000, 0 0 3px #000;
}
.dw-xp-row .dw-bar-track { height: 8px; }
.dw-id-row { display:flex; justify-content:space-between; font: 400 var(--dw-fs-sm) / 1 var(--dw-font-display); color: var(--dw-bone-dim); padding: 0 3px 1px; }
.dw-id-row b { color: var(--dw-bone); font-weight:400; }
.dw-id-row span:last-child { font-family: var(--dw-font-label); font-size: var(--dw-fs-xs); letter-spacing: 0.04em; text-transform: uppercase; align-self:center; }

.dw-hotbar { display:flex; gap:5px; pointer-events:auto; background: rgba(8,15,18,.72); padding:7px; border-radius:8px; border:1px solid var(--dw-bone-faint); }

.dw-buffs { position:absolute; left: 14px; bottom: 150px; display:flex; flex-direction:column; gap:4px; pointer-events:auto; }
.dw-buff {
  display:flex; align-items:center; gap:6px; padding:3px 7px 3px 3px; border-radius: 999px;
  background: rgba(8,15,18,.75); border:1px solid var(--dw-bone-faint);
}
.dw-buff img { width:22px; height:22px; border-radius:50%; image-rendering:pixelated; background: radial-gradient(circle at 40% 30%, #22393f, #0c171b); }
.dw-buff .dw-buff-time { font: 600 10px/1 var(--dw-font-pixel); color: var(--dw-tide); min-width: 24px; }

/* ---------- Minimap — navigator's sky-chart ---------- */
.dw-minimap {
  position:absolute; top: 14px; right: 14px; pointer-events:auto;
  padding: 6px; display:flex; flex-direction:column; gap:4px; align-items:center;
}
.dw-minimap .dw-minimap-name {
  font: 400 var(--dw-fs-md) / 1 var(--dw-font-display); color: var(--dw-bone); letter-spacing:0.02em;
  max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
}
.dw-minimap canvas {
  border-radius: 4px; background:
    repeating-linear-gradient(0deg, rgba(241,230,207,0.05) 0 1px, transparent 1px 19px),
    repeating-linear-gradient(90deg, rgba(241,230,207,0.05) 0 1px, transparent 1px 19px),
    radial-gradient(120% 100% at 50% 0%, #17282f, #0a1418 80%);
  box-shadow: inset 0 0 0 1px var(--dw-bone-faint), inset 0 2px 8px rgba(0,0,0,.6);
}
/* compass-rose ornament, top-right of the sky-chart */
.dw-minimap::after {
  content:''; position:absolute; top:5px; right:6px; width:13px; height:13px; pointer-events:none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23f1e6cf' stroke-linecap='round'%3E%3Ccircle cx='10' cy='10' r='8' stroke-opacity='.5' stroke-width='1'/%3E%3Cpath d='M10 2v4M10 14v4M2 10h4M14 10h4' stroke-opacity='.6'/%3E%3Cpath fill='%23ffb347' stroke='none' d='M10 4 12 10 10 16 8 10Z'/%3E%3C/svg%3E") center / contain no-repeat;
  opacity: 0.85;
}

/* ---------- Quest tracker — logbook margin (compact, PLAYTEST feedback #2) --------------------
   Positioned in JS (tracker.ts) below the minimap with a gap, so its CSS top/right here are just
   an unpositioned fallback before the first reposition() call. Semi-transparent + capped height
   so it blocks as little of the upper-right playfield as possible, and fades near the player. */
.dw-tracker {
  position:absolute; top: 170px; right: 14px; width: 200px; max-height: 260px; overflow:hidden;
  pointer-events:auto; opacity: 0.92; transition: opacity var(--dw-dur) var(--dw-ease);
}
.dw-tracker.dw-tracker-faded { opacity: 0.28; }
.dw-tracker-head {
  display:flex; align-items:center; justify-content:space-between; padding: 2px 2px 5px;
  font: 700 var(--dw-fs-xs) / 1 var(--dw-font-label); letter-spacing: var(--dw-track-label); color: var(--dw-bone-dim);
}
.dw-tracker-toggle {
  background:none; border:none; color: var(--dw-bone-dim); cursor: var(--dw-cursor-point); font-size:12px;
  padding: 2px 6px; border-radius:4px; line-height:1;
}
.dw-tracker-toggle:hover { color: var(--dw-lantern-hot); background: rgba(255,179,71,0.1); }
.dw-tracker.dw-collapsed .dw-tracker-list { display:none; }
/* Nothing tracked — collapse to nothing rather than an empty panel over the map (never overrides
   dw-collapsed's own display since that's a modifier on the list, not the root). */
.dw-tracker.dw-tracker-empty { display:none; }
.dw-tracker-list { display:flex; flex-direction:column; gap:5px; max-height: 232px; overflow-y:auto; }
.dw-tracker-quest {
  padding: 6px 9px 6px 22px; position: relative; background: rgba(11,21,25,0.55); backdrop-filter: blur(1px);
}
.dw-tracker-quest::before {
  content:''; position:absolute; left:8px; top:9px; width:13px; height:9px;
  background: var(--dw-fluke-mini) center / contain no-repeat; opacity:0.7;
}
.dw-tracker-quest .dw-tq-name { font: 400 var(--dw-fs-sm) / 1.15 var(--dw-font-display); color: var(--dw-bone); }
.dw-tracker-quest.dw-ready .dw-tq-name { color: var(--dw-tide); }
.dw-tracker-quest.dw-ready::before { opacity:1; filter: sepia(1) saturate(6) hue-rotate(115deg) brightness(1.3); }
.dw-tracker-quest .dw-tq-obj { font: 400 10.5px / 1.3 var(--dw-font-body); color: var(--dw-bone-dim); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dw-tracker-quest .dw-tq-obj.dw-tq-return { color: var(--dw-lantern-hot); font-family: var(--dw-font-label); letter-spacing:0.03em; text-transform:uppercase; font-size: 9.5px; }
.dw-tq-more {
  font: 500 11px/1 var(--dw-font-label); letter-spacing:0.02em; color: var(--dw-bone-dim); text-align:center; padding: 4px 0;
}
.dw-tq-more { cursor: var(--dw-cursor-point); }
.dw-tq-more:hover { color: var(--dw-lantern-hot); }

/* ---------- Notifications / toasts / banner / boss bar / hint ---------- */
/* Left column stacks bottom-up: chat, then feed, then buffs — all clear of the centered
   HUD cluster (helm + vials + hotbar), which is ~93px tall regardless of viewport size
   (measured at both 1280x720 and 1920x1080). Kept as fixed px offsets, not tied to the
   HUD's own width, since the HUD is centered and only its *height* is what the left
   column has to clear. */
.dw-feed { position:absolute; left: 14px; bottom: 250px; width: 270px; display:flex; flex-direction:column-reverse; gap:4px; pointer-events:none; }
.dw-feed-item {
  font: 400 12px/1.3 var(--dw-font-body); padding: 5px 9px; border-radius: 4px; background: rgba(8,15,18,0.62);
  animation: dw-feed-in var(--dw-dur) var(--dw-ease) both; border-left: 2px solid var(--dw-bone-faint);
}
.dw-feed-item span { font-family: var(--dw-font-pixel); }
@keyframes dw-feed-in { from { opacity:0; transform: translateX(-8px);} to {opacity:1; transform:none;} }
@media (prefers-reduced-motion: reduce) { .dw-feed-item { animation:none; } }
.dw-feed-item.dw-good { border-left-color: var(--dw-tide); }
.dw-feed-item.dw-warn { border-left-color: var(--dw-lantern-deep); }
.dw-feed-item.dw-error { border-left-color: var(--dw-coral); }
.dw-feed-item.dw-loot { border-left-color: var(--dw-lantern); }
.dw-feed-item.dw-quest { border-left-color: var(--dw-r-epic); }

.dw-toasts { position:absolute; top: 14px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; gap:6px; align-items:center; pointer-events:none; }
.dw-toast {
  padding: 8px 18px; border-radius: var(--dw-radius); font: 700 var(--dw-fs-sm) / 1 var(--dw-font-label); letter-spacing:0.02em;
  animation: dw-toast-in var(--dw-dur) var(--dw-ease) both;
}
@keyframes dw-toast-in { from {opacity:0; transform: translateY(-10px);} to {opacity:1; transform:none;} }
.dw-toast.dw-fade-out { animation: dw-toast-out var(--dw-dur) var(--dw-ease) both; }
@keyframes dw-toast-out { to { opacity:0; transform: translateY(-6px); } }
@media (prefers-reduced-motion: reduce) { .dw-toast, .dw-toast.dw-fade-out { animation:none; } }

.dw-banner {
  position:absolute; top: 20%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none;
  animation: dw-banner-in var(--dw-dur-slow) var(--dw-ease) both;
}
@keyframes dw-banner-in { from {opacity:0; transform:translate(-50%,-58%);} to {opacity:1; transform:translate(-50%,-50%);} }
.dw-banner.dw-fade-out { animation: dw-banner-out var(--dw-dur-slow) var(--dw-ease) both; }
@keyframes dw-banner-out { to { opacity:0; } }
@media (prefers-reduced-motion: reduce) { .dw-banner, .dw-banner.dw-fade-out { animation:none; } }
.dw-banner .dw-banner-title {
  font: 400 var(--dw-fs-3xl) / 1 var(--dw-font-display); letter-spacing:0.03em; color: var(--dw-bone);
  text-shadow: 0 3px 10px rgba(0,0,0,0.8), 0 0 26px rgba(255,179,71,0.45);
}
.dw-banner .dw-banner-wake { width: 220px; height: 14px; margin: 6px auto 0; background: var(--dw-wake) center / 100% 100% no-repeat; opacity:0.55; }
.dw-banner.dw-level .dw-banner-title { color: var(--dw-lantern-hot); text-shadow: 0 3px 10px rgba(0,0,0,0.8), 0 0 34px rgba(255,179,71,0.6); }
.dw-banner.dw-job .dw-banner-title { color: var(--dw-tide); text-shadow: 0 3px 10px rgba(0,0,0,0.8), 0 0 30px rgba(95,227,198,0.55); }
.dw-banner.dw-achievement .dw-banner-title { color: var(--dw-r-epic); text-shadow: 0 3px 10px rgba(0,0,0,0.8), 0 0 30px rgba(201,139,255,0.55); }
.dw-banner .dw-banner-sub { font: 500 var(--dw-fs-md) / 1 var(--dw-font-label); letter-spacing:0.06em; text-transform:uppercase; color: var(--dw-bone-dim); margin-top:6px; text-shadow: 0 2px 6px rgba(0,0,0,0.8); }

/* Harpoon-and-barnacle boss bar (no skulls per BRAND.md) */
.dw-bossbar { position:absolute; top: 14px; left:50%; transform:translateX(-50%); width: 440px; pointer-events:none; padding: 8px 16px; text-align:center; }
.dw-bossbar .dw-boss-name { font: 400 var(--dw-fs-lg) / 1 var(--dw-font-display); color: var(--dw-bone); letter-spacing:0.02em; display:flex; align-items:center; justify-content:center; gap:8px; }
.dw-bossbar .dw-boss-name::before, .dw-bossbar .dw-boss-name::after {
  content:''; width:16px; height:16px; flex:none; opacity:0.8;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23ff6b6b' stroke-linecap='round' stroke-width='1.4'%3E%3Cpath d='M2 18 12 8'/%3E%3Cpath d='M11 5l4 4-2 2-4-4Z' fill='%23ff6b6b' stroke='none'/%3E%3Cpath d='M13.5 2.5l1 1M15.5 4.5l1 1'/%3E%3C/svg%3E") center / contain no-repeat;
}
.dw-bossbar .dw-boss-name::after { transform: scaleX(-1); }
.dw-bossbar .dw-boss-title { font: 500 var(--dw-fs-xs) / 1 var(--dw-font-label); letter-spacing: var(--dw-track-label); text-transform:uppercase; color: var(--dw-coral); margin-bottom:5px; }
.dw-bossbar .dw-bar-track { height:13px; }
.dw-bossbar .dw-bar-fill { background: linear-gradient(180deg, color-mix(in srgb, var(--dw-coral) 70%, white), var(--dw-coral) 40%, var(--dw-coral-deep)); box-shadow: 0 0 10px color-mix(in srgb, var(--dw-coral) 55%, transparent); }

.dw-hint {
  position:absolute; bottom: 164px; left:50%; transform:translateX(-50%); padding: 6px 14px;
  font: 500 var(--dw-fs-sm) / 1 var(--dw-font-label); letter-spacing:0.02em; color: var(--dw-lantern-hot); pointer-events:none; white-space:nowrap;
}

/* Tips: small scroll/hide plate with a lantern pip */
.dw-tip {
  display:flex; align-items:center; gap:8px; max-width: 340px; padding: 10px 12px 10px 14px; position:relative;
  pointer-events:auto; animation: dw-toast-in var(--dw-dur) var(--dw-ease) both;
}
.dw-tip::before { content:''; position:absolute; left:0; top:8px; bottom:8px; width:3px; border-radius:2px; background: var(--dw-lantern); box-shadow: 0 0 8px var(--dw-lantern); }

/* ---------- Death dialog ---------- */
.dw-death-overlay { position:absolute; inset:0; background: rgba(11,21,25,0.72); pointer-events:auto; display:flex; align-items:center; justify-content:center; animation: dw-fade-in var(--dw-dur-slow) ease both; }
@keyframes dw-fade-in { from{opacity:0;} to {opacity:1;} }
.dw-death-box { text-align:center; padding: 30px 40px; }
.dw-death-box h2 { margin:0 0 10px; color: var(--dw-coral); font: 400 var(--dw-fs-2xl) / 1 var(--dw-font-display); letter-spacing:0.03em; }

/* ---------- Chat — translucent hide strip ---------- */
/* bottom:100 (not 14) so an active input row + a full 60-line-scrollback log never reaches
   down into the centered HUD cluster (helm medallion + HP/MP/XP vials) behind it. */
.dw-chat { position:absolute; left: 14px; bottom: 100px; width: 270px; display:flex; flex-direction:column; pointer-events:auto; background: rgba(11,21,25,0.55); backdrop-filter: blur(2px); }
.dw-chat-log { max-height: 120px; overflow-y:auto; display:flex; flex-direction:column; gap:2px; padding: 7px 9px; font-size:12px; }
.dw-chat-log div { line-height:1.4; }
.dw-chat-log .dw-chat-system { color: var(--dw-bone-dim); font-style:italic; }
.dw-chat-log .dw-chat-name { color: var(--dw-tide); font-weight:700; margin-right:4px; }
.dw-chat-input-row { border-top: 1px solid var(--dw-bone-faint); display:none; }
.dw-chat-input-row.dw-active { display:flex; }
.dw-chat-input-row input { flex:1; background:transparent; border:none; color: var(--dw-bone); padding: 7px 9px; font: 400 12.5px/1 var(--dw-font-body); outline:none; }

/* ---------- Dialogue — porthole + tide title + fluke options ---------- */
.dw-dialogue-window { width: 580px; }
.dw-dlg-top { display:flex; gap:16px; padding: 16px 16px 4px; }
.dw-dlg-portrait {
  width:78px; height:78px; border-radius:50%; flex-shrink:0; image-rendering:pixelated; object-fit: cover;
  background: radial-gradient(circle at 50% 40%, #2c4750, #0d181c);
  box-shadow: 0 0 0 3px #0b1417, 0 0 0 5px #b58a4a, 0 0 0 6px #5d4122, 0 0 0 7px rgba(241,230,207,.25);
}
.dw-dlg-name { font: 400 var(--dw-fs-xl) / 1 var(--dw-font-display); color: var(--dw-bone); letter-spacing:0.02em; }
.dw-dlg-title { font: 500 var(--dw-fs-xs) / 1 var(--dw-font-label); letter-spacing: var(--dw-track-label); text-transform:uppercase; color: var(--dw-tide); margin: 4px 0 8px; }
.dw-dlg-text { font: 400 var(--dw-fs-md) / 1.55 var(--dw-font-body); min-height: 54px; cursor: var(--dw-cursor-point); }
.dw-dlg-text .dw-caret { opacity:0.6; }
.dw-dlg-options { display:flex; flex-direction:column; gap:5px; padding: 4px 16px 16px; }
.dw-dlg-opt {
  text-align:left; padding: 9px 12px 9px 30px; border-radius: var(--dw-radius-sm); position: relative;
  background: rgba(241, 230, 207, 0.03); border:1px solid transparent;
  cursor: var(--dw-cursor-point); font: 500 var(--dw-fs-md) / 1.3 var(--dw-font-body); display:flex; gap:8px; align-items:center;
}
.dw-dlg-opt::before {
  content:''; position:absolute; left:10px; top:50%; width:14px; height:10px; transform: translateY(-50%);
  background: var(--dw-fluke-mini) center / contain no-repeat; opacity:0.8;
}
.dw-dlg-opt:hover { border-color: rgba(255,179,71,0.35); background: rgba(255,179,71,0.08); }
.dw-dlg-opt:hover::before { opacity:1; filter: sepia(1) saturate(6) hue-rotate(-8deg) brightness(1.15); }
.dw-dlg-opt .dw-dlg-marker { font-family: var(--dw-font-label); font-weight:800; width:14px; text-align:center; }
.dw-dlg-opt.dw-marker-ready .dw-dlg-marker { color: var(--dw-tide); }
.dw-dlg-opt.dw-marker-offer .dw-dlg-marker { color: var(--dw-lantern-hot); }
.dw-dlg-opt.dw-marker-progress .dw-dlg-marker { color: var(--dw-bone-dim); }
.dw-dlg-opt.dw-goodbye { color: var(--dw-bone-dim); }
.dw-dlg-opt.dw-goodbye::before { display:none; }
.dw-dlg-reward-row { display:flex; gap:6px; flex-wrap:wrap; padding: 8px 0; }
.dw-dlg-reward { display:flex; align-items:center; gap:5px; background: rgba(241,230,207,0.05); border: 1px solid var(--dw-bone-faint); border-radius: var(--dw-radius-sm); padding:4px 8px; font: 600 11.5px/1 var(--dw-font-pixel); }
.dw-dlg-reward img { width:18px; height:18px; image-rendering:pixelated; }
.dw-dlg-obj { font: 400 var(--dw-fs-sm) / 1.4 var(--dw-font-body); color: var(--dw-bone-dim); padding: 2px 0; }
.dw-dlg-obj.dw-done { color: var(--dw-tide); }
/* choice cards — tall engraved tablets */
.dw-choice-card {
  padding: 12px 14px; border-radius: var(--dw-radius); border:1px solid var(--dw-bone-faint);
  background: linear-gradient(180deg, rgba(241,230,207,0.04), transparent);
  cursor: var(--dw-cursor-point); margin-bottom:7px;
}
.dw-choice-card:hover { border-color: rgba(255,179,71,0.4); }
.dw-choice-card.dw-selected { border-color: var(--dw-tide); background: rgba(95,227,198,0.1); box-shadow: var(--dw-glow-tide); }
.dw-choice-card .dw-choice-label { font: 400 var(--dw-fs-lg) / 1 var(--dw-font-display); color: var(--dw-bone); margin-bottom:5px; }
.dw-choice-card .dw-choice-desc { font-size:11.5px; color: var(--dw-bone-dim); }
/* the locked true-ending choice shimmers with tideglow behind a scrimshaw padlock (BRAND.md) */
.dw-choice-card.dw-locked {
  cursor: default; position: relative; overflow: hidden;
  background: linear-gradient(160deg, rgba(95,227,198,0.08), rgba(241,230,207,0.02));
  border-style: dashed; border-color: rgba(95,227,198,0.35);
}
.dw-choice-card.dw-locked::before {
  content:''; position:absolute; inset:-40% -20%; pointer-events:none;
  background: radial-gradient(closest-side, rgba(95,227,198,0.28), transparent 70%);
  animation: dw-tideglow 3.2s ease-in-out infinite;
}
@keyframes dw-tideglow { 0%, 100% { opacity:0.35; transform: scale(0.9); } 50% { opacity:0.8; transform: scale(1.05); } }
@media (prefers-reduced-motion: reduce) { .dw-choice-card.dw-locked::before { animation:none; } }
.dw-choice-card.dw-locked:hover { border-color: rgba(95,227,198,0.55); }
.dw-choice-card.dw-locked .dw-choice-label { color: var(--dw-tide); display:flex; align-items:center; gap:7px; }
.dw-choice-card.dw-locked .dw-choice-label::before {
  content:''; width:13px; height:15px; flex:none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 13 15' fill='none' stroke='%235fe3c6' stroke-width='1.2'%3E%3Crect x='1' y='6.5' width='11' height='7.5' rx='1.4' fill='rgba(95,227,198,.18)'/%3E%3Cpath d='M3.3 6.5V4.2A3.2 3.2 0 0 1 6.5 1a3.2 3.2 0 0 1 3.2 3.2V6.5'/%3E%3C/svg%3E") center / contain no-repeat;
}
.dw-choice-card.dw-locked .dw-choice-hint { font-size:11px; color: var(--dw-bone-dim); font-style: italic; margin-top:4px; }
.dw-dlg-actions { display:flex; gap:8px; justify-content:flex-end; padding: 0 16px 16px; }

/* ---------- Character paperdoll — engraved silhouette + sockets ---------- */
.dw-paperdoll {
  position:relative; width: 180px; height: 220px; margin: 0 auto; border-radius: var(--dw-radius);
  background: var(--dw-tex-hide), radial-gradient(ellipse at center, rgba(255,179,71,0.08), transparent 70%);
  box-shadow: inset 0 0 0 1px var(--dw-bone-faint);
}
.dw-paperdoll img.dw-doll-preview { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:96px; height:120px; image-rendering:pixelated; filter: drop-shadow(0 4px 6px rgba(0,0,0,.5)); }
.dw-eq-slot { position:absolute; }
.dw-stat-row2 { display:flex; justify-content:space-between; padding: 4px 3px; font: 400 var(--dw-fs-sm) / 1 var(--dw-font-body); align-items:center; }
.dw-stat-row2 span:first-child { color: var(--dw-bone-dim); font-family: var(--dw-font-label); font-size: var(--dw-fs-xs); letter-spacing:0.04em; text-transform:uppercase; }
.dw-stat-plus { width:20px; height:20px; border-radius:4px; padding:0; min-height:0; background: linear-gradient(180deg, var(--dw-lantern-hot), var(--dw-lantern) 48%, var(--dw-lantern-deep)); color:#2a1606; border-color:#7a4212; }

/* ---------- Progress bars (professions, gathering) ---------- */
.dw-prof-bar { height: 10px; border-radius: var(--dw-radius-vial); background: rgba(5,11,13,0.6); overflow:hidden; border:1px solid var(--dw-bone-faint); }
.dw-prof-bar > div { height:100%; background: linear-gradient(90deg, var(--dw-song-a), var(--dw-song-b)); }

/* ---------- World map — illustrated sky-chart -----------------------------------------------
   A compact grid of region cards (fits 1280x720 with no clipping/scrolling): each region is its
   own stylized skywhale, biome-tinted, carrying its maps as small islands along its back. */
.dw-skychart-grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.dw-region-card {
  position:relative; border-radius: var(--dw-radius-sm); border:1px solid var(--dw-bone-faint);
  background: linear-gradient(180deg, rgba(241,230,207,0.03), transparent); padding: 8px 8px 6px;
}
.dw-region-card.dw-region-current { border-color: rgba(255,179,71,0.45); box-shadow: var(--dw-glow-lantern); }
.dw-region-name {
  font: 400 var(--dw-fs-md) / 1 var(--dw-font-display); color: var(--dw-bone); text-align:center;
  letter-spacing:0.02em; margin-bottom: 4px;
}
.dw-region-whale { position:relative; height: 112px; }
.dw-region-whale svg { position:absolute; inset:0; width:100%; height:100%; filter: drop-shadow(0 3px 6px rgba(0,0,0,.5)); }
.dw-region-whale .dw-chart-routes { fill:none; stroke: rgba(241,230,207,0.4); stroke-width:1.3; stroke-dasharray: 2.5 4; }

.dw-chart-isle {
  position:absolute; transform: translate(-50%, -50%); display:flex; flex-direction:column; align-items:center;
  cursor: var(--dw-cursor-point); transition: transform var(--dw-dur) var(--dw-ease);
}
.dw-chart-isle:hover { transform: translate(-50%, -50%) translateY(-2px); }
.dw-chart-isle .dot {
  position:relative; width:13px; height:13px; border-radius:50%; margin-bottom:2px;
  background: radial-gradient(circle at 35% 30%, var(--dw-hide-3), var(--dw-hide) 70%);
  border: 1.5px solid var(--dw-bone-faint); box-shadow: 0 1px 3px rgba(0,0,0,.6);
}
.dw-chart-isle.town .dot { border-color: var(--dw-lantern); box-shadow: 0 0 6px rgba(255,179,71,.55); }
.dw-chart-isle.boss .dot { border-color: var(--dw-coral); box-shadow: 0 0 6px rgba(255,107,107,.55); }
.dw-chart-isle .badge { position:absolute; top:-6px; right:-6px; width:10px; height:10px; }
.dw-chart-isle.town .badge {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffb347' d='M6 1 11 5.5V6H10v5H2V6H1v-.5Z'/%3E%3C/svg%3E") center / contain no-repeat;
}
.dw-chart-isle.boss .badge {
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cg stroke='%23ff6b6b' stroke-width='1.3' stroke-linecap='round'%3E%3Cpath d='M1 11 9 3'/%3E%3Cpath d='M11 1 3 9'/%3E%3C/g%3E%3C/svg%3E") center / contain no-repeat;
}
.dw-chart-isle .label { font: 400 11px/1 var(--dw-font-display); color: var(--dw-bone); white-space:nowrap; }
.dw-chart-isle .lvl { font: 600 9px/1 var(--dw-font-pixel); color: var(--dw-bone-dim); margin-top:1px; }
.dw-chart-isle.current .dot {
  background: var(--dw-lantern); border-color: var(--dw-lantern-hot); box-shadow: 0 0 10px var(--dw-lantern);
}
.dw-chart-isle.current .dot::after {
  content:''; position:absolute; inset:-6px; border-radius:50%; border: 1.5px solid var(--dw-lantern);
  animation: dw-pulse-ring 1.8s ease-out infinite;
}
.dw-chart-isle.current .label { color: var(--dw-lantern-hot); }
.dw-chart-isle.unknown .dot { filter: grayscale(1) brightness(0.6); opacity:.55; border-style: dashed; }
.dw-chart-isle.unknown .label { color: var(--dw-bone-dim); font-style: italic; }
@keyframes dw-pulse-ring { 0% { opacity:0.9; transform: scale(0.7); } 100% { opacity:0; transform: scale(2.1); } }
@media (prefers-reduced-motion: reduce) { .dw-chart-isle.current .dot::after { animation:none; } }

.dw-skychart-legend { display:flex; gap:14px; flex-wrap:wrap; font: 500 10.5px/1 var(--dw-font-label); letter-spacing:0.03em; text-transform:uppercase; color: var(--dw-bone-dim); margin-top:8px; }
.dw-skychart-legend span { display:inline-flex; align-items:center; gap:5px; }
.dw-skychart-legend i { width:9px; height:9px; border-radius:50%; display:inline-block; }

/* ---------- Bestiary — naturalist's field-journal plates ---------- */
.dw-bestiary-grid { display:grid; grid-template-columns: repeat(auto-fill, 100px); gap:10px; }
.dw-mon-card {
  padding:7px; text-align:center; border-radius: var(--dw-radius-sm); border:1px solid var(--dw-bone-faint);
  background: linear-gradient(180deg, rgba(241,230,207,0.04), transparent); cursor: var(--dw-cursor-point);
}
.dw-mon-card.dw-unseen { opacity:0.32; filter: grayscale(1); }
.dw-mon-card img { width:40px; height:40px; image-rendering:pixelated; }
.dw-mon-card .dw-mon-name { font: 400 var(--dw-fs-sm) / 1 var(--dw-font-display); margin-top:3px; color: var(--dw-bone); }
.dw-mon-card .dw-mon-kills { font: 600 9.5px/1 var(--dw-font-pixel); color: var(--dw-bone-dim); margin-top:2px; }

.dw-ach-list { display:flex; flex-direction:column; gap:6px; max-height: 420px; overflow-y:auto; }
.dw-ach-row { display:flex; gap:10px; align-items:flex-start; padding:8px 10px; border-radius: var(--dw-radius-sm); border:1px solid var(--dw-bone-faint); background: rgba(241,230,207,0.02); }
.dw-ach-row.dw-ach-locked { opacity:0.5; }
.dw-ach-row.dw-ach-unlocked { border-color: rgba(255,179,71,0.4); background: rgba(255,179,71,0.06); opacity:1; }
.dw-ach-icon { width:28px; height:28px; image-rendering:pixelated; flex-shrink:0; margin-top:1px; border-radius:50%; }
.dw-ach-info { flex:1; min-width:0; }
.dw-ach-name { font: 400 var(--dw-fs-md) / 1 var(--dw-font-display); color: var(--dw-bone); }
.dw-ach-desc { font-size:11px; color: var(--dw-bone-dim); margin-top:2px; }
.dw-ach-date { display:flex; align-items:center; gap:5px; font: 600 10px/1 var(--dw-font-pixel); color: var(--dw-tide); margin-top:4px; }
.dw-ach-seal { width:12px; height:9px; flex:none; background: var(--dw-fluke-mini) center / contain no-repeat; opacity:0.9; filter: sepia(1) saturate(4) hue-rotate(-5deg); }
.dw-ach-progress { flex:1; }

/* ---------- Keyboard navigation (PLAYTEST feedback #1) -----------------------------------------
   Shared across the dialogue window, quest log, shop and confirmDialog. */
.dw-kbd-focus {
  outline: none; border-color: var(--dw-lantern) !important;
  box-shadow: var(--dw-glow-lantern), inset 0 0 0 1px rgba(255,179,71,0.35) !important;
}
.dw-dlg-opt.dw-kbd-focus { background: rgba(255,179,71,0.1); }
.dw-dlg-opt.dw-kbd-focus::before { opacity:1; filter: sepia(1) saturate(6) hue-rotate(-8deg) brightness(1.15); }
/* number chip — small Pixelify badge showing which digit key (1-9) picks this option */
.dw-kbd-num {
  display:inline-flex; align-items:center; justify-content:center; flex:none;
  width:15px; height:15px; border-radius:3px; margin-right:2px;
  background: rgba(241,230,207,0.1); border: 1px solid var(--dw-bone-faint);
  font: 600 10px/1 var(--dw-font-pixel); color: var(--dw-bone-dim);
}
.dw-kbd-focus .dw-kbd-num { color: var(--dw-lantern-hot); border-color: var(--dw-lantern); }
.dw-kbd-hint {
  text-align:center; padding: 6px 10px 2px; font: 500 10.5px/1 var(--dw-font-label); letter-spacing:0.03em;
  color: var(--dw-bone-dim); text-transform:uppercase; border-top: 1px solid var(--dw-bone-faint); margin-top:4px;
}
.dw-choice-card.dw-kbd-focus, .dw-btn.dw-kbd-focus { border-color: var(--dw-lantern) !important; box-shadow: var(--dw-glow-lantern) !important; }
.dw-pin-toggle {
  width:14px; height:11px; flex:none; cursor: var(--dw-cursor-point); opacity:0.3;
  background: var(--dw-fluke-mini) center / contain no-repeat;
}
.dw-pin-toggle:hover { opacity:0.7; }
.dw-pin-toggle.dw-pinned { opacity:1; filter: sepia(1) saturate(6) hue-rotate(-8deg) brightness(1.15); }

/* ---------- Equipment compare tooltip (PLAYTEST feedback #3) -----------------------------------
   Second small tooltip shown beside the hovered item's, positioned by tooltip.ts. */
.dw-tooltip-compare { border-color: var(--dw-lantern-deep); }

/* ---------- Buff bar — top-center glass beads (PLAYTEST feedback #4) --------------------------- */
.dw-buffbar { position:absolute; top: 62px; left:50%; transform:translateX(-50%); display:flex; gap:8px; pointer-events:auto; }
.dw-buffbead { position:relative; width:38px; height:38px; }
.dw-buffbead img {
  position:absolute; inset:3px; width:calc(100% - 6px); height:calc(100% - 6px); border-radius:50%;
  image-rendering:pixelated; background: radial-gradient(circle at 40% 30%, #2c4750, #0d181c);
  box-shadow: 0 0 0 1px rgba(0,0,0,.6);
}
.dw-buffbead-ring {
  position:absolute; inset:0; border-radius:50%; pointer-events:none;
  background: conic-gradient(var(--dw-tide) calc(var(--p, 100) * 1%), rgba(5,11,13,0.75) 0);
  -webkit-mask: radial-gradient(closest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
  mask: radial-gradient(closest-side, transparent calc(100% - 3px), #000 calc(100% - 2px));
}
.dw-buffbead-time {
  position:absolute; left:50%; bottom:-13px; transform:translateX(-50%); white-space:nowrap;
  font: 600 9.5px/1 var(--dw-font-pixel); color: var(--dw-bone); text-shadow:0 1px 0 #000;
}
.dw-buffbead-blink { animation: dw-buff-blink 0.6s ease-in-out infinite; }
.dw-buffbead-blink .dw-buffbead-ring { background: conic-gradient(var(--dw-coral) calc(var(--p, 100) * 1%), rgba(5,11,13,0.75) 0); }
@keyframes dw-buff-blink { 50% { opacity:0.45; } }
@media (prefers-reduced-motion: reduce) { .dw-buffbead-blink { animation:none; } }

/* ---------- Professions — level-gated crafting (PLAYTEST feedback #5) -------------------------- */
.dw-prof-locked { opacity:0.55; }
.dw-prof-unlock-hint { color: var(--dw-coral); font: 600 10.5px/1 var(--dw-font-label); letter-spacing:0.02em; margin-top:3px; }

/* ---------- Settings ---------- */
.dw-settings-row { display:flex; align-items:center; gap:10px; padding:7px 2px; }
.dw-settings-row label { width: 110px; font: 500 var(--dw-fs-sm) / 1 var(--dw-font-label); letter-spacing:0.02em; color: var(--dw-bone-dim); }
.dw-seg { display:flex; gap:2px; }
.dw-seg button { border-radius: var(--dw-radius-sm); }
.dw-seg button.dw-btn-primary { }
.dw-bind-row { display:flex; justify-content:space-between; align-items:center; padding: 5px 2px; }
.dw-bind-key {
  min-width:64px; text-align:center; padding:4px 8px; border-radius: var(--dw-radius-sm);
  background: rgba(5,11,13,0.5); border:1px solid var(--dw-bone-faint); cursor: var(--dw-cursor-point);
  font: 600 11.5px/1 var(--dw-font-pixel); color: var(--dw-bone);
}
.dw-bind-key.dw-listening { border-color: var(--dw-tide); color: var(--dw-tide); animation: dw-pulse 0.8s infinite; }
@keyframes dw-pulse { 50% { opacity:0.5; } }
@media (prefers-reduced-motion: reduce) { .dw-bind-key.dw-listening { animation:none; } }

/* ---------- Title screen ---------- */
.dw-title-screen {
  position:absolute; inset:0; pointer-events:auto; overflow:hidden; display:flex; align-items:center; justify-content:center;
  /* translucent vignette — NOT opaque: the Phaser Title scene's shader sky stays visible behind it */
  background: radial-gradient(120% 90% at 50% 30%, rgba(11,21,25,0.15), rgba(11,21,25,0.62) 65%, rgba(11,21,25,0.86) 100%);
}
.dw-title-screen > * { position: relative; z-index: 2; }
.dw-title-content { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; }

/* Logo lockup: fluke rises, wake draws itself via stroke-dashoffset */
.dw-logo-lockup { display:grid; justify-items:center; gap:8px; margin-bottom: 22px; }
.dw-logo-fluke {
  width: 72px; height: 48px; background: var(--dw-fluke) center / contain no-repeat;
  filter: drop-shadow(0 0 16px rgba(255,179,71,.5));
  animation: dw-fluke-rise 0.9s var(--dw-ease) both;
}
@keyframes dw-fluke-rise { from { opacity:0; transform: translateY(16px) scale(0.85); } to { opacity:1; transform:none; } }
.dw-logo-word {
  font: 400 76px/0.95 var(--dw-font-display); letter-spacing:0.05em; color: var(--dw-bone);
  text-shadow: 0 2px 0 #1b1208, 0 0 30px rgba(255,179,71,.3);
  animation: dw-fluke-rise 0.9s var(--dw-ease) 0.12s both;
}
.dw-logo-word .dw-logo-w { color: var(--dw-lantern); position: relative; }
.dw-logo-wake {
  width: 300px; height: 20px;
  animation: dw-wake-draw 1.1s var(--dw-ease) 0.35s both;
}
.dw-logo-wake svg path { stroke-dasharray: 140; stroke-dashoffset: 140; animation: dw-wake-line 1.1s var(--dw-ease) 0.35s forwards; }
@keyframes dw-wake-draw { from { opacity:0; } to { opacity: 0.85; } }
@keyframes dw-wake-line { to { stroke-dashoffset: 0; } }
.dw-logo-tag { font: 700 13px/1 var(--dw-font-label); letter-spacing:0.34em; color: var(--dw-bone-dim); text-transform:uppercase; animation: dw-fluke-rise 0.9s var(--dw-ease) 0.5s both; }
@media (prefers-reduced-motion: reduce) {
  .dw-logo-fluke, .dw-logo-word, .dw-logo-wake, .dw-logo-tag { animation: none; opacity:1; }
  .dw-logo-wake svg path { stroke-dashoffset: 0; }
}

.dw-title-menu { display:flex; flex-direction:column; gap:10px; width:260px; }
.dw-title-menu .dw-btn { padding:12px; font-size:14px; }
.dw-charselect { width:920px; max-width: 92vw; max-height: 88vh; display:flex; flex-direction:column; gap:14px; padding: 24px 28px; }
.dw-charlist { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }
/* character select cards — carved plates with a porthole preview */
.dw-charcard { width:158px; padding:14px 12px; text-align:center; border-radius: var(--dw-radius); border:1px solid var(--dw-bone-faint); background: linear-gradient(180deg, rgba(241,230,207,0.04), transparent); cursor: var(--dw-cursor-point); }
.dw-charcard:hover, .dw-charcard.dw-selected { border-color: var(--dw-lantern); box-shadow: var(--dw-glow-lantern); }
.dw-charcard .dw-cc-porthole {
  width: 88px; height: 88px; border-radius:50%; margin: 0 auto 8px; overflow:hidden; position:relative;
  background: radial-gradient(circle at 50% 35%, #2c4750, #0d181c);
  box-shadow: 0 0 0 3px #0b1417, 0 0 0 5px #b58a4a, 0 0 0 6px #5d4122, 0 0 0 7px rgba(241,230,207,.25);
}
.dw-charcard .dw-cc-porthole img { width:100%; height: 130%; object-fit: cover; object-position: top; image-rendering:pixelated; position:absolute; left:0; top:-6%; }
/* illustrated art style (gfx/rig): portraits/previews are smooth vector renders, not pixel art */
[data-art="illustrated"] .dw-doll-preview, [data-art="illustrated"] .dw-dlg-portrait, [data-art="illustrated"] .dw-charcard .dw-cc-porthole img { image-rendering: auto; }
.dw-charcard .dw-cc-name { font: 400 var(--dw-fs-md) / 1 var(--dw-font-display); color: var(--dw-bone); margin-top:2px; }
.dw-charcard .dw-cc-sub { font: 500 10.5px/1 var(--dw-font-label); letter-spacing:0.04em; text-transform:uppercase; color: var(--dw-bone-dim); margin-top:3px; }
/* Sized (with the trimmed markup in title.ts) to fit whole at 1280x720 with no scrollbar:
   heading ~30px + cards ~110px + appearance ~150px + name row ~40px + gaps/padding ~90px. */
.dw-create-flow { width: 940px; max-width:94vw; max-height:96vh; padding:16px 28px; display:flex; flex-direction:column; gap:10px; overflow:auto; }
.dw-create-heading { font: 400 var(--dw-fs-xl) / 1 var(--dw-font-display); color: var(--dw-bone); text-align:center; letter-spacing:0.02em; }
.dw-class-cards { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
/* class cards — engraved bone tablets with a class-color accent + scrimshaw sigil (full flavor
   text moved to a hover tooltip so the tablet itself stays compact — see title.ts classCard()) */
.dw-class-card {
  padding:10px; border-radius: var(--dw-radius); border:1px solid var(--dw-bone-faint); cursor: var(--dw-cursor-point);
  background: linear-gradient(180deg, rgba(241,230,207,0.04), transparent); position:relative; overflow:hidden;
}
.dw-class-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background: var(--dw-class-color, var(--dw-bone-faint)); }
.dw-class-card:hover { border-color: rgba(255,179,71,0.4); }
.dw-class-card.dw-selected { border-color: var(--dw-lantern); box-shadow: var(--dw-glow-lantern); background: rgba(255,179,71,0.06); }
.dw-class-card .dw-class-sigil { width:26px; height:26px; margin-bottom:4px; opacity:0.9; }
.dw-class-card h3 { margin:0 0 4px; font: 400 var(--dw-fs-md) / 1 var(--dw-font-display); color: var(--dw-bone); }
.dw-class-card p { margin:2px 0; font-size:10.5px; line-height:1.35; color: var(--dw-bone-dim); }
.dw-class-card p b { color: var(--dw-bone); font-family: var(--dw-font-label); font-weight:700; }
.dw-appearance-row { display:flex; gap:22px; flex-wrap:wrap; align-items:flex-start; }
/* appearance swatches — round glass beads */
.dw-swatches { display:flex; gap:5px; flex-wrap:wrap; max-width:170px; }
.dw-swatch {
  width:24px; height:24px; border-radius:50%; cursor: var(--dw-cursor-point); border:2px solid rgba(241,230,207,0.2);
  box-shadow: inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,.5);
}
.dw-swatch.dw-selected { border-color: var(--dw-lantern); box-shadow: inset 0 2px 3px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.4), var(--dw-glow-lantern); }
.dw-error-text { color: var(--dw-coral); font-size:12.5px; min-height:16px; }
.dw-field-label { font: 500 var(--dw-fs-xs) / 1 var(--dw-font-label); color: var(--dw-bone-dim); margin-bottom:5px; text-transform:uppercase; letter-spacing: var(--dw-track-label); }
/* name field — an inscribed plate */
.dw-name-plate { position:relative; }
.dw-name-plate input.dw-input { background: linear-gradient(180deg, #0e1a1f, #0a1418); border-color: var(--dw-bone-faint); font-family: var(--dw-font-display); font-size: var(--dw-fs-lg); letter-spacing:0.03em; padding: 8px 12px; }

.dw-menu-window { width: 250px; }
.dw-menu-list { display:flex; flex-direction:column; gap:8px; }

.dw-help-section { margin-bottom:14px; }
.dw-help-section h4 { font: 400 var(--dw-fs-lg) / 1 var(--dw-font-display); color: var(--dw-bone); margin: 0 0 6px; }
.dw-help-section div { font-size: var(--dw-fs-sm); line-height:1.5; }
`;
