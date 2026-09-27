import type { CharacterState, CharacterSummary, InventoryTab } from '../types';
import type { CreateCharacterRequest } from '../protocol';
import { SAVE_VERSION, START_MAP, STARTING_STATS, INVENTORY_SIZE, HOTBAR_SIZE } from '../constants';
import { JOBS, ITEMS, SKILLS } from '../data';
import { makeUid } from '../rng';
import { computeStats } from './stats';
import { addItem } from './items';

/** Build a brand-new level 1 character: starter equipment (worn immediately), starter potions,
 * a first attack skill auto-learned (consuming the level-1 SP), full HP/MP. */
export function createCharacter(req: CreateCharacterRequest, id: string, now: number): CharacterState {
  const job = JOBS[req.classId];

  const c: CharacterState = {
    version: SAVE_VERSION, id, name: req.name, classId: req.classId, jobId: req.classId, level: 1, xp: 0, gold: 50,
    appearance: req.appearance, baseStats: { ...STARTING_STATS }, ap: 0, sp: 1, skills: {}, hp: 1, mp: 1,
    inventory: {
      equip: Array(INVENTORY_SIZE).fill(null),
      use: Array(INVENTORY_SIZE).fill(null),
      etc: Array(INVENTORY_SIZE).fill(null),
    },
    equipment: {}, hotbar: Array(HOTBAR_SIZE).fill(null), quests: {}, flags: {}, reputation: { harpooners: 0, tidekeepers: 0 },
    professions: { mining: { level: 1, xp: 0 }, foraging: { level: 1, xp: 0 } }, knownRecipes: [], buffs: [],
    mapId: START_MAP, position: { x: -1, y: -1 }, townMapId: START_MAP, discoveredMaps: [START_MAP], bestiary: {},
    titles: [], counters: { kills: 0, deaths: 0, playTimeMs: 0, crafted: 0, gathered: 0, bossKills: 0, goldEarned: 0 },
    createdAt: now, updatedAt: now,
  };

  // Starter gear, equipped immediately.
  for (const itemId of job?.starterItems ?? []) {
    const def = ITEMS[itemId];
    if (!def?.equip) continue;
    c.equipment[def.equip.slot] = { uid: makeUid('i'), itemId, qty: 1, stars: 0 };
  }

  // Starter consumables.
  const uidFn = () => makeUid('i');
  if (ITEMS['use_hp_potion_s']) {
    addItem(c, 'use_hp_potion_s', 5, uidFn);
    c.hotbar[8] = { kind: 'item', id: 'use_hp_potion_s' };
  }
  if (ITEMS['use_mp_potion_s']) {
    addItem(c, 'use_mp_potion_s', 3, uidFn);
    c.hotbar[9] = { kind: 'item', id: 'use_mp_potion_s' };
  }

  // Auto-learn the first available active attack skill with the level-1 SP.
  if (job) {
    const firstSkillId = job.skills.find((sid) => {
      const sd = SKILLS[sid];
      return sd && sd.type === 'active' && sd.reqLevel <= 1 && !sd.prereq;
    });
    if (firstSkillId) {
      c.skills[firstSkillId] = 1;
      c.sp = 0;
      c.hotbar[0] = { kind: 'skill', id: firstSkillId };
    }
  }

  const stats = computeStats(c, now);
  c.hp = stats.maxHp;
  c.mp = stats.maxMp;
  return c;
}

export function summarize(c: CharacterState): CharacterSummary {
  return { id: c.id, name: c.name, classId: c.classId, jobId: c.jobId, level: c.level, mapId: c.mapId, appearance: c.appearance, updatedAt: c.updatedAt };
}

/** Upgrade old / partial saves to the current shape. Tolerant of any missing field. */
export function migrateCharacter(c: any): CharacterState {
  c.version = c.version ?? SAVE_VERSION;
  c.name = c.name ?? 'Adventurer';
  c.classId = c.classId ?? 'vanguard';
  c.jobId = c.jobId ?? c.classId;
  c.level = c.level ?? 1;
  c.xp = c.xp ?? 0;
  c.gold = c.gold ?? 0;
  c.appearance = c.appearance ?? { skin: '#e8c39e', hair: '#4a3728', hairStyle: 0, eyes: '#3a2a1a', outfit: '#888888' };
  c.baseStats = { ...STARTING_STATS, ...(c.baseStats ?? {}) };
  c.ap = c.ap ?? 0;
  c.sp = c.sp ?? 0;
  c.skills = c.skills ?? {};
  c.hp = c.hp ?? 1;
  c.mp = c.mp ?? 0;
  c.inventory = c.inventory ?? {};
  for (const tab of ['equip', 'use', 'etc'] as InventoryTab[]) {
    if (!Array.isArray(c.inventory[tab])) c.inventory[tab] = Array(INVENTORY_SIZE).fill(null);
  }
  c.equipment = c.equipment ?? {};
  c.hotbar = Array.isArray(c.hotbar) && c.hotbar.length === HOTBAR_SIZE ? c.hotbar : Array(HOTBAR_SIZE).fill(null);
  c.quests = c.quests ?? {};
  c.flags = c.flags ?? {};
  c.reputation = { harpooners: 0, tidekeepers: 0, ...(c.reputation ?? {}) };
  c.professions = c.professions ?? {};
  c.knownRecipes = c.knownRecipes ?? [];
  c.buffs = c.buffs ?? [];
  c.mapId = c.mapId ?? START_MAP;
  c.position = c.position ?? { x: -1, y: -1 };
  c.townMapId = c.townMapId ?? c.mapId ?? START_MAP;
  c.discoveredMaps = c.discoveredMaps ?? [c.mapId ?? START_MAP];
  c.bestiary = c.bestiary ?? {};
  c.titles = c.titles ?? [];
  c.counters = { kills: 0, deaths: 0, playTimeMs: 0, crafted: 0, gathered: 0, bossKills: 0, goldEarned: 0, ...(c.counters ?? {}) };
  c.createdAt = c.createdAt ?? Date.now();
  c.updatedAt = c.updatedAt ?? Date.now();
  return c as CharacterState;
}
