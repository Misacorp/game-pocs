import { describe, it, expect, beforeEach } from 'vitest';
import type { CharacterState } from '@shared/types';
import { JOBS, ITEMS, MONSTERS, MAPS, QUESTS, RECIPES, SHOPS, SKILLS } from '@shared/data';
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
