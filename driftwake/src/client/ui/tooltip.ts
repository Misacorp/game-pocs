/**
 * Singleton floating tooltip. Call `showTooltip(target, buildContent)` on mouseenter and
 * `hideTooltip()` on mouseleave. Content builder returns child nodes for a `.dw-panel.dw-tooltip` div.
 */
import { el } from './dom';

let tipEl: HTMLDivElement | null = null;

function ensure(): HTMLDivElement {
  if (!tipEl) {
    tipEl = el('div', { class: 'dw-panel dw-tooltip', style: { display: 'none' } });
    document.body.appendChild(tipEl);
  }
  return tipEl;
}

export function hideTooltip(): void {
  if (tipEl) tipEl.style.display = 'none';
  hideCompareTooltip();
}

// ---- Equipment comparison side-panel ("EQUIPPED") --------------------------------------------
// A second small tooltip shown beside the main one (Maplestory/Diablo style) when hovering
// equipment, holding the currently-equipped item in that slot. Lives here (not itemTooltip.ts)
// since it's purely positioning/plumbing shared with the main tooltip singleton above;
// itemTooltip.ts builds the actual content nodes.

let compareTipEl: HTMLDivElement | null = null;
function ensureCompare(): HTMLDivElement {
  if (!compareTipEl) {
    compareTipEl = el('div', { class: 'dw-panel dw-tooltip dw-tooltip-compare', style: { display: 'none' } });
    document.body.appendChild(compareTipEl);
  }
  return compareTipEl;
}

export function hideCompareTooltip(): void {
  if (compareTipEl) compareTipEl.style.display = 'none';
}

/** Re-lays out the (already-visible) compare panel against the main tooltip's current position —
 *  called both right after filling it with content and whenever the main tooltip moves. */
function repositionCompare(): void {
  if (!compareTipEl || compareTipEl.style.display === 'none') return;
  const main = ensure();
  const cmp = compareTipEl;
  const gap = 8;
  const mainRect = main.getBoundingClientRect();
  const cmpRect = cmp.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  let left = mainRect.right + gap;
  if (left + cmpRect.width > vw - 4) left = mainRect.left - cmpRect.width - gap;
  if (left < 4) left = Math.min(mainRect.left, Math.max(4, vw - cmpRect.width - 4));
  let top = mainRect.top;
  if (top + cmpRect.height > vh - 4) top = vh - cmpRect.height - 4;
  if (top < 4) top = 4;
  cmp.style.left = `${left}px`;
  cmp.style.top = `${top}px`;
}

/** Shows the compare panel flush beside the main tooltip (right by default), flipping to
 *  whichever side keeps both panels on-screen. Call only while the main tooltip is visible. */
export function showCompareTooltip(children: (Node | string)[]): void {
  const main = ensure();
  if (main.style.display === 'none') return;
  const cmp = ensureCompare();
  cmp.innerHTML = '';
  for (const c of children) cmp.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  cmp.style.display = 'block';
  repositionCompare();
}

// ---- Shift toggles the equipment-compare panel (default: comparison ON) -----------------------
let shiftHeld = false;
let onShiftChange: (() => void) | null = null;
window.addEventListener('keydown', (e) => { if (e.key === 'Shift' && !shiftHeld) { shiftHeld = true; onShiftChange?.(); } });
window.addEventListener('keyup', (e) => { if (e.key === 'Shift') { shiftHeld = false; onShiftChange?.(); } });
window.addEventListener('blur', () => { if (shiftHeld) { shiftHeld = false; onShiftChange?.(); } });

/** Default true; holding Shift toggles it off so the player can see the hovered item alone. */
export function isCompareEnabled(): boolean { return !shiftHeld; }
/** Registers the "currently hovering something comparable" refresh callback, so the compare panel
 *  can appear/disappear immediately when Shift is pressed/released mid-hover, not just on the
 *  next mousemove. Only one hover is ever active at a time. */
export function setCompareRefreshHook(fn: (() => void) | null): void { onShiftChange = fn; }

function position(x: number, y: number) {
  const t = ensure();
  const pad = 16;
  const vw = window.innerWidth, vh = window.innerHeight;
  const rect = t.getBoundingClientRect();
  let left = x + pad;
  let top = y + pad;
  if (left + rect.width > vw - 8) left = x - rect.width - pad;
  if (top + rect.height > vh - 8) top = vh - rect.height - 8;
  if (left < 4) left = 4;
  if (top < 4) top = 4;
  t.style.left = `${left}px`;
  t.style.top = `${top}px`;
  repositionCompare();
}

/** Repositions the main tooltip (and the compare panel beside it, if visible) without rebuilding
 *  either's content — used on mousemove so a rebuild isn't paid on every pixel of movement. */
export function repositionTooltips(x: number, y: number): void { position(x, y); }

export function showTooltipAt(x: number, y: number, children: (Node | string)[]): void {
  const t = ensure();
  t.innerHTML = '';
  for (const c of children) t.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  // Rarity-colored border: item tooltips (buildItemTooltip) color their name span inline —
  // reuse that color for the whole tooltip's frame/glow (BRAND.md tooltip spec) without every
  // caller having to thread a rarity color through separately.
  const nameEl = t.querySelector<HTMLElement>('.dw-tt-name');
  const rarColor = nameEl?.style.color || '';
  if (rarColor) t.style.setProperty('--rar', rarColor); else t.style.removeProperty('--rar');
  t.style.display = 'block';
  position(x, y);
}

/** Attach hover tooltip behavior to an element. `build` is called fresh on each mouseenter. */
export function attachTooltip(node: HTMLElement, build: () => (Node | string)[] | null): void {
  let active = false;
  node.addEventListener('mouseenter', (e) => {
    const content = build();
    if (!content) return;
    active = true;
    showTooltipAt((e as MouseEvent).clientX, (e as MouseEvent).clientY, content);
  });
  node.addEventListener('mousemove', (e) => {
    if (!active) return;
    position((e as MouseEvent).clientX, (e as MouseEvent).clientY);
  });
  node.addEventListener('mouseleave', () => { active = false; hideTooltip(); });
}

export function statRow(label: string, value: string, deltaClass?: string): HTMLElement {
  return el('div', { class: 'dw-stat-row' }, el('span', null, label), el('span', { class: deltaClass }, value));
}
