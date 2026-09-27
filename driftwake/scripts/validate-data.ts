#!/usr/bin/env tsx
/**
 * Cross-reference content validator. Run with `npm run validate`.
 * Exits 1 if any error is found. Warnings never fail the build.
 *
 * Checks:
 *  - every id referenced from one registry exists in the registry it points to
 *  - map sanity (spawn point / platforms in bounds, portals sit on a platform surface)
 *  - balance sanity (monster xp/hp vs suggested curves, missing icons)
 *  - a summary of content counts
 */
import type { Condition, MapDef, PlatformDef } from '../src/shared/types';
import {
  ITEMS, MONSTERS, SKILLS, JOBS, MAPS, NPCS, QUESTS, DIALOGUES, RECIPES, PROFESSIONS, GATHER_NODES, SHOPS, SETS,
} from '../src/shared/data';
import { suggestedMonsterXp, suggestedMonsterHp } from '../src/shared/constants';

interface Issue { group: string; message: string }
const errors: Issue[] = [];
const warnings: Issue[] = [];
const err = (group: string, message: string) => errors.push({ group, message });
const warn = (group: string, message: string) => warnings.push({ group, message });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function checkConditionIds(group: string, where: string, conds: Condition[] | undefined) {
  if (!conds) return;
  for (const c of conds) {
    switch (c.type) {
      case 'quest':
        if (!QUESTS[c.questId]) err(group, `${where}: condition references unknown quest '${c.questId}'`);
        break;
      case 'item':
        if (!ITEMS[c.itemId]) err(group, `${where}: condition references unknown item '${c.itemId}'`);
        break;
      case 'profession':
        if (!PROFESSIONS[c.professionId]) err(group, `${where}: condition references unknown profession '${c.professionId}'`);
        break;
      case 'job':
        for (const j of Array.isArray(c.jobId) ? c.jobId : [c.jobId]) if (!JOBS[j]) err(group, `${where}: condition references unknown job '${j}'`);
        break;
      case 'questChoice':
        if (!QUESTS[c.questId]) err(group, `${where}: condition references unknown quest '${c.questId}'`);
        break;
      default:
        break;
    }
  }
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

for (const item of Object.values(ITEMS)) {
  const where = `item '${item.id}'`;
  if (!item.icon) warn('items', `${where}: missing icon`);
  if (item.classReq) for (const c of item.classReq) if (!JOBS[c]) err('items', `${where}: classReq references unknown class '${c}'`);
  if (item.equip?.setId && !SETS[item.equip.setId]) err('items', `${where}: setId references unknown set '${item.equip.setId}'`);
  if (item.salvage) for (const s of item.salvage) if (!ITEMS[s.itemId]) err('items', `${where}: salvage references unknown item '${s.itemId}'`);
}

for (const set of Object.values(SETS)) {
  for (const p of set.pieces) if (!ITEMS[p]) err('sets', `set '${set.id}': piece references unknown item '${p}'`);
}

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

for (const m of Object.values(MONSTERS)) {
  const where = `monster '${m.id}'`;
  for (const d of m.drops) if (!ITEMS[d.itemId]) err('monsters', `${where}: drop references unknown item '${d.itemId}'`);
  if (m.attacks) for (const a of m.attacks) if (a.kind === 'summon' && a.summonId && !MONSTERS[a.summonId]) err('monsters', `${where}: summon references unknown monster '${a.summonId}'`);

  // Bosses are meant to be ~25-40x a normal mob (DESIGN.md); use a wide multiplier band for
  // them instead of the tight ±50% band used for normal mobs.
  const sx = suggestedMonsterXp(m.level), sh = suggestedMonsterHp(m.level);
  if (m.isBoss) {
    if (m.hp < sh * 45 || m.hp > sh * 115) warn('balance', `${where}: boss hp ${m.hp} is outside the expected ~45-115x normal-mob range (${sh}) for level ${m.level}`);
    if (m.xp < sx * 8 || m.xp > sx * 28) warn('balance', `${where}: boss xp ${m.xp} is outside the expected ~8-28x normal-mob range (${sx}) for level ${m.level}`);
  } else {
    if (Math.abs(m.xp - sx) / sx > 0.5) warn('balance', `${where}: xp ${m.xp} is more than 50% off the suggested ${sx} for level ${m.level}`);
    if (Math.abs(m.hp - sh) / sh > 0.5) warn('balance', `${where}: hp ${m.hp} is more than 50% off the suggested ${sh} for level ${m.level}`);
  }
}

// ---------------------------------------------------------------------------
// Jobs / classes / skills
// ---------------------------------------------------------------------------

for (const job of Object.values(JOBS)) {
  const where = `job '${job.id}'`;
  for (const sid of job.skills) {
    const sk = SKILLS[sid];
    if (!sk) { err('classes', `${where}: skill references unknown skill '${sid}'`); continue; }
    if (sk.job !== job.id) warn('classes', `${where}: skill '${sid}' is defined for job '${sk.job}'`);
  }
  for (const iid of job.starterItems ?? []) if (!ITEMS[iid]) err('classes', `${where}: starterItems references unknown item '${iid}'`);
  if (job.tier === 2 && job.parent && !JOBS[job.parent]) err('classes', `${where}: parent references unknown class '${job.parent}'`);
}

for (const sk of Object.values(SKILLS)) {
  if (sk.prereq && !SKILLS[sk.prereq.skillId]) err('classes', `skill '${sk.id}': prereq references unknown skill '${sk.prereq.skillId}'`);
}

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

function inBounds(map: MapDef, x: number, y: number): boolean {
  return x >= 0 && x <= map.width && y >= 0 && y <= map.height;
}

function onPlatformSurface(platforms: PlatformDef[], x: number, y: number, tolerance = 4): boolean {
  return platforms.some((p) => x >= p.x && x <= p.x + p.w && Math.abs(p.y - y) <= tolerance);
}

const portalPairs = new Map<string, { mapId: string; to: string; toPortal: string }>();

for (const map of Object.values(MAPS)) {
  const where = `map '${map.id}'`;
  if (!inBounds(map, map.spawnPoint.x, map.spawnPoint.y)) err('maps', `${where}: spawnPoint (${map.spawnPoint.x},${map.spawnPoint.y}) is outside map bounds ${map.width}x${map.height}`);
  for (const p of map.platforms) {
    if (p.x < 0 || p.x + p.w > map.width || p.y < 0 || p.y > map.height) {
      err('maps', `${where}: platform at (${p.x},${p.y}) w=${p.w} is outside map bounds`);
    }
  }
  for (const sp of map.spawns) {
    if (!MONSTERS[sp.monsterId]) err('maps', `${where}: spawn references unknown monster '${sp.monsterId}'`);
  }
  if (map.boss) {
    if (!MONSTERS[map.boss.monsterId]) err('maps', `${where}: boss references unknown monster '${map.boss.monsterId}'`);
    checkConditionIds('maps', `${where} boss reqs`, map.boss.reqs);
  }
  for (const np of map.npcs) {
    if (!NPCS[np.npcId]) err('maps', `${where}: npc placement references unknown npc '${np.npcId}'`);
  }
  for (const g of map.gather) {
    if (!GATHER_NODES[g.nodeId]) err('maps', `${where}: gather placement references unknown node '${g.nodeId}'`);
  }
  for (const portal of map.portals) {
    const target = MAPS[portal.to];
    if (!target) { err('maps', `${where}: portal '${portal.id}' targets unknown map '${portal.to}'`); continue; }
    const destPortal = target.portals.find((p) => p.id === portal.toPortal);
    if (!destPortal) {
      err('maps', `${where}: portal '${portal.id}' targets portal '${portal.toPortal}' which does not exist on map '${portal.to}'`);
    } else if (destPortal.to !== map.id) {
      err('maps', `${where}: portal '${portal.id}' -> '${portal.to}:${portal.toPortal}' is not reciprocal (that portal points to '${destPortal.to}')`);
    }
    if (!onPlatformSurface(map.platforms, portal.x, portal.y)) {
      warn('maps', `${where}: portal '${portal.id}' at (${portal.x},${portal.y}) is not on a platform surface (±4px)`);
    }
    checkConditionIds('maps', `${where} portal '${portal.id}' reqs`, portal.reqs);
    portalPairs.set(`${map.id}:${portal.id}`, { mapId: map.id, to: portal.to, toPortal: portal.toPortal });
  }
}

// ---------------------------------------------------------------------------
// NPCs / dialogues / shops
// ---------------------------------------------------------------------------

const placedNpcIds = new Set<string>();
for (const map of Object.values(MAPS)) for (const np of map.npcs) placedNpcIds.add(np.npcId);

for (const npc of Object.values(NPCS)) {
  const where = `npc '${npc.id}'`;
  if (!placedNpcIds.has(npc.id)) warn('npcs', `${where}: not placed on any map`);
  if (npc.dialogue && !DIALOGUES[npc.dialogue]) err('npcs', `${where}: dialogue references unknown dialogue '${npc.dialogue}'`);
  if (npc.shopId && !SHOPS[npc.shopId]) err('npcs', `${where}: shopId references unknown shop '${npc.shopId}'`);
  if (npc.profession && !PROFESSIONS[npc.profession]) err('npcs', `${where}: profession references unknown profession '${npc.profession}'`);
}

for (const dlg of Object.values(DIALOGUES)) {
  const where = `dialogue '${dlg.id}'`;
  if (!dlg.nodes[dlg.start]) err('dialogues', `${where}: start node '${dlg.start}' does not exist`);
  for (const [nodeId, node] of Object.entries(dlg.nodes)) {
    if (node.next && !dlg.nodes[node.next]) err('dialogues', `${where} node '${nodeId}': next references unknown node '${node.next}'`);
    for (const opt of node.options ?? []) {
      if (opt.next && !dlg.nodes[opt.next]) err('dialogues', `${where} node '${nodeId}': option next references unknown node '${opt.next}'`);
      checkConditionIds('dialogues', `${where} node '${nodeId}' option`, opt.conditions);
      for (const act of opt.actions ?? []) checkDialogueAction(where, nodeId, act);
    }
    for (const act of node.actions ?? []) checkDialogueAction(where, nodeId, act);
  }
}

function checkDialogueAction(where: string, nodeId: string, act: { type: string; [k: string]: unknown }) {
  switch (act.type) {
    case 'acceptQuest': if (!QUESTS[act.questId as string]) err('dialogues', `${where} node '${nodeId}': acceptQuest references unknown quest '${act.questId}'`); break;
    case 'openShop': if (!SHOPS[act.shopId as string]) err('dialogues', `${where} node '${nodeId}': openShop references unknown shop '${act.shopId}'`); break;
    case 'learnProfession': if (!PROFESSIONS[act.professionId as string]) err('dialogues', `${where} node '${nodeId}': learnProfession references unknown profession '${act.professionId}'`); break;
    case 'teleport': if (!MAPS[act.mapId as string]) err('dialogues', `${where} node '${nodeId}': teleport references unknown map '${act.mapId}'`); break;
    case 'giveItem': case 'takeItem': if (!ITEMS[act.itemId as string]) err('dialogues', `${where} node '${nodeId}': ${act.type} references unknown item '${act.itemId}'`); break;
    case 'jobAdvance': { const j = JOBS[act.jobId as string]; if (!j) err('dialogues', `${where} node '${nodeId}': jobAdvance references unknown job '${act.jobId}'`); else if (j.tier !== 2) err('dialogues', `${where} node '${nodeId}': jobAdvance target '${act.jobId}' is not a tier-2 job`); break; }
    default: break;
  }
}

for (const shop of Object.values(SHOPS)) {
  for (const entry of shop.items) {
    if (!ITEMS[entry.itemId]) err('shops', `shop '${shop.id}': references unknown item '${entry.itemId}'`);
    checkConditionIds('shops', `shop '${shop.id}' item '${entry.itemId}'`, entry.reqs);
  }
}

// ---------------------------------------------------------------------------
// Recipes / professions / gathering
// ---------------------------------------------------------------------------

for (const r of Object.values(RECIPES)) {
  const where = `recipe '${r.id}'`;
  if (!PROFESSIONS[r.profession]) err('recipes', `${where}: references unknown profession '${r.profession}'`);
  for (const i of r.inputs) if (!ITEMS[i.itemId]) err('recipes', `${where}: input references unknown item '${i.itemId}'`);
  if (!ITEMS[r.output.itemId]) err('recipes', `${where}: output references unknown item '${r.output.itemId}'`);
}

for (const node of Object.values(GATHER_NODES)) {
  const where = `gather node '${node.id}'`;
  for (const d of node.drops) if (!ITEMS[d.itemId]) err('gathering', `${where}: drop references unknown item '${d.itemId}'`);
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

for (const q of Object.values(QUESTS)) {
  const where = `quest '${q.id}'`;
  if (!NPCS[q.giver]) err('quests', `${where}: giver references unknown npc '${q.giver}'`);
  else if (!placedNpcIds.has(q.giver)) warn('quests', `${where}: giver '${q.giver}' is not placed on any map`);
  const turnIn = q.turnIn ?? q.giver;
  if (!NPCS[turnIn]) err('quests', `${where}: turnIn references unknown npc '${turnIn}'`);
  else if (!placedNpcIds.has(turnIn)) warn('quests', `${where}: turnIn '${turnIn}' is not placed on any map`);

  checkConditionIds('quests', `${where} reqs`, q.reqs);

  for (const obj of q.objectives) {
    switch (obj.type) {
      case 'kill': case 'boss':
        if (!MONSTERS[obj.monsterId]) err('quests', `${where}: objective references unknown monster '${obj.monsterId}'`);
        break;
      case 'collect':
        if (!ITEMS[obj.itemId]) err('quests', `${where}: objective references unknown item '${obj.itemId}'`);
        break;
      case 'talk':
        if (!NPCS[obj.npcId]) err('quests', `${where}: objective references unknown npc '${obj.npcId}'`);
        break;
      case 'visit':
        if (!MAPS[obj.mapId]) err('quests', `${where}: objective references unknown map '${obj.mapId}'`);
        break;
      case 'craft':
        if (obj.itemId && !ITEMS[obj.itemId]) err('quests', `${where}: craft objective references unknown item '${obj.itemId}'`);
        if (obj.professionId && !PROFESSIONS[obj.professionId]) err('quests', `${where}: craft objective references unknown profession '${obj.professionId}'`);
        break;
      case 'gather':
        if (obj.nodeId && !GATHER_NODES[obj.nodeId]) err('quests', `${where}: gather objective references unknown node '${obj.nodeId}'`);
        if (obj.professionId && !PROFESSIONS[obj.professionId]) err('quests', `${where}: gather objective references unknown profession '${obj.professionId}'`);
        break;
      default:
        break;
    }
  }

  const checkReward = (label: string, rw: typeof q.rewards) => {
    for (const it of rw.items ?? []) if (!ITEMS[it.itemId]) err('quests', `${where}: ${label} reward references unknown item '${it.itemId}'`);
    for (const it of rw.chooseOne ?? []) if (!ITEMS[it.itemId]) err('quests', `${where}: ${label} chooseOne reward references unknown item '${it.itemId}'`);
    for (const rid of rw.recipes ?? []) if (!RECIPES[rid]) err('quests', `${where}: ${label} reward references unknown recipe '${rid}'`);
  };
  checkReward('base', q.rewards);

  if (q.choices) {
    for (const c of q.choices) {
      checkReward(`choice '${c.id}'`, c.rewards);
      checkConditionIds('quests', `${where} choice '${c.id}' reqs`, c.reqs);
      if (c.jobAdvance) {
        const j = JOBS[c.jobAdvance];
        if (!j) err('quests', `${where}: choice '${c.id}' jobAdvance references unknown job '${c.jobAdvance}'`);
        else if (j.tier !== 2) err('quests', `${where}: choice '${c.id}' jobAdvance target '${c.jobAdvance}' is not a tier-2 job`);
      }
    }
  }
  if (q.onAccept) for (const act of q.onAccept) checkDialogueAction(where, 'onAccept', act);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function printGroup(label: string, issues: Issue[]) {
  if (!issues.length) return;
  const byGroup = new Map<string, string[]>();
  for (const i of issues) {
    if (!byGroup.has(i.group)) byGroup.set(i.group, []);
    byGroup.get(i.group)!.push(i.message);
  }
  console.log(`\n${label} (${issues.length}):`);
  for (const [group, msgs] of byGroup) {
    console.log(`  [${group}] ${msgs.length}`);
    for (const m of msgs) console.log(`    - ${m}`);
  }
}

console.log('=== Driftwake content validation ===');
console.log('Summary:');
console.log(`  items:        ${Object.keys(ITEMS).length}`);
console.log(`  monsters:     ${Object.keys(MONSTERS).length}`);
console.log(`  skills:       ${Object.keys(SKILLS).length}`);
console.log(`  jobs:         ${Object.keys(JOBS).length}`);
console.log(`  maps:         ${Object.keys(MAPS).length}`);
console.log(`  npcs:         ${Object.keys(NPCS).length}`);
console.log(`  quests:       ${Object.keys(QUESTS).length}`);
console.log(`  dialogues:    ${Object.keys(DIALOGUES).length}`);
console.log(`  recipes:      ${Object.keys(RECIPES).length}`);
console.log(`  professions:  ${Object.keys(PROFESSIONS).length}`);
console.log(`  gatherNodes:  ${Object.keys(GATHER_NODES).length}`);
console.log(`  shops:        ${Object.keys(SHOPS).length}`);
console.log(`  sets:         ${Object.keys(SETS).length}`);

printGroup('ERRORS', errors);
printGroup('WARNINGS', warnings);

console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);
if (errors.length > 0) {
  process.exitCode = 1;
}
