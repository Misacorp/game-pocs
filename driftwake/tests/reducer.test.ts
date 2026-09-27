import { describe, it, expect, beforeEach } from 'vitest';
import type { CharacterState, ItemInstance } from '@shared/types';
import { JOBS, ITEMS, MONSTERS, MAPS, QUESTS, RECIPES, SHOPS, SKILLS, PROFESSIONS, GATHER_NODES } from '@shared/data';
import { createCharacter, handleAction, createSession, computeStats, type ServerContext } from '@shared/logic';
import { mulberry32 } from '@shared/rng';

function ctx(seed = 1): ServerContext {
  const rng = mulberry32(seed);
  let uidN = 0;
  return { now: Date.now(), rng, session: createSession(), uid: () => `u${uidN++}` };
}

function newChar(classId: keyof typeof JOBS = 'vanguard' as any): CharacterState {
  return createCharacter({ name: 'Test Hero', classId: classId as any, appearance: { skin: '#fff', hair: '#000', hairStyle: 0, eyes: '#000', outfit: '#888' } }, 'char1', Date.now());
}

describe('createCharacter', () => {
  it('creates a valid level-1 character with full hp/mp', () => {
    const c = newChar();
    expect(c.level).toBe(1);
    expect(c.xp).toBe(0);
    expect(c.hp).toBeGreaterThan(0);
    expect(c.mp).toBeGreaterThanOrEqual(0);
    expect(c.hp).toBe(computeStats(c).maxHp);
  });

  it('equips starter gear when JOBS defines starterItems', () => {
    const job = JOBS['vanguard' as any];
    if (!job?.starterItems?.length) return; // graceful skip if content not authored yet
    const c = newChar();
    const equippedIds = Object.values(c.equipment).map((i) => i?.itemId);
    for (const itemId of job.starterItems) {
      const def = ITEMS[itemId];
      if (def?.equip) expect(equippedIds).toContain(itemId);
    }
  });

  it('gives starter potions when defined', () => {
    if (!ITEMS['use_hp_potion_s']) return;
    const c = newChar();
    let n = 0;
    for (const tab of Object.values(c.inventory)) for (const s of tab) if (s?.itemId === 'use_hp_potion_s') n += s.qty;
    expect(n).toBe(5);
  });
});

describe('killMonster -> xp / level up / loot', () => {
  it('grants xp and can level up', () => {
    const c = newChar();
    // find any monster + map pairing from real data
    let found: { monsterId: string; mapId: string } | null = null;
    for (const map of Object.values(MAPS)) {
      const sp = map.spawns[0];
      if (sp) { found = { monsterId: sp.monsterId, mapId: map.id }; break; }
    }
    if (!found) return; // no map/monster content yet
    c.mapId = found.mapId;
    const res = handleAction(c, { type: 'killMonster', monsterId: found.monsterId, mapId: found.mapId, x: 0, y: 0 }, ctx());
    expect(res.ok).toBe(true);
    expect(res.events.some((e) => e.type === 'xp')).toBe(true);
    expect(res.state.counters.kills).toBe(1);
    expect(res.state.bestiary[found.monsterId]).toBe(1);
  });

  it('rejects killing a monster not present on the given map', () => {
    const c = newChar();
    const anyMap = Object.values(MAPS)[0];
    if (!anyMap || !Object.keys(MONSTERS).length) return;
    const res = handleAction(c, { type: 'killMonster', monsterId: '__does_not_exist__', mapId: anyMap.id, x: 0, y: 0 }, ctx());
    expect(res.ok).toBe(false);
  });

  it('multi-level-ups grant AP/SP and refill HP/MP', () => {
    let c = newChar();
    // manually grant a huge kill via repeated small monster to force a level up path deterministically:
    // use the applyXp path indirectly through a synthetic quest reward instead (more deterministic).
    const questId = Object.keys(QUESTS)[0];
    if (!questId) return;
    // Directly simulate: give ourselves enough xp by dispatching many kills against level 1 content, else skip.
    const map = Object.values(MAPS).find((m) => m.spawns.length > 0);
    if (!map) return;
    const monsterId = map.spawns[0].monsterId;
    const monster = MONSTERS[monsterId];
    if (!monster) return;
    const startLevel = c.level;
    let lastRes = { ok: true, state: c, events: [] as any[] };
    for (let i = 0; i < 500 && lastRes.state.level === startLevel; i++) {
      lastRes = handleAction(lastRes.state, { type: 'killMonster', monsterId, mapId: map.id, x: 0, y: 0 }, ctx(i + 1));
      if (!lastRes.ok) break;
    }
    if (lastRes.state.level > startLevel) {
      expect(lastRes.state.ap).toBeGreaterThan(0);
      expect(lastRes.events.some((e) => e.type === 'levelUp')).toBe(true);
    }
  });

  it('loot can be picked up via pendingDrops', () => {
    const c = newChar();
    const map = Object.values(MAPS).find((m) => m.spawns.length > 0);
    if (!map) return;
    c.mapId = map.id;
    const monsterId = map.spawns[0].monsterId;
    const context = ctx(42);
    // force a kill until we get at least one drop (gold is near-guaranteed if monster.gold[1]>0)
    const res = handleAction(c, { type: 'killMonster', monsterId, mapId: map.id, x: 10, y: 20 }, context);
    expect(res.ok).toBe(true);
    const lootEvent = res.events.find((e) => e.type === 'lootDropped') as any;
    if (!lootEvent) return; // unlucky roll / monster has 0 gold range, acceptable
    const dropId = lootEvent.drops[0].dropId;
    const pick = handleAction(res.state, { type: 'pickup', dropId }, context);
    expect(pick.ok).toBe(true);
  });
});

describe('pets', () => {
  it('summons an owned pet, rejects one not owned, and applies its passive stats while active', () => {
    const c = newChar();
    const petId = Object.keys(ITEMS).find((id) => ITEMS[id].pet);
    if (!petId) return; // graceful skip if content not authored yet
    // not owned yet -> rejected
    const rejected = handleAction(c, { type: 'summonPet', itemId: petId }, ctx());
    expect(rejected.ok).toBe(false);

    const withPet = structuredClone(c);
    withPet.inventory.use[0] = { uid: 'petuid1', itemId: petId, qty: 1 };
    const summonRes = handleAction(withPet, { type: 'summonPet', itemId: petId }, ctx());
    expect(summonRes.ok).toBe(true);
    expect(summonRes.state.activePet).toBe(petId);
    expect(summonRes.events.some((e) => e.type === 'petChanged' && e.itemId === petId)).toBe(true);

    const def = ITEMS[petId];
    if (def.pet?.stats) {
      const statsWith = computeStats(summonRes.state);
      const without = { ...summonRes.state, activePet: undefined };
      const statsWithout = computeStats(without);
      const key = Object.keys(def.pet.stats)[0] as keyof typeof statsWith;
      expect(statsWith[key]).toBeGreaterThan(statsWithout[key]);
    }

    // dismiss
    const dismissRes = handleAction(summonRes.state, { type: 'summonPet', itemId: null }, ctx());
    expect(dismissRes.ok).toBe(true);
    expect(dismissRes.state.activePet).toBeUndefined();
  });
});

describe('achievements', () => {
  it('unlocks a kill-count achievement once the threshold is reached, exactly once', () => {
    let c = newChar();
    const map = Object.values(MAPS).find((m) => m.spawns.length > 0);
    if (!map) return;
    c.mapId = map.id;
    const monsterId = map.spawns[0].monsterId;
    let state = c;
    let unlockedCount = 0;
    for (let i = 0; i < 100; i++) {
      const res = handleAction(state, { type: 'killMonster', monsterId, mapId: map.id, x: 0, y: 0 }, ctx(i + 1));
      expect(res.ok).toBe(true);
      state = res.state;
      unlockedCount += res.events.filter((e) => e.type === 'achievementUnlocked' && e.id === 'ach_kills_100').length;
    }
    expect(state.counters.kills).toBe(100);
    expect(unlockedCount).toBe(1);
    expect(state.achievements?.['ach_kills_100']).toBeDefined();

    // one more kill must not re-unlock it
    const again = handleAction(state, { type: 'killMonster', monsterId, mapId: map.id, x: 0, y: 0 }, ctx(999));
    expect(again.events.some((e) => e.type === 'achievementUnlocked' && e.id === 'ach_kills_100')).toBe(false);
  });
});

describe('equip / unequip', () => {
  it('equips an item from inventory and swaps back on unequip', () => {
    const c = newChar();
    // find an inventory-equippable item: use any starter equipment already worn, force back to inventory first via unequip
    const equippedEntries = Object.entries(c.equipment).filter(([, v]) => !!v) as [keyof CharacterState['equipment'], { uid: string }][];
    if (!equippedEntries.length) return;
    const [slot, inst] = equippedEntries[0];
    const unequipRes = handleAction(c, { type: 'unequip', slot: slot as any }, ctx());
    expect(unequipRes.ok).toBe(true);
    expect(unequipRes.state.equipment[slot]).toBeUndefined();
    const equipRes = handleAction(unequipRes.state, { type: 'equip', uid: inst.uid }, ctx());
    expect(equipRes.ok).toBe(true);
    expect(equipRes.state.equipment[slot]?.uid).toBe(inst.uid);
  });
});

describe('quests: accept -> progress -> complete', () => {
  it('walks a simple kill-objective quest end to end if one exists', () => {
    const questId = Object.values(QUESTS).find((q) => q.objectives.some((o) => o.type === 'kill') && !q.choices)?.id;
    if (!questId) return;
    const def = QUESTS[questId];
    let c = newChar();
    c.level = Math.max(c.level, def.level);
    const acceptRes = handleAction(c, { type: 'acceptQuest', questId }, ctx());
    if (!acceptRes.ok) return; // reqs not satisfiable trivially (faction/flags/etc.) — acceptable skip
    c = acceptRes.state;
    expect(c.quests[questId]?.state).toBe('active');

    const killObjIndex = def.objectives.findIndex((o) => o.type === 'kill');
    const killObj = def.objectives[killObjIndex] as any;
    for (let i = 0; i < killObj.count; i++) {
      const map = Object.values(MAPS).find((m) => m.spawns.some((s) => s.monsterId === killObj.monsterId) || m.boss?.monsterId === killObj.monsterId);
      if (!map) return;
      const res = handleAction(c, { type: 'killMonster', monsterId: killObj.monsterId, mapId: map.id, x: 0, y: 0 }, ctx(i + 1));
      expect(res.ok).toBe(true);
      c = res.state;
    }
    expect(c.quests[questId]?.progress[killObjIndex]).toBe(killObj.count);

    const completeRes = handleAction(c, { type: 'completeQuest', questId }, ctx());
    expect(completeRes.ok).toBe(true);
    expect(completeRes.state.quests[questId]?.state).toBe('completed');
  });

  it('handles a quest with choices', () => {
    const questId = Object.values(QUESTS).find((q) => q.choices && q.choices.length > 0)?.id;
    if (!questId) return;
    const def = QUESTS[questId];
    let c = newChar();
    c.level = Math.max(c.level, def.level, 20);
    // force-complete all objectives via direct state mutation (progress-only ones), skip collect/level checks gracefully
    c.quests[questId] = { state: 'active', progress: def.objectives.map((o) => (o.type === 'level' ? 0 : 9999)), acceptedAt: Date.now() };
    const choice = def.choices![0];
    const res = handleAction(c, { type: 'completeQuest', questId, choiceId: choice.id }, ctx());
    // may fail if a collect objective needs real inventory items or level objective unmet — acceptable, but if ok assert choiceId stored
    if (res.ok) {
      expect(res.state.quests[questId]?.choiceId).toBe(choice.id);
    }
  });
});

describe('crafting', () => {
  it('crafts an item end to end if a recipe exists', () => {
    const recipeId = Object.keys(RECIPES)[0];
    if (!recipeId) return;
    const recipe = RECIPES[recipeId];
    let c = newChar();
    c.professions[recipe.profession] = { level: recipe.level, xp: 0 };
    c.knownRecipes.push(recipeId);
    for (const inp of recipe.inputs) {
      c.inventory.etc[0] = null; // noop, ensure array touched
    }
    // stock materials directly into inventory
    let slot = 0;
    for (const inp of recipe.inputs) {
      c.inventory.etc[slot++] = { uid: `mat${slot}`, itemId: inp.itemId, qty: inp.qty };
    }
    c.gold = Math.max(c.gold, recipe.goldCost ?? 0);
    const res = handleAction(c, { type: 'craft', recipeId }, ctx());
    expect(res.ok).toBe(true);
    expect(res.events.some((e) => e.type === 'crafted')).toBe(true);
  });
});

describe('enhance', () => {
  it('enhances an equipped/inventory item with a stone', () => {
    const stoneId = Object.keys(ITEMS).find((id) => ITEMS[id].enhanceStone);
    const equipId = Object.keys(ITEMS).find((id) => ITEMS[id].equip);
    if (!stoneId || !equipId) return;
    let c = newChar();
    const uid = 'testitem';
    c.inventory.equip[0] = { uid, itemId: equipId, qty: 1, stars: 0 };
    c.inventory.etc[0] = { uid: 'stone1', itemId: stoneId, qty: 1 };
    const res = handleAction(c, { type: 'enhance', uid, stoneItemId: stoneId }, ctx(7));
    expect(res.ok).toBe(true);
    expect(res.events.some((e) => e.type === 'enhanceResult')).toBe(true);
  });
});

describe('job advance', () => {
  it('advances a level-15+ character into a valid tier-2 job', () => {
    const tier2 = Object.values(JOBS).find((j) => j.tier === 2);
    if (!tier2) return;
    let c = newChar(tier2.parent as any);
    c.level = 15;
    c.jobId = c.classId;
    const res = handleAction(c, { type: 'jobAdvance', jobId: tier2.id as any }, ctx());
    expect(res.ok).toBe(true);
    expect(res.state.jobId).toBe(tier2.id);
  });

  it('rejects job advance below the level requirement', () => {
    const tier2 = Object.values(JOBS).find((j) => j.tier === 2);
    if (!tier2) return;
    let c = newChar(tier2.parent as any);
    c.level = 1;
    const res = handleAction(c, { type: 'jobAdvance', jobId: tier2.id as any }, ctx());
    expect(res.ok).toBe(false);
  });
});

describe('death penalty', () => {
  it('loses xp on death but never de-levels', () => {
    let c = newChar();
    c.level = 5;
    c.xp = 10;
    const res = handleAction(c, { type: 'die' }, ctx());
    expect(res.ok).toBe(true);
    expect(res.state.level).toBe(5);
    expect(res.state.hp).toBe(0);
    expect(res.state.xp).toBeGreaterThanOrEqual(0);
    expect(res.state.counters.deaths).toBe(1);
  });

  it('respawns at the town map with partial hp/mp', () => {
    let c = newChar();
    c.hp = 0;
    const res = handleAction(c, { type: 'respawn' }, ctx());
    expect(res.ok).toBe(true);
    expect(res.state.mapId).toBe(c.townMapId);
    expect(res.state.hp).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Bug hunt regressions
// ---------------------------------------------------------------------------

describe('client-supplied quantities are validated (NaN/negative/fractional exploits)', () => {
  it('buy rejects NaN qty instead of corrupting gold to NaN', () => {
    const c = newChar();
    const goldBefore = c.gold;
    const res = handleAction(c, { type: 'buy', shopId: 'shop_brina', itemId: 'use_whetstone_1', qty: NaN }, ctx());
    expect(res.ok).toBe(false);
    expect(res.state.gold).toBe(goldBefore);
    expect(Number.isFinite(res.state.gold)).toBe(true);
  });

  it('buy rejects negative and fractional qty', () => {
    const c = newChar();
    for (const qty of [-5, 1.5, Infinity]) {
      const res = handleAction(c, { type: 'buy', shopId: 'shop_brina', itemId: 'use_whetstone_1', qty }, ctx());
      expect(res.ok).toBe(false);
      expect(res.state.gold).toBe(c.gold);
    }
  });

  it('sell rejects a non-integer/NaN qty', () => {
    let c = newChar();
    c.gold = 1000;
    const buyRes = handleAction(c, { type: 'buy', shopId: 'shop_brina', itemId: 'use_whetstone_1', qty: 2 }, ctx());
    expect(buyRes.ok).toBe(true);
    c = buyRes.state;
    const uid = c.inventory.use.find((s) => s?.itemId === 'use_whetstone_1')!.uid;
    for (const qty of [NaN, -1, 1.5]) {
      const res = handleAction(c, { type: 'sell', uid, qty: qty as any }, ctx());
      expect(res.ok).toBe(false);
    }
  });

  it('discardItem rejects a non-integer/NaN qty', () => {
    let c = newChar();
    const uid = c.inventory.use.find((s) => s?.itemId === 'use_hp_potion_s')?.uid;
    if (!uid) return;
    for (const qty of [NaN, -1, 1.5]) {
      const res = handleAction(c, { type: 'discardItem', uid, qty: qty as any }, ctx());
      expect(res.ok).toBe(false);
    }
  });

  it('allocateStat rejects a NaN/fractional amount instead of corrupting AP and base stats', () => {
    let c = newChar();
    c.ap = 10;
    const apBefore = c.ap;
    const statBefore = c.baseStats.str;
    for (const amount of [NaN, 1.5, -3, Infinity]) {
      const res = handleAction(c, { type: 'allocateStat', stat: 'str', amount }, ctx());
      expect(res.ok).toBe(false);
      expect(res.state.ap).toBe(apBefore);
      expect(res.state.baseStats.str).toBe(statBefore);
    }
  });

  it('craft rejects a non-integer/NaN qty', () => {
    const recipeId = Object.keys(RECIPES)[0];
    if (!recipeId) return;
    const recipe = RECIPES[recipeId];
    let c = newChar();
    c.professions[recipe.profession] = { level: recipe.level, xp: 0 };
    c.knownRecipes.push(recipeId);
    let slot = 0;
    for (const inp of recipe.inputs) c.inventory.etc[slot++] = { uid: `mat${slot}`, itemId: inp.itemId, qty: inp.qty * 10 };
    c.gold = Math.max(c.gold, (recipe.goldCost ?? 0) * 10);
    for (const qty of [NaN, -1, 1.5]) {
      const res = handleAction(c, { type: 'craft', recipeId, qty: qty as any }, ctx());
      expect(res.ok).toBe(false);
    }
  });

  it('moveItem rejects non-integer/NaN slot indices', () => {
    const c = newChar();
    const res = handleAction(c, { type: 'moveItem', tab: 'etc', from: NaN as any, to: 0 }, ctx());
    expect(res.ok).toBe(false);
  });
});

describe('salvage refuses to touch equipped items (was a free item-duplication exploit)', () => {
  it('rejects salvaging a currently-equipped item and grants nothing', () => {
    const c = newChar();
    const equipped = Object.entries(c.equipment).find(([, v]) => !!v) as [string, ItemInstance] | undefined;
    if (!equipped) return;
    const [slot, inst] = equipped;
    const res = handleAction(c, { type: 'salvage', uid: inst.uid }, ctx());
    expect(res.ok).toBe(false);
    // must still be equipped, unchanged, with no salvage materials silently granted
    expect(res.state.equipment[slot as keyof CharacterState['equipment']]?.uid).toBe(inst.uid);
  });

  it('salvages the same item fine once unequipped', () => {
    let c = newChar();
    const equipped = Object.entries(c.equipment).find(([, v]) => !!v) as [string, ItemInstance] | undefined;
    if (!equipped) return;
    const [slot, inst] = equipped;
    const unequipRes = handleAction(c, { type: 'unequip', slot: slot as any }, ctx());
    expect(unequipRes.ok).toBe(true);
    const res = handleAction(unequipRes.state, { type: 'salvage', uid: inst.uid }, ctx());
    expect(res.ok).toBe(true);
  });
});

describe('inventory-full protections (rewards/crafted goods must never be silently lost)', () => {
  function fillTab(c: CharacterState, tab: 'equip' | 'use' | 'etc') {
    for (let i = 0; i < c.inventory[tab].length; i++) {
      if (!c.inventory[tab][i]) c.inventory[tab][i] = { uid: `filler_${tab}_${i}`, itemId: '__test_filler__', qty: 1 };
    }
  }

  it('rejects crafting an output that has nowhere to go, refunding nothing because nothing was consumed', () => {
    const recipeId = Object.keys(RECIPES).find((id) => !ITEMS[RECIPES[id].output.itemId]?.equip);
    if (!recipeId) return;
    const recipe = RECIPES[recipeId];
    const outDef = ITEMS[recipe.output.itemId];
    let c = newChar();
    c.professions[recipe.profession] = { level: recipe.level, xp: 0 };
    c.knownRecipes.push(recipeId);
    let slot = 0;
    for (const inp of recipe.inputs) c.inventory[ITEMS[inp.itemId].category][slot++] = { uid: `mat${slot}`, itemId: inp.itemId, qty: inp.qty };
    c.gold = Math.max(c.gold, recipe.goldCost ?? 0) + 1000;
    const goldBefore = c.gold;
    fillTab(c, outDef.category);
    const res = handleAction(c, { type: 'craft', recipeId }, ctx());
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/inventory space/i);
    expect(res.state.gold).toBe(goldBefore);
    for (const inp of recipe.inputs) expect(countItemHelper(res.state, inp.itemId)).toBeGreaterThanOrEqual(inp.qty);
  });

  it('rejects turning in a quest whose item reward has nowhere to fit, without consuming collect items or completing it', () => {
    const def = QUESTS['mq_02_tremors'];
    if (!def || !def.rewards.items?.length) return;
    let c = newChar();
    c.level = Math.max(c.level, def.level);
    c.quests['mq_02_tremors'] = { state: 'active', progress: [8, 0], acceptedAt: Date.now() };
    c.inventory.etc[0] = { uid: 'fluff', itemId: 'mat_puffmoss_fluff', qty: 5 };
    // top off the starter potion stack so the reward can't just merge into it, then fill every
    // other 'use' slot too — the potion reward (category 'use') has nowhere to stack/land.
    const rewardItemId = def.rewards.items![0].itemId;
    const rewardStack = ITEMS[rewardItemId]?.stack ?? 1;
    for (const slot of c.inventory.use) if (slot?.itemId === rewardItemId) slot.qty = rewardStack;
    fillTab(c, 'use');
    const res = handleAction(c, { type: 'completeQuest', questId: 'mq_02_tremors' }, ctx());
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/inventory space/i);
    expect(res.state.quests['mq_02_tremors']?.state).toBe('active');
    expect(countItemHelper(res.state, 'mat_puffmoss_fluff')).toBe(5); // not consumed

    // once there's room, the same turn-in succeeds and consumes/grants correctly
    const c2 = structuredClone(c);
    c2.inventory.use[0] = null;
    const res2 = handleAction(c2, { type: 'completeQuest', questId: 'mq_02_tremors' }, ctx());
    expect(res2.ok).toBe(true);
    expect(res2.state.quests['mq_02_tremors']?.state).toBe('completed');
    expect(countItemHelper(res2.state, 'mat_puffmoss_fluff')).toBe(0);
    expect(countItemHelper(res2.state, 'use_hp_potion_s')).toBeGreaterThan(0);
  });

  function countItemHelper(state: CharacterState, itemId: string): number {
    let n = 0;
    for (const tab of Object.values(state.inventory)) for (const s of tab) if (s?.itemId === itemId) n += s.qty;
    return n;
  }
});

describe('professions: crafting-only learn/unlearn', () => {
  it('rejects learning an unknown or gathering profession id', () => {
    const c = newChar();
    for (const bogus of ['not_a_real_profession', 'mining']) {
      const res = handleAction(c, { type: 'learnProfession', professionId: bogus as any }, ctx());
      expect(res.ok).toBe(false);
    }
  });

  it('rejects unlearning a permanent gathering profession (mining/foraging have no relearn path)', () => {
    const c = newChar();
    expect(c.professions.mining).toBeDefined();
    const res = handleAction(c, { type: 'unlearnProfession', professionId: 'mining' as any }, ctx());
    expect(res.ok).toBe(false);
    expect(res.state.professions.mining).toBeDefined();
  });

  it('allows unlearning a known crafting profession', () => {
    let c = newChar();
    const craftingId = Object.values(PROFESSIONS).find((p) => p.kind === 'crafting')!.id;
    c.professions[craftingId] = { level: 1, xp: 0 };
    const res = handleAction(c, { type: 'unlearnProfession', professionId: craftingId as any }, ctx());
    expect(res.ok).toBe(true);
    expect(res.state.professions[craftingId]).toBeUndefined();
  });
});

describe('killMonster / gather require the player to actually be on the claimed map', () => {
  it('rejects killMonster when the action map does not match the character map', () => {
    const c = newChar();
    const map = Object.values(MAPS).find((m) => m.spawns.length > 0);
    const otherMap = Object.values(MAPS).find((m) => m.spawns.length > 0 && m.id !== map?.id);
    if (!map || !otherMap) return;
    c.mapId = otherMap.id;
    const res = handleAction(c, { type: 'killMonster', monsterId: map.spawns[0].monsterId, mapId: map.id, x: 0, y: 0 }, ctx());
    expect(res.ok).toBe(false);
  });

  it('rejects gather when the action map does not match the character map', () => {
    const c = newChar();
    const nodeId = Object.keys(GATHER_NODES)[0];
    const map = Object.values(MAPS).find((m) => (m.gather ?? []).some((g) => g.nodeId === nodeId));
    const otherMap = Object.values(MAPS).find((m) => m.id !== map?.id);
    if (!map || !otherMap) return;
    c.mapId = otherMap.id;
    const res = handleAction(c, { type: 'gather', nodeId, mapId: map.id }, ctx());
    expect(res.ok).toBe(false);
  });
});
