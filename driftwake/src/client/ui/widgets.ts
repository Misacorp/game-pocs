import { el } from './dom';
import { audio } from '../audio';
import { bus } from '../events';

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

/**
 * Lightweight modal confirm. Resolves true/false. Fully keyboard-operable (never native
 * confirm()): ←/→ or Tab moves focus between Cancel/Confirm, Enter/Space activates the focused
 * button, Esc always cancels. Also emits 'input:capture' while open so the game doesn't move/
 * attack underneath it (see ClientEventMap['input:capture']).
 */
export function confirmDialog(text: string, opts?: { okLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = el('div', {
      style: {
        position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.5)', zIndex: '10000',
        display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto',
      },
    });
    let focus = 0; // 0 = Cancel (safe default), 1 = Confirm
    const cancelBtn = el('button', { class: 'dw-btn dw-btn-ghost', onclick: () => finish(false) }, 'Cancel');
    const okBtn = el('button', { class: `dw-btn ${opts?.danger ? 'dw-btn-danger' : 'dw-btn-primary'}` , onclick: () => finish(true) }, opts?.okLabel ?? 'Confirm');
    const btns = [cancelBtn, okBtn];
    function applyFocus() { btns.forEach((b, i) => b.classList.toggle('dw-kbd-focus', i === focus)); }
    applyFocus();
    const box = el('div', { class: 'dw-panel', style: { padding: '18px 20px', width: '320px', textAlign: 'center' } },
      el('div', { style: { marginBottom: '14px', fontSize: '13px', lineHeight: '1.5' } }, text),
      el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } }, cancelBtn, okBtn),
      keyHintFooter('←→ choose · Enter select · Esc cancel'));
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    bus.emit('input:capture', true);
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'Tab') { focus = focus === 0 ? 1 : 0; applyFocus(); }
      else if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') btns[focus].click();
      else if (e.code === 'Escape') finish(false);
    };
    window.addEventListener('keydown', onKey, true);
    function finish(v: boolean) {
      window.removeEventListener('keydown', onKey, true);
      bus.emit('input:capture', false);
      overlay.remove();
      resolve(v);
    }
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
        opacity: it.disabled ? '0.4' : '1', borderRadius: '4px', color: it.danger ? 'var(--dw-coral)' : undefined,
      },
      onmouseenter: (e: MouseEvent) => { if (!it.disabled) (e.target as HTMLElement).style.background = 'rgba(255,179,71,0.14)'; },
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

/** Small "↑↓ choose · Enter select · Esc back" style footer shown at the bottom of a
 *  keyboard-navigable window/dialog so players know the window is fully keyboard-operable. */
export function keyHintFooter(text: string): HTMLElement {
  return el('div', { class: 'dw-kbd-hint' }, text);
}

export interface ListNavOptions {
  /** Index focused initially (default 0, clamped to the list). */
  initialIndex?: number;
  /** Escape/Backspace callback — "go back one step, or close at root". Omit to not handle those keys. */
  onBack?: () => void;
  /** Arrow keys wrap around at the ends (default true). */
  wrap?: boolean;
  /** Also honor digit keys 1-9 as "jump straight to the Nth item", and prefix each item (up to
   *  the 9th) with a small number chip so the player can see which digit picks which option. */
  numbered?: boolean;
  /** Also move focus on ←/→ (as well as ↑/↓ and W/S). Leave off when a caller already gives ←/→
   *  a different meaning of its own (e.g. the Quest Log's Active/Completed tab switch). */
  horizontal?: boolean;
}
export interface ListNavHandle {
  /** Feed a keydown event to the nav. Returns true (and already called preventDefault +
   *  stopImmediatePropagation) if this nav consumed the key. */
  handleKey(e: KeyboardEvent): boolean;
  readonly focusIndex: number;
  refocus(i: number): void;
}

/** Keyboard list navigation shared by the dialogue window, quest log and turn-in choice cards:
 *  ↑/↓ (also ←/→, W/S) move a focus highlight (`.dw-kbd-focus`) over `items`, Enter/Space/Z
 *  activates the focused item (via a synthetic click — reuses whatever onclick the caller already
 *  wired), and optionally 1-9 jumps straight to an item. Esc/Backspace calls `onBack` if given. */
export function createListNav(items: HTMLElement[], opts: ListNavOptions = {}): ListNavHandle {
  const wrap = opts.wrap !== false;
  let idx = items.length ? Math.min(Math.max(opts.initialIndex ?? 0, 0), items.length - 1) : 0;

  function apply() {
    items.forEach((it, i) => it.classList.toggle('dw-kbd-focus', i === idx));
    items[idx]?.scrollIntoView({ block: 'nearest' });
  }
  if (opts.numbered) {
    items.forEach((it, i) => {
      if (i >= 9 || it.querySelector(':scope > .dw-kbd-num')) return;
      it.insertBefore(el('span', { class: 'dw-kbd-num' }, String(i + 1)), it.firstChild);
    });
  }
  apply();

  function move(delta: number) {
    if (!items.length) return;
    idx = wrap ? (idx + delta + items.length) % items.length : Math.max(0, Math.min(items.length - 1, idx + delta));
    apply();
  }

  function handleKey(e: KeyboardEvent): boolean {
    const code = e.code;
    if (code === 'ArrowUp' || code === 'KeyW' || (opts.horizontal && code === 'ArrowLeft')) { e.preventDefault(); e.stopImmediatePropagation(); move(-1); return true; }
    if (code === 'ArrowDown' || code === 'KeyS' || (opts.horizontal && code === 'ArrowRight')) { e.preventDefault(); e.stopImmediatePropagation(); move(1); return true; }
    if (code === 'Enter' || code === 'Space' || code === 'KeyZ') {
      e.preventDefault(); e.stopImmediatePropagation();
      (items[idx] as HTMLElement | undefined)?.click();
      return true;
    }
    if ((code === 'Escape' || code === 'Backspace') && opts.onBack) { e.preventDefault(); e.stopImmediatePropagation(); opts.onBack(); return true; }
    if (opts.numbered && /^Digit[1-9]$/.test(code)) {
      const n = parseInt(code.slice(5), 10) - 1;
      if (items[n]) { e.preventDefault(); e.stopImmediatePropagation(); idx = n; apply(); items[n].click(); return true; }
    }
    return false;
  }

  return { handleKey, get focusIndex() { return idx; }, refocus(i: number) { idx = Math.max(0, Math.min(items.length - 1, i)); apply(); } };
}
