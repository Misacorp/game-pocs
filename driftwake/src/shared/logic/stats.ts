import type { CharacterState, DerivedStats, Scalar, StatMods } from '../types';

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
 * Compute all derived stats for a character: base stats + level + job + equipment
 * (+bonus lines, +stars) + sets + passives + active buffs.
 * STUB — replaced by the logic implementation.
 */
export function computeStats(state: CharacterState, _now: number = Date.now()): DerivedStats {
  const s = emptyStats();
  s.str = state.baseStats.str; s.dex = state.baseStats.dex; s.int = state.baseStats.int; s.luk = state.baseStats.luk;
  s.maxHp = 50 + state.level * 12; s.maxMp = 30 + state.level * 8;
  s.attack = 10; s.magicAttack = 10; s.critRate = 0.05; s.hpRegen = 5; s.mpRegen = 3;
  return s;
}
