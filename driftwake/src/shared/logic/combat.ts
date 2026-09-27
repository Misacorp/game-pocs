import type { DerivedStats, JobDef, MonsterDef } from '../types';
import type { Rng } from '../rng';

export interface DamageTarget { level: number; defense: number; isBoss?: boolean; /** extra dmg taken fraction (mark/weaken) */ vulnerability?: number }
export interface DamageRoll { damage: number; crit: boolean }

/**
 * Player -> monster damage for one hit.
 * STUB — replaced by the logic implementation.
 */
export function rollPlayerDamage(
  stats: DerivedStats, _job: JobDef, damagePct: number, target: DamageTarget, _playerLevel: number, rng: Rng,
): DamageRoll {
  const crit = rng() < stats.critRate;
  const base = Math.max(1, (stats.attack + stats.str) * (damagePct / 100) - target.defense * 0.5);
  return { damage: Math.round(base * (crit ? 1.5 : 1) * (0.8 + rng() * 0.2)), crit };
}

/** Monster -> player damage (contact or attack with multiplier). */
export function rollMonsterDamage(monster: MonsterDef, mult: number, stats: DerivedStats, _playerLevel: number, rng: Rng): number {
  return Math.max(1, Math.round(monster.attack * mult * (0.85 + rng() * 0.3) - stats.defense * 0.3));
}

/** Displayable damage range "min - max" for the stats window. */
export function damageRange(stats: DerivedStats, _job: JobDef): [number, number] {
  const max = Math.round(stats.attack + stats.str);
  return [Math.round(max * 0.8), max];
}
