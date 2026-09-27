/**
 * XP application + reward granting, shared by the reducer (quests, kills, dialogue) and the
 * achievements evaluator. Split out of reducer.ts so achievements.ts can grant rewards without
 * importing the reducer (which would create a circular dependency, since the reducer calls
 * evaluateAchievements after every action).
 */
import type { CharacterState, FactionId, Reward } from '../types';
import type { GameEvent } from '../protocol';
import type { ServerContext } from './context';
import { XP_CURVE, xpToNext, LEVEL_CAP, AP_PER_LEVEL, SP_PER_LEVEL } from '../constants';
import { computeStats } from './stats';
import { addItem } from './items';

/** Grant xp, handling multi-level-ups (AP/SP per level) and HP/MP refill on level. */
export function applyXp(s: CharacterState, events: GameEvent[], amount: number, now: number) {
  if (amount === 0) return;
  s.xp += amount;
  events.push({ type: 'xp', amount });
  let leveled = false;
  while (s.level < LEVEL_CAP && s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    s.ap += AP_PER_LEVEL;
    s.sp += SP_PER_LEVEL;
    leveled = true;
    events.push({ type: 'levelUp', level: s.level, ap: s.ap, sp: s.sp });
  }
  if (s.level >= LEVEL_CAP) s.xp = 0;
  if (leveled) {
    const stats = computeStats(s, now);
    s.hp = stats.maxHp;
    s.mp = stats.maxMp;
    events.push({ type: 'statsChanged' });
  }
}

export function applyReward(s: CharacterState, events: GameEvent[], reward: Reward, ctx: ServerContext) {
  if (reward.xp) {
    const stats = computeStats(s, ctx.now);
    applyXp(s, events, Math.round(reward.xp * XP_CURVE.globalRate * (1 + stats.xpBonus)), ctx.now);
  }
  if (reward.gold) {
    s.gold += reward.gold;
    if (reward.gold > 0) s.counters.goldEarned += reward.gold;
    events.push({ type: 'gold', amount: reward.gold });
  }
  if (reward.items) {
    for (const it of reward.items) {
      const qty = it.qty ?? 1;
      const r = addItem(s, it.itemId, qty, ctx.uid);
      if (r.ok) events.push({ type: 'itemAdded', itemId: it.itemId, qty });
    }
  }
  if (reward.flags) {
    for (const [k, v] of Object.entries(reward.flags)) { s.flags[k] = v; events.push({ type: 'flagSet', flag: k, value: v }); }
  }
  if (reward.reputation) {
    for (const [f, amt] of Object.entries(reward.reputation)) {
      const faction = f as FactionId;
      const amount = amt ?? 0;
      s.reputation[faction] = (s.reputation[faction] ?? 0) + amount;
      events.push({ type: 'reputation', faction, amount, total: s.reputation[faction] });
    }
  }
  if (reward.recipes) {
    for (const rid of reward.recipes) if (!s.knownRecipes.includes(rid)) { s.knownRecipes.push(rid); events.push({ type: 'recipeLearned', recipeId: rid }); }
  }
  if (reward.ap) { s.ap += reward.ap; events.push({ type: 'statsChanged' }); }
  if (reward.sp) s.sp += reward.sp;
  if (reward.title && !s.titles.includes(reward.title)) { s.titles.push(reward.title); events.push({ type: 'titleUnlocked', title: reward.title }); }
}
