import type { CharacterState, Condition, Objective, QuestStateName } from '../types';
import { QUESTS, JOBS } from '../data';
import { countItem } from './items';

/** Is a single objective (by index) currently satisfied? Collect objectives are checked live
 * against the inventory (not stored progress), per design. */
function objectiveMet(state: CharacterState, obj: Objective, questId: string, index: number): boolean {
  const qp = state.quests[questId];
  const progress = qp?.progress?.[index] ?? 0;
  switch (obj.type) {
    case 'kill': return progress >= obj.count;
    case 'collect': return countItem(state, obj.itemId) >= obj.count;
    case 'talk': return progress >= 1;
    case 'visit': return progress >= 1;
    case 'craft': return progress >= obj.count;
    case 'gather': return progress >= obj.count;
    case 'level': return state.level >= obj.level;
    case 'boss': return progress >= 1;
    case 'enhance': return progress >= obj.stars;
    case 'learnProfession': return progress >= 1;
    default: return false;
  }
}

/** True if every objective of an active quest is currently satisfied. */
export function allObjectivesMet(state: CharacterState, questId: string): boolean {
  const def = QUESTS[questId];
  if (!def) return false;
  return def.objectives.every((obj, i) => objectiveMet(state, obj, questId, i));
}

export function getQuestState(state: CharacterState, questId: string): QuestStateName {
  const q = state.quests[questId];
  if (!q) return 'notStarted';
  if (q.state === 'completed') return 'completed';
  return allObjectivesMet(state, questId) ? 'ready' : 'active';
}

export function checkCondition(state: CharacterState, c: Condition): boolean {
  switch (c.type) {
    case 'quest': {
      const st = getQuestState(state, c.questId);
      return Array.isArray(c.state) ? c.state.includes(st) : st === c.state;
    }
    case 'flag': {
      const v = state.flags[c.flag];
      const r = c.value === undefined ? !!v : v === c.value;
      return c.not ? !r : r;
    }
    case 'level':
      return (c.min === undefined || state.level >= c.min) && (c.max === undefined || state.level <= c.max);
    case 'class':
      return Array.isArray(c.classId) ? c.classId.includes(state.classId) : state.classId === c.classId;
    case 'job':
      return Array.isArray(c.jobId) ? c.jobId.includes(state.jobId) : state.jobId === c.jobId;
    case 'jobTier': {
      const job = JOBS[state.jobId];
      return (job?.tier ?? 1) === c.tier;
    }
    case 'item':
      return countItem(state, c.itemId) >= (c.qty ?? 1);
    case 'profession': {
      const p = state.professions[c.professionId];
      return !!p && (c.minLevel === undefined || p.level >= c.minLevel);
    }
    case 'reputation':
      return (state.reputation[c.faction] ?? 0) >= c.min;
    case 'questChoice': {
      const q = state.quests[c.questId];
      return q?.choiceId === c.choiceId;
    }
    default:
      return true;
  }
}

export function checkConditions(state: CharacterState, conds: Condition[] | undefined): boolean {
  return !conds || conds.every((c) => checkCondition(state, c));
}
