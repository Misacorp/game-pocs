#!/usr/bin/env tsx
/**
 * HEADLESS PLAYTHROUGH SIMULATOR — progression QA.
 *
 * Plays the whole game through the authoritative reducer (`handleAction`), the same way a real
 * client would (real ClientActions, no shortcuts), to prove the game is completable end-to-end
 * and to estimate real-world playtime. It also detects & reports content blockers.
 *
 * Run: npx tsx scripts/simulate-playthrough.ts [classId]
 *   classId: vanguard | stormcaller | windrunner | shade (default: vanguard)
 */
import type {
  CharacterState, ClassId, Condition, EquipSlot, ItemInstance, MapDef, QuestChoice, QuestDef,
} from '../src/shared/types';
import { EQUIP_SLOTS } from '../src/shared/types';
import type { ClientAction, ActionResult, GameEvent } from '../src/shared/protocol';
import {
  MAPS, NPCS, MONSTERS, ITEMS, QUESTS, RECIPES, SHOPS, GATHER_NODES, JOBS,
} from '../src/shared/data';
import {
  createCharacter, handleAction, createSession, checkConditions, getQuestState, countItem,
  canEquip, getItemStats, availableSkillIds, skillLearnCheck, type ServerContext,
} from '../src/shared/logic';
import { mulberry32 } from '../src/shared/rng';
import { MAX_CRAFTING_PROFESSIONS } from '../src/shared/constants';

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const classId = (process.argv[2] as ClassId) || 'vanguard';
if (!JOBS[classId] || JOBS[classId].tier !== 1) {
  console.error(`Unknown class '${classId}'. Use vanguard | stormcaller | windrunner | shade.`);
  process.exit(1);
}

// Per-class narrative strategy so that, across the four runs, we exercise every major branch:
// vanguard -> spare Jory, tidekeepers, free Kraelith's spirit, lay Rook to rest -> SING TOGETHER ending
// stormcaller -> turn Jory in, harpooners, take the Storm Heart, claim the harpoon -> HARVEST ending
// windrunner -> spare Jory, tidekeepers, free Kraelith's spirit, lay Rook to rest -> PURIFY ending (chosen deliberately over sing_together)
// shade -> turn Jory in, harpooners, take the Storm Heart, claim the harpoon -> HARVEST ending (2nd run, alt crafts)
interface Strategy {
  jorySpare: boolean;
  faction: 'harpooners' | 'tidekeepers';
  kraelith: 'take_heart' | 'free_spirit';
  rook: 'claim_harpoon' | 'lay_to_rest';
  finalEnding: 'harvest' | 'purify' | 'sing_together';
  jobAdvance: string;
  professions: [string, string];
}
const STRATEGIES: Record<ClassId, Strategy> = {
  vanguard: { jorySpare: true, faction: 'tidekeepers', kraelith: 'free_spirit', rook: 'lay_to_rest', finalEnding: 'sing_together', jobAdvance: 'bulwark', professions: ['smithing', 'alchemy'] },
  stormcaller: { jorySpare: false, faction: 'harpooners', kraelith: 'take_heart', rook: 'claim_harpoon', finalEnding: 'harvest', jobAdvance: 'tempest', professions: ['alchemy', 'jewelcrafting'] },
  windrunner: { jorySpare: true, faction: 'tidekeepers', kraelith: 'free_spirit', rook: 'lay_to_rest', finalEnding: 'purify', jobAdvance: 'skyhunter', professions: ['cooking', 'jewelcrafting'] },
  shade: { jorySpare: false, faction: 'harpooners', kraelith: 'take_heart', rook: 'claim_harpoon', finalEnding: 'harvest', jobAdvance: 'duskblade', professions: ['smithing', 'cooking'] },
};
const strategy = STRATEGIES[classId];

// ---------------------------------------------------------------------------
// Bookkeeping
// ---------------------------------------------------------------------------

let state: CharacterState = createCharacter(
  { name: `QA-${classId}`, classId, appearance: { skin: '#e8c39e', hair: '#4a3728', hairStyle: 0, eyes: '#3a2a1a', outfit: '#888888' } },
  'qa-char-1',
  Date.now(),
);
const rng = mulberry32(20260927);
const session = createSession();
let uidN = 0;
const ctx: ServerContext = { now: 1_700_000_000_000, rng, session, uid: () => `u${uidN++}` };

let timeMs = 0;
let totalKills = 0;
let actionBudget = 400_000;
const blockers: string[] = [];
const notes: string[] = [];
const mainQuestLog: { id: string; level: number; kills: number; minutes: number }[] = [];
const seenBlockers = new Set<string>();

function blocker(msg: string) {
  if (seenBlockers.has(msg)) return;
  seenBlockers.add(msg);
  blockers.push(msg);
  console.log(`  [BLOCKER] ${msg}`);
}
function note(msg: string) {
  notes.push(msg);
  console.log(`  [note] ${msg}`);
}

function dispatch(action: ClientAction, label = ''): ActionResult {
  actionBudget--;
  if (actionBudget <= 0) throw new Error('SIMULATION ABORTED: action budget exceeded (400,000 dispatches) — likely an infinite loop.');
  let res: ActionResult;
  try {
    res = handleAction(state, action, ctx);
  } catch (e) {
    blocker(`REDUCER EXCEPTION on '${action.type}' ${label}: ${(e as Error).stack ?? e}`);
    return { ok: false, error: 'exception', events: [], state };
  }
  if (res.ok) state = res.state;
  return res;
}

// ---------------------------------------------------------------------------
// Static lookups (built once from data — this is what "the client would know")
// ---------------------------------------------------------------------------

const npcMapId: Record<string, string> = {};
for (const m of Object.values(MAPS)) for (const np of m.npcs) if (!npcMapId[np.npcId]) npcMapId[np.npcId] = m.id;

const bossMapId: Record<string, string> = {};
for (const m of Object.values(MAPS)) if (m.boss) bossMapId[m.boss.monsterId] = m.id;

const spawnMapIds: Record<string, string[]> = {};
for (const m of Object.values(MAPS)) for (const sp of m.spawns) (spawnMapIds[sp.monsterId] ??= []).push(m.id);

const gatherMapIds: Record<string, string[]> = {};
for (const m of Object.values(MAPS)) for (const g of m.gather) (gatherMapIds[g.nodeId] ??= []).push(m.id);

const recipeForQuestReward: Record<string, string> = {}; // recipeId -> questId that grants it
for (const q of Object.values(QUESTS)) for (const rid of q.rewards.recipes ?? []) recipeForQuestReward[rid] = q.id;

// ---------------------------------------------------------------------------
// Map graph / navigation
// ---------------------------------------------------------------------------

function reachableSet(respectReqs: boolean): Set<string> {
  const seen = new Set<string>([state.mapId]);
  const queue = [state.mapId];
  while (queue.length) {
    const cur = queue.shift()!;
    const map = MAPS[cur];
    if (!map) continue;
    for (const portal of map.portals) {
      if (seen.has(portal.to)) continue;
      if (respectReqs && !checkConditions(state, portal.reqs)) continue;
      seen.add(portal.to);
      queue.push(portal.to);
    }
  }
  return seen;
}

function bfsPath(targetMapId: string, respectReqs: boolean): string[] | null {
  if (state.mapId === targetMapId) return [];
  const prev = new Map<string, string>();
  const seen = new Set<string>([state.mapId]);
  const queue = [state.mapId];
  while (queue.length) {
    const cur = queue.shift()!;
    const map = MAPS[cur];
    if (!map) continue;
    for (const portal of map.portals) {
      if (seen.has(portal.to)) continue;
      if (respectReqs && !checkConditions(state, portal.reqs)) continue;
      seen.add(portal.to);
      prev.set(portal.to, cur);
      if (portal.to === targetMapId) {
        const path = [portal.to];
        let cursor = cur;
        while (cursor !== state.mapId) { path.unshift(cursor); cursor = prev.get(cursor)!; }
        return path;
      }
      queue.push(portal.to);
    }
  }
  return null;
}

function isReachable(mapId: string): boolean {
  if (mapId === state.mapId) return true;
  return bfsPath(mapId, true) !== null;
}

/** Navigate the player through real changeMap actions to targetMapId. Reports blockers. */
function navigateTo(targetMapId: string): boolean {
  if (!MAPS[targetMapId]) { blocker(`navigateTo: unknown map '${targetMapId}'`); return false; }
  if (state.mapId === targetMapId) return true;
  const path = bfsPath(targetMapId, true);
  if (!path) {
    const ignoring = bfsPath(targetMapId, false);
    if (ignoring) {
      // Find the first portal along the ignoring-reqs path whose reqs currently fail, for a useful message.
      let cursor = state.mapId;
      let detail = '';
      for (const nextId of ignoring) {
        const cm = MAPS[cursor];
        const portal = cm?.portals.find((p) => p.to === nextId);
        if (portal && !checkConditions(state, portal.reqs)) { detail = `portal '${portal.id}' on '${cursor}' -> '${nextId}' reqs not met: ${JSON.stringify(portal.reqs)} (${portal.lockedText ?? ''})`; break; }
        cursor = nextId;
      }
      blocker(`Portal reqs block the route from '${state.mapId}' to '${targetMapId}': ${detail}`);
    } else {
      blocker(`Map '${targetMapId}' is not reachable from '${state.mapId}' via any portal chain (disconnected map graph).`);
    }
    return false;
  }
  for (const nextMap of path) {
    const res = dispatch({ type: 'changeMap', mapId: nextMap }, `-> ${nextMap}`);
    if (!res.ok) { blocker(`changeMap to '${nextMap}' failed: ${res.error}`); return false; }
    timeMs += 20_000;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Quest objective completion checks (mirrors src/shared/logic/conditions.ts objectiveMet)
// ---------------------------------------------------------------------------

function objDone(questId: string, i: number): boolean {
  const def = QUESTS[questId];
  const obj = def.objectives[i];
  const qp = state.quests[questId];
  const progress = qp?.progress?.[i] ?? 0;
  switch (obj.type) {
    case 'kill': return progress >= obj.count;
    case 'collect': return countItem(state, obj.itemId) >= obj.count;
    case 'talk': case 'visit': case 'boss': case 'learnProfession': return progress >= 1;
    case 'craft': case 'gather': return progress >= obj.count;
    case 'level': return state.level >= obj.level;
    case 'enhance': return progress >= obj.stars;
    default: return false;
  }
}

// ---------------------------------------------------------------------------
// Combat / kill helpers (the reducer has no real-time combat resolution — killMonster is a
// pure event, so we drive it directly, but only ever on maps/monsters the story has unlocked).
// ---------------------------------------------------------------------------

function killOnce(monsterId: string, mapId: string): boolean {
  const res = dispatch({ type: 'killMonster', monsterId, mapId, x: 0, y: 0 }, monsterId);
  if (!res.ok) { blocker(`killMonster '${monsterId}' on '${mapId}' failed: ${res.error}`); return false; }
  totalKills++;
  timeMs += 3500;
  for (const ev of res.events) if (ev.type === 'lootDropped') pickupDrops(ev);
  maintainAfterAction();
  return true;
}

function pickupDrops(ev: Extract<GameEvent, { type: 'lootDropped' }>) {
  for (const drop of ev.drops) {
    let res = dispatch({ type: 'pickup', dropId: drop.dropId }, drop.itemId ?? 'gold');
    if (!res.ok && res.error === 'Inventory full.') {
      freeInventorySpace();
      res = dispatch({ type: 'pickup', dropId: drop.dropId }, drop.itemId ?? 'gold');
    }
    // if still failing, it's a minor loss (rare mat), not worth treating as a blocker
  }
}

function findKillMap(monsterId: string): string | null {
  const candidates = spawnMapIds[monsterId] ?? [];
  const reachableNow = candidates.filter(isReachable);
  if (reachableNow.length) return reachableNow[0];
  if (candidates.length) { blocker(`Monster '${monsterId}' only spawns on map(s) [${candidates.join(', ')}] which are not currently reachable.`); return null; }
  blocker(`Monster '${monsterId}' does not spawn on any map (no spawn source at all).`);
  return null;
}

function killLoop(monsterId: string, mapId: string, doneCheck: () => boolean, maxTries: number) {
  navigateTo(mapId);
  let tries = 0;
  while (!doneCheck() && tries < maxTries) { killOnce(monsterId, mapId); tries++; }
}

// ---------------------------------------------------------------------------
// Grinding (leveling on the highest-level normal mob currently reachable via the story's own
// portal gates — i.e. what a real player would realistically farm at that point).
// ---------------------------------------------------------------------------

const MAX_GRIND_PER_CALL = 600;

function bestGrindTarget(): { monsterId: string; mapId: string; level: number } | null {
  const reach = reachableSet(true);
  let best: { monsterId: string; mapId: string; level: number } | null = null;
  for (const mapId of reach) {
    const map = MAPS[mapId];
    if (!map) continue;
    for (const sp of map.spawns) {
      const mon = MONSTERS[sp.monsterId];
      if (!mon || mon.isBoss) continue;
      if (!best || mon.level > best.level) best = { monsterId: mon.id, mapId, level: mon.level };
    }
  }
  return best;
}

function grindToLevel(targetLevel: number) {
  if (state.level >= targetLevel) return;
  const startLevel = state.level;
  const target = bestGrindTarget();
  if (!target) { blocker(`Cannot grind to level ${targetLevel}: no reachable non-boss monster spawns at all.`); return; }
  navigateTo(target.mapId);
  let kills = 0;
  while (state.level < targetLevel && kills < MAX_GRIND_PER_CALL) {
    // re-pick occasionally in case a better (newly-unlocked) target appears mid-grind
    if (kills > 0 && kills % 50 === 0) {
      const better = bestGrindTarget();
      if (better && better.level > target.level) { target.monsterId = better.monsterId; target.mapId = better.mapId; navigateTo(target.mapId); }
    }
    killOnce(target.monsterId, target.mapId);
    kills++;
  }
  note(`GRIND: level ${startLevel} -> ${state.level} via ${kills}x kill '${target.monsterId}' on '${target.mapId}'.`);
  if (state.level < targetLevel) blocker(`Excessive grinding: could not reach level ${targetLevel} from ${startLevel} even after ${kills} kills of the best reachable monster ('${target.monsterId}', capped at ${MAX_GRIND_PER_CALL}).`);
}

// ---------------------------------------------------------------------------
// Gathering / crafting / recipes / professions
// ---------------------------------------------------------------------------

function ensureProfessionLearned(profId: string): boolean {
  if (state.professions[profId as keyof typeof state.professions]) return true;
  const res = dispatch({ type: 'learnProfession', professionId: profId as any }, profId);
  if (!res.ok) { note(`Could not learn profession '${profId}': ${res.error}`); return false; }
  return true;
}

function cheapestKnownOrAutoRecipe(profId: string, maxLevel: number): string | null {
  const candidates = Object.values(RECIPES).filter((r) => r.profession === profId && r.level <= maxLevel);
  candidates.sort((a, b) => a.level - b.level);
  for (const r of candidates) if (ensureRecipeKnown(r.id, 0)) return r.id;
  return null;
}

function levelUpProfessionTo(profId: string, minLevel: number, depth: number) {
  let guard = 0;
  while ((state.professions[profId as keyof typeof state.professions]?.level ?? 0) < minLevel && guard < 40) {
    guard++;
    const recipeId = cheapestKnownOrAutoRecipe(profId, state.professions[profId as keyof typeof state.professions]?.level ?? 1);
    if (!recipeId) { note(`Could not find a low-level '${profId}' recipe to level the profession up.`); return; }
    if (!craftOnce(recipeId, depth + 1)) return;
  }
}

const recipeKnownFailNotes = new Set<string>();

function ensureRecipeKnown(recipeId: string, depth: number): boolean {
  if (state.knownRecipes.includes(recipeId)) return true;
  if (depth > 5) return false;
  const def = RECIPES[recipeId];
  if (!def) { blocker(`Recipe '${recipeId}' does not exist.`); return false; }
  if (!ensureProfessionLearned(def.profession)) return false;
  const profLevel = () => state.professions[def.profession]?.level ?? 0;
  switch (def.learn) {
    case 'auto': {
      if (profLevel() < def.level) levelUpProfessionTo(def.profession, def.level, depth);
      return state.knownRecipes.includes(recipeId);
    }
    case 'trainer': {
      if (profLevel() < def.level) levelUpProfessionTo(def.profession, def.level, depth);
      if (profLevel() < def.level) return false;
      ensureGold(def.trainerCost ?? 0);
      const res = dispatch({ type: 'buyRecipe', recipeId }, recipeId);
      if (!res.ok && !recipeKnownFailNotes.has(recipeId)) { recipeKnownFailNotes.add(recipeId); note(`Could not buy trainer recipe '${recipeId}': ${res.error}`); }
      return res.ok;
    }
    case 'item': {
      const scroll = Object.values(ITEMS).find((it) => it.use?.learnRecipe === recipeId);
      if (!scroll) { blocker(`Recipe '${recipeId}' is learn:'item' but no item teaches it.`); return false; }
      if (!ensureItemQty(scroll.id, 1, depth + 1)) return false;
      const res = dispatch({ type: 'useItem', itemId: scroll.id }, scroll.id);
      return res.ok;
    }
    case 'quest': {
      const qid = recipeForQuestReward[recipeId];
      if (!qid) { blocker(`Recipe '${recipeId}' is learn:'quest' but no quest rewards it.`); return false; }
      if (getQuestState(state, qid) !== 'completed') processQuest(qid);
      return state.knownRecipes.includes(recipeId);
    }
  }
  return false;
}

function ensureGold(amount: number) {
  if (state.gold >= amount) return;
  // Sell whatever spare equip we're carrying first.
  sellSpareEquip();
  if (state.gold >= amount) return;
  // Grind a little on the best reachable monster for gold (bounded).
  const target = bestGrindTarget();
  if (!target) return;
  navigateTo(target.mapId);
  let tries = 0;
  while (state.gold < amount && tries < 200) { killOnce(target.monsterId, target.mapId); tries++; }
}

function craftOnce(recipeId: string, depth: number): boolean {
  const def = RECIPES[recipeId];
  if (!def) return false;
  if (!ensureRecipeKnown(recipeId, depth)) return false;
  for (const inp of def.inputs) if (!ensureItemQty(inp.itemId, inp.qty, depth + 1)) return false;
  if (def.goldCost) ensureGold(def.goldCost);
  const outDef = ITEMS[def.output.itemId];
  if (outDef?.equip) freeInventorySpace(); // crafted equipment needs an empty slot
  const res = dispatch({ type: 'craft', recipeId }, recipeId);
  if (!res.ok) { blocker(`craft '${recipeId}' failed: ${res.error}`); return false; }
  timeMs += 5000;
  state.counters.crafted; // no-op touch
  maintainAfterAction();
  return true;
}

function gatherOnce(nodeId: string, mapId: string): boolean {
  const res = dispatch({ type: 'gather', nodeId, mapId }, nodeId);
  if (!res.ok) return false;
  timeMs += 2000;
  maintainAfterAction();
  return true;
}

/** Central item-acquisition resolver: shop, then monster drop, then gather node, then craft. */
const itemSourceFailNotes = new Set<string>();
function ensureItemQty(itemId: string, qty: number, depth = 0): boolean {
  if (countItem(state, itemId) >= qty) return true;
  if (depth > 6) return false;
  const def = ITEMS[itemId];
  if (!def) { blocker(`Item '${itemId}' does not exist in the item registry.`); return false; }

  // (a) buy from a shop
  for (const shop of Object.values(SHOPS)) {
    const entry = shop.items.find((e) => e.itemId === itemId);
    if (!entry) continue;
    if (!checkConditions(state, entry.reqs)) continue;
    const price = entry.price ?? def.buyPrice ?? 0;
    let guard = 0;
    while (countItem(state, itemId) < qty && guard < qty + 2) {
      guard++;
      ensureGold(price);
      if (state.gold < price) break;
      const res = dispatch({ type: 'buy', shopId: shop.id, itemId, qty: 1 }, itemId);
      if (!res.ok) break;
    }
    if (countItem(state, itemId) >= qty) return true;
  }

  // (b) monster drops (qi_ items only drop while the owning quest is active — this is exactly
  //     what we're testing when this is called from a quest's own 'collect' objective).
  const dropSources = Object.values(MONSTERS)
    .filter((m) => m.drops.some((d) => d.itemId === itemId))
    .sort((a, b) => (b.drops.find((d) => d.itemId === itemId)!.chance) - (a.drops.find((d) => d.itemId === itemId)!.chance));
  for (const mon of dropSources) {
    const mapId = findKillMap(mon.id);
    if (!mapId) continue;
    const cap = Math.max(60, qty * 60);
    killLoop(mon.id, mapId, () => countItem(state, itemId) >= qty, cap);
    if (countItem(state, itemId) >= qty) return true;
  }

  // (c) gather nodes
  const nodeSources = Object.values(GATHER_NODES).filter((n) => n.drops.some((d) => d.itemId === itemId));
  for (const node of nodeSources) {
    const maps = (gatherMapIds[node.id] ?? []).filter(isReachable);
    if (!maps.length) continue;
    if ((state.professions[node.profession]?.level ?? 0) < node.level) continue; // gathering profession level too low here
    let guard = 0;
    while (countItem(state, itemId) < qty && guard < qty * 30 + 30) {
      guard++;
      let did = false;
      for (const mapId of maps) {
        navigateTo(mapId);
        const key = `${mapId}:${node.id}`;
        if (ctx.now < (ctx.session.nodeCooldowns[key] ?? 0)) continue;
        did = gatherOnce(node.id, mapId) || did;
        if (did) break;
      }
      if (!did) {
        const minReady = Math.min(...maps.map((m) => ctx.session.nodeCooldowns[`${m}:${node.id}`] ?? ctx.now));
        if (minReady <= ctx.now || !isFinite(minReady)) break;
        ctx.now = minReady; // silent wait for respawn — not charged to the estimate
      }
    }
    if (countItem(state, itemId) >= qty) return true;
  }

  // (d) crafted from a recipe
  const recipe = Object.values(RECIPES).find((r) => r.output.itemId === itemId);
  if (recipe) {
    let guard = 0;
    const perCraft = recipe.output.qty || 1;
    while (countItem(state, itemId) < qty && guard < Math.ceil(qty / perCraft) + 3) {
      guard++;
      if (!craftOnce(recipe.id, depth + 1)) break;
    }
    if (countItem(state, itemId) >= qty) return true;
  }

  const key = `${itemId}`;
  if (!itemSourceFailNotes.has(key)) {
    itemSourceFailNotes.add(key);
    blocker(`No obtainable source found for item '${itemId}' (needed x${qty}, have ${countItem(state, itemId)}). Checked shops, monster drops, gather nodes and recipes.`);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Inventory / gear maintenance
// ---------------------------------------------------------------------------

function itemScore(inst: ItemInstance): number {
  const s = getItemStats(inst);
  let score = 0;
  score += (s.attack ?? 0) * 3 + (s.magicAttack ?? 0) * 3 + (s.defense ?? 0) * 2;
  score += (s.maxHp ?? 0) * 0.08 + (s.maxMp ?? 0) * 0.05;
  score += (s.critRate ?? 0) * 400 + (s.critDamage ?? 0) * 250 + (s.damagePct ?? 0) * 400 + (s.bossDamagePct ?? 0) * 300;
  score += (s.str ?? 0) + (s.dex ?? 0) + (s.int ?? 0) + (s.luk ?? 0);
  score += (s.speed ?? 0) * 2 + (s.jump ?? 0) * 2 + (s.hpRegen ?? 0) + (s.mpRegen ?? 0);
  score += (s.xpBonus ?? 0) * 300 + (s.goldBonus ?? 0) * 100 + (s.dropBonus ?? 0) * 200 + (s.avoid ?? 0) * 200;
  return score;
}

function maintainEquip() {
  for (const slot of EQUIP_SLOTS) {
    const equipped = state.equipment[slot];
    let best: ItemInstance | null = equipped ?? null;
    let bestScore = equipped ? itemScore(equipped) : -1;
    for (const inst of state.inventory.equip) {
      if (!inst || ITEMS[inst.itemId]?.equip?.slot !== slot) continue;
      if (!canEquip(state, inst).ok) continue;
      const sc = itemScore(inst);
      if (sc > bestScore) { best = inst; bestScore = sc; }
    }
    if (best && best.uid !== equipped?.uid) {
      const res = dispatch({ type: 'equip', uid: best.uid }, best.itemId);
      if (!res.ok) note(`Could not equip upgrade '${best.itemId}': ${res.error}`);
    }
  }
}

function sellSpareEquip() {
  const equippedUids = new Set(Object.values(state.equipment).map((i) => i?.uid));
  for (const inst of [...state.inventory.equip]) {
    if (!inst || equippedUids.has(inst.uid)) continue;
    const def = ITEMS[inst.itemId];
    if (def?.quest) continue;
    dispatch({ type: 'sell', uid: inst.uid }, inst.itemId);
  }
}

function freeInventorySpace() {
  sellSpareEquip();
  // If 'etc'/'use' tabs are jammed with materials, trim the least valuable stack a little.
  for (const tab of ['etc', 'use'] as const) {
    const arr = state.inventory[tab];
    if (arr.every((s) => s !== null)) {
      let worstIdx = -1; let worstVal = Infinity;
      arr.forEach((s, i) => {
        if (!s) return;
        const def = ITEMS[s.itemId];
        if (def?.quest) return;
        const v = (def?.sellPrice ?? 0) * s.qty;
        if (v < worstVal) { worstVal = v; worstIdx = i; }
      });
      if (worstIdx >= 0) dispatch({ type: 'discardItem', uid: arr[worstIdx]!.uid, qty: Math.ceil(arr[worstIdx]!.qty / 2) }, 'free-space');
    }
  }
}

function maintainAfterAction() {
  if (state.ap > 0) {
    const job = JOBS[state.classId];
    dispatch({ type: 'allocateStat', stat: job.mainStat, amount: state.ap }, 'AP');
  }
  let guard = 0;
  while (state.sp > 0 && guard < 40) {
    guard++;
    const ids = availableSkillIds(state);
    let learned = false;
    for (const sid of ids) {
      if (skillLearnCheck(state, sid).ok) {
        const res = dispatch({ type: 'learnSkill', skillId: sid }, sid);
        if (res.ok) { learned = true; break; }
      }
    }
    if (!learned) break;
  }
  maintainEquip();
}

// ---------------------------------------------------------------------------
// Quest resolution
// ---------------------------------------------------------------------------

function pickChooseOne(items: { itemId: string }[]): number {
  const idx = items.findIndex((it) => {
    const def = ITEMS[it.itemId];
    return !def?.classReq || def.classReq.includes(state.classId);
  });
  return idx >= 0 ? idx : 0;
}

function choiceIdFor(quest: QuestDef): string | undefined {
  if (!quest.choices) return undefined;
  switch (quest.id) {
    case 'mq_08_two_currents': return strategy.faction;
    case 'mq_12_kraelith': return strategy.kraelith;
    case 'mq_16_captain': return strategy.rook;
    case 'mq_19_heart': {
      // Fall back gracefully if the intended ending isn't actually reachable (reqs not met) —
      // that in itself would be worth reporting.
      const wanted = quest.choices.find((c) => c.id === strategy.finalEnding);
      if (wanted && (!wanted.reqs || checkConditions(state, wanted.reqs))) return strategy.finalEnding;
      blocker(`Intended ending '${strategy.finalEnding}' is locked at mq_19_heart (reqs: ${JSON.stringify(wanted?.reqs)}) — falling back to 'purify'.`);
      return 'purify';
    }
    case 'jq_vanguard': case 'jq_stormcaller': case 'jq_windrunner': case 'jq_shade':
      return strategy.jobAdvance;
    case 'sq_driftmoor_wren_kite': return 'kite_honest';
    case 'sq_driftmoor_locket': return 'locket_return';
    case 'sq_stormbreak_whalecalf_pearl': return 'pearl_return';
    case 'sq_lanternreef_ghost_letter': return 'letter_deliver';
    case 'sq_lanternreef_sailors_ring': return 'ring_return';
    case 'sq_hollow_wraith_choice': return 'wraith_free';
    default: return quest.choices[0].id;
  }
}

function craftObjective(def: QuestDef, i: number, obj: Extract<QuestDef['objectives'][number], { type: 'craft' }>) {
  const professionId = obj.professionId ?? (obj.itemId ? RECIPES[Object.values(RECIPES).find((r) => r.output.itemId === obj.itemId)?.id ?? '']?.profession : undefined)
    ?? NPCS[def.giver]?.profession;
  if (!professionId) { blocker(`Quest '${def.id}': craft objective has no resolvable profession.`); return; }
  ensureProfessionLearned(professionId);
  let guard = 0;
  while (!objDone(def.id, i) && guard < obj.count * 5 + 20) {
    guard++;
    let recipeId: string | undefined;
    if (obj.itemId) recipeId = Object.values(RECIPES).find((r) => r.output.itemId === obj.itemId)?.id;
    else recipeId = cheapestKnownOrAutoRecipe(professionId, (state.professions as any)[professionId]?.level ?? 1) ?? undefined;
    if (!recipeId) { blocker(`Quest '${def.id}': no craftable recipe found for craft objective (profession '${professionId}').`); return; }
    if (!craftOnce(recipeId, 0)) break;
  }
  if (!objDone(def.id, i)) note(`Could not fully satisfy craft objective on quest '${def.id}' (profession '${professionId}' may be beyond the ${MAX_CRAFTING_PROFESSIONS}-profession cap this run) — skipping.`);
}

function gatherObjective(def: QuestDef, i: number, obj: Extract<QuestDef['objectives'][number], { type: 'gather' }>) {
  const nodeIds = obj.nodeId ? [obj.nodeId] : Object.values(GATHER_NODES).filter((n) => n.profession === obj.professionId).map((n) => n.id);
  let guard = 0;
  while (!objDone(def.id, i) && guard < obj.count * 30 + 60) {
    guard++;
    let did = false;
    for (const nid of nodeIds) {
      const maps = (gatherMapIds[nid] ?? []).filter(isReachable);
      const profOk = ((state.professions as any)[GATHER_NODES[nid]?.profession]?.level ?? 0) >= (GATHER_NODES[nid]?.level ?? 0);
      if (!maps.length || !profOk) continue;
      for (const mapId of maps) {
        navigateTo(mapId);
        const key = `${mapId}:${nid}`;
        if (ctx.now < (ctx.session.nodeCooldowns[key] ?? 0)) continue;
        did = gatherOnce(nid, mapId) || did;
        if (did) break;
      }
      if (did) break;
    }
    if (!did) {
      const readyTimes = nodeIds.flatMap((nid) => (gatherMapIds[nid] ?? []).filter(isReachable).map((m) => ctx.session.nodeCooldowns[`${m}:${nid}`] ?? ctx.now));
      const minReady = readyTimes.length ? Math.min(...readyTimes) : Infinity;
      if (!isFinite(minReady) || minReady <= ctx.now) { blocker(`Quest '${def.id}': gather objective (node(s) ${nodeIds.join(',') || obj.professionId}) has no reachable/usable node.`); return; }
      ctx.now = minReady;
    }
  }
}

function enhanceObjective(stars: number) {
  ensureItemQty('mat_enhance_stone_1', 5, 0);
  const candidates = [...Object.values(state.equipment), ...state.inventory.equip].filter((i): i is ItemInstance => !!i && !!ITEMS[i.itemId]?.equip);
  const inst = candidates[0];
  if (!inst) { blocker('Enhance objective: no equipment item available to enhance.'); return; }
  let tries = 0;
  while ((inst.stars ?? 0) < stars && tries < 60) {
    tries++;
    if (countItem(state, 'mat_enhance_stone_1') < 1) ensureItemQty('mat_enhance_stone_1', 3, 0);
    const res = dispatch({ type: 'enhance', uid: inst.uid, stoneItemId: 'mat_enhance_stone_1' }, inst.itemId);
    if (!res.ok) { blocker(`enhance failed: ${res.error}`); return; }
  }
}

function satisfyObjective(def: QuestDef, i: number) {
  const obj = def.objectives[i];
  switch (obj.type) {
    case 'visit': navigateTo(obj.mapId); break;
    case 'talk': {
      const mapId = npcMapId[obj.npcId];
      if (!mapId) { blocker(`NPC '${obj.npcId}' (talk objective in '${def.id}') is not placed on any map.`); break; }
      navigateTo(mapId);
      if (obj.npcId === 'npc_poacher_defector' && state.flags.jory === undefined) {
        dispatch({ type: 'dialogueAction', npcId: obj.npcId, action: { type: 'setFlag', flag: 'jory', value: strategy.jorySpare ? 'spared' : 'turned_in' } }, 'jory-choice');
      }
      dispatch({ type: 'talk', npcId: obj.npcId }, obj.npcId);
      break;
    }
    case 'boss': {
      const mapId = bossMapId[obj.monsterId];
      if (!mapId) { blocker(`Boss '${obj.monsterId}' (quest '${def.id}') has no boss placement on any map.`); break; }
      if (!isReachable(mapId)) { blocker(`Boss arena '${mapId}' for '${obj.monsterId}' is not reachable.`); break; }
      navigateTo(mapId);
      let tries = 0;
      while (!objDone(def.id, i) && tries < 5) { killOnce(obj.monsterId, mapId); tries++; }
      break;
    }
    case 'kill': {
      const mapId = findKillMap(obj.monsterId);
      if (!mapId) break;
      killLoop(obj.monsterId, mapId, () => objDone(def.id, i), obj.count * 40 + 40);
      if (!objDone(def.id, i)) blocker(`Quest '${def.id}': could not reach kill count for '${obj.monsterId}' after generous retries.`);
      break;
    }
    case 'collect': ensureItemQty(obj.itemId, obj.count, 0); break;
    case 'craft': craftObjective(def, i, obj); break;
    case 'gather': gatherObjective(def, i, obj); break;
    case 'enhance': enhanceObjective(obj.stars); break;
    case 'learnProfession': {
      const profId = strategy.professions.find((p) => !(state.professions as any)[p]) ?? strategy.professions[0];
      ensureProfessionLearned(profId);
      break;
    }
    case 'level': grindToLevel(obj.level); break;
    default: break;
  }
}

const attemptedQuests = new Set<string>();

/** Full accept -> satisfy -> turn-in cycle for one quest. Returns true on success. */
function processQuest(questId: string): boolean {
  const def = QUESTS[questId];
  if (!def) { blocker(`Quest '${questId}' does not exist.`); return false; }
  const st = getQuestState(state, questId);
  if (st === 'completed' && !def.repeatable) return true;
  if (st === 'active' || st === 'ready') { /* resume below */ } else {
    if (attemptedQuests.has(questId)) return false; // already failed once this run
    // Grind for a level requirement, if that's the only thing blocking reqs.
    const levelReq = def.reqs.find((r): r is Extract<Condition, { type: 'level' }> => r.type === 'level' && r.min !== undefined);
    if (levelReq && state.level < levelReq.min!) grindToLevel(levelReq.min!);
    if (!checkConditions(state, def.reqs)) {
      // Non-level reqs unmet (quest chain / flag / profession / reputation): only a real problem for main quests.
      if (def.type === 'main') blocker(`Main quest '${def.id}' reqs not met even after leveling: ${JSON.stringify(def.reqs)}`);
      attemptedQuests.add(questId);
      return false;
    }
    const giverMap = npcMapId[def.giver];
    if (!giverMap) { blocker(`Quest giver '${def.giver}' for '${def.id}' is not placed on any map.`); attemptedQuests.add(questId); return false; }
    if (!navigateTo(giverMap)) { attemptedQuests.add(questId); return false; }
    const acc = dispatch({ type: 'acceptQuest', questId }, def.id);
    if (!acc.ok) { blocker(`acceptQuest '${def.id}' failed: ${acc.error}`); attemptedQuests.add(questId); return false; }
  }

  let guard = 0;
  while (getQuestState(state, questId) !== 'ready' && guard < def.objectives.length * 3 + 10) {
    guard++;
    const idx = def.objectives.findIndex((_, i) => !objDone(questId, i));
    if (idx === -1) break;
    satisfyObjective(def, idx);
  }
  if (getQuestState(state, questId) !== 'ready') {
    blocker(`Quest '${def.id}' could not be completed (objectives stuck after generous retries).`);
    attemptedQuests.add(questId);
    return false;
  }

  const turnInMap = npcMapId[def.turnIn ?? def.giver];
  if (turnInMap) navigateTo(turnInMap);
  const choiceId = choiceIdFor(def);
  const chooseIndex = !choiceId && def.rewards.chooseOne ? pickChooseOne(def.rewards.chooseOne) : undefined;
  const res = dispatch({ type: 'completeQuest', questId, choiceId, chooseIndex }, def.id);
  if (!res.ok) { blocker(`completeQuest '${def.id}' failed: ${res.error}`); attemptedQuests.add(questId); return false; }
  timeMs += 25_000;
  maintainAfterAction();
  return true;
}

// ---------------------------------------------------------------------------
// Main story order (ids are binding per DESIGN.md §6)
// ---------------------------------------------------------------------------

const MAIN_ORDER = [
  'mq_01_welcome', 'mq_02_tremors', 'mq_03_strange_growth', 'mq_04_into_the_grotto', 'mq_05_king_barnacle',
  'mq_06_the_scholar', 'mq_07_kelp_sickness', 'mq_08_two_currents', 'mq_09_poacher_camp',
  // mq_09b inserted dynamically if Jory was spared
  'mq_10_old_tangle', 'mq_11_updraft', 'mq_11b_skyships_down', 'mq_12_kraelith',
  'mq_13_glowtide', 'mq_14_lamplighter', 'mq_15_logbook', 'mq_16_captain',
  'mq_17_inside', 'mq_18_echoes', 'mq_19_heart', 'mq_20_epilogue',
];

function tryOpportunisticQuests() {
  const pool = Object.values(QUESTS).filter((q) => q.type !== 'main' && q.type !== 'daily');
  for (const q of pool) {
    if (attemptedQuests.has(q.id)) continue;
    const st = getQuestState(state, q.id);
    if (st !== 'notStarted') continue;
    if (q.level > state.level + 3) continue; // don't chase content far above our level
    if (!checkConditions(state, q.reqs)) continue;
    processQuest(q.id);
  }
  // A daily each, once, for coverage.
  for (const q of Object.values(QUESTS).filter((q) => q.type === 'daily')) {
    if (attemptedQuests.has(q.id)) continue;
    if (getQuestState(state, q.id) !== 'notStarted') continue;
    if (q.level > state.level + 3) continue;
    if (!checkConditions(state, q.reqs)) continue;
    processQuest(q.id);
  }
}

console.log(`=== Driftwake headless playthrough — class '${classId}' (${JSON.stringify(strategy)}) ===`);

for (const qid of MAIN_ORDER) {
  const ok = processQuest(qid);
  if (ok) {
    mainQuestLog.push({ id: qid, level: state.level, kills: totalKills, minutes: Math.round(timeMs / 6000) / 10 });
    console.log(`  [OK] ${qid} — level ${state.level}, kills ${totalKills}, ~${(timeMs / 60000).toFixed(1)} min elapsed`);
  } else {
    console.log(`  [FAIL] ${qid} — aborting main story chain here.`);
    break;
  }

  if (qid === 'mq_09_poacher_camp' && state.flags.jory === 'spared') {
    const ok2 = processQuest('mq_09b_jorys_fate');
    if (ok2) { mainQuestLog.push({ id: 'mq_09b_jorys_fate', level: state.level, kills: totalKills, minutes: Math.round(timeMs / 6000) / 10 }); console.log(`  [OK] mq_09b_jorys_fate — level ${state.level}, kills ${totalKills}`); }
  }

  // Job advancement, once eligible.
  if (state.level >= 15 && state.jobId === state.classId) {
    processQuest(`jq_${classId}_1`);
    processQuest(`jq_${classId}`);
  }

  // Bonus content, bounded, so the reducer's non-main systems (crafting/gathering/enhance/dialogue
  // choices/day quests) get exercised too.
  try { tryOpportunisticQuests(); } catch (e) { blocker(`Exception while running opportunistic side content: ${(e as Error).message}`); }
}

// One last opportunistic pass at the final level.
try { tryOpportunisticQuests(); } catch (e) { blocker(`Exception in final opportunistic pass: ${(e as Error).message}`); }

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('\n=== PACING TABLE (main story) ===');
console.log('quest,level,cumulative_kills,cumulative_minutes');
for (const row of mainQuestLog) console.log(`${row.id},${row.level},${row.kills},${row.minutes}`);

const finishedMain = mainQuestLog.some((r) => r.id === 'mq_19_heart');
const itemCount = Object.values(state.inventory).reduce((n, tab) => n + tab.filter((s) => s).length, 0) + Object.values(state.equipment).filter(Boolean).length;

console.log('\n=== FINAL STATE ===');
console.log(`class: ${classId} (job: ${state.jobId})`);
console.log(`finished mq_19_heart: ${finishedMain}`);
console.log(`final level: ${state.level}`);
console.log(`total kills: ${totalKills}`);
console.log(`gold: ${state.gold}`);
console.log(`items held (slots used): ${itemCount}`);
console.log(`professions: ${JSON.stringify(state.professions)}`);
console.log(`known recipes: ${state.knownRecipes.length}`);
console.log(`titles: ${JSON.stringify(state.titles)}`);
console.log(`ending flag: ${state.flags.ending ?? '(none)'}`);
console.log(`faction flag: ${state.flags.faction ?? '(none)'} rep: ${JSON.stringify(state.reputation)}`);
console.log(`estimated total playtime: ${(timeMs / 60000).toFixed(1)} minutes`);
console.log(`quests completed total: ${Object.values(state.quests).filter((q) => q.state === 'completed').length} / attempted ${attemptedQuests.size + mainQuestLog.length}`);

console.log(`\n=== BLOCKERS (${blockers.length}) ===`);
for (const b of blockers) console.log(`- ${b}`);
console.log(`\n=== NOTES (${notes.length}) ===`);
for (const n of notes) console.log(`- ${n}`);

console.log('\n=== SUMMARY ===');
console.log(`${classId}: ${finishedMain ? 'COMPLETED' : 'DID NOT COMPLETE'} main story. Final level ${state.level}. ${blockers.length} blocker(s). ~${(timeMs / 60000).toFixed(1)} min.`);
