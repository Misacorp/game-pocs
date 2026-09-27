/**
 * DOM UI layer (HUD, windows, title screen). STUB — the UI module replaces internals, keeps API.
 */
import type { Backend } from '../net';
import type { GameSession } from '../session';

let root: HTMLElement;

/** Create UI root layers inside #ui. */
export function initUI(el: HTMLElement): void { root = el; }

/**
 * Title / character select / character creation flow.
 * Calls onEnter(characterId) when the player picks a character.
 */
export function showTitleScreen(backend: Backend, onEnter: (characterId: string) => void): void {
  root.innerHTML = '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-family:sans-serif;pointer-events:auto"><button id="dw-new">New character</button></div>';
  root.querySelector('#dw-new')!.addEventListener('click', async () => {
    const list = await backend.listCharacters();
    const c = list[0] ?? await backend.createCharacter({ name: 'Tester' + Math.floor(Math.random() * 99), classId: 'vanguard', appearance: { skin: '#f1c27d', hair: '#6b3e26', hairStyle: 0, eyes: '#223', outfit: '#3a6ea5' } });
    root.innerHTML = '';
    onEnter(c.id);
  });
}

/** Mount in-game HUD + panels bound to the session. */
export function showGameUI(_session: GameSession): void {}
export function hideGameUI(): void { if (root) root.innerHTML = ''; }
/** True while a text input / modal wants the keyboard. */
export function isUIBlockingInput(): boolean { return false; }
