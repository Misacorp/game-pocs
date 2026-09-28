import type { DerivedStatKey } from '@shared/types';

export const STAT_LABELS: Record<DerivedStatKey, string> = {
  maxHp: 'Max HP', maxMp: 'Max MP', str: 'STR', dex: 'DEX', int: 'INT', luk: 'LUK',
  attack: 'Attack', magicAttack: 'Magic Attack', defense: 'Defense',
  critRate: 'Crit Rate', critDamage: 'Crit Damage',
  speed: 'Speed', jump: 'Jump',
  hpRegen: 'HP Regen', mpRegen: 'MP Regen',
  xpBonus: 'XP Bonus', goldBonus: 'Gold Bonus', dropBonus: 'Drop Rate',
  damagePct: 'Damage', bossDamagePct: 'Boss Damage', cooldownReduction: 'Cooldown Reduction',
  hpPct: 'Max HP', mpPct: 'Max MP', avoid: 'Avoidability',
};

const PCT_KEYS = new Set<DerivedStatKey>([
  'critRate', 'critDamage', 'xpBonus', 'goldBonus', 'dropBonus', 'damagePct', 'bossDamagePct',
  'cooldownReduction', 'hpPct', 'mpPct', 'avoid',
]);
const PLUS100_KEYS = new Set<DerivedStatKey>(['speed', 'jump']);
const PER5S_KEYS = new Set<DerivedStatKey>(['hpRegen', 'mpRegen']);

/** Formats a stat value for display, e.g. "12%", "+8", "110%", "5 / 5s". */
export function formatStatValue(key: DerivedStatKey, value: number, signed = false): string {
  const sign = signed && value > 0 ? '+' : '';
  if (PCT_KEYS.has(key)) return `${sign}${Math.round(value * 100)}%`;
  if (PLUS100_KEYS.has(key)) return `${sign}${Math.round(value)}%`;
  if (PER5S_KEYS.has(key)) return `${sign}${Math.round(value)} / 5s`;
  return `${sign}${Math.round(value)}`;
}

export function statLabel(key: DerivedStatKey): string { return STAT_LABELS[key] ?? key; }
