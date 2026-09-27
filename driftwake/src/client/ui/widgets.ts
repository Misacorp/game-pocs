import { el } from './dom';
import { audio } from '../audio';

/** Simple tab strip. onSelect fires with the tab id; returns {root, select}. */
export function makeTabs(tabs: { id: string; label: string }[], onSelect: (id: string) => void, initial?: string) {
  let active = initial ?? tabs[0]?.id;
  const btns = new Map<string, HTMLElement>();
  const root = el('div', { class: 'dw-tabs' });
  for (const t of tabs) {
    const b = el('div', { class: 'dw-tab', onclick: () => { select(t.id); onSelect(t.id); audio.playSfx('uiClick'); } }, t.label);
    btns.set(t.id, b);
    root.appendChild(b);
  }
  function select(id: string) {
    active = id;
    for (const [tid, b] of btns) b.classList.toggle('dw-active', tid === id);
  }
  select(active);
  return { root, select, get active() { return active; } };
}

/** Lightweight modal confirm. Resolves true/false. */
export function confirmDialog(text: string, opts?: { okLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = el('div', {
      style: {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)', zIndex: '10000',
        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto',
      },
    });
    const finish = (v: boolean) => { overlay.remove(); resolve(v); };
    const box = el('div', { class: 'dw-panel', style: { padding: '18px 20px', width: '320px', textAlign: 'center' } },
      el('div', { style: { marginBottom: '14px', fontSize: '13px', lineHeight: '1.5' } }, text),
      el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } },
        el('button', { class: 'dw-btn dw-btn-ghost', onclick: () => finish(false) }, 'Cancel'),
        el('button', { class: `dw-btn ${opts?.danger ? 'dw-btn-danger' : 'dw-btn-primary'}`, onclick: () => finish(true) }, opts?.okLabel ?? 'Confirm'),
      ));
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

let openMenu: HTMLElement | null = null;
function closeContextMenu() { openMenu?.remove(); openMenu = null; }
window.addEventListener('mousedown', closeContextMenu);
window.addEventListener('blur', closeContextMenu);

export function showContextMenu(x: number, y: number, items: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }[]): void {
  closeContextMenu();
  if (!items.length) return;
  const menu = el('div', {
    class: 'dw-panel',
    style: { position: 'fixed', left: `${x}px`, top: `${y}px`, zIndex: '10001', padding: '4px', display: 'flex', flexDirection: 'column', minWidth: '140px', pointerEvents: 'auto' },
  });
  for (const it of items) {
    menu.appendChild(el('div', {
      style: {
        padding: '6px 10px', fontSize: '12px', cursor: it.disabled ? 'not-allowed' : 'pointer',
        opacity: it.disabled ? '0.4' : '1', borderRadius: '4px', color: it.danger ? '#ff9a9a' : undefined,
      },
      onmouseenter: (e: MouseEvent) => { if (!it.disabled) (e.target as HTMLElement).style.background = 'rgba(232,196,119,0.15)'; },
      onmouseleave: (e: MouseEvent) => { (e.target as HTMLElement).style.background = ''; },
      onclick: (e: MouseEvent) => { e.stopPropagation(); if (it.disabled) return; closeContextMenu(); it.onClick(); },
    }, it.label));
  }
  document.body.appendChild(menu);
  openMenu = menu;
  // clamp on screen
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = `${window.innerWidth - rect.width - 4}px`;
  if (rect.bottom > window.innerHeight) menu.style.top = `${window.innerHeight - rect.height - 4}px`;
}

export function progressBar(pct: number, className = ''): HTMLElement {
  return el('div', { class: `dw-prof-bar ${className}` }, el('div', { style: { width: `${Math.round(Math.max(0, Math.min(1, pct)) * 100)}%` } }));
}

/** A generic icon slot (inventory / hotbar / skill). */
export function makeSlot(opts: {
  iconUrl?: string | null;
  count?: number | null;
  keycap?: string | null;
  rarityBorder?: string;
  empty?: boolean;
  draggableData?: string;
}): HTMLElement {
  const slot = el('div', { class: `dw-slot ${opts.empty ? 'dw-empty' : ''}` });
  if (opts.rarityBorder) slot.style.borderColor = opts.rarityBorder;
  if (opts.iconUrl) slot.appendChild(el('img', { src: opts.iconUrl, draggable: false }));
  if (opts.count && opts.count > 1) slot.appendChild(el('div', { class: 'dw-count' }, String(opts.count)));
  if (opts.keycap) slot.appendChild(el('div', { class: 'dw-keycap' }, opts.keycap));
  if (opts.draggableData) {
    slot.draggable = true;
    slot.addEventListener('dragstart', (e) => { e.dataTransfer?.setData('text/plain', opts.draggableData!); });
  }
  return slot;
}
