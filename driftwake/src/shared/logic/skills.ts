import type { CharacterState } from '../types';
import { JOBS, SKILLS } from '../data';

/** Skill ids available to the character's current job line (tier1 class + tier2 job if advanced). */
export function availableSkillIds(state: CharacterState): string[] {
  const tier1 = JOBS[state.classId];
  const job = JOBS[state.jobId];
  const ids = new Set<string>();
  for (const id of tier1?.skills ?? []) ids.add(id);
  if (job && job.tier === 2) for (const id of job.skills ?? []) ids.add(id);
  return [...ids];
}

/** Can the character put a point into this skill now? */
export function skillLearnCheck(state: CharacterState, skillId: string): { ok: boolean; reason?: string } {
  const def = SKILLS[skillId];
  if (!def) return { ok: false, reason: 'Unknown skill' };
  if (!availableSkillIds(state).includes(skillId)) return { ok: false, reason: 'Not part of your job' };
  if (state.sp <= 0) return { ok: false, reason: 'No skill points available' };
  if (state.level < def.reqLevel) return { ok: false, reason: `Requires level ${def.reqLevel}` };
  const cur = state.skills[skillId] ?? 0;
  if (cur >= def.maxLevel) return { ok: false, reason: 'Already at max level' };
  if (def.prereq) {
    const preLvl = state.skills[def.prereq.skillId] ?? 0;
    if (preLvl < def.prereq.level) return { ok: false, reason: 'Prerequisite skill not learned' };
  }
  return { ok: true };
}
