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
:root{
  --dw-navy-0: #0a0e18;
  --dw-navy-1: #0f1626;
  --dw-navy-2: #141d33;
  --dw-navy-3: #1b2740;
  --dw-gold: #e8c477;
  --dw-gold-bright: #ffe6a8;
  --dw-gold-dim: #8a713f;
  --dw-teal: #4fd8c4;
  --dw-orange: #ff9a52;
  --dw-text: #eef1f7;
  --dw-text-dim: #a7b0c4;
  --dw-red: #ff6b6b;
  --dw-green: #6fdc6f;
  --dw-shadow: 0 10px 30px rgba(0,0,0,0.55);
}

#ui, #ui * { box-sizing: border-box; }
#ui { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }

.dw-caps { text-transform: uppercase; letter-spacing: 0.09em; }

/* ---------- Panel chrome ---------- */
.dw-panel {
  background: linear-gradient(180deg, rgba(15,22,38,0.94), rgba(10,14,24,0.96));
  border: 1px solid var(--dw-gold-dim);
  border-radius: 10px;
  box-shadow: var(--dw-shadow), inset 0 0 24px rgba(232,196,119,0.05), inset 0 1px 0 rgba(255,255,255,0.04);
  color: var(--dw-text);
  font-size: 13px;
}
.dw-window {
  position: absolute;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  min-width: 240px;
  transform-origin: top left;
  animation: dw-window-in 0.16s cubic-bezier(.2,1.4,.4,1) both;
}
@keyframes dw-window-in { from { opacity:0; transform: scale(0.92); } to { opacity:1; transform: scale(1); } }
.dw-window.dw-closing { animation: dw-window-out 0.12s ease-in both; }
@keyframes dw-window-out { to { opacity:0; transform: scale(0.94); } }

.dw-titlebar {
  display:flex; align-items:center; gap:8px;
  padding: 7px 10px;
  cursor: grab;
  border-bottom: 1px solid rgba(232,196,119,0.25);
  background: linear-gradient(180deg, rgba(232,196,119,0.14), rgba(232,196,119,0.02));
  border-radius: 10px 10px 0 0;
  user-select:none;
}
.dw-titlebar:active { cursor: grabbing; }
.dw-titlebar .dw-title {
  flex: 1;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--dw-gold-bright);
  text-shadow: 0 1px 2px rgba(0,0,0,0.6);
}
.dw-titlebar .dw-icon { width:18px; height:18px; image-rendering: pixelated; }
.dw-close {
  width: 20px; height: 20px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05); color: var(--dw-text-dim); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size: 13px; line-height:1;
}
.dw-close:hover { background: var(--dw-red); color:#fff; border-color: var(--dw-red); }

.dw-body { padding: 10px; overflow: auto; }

/* ---------- Buttons / inputs ---------- */
.dw-btn {
  background: linear-gradient(180deg, rgba(232,196,119,0.22), rgba(232,196,119,0.08));
  border: 1px solid var(--dw-gold-dim); color: var(--dw-gold-bright);
  border-radius: 6px; padding: 6px 12px; font-size: 12.5px; cursor: pointer; font-weight:600;
  transition: background .12s, transform .06s;
}
.dw-btn:hover { background: linear-gradient(180deg, rgba(232,196,119,0.34), rgba(232,196,119,0.14)); }
.dw-btn:active { transform: scale(0.96); }
.dw-btn:disabled { opacity:0.4; cursor:not-allowed; }
.dw-btn.dw-btn-primary { background: linear-gradient(180deg, #ffdb8f, #caa254); color:#241a05; border-color:#caa254; }
.dw-btn.dw-btn-primary:hover { background: linear-gradient(180deg, #ffe6ab, #d8ae5f); }
.dw-btn.dw-btn-danger { background: linear-gradient(180deg, rgba(255,107,107,0.3), rgba(255,107,107,0.1)); border-color:#a34; color:#ffb8b8; }
.dw-btn.dw-btn-ghost { background: transparent; border-color: rgba(255,255,255,0.14); color: var(--dw-text-dim); }
.dw-btn-sm { padding: 3px 8px; font-size: 11px; }

input.dw-input, select.dw-select {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(232,196,119,0.35); color: var(--dw-text);
  border-radius: 5px; padding: 6px 8px; font-size: 13px; outline: none;
}
input.dw-input:focus, select.dw-select:focus { border-color: var(--dw-gold); box-shadow: 0 0 0 2px rgba(232,196,119,0.2); }

/* ---------- Tabs ---------- */
.dw-tabs { display:flex; gap:4px; border-bottom: 1px solid rgba(232,196,119,0.18); padding: 0 6px; }
.dw-tab {
  padding: 6px 11px; font-size: 11.5px; cursor:pointer; color: var(--dw-text-dim); border-radius: 6px 6px 0 0;
  border: 1px solid transparent; border-bottom: none; font-weight:600;
}
.dw-tab:hover { color: var(--dw-text); }
.dw-tab.dw-active { color: var(--dw-gold-bright); background: rgba(232,196,119,0.1); border-color: rgba(232,196,119,0.3); }

/* ---------- Slot grid (inventory / hotbar / skills) ---------- */
.dw-slot {
  width: 42px; height: 42px; border-radius: 6px; position: relative;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12);
  display:flex; align-items:center; justify-content:center; cursor:pointer;
}
.dw-slot:hover { border-color: var(--dw-gold); background: rgba(232,196,119,0.08); }
.dw-slot img { width: 30px; height: 30px; image-rendering: pixelated; pointer-events:none; }
.dw-slot .dw-count {
  position:absolute; right:2px; bottom:1px; font-size:10px; font-weight:700; color:#fff;
  text-shadow: 0 1px 2px #000, 0 0 3px #000;
}
.dw-slot .dw-keycap {
  position:absolute; left:2px; top:1px; font-size:9px; color: var(--dw-gold); background:rgba(0,0,0,0.5);
  border-radius:3px; padding:0 3px; font-weight:700;
}
.dw-slot.dw-empty { border-style: dashed; }
.dw-slot.dw-dragover { border-color: var(--dw-teal); box-shadow: 0 0 0 2px rgba(79,216,196,0.4); }
.dw-slot .dw-cd-sweep {
  position:absolute; inset:0; border-radius:6px; background: conic-gradient(rgba(0,0,0,0.72) calc(var(--p) * 1%), transparent 0);
  pointer-events:none;
}
.dw-slot .dw-cd-text { position:absolute; font-size:11px; font-weight:800; color:#fff; text-shadow:0 1px 2px #000; }
.dw-grid { display:grid; grid-template-columns: repeat(auto-fill, 42px); gap: 5px; }

.dw-rarity-common { color: #e8e8e8; }
.dw-rarity-uncommon { color: #6fdc6f; }
.dw-rarity-rare { color: #5aa9ff; }
.dw-rarity-epic { color: #c77dff; }
.dw-rarity-legendary { color: #ffb238; }

/* ---------- Tooltip ---------- */
.dw-tooltip {
  position: fixed; z-index: 9999; pointer-events:none; max-width: 280px;
  padding: 9px 11px; font-size: 12.5px; line-height:1.45;
}
.dw-tooltip .dw-tt-name { font-weight: 800; font-size: 13.5px; margin-bottom:2px; }
.dw-tooltip .dw-tt-sub { color: var(--dw-text-dim); font-size: 11px; margin-bottom:4px; }
.dw-tooltip hr { border: none; border-top: 1px solid rgba(255,255,255,0.14); margin: 5px 0; }
.dw-tooltip .dw-stat-row { display:flex; justify-content:space-between; gap: 10px; }
.dw-tt-delta-pos { color: var(--dw-green); }
.dw-tt-delta-neg { color: var(--dw-red); }
.dw-tt-unmet { color: var(--dw-red); }
.dw-tt-desc { color: var(--dw-text-dim); font-style: italic; margin-top: 4px; }

/* ---------- HUD ---------- */
#dw-hud { position:absolute; inset:0; pointer-events:none; }
.dw-hud-bottom {
  position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column; align-items:center;
  padding: 8px 12px 10px; gap:6px; pointer-events:none;
}
.dw-bars { display:flex; flex-direction:column; gap:3px; width: 360px; pointer-events:auto; }
.dw-bar-row { display:flex; align-items:center; gap:6px; }
.dw-bar-label { width: 26px; font-size: 10.5px; font-weight:800; color: var(--dw-gold); text-align:right; }
.dw-bar-track {
  flex:1; height: 14px; border-radius: 7px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.14);
  position: relative; overflow:hidden;
}
.dw-bar-fill { height:100%; border-radius: 7px; transition: width .25s ease; }
.dw-bar-fill.dw-hp { background: linear-gradient(180deg, #ff8a8a, #c73f3f); }
.dw-bar-fill.dw-mp { background: linear-gradient(180deg, #7fb8ff, #3564c7); }
.dw-bar-fill.dw-xp { background: linear-gradient(180deg, var(--dw-teal), #1f8f7d); }
.dw-bar-text {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-size: 10px; font-weight:700; text-shadow: 0 1px 2px #000;
}
.dw-xp-row .dw-bar-track { height: 8px; }
.dw-id-row { display:flex; justify-content:space-between; font-size: 11px; color: var(--dw-text-dim); padding: 0 2px; }
.dw-id-row b { color: var(--dw-gold-bright); }

.dw-hotbar { display:flex; gap:5px; pointer-events:auto; background: rgba(10,14,24,0.55); padding:6px; border-radius:10px; border:1px solid rgba(232,196,119,0.25); }

.dw-buffs { position:absolute; left: 14px; bottom: 150px; display:flex; flex-direction:column; gap:4px; pointer-events:auto; }
.dw-buff { display:flex; align-items:center; gap:6px; background: rgba(10,14,24,0.7); border:1px solid rgba(232,196,119,0.3); border-radius:6px; padding:3px 6px; }
.dw-buff img { width:20px; height:20px; image-rendering:pixelated; }
.dw-buff .dw-buff-time { font-size:10px; color: var(--dw-text-dim); min-width: 30px; }

/* ---------- Minimap ---------- */
.dw-minimap {
  position:absolute; top: 14px; right: 14px; pointer-events:auto;
  padding: 5px; display:flex; flex-direction:column; gap:3px; align-items:center;
}
.dw-minimap .dw-minimap-name { font-size: 10.5px; color: var(--dw-gold-bright); font-weight:700; max-width:190px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dw-minimap canvas { border-radius: 6px; background: rgba(0,0,0,0.4); }

/* ---------- Quest tracker ---------- */
.dw-tracker { position:absolute; top: 96px; right: 14px; width: 210px; display:flex; flex-direction:column; gap:6px; pointer-events:auto; }
.dw-tracker-quest { padding: 7px 9px; cursor:pointer; }
.dw-tracker-quest .dw-tq-name { font-weight:700; font-size: 11.5px; color: var(--dw-gold-bright); }
.dw-tracker-quest.dw-ready .dw-tq-name { color: var(--dw-teal); }
.dw-tracker-quest .dw-tq-obj { font-size: 11px; color: var(--dw-text-dim); margin-top:2px; }
.dw-tracker-quest .dw-tq-obj.dw-done { color: var(--dw-green); }

/* ---------- Notifications / toasts / banner / boss bar / hint ---------- */
.dw-feed { position:absolute; left: 14px; bottom: 200px; width: 260px; display:flex; flex-direction:column-reverse; gap:4px; pointer-events:none; }
.dw-feed-item {
  font-size: 12px; padding: 4px 8px; border-radius: 5px; background: rgba(10,14,24,0.6);
  animation: dw-feed-in .18s ease both; border-left: 3px solid var(--dw-gold-dim);
}
@keyframes dw-feed-in { from { opacity:0; transform: translateX(-8px);} to {opacity:1; transform:none;} }
.dw-feed-item.dw-good { border-left-color: var(--dw-green); }
.dw-feed-item.dw-warn { border-left-color: var(--dw-orange); }
.dw-feed-item.dw-error { border-left-color: var(--dw-red); }
.dw-feed-item.dw-loot { border-left-color: var(--dw-teal); }
.dw-feed-item.dw-quest { border-left-color: #c77dff; }

.dw-toasts { position:absolute; top: 14px; left:50%; transform:translateX(-50%); display:flex; flex-direction:column; gap:6px; align-items:center; pointer-events:none; }
.dw-toast {
  padding: 7px 16px; border-radius: 8px; font-size: 12.5px; font-weight:600;
  animation: dw-toast-in .22s cubic-bezier(.2,1.4,.4,1) both;
}
@keyframes dw-toast-in { from {opacity:0; transform: translateY(-10px);} to {opacity:1; transform:none;} }
.dw-toast.dw-fade-out { animation: dw-toast-out .25s ease-in both; }
@keyframes dw-toast-out { to { opacity:0; transform: translateY(-6px); } }

.dw-banner {
  position:absolute; top: 22%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none;
  animation: dw-banner-in .35s cubic-bezier(.15,1.5,.4,1) both;
}
@keyframes dw-banner-in { from {opacity:0; transform:translate(-50%,-60%) scale(0.85);} to {opacity:1; transform:translate(-50%,-50%) scale(1);} }
.dw-banner.dw-fade-out { animation: dw-banner-out .4s ease-in both; }
@keyframes dw-banner-out { to { opacity:0; } }
.dw-banner .dw-banner-title {
  font-size: 34px; font-weight:900; letter-spacing:0.08em; color: var(--dw-gold-bright);
  text-shadow: 0 3px 10px rgba(0,0,0,0.8), 0 0 24px rgba(232,196,119,0.5);
}
.dw-banner.dw-level .dw-banner-title { color: var(--dw-teal); text-shadow: 0 3px 10px rgba(0,0,0,0.8), 0 0 30px rgba(79,216,196,0.6); }
.dw-banner.dw-job .dw-banner-title { color: var(--dw-orange); text-shadow: 0 3px 10px rgba(0,0,0,0.8), 0 0 30px rgba(255,154,82,0.6); }
.dw-banner .dw-banner-sub { font-size: 15px; color: var(--dw-text); margin-top:4px; text-shadow: 0 2px 6px rgba(0,0,0,0.8); }

.dw-bossbar { position:absolute; top: 14px; left:50%; transform:translateX(-50%); width: 420px; pointer-events:none; padding: 6px 12px; text-align:center; }
.dw-bossbar .dw-boss-name { font-size:13px; font-weight:800; color: var(--dw-red); }
.dw-bossbar .dw-boss-title { font-size:10.5px; color: var(--dw-text-dim); margin-bottom:3px; }
.dw-bossbar .dw-bar-track { height:12px; }
.dw-bossbar .dw-bar-fill { background: linear-gradient(180deg, #ff8a8a, #8a1414); }

.dw-hint {
  position:absolute; bottom: 158px; left:50%; transform:translateX(-50%); padding: 5px 12px;
  font-size: 12.5px; color: var(--dw-gold-bright); pointer-events:none; white-space:nowrap;
}

.dw-tip {
  display:flex; align-items:center; gap:6px; max-width: 340px; padding: 9px 12px;
  pointer-events:auto; animation: dw-toast-in .22s cubic-bezier(.2,1.4,.4,1) both;
}

/* ---------- Death dialog ---------- */
.dw-death-overlay { position:absolute; inset:0; background: rgba(30,0,5,0.55); pointer-events:auto; display:flex; align-items:center; justify-content:center; animation: dw-fade-in .3s ease both; }
@keyframes dw-fade-in { from{opacity:0;} to {opacity:1;} }
.dw-death-box { text-align:center; padding: 26px 34px; }
.dw-death-box h2 { margin:0 0 8px; color: var(--dw-red); font-size: 26px; letter-spacing:0.1em; }

/* ---------- Chat ---------- */
.dw-chat { position:absolute; left: 14px; bottom: 14px; width: 260px; display:flex; flex-direction:column; pointer-events:auto; }
.dw-chat-log { max-height: 120px; overflow-y:auto; display:flex; flex-direction:column; gap:2px; padding: 6px 8px; font-size:12px; }
.dw-chat-log div { line-height:1.4; }
.dw-chat-log .dw-chat-system { color: var(--dw-text-dim); font-style:italic; }
.dw-chat-log .dw-chat-name { color: var(--dw-teal); font-weight:700; margin-right:4px; }
.dw-chat-input-row { border-top: 1px solid rgba(232,196,119,0.2); display:none; }
.dw-chat-input-row.dw-active { display:flex; }
.dw-chat-input-row input { flex:1; background:transparent; border:none; color:#fff; padding: 6px 8px; font-size:12.5px; outline:none; }

/* ---------- Dialogue ---------- */
.dw-dialogue-window { width: 560px; }
.dw-dlg-top { display:flex; gap:12px; padding: 12px; }
.dw-dlg-portrait { width:72px; height:72px; border-radius:8px; border:1px solid var(--dw-gold-dim); image-rendering:pixelated; background:#111; flex-shrink:0; }
.dw-dlg-name { font-weight:800; color: var(--dw-gold-bright); font-size:14px; }
.dw-dlg-title { font-size:11px; color: var(--dw-text-dim); margin-bottom:4px; }
.dw-dlg-text { font-size: 13px; line-height:1.55; min-height: 54px; cursor:pointer; }
.dw-dlg-text .dw-caret { opacity:0.6; }
.dw-dlg-options { display:flex; flex-direction:column; gap:5px; padding: 0 12px 12px; }
.dw-dlg-opt {
  text-align:left; padding: 8px 10px; border-radius:6px; background: rgba(255,255,255,0.04);
  border:1px solid rgba(255,255,255,0.1); cursor:pointer; font-size:12.5px; display:flex; gap:8px; align-items:center;
}
.dw-dlg-opt:hover { border-color: var(--dw-gold); background: rgba(232,196,119,0.1); }
.dw-dlg-opt .dw-dlg-marker { font-weight:800; width:14px; text-align:center; }
.dw-dlg-opt.dw-marker-ready .dw-dlg-marker { color: var(--dw-teal); }
.dw-dlg-opt.dw-marker-offer .dw-dlg-marker { color: var(--dw-gold-bright); }
.dw-dlg-opt.dw-marker-progress .dw-dlg-marker { color: var(--dw-text-dim); }
.dw-dlg-opt.dw-goodbye { color: var(--dw-text-dim); }
.dw-dlg-reward-row { display:flex; gap:6px; flex-wrap:wrap; padding: 6px 0; }
.dw-dlg-reward { display:flex; align-items:center; gap:4px; background: rgba(255,255,255,0.05); border-radius:5px; padding:3px 6px; font-size:11.5px; }
.dw-dlg-reward img { width:18px; height:18px; image-rendering:pixelated; }
.dw-dlg-obj { font-size: 12px; color: var(--dw-text-dim); padding: 2px 0; }
.dw-dlg-obj.dw-done { color: var(--dw-green); }
.dw-choice-card {
  padding: 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03);
  cursor:pointer; margin-bottom:6px;
}
.dw-choice-card:hover { border-color: var(--dw-gold); }
.dw-choice-card.dw-selected { border-color: var(--dw-teal); background: rgba(79,216,196,0.12); box-shadow: 0 0 0 1px var(--dw-teal); }
.dw-choice-card .dw-choice-label { font-weight:800; color: var(--dw-gold-bright); margin-bottom:3px; }
.dw-choice-card .dw-choice-desc { font-size:11.5px; color: var(--dw-text-dim); }
.dw-choice-card.dw-locked {
  cursor: default; background: linear-gradient(160deg, rgba(199,125,255,0.10), rgba(255,255,255,0.02));
  border-style: dashed; border-color: rgba(199,125,255,0.4);
}
.dw-choice-card.dw-locked:hover { border-color: rgba(199,125,255,0.6); }
.dw-choice-card.dw-locked .dw-choice-label { color: #d8b8ff; display:flex; align-items:center; gap:6px; }
.dw-choice-card.dw-locked .dw-choice-label::before { content: '\\1F512'; font-size:11px; }
.dw-choice-card.dw-locked .dw-choice-hint { font-size:11px; color:#b79ee0; font-style:italic; margin-top:3px; }
.dw-dlg-actions { display:flex; gap:8px; justify-content:flex-end; padding: 0 12px 12px; }

/* ---------- Character paperdoll ---------- */
.dw-paperdoll { position:relative; width: 180px; height: 220px; margin: 0 auto; background: radial-gradient(ellipse at center, rgba(232,196,119,0.08), transparent 70%); border-radius:10px; }
.dw-paperdoll img.dw-doll-preview { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); width:96px; height:120px; image-rendering:pixelated; }
.dw-eq-slot { position:absolute; }
.dw-stat-row2 { display:flex; justify-content:space-between; padding: 3px 2px; font-size:12.5px; align-items:center; }
.dw-stat-plus { width:18px; height:18px; border-radius:4px; }

/* ---------- Progress bars (professions, gathering) ---------- */
.dw-prof-bar { height: 10px; border-radius:5px; background: rgba(0,0,0,0.5); overflow:hidden; border:1px solid rgba(255,255,255,0.1); }
.dw-prof-bar > div { height:100%; background: linear-gradient(180deg, var(--dw-teal), #1f8f7d); }

/* ---------- World map ---------- */
.dw-worldmap-region { margin-bottom: 14px; }
.dw-worldmap-region h4 { margin: 0 0 6px; color: var(--dw-gold-bright); font-size:12px; }
.dw-worldmap-nodes { display:flex; flex-wrap:wrap; gap:8px; }
.dw-map-node { width: 110px; padding:7px; border-radius:7px; border:1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.03); }
.dw-map-node.dw-current { border-color: var(--dw-teal); box-shadow:0 0 0 1px var(--dw-teal); }
.dw-map-node.dw-unknown { opacity:0.45; filter: grayscale(1); }
.dw-map-node .dw-mn-name { font-weight:700; font-size:11px; }
.dw-map-node .dw-mn-level { font-size:10px; color: var(--dw-text-dim); }

/* ---------- Bestiary ---------- */
.dw-bestiary-grid { display:grid; grid-template-columns: repeat(auto-fill, 96px); gap:8px; }
.dw-mon-card { padding:6px; text-align:center; border-radius:7px; border:1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); cursor:pointer; }
.dw-mon-card.dw-unseen { opacity:0.35; }
.dw-mon-card img { width:40px; height:40px; image-rendering:pixelated; }
.dw-mon-card .dw-mon-name { font-size:10.5px; margin-top:2px; }
.dw-mon-card .dw-mon-kills { font-size:9.5px; color: var(--dw-text-dim); }

.dw-ach-list { display:flex; flex-direction:column; gap:6px; max-height: 420px; overflow-y:auto; }
.dw-ach-row { display:flex; gap:10px; align-items:flex-start; padding:7px 9px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
.dw-ach-row.dw-ach-locked { opacity:0.55; }
.dw-ach-row.dw-ach-unlocked { border-color: rgba(232,196,119,0.4); background: rgba(232,196,119,0.06); opacity:1; }
.dw-ach-icon { width:28px; height:28px; image-rendering:pixelated; flex-shrink:0; margin-top:1px; }
.dw-ach-info { flex:1; min-width:0; }
.dw-ach-name { font-weight:700; font-size:12.5px; color: var(--dw-gold-bright); }
.dw-ach-desc { font-size:11px; color: var(--dw-text-dim); margin-top:1px; }
.dw-ach-date { font-size:10px; color: var(--dw-teal); margin-top:3px; }
.dw-ach-progress { flex:1; }

/* ---------- Settings ---------- */
.dw-settings-row { display:flex; align-items:center; gap:10px; padding:7px 2px; }
.dw-settings-row label { width: 100px; font-size:12.5px; color: var(--dw-text-dim); }
.dw-bind-row { display:flex; justify-content:space-between; align-items:center; padding: 5px 2px; }
.dw-bind-key { min-width:64px; text-align:center; padding:4px 8px; border-radius:5px; background: rgba(255,255,255,0.06); border:1px solid rgba(232,196,119,0.3); cursor:pointer; font-size:11.5px; }
.dw-bind-key.dw-listening { border-color: var(--dw-teal); color: var(--dw-teal); animation: dw-pulse 0.8s infinite; }
@keyframes dw-pulse { 50% { opacity:0.5; } }

/* ---------- Title screen ---------- */
.dw-title-screen { position:absolute; inset:0; pointer-events:auto; overflow:hidden; background: linear-gradient(180deg, #ffb787 0%, #ff8f6b 18%, #e26a86 38%, #6a4d8f 62%, #2a2350 85%, #100c22 100%); display:flex; align-items:center; justify-content:center; }
.dw-title-sky-layer { position:absolute; inset:0; }
.dw-cloud { position:absolute; background: rgba(255,255,255,0.5); border-radius: 50px; filter: blur(1px); animation: dw-drift linear infinite; }
@keyframes dw-drift { from { transform: translateX(0); } to { transform: translateX(-140vw); } }
.dw-whale { position:absolute; opacity:0.5; animation: dw-drift-whale 90s linear infinite; }
@keyframes dw-drift-whale { from { transform: translateX(120vw) translateY(0); } to { transform: translateX(-160vw) translateY(-20px); } }
.dw-title-screen > .dw-panel { position:relative; z-index:2; }
.dw-title-content { position:relative; z-index:2; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; }
.dw-logo { font-size: 68px; font-weight:900; letter-spacing:0.12em; color: #fff8e7; text-shadow: 0 4px 0 #a06a2c, 0 8px 24px rgba(0,0,0,0.5), 0 0 40px rgba(255,220,150,0.5); animation: dw-logo-in .8s cubic-bezier(.2,1.5,.3,1) both; }
@keyframes dw-logo-in { from { opacity:0; transform: translateY(-30px) scale(0.9);} to {opacity:1; transform:none;} }
.dw-subtitle { font-size:16px; letter-spacing:0.3em; color: #ffe9c7; text-transform:uppercase; text-shadow:0 2px 8px rgba(0,0,0,0.5); margin-bottom: 24px; }
.dw-title-menu { display:flex; flex-direction:column; gap:10px; width:260px; }
.dw-title-menu .dw-btn { padding:12px; font-size:14px; }
.dw-charselect { width:900px; max-width: 92vw; max-height: 88vh; display:flex; flex-direction:column; gap:14px; padding: 22px 26px; }
.dw-charlist { display:flex; gap:14px; flex-wrap:wrap; justify-content:center; }
.dw-charcard { width:150px; padding:12px; text-align:center; border-radius:10px; border:1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.03); cursor:pointer; }
.dw-charcard:hover, .dw-charcard.dw-selected { border-color: var(--dw-gold); box-shadow:0 0 0 1px var(--dw-gold); }
.dw-charcard img { width:80px; height:100px; image-rendering:pixelated; }
.dw-charcard .dw-cc-name { font-weight:800; margin-top:4px; }
.dw-charcard .dw-cc-sub { font-size:11px; color: var(--dw-text-dim); }
.dw-create-flow { width: 920px; max-width:94vw; max-height:90vh; padding:22px 26px; display:flex; flex-direction:column; gap:14px; overflow:auto; }
.dw-class-cards { display:grid; grid-template-columns: repeat(4, 1fr); gap:12px; }
.dw-class-card { padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.14); cursor:pointer; background: rgba(255,255,255,0.03); }
.dw-class-card:hover { border-color: rgba(232,196,119,0.5); }
.dw-class-card.dw-selected { border-color: var(--dw-gold); box-shadow: 0 0 0 1px var(--dw-gold); background: rgba(232,196,119,0.08); }
.dw-class-card h3 { margin:0 0 4px; font-size:14px; color: var(--dw-gold-bright); }
.dw-class-card p { margin:2px 0; font-size:11px; color: var(--dw-text-dim); }
.dw-appearance-row { display:flex; gap:22px; flex-wrap:wrap; align-items:flex-start; }
.dw-swatches { display:flex; gap:5px; flex-wrap:wrap; max-width:160px; }
.dw-swatch { width:22px; height:22px; border-radius:50%; cursor:pointer; border:2px solid rgba(255,255,255,0.2); }
.dw-swatch.dw-selected { border-color: #fff; box-shadow:0 0 0 2px var(--dw-gold); }
.dw-error-text { color: var(--dw-red); font-size:12.5px; min-height:16px; }
.dw-field-label { font-size:11px; color: var(--dw-text-dim); margin-bottom:4px; text-transform:uppercase; letter-spacing:0.06em; }

.dw-menu-window { width: 240px; }
.dw-menu-list { display:flex; flex-direction:column; gap:8px; }

.dw-help-section { margin-bottom:12px; }
.dw-help-section h4 { color: var(--dw-gold-bright); margin: 0 0 5px; font-size:12.5px; }
`;
