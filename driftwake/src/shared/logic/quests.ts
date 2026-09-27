import type { CharacterState, QuestDef } from '../types';
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

/** Human-readable objective progress for the quest log / tracker. */
export function questObjectiveProgress(state: CharacterState, questId: string): ObjectiveView[] {
  const def = QUESTS[questId];
  if (!def) return [];
  const qp = state.quests[questId];
  return def.objectives.map((obj, i): ObjectiveView => {
    const progress = qp?.progress?.[i] ?? 0;
    switch (obj.type) {
      case 'kill': {
        const name = MONSTERS[obj.monsterId]?.name ?? obj.monsterId;
        const current = Math.min(progress, obj.count);
        return { text: obj.desc ?? `Defeat ${name} ${current}/${obj.count}`, current, target: obj.count, done: current >= obj.count };
      }
      case 'collect': {
        const name = ITEMS[obj.itemId]?.name ?? obj.itemId;
        const current = Math.min(countItem(state, obj.itemId), obj.count);
        return { text: obj.desc ?? `Collect ${name} ${current}/${obj.count}`, current, target: obj.count, done: current >= obj.count };
      }
      case 'talk': {
        const done = progress >= 1;
        const name = NPCS[obj.npcId]?.name ?? obj.npcId;
        return { text: obj.desc ?? `Talk to ${name}`, current: done ? 1 : 0, target: 1, done };
      }
      case 'visit': {
        const done = progress >= 1;
        const name = MAPS[obj.mapId]?.name ?? obj.mapId;
        return { text: obj.desc ?? `Visit ${name}`, current: done ? 1 : 0, target: 1, done };
      }
      case 'craft': {
        const current = Math.min(progress, obj.count);
        return { text: obj.desc ?? `Craft ${current}/${obj.count}`, current, target: obj.count, done: current >= obj.count };
      }
      case 'gather': {
        const current = Math.min(progress, obj.count);
        return { text: obj.desc ?? `Gather ${current}/${obj.count}`, current, target: obj.count, done: current >= obj.count };
      }
      case 'level': {
        const done = state.level >= obj.level;
        return { text: obj.desc ?? `Reach level ${obj.level}`, current: Math.min(state.level, obj.level), target: obj.level, done };
      }
      case 'boss': {
        const done = progress >= 1;
        const name = MONSTERS[obj.monsterId]?.name ?? obj.monsterId;
        return { text: obj.desc ?? `Defeat ${name}`, current: done ? 1 : 0, target: 1, done };
      }
      case 'enhance': {
        const done = progress >= obj.stars;
        return { text: obj.desc ?? `Enhance an item to +${obj.stars}`, current: Math.min(progress, obj.stars), target: obj.stars, done };
      }
      case 'learnProfession': {
        const done = progress >= 1;
        return { text: obj.desc ?? 'Learn a profession', current: done ? 1 : 0, target: 1, done };
      }
      default:
        return { text: 'Unknown objective', current: 0, target: 1, done: false };
    }
  });
}
