import type {
  CharacterState, ItemInstance, ItemDef, Rarity, DerivedStats, ClassId, FactionId, EquipSlot,
  CraftingProfessionId, ProfessionId, InventoryTab, QuestDef, QuestChoice, Reward, DialogueAction, Objective,
} from '../types';
import type { ClientAction, GameEvent, LootDrop } from '../protocol';
import type { ServerContext } from './context';
import { ITEMS, MONSTERS, MAPS, NPCS, QUESTS, DIALOGUES, RECIPES, PROFESSIONS } from '../data';
import {
  XP_CURVE, xpToNext, levelDiffXpMult, LEVEL_CAP, AP_PER_LEVEL, SP_PER_LEVEL, SP_ON_ADVANCE, JOB_ADVANCE_LEVEL,
  STARTING_STATS, DEATH_XP_PENALTY, PROFESSION_MAX_LEVEL, professionXpToNext, MAX_CRAFTING_PROFESSIONS,
  RARITY_ORDER, RARITY_BONUS_LINES, RARITY_UPGRADE_CHANCE, ENHANCE_DOWNGRADE_FROM, DROP_LIFETIME_MS, START_MAP,
} from '../constants';
import { chance, randInt, pick, type Rng } from '../rng';
import { computeStats } from './stats';
import { checkConditions, getQuestState } from './conditions';
import {
  addItem, removeItem, findInstance, canEquip, countItem, enhanceChance, maxStarsFor, rarityOf, placeInInventory,
} from './items';
import { skillLearnCheck } from './skills';

export interface ReducerResult { ok: boolean; error?: string; state: CharacterState; events: GameEvent[] }

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

function objectiveTarget(obj: Objective): number {
  switch (obj.type) {
    case 'kill': case 'collect': case 'craft': case 'gather': return obj.count;
    case 'level': return obj.level;
    case 'enhance': return obj.stars;
    default: return 1;
  }
}

/** Bump progress on every active quest's matching objectives; emits questProgress/questReady. */
function forEachActiveQuestObjective(
  s: CharacterState, events: GameEvent[],
  match: (obj: Objective) => boolean,
  updater: (obj: Objective, current: number) => number,
) {
  for (const qid of Object.keys(s.quests)) {
    const qp = s.quests[qid];
    if (qp.state !== 'active') continue;
    const def = QUESTS[qid];
    if (!def) continue;
    let changed = false;
    def.objectives.forEach((obj, i) => {
      if (!match(obj)) return;
      const before = qp.progress[i] ?? 0;
      const after = updater(obj, before);
      if (after !== before) {
        qp.progress[i] = after;
        changed = true;
        events.push({ type: 'questProgress', questId: qid, objective: i, value: after, target: objectiveTarget(obj) });
      }
    });
    if (changed && getQuestState(s, qid) === 'ready') events.push({ type: 'questReady', questId: qid });
  }
}

function questNeedsCollectItem(s: CharacterState, itemId: string): boolean {
  for (const [qid, qp] of Object.entries(s.quests)) {
    if (qp.state !== 'active') continue;
    const def = QUESTS[qid];
    if (!def) continue;
    for (const obj of def.objectives) {
      if (obj.type === 'collect' && obj.itemId === itemId && countItem(s, itemId) < obj.count) return true;
    }
  }
  return false;
}

/** Grant xp, handling multi-level-ups (AP/SP per level) and HP/MP refill on level. */
function applyXp(s: CharacterState, events: GameEvent[], amount: number, now: number) {
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

function grantProfessionXp(s: CharacterState, events: GameEvent[], professionId: ProfessionId, amount: number) {
  if (amount <= 0) return;
  const prof = s.professions[professionId] ?? (s.professions[professionId] = { level: 1, xp: 0 });
  prof.xp += amount;
  events.push({ type: 'professionXp', professionId, amount });
  while (prof.level < PROFESSION_MAX_LEVEL && prof.xp >= professionXpToNext(prof.level)) {
    prof.xp -= professionXpToNext(prof.level);
    prof.level++;
    events.push({ type: 'professionLevelUp', professionId, level: prof.level });
    for (const r of Object.values(RECIPES)) {
      if ((r.profession as string) === professionId && r.learn === 'auto' && r.level <= prof.level && !s.knownRecipes.includes(r.id)) {
        s.knownRecipes.push(r.id);
        events.push({ type: 'recipeLearned', recipeId: r.id });
      }
    }
  }
}

function tryLearnProfession(s: CharacterState, professionId: CraftingProfessionId): { ok: boolean; error?: string } {
  if (s.professions[professionId]) return { ok: false, error: 'Already learned' };
  const craftingCount = Object.keys(s.professions).filter((p) => PROFESSIONS[p]?.kind === 'crafting').length;
  if (craftingCount >= MAX_CRAFTING_PROFESSIONS) return { ok: false, error: `You can only know ${MAX_CRAFTING_PROFESSIONS} crafting professions at once` };
  s.professions[professionId] = { level: 1, xp: 0 };
  for (const r of Object.values(RECIPES)) {
    if (r.profession === professionId && r.learn === 'auto' && r.level <= 1 && !s.knownRecipes.includes(r.id)) s.knownRecipes.push(r.id);
  }
  return { ok: true };
}

function performJobAdvance(s: CharacterState, jobId: string): { ok: boolean; error?: string } {
  const jobDef = (ITEMS as any) && require('../data').JOBS[jobId];
  return performJobAdvanceImpl(s, jobId);
}

// (kept as its own function so it can be imported by name below without require())
import { JOBS } from '../data';
function performJobAdvanceImpl(s: CharacterState, jobId: string): { ok: boolean; error?: string } {
  const jobDef = JOBS[jobId as keyof typeof JOBS];
  if (!jobDef || jobDef.tier !== 2) return { ok: false, error: 'Invalid job' };
  if (jobDef.parent !== s.classId) return { ok: false, error: 'That specialization is not available to your class' };
  if (s.jobId !== s.classId) return { ok: false, error: 'Already advanced' };
  if (s.level < JOB_ADVANCE_LEVEL) return { ok: false, error: `Requires level ${JOB_ADVANCE_LEVEL}` };
  s.jobId = jobId as CharacterState['jobId'];
  s.sp += SP_ON_ADVANCE;
  return { ok: true };
}

function applyReward(s: CharacterState, events: GameEvent[], reward: Reward, ctx: ServerContext) {
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

function applyDialogueActions(s: CharacterState, events: GameEvent[], actions: DialogueAction[], ctx: ServerContext) {
  for (const a of actions) {
    switch (a.type) {
      case 'acceptQuest': {
        const def = QUESTS[a.questId];
        if (def && getQuestState(s, a.questId) === 'notStarted' && checkConditions(s, def.reqs)) {
          s.quests[a.questId] = { state: 'active', progress: def.objectives.map(() => 0), acceptedAt: ctx.now };
          if (def.onAccept) applyDialogueActions(s, events, def.onAccept, ctx);
          events.push({ type: 'questAccepted', questId: a.questId });
        }
        break;
      }
      case 'setFlag':
        s.flags[a.flag] = a.value;
        events.push({ type: 'flagSet', flag: a.flag, value: a.value });
        break;
      case 'openShop':
        events.push({ type: 'openUi', panel: 'shop', id: a.shopId });
        break;
      case 'openCrafting':
        events.push({ type: 'openUi', panel: 'crafting', id: a.professionId });
        break;
      case 'learnProfession': {
        const res = tryLearnProfession(s, a.professionId);
        if (res.ok) events.push({ type: 'professionLearned', professionId: a.professionId });
        break;
      }
      case 'teleport': {
        const cost = a.cost ?? 0;
        if (cost > 0) { if (s.gold < cost) break; s.gold -= cost; }
        const dm = MAPS[a.mapId];
        if (dm) {
          s.mapId = a.mapId; s.position = { x: -1, y: -1 };
          if (!s.discoveredMaps.includes(a.mapId)) s.discoveredMaps.push(a.mapId);
          if (dm.town) s.townMapId = a.mapId;
          events.push({ type: 'mapChanged', mapId: a.mapId, portalId: a.portalId, x: -1, y: -1 });
        }
        break;
      }
      case 'giveItem': {
        const qty = a.qty ?? 1;
        const r = addItem(s, a.itemId, qty, ctx.uid);
        if (r.ok) events.push({ type: 'itemAdded', itemId: a.itemId, qty });
        break;
      }
      case 'takeItem': {
        const qty = a.qty ?? 1;
        const r = removeItem(s, { itemId: a.itemId, qty });
        if (r.ok) events.push({ type: 'itemRemoved', itemId: a.itemId, qty: r.removedQty });
        break;
      }
      case 'heal': {
        const stats = computeStats(s, ctx.now);
        s.hp = stats.maxHp; s.mp = stats.maxMp;
        events.push({ type: 'heal', hp: stats.maxHp, mp: stats.maxMp });
        break;
      }
      case 'reputation': {
        s.reputation[a.faction] = (s.reputation[a.faction] ?? 0) + a.amount;
        events.push({ type: 'reputation', faction: a.faction, amount: a.amount, total: s.reputation[a.faction] });
        break;
      }
      case 'jobAdvance': {
        const r = performJobAdvanceImpl(s, a.jobId);
        if (r.ok) events.push({ type: 'jobAdvanced', jobId: a.jobId });
        break;
      }
      case 'close':
        break;
    }
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  const ak = Object.keys(a as object);
  const bk = Object.keys(b as object);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Loot: equipment drops are generated here from 'worlddrop' / 'bossdrop:<id>' tagged items.
// Monster.drops tables (authored in monsters.ts) list only materials/consumables/quest items/stones.
// ---------------------------------------------------------------------------

type StatKeyForPool = keyof import('../types').DerivedStats;

function statPoolFor(slot: EquipSlot, weaponType: string | undefined): StatKeyForPool[] {
  if (slot === 'weapon') {
    const magic = weaponType === 'staff' || weaponType === 'wand';
    return magic
      ? ['magicAttack', 'critRate', 'critDamage', 'damagePct']
      : ['attack', 'critRate', 'critDamage', 'damagePct'];
  }
  if (slot === 'ring' || slot === 'amulet') {
    return ['str', 'dex', 'int', 'luk', 'critRate', 'critDamage', 'xpBonus', 'dropBonus', 'goldBonus', 'cooldownReduction'];
  }
  return ['defense', 'maxHp', 'maxMp', 'hpRegen', 'mpRegen', 'speed', 'jump'];
}

function rollLineMagnitude(key: StatKeyForPool, itemLevel: number, rng: Rng): number {
  const v = 0.8 + rng() * 0.4;
  switch (key) {
    case 'attack': case 'magicAttack': case 'defense':
      return Math.max(1, Math.round((1 + itemLevel * 0.5) * v));
    case 'maxHp':
      return Math.max(1, Math.round((5 + itemLevel * 1.5) * v));
    case 'maxMp':
      return Math.max(1, Math.round((3 + itemLevel * 1.0) * v));
    case 'str': case 'dex': case 'int': case 'luk':
      return Math.max(1, Math.round((1 + itemLevel * 0.15) * v));
    case 'hpRegen': case 'mpRegen':
      return Math.max(1, Math.round((1 + itemLevel * 0.1) * v));
    case 'speed': case 'jump':
      return Math.max(1, Math.round((1 + itemLevel * 0.05) * v));
    case 'critRate': case 'critDamage':
      return Math.round((0.01 + itemLevel * 0.001) * v * 1000) / 1000;
    case 'xpBonus': case 'dropBonus': case 'goldBonus': case 'cooldownReduction':
      return Math.round((0.01 + itemLevel * 0.0015) * v * 1000) / 1000;
    default:
      return Math.round((1 + itemLevel * 0.3) * v);
  }
}

function rollEquipmentInstance(def: ItemDef, itemLevel: number, rng: Rng, uidFn: () => string, crafter?: string): ItemInstance {
  let rarity: Rarity = def.rarity;
  while (RARITY_ORDER.indexOf(rarity) < RARITY_ORDER.length - 1 && chance(rng, RARITY_UPGRADE_CHANCE)) {
    rarity = RARITY_ORDER[RARITY_ORDER.indexOf(rarity) + 1];
  }
  const lineCount = (def.equip?.randomLines ?? 0) + RARITY_BONUS_LINES[rarity];
  const bonus: Partial<Record<StatKeyForPool, number>> = {};
  if (lineCount > 0 && def.equip) {
    const pool = statPoolFor(def.equip.slot, def.equip.weaponType);
    for (let i = 0; i < lineCount; i++) {
      const key = pick(rng, pool);
      bonus[key] = (bonus[key] ?? 0) + rollLineMagnitude(key, itemLevel, rng);
    }
  }
  return {
    uid: uidFn(), itemId: def.id, qty: 1,
    bonus: Object.keys(bonus).length ? bonus : undefined,
    stars: 0,
    rarity: rarity !== def.rarity ? rarity : undefined,
    crafter,
  };
}

function eligibleWorldDrops(monsterLevel: number): ItemDef[] {
  const all = Object.values(ITEMS).filter((d) => d.equip && d.tags?.includes('worlddrop'));
  const lo = monsterLevel - 7, hi = monsterLevel + 1;
  let pool = all.filter((d) => (d.levelReq ?? 1) >= lo && (d.levelReq ?? 1) <= hi);
  if (pool.length === 0) {
    const below = all.filter((d) => (d.levelReq ?? 1) <= hi).sort((a, b) => (b.levelReq ?? 1) - (a.levelReq ?? 1));
    if (below.length) {
      const top = below[0].levelReq ?? 1;
      pool = below.filter((d) => (d.levelReq ?? 1) === top);
    } else {
      pool = all;
    }
  }
  return pool;
}

function pickWorldDrop(rng: Rng, monsterLevel: number, killerClassId: ClassId): ItemDef | null {
  const pool = eligibleWorldDrops(monsterLevel);
  if (!pool.length) return null;
  const classUsable = pool.filter((d) => !d.classReq || d.classReq.includes(killerClassId));
  const finalPool = classUsable.length > 0 && chance(rng, 0.6) ? classUsable : pool;
  return pick(rng, finalPool);
}

interface RolledDrop { itemId?: string; qty: number; gold?: number; instance?: ItemInstance; rarity?: Rarity }

function rollLoot(s: CharacterState, monster: import('../types').MonsterDef, stats: DerivedStats, ctx: ServerContext): RolledDrop[] {
  const out: RolledDrop[] = [];
  const dropBonus = stats.dropBonus;

  for (const entry of monster.drops) {
    if (entry.itemId.startsWith('qi_') && !questNeedsCollectItem(s, entry.itemId)) continue;
    if (chance(ctx.rng, Math.min(0.95, entry.chance * (1 + dropBonus)))) {
      const qty = randInt(ctx.rng, entry.min ?? 1, entry.max ?? 1);
      out.push({ itemId: entry.itemId, qty });
    }
  }

  if (ITEMS['mat_enhance_stone_1']) {
    if (chance(ctx.rng, Math.min(0.5, 0.03 * (1 + dropBonus)))) out.push({ itemId: 'mat_enhance_stone_1', qty: 1 });
  }

  if (monster.isBoss) {
    const bossTag = `bossdrop:${monster.id}`;
    const bossItems = Object.values(ITEMS).filter((d) => d.equip && d.tags?.includes(bossTag));
    const rolled: ItemDef[] = [];
    for (const bi of bossItems) if (chance(ctx.rng, 0.4)) rolled.push(bi);
    if (rolled.length === 0 && bossItems.length > 0) rolled.push(pick(ctx.rng, bossItems));
    for (const bi of rolled) {
      const inst = rollEquipmentInstance(bi, bi.levelReq ?? monster.level, ctx.rng, ctx.uid);
      out.push({ itemId: bi.id, qty: 1, instance: inst, rarity: inst.rarity ?? bi.rarity });
    }
    for (let i = 0; i < 2; i++) {
      const wd = pickWorldDrop(ctx.rng, monster.level, s.classId);
      if (wd) {
        const inst = rollEquipmentInstance(wd, wd.levelReq ?? monster.level, ctx.rng, ctx.uid);
        out.push({ itemId: wd.id, qty: 1, instance: inst, rarity: inst.rarity ?? wd.rarity });
      }
    }
  } else if (chance(ctx.rng, Math.min(0.9, 0.05 * (1 + dropBonus)))) {
    const wd = pickWorldDrop(ctx.rng, monster.level, s.classId);
    if (wd) {
      const inst = rollEquipmentInstance(wd, wd.levelReq ?? monster.level, ctx.rng, ctx.uid);
      out.push({ itemId: wd.id, qty: 1, instance: inst, rarity: inst.rarity ?? wd.rarity });
    }
  }

  return out;
}

function computeSalvage(def: ItemDef, rarity: Rarity): { itemId: string; qty: number }[] {
  const lvl = def.levelReq ?? 1;
  const qty = Math.max(1, Math.round(lvl / 8) + 1);
  let itemId: string;
  if (rarity === 'epic' || rarity === 'legendary') itemId = 'mat_scrap_arcane';
  else if (rarity === 'rare') itemId = 'mat_scrap_fine';
  else itemId = 'mat_scrap_iron';
  if (!ITEMS[itemId]) return [];
  return [{ itemId, qty }];
}

// ---------------------------------------------------------------------------
// The reducer
// ---------------------------------------------------------------------------

/**
 * The authoritative action handler. Never mutates the input state (clones first).
 * Returns { ok:false, error, state: <original input, unmodified> } on any invalid input —
 * never throws.
 */
export function handleAction(state: CharacterState, action: ClientAction, ctx: ServerContext): ReducerResult {
  const s: CharacterState = structuredClone(state);
  const events: GameEvent[] = [];
  const err = (message: string): ReducerResult => ({ ok: false, error: message, state, events: [] });

  switch (action.type) {
    // ------------------------------------------------------------------ world/combat
    case 'killMonster': {
      const monster = MONSTERS[action.monsterId];
      const map = MAPS[action.mapId];
      if (!monster) return err('Unknown monster');
      if (!map) return err('Unknown map');
      const onMap =
        (map.spawns ?? []).some((sp) => sp.monsterId === action.monsterId) ||
        map.boss?.monsterId === action.monsterId ||
        (map.boss ? (MONSTERS[map.boss.monsterId]?.attacks ?? []).some((a) => a.kind === 'summon' && a.summonId === action.monsterId) : false);
      if (!onMap) return err('That monster is not here.');

      const stats = computeStats(s, ctx.now);
      const diff = monster.level - s.level;
      const xpGain = Math.max(1, Math.round(monster.xp * levelDiffXpMult(diff) * XP_CURVE.globalRate * (1 + stats.xpBonus)));
      applyXp(s, events, xpGain, ctx.now);

      const [gmin, gmax] = monster.gold;
      let gold = randInt(ctx.rng, gmin, gmax);
      gold = Math.round(gold * (1 + stats.goldBonus));
      if (monster.isBoss) gold *= 10;

      const rolled = rollLoot(s, monster, stats, ctx);
      const drops: LootDrop[] = [];
      if (gold > 0) {
        const dropId = `d${ctx.session.dropSeq++}`;
        const drop: LootDrop = { dropId, qty: gold, gold };
        ctx.session.pendingDrops[dropId] = { drop, mapId: action.mapId, expiresAt: ctx.now + DROP_LIFETIME_MS };
        drops.push(drop);
      }
      for (const r of rolled) {
        const dropId = `d${ctx.session.dropSeq++}`;
        const drop: LootDrop = { dropId, itemId: r.itemId, qty: r.qty, instance: r.instance, rarity: r.rarity };
        ctx.session.pendingDrops[dropId] = { drop, mapId: action.mapId, expiresAt: ctx.now + DROP_LIFETIME_MS };
        drops.push(drop);
      }
      if (drops.length) events.push({ type: 'lootDropped', drops, x: action.x, y: action.y });

      s.counters.kills++;
      s.bestiary[action.monsterId] = (s.bestiary[action.monsterId] ?? 0) + 1;
      if (monster.isBoss) {
        s.counters.bossKills++;
        events.push({ type: 'bossDefeated', monsterId: action.monsterId });
        forEachActiveQuestObjective(s, events, (o) => o.type === 'boss' && o.monsterId === action.monsterId, () => 1);
      }
      forEachActiveQuestObjective(s, events, (o) => o.type === 'kill' && o.monsterId === action.monsterId, (o, cur) => Math.min((o as any).count, cur + 1));
      events.push({ type: 'statsChanged' });
      break;
    }

    case 'pickup': {
      const pending = ctx.session.pendingDrops[action.dropId];
      if (!pending) return err('That loot is gone.');
      if (pending.expiresAt < ctx.now) { delete ctx.session.pendingDrops[action.dropId]; return err('That loot is gone.'); }
      if (pending.mapId !== s.mapId) return err('That loot is not here.');
      const drop = pending.drop;
      if (drop.gold) {
        s.gold += drop.gold;
        s.counters.goldEarned += drop.gold;
        events.push({ type: 'gold', amount: drop.gold });
      } else if (drop.itemId) {
        const res = addItem(s, drop.itemId, drop.qty, ctx.uid, {
          bonus: drop.instance?.bonus, stars: drop.instance?.stars, rarity: drop.instance?.rarity, crafter: drop.instance?.crafter,
        });
        if (!res.ok) return err(res.error ?? 'Inventory full.');
        events.push({ type: 'itemAdded', itemId: drop.itemId, qty: drop.qty, rarity: drop.rarity });
      } else {
        return err('Nothing to pick up.');
      }
      delete ctx.session.pendingDrops[action.dropId];
      break;
    }

    case 'gather': {
      const node = require('../data').GATHER_NODES[action.nodeId];
      if (!node) return err('Unknown gather node.');
      const map = MAPS[action.mapId];
      if (!map) return err('Unknown map.');
      if (!(map.gather ?? []).some((g) => g.nodeId === action.nodeId)) return err('That node is not here.');
      const prof = s.professions[node.profession];
      const profLevel = prof?.level ?? 0;
      if (profLevel < node.level) return err(`Requires ${node.profession} level ${node.level}.`);
      const key = `${action.mapId}:${action.nodeId}`;
      const readyAt = ctx.session.nodeCooldowns[key] ?? 0;
      if (ctx.now < readyAt) return err('This node is depleted. Try again later.');
      ctx.session.nodeCooldowns[key] = ctx.now + node.respawnMs;

      const stats = computeStats(s, ctx.now);
      for (const entry of node.drops) {
        if (chance(ctx.rng, Math.min(0.95, entry.chance * (1 + stats.dropBonus)))) {
          const qty = randInt(ctx.rng, entry.min ?? 1, entry.max ?? 1);
          const res = addItem(s, entry.itemId, qty, ctx.uid);
          if (res.ok) events.push({ type: 'itemAdded', itemId: entry.itemId, qty });
        }
      }
      grantProfessionXp(s, events, node.profession, node.xp);
      events.push({ type: 'gathered', nodeId: action.nodeId });
      s.counters.gathered++;
      forEachActiveQuestObjective(
        s, events,
        (o) => o.type === 'gather' && ((o as any).nodeId === action.nodeId || (o as any).professionId === node.profession),
        (o, cur) => Math.min((o as any).count, cur + 1),
      );
      break;
    }

    case 'changeMap': {
      const current = MAPS[s.mapId];
      const target = MAPS[action.mapId];
      if (!target) return err('Unknown destination map.');
      if (!current) return err('Unknown current map.');
      const portal = action.fromPortalId
        ? current.portals.find((p) => p.id === action.fromPortalId)
        : current.portals.find((p) => p.to === action.mapId);
      if (!portal || portal.to !== action.mapId) return err('There is no path to that map from here.');
      if (!checkConditions(s, portal.reqs)) return err(portal.lockedText ?? 'You cannot go there yet.');
      s.mapId = action.mapId;
      s.position = { x: -1, y: -1 };
      if (!s.discoveredMaps.includes(action.mapId)) s.discoveredMaps.push(action.mapId);
      if (target.town) s.townMapId = action.mapId;
      forEachActiveQuestObjective(s, events, (o) => o.type === 'visit' && (o as any).mapId === action.mapId, () => 1);
      events.push({ type: 'mapChanged', mapId: action.mapId, portalId: portal.toPortal, x: -1, y: -1 });
      break;
    }

    case 'syncVitals': {
      const stats = computeStats(s, ctx.now);
      s.hp = Math.max(0, Math.min(stats.maxHp, Math.round(action.hp)));
      s.mp = Math.max(0, Math.min(stats.maxMp, Math.round(action.mp)));
      s.position = { x: action.x, y: action.y };
      if (action.playTimeMs) s.counters.playTimeMs += Math.max(0, Math.round(action.playTimeMs));
      break;
    }

    case 'die': {
      const need = xpToNext(s.level);
      const lose = isFinite(need) ? Math.round(need * DEATH_XP_PENALTY) : 0;
      const xpLost = Math.min(s.xp, lose);
      s.xp -= xpLost;
      s.hp = 0;
      s.counters.deaths++;
      events.push({ type: 'died', xpLost });
      break;
    }

    case 'respawn': {
      const town = MAPS[s.townMapId] ?? MAPS[START_MAP];
      const stats = computeStats(s, ctx.now);
      s.mapId = s.townMapId ?? START_MAP;
      s.position = { x: -1, y: -1 };
      s.hp = Math.round(stats.maxHp * 0.5);
      s.mp = Math.round(stats.maxMp * 0.5);
      events.push({ type: 'respawned', mapId: s.mapId, x: town?.spawnPoint.x ?? -1, y: town?.spawnPoint.y ?? -1 });
      break;
    }

    // ------------------------------------------------------------------ inventory
    case 'equip': {
      const inst = findInstance(s, action.uid);
      if (!inst) return err('Item not found.');
      const def = ITEMS[inst.itemId];
      if (!def?.equip) return err('That item cannot be equipped.');
      const chk = canEquip(s, inst);
      if (!chk.ok) return err(chk.reason ?? 'Cannot equip that.');
      const rm = removeItem(s, { uid: action.uid, qty: 1 });
      if (!rm.ok) return err('Item not found.');
      const slot = def.equip.slot;
      const old = s.equipment[slot];
      s.equipment[slot] = inst;
      if (old) {
        const pr = placeInInventory(s, old, 'equip');
        if (!pr.ok) return err('Inventory full.');
      }
      events.push({ type: 'equipChanged' }, { type: 'statsChanged' });
      break;
    }

    case 'unequip': {
      const inst = s.equipment[action.slot];
      if (!inst) return err('Nothing is equipped there.');
      const pr = placeInInventory(s, inst, 'equip');
      if (!pr.ok) return err('Inventory full.');
      delete s.equipment[action.slot];
      events.push({ type: 'equipChanged' }, { type: 'statsChanged' });
      break;
    }

    case 'useItem': {
      let inst: ItemInstance | null = null;
      if (action.uid) inst = findInstance(s, action.uid);
      else if (action.itemId) {
        outer: for (const tab of ['use', 'etc'] as InventoryTab[]) {
          for (const slot of s.inventory[tab]) if (slot?.itemId === action.itemId) { inst = slot; break outer; }
        }
      }
      if (!inst) return err('Item not found.');
      const def = ITEMS[inst.itemId];
      if (!def?.use) return err('That item cannot be used.');
      const use = def.use;
      if (use.cooldownGroup) {
        const readyAt = ctx.session.itemCooldowns[use.cooldownGroup] ?? 0;
        if (ctx.now < readyAt) return err('That is still on cooldown.');
      }
      const stats = computeStats(s, ctx.now);
      if (use.heal) {
        let hp = 0, mp = 0;
        if (use.heal.hp) hp += use.heal.hp;
        if (use.heal.hpPct) hp += Math.round(stats.maxHp * use.heal.hpPct);
        if (use.heal.mp) mp += use.heal.mp;
        if (use.heal.mpPct) mp += Math.round(stats.maxMp * use.heal.mpPct);
        s.hp = Math.min(stats.maxHp, s.hp + hp);
        s.mp = Math.min(stats.maxMp, s.mp + mp);
        events.push({ type: 'heal', hp, mp });
      }
      if (use.buff) {
        s.buffs = s.buffs.filter((b) => b.id !== use.buff!.id);
        s.buffs.push({
          id: use.buff.id, name: use.buff.name, stats: use.buff.stats, expiresAt: ctx.now + use.buff.durationMs,
          icon: use.buff.icon, source: use.buff.id === 'food' ? 'food' : 'item',
        });
        events.push({ type: 'buffApplied', buffId: use.buff.id, name: use.buff.name, durationMs: use.buff.durationMs });
        events.push({ type: 'statsChanged' });
      }
      if (use.teleport) {
        const dest = use.teleport === 'town' ? s.townMapId : use.teleport;
        const destMap = MAPS[dest];
        if (!destMap) return err('Invalid teleport destination.');
        s.mapId = dest; s.position = { x: -1, y: -1 };
        if (!s.discoveredMaps.includes(dest)) s.discoveredMaps.push(dest);
        if (destMap.town) s.townMapId = dest;
        events.push({ type: 'mapChanged', mapId: dest, x: -1, y: -1 });
      }
      if (use.learnRecipe && !s.knownRecipes.includes(use.learnRecipe)) {
        s.knownRecipes.push(use.learnRecipe);
        events.push({ type: 'recipeLearned', recipeId: use.learnRecipe });
      }
      if (use.resetStats) {
        const spent = (s.baseStats.str - STARTING_STATS.str) + (s.baseStats.dex - STARTING_STATS.dex)
          + (s.baseStats.int - STARTING_STATS.int) + (s.baseStats.luk - STARTING_STATS.luk);
        s.ap += Math.max(0, spent);
        s.baseStats = { ...STARTING_STATS };
        events.push({ type: 'statsChanged' });
      }
      if (use.resetSkills) {
        let refunded = 0;
        for (const lvl of Object.values(s.skills)) refunded += lvl;
        s.sp += refunded;
        s.skills = {};
        events.push({ type: 'statsChanged' });
      }
      removeItem(s, { uid: inst.uid, qty: 1 });
      events.push({ type: 'itemUsed', itemId: inst.itemId, cooldownGroup: use.cooldownGroup, cooldownMs: use.cooldownMs });
      if (use.cooldownGroup && use.cooldownMs) ctx.session.itemCooldowns[use.cooldownGroup] = ctx.now + use.cooldownMs;
      break;
    }

    case 'discardItem': {
      const inst = findInstance(s, action.uid);
      if (!inst) return err('Item not found.');
      const def = ITEMS[inst.itemId];
      if (def?.quest) return err('Quest items cannot be discarded.');
      const res = removeItem(s, { uid: action.uid, qty: action.qty ?? inst.qty });
      if (!res.ok) return err(res.error ?? 'Cannot discard that.');
      events.push({ type: 'itemRemoved', itemId: inst.itemId, qty: res.removedQty });
      break;
    }

    case 'moveItem': {
      const tab = s.inventory[action.tab];
      if (!tab || action.from < 0 || action.from >= tab.length || action.to < 0 || action.to >= tab.length) return err('Invalid inventory slot.');
      const tmp = tab[action.from];
      tab[action.from] = tab[action.to];
      tab[action.to] = tmp;
      break;
    }

    case 'sortInventory': {
      const tab = s.inventory[action.tab];
      const items = tab.filter((x): x is ItemInstance => !!x);
      items.sort((a, b) => {
        const rc = RARITY_ORDER.indexOf(rarityOf(b)) - RARITY_ORDER.indexOf(rarityOf(a));
        if (rc !== 0) return rc;
        const na = ITEMS[a.itemId]?.name ?? a.itemId;
        const nb = ITEMS[b.itemId]?.name ?? b.itemId;
        return na.localeCompare(nb);
      });
      for (let i = 0; i < tab.length; i++) tab[i] = items[i] ?? null;
      break;
    }

    // ------------------------------------------------------------------ progression
    case 'allocateStat': {
      if (action.amount <= 0) return err('Invalid amount.');
      if (s.ap < action.amount) return err('Not enough AP.');
      s.ap -= action.amount;
      s.baseStats[action.stat] += action.amount;
      events.push({ type: 'statsChanged' });
      break;
    }

    case 'learnSkill': {
      const chk = skillLearnCheck(s, action.skillId);
      if (!chk.ok) return err(chk.reason ?? 'Cannot learn that skill.');
      s.sp -= 1;
      s.skills[action.skillId] = (s.skills[action.skillId] ?? 0) + 1;
      events.push({ type: 'skillLearned', skillId: action.skillId, level: s.skills[action.skillId] });
      events.push({ type: 'statsChanged' });
      break;
    }

    case 'setHotbar': {
      if (action.index < 0 || action.index >= s.hotbar.length) return err('Invalid hotbar slot.');
      s.hotbar[action.index] = action.entry;
      break;
    }

    case 'jobAdvance': {
      const r = performJobAdvanceImpl(s, action.jobId);
      if (!r.ok) return err(r.error ?? 'Cannot advance job.');
      events.push({ type: 'jobAdvanced', jobId: action.jobId });
      events.push({ type: 'statsChanged' });
      break;
    }

    case 'setTitle': {
      if (action.title === null) { s.activeTitle = undefined; break; }
      if (!s.titles.includes(action.title)) return err('Title not unlocked.');
      s.activeTitle = action.title;
      break;
    }

    // ------------------------------------------------------------------ quests & npcs
    case 'acceptQuest': {
      const def = QUESTS[action.questId];
      if (!def) return err('Unknown quest.');
      const st = getQuestState(s, action.questId);
      if (st === 'active' || st === 'ready') return err('That quest is already in progress.');
      if (st === 'completed') {
        if (!def.repeatable) return err('That quest is already completed.');
        const qp = s.quests[action.questId];
        if (qp && ctx.now - (qp.completedAt ?? 0) < def.repeatable.cooldownMs) return err('That quest is not ready to repeat yet.');
      }
      if (!checkConditions(s, def.reqs)) return err('You do not meet the requirements for that quest.');
      const prevTimes = s.quests[action.questId]?.timesCompleted;
      s.quests[action.questId] = { state: 'active', progress: def.objectives.map(() => 0), acceptedAt: ctx.now, timesCompleted: prevTimes };
      if (def.onAccept) applyDialogueActions(s, events, def.onAccept, ctx);
      events.push({ type: 'questAccepted', questId: action.questId });
      break;
    }

    case 'abandonQuest': {
      const qp = s.quests[action.questId];
      if (!qp || qp.state !== 'active') return err('That quest is not active.');
      const def = QUESTS[action.questId];
      if (def?.type === 'main') return err('Main story quests cannot be abandoned.');
      delete s.quests[action.questId];
      events.push({ type: 'questAbandoned', questId: action.questId });
      break;
    }

    case 'completeQuest': {
      const def = QUESTS[action.questId];
      if (!def) return err('Unknown quest.');
      if (getQuestState(s, action.questId) !== 'ready') return err('The objectives for that quest are not complete yet.');

      let choice: QuestChoice | undefined;
      if (def.choices && def.choices.length) {
        if (action.choiceId) choice = def.choices.find((c) => c.id === action.choiceId);
        else if (action.chooseIndex !== undefined) choice = def.choices[action.chooseIndex];
        if (!choice) return err('A choice is required to complete that quest.');
        if (choice.reqs && !checkConditions(s, choice.reqs)) return err(choice.lockedHint ?? 'You cannot choose that.');
      }

      for (const obj of def.objectives) {
        if (obj.type === 'collect' && obj.consume !== false) removeItem(s, { itemId: obj.itemId, qty: obj.count });
      }

      applyReward(s, events, def.rewards, ctx);

      if (def.rewards.chooseOne && def.rewards.chooseOne.length) {
        if (action.chooseIndex === undefined) return err('A reward choice is required.');
        const picked = def.rewards.chooseOne[action.chooseIndex];
        if (!picked) return err('Invalid reward choice.');
        const qty = picked.qty ?? 1;
        const r = addItem(s, picked.itemId, qty, ctx.uid);
        if (r.ok) events.push({ type: 'itemAdded', itemId: picked.itemId, qty });
      }

      if (choice) {
        applyReward(s, events, choice.rewards, ctx);
        if (choice.jobAdvance) {
          const r = performJobAdvanceImpl(s, choice.jobAdvance);
          if (r.ok) events.push({ type: 'jobAdvanced', jobId: choice.jobAdvance });
        }
      }

      const prevTimes = s.quests[action.questId]?.timesCompleted ?? 0;
      s.quests[action.questId] = {
        state: 'completed', progress: def.objectives.map(() => 0),
        acceptedAt: s.quests[action.questId]?.acceptedAt ?? ctx.now, completedAt: ctx.now,
        choiceId: choice?.id, timesCompleted: prevTimes + 1,
      };
      events.push({ type: 'questCompleted', questId: action.questId, choiceId: choice?.id });
      break;
    }

    case 'talk': {
      const npc = NPCS[action.npcId];
      if (!npc) return err('Unknown NPC.');
      forEachActiveQuestObjective(s, events, (o) => o.type === 'talk' && (o as any).npcId === action.npcId, () => 1);
      break;
    }

    case 'dialogueAction': {
      const npc = NPCS[action.npcId];
      if (!npc?.dialogue) return err('This NPC has nothing to say.');
      const dlg = DIALOGUES[npc.dialogue];
      if (!dlg) return err('Dialogue not found.');
      let found = false;
      for (const node of Object.values(dlg.nodes)) {
        const lists = [node.actions ?? [], ...(node.options ?? []).map((o) => o.actions ?? [])];
        for (const list of lists) {
          for (const act of list) if (deepEqual(act, action.action)) { found = true; break; }
          if (found) break;
        }
        if (found) break;
      }
      if (!found) return err('That is not a valid action here.');
      applyDialogueActions(s, events, [action.action], ctx);
      break;
    }

    // ------------------------------------------------------------------ economy
    case 'buy': {
      const shop = require('../data').SHOPS[action.shopId];
      if (!shop) return err('Unknown shop.');
      const entry = shop.items.find((i: any) => i.itemId === action.itemId);
      if (!entry) return err('That item is not sold here.');
      if (!checkConditions(s, entry.reqs)) return err('That is not available to you yet.');
      const def = ITEMS[action.itemId];
      if (!def) return err('Unknown item.');
      const qty = Math.max(1, action.qty);
      const price = entry.price ?? def.buyPrice ?? 0;
      const total = price * qty;
      if (s.gold < total) return err('Not enough gold.');
      const res = addItem(s, action.itemId, qty, ctx.uid);
      if (!res.ok) return err(res.error ?? 'Inventory full.');
      s.gold -= total;
      events.push({ type: 'itemAdded', itemId: action.itemId, qty });
      events.push({ type: 'gold', amount: -total });
      break;
    }

    case 'sell': {
      const inst = findInstance(s, action.uid);
      if (!inst) return err('Item not found.');
      const def = ITEMS[inst.itemId];
      if (!def) return err('Unknown item.');
      if (def.quest) return err('Quest items cannot be sold.');
      const qty = Math.min(inst.qty, action.qty ?? inst.qty);
      const total = def.sellPrice * qty;
      const res = removeItem(s, { uid: action.uid, qty });
      if (!res.ok) return err(res.error ?? 'Cannot sell that.');
      s.gold += total;
      s.counters.goldEarned += Math.max(0, total);
      events.push({ type: 'itemRemoved', itemId: inst.itemId, qty: res.removedQty });
      events.push({ type: 'gold', amount: total });
      break;
    }

    case 'buyRecipe': {
      const recipe = RECIPES[action.recipeId];
      if (!recipe) return err('Unknown recipe.');
      if (recipe.learn !== 'trainer') return err('That recipe cannot be bought.');
      const prof = s.professions[recipe.profession];
      if (!prof) return err('Profession not learned.');
      if (prof.level < recipe.level) return err(`Requires ${recipe.profession} level ${recipe.level}.`);
      if (s.knownRecipes.includes(action.recipeId)) return err('You already know that recipe.');
      const cost = recipe.trainerCost ?? 0;
      if (s.gold < cost) return err('Not enough gold.');
      s.gold -= cost;
      s.knownRecipes.push(action.recipeId);
      events.push({ type: 'recipeLearned', recipeId: action.recipeId });
      break;
    }

    // ------------------------------------------------------------------ professions
    case 'learnProfession': {
      const res = tryLearnProfession(s, action.professionId);
      if (!res.ok) return err(res.error ?? 'Cannot learn that profession.');
      events.push({ type: 'professionLearned', professionId: action.professionId });
      forEachActiveQuestObjective(s, events, (o) => o.type === 'learnProfession', () => 1);
      break;
    }

    case 'unlearnProfession': {
      if (!s.professions[action.professionId]) return err('That profession is not known.');
      delete s.professions[action.professionId];
      s.knownRecipes = s.knownRecipes.filter((rid) => RECIPES[rid]?.profession !== action.professionId);
      break;
    }

    case 'craft': {
      const recipe = RECIPES[action.recipeId];
      if (!recipe) return err('Unknown recipe.');
      if (!s.knownRecipes.includes(action.recipeId)) return err('Recipe not known.');
      const prof = s.professions[recipe.profession];
      if (!prof) return err('Profession not learned.');
      if (prof.level < recipe.level) return err(`Requires ${recipe.profession} level ${recipe.level}.`);
      const qty = Math.max(1, action.qty ?? 1);
      for (const inp of recipe.inputs) if (countItem(s, inp.itemId) < inp.qty * qty) return err('Missing materials.');
      if (recipe.goldCost && s.gold < recipe.goldCost * qty) return err('Not enough gold.');
      const outDef = ITEMS[recipe.output.itemId];
      if (outDef?.equip) {
        const free = s.inventory[outDef.category].filter((x) => x === null).length;
        if (free < qty) return err('Not enough inventory space to craft that many.');
      }

      for (const inp of recipe.inputs) removeItem(s, { itemId: inp.itemId, qty: inp.qty * qty });
      if (recipe.goldCost) s.gold -= recipe.goldCost * qty;

      let lastRarity: Rarity | undefined;
      for (let i = 0; i < qty; i++) {
        if (outDef?.equip) {
          const inst = rollEquipmentInstance(outDef, outDef.levelReq ?? 1, ctx.rng, ctx.uid, s.name);
          if (recipe.minRarity) {
            const minIdx = RARITY_ORDER.indexOf(recipe.minRarity);
            const curIdx = RARITY_ORDER.indexOf(inst.rarity ?? outDef.rarity);
            if (curIdx < minIdx) inst.rarity = recipe.minRarity;
          }
          lastRarity = inst.rarity ?? outDef.rarity;
          placeInInventory(s, inst, outDef.category);
        } else {
          addItem(s, recipe.output.itemId, recipe.output.qty, ctx.uid);
        }
      }
      events.push({ type: 'crafted', itemId: recipe.output.itemId, qty: recipe.output.qty * qty, rarity: lastRarity });

      const levelDiff = prof.level - recipe.level;
      const factor = levelDiff > 5 ? Math.max(0.1, 1 - (levelDiff - 5) * 0.15) : 1;
      grantProfessionXp(s, events, recipe.profession, Math.round(recipe.xp * factor * qty));

      s.counters.crafted += qty;
      forEachActiveQuestObjective(
        s, events,
        (o) => o.type === 'craft' && ((o as any).itemId === recipe.output.itemId || (o as any).professionId === recipe.profession),
        (o, cur) => Math.min((o as any).count, cur + qty),
      );
      break;
    }

    case 'salvage': {
      const inst = findInstance(s, action.uid);
      if (!inst) return err('Item not found.');
      const def = ITEMS[inst.itemId];
      if (!def?.equip) return err('Only equipment can be salvaged.');
      const mats = def.salvage ?? computeSalvage(def, rarityOf(inst));
      removeItem(s, { uid: action.uid, qty: 1 });
      for (const m of mats) {
        const r = addItem(s, m.itemId, m.qty, ctx.uid);
        if (r.ok) events.push({ type: 'itemAdded', itemId: m.itemId, qty: m.qty });
      }
      break;
    }

    case 'enhance': {
      const inst = findInstance(s, action.uid);
      if (!inst) return err('Item not found.');
      const def = ITEMS[inst.itemId];
      if (!def?.equip) return err('Only equipment can be enhanced.');
      const stone = ITEMS[action.stoneItemId];
      if (!stone?.enhanceStone) return err('That is not an enhancement stone.');
      if (countItem(s, action.stoneItemId) < 1) return err('You need an enhancement stone.');
      const stars = inst.stars ?? 0;
      const maxStars = Math.min(maxStarsFor(inst), stone.enhanceStone.maxStarsUsable);
      if (stars >= maxStars) return err('That item is already at its maximum stars for this stone.');
      removeItem(s, { itemId: action.stoneItemId, qty: 1 });
      const successChance = enhanceChance(inst, action.stoneItemId);
      const success = chance(ctx.rng, successChance);
      const target = findInstance(s, action.uid);
      if (!target) return err('Item not found.');
      if (success) {
        target.stars = stars + 1;
        events.push({ type: 'enhanceResult', success: true, stars: target.stars, itemId: inst.itemId });
        forEachActiveQuestObjective(s, events, (o) => o.type === 'enhance', (o, cur) => Math.max(cur, target.stars ?? 0));
      } else {
        if (stars >= ENHANCE_DOWNGRADE_FROM) target.stars = Math.max(0, stars - 1);
        events.push({ type: 'enhanceResult', success: false, stars: target.stars ?? stars, itemId: inst.itemId, destroyed: false });
      }
      events.push({ type: 'statsChanged' });
      break;
    }

    default:
      return err(`Unhandled action ${(action as { type: string }).type}`);
  }

  s.updatedAt = ctx.now;
  return { ok: true, state: s, events };
}
