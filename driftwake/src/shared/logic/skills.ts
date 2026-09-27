import type { CharacterState } from '../types';

/** Can the character put a point into this skill now? STUB. */
export function skillLearnCheck(_state: CharacterState, _skillId: string): { ok: boolean; reason?: string } {
  return { ok: false, reason: 'Not implemented' };
}

/** Skill ids available to the character's current job line (tier1 + tier2 if advanced). STUB. */
export function availableSkillIds(_state: CharacterState): string[] { return []; }
