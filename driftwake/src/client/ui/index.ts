/**
 * DOM UI layer (HUD, windows, title screen) — public API used by main.ts. Keep these signatures stable.
 */
import type { Backend } from '../net';
import type { GameSession } from '../session';
import { injectStyles } from './styles';
import { el } from './dom';
import { bus } from '../events';
import { buildTitleScreen } from './title';
import { WindowManager } from './manager';
import { createHud } from './hud';
import { createMinimap } from './minimap';
import { createQuestTracker } from './tracker';
import { createNotificationLayer } from './notifications';
import { createChat } from './chat';
import { createInventoryWindow } from './windows/inventory';
import { createCharacterWindow } from './windows/character';
import { createSkillsWindow } from './windows/skills';
import { createQuestLogWindow } from './windows/questlog';
import { createDialogueWindow } from './windows/dialogue';
import { createShopWindow } from './windows/shop';
import { createProfessionsWindow } from './windows/professions';
import { createWorldMapWindow } from './windows/worldmap';
import { createBestiaryWindow } from './windows/bestiary';
import { createSettingsWindow, applyStoredUiScale } from './windows/settings';
import { createMenuWindow } from './windows/menu';
import { createHelpWindow } from './windows/help';
import { uiState } from './state';
import { hideTooltip } from './tooltip';

let root: HTMLElement;
let gameLayer: HTMLElement | null = null;
let cleanupFns: (() => void)[] = [];
let settingsListening: (() => boolean) | null = null;

/** Create UI root layers inside #ui. */
export function initUI(rootEl: HTMLElement): void {
  root = rootEl;
  injectStyles();
}

/**
 * Title / character select / character creation flow.
 * Calls onEnter(characterId) when the player picks a character.
 */
export function showTitleScreen(backend: Backend, onEnter: (characterId: string) => void): void {
  root.innerHTML = '';
  hideTooltip();
  buildTitleScreen(root, backend, onEnter);
}

/** Mount in-game HUD + panels bound to the session. */
export function showGameUI(session: GameSession): void {
  root.innerHTML = '';
  cleanupFns = [];
  uiState.openShopId = null;
  uiState.trainerNpcId = null;
  uiState.trainerProfessionId = null;

  gameLayer = el('div', { id: 'dw-hud', style: { position: 'absolute', inset: '0' } });
  root.appendChild(gameLayer);
  // Dev hook so windows can be exercised without the engine (see AGENTS testing notes).
  (window as any).__ui = { bus, toggle: (panel: string) => bus.emit('ui:toggle', { panel: panel as any }) };
  applyStoredUiScale(root);

  const windowsLayer = el('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } });
  gameLayer.appendChild(windowsLayer);
  const wm = new WindowManager(windowsLayer);

  const hud = createHud(session);
  const minimap = createMinimap();
  const tracker = createQuestTracker(session, wm);
  const notif = createNotificationLayer(session);
  const chat = createChat(session);

  gameLayer.appendChild(hud.root);
  gameLayer.appendChild(minimap);
  gameLayer.appendChild(tracker.root);
  gameLayer.appendChild(notif.root);
  gameLayer.appendChild(chat.root);
  cleanupFns.push(hud.cleanup, tracker.cleanup, notif.cleanup, chat.cleanup, () => wm.dispose());

  createInventoryWindow(wm, session);
  createCharacterWindow(wm, session);
  createSkillsWindow(wm, session);
  createQuestLogWindow(wm, session);
  createProfessionsWindow(wm, session);
  createWorldMapWindow(wm, session);
  createBestiaryWindow(wm, session);
  createShopWindow(wm, session);
  createDialogueWindow(wm, session, (panel) => wm.open(panel));
  const settings = createSettingsWindow(wm, root);
  settingsListening = settings.isListening;
  createMenuWindow(wm);
  createHelpWindow(wm);

  const offToggle = bus.on('ui:toggle', ({ panel }) => {
    if (panel === 'menu') {
      if (wm.anyOpen('menu')) wm.closeTopmost();
      else wm.toggle('menu');
    } else {
      wm.toggle(panel);
    }
  });
  cleanupFns.push(offToggle);

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (settingsListening?.()) return; // key-remap capture handles its own Escape
    if (document.activeElement && root.contains(document.activeElement) && (document.activeElement as HTMLElement).tagName === 'INPUT') return; // let chat/input own-handler deal with it
    if (wm.anyOpen()) { wm.closeTopmost(); e.stopPropagation(); }
  };
  window.addEventListener('keydown', onKeydown, true);
  cleanupFns.push(() => window.removeEventListener('keydown', onKeydown, true));
}

export function hideGameUI(): void {
  for (const fn of cleanupFns) { try { fn(); } catch { /* ignore */ } }
  cleanupFns = [];
  settingsListening = null;
  hideTooltip();
  if (root) root.innerHTML = '';
  gameLayer = null;
}

/** True while a text input / modal wants the keyboard. */
export function isUIBlockingInput(): boolean {
  if (settingsListening?.()) return true;
  const active = document.activeElement as HTMLElement | null;
  if (!active || !root) return false;
  if (!root.contains(active)) return false;
  const tag = active.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || active.isContentEditable;
}
