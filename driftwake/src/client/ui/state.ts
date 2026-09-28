import { store } from './dom';
import { bus } from '../events';

/** Small piece of cross-window mutable state that doesn't belong on the bus. */
export const uiState = {
  /** Shop currently open (so Inventory's context menu can offer "Sell"). */
  openShopId: null as string | null,
  /** Profession trainer NPC currently open at (so Professions window can allow learn/buy). */
  trainerNpcId: null as string | null,
  trainerProfessionId: null as string | null,
};

// ---- Quest tracker display preferences (per-client only, never sent to the server) -------------

const PIN_KEY = 'driftwake:tracker:pinned';
const COLLAPSE_KEY = 'driftwake:tracker:collapsed';

/** Quest ids explicitly unpinned from the right-side tracker via the Quest Log's pin toggle.
 *  Everything else active is considered pinned by default so a fresh character always sees their
 *  active quests without having to opt in first. */
let unpinned = new Set<string>(store.get<string[]>(PIN_KEY, []));

export function isQuestPinned(questId: string): boolean { return !unpinned.has(questId); }

export function toggleQuestPin(questId: string): void {
  if (unpinned.has(questId)) unpinned.delete(questId); else unpinned.add(questId);
  store.set(PIN_KEY, [...unpinned]);
  bus.emit('ui:questPinsChanged');
}

export function isTrackerCollapsed(): boolean { return store.get(COLLAPSE_KEY, false); }
export function setTrackerCollapsed(v: boolean): void { store.set(COLLAPSE_KEY, v); }
