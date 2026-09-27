import type { DerivedStats, JobDef, MonsterDef } from '../types';
import type { Rng } from '../rng';
import { BASE_CRIT_MULT, DAMAGE_VARIANCE, suggestedMonsterHp } from '../constants';

export interface DamageTarget { level: number; defense: number; isBoss?: boolean; /** extra dmg taken fraction (mark/weaken) */ vulnerability?: number }
export interface DamageRoll { damage: number; crit: boolean }

/**
 * Damage formulas (Maplestory-like "max damage" model):
 *
 *  maxDamage (physical) = PHYS_BASE + (mainStat * 4 + secondaryStat) * attack / 100
 *  maxDamage (magic)    = MAGIC_BASE + (INT * 4 + LUK) * magicAttack / 100
 *
 * The flat BASE term keeps level-1 characters (mainStat/secondary ~4, weapon attack ~10-12)
 * from hitting for near-zero damage — it's a small fraction of total damage at high level.
 *
 * A hit then rolls in [1 - DAMAGE_VARIANCE, 1] of maxDamage, may crit (BASE_CRIT_MULT + critDamage
 * instead of 1x), is reduced by target defense using a percentage formula (100 / (100 + defense))
 * so defense can never fully zero out a hit, penalized 4%/level when the target is higher level
 * (floor 0.5x), then scaled by damagePct / bossDamagePct and target vulnerability.
 *
 * Tuning (see final report for the full table): with typical stat allocation this produces
 * ~2-3 basic hits to kill a same-level level-1 monster (~34 hp) and ~3-5 hits at any level
 * 1-40 as long as content authors follow the suggested weapon `attack`/`magicAttack` curve.
 */
const PHYS_BASE_DAMAGE = 10;
const MAGIC_BASE_DAMAGE = 10;
const STAT_MULT_MAIN = 4;
const ATTACK_DIVISOR = 100;
const LEVEL_DIFF_PENALTY_PER_LEVEL = 0.04;
const LEVEL_DIFF_FLOOR = 0.5;

function maxDamageFor(stats: DerivedStats, job: JobDef): number {
  const mainStat = stats[job.mainStat];
  const secondaryStat = stats[job.secondaryStat];
  if (job.damageType === 'magic') {
    return MAGIC_BASE_DAMAGE + (mainStat * STAT_MULT_MAIN + secondaryStat) * stats.magicAttack / ATTACK_DIVISOR;
  }
  return PHYS_BASE_DAMAGE + (mainStat * STAT_MULT_MAIN + secondaryStat) * stats.attack / ATTACK_DIVISOR;
}

/** Percentage-based defense mitigation: never reaches 0, softly diminishing returns. */
function defenseMult(defense: number): number {
  return 100 / (100 + Math.max(0, defense));
}

function levelDiffMult(targetLevel: number, playerLevel: number): number {
  const diff = targetLevel - playerLevel;
  if (diff <= 0) return 1;
  return Math.max(LEVEL_DIFF_FLOOR, 1 - diff * LEVEL_DIFF_PENALTY_PER_LEVEL);
}

/**
 * Player -> monster damage for one hit. damagePct is the skill/basic-attack's damage percent
 * (100 = 1x maxDamage); crit multiplies by (BASE_CRIT_MULT + stats.critDamage).
 */
export function rollPlayerDamage(
  stats: DerivedStats, job: JobDef, damagePct: number, target: DamageTarget, playerLevel: number, rng: Rng,
): DamageRoll {
  const max = Math.max(1, maxDamageFor(stats, job) * (damagePct / 100));
  const varianceFactor = (1 - DAMAGE_VARIANCE) + rng() * DAMAGE_VARIANCE;
  let dmg = max * varianceFactor;
  const crit = rng() < stats.critRate;
  if (crit) dmg *= BASE_CRIT_MULT + stats.critDamage;
  dmg *= defenseMult(target.defense);
  dmg *= levelDiffMult(target.level, playerLevel);
  dmg *= 1 + stats.damagePct;
  if (target.isBoss) dmg *= 1 + stats.bossDamagePct;
  if (target.vulnerability) dmg *= 1 + target.vulnerability;
  return { damage: Math.max(1, Math.round(dmg)), crit };
}

/**
 * Monster -> player contact/attack damage. `mult` is the attack's damageMult (1 for plain contact).
 * Uses the same percentage defense mitigation. Content authors: aim monster.attack so a same-level
 * hit costs a Vanguard ~6-10% of maxHp and a Stormcaller ~12-15% (see suggestedMonsterAttack()).
 */
export function rollMonsterDamage(monster: MonsterDef, mult: number, stats: DerivedStats, _playerLevel: number, rng: Rng): number {
  const variance = 0.85 + rng() * 0.3; // [0.85, 1.15]
  const raw = monster.attack * mult * variance;
  return Math.max(1, Math.round(raw * defenseMult(stats.defense)));
}

/** Displayable damage range "min - max" for the stats window (unmitigated, at 100% damagePct). */
export function damageRange(stats: DerivedStats, job: JobDef): [number, number] {
  const max = maxDamageFor(stats, job) * (1 + stats.damagePct);
  const min = max * (1 - DAMAGE_VARIANCE);
  return [Math.round(Math.max(0, min)), Math.round(Math.max(0, max))];
}

/**
 * Guideline for monster contact `attack` by level, for monster authors: ~7% of the suggested
 * monster hp of that level (rough proxy for player maxHp, which is balanced similarly).
 * Not used by the engine itself — purely a content-authoring aid.
 */
export function suggestedMonsterAttack(level: number): number {
  return Math.max(1, Math.round(suggestedMonsterHp(level) * 0.07));
}
