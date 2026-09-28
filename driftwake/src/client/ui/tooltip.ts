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
}

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
}

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
