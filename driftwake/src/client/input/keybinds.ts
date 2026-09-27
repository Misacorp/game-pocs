/**
 * Rebindable keyboard controls. Keys are KeyboardEvent.code values.
 * Persisted to localStorage. Engine and UI both read from here.
 */
import { HOTBAR_SIZE } from '@shared/constants';

export type BindAction =
  | 'moveLeft' | 'moveRight' | 'up' | 'down' | 'jump' | 'attack' | 'dash' | 'interact'
  | `hotbar${number}`
  | 'inventory' | 'character' | 'skills' | 'quests' | 'professions' | 'map' | 'bestiary' | 'help'
  | 'achievements'
  | 'menu' | 'chat';

export const HOTBAR_DEFAULT_KEYS = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];

export const DEFAULT_BINDS: Record<string, string[]> = {
  moveLeft: ['ArrowLeft'],
  moveRight: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  jump: ['Space'],
  attack: ['KeyX'],
  dash: ['ShiftLeft', 'ShiftRight'],
  interact: ['KeyZ'],
  inventory: ['KeyI'],
  character: ['KeyC'],
  skills: ['KeyK'],
  quests: ['KeyL'],
  professions: ['KeyB'],
  map: ['KeyM'],
  bestiary: ['KeyN'],
  help: ['F1', 'KeyH'],
  achievements: ['KeyJ'],
  menu: ['Escape'],
  chat: ['Enter'],
  ...Object.fromEntries(Array.from({ length: HOTBAR_SIZE }, (_, i) => [`hotbar${i}`, [HOTBAR_DEFAULT_KEYS[i]]])),
};

export const BIND_LABELS: Record<string, string> = {
  moveLeft: 'Move Left', moveRight: 'Move Right', up: 'Up / Climb / Enter Portal / Talk', down: 'Down / Crouch / Drop',
  jump: 'Jump', attack: 'Basic Attack', dash: 'Dash (i-frames)', interact: 'Interact / Gather / Talk',
  inventory: 'Inventory', character: 'Character & Stats', skills: 'Skills', quests: 'Quest Log', professions: 'Professions & Crafting',
  map: 'World Map', bestiary: 'Bestiary', help: 'Help', achievements: 'Achievements', menu: 'Menu / Close', chat: 'Chat',
  ...Object.fromEntries(Array.from({ length: HOTBAR_SIZE }, (_, i) => [`hotbar${i}`, `Hotbar Slot ${i + 1}`])),
};

const KEY = 'driftwake:keybinds';
let binds: Record<string, string[]> = load();

function load(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_BINDS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return structuredClone(DEFAULT_BINDS);
}

export function getBinds(): Record<string, string[]> { return binds; }
export function keysFor(action: string): string[] { return binds[action] ?? []; }

/** Which action (if any) a code maps to. First match wins. */
export function actionForCode(code: string): string | null {
  for (const a in binds) if (binds[a].includes(code)) return a;
  return null;
}

/** Bind code to action as primary key; removes the code from other actions. */
export function setBind(action: string, code: string, slot = 0) {
  for (const a in binds) binds[a] = binds[a].filter((c) => c !== code);
  const arr = [...(binds[action] ?? [])];
  arr[slot] = code;
  binds[action] = arr.filter(Boolean);
  save();
}

export function resetBinds() { binds = structuredClone(DEFAULT_BINDS); save(); }

function save() { try { localStorage.setItem(KEY, JSON.stringify(binds)); } catch { /* ignore */ } }

/** Human label for a KeyboardEvent.code */
export function keyLabel(code: string | undefined): string {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space', ShiftLeft: 'Shift', ShiftRight: 'RShift',
    ControlLeft: 'Ctrl', AltLeft: 'Alt', Escape: 'Esc', Enter: 'Enter', Backquote: '`', Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/',
    Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Tab: 'Tab',
  };
  return map[code] ?? code;
}
