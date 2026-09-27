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
