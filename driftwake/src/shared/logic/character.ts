import type { CharacterState, CharacterSummary } from '../types';
import type { CreateCharacterRequest } from '../protocol';
import { SAVE_VERSION, START_MAP, STARTING_STATS, INVENTORY_SIZE, HOTBAR_SIZE } from '../constants';

/** Build a brand-new level 1 character. STUB (no starter items). */
export function createCharacter(req: CreateCharacterRequest, id: string, now: number): CharacterState {
  return {
    version: SAVE_VERSION, id, name: req.name, classId: req.classId, jobId: req.classId, level: 1, xp: 0, gold: 50,
    appearance: req.appearance, baseStats: { ...STARTING_STATS }, ap: 0, sp: 1, skills: {}, hp: 100, mp: 50,
    inventory: { equip: Array(INVENTORY_SIZE).fill(null), use: Array(INVENTORY_SIZE).fill(null), etc: Array(INVENTORY_SIZE).fill(null) },
    equipment: {}, hotbar: Array(HOTBAR_SIZE).fill(null), quests: {}, flags: {}, reputation: { harpooners: 0, tidekeepers: 0 },
    professions: { mining: { level: 1, xp: 0 }, foraging: { level: 1, xp: 0 } }, knownRecipes: [], buffs: [],
    mapId: START_MAP, position: { x: -1, y: -1 }, townMapId: START_MAP, discoveredMaps: [START_MAP], bestiary: {},
    titles: [], counters: { kills: 0, deaths: 0, playTimeMs: 0, crafted: 0, gathered: 0, bossKills: 0, goldEarned: 0 },
    createdAt: now, updatedAt: now,
  };
}

export function summarize(c: CharacterState): CharacterSummary {
  return { id: c.id, name: c.name, classId: c.classId, jobId: c.jobId, level: c.level, mapId: c.mapId, appearance: c.appearance, updatedAt: c.updatedAt };
}

/** Upgrade old saves to the current version. */
export function migrateCharacter(c: CharacterState): CharacterState {
  return c;
}
