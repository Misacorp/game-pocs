import { el } from './dom';
import { bus } from '../events';
import type { GameSession } from '../session';
import { QUESTS, ITEMS, MONSTERS, MAPS, NPCS } from '@shared/data';
import { getQuestState, questObjectiveProgress } from '@shared/logic';
import type { Objective } from '@shared/types';
import { WindowManager } from './manager';
import { isQuestPinned, isTrackerCollapsed, setTrackerCollapsed } from './state';
import { keysFor } from '../input/keybinds';
import type { MinimapHandle } from './minimap';

/** Right-side quest tracker (PLAYTEST feedback #2): compact — one line for the quest name, then
 *  only the NEXT unfinished objective, in short form ("Puffmoss 3/8 · Mossback Meadows") instead
 *  of every objective's full sentence. Capped to 3 quests (+N more), collapsible (toggle + the
 *  'tracker' keybind, default T), sits below the minimap with a gap, and fades near the player so
 *  it blocks as little of the upper-right playfield as possible. */

const MAX_SHOWN = 3;
const GAP_BELOW_MINIMAP = 10;

/** First map name (by registry order) where this monster spawns/bosses — mirrors the private
 *  helper in shared/logic/quests.ts, kept local since that file is content's, not UI's. */
let monsterMapCache: Map<string, string | undefined> | null = null;
function mapForMonster(monsterId: string): string | undefined {
  if (!monsterMapCache) {
    monsterMapCache = new Map();
    for (const map of Object.values(MAPS)) {
      if (map.boss?.monsterId && !monsterMapCache.has(map.boss.monsterId)) monsterMapCache.set(map.boss.monsterId, map.name);
      for (const s of map.spawns) if (!monsterMapCache.has(s.monsterId)) monsterMapCache.set(s.monsterId, map.name);
    }
  }
  return monsterMapCache.get(monsterId);
}
let itemMapCache: Map<string, string | undefined> | null = null;
function mapForItem(itemId: string): string | undefined {
  if (!itemMapCache) {
    itemMapCache = new Map();
    for (const [monsterId, m] of Object.entries(MONSTERS)) {
      const map = mapForMonster(monsterId);
      if (!map) continue;
      for (const d of m.drops) if (!itemMapCache.has(d.itemId)) itemMapCache.set(d.itemId, map);
    }
  }
  return itemMapCache.get(itemId);
}

/** Short "<Name> <cur>/<target> · <Map>" form of one objective, for the tracker only — the Quest
 *  Log/dialogue keep the fuller describeObjectiveBase() sentence. */
function compactObjective(obj: Objective, current: number, target: number): string {
  switch (obj.type) {
    case 'kill': {
      const name = MONSTERS[obj.monsterId]?.name ?? obj.monsterId;
      const map = mapForMonster(obj.monsterId);
      return `${name} ${current}/${target}` + (map ? ` · ${map}` : '');
    }
    case 'collect': {
      const name = ITEMS[obj.itemId]?.name ?? obj.itemId;
      const map = mapForItem(obj.itemId);
      return `${name} ${current}/${target}` + (map ? ` · ${map}` : '');
    }
    case 'boss': {
      const name = MONSTERS[obj.monsterId]?.name ?? obj.monsterId;
      const map = mapForMonster(obj.monsterId);
      return map ? `${name} · ${map}` : name;
    }
    case 'talk': return obj.desc ?? 'Talk to someone';
    case 'visit': return `Visit ${MAPS[obj.mapId]?.name ?? obj.mapId}`;
    case 'craft': return (obj.itemId ? `Craft ${ITEMS[obj.itemId]?.name ?? obj.itemId}` : 'Craft') + ` ${current}/${target}`;
    case 'gather': return `Gather ${current}/${target}`;
    case 'level': return `Reach level ${target}`;
    case 'enhance': return `Enhance to +${target}`;
    case 'learnProfession': return 'Learn a profession';
    default: return '';
  }
}

export function createQuestTracker(session: GameSession, wm: WindowManager, minimap?: MinimapHandle): { root: HTMLElement; cleanup: () => void } {
  const listEl = el('div', { class: 'dw-tracker-list' });
  const collapseBtn = el('button', { class: 'dw-tracker-toggle', title: 'Toggle quest tracker (T)' });
  const header = el('div', { class: 'dw-tracker-head' }, el('span', { class: 'dw-caps' }, 'Quests'), collapseBtn);
  const root = el('div', { class: 'dw-tracker' }, header, listEl);

  let collapsed = isTrackerCollapsed();
  function applyCollapsed() {
    root.classList.toggle('dw-collapsed', collapsed);
    collapseBtn.textContent = collapsed ? '▸' : '▾';
    setTrackerCollapsed(collapsed);
  }
  collapseBtn.addEventListener('click', () => { collapsed = !collapsed; applyCollapsed(); });
  applyCollapsed();

  function render() {
    listEl.innerHTML = '';
    if (collapsed) return;
    const active = Object.entries(session.state.quests)
      .filter(([, p]) => p.state === 'active')
      .map(([id]) => id)
      .filter((id) => isQuestPinned(id));
    const shown = active.slice(0, MAX_SHOWN);
    for (const questId of shown) {
      const def = QUESTS[questId];
      const ready = getQuestState(session.state, questId) === 'ready';
      const card = el('div', { class: `dw-panel dw-tracker-quest ${ready ? 'dw-ready' : ''}`, onclick: () => wm.open('quests') },
        el('div', { class: 'dw-tq-name' }, def?.name ?? questId, ready ? ' ✔' : ''));
      if (ready && def) {
        const turnInNpc = NPCS[def.turnIn ?? def.giver]?.name ?? (def.turnIn ?? def.giver);
        card.appendChild(el('div', { class: 'dw-tq-obj dw-tq-return' }, `Return to ${turnInNpc}`));
      } else if (def) {
        const views = questObjectiveProgress(session.state, questId);
        const nextIdx = def.objectives.findIndex((_, i) => !views[i]?.done);
        if (nextIdx >= 0) {
          const v = views[nextIdx];
          card.appendChild(el('div', { class: 'dw-tq-obj' }, compactObjective(def.objectives[nextIdx], v.current, v.target)));
        }
      }
      listEl.appendChild(card);
    }
    const hiddenCount = active.length - shown.length;
    if (hiddenCount > 0) listEl.appendChild(el('div', { class: 'dw-tq-more', onclick: () => wm.open('quests') }, `+${hiddenCount} more`));
    // Nothing tracked: collapse to nothing rather than an empty panel sitting over the map. The
    // whole tracker (including the collapse toggle) reappears the moment a quest becomes active
    // and pinned again — nothing to re-expand in the meantime since there's nothing to show.
    root.classList.toggle('dw-tracker-empty', !active.length);
    reposition();
  }

  render();
  const offs: (() => void)[] = [bus.on('state', render), bus.on('ui:questPinsChanged', render)];

  // ---- Position below the minimap, with a gap ------------------------------------------------
  // Called on every render (cheap) too, not just mount/resize: the minimap's own height can
  // change size after this first paints (web fonts finishing their swap reflows its name label),
  // and a stale offset would otherwise leave the tracker overlapping the minimap until the next
  // window resize.
  function reposition() {
    if (!minimap?.root) return;
    const r = minimap.root.getBoundingClientRect();
    root.style.top = `${Math.round(r.bottom + GAP_BELOW_MINIMAP)}px`;
    root.style.right = '14px';
  }
  reposition();
  // Re-check once more after layout/fonts settle (fonts.ready resolves once web fonts used above
  // the fold, like the minimap's IM Fell English SC name label, have finished swapping in).
  if ('fonts' in document) (document as any).fonts.ready.then(reposition).catch(() => {});
  requestAnimationFrame(() => requestAnimationFrame(reposition));
  window.addEventListener('resize', reposition);
  offs.push(() => window.removeEventListener('resize', reposition));

  // ---- Fade near the player ------------------------------------------------------------------
  // The UI layer has no screen-space player position (only world coords via 'world:minimap'), so
  // this approximates "the player is likely behind the tracker" by whether they're near the
  // map's top-right corner — the one case where a bounds-clamped camera can put the player's
  // on-screen position under this top-right HUD element. Good enough to keep the tracker out of
  // the way without engine changes; a real screen-space check could replace this if the engine
  // ever exposes one.
  const offMinimap = bus.on('world:minimap', (m) => {
    const nearRight = m.width > 0 && m.player.x / m.width > 0.82;
    const nearTop = m.height > 0 && m.player.y / m.height < 0.22;
    root.classList.toggle('dw-tracker-faded', nearRight && nearTop);
  });
  offs.push(offMinimap);

  // ---- 'tracker' keybind (default T) toggles collapse ----------------------------------------
  let capturing = false;
  offs.push(bus.on('input:capture', (v) => { capturing = v; }));
  const onKeyDown = (e: KeyboardEvent) => {
    if (capturing) return;
    if ((document.activeElement as HTMLElement | null)?.tagName === 'INPUT') return;
    if (!keysFor('tracker').includes(e.code)) return;
    e.preventDefault();
    collapsed = !collapsed;
    applyCollapsed();
  };
  window.addEventListener('keydown', onKeyDown);
  offs.push(() => window.removeEventListener('keydown', onKeyDown));

  return { root, cleanup: () => offs.forEach((o) => o()) };
}
