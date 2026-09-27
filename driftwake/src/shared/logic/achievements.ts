import type { AchievementCondition, AchievementDef, CharacterState } from '../types';
import type { GameEvent } from '../protocol';
import type { ServerContext } from './context';
import { ACHIEVEMENT_LIST } from '../data/achievements';
import { ITEMS, MONSTERS, MAPS, QUESTS } from '../data';
import { applyReward } from './rewards';

const ALL_MAP_IDS = Object.keys(MAPS);
const SIDE_QUEST_IDS = Object.keys(QUESTS).filter((id) => QUESTS[id].type === 'side');
const ALL_MONSTER_IDS = Object.keys(MONSTERS);

function maxStarsOwned(s: CharacterState): number {
  let best = 0;
  for (const inst of Object.values(s.equipment)) if (inst?.stars) best = Math.max(best, inst.stars);
  for (const tab of Object.values(s.inventory)) for (const slot of tab) if (slot?.stars) best = Math.max(best, slot.stars);
  return best;
}

function petsOwnedCount(s: CharacterState): number {
  const owned = new Set<string>();
  if (s.activePet) owned.add(s.activePet);
  for (const tab of Object.values(s.inventory)) {
    for (const slot of tab) {
      if (slot && ITEMS[slot.itemId]?.pet) owned.add(slot.itemId);
    }
  }
  return owned.size;
}

function sideQuestsCompletedCount(s: CharacterState): number {
  let n = 0;
  for (const qid of SIDE_QUEST_IDS) if (s.quests[qid]?.state === 'completed') n++;
  return n;
}

/** Evaluate one condition against the current (post-action) state. Cheap boolean checks only. */
function conditionMet(s: CharacterState, cond: AchievementCondition): boolean {
  switch (cond.type) {
    case 'kills': return s.counters.kills >= cond.count;
    case 'bossKill': return (s.bestiary[cond.monsterId] ?? 0) > 0;
    case 'level': return s.level >= cond.level;
    case 'exploreRegion': {
      const regionMaps = Object.values(MAPS).filter((m) => m.region === cond.region).map((m) => m.id);
      return regionMaps.length > 0 && regionMaps.every((id) => s.discoveredMaps.includes(id));
    }
    case 'exploreAll': return ALL_MAP_IDS.length > 0 && ALL_MAP_IDS.every((id) => s.discoveredMaps.includes(id));
    case 'professionLevel': return Object.values(s.professions).some((p) => p && p.level >= cond.level);
    case 'crafted': return s.counters.crafted >= cond.count;
    case 'gathered': return s.counters.gathered >= cond.count;
    case 'enhanceStars': return maxStarsOwned(s) >= cond.stars;
    case 'questCompleted': return s.quests[cond.questId]?.state === 'completed';
    case 'sideQuestCount': return sideQuestsCompletedCount(s) >= cond.count;
    case 'allSideQuests': return SIDE_QUEST_IDS.length > 0 && sideQuestsCompletedCount(s) >= SIDE_QUEST_IDS.length;
    case 'bestiaryCount': return Object.keys(s.bestiary).length >= cond.count;
    case 'allBestiary': return ALL_MONSTER_IDS.length > 0 && Object.keys(s.bestiary).length >= ALL_MONSTER_IDS.length;
    case 'goldEarned': return s.counters.goldEarned >= cond.amount;
    case 'petsOwned': return petsOwnedCount(s) >= cond.count;
    case 'flag': {
      const v = s.flags[cond.flag];
      if (cond.value === undefined) return v !== undefined && v !== false;
      return v === cond.value;
    }
    default: return false;
  }
}

/**
 * Checked after every successful reducer action. Cheap (≈36 integer/set comparisons); unlocks
 * grant their reward via the same applyReward path as quests and emit 'achievementUnlocked'.
 */
export function evaluateAchievements(s: CharacterState, events: GameEvent[], ctx: ServerContext): void {
  if (!s.achievements) s.achievements = {};
  for (const def of ACHIEVEMENT_LIST) {
    if (s.achievements[def.id]) continue;
    if (!conditionMet(s, def.condition)) continue;
    s.achievements[def.id] = ctx.now;
    events.push({ type: 'achievementUnlocked', id: def.id });
    if (def.reward) applyReward(s, events, def.reward, ctx);
  }
}

/** Progress toward an achievement's condition, for progress bars (e.g. "340 / 1000"). null when not measurable as a simple fraction. */
export function achievementProgress(s: CharacterState, def: AchievementDef): { current: number; target: number } | null {
  const cond = def.condition;
  switch (cond.type) {
    case 'kills': return { current: Math.min(s.counters.kills, cond.count), target: cond.count };
    case 'level': return { current: Math.min(s.level, cond.level), target: cond.level };
    case 'professionLevel': {
      const best = Math.max(0, ...Object.values(s.professions).map((p) => p?.level ?? 0));
      return { current: Math.min(best, cond.level), target: cond.level };
    }
    case 'crafted': return { current: Math.min(s.counters.crafted, cond.count), target: cond.count };
    case 'gathered': return { current: Math.min(s.counters.gathered, cond.count), target: cond.count };
    case 'enhanceStars': return { current: Math.min(maxStarsOwned(s), cond.stars), target: cond.stars };
    case 'sideQuestCount': return { current: Math.min(sideQuestsCompletedCount(s), cond.count), target: cond.count };
    case 'allSideQuests': return { current: sideQuestsCompletedCount(s), target: SIDE_QUEST_IDS.length || 1 };
    case 'bestiaryCount': return { current: Math.min(Object.keys(s.bestiary).length, cond.count), target: cond.count };
    case 'allBestiary': return { current: Object.keys(s.bestiary).length, target: ALL_MONSTER_IDS.length || 1 };
    case 'goldEarned': return { current: Math.min(s.counters.goldEarned, cond.amount), target: cond.amount };
    case 'petsOwned': return { current: Math.min(petsOwnedCount(s), cond.count), target: cond.count };
    case 'exploreRegion': {
      const regionMaps = Object.values(MAPS).filter((m) => m.region === cond.region).map((m) => m.id);
      const have = regionMaps.filter((id) => s.discoveredMaps.includes(id)).length;
      return { current: have, target: regionMaps.length || 1 };
    }
    case 'exploreAll': {
      const have = ALL_MAP_IDS.filter((id) => s.discoveredMaps.includes(id)).length;
      return { current: have, target: ALL_MAP_IDS.length || 1 };
    }
    default: return null;
  }
}
