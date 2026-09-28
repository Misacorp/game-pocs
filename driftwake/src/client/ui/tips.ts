/**
 * First-time tutorial hint bubbles. Contextual, dismissible, shown once per character (persisted
 * in localStorage keyed by character id, so it survives reload but never touches server state).
 * Bottom-center, above the HUD; auto-dismisses after ~10s or on "Got it".
 */
import { el, store } from './dom';
import { bus } from '../events';
import type { GameSession } from '../session';
import { ITEMS } from '@shared/data';

const ENABLED_KEY = 'driftwake:tips:enabled';
const AUTO_DISMISS_MS = 10_000;

export function tipsEnabled(): boolean { return store.get(ENABLED_KEY, true); }
export function setTipsEnabled(on: boolean): void { store.set(ENABLED_KEY, on); }

function seenKey(charId: string): string { return `driftwake:tips:seen:${charId}`; }
function loadSeen(charId: string): Set<string> { return new Set(store.get<string[]>(seenKey(charId), [])); }
function saveSeen(charId: string, seen: Set<string>): void { store.set(seenKey(charId), [...seen]); }

interface Tip { id: string; title: string; text: string }

export function createTipLayer(session: GameSession): { root: HTMLElement; cleanup: () => void } {
  const charId = session.state.id;
  const seen = loadSeen(charId);
  const queue: Tip[] = [];
  let current: Tip | null = null;
  let dismissTimer: number | null = null;

  const bubble = el('div', { class: 'dw-tip dw-panel', style: { display: 'none' } });
  const root = el('div', { style: { position: 'absolute', left: '50%', bottom: '195px', transform: 'translateX(-50%)', pointerEvents: 'none' } }, bubble);

  function seenOrDisabled(id: string): boolean { return seen.has(id) || !tipsEnabled(); }

  function queueTip(id: string, title: string, text: string): void {
    if (seenOrDisabled(id)) return;
    seen.add(id); saveSeen(charId, seen); // mark immediately so a re-render never double-queues
    queue.push({ id, title, text });
    if (!current) showNext();
  }

  function showNext(): void {
    current = queue.shift() ?? null;
    if (!current) { bubble.style.display = 'none'; return; }
    bubble.innerHTML = '';
    bubble.style.display = 'flex';
    bubble.appendChild(el('div', {},
      el('div', { style: { font: '400 15px "IM Fell English SC", Georgia, serif', color: 'var(--dw-lantern-hot)', marginBottom: '2px' } }, current.title),
      el('div', { style: { fontSize: '12px', color: 'var(--dw-bone)' } }, current.text)));
    bubble.appendChild(el('button', { class: 'dw-btn dw-btn-sm dw-btn-ghost', style: { marginLeft: '10px', flexShrink: '0' }, onclick: dismiss }, 'Got it'));
    if (dismissTimer !== null) window.clearTimeout(dismissTimer);
    dismissTimer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
  }

  function dismiss(): void {
    if (dismissTimer !== null) { window.clearTimeout(dismissTimer); dismissTimer = null; }
    showNext();
  }

  let lastKills = session.state.counters.kills;
  let lastLevel = session.state.level;

  const offs: (() => void)[] = [];
  offs.push(bus.on('world:entered', () => {
    queueTip('welcome', 'Welcome to Driftwake', 'Talk to Old Pell — press ↑ near him. Arrows move, Space jumps, X attacks, Z interacts/gathers.');
  }));
  offs.push(bus.on('state', ({ state }) => {
    if (state.counters.kills > 0 && lastKills === 0) {
      queueTip('first_kill', 'First Kill', 'Loot is picked up automatically. X = basic attack, Q = your first skill.');
    }
    lastKills = state.counters.kills;
    if (state.level >= 15 && lastLevel < 15) {
      queueTip('level15', 'Job Advancement Awaits', 'Visit your class instructor at Gale Outpost to specialize your job.');
    }
    lastLevel = state.level;
  }));
  offs.push(bus.on('game', (ev) => {
    if (ev.type === 'levelUp') {
      queueTip('first_levelup', 'Level Up!', 'You have AP to spend — press C to open your Character sheet.');
      queueTip('first_skillpoint', 'Skill Points', 'Press K to learn skills, then drag them onto your hotbar.');
    } else if (ev.type === 'questReady') {
      queueTip('quest_ready', 'Quest Ready', 'Return to the quest giver — look for the ? marker above their head.');
    } else if (ev.type === 'itemAdded' && ITEMS[ev.itemId]?.equip) {
      queueTip('equip_drop', 'New Gear', 'Double-click an item in your Inventory (I) to equip it.');
    }
  }));
  offs.push(bus.on('vitals', ({ hp, maxHp }) => {
    if (maxHp > 0 && hp / maxHp < 0.3) queueTip('low_hp', 'Low HP!', 'Potions are on hotbar slots 1 and 2.');
  }));
  offs.push(bus.on('ui:hint', (payload) => {
    if (payload?.text === 'Z Gather') queueTip('gather_node', 'Gathering', 'Press Z to gather from this node.');
  }));
  offs.push(bus.on('ui:crafting', () => {
    queueTip('crafting_trainer', 'Crafting Trainer', 'Learn a profession here, or craft anytime once you know it via the Professions window (B).');
  }));

  return { root, cleanup: () => { offs.forEach((o) => o()); if (dismissTimer !== null) window.clearTimeout(dismissTimer); } };
}
