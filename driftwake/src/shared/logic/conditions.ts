import type { CharacterState, Condition, QuestStateName } from '../types';

export function getQuestState(state: CharacterState, questId: string): QuestStateName {
  const q = state.quests[questId];
  if (!q) return 'notStarted';
  if (q.state === 'completed') return 'completed';
  return 'active'; // STUB: 'ready' detection lives in quests.ts implementation
}

/** STUB — replaced by the logic implementation. */
export function checkCondition(state: CharacterState, c: Condition): boolean {
  switch (c.type) {
    case 'level': return (c.min === undefined || state.level >= c.min) && (c.max === undefined || state.level <= c.max);
    case 'flag': { const v = state.flags[c.flag]; const r = c.value === undefined ? !!v : v === c.value; return c.not ? !r : r; }
    default: return true;
  }
}

export function checkConditions(state: CharacterState, conds: Condition[] | undefined): boolean {
  return !conds || conds.every((c) => checkCondition(state, c));
}
