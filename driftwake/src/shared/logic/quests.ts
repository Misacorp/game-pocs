import type { CharacterState, Objective, QuestDef } from '../types';
import { QUESTS, ITEMS, MONSTERS, NPCS, MAPS } from '../data';
import { checkConditions, getQuestState } from './conditions';
import { countItem } from './items';

/** Shared "can this quest be offered right now" check (also used by the reducer's acceptQuest). */
export function canOfferQuest(state: CharacterState, def: QuestDef, now: number = Date.now()): boolean {
  const st = getQuestState(state, def.id);
  if (st === 'notStarted') return checkConditions(state, def.reqs);
  if (st === 'completed' && def.repeatable) {
    const qp = state.quests[def.id];
    const completedAt = qp?.completedAt ?? 0;
    if (now - completedAt >= def.repeatable.cooldownMs) return checkConditions(state, def.reqs);
  }
  return false;
}

/** Quests this NPC can offer right now. */
export function questsOfferedBy(state: CharacterState, npcId: string): QuestDef[] {
  return Object.values(QUESTS).filter((def) => def.giver === npcId && canOfferQuest(state, def));
}

/** Active quests whose turn-in NPC is this npc and all objectives are complete. */
export function questsReadyAt(state: CharacterState, npcId: string): QuestDef[] {
  return Object.values(QUESTS).filter((def) => {
    if ((def.turnIn ?? def.giver) !== npcId) return false;
    const qp = state.quests[def.id];
    return !!qp && qp.state === 'active' && getQuestState(state, def.id) === 'ready';
  });
}

/** Active quests involving this NPC that aren't finished (for progress text). */
export function questsInProgressAt(state: CharacterState, npcId: string): QuestDef[] {
  return Object.values(QUESTS).filter((def) => {
    if (def.giver !== npcId && (def.turnIn ?? def.giver) !== npcId) return false;
    const qp = state.quests[def.id];
    return !!qp && qp.state === 'active' && getQuestState(state, def.id) === 'active';
  });
}

/** True if all objectives are met (quest is active and ready to turn in). */
export function isQuestReady(state: CharacterState, questId: string): boolean {
  return getQuestState(state, questId) === 'ready';
}

/** NPC marker for overhead icon: '!' available, '?' ready to turn in, '…' in progress, null none. */
export function npcQuestMarker(state: CharacterState, npcId: string): '!' | '?' | '…' | null {
  if (questsReadyAt(state, npcId).length > 0) return '?';
  if (questsOfferedBy(state, npcId).length > 0) return '!';
  if (questsInProgressAt(state, npcId).length > 0) return '…';
  return null;
}

export interface ObjectiveView { text: string; current: number; target: number; done: boolean }

/** First map (by registry order) where this monster spawns or is the boss — used to give quest
 *  objective text a concrete location ("Defeat 8 Puffmoss in Mossback Meadows") instead of making
 *  the player guess from the monster name alone.
 *  MAPS/MONSTERS are static content registries, so these lookups are memoized on first use —
 *  `questObjectiveProgress` (and describeObjectiveBase) runs on every tracker/quest-log render,
 *  i.e. on every non-silent dispatch while quests are active, so an unmemoized O(maps) /
 *  O(monsters*maps) scan per objective per render would add up during a combat/looting spree. */
let monsterMapCache: Map<string, string | undefined> | null = null;
function findMapForMonster(monsterId: string): string | undefined {
  if (!monsterMapCache) {
    monsterMapCache = new Map();
    for (const map of Object.values(MAPS)) {
      if (map.boss?.monsterId && !monsterMapCache.has(map.boss.monsterId)) monsterMapCache.set(map.boss.monsterId, map.name);
      for (const s of map.spawns) if (!monsterMapCache.has(s.monsterId)) monsterMapCache.set(s.monsterId, map.name);
    }
  }
  return monsterMapCache.get(monsterId);
}

/** Same idea for a collectible material/quest item: found via the first monster that drops it. */
let itemMapCache: Map<string, string | undefined> | null = null;
function findMapForItem(itemId: string): string | undefined {
  if (!itemMapCache) {
    itemMapCache = new Map();
    for (const [monsterId, m] of Object.entries(MONSTERS)) {
      const map = findMapForMonster(monsterId);
      if (!map) continue;
      for (const d of m.drops) if (!itemMapCache.has(d.itemId)) itemMapCache.set(d.itemId, map);
    }
  }
  return itemMapCache.get(itemId);
}

/**
 * Human-readable objective label, WITHOUT progress counts (a quest offer, shown before the quest
 * is accepted, has no progress yet). Also the base text `questObjectiveProgress` appends
 * "(current/target)" to — kept free of counts here so that suffix is never duplicated.
 */
export function describeObjectiveBase(obj: Objective): string {
  if (obj.desc) return obj.desc;
  switch (obj.type) {
    case 'kill': {
      const name = MONSTERS[obj.monsterId]?.name ?? obj.monsterId;
      const map = findMapForMonster(obj.monsterId);
      return map ? `Defeat ${obj.count} ${name} in ${map}` : `Defeat ${obj.count} ${name}`;
    }
    case 'collect': {
      const name = ITEMS[obj.itemId]?.name ?? obj.itemId;
      const map = findMapForItem(obj.itemId);
      return map ? `Collect ${obj.count} ${name} in ${map}` : `Collect ${obj.count} ${name}`;
    }
    case 'talk': return `Talk to ${NPCS[obj.npcId]?.name ?? obj.npcId}`;
    case 'visit': return `Visit ${MAPS[obj.mapId]?.name ?? obj.mapId}`;
    case 'craft': return obj.itemId ? `Craft ${obj.count} ${ITEMS[obj.itemId]?.name ?? obj.itemId}` : `Craft ${obj.count} items`;
    case 'gather': return `Gather ${obj.count} materials`;
    case 'level': return `Reach level ${obj.level}`;
    case 'boss': {
      const name = MONSTERS[obj.monsterId]?.name ?? obj.monsterId;
      const map = findMapForMonster(obj.monsterId);
      return map ? `Defeat ${name} in ${map}` : `Defeat ${name}`;
    }
    case 'enhance': return `Enhance an item to +${obj.stars}`;
    case 'learnProfession': return 'Learn a profession';
    default: return 'Unknown objective';
  }
}

/** Human-readable objective progress for the quest log / tracker. */
export function questObjectiveProgress(state: CharacterState, questId: string): ObjectiveView[] {
  const def = QUESTS[questId];
  if (!def) return [];
  const qp = state.quests[questId];
  return def.objectives.map((obj, i): ObjectiveView => {
    const progress = qp?.progress?.[i] ?? 0;
    const text = describeObjectiveBase(obj);
    switch (obj.type) {
      case 'kill': {
        const current = Math.min(progress, obj.count);
        return { text, current, target: obj.count, done: current >= obj.count };
      }
      case 'collect': {
        const current = Math.min(countItem(state, obj.itemId), obj.count);
        return { text, current, target: obj.count, done: current >= obj.count };
      }
      case 'talk': {
        const done = progress >= 1;
        return { text, current: done ? 1 : 0, target: 1, done };
      }
      case 'visit': {
        const done = progress >= 1;
        return { text, current: done ? 1 : 0, target: 1, done };
      }
      case 'craft': {
        const current = Math.min(progress, obj.count);
        return { text, current, target: obj.count, done: current >= obj.count };
      }
      case 'gather': {
        const current = Math.min(progress, obj.count);
        return { text, current, target: obj.count, done: current >= obj.count };
      }
      case 'level': {
        const done = state.level >= obj.level;
        return { text, current: Math.min(state.level, obj.level), target: obj.level, done };
      }
      case 'boss': {
        const done = progress >= 1;
        return { text, current: done ? 1 : 0, target: 1, done };
      }
      case 'enhance': {
        const done = progress >= obj.stars;
        return { text, current: Math.min(progress, obj.stars), target: obj.stars, done };
      }
      case 'learnProfession': {
        const done = progress >= 1;
        return { text, current: done ? 1 : 0, target: 1, done };
      }
      default:
        return { text, current: 0, target: 1, done: false };
    }
  });
}
