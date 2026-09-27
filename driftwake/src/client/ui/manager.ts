/**
 * Draggable window chrome + a small registry so Esc closes the topmost window and
 * `ui:toggle` events can find/open/close panels by id. Positions persist per-panel in localStorage.
 */
import { el, clamp, store } from './dom';
import type { PanelId } from '../events';
import { audio } from '../audio';
import { hideTooltip } from './tooltip';

export interface WindowController {
  panel: PanelId | string;
  root: HTMLElement;
  isOpen(): boolean;
  open(): void;
  close(): void;
  toggle(): void;
}

const POS_KEY = 'driftwake:winpos';

function loadPos(): Record<string, { x: number; y: number }> { return store.get(POS_KEY, {}); }
function savePos(all: Record<string, { x: number; y: number }>) { store.set(POS_KEY, all); }

/** Deterministic cascade so first-run windows fan out instead of stacking exactly on each other. */
let cascadeN = 0;
function nextCascadePos(): { x: number; y: number } {
  const n = cascadeN++;
  return { x: 90 + (n % 6) * 34, y: 54 + (n % 6) * 28 };
}

export class WindowManager {
  private stack: WindowController[] = [];
  private registry = new Map<string, WindowController>();
  /** window-level listeners (drag mousemove/mouseup) registered by createWindow, removed on dispose(). */
  windowListeners: [string, EventListenerOrEventListenerObject][] = [];
  constructor(private layer: HTMLElement) {}

  /** Detach global (window-level) listeners created for this manager's windows. Call when tearing down the game UI. */
  dispose() {
    for (const [type, fn] of this.windowListeners) window.removeEventListener(type, fn);
    this.windowListeners = [];
  }

  register(ctrl: WindowController) { this.registry.set(ctrl.panel, ctrl); }
  get(panel: string): WindowController | undefined { return this.registry.get(panel); }

  notifyOpened(ctrl: WindowController) {
    this.stack = this.stack.filter((c) => c !== ctrl);
    this.stack.push(ctrl);
    this.restack();
  }
  notifyClosed(ctrl: WindowController) {
    this.stack = this.stack.filter((c) => c !== ctrl);
  }
  private restack() {
    this.stack.forEach((c, i) => { c.root.style.zIndex = String(100 + i); });
  }
  bringToFront(ctrl: WindowController) { this.notifyOpened(ctrl); }

  /** Closes the topmost open window (used for Esc). Returns true if something closed. */
  closeTopmost(): boolean {
    const top = this.stack[this.stack.length - 1];
    if (!top) return false;
    top.close();
    return true;
  }

  anyOpen(excluding?: string): boolean {
    return this.stack.some((c) => c.panel !== excluding);
  }

  toggle(panel: string) {
    this.registry.get(panel)?.toggle();
  }
  open(panel: string) {
    this.registry.get(panel)?.open();
  }
  close(panel: string) {
    this.registry.get(panel)?.close();
  }
  isOpen(panel: string): boolean {
    return this.registry.get(panel)?.isOpen() ?? false;
  }

  closeAll() {
    for (const c of [...this.stack]) c.close();
  }

  get container() { return this.layer; }
}

export interface WindowOpts {
  panel: PanelId | string;
  title: string;
  width?: number;
  defaultPos?: { x: number; y: number };
  className?: string;
  titleIcon?: string;
  onOpen?: () => void;
  onClose?: () => void;
  /** If true, closing hides but keeps state (default). */
}

/** Creates window chrome (titlebar/close/draggable/position-persisted) around `body`. */
export function createWindow(wm: WindowManager, opts: WindowOpts, body: HTMLElement): WindowController {
  const titleIconEl = opts.titleIcon ? el('img', { class: 'dw-icon', src: opts.titleIcon }) : null;
  const closeBtn = el('button', { class: 'dw-close', title: 'Close' }, '✕');
  const titlebar = el('div', { class: 'dw-titlebar' }, titleIconEl, el('div', { class: 'dw-title dw-caps' }, opts.title), closeBtn);
  const root = el('div', {
    class: `dw-panel dw-window ${opts.className ?? ''}`,
    style: { width: opts.width ? `${opts.width}px` : undefined, display: 'none' },
  }, titlebar, body);
  wm.container.appendChild(root);

  const positions = loadPos();
  const saved = positions[opts.panel as string] ?? opts.defaultPos ?? nextCascadePos();
  root.style.left = `${saved.x}px`;
  root.style.top = `${saved.y}px`;

  let open = false;
  const ctrl: WindowController = {
    panel: opts.panel,
    root,
    isOpen: () => open,
    open() {
      hideTooltip();
      if (open) { wm.bringToFront(ctrl); return; }
      open = true;
      root.style.display = 'flex';
      root.classList.remove('dw-closing');
      wm.notifyOpened(ctrl);
      audio.playSfx('uiOpen');
      opts.onOpen?.();
    },
    close() {
      hideTooltip();
      if (!open) return;
      open = false;
      root.classList.add('dw-closing');
      audio.playSfx('uiClose');
      window.setTimeout(() => { if (!open) root.style.display = 'none'; }, 130);
      wm.notifyClosed(ctrl);
      opts.onClose?.();
    },
    toggle() { open ? ctrl.close() : ctrl.open(); },
  };

  closeBtn.addEventListener('click', () => ctrl.close());
  root.addEventListener('mousedown', () => wm.bringToFront(ctrl));

  // Dragging
  let dragging = false, startX = 0, startY = 0, origX = 0, origY = 0;
  titlebar.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('.dw-close')) return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    origX = root.offsetLeft; origY = root.offsetTop;
    e.preventDefault();
  });
  const onMove = (e: MouseEvent) => {
    if (!dragging) return;
    const nx = clamp(origX + (e.clientX - startX), -root.offsetWidth + 60, window.innerWidth - 40);
    const ny = clamp(origY + (e.clientY - startY), 0, window.innerHeight - 30);
    root.style.left = `${nx}px`;
    root.style.top = `${ny}px`;
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    const all = loadPos();
    all[opts.panel as string] = { x: root.offsetLeft, y: root.offsetTop };
    savePos(all);
  };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  wm.windowListeners.push(['mousemove', onMove as EventListener], ['mouseup', onUp as EventListener]);

  wm.register(ctrl);
  return ctrl;
}
