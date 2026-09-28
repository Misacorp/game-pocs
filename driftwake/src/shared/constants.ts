/**
 * Tunable game constants. Balance knobs live here.
 */
import type { Rarity, StatKey } from './types';

export const GAME_TITLE = 'Driftwake';
export const SAVE_VERSION = 1;

// ---- Progression ----------------------------------------------------------

export const LEVEL_CAP = 40;

/**
 * XP needed to go from `level` to `level + 1`:
 *   round(XP_CURVE.base * level ^ XP_CURVE.exponent + XP_CURVE.linear * level)
 * Tune XP_CURVE.globalRate to speed up / slow down ALL xp gains (monsters and quests).
 */
export const XP_CURVE = {
  base: 24,
  exponent: 2.0,
  linear: 20,
  globalRate: 1.0,
};

export function xpToNext(level: number): number {
  if (level >= LEVEL_CAP) return Infinity;
  return Math.round(XP_CURVE.base * Math.pow(level, XP_CURVE.exponent) + XP_CURVE.linear * level);
}

/**
 * Guideline for monster xp by level (content authors should stay near this).
 * Same-level kill ~ 1/20th - 1/40th of a level early, ~1/45 at 30.
 */
export function suggestedMonsterXp(level: number): number {
  return Math.round(6 + 3.2 * Math.pow(level, 1.45));
}

/** Guideline for monster hp by level (normal mobs). Bosses ~ 25-40x. */
export function suggestedMonsterHp(level: number): number {
  return Math.round(20 + 14 * Math.pow(level, 1.55));
}

/** XP scaling by level difference (monster level - player level). */
export function levelDiffXpMult(diff: number): number {
  if (diff >= 0) return Math.min(1.25, 1 + diff * 0.05);
  // -1 .. -5 : small penalty, beyond: strong
  if (diff >= -5) return 1 + diff * 0.04; // 0.8 at -5
  return Math.max(0.1, 0.8 + (diff + 5) * 0.1);
}

export const AP_PER_LEVEL = 5;
export const SP_PER_LEVEL = 3;
/** Bonus SP granted at job advancement */
export const SP_ON_ADVANCE = 3;
export const JOB_ADVANCE_LEVEL = 15;

export const STARTING_STATS: Record<StatKey, number> = { str: 4, dex: 4, int: 4, luk: 4 };

// ---- Combat ---------------------------------------------------------------

export const BASE_CRIT_RATE = 0.05;
export const BASE_CRIT_MULT = 1.5;
/** Damage variance: damage rolls in [1 - v, 1] of max */
export const DAMAGE_VARIANCE = 0.2;
export const PLAYER_BASE_SPEED = 110; // px/s
export const PLAYER_JUMP_VELOCITY = 330;
export const GRAVITY = 900;
export const PLAYER_INVULN_MS = 900; // after taking contact damage
export const COMBAT_REGEN_DELAY_MS = 5000;

/** Death penalty: fraction of current-level xp lost (never de-levels) */
export const DEATH_XP_PENALTY = 0.05;

// ---- Inventory ------------------------------------------------------------

export const INVENTORY_SIZE = 36;
export const HOTBAR_SIZE = 14; // 8 skill keys + 6 number keys

// ---- Items ----------------------------------------------------------------

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#e8e8e8',
  uncommon: '#6fdc6f',
  rare: '#5aa9ff',
  epic: '#c77dff',
  legendary: '#ffb238',
};
/** Extra random bonus lines by rarity */
export const RARITY_BONUS_LINES: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
export const RARITY_MAX_STARS: Record<Rarity, number> = { common: 5, uncommon: 7, rare: 10, epic: 12, legendary: 15 };
/** Chance an equipment drop is upgraded one rarity tier (rolled repeatedly) */
export const RARITY_UPGRADE_CHANCE = 0.18;

/** Enhancement: success chance by current stars (index = current stars) */
export const ENHANCE_SUCCESS = [0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1];
/** Each star adds this fraction of the item's base main stats (attack/magicAttack/defense), min +1 */
export const ENHANCE_STAT_PER_STAR = 0.08;
/** Failing at >= this many stars drops one star (never destroys) */
export const ENHANCE_DOWNGRADE_FROM = 6;

// ---- Professions ----------------------------------------------------------

export const MAX_CRAFTING_PROFESSIONS = 2;
/** Character level required to learn a crafting profession. */
export const PROFESSION_UNLOCK_LEVEL = 10;
export const PROFESSION_MAX_LEVEL = 10;
export function professionXpToNext(level: number): number {
  return Math.round(40 + 35 * Math.pow(level, 1.6));
}

// ---- World ----------------------------------------------------------------

export const START_MAP = 'driftmoor_town';
export const DROP_LIFETIME_MS = 90_000;
export const DEFAULT_RESPAWN_MS = 7000;
