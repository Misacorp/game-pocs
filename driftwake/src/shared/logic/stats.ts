import type { CharacterState, DerivedStats, DerivedStatKey, Scalar, StatMods } from '../types';
import { JOBS, SKILLS, SETS, ITEMS } from '../data';
import { BASE_CRIT_RATE, JOB_ADVANCE_LEVEL } from '../constants';
import { getItemStats } from './items';

/** Evaluate a level-scaled number. */
export function scalar(v: Scalar | undefined, level: number): number {
  if (v === undefined) return 0;
  if (typeof v === 'number') return v;
  return v.base + v.perLevel * Math.max(0, level - 1);
}

export function emptyStats(): DerivedStats {
  return {
    maxHp: 0, maxMp: 0, str: 0, dex: 0, int: 0, luk: 0, attack: 0, magicAttack: 0, defense: 0,
    critRate: 0, critDamage: 0, speed: 0, jump: 0, hpRegen: 0, mpRegen: 0, xpBonus: 0, goldBonus: 0,
    dropBonus: 0, damagePct: 0, bossDamagePct: 0, cooldownReduction: 0, hpPct: 0, mpPct: 0, avoid: 0,
  };
}

export function addMods(target: DerivedStats, mods: StatMods | undefined, mult = 1): DerivedStats {
  if (!mods) return target;
  for (const k in mods) {
    const key = k as keyof DerivedStats;
    target[key] += (mods[key] ?? 0) * mult;
  }
  return target;
}

/**
 * Sum of hpPerLevel/mpPerLevel gained from level 2..level.
 * Levels up to JOB_ADVANCE_LEVEL use the tier-1 class growth; levels after use the
 * (possibly tier-2) current job's growth, so an advanced job's HP/MP curve only kicks
 * in for the levels actually gained past that job.
 */
function levelGrowth(tier1PerLevel: number, currentPerLevel: number, level: number): number {
  let sum = 0;
  for (let l = 2; l <= level; l++) sum += l <= JOB_ADVANCE_LEVEL ? tier1PerLevel : currentPerLevel;
  return sum;
}

/**
 * Compute all derived stats for a character:
 *  base stats + level HP/MP growth + equipment (incl. bonus lines & enhancement stars)
 *  + set bonuses + passive skills + active (non-expired) buffs, then hpPct/mpPct multipliers
 *  and caps/minimums.
 */
export function computeStats(state: CharacterState, now: number = Date.now()): DerivedStats {
  const s = emptyStats();
  const job = JOBS[state.jobId];
  const tier1 = JOBS[state.classId];

  // 1) allocated base stats
  s.str = state.baseStats.str ?? 0;
  s.dex = state.baseStats.dex ?? 0;
  s.int = state.baseStats.int ?? 0;
  s.luk = state.baseStats.luk ?? 0;

  // 2) accumulate every flat/bonus source on top of base stats (equipment, sets, passives, buffs)
  for (const inst of Object.values(state.equipment)) {
    if (inst) addMods(s, getItemStats(inst));
  }

  const equippedIds = Object.values(state.equipment).filter((i): i is NonNullable<typeof i> => !!i).map((i) => i.itemId);
  for (const set of Object.values(SETS)) {
    const count = set.pieces.filter((p) => equippedIds.includes(p)).length;
    if (count <= 0) continue;
    for (const bonus of set.bonuses) if (count >= bonus.count) addMods(s, bonus.stats);
  }

  for (const [skillId, level] of Object.entries(state.skills)) {
    if (level <= 0) continue;
    const def = SKILLS[skillId];
    if (!def || def.type !== 'passive' || !def.passive) continue;
    for (const k in def.passive.stats) {
      const key = k as DerivedStatKey;
      s[key] += scalar(def.passive.stats[key], level);
    }
  }

  for (const buff of state.buffs) {
    if (buff.expiresAt > now) addMods(s, buff.stats);
  }

  if (state.activePet) {
    const petDef = ITEMS[state.activePet];
    if (petDef?.pet?.stats) addMods(s, petDef.pet.stats);
  }

  // 3) HP/MP: base + per-level growth (str/int contribute using their FINAL value, i.e. after
  // equipment/passive/buff bonuses to str/int above) added on top of any flat maxHp/maxMp bonuses
  // already summed in step 2.
  const hpPerLevel = tier1?.hpPerLevel ?? 10;
  const mpPerLevel = tier1?.mpPerLevel ?? 6;
  const curHpPerLevel = job?.hpPerLevel ?? hpPerLevel;
  const curMpPerLevel = job?.mpPerLevel ?? mpPerLevel;
  const hpGrowth = levelGrowth(hpPerLevel, curHpPerLevel, state.level);
  const mpGrowth = levelGrowth(mpPerLevel, curMpPerLevel, state.level);

  s.maxHp += 50 + hpGrowth + s.str * 2;
  s.maxMp += 20 + mpGrowth + s.int * 1.5;

  // 4) crit / avoid from LUK / DEX
  s.critRate += BASE_CRIT_RATE + s.luk * 0.001;
  s.avoid += s.dex * 0.002;

  // 5) hpPct/mpPct multipliers apply to the whole flat total
  s.maxHp *= 1 + s.hpPct;
  s.maxMp *= 1 + s.mpPct;

  // 6) regen: base out-of-combat tick (points per 5s) scales with max pool, plus any equipment bonus
  s.hpRegen += Math.max(1, Math.round(s.maxHp * 0.02));
  s.mpRegen += Math.max(1, Math.round(s.maxMp * 0.03));

  // 7) caps
  s.avoid = Math.min(0.5, Math.max(0, s.avoid));
  s.critRate = Math.min(1, Math.max(0, s.critRate));
  s.cooldownReduction = Math.min(0.4, Math.max(0, s.cooldownReduction));

  // 8) sane minimums (never let negative bonus lines break the game)
  s.maxHp = Math.max(1, Math.round(s.maxHp));
  s.maxMp = Math.max(0, Math.round(s.maxMp));
  s.attack = Math.max(0, Math.round(s.attack));
  s.magicAttack = Math.max(0, Math.round(s.magicAttack));
  s.defense = Math.max(0, Math.round(s.defense));
  s.hpRegen = Math.max(0, Math.round(s.hpRegen));
  s.mpRegen = Math.max(0, Math.round(s.mpRegen));
  s.str = Math.max(0, Math.round(s.str));
  s.dex = Math.max(0, Math.round(s.dex));
  s.int = Math.max(0, Math.round(s.int));
  s.luk = Math.max(0, Math.round(s.luk));

  return s;
}
