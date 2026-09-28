#!/usr/bin/env tsx
/**
 * BALANCE REPORT — combat balance analysis across all 12 jobs.
 *
 * For each job, at the level(s) appropriate to its tier (tier-1: 10 & 14; tier-2: 20/30/40),
 * builds a representative character (AP ~75% main-stat / 25% secondary, skills learned greedily
 * with available SP, best world-drop weapon + armor archetype for the level) and estimates:
 *   - single-target sustained DPS (60s, best cooldown-priority rotation, casts ignore MP)
 *   - AoE DPS vs 5 clustered same-level targets
 *   - burst damage in the first 5s
 *   - effective HP & hits-to-die vs a same-level monster's contact attack, plus self-sustain
 *     (lifesteal + heal skills) in HP/sec
 *   - time-to-kill (TTK) a same-level normal mob and a tier-appropriate boss
 *   - MP sustainability: seconds of the main rotation before going OOM (maxMp / net drain rate)
 *
 * Run: npx tsx scripts/balance-report.ts
 *
 * ASSUMPTIONS (documented per the task):
 *  - Damage is the *expected value* of rollPlayerDamage (Monte Carlo average over 200 samples per
 *    skill/target pair with a fixed seed), not single dice rolls — this folds in variance and
 *    crit rate x crit multiplier exactly as the real formula does.
 *  - Passives are included automatically (they're read from state.skills by computeStats). Buffs
 *    are folded in as a static stat bonus scaled by average uptime = duration / (duration + cooldown)
 *    (buff cast time itself is treated as negligible next to its long cooldown, so it is not run
 *    through the action-lock scheduler).
 *  - Rotation scheduling is a simple greedy scheduler: at every point in time, cast the highest-
 *    (expected-)damage skill that is off cooldown; if none is ready, use the 0-cooldown "spam"
 *    skill/basic attack as filler. Casting locks the actor for castTimeMs (default 350ms).
 *  - AoE target counting per effect kind (5 clustered same-level targets for the AoE test):
 *      melee/aoe/zone/dash/teleport: hits = min(maxTargets ?? Infinity, N) — one hit per target,
 *        capped by both the skill's own target cap and how many targets are actually present.
 *      chain: geometric falloff across min(jumps, N-1) additional jumps.
 *      projectile: each of `count` projectiles can hit up to (pierce + 1) *distinct* targets, so
 *        hits = count * min(pierce + 1, N); an explodeRadius adds up to 2 extra splash targets
 *        (0 at N=1, since the explosion only hits OTHERS the initial hit didn't already hit).
 *      rain / summon: independent projectiles/shots that can all land on the same lone target, so
 *        total hit count (count, or duration/interval) does NOT scale down at N=1 — this matches
 *        the client's actual per-projectile nearest-target search (SkillRunner.ts).
 *  - Burst (first 5s) discounts zone/rain/summon ("DoT-like") skills' activation damage by
 *    min(1, 5000 / effectDurationMs), since that damage is actually delivered over the skill's
 *    full duration, not instantly at cast.
 *  - EHP = maxHp / (defenseMult(defense) * (1 - avoid)); "hits to die" divides that by one
 *    mitigated same-level-monster contact hit. Sustain = lifesteal HP/sec from the DPS rotation
 *    + HP/sec from any learned self-heal skill (independent of the attack rotation).
 *  - MP sustainability assumes the character starts at full MP and runs the same 60s attack
 *    rotation forever; secondsToOOM = maxMp / max(0, mpCostPerSec - mpRegenPerSec). HP-cost
 *    (Reaver) skills never drain MP, so those report as unlimited ("-").
 */
import {
  JOBS, SKILLS, ITEMS, MONSTERS,
} from '../src/shared/data';
import { computeStats, scalar, rollPlayerDamage } from '../src/shared/logic';
import { mulberry32 } from '../src/shared/rng';
import { AP_PER_LEVEL, SP_PER_LEVEL, SP_ON_ADVANCE, JOB_ADVANCE_LEVEL, STARTING_STATS } from '../src/shared/constants';
import type {
  CharacterState, ClassId, DerivedStats, JobDef, MonsterDef, SkillDef, SkillEffect, StatKey,
} from '../src/shared/types';

const rng = mulberry32(20260928);

// ---------------------------------------------------------------------------
// Character construction
// ---------------------------------------------------------------------------

function bestWorldItem(slot: string, weaponType: string | undefined, classId: ClassId, level: number) {
  const candidates = Object.values(ITEMS).filter((it) => {
    if (it.equip?.slot !== slot) return false;
    if (weaponType && it.equip.weaponType !== weaponType) return false;
    if (!it.tags?.includes('worlddrop')) return false;
    if ((it.levelReq ?? 0) > level) return false;
    if (it.classReq && !it.classReq.includes(classId)) return false;
    return true;
  });
  candidates.sort((a, b) => (b.levelReq ?? 0) - (a.levelReq ?? 0));
  return candidates[0];
}

function equipBestGear(state: CharacterState, job: JobDef, level: number) {
  const weapon = bestWorldItem('weapon', job.weaponTypes[0], job.classId, level);
  if (weapon) state.equipment.weapon = { uid: 'w', itemId: weapon.id, qty: 1, stars: 0 };
  for (const slot of ['helmet', 'armor', 'gloves', 'boots'] as const) {
    const piece = bestWorldItem(slot, undefined, job.classId, level);
    if (piece) state.equipment[slot] = { uid: slot, itemId: piece.id, qty: 1, stars: 0 };
  }
}

/** Weight used to greedily prioritize SP spending, roughly the way a player would. */
function skillWeight(def: SkillDef): number {
  const isPureMobility = def.effect?.kind === 'doubleJump' || (def.effect?.kind === 'teleport' && !def.damagePct);
  if (isPureMobility) return 1;
  if (def.type === 'passive') return 5;
  if (def.type === 'buff') return 3;
  if (def.type === 'active') {
    const cd = typeof def.cooldownMs === 'number' ? def.cooldownMs : (def.cooldownMs?.base ?? 0);
    if (cd === 0) return 6; // main spam skill
    if (def.maxLevel <= 5) return 4; // ultimate
    return 4.5; // secondary attack
  }
  return 2;
}

function greedySkills(job: JobDef, tier1: JobDef, targetLevel: number): Record<string, number> {
  const ids = new Set<string>([...tier1.skills, ...(job.tier === 2 ? job.skills : [])]);
  const defs = [...ids].map((id) => SKILLS[id]).filter((d): d is SkillDef => !!d);
  const skills: Record<string, number> = {};
  let sp = 0;
  for (let lvl = 1; lvl <= targetLevel; lvl++) {
    sp += lvl === 1 ? 1 : SP_PER_LEVEL;
    if (job.tier === 2 && lvl === JOB_ADVANCE_LEVEL) sp += SP_ON_ADVANCE;
    let spent = true;
    while (spent && sp > 0) {
      spent = false;
      const candidates = defs.filter((d) => lvl >= d.reqLevel && (skills[d.id] ?? 0) < d.maxLevel);
      if (!candidates.length) break;
      // Tie-break prefers the MORE RECENTLY unlocked skill (higher reqLevel): a player who just
      // advanced job (or leveled into a new skill) invests in the exciting new upgrade first,
      // rather than perfectionist-maxing everything already available in reqLevel order — this
      // also ensures a tier-2 character actually plays their specialization instead of spending
      // their whole post-advance SP budget finishing off the tier-1 kit first.
      candidates.sort((a, b) => skillWeight(b) - skillWeight(a) || b.reqLevel - a.reqLevel);
      const pick = candidates[0];
      skills[pick.id] = (skills[pick.id] ?? 0) + 1;
      sp--;
      spent = true;
    }
  }
  return skills;
}

function buildCharacter(jobId: string, level: number): CharacterState {
  const job = JOBS[jobId];
  const tier1 = JOBS[job.classId];
  const totalAp = AP_PER_LEVEL * (level - 1);
  const mainAp = Math.round(totalAp * 0.75);
  const secAp = totalAp - mainAp;
  const baseStats: Record<StatKey, number> = { ...STARTING_STATS };
  baseStats[job.mainStat] += mainAp;
  baseStats[job.secondaryStat] += secAp;

  const state: CharacterState = {
    version: 1, id: 'sim', name: 'sim', classId: job.classId, jobId: job.id as CharacterState['jobId'],
    level, xp: 0, gold: 0, appearance: { skin: '', hair: '', hairStyle: 0, eyes: '', outfit: '' },
    baseStats, ap: 0, sp: 0, skills: greedySkills(job, tier1, level),
    hp: 1, mp: 1,
    inventory: { equip: [], use: [], etc: [] },
    equipment: {}, hotbar: [], quests: {}, flags: {}, reputation: { harpooners: 0, tidekeepers: 0 },
    professions: {}, knownRecipes: [], buffs: [],
    mapId: 'x', position: { x: 0, y: 0 }, townMapId: 'x', discoveredMaps: [], bestiary: {},
    titles: [], counters: { kills: 0, deaths: 0, playTimeMs: 0, crafted: 0, gathered: 0, bossKills: 0, goldEarned: 0 },
    createdAt: 0, updatedAt: 0,
  };
  equipBestGear(state, job, level);
  const stats = computeStats(state);
  state.hp = stats.maxHp;
  state.mp = stats.maxMp;
  return state;
}

// ---------------------------------------------------------------------------
// Damage helpers
// ---------------------------------------------------------------------------

function expectedHitDamage(
  stats: DerivedStats, job: JobDef, damagePct: number,
  target: { level: number; defense: number; isBoss?: boolean }, playerLevel: number, samples = 200,
): number {
  let sum = 0;
  for (let i = 0; i < samples; i++) sum += rollPlayerDamage(stats, job, damagePct, target, playerLevel, rng).damage;
  return sum / samples;
}

function dotDurationMs(effect: SkillEffect): number {
  if (effect.kind === 'zone' || effect.kind === 'rain') return effect.durationMs;
  if (effect.kind === 'summon') return effect.durationMs;
  return 0;
}

/** Total "hit count" against target(s) for one activation of the skill (see file header for the
 * per-effect-kind assumptions). Multiplied by def.hits (independent multi-hit skills like Twin Fang). */
function targetHits(def: SkillDef, N: number): number {
  const e = def.effect;
  if (!e) return 1;
  const cap = def.maxTargets ?? Infinity;
  switch (e.kind) {
    case 'melee': return Math.min(cap, N);
    case 'aoe': return Math.min(cap, N);
    case 'zone': return Math.min(cap, N);
    case 'dash': return Math.min(cap, N);
    case 'teleport': return Math.min(cap, N);
    case 'projectile': {
      const count = e.count ?? 1;
      const perProjectile = Math.min((e.pierce ?? 0) + 1, N);
      // A wide angular spread (spreadDeg) fans arrows/shots across the field — they diverge and
      // do NOT all converge on one point target the way a straight-line double-tap (e.g. Twin
      // Shot, no spreadDeg) does, so only min(count, N) of them can plausibly connect with a
      // single stationary target; a straight volley with no spread is assumed to all land on the
      // lone target in front (that's its intended "multi-hit single target" design).
      const distinctShots = (e.spreadDeg ?? 0) > 0 ? Math.min(count, N) : count;
      let total = distinctShots * perProjectile;
      if (e.explodeRadius) total += count * Math.min(2, Math.max(0, N - 1));
      return cap === Infinity ? total : Math.min(total, cap);
    }
    case 'rain': return e.count;
    case 'summon': return Math.floor(e.durationMs / e.intervalMs);
    default: return 1;
  }
}

interface ScaledSkill {
  def: SkillDef; damagePct: number; cooldownMs: number; castTimeMs: number; mpCost: number;
  hits: number; lifesteal: number; isDot: boolean; dmgN1: number; dmgN5: number;
  dmgN1Burst: number; dmgN5Burst: number;
}

function scaleSkill(
  def: SkillDef, level: number, stats: DerivedStats, job: JobDef,
  target: { level: number; defense: number; isBoss?: boolean }, playerLevel: number,
): ScaledSkill {
  const cdRaw = scalar(def.cooldownMs, level);
  const cooldownMs = Math.max(0, Math.round(cdRaw * (1 - stats.cooldownReduction)));
  const damagePct = def.damagePct ? scalar(def.damagePct, level) : 100;
  const hits = def.hits ?? 1;
  const dmgOne = expectedHitDamage(stats, job, damagePct, target, playerLevel);
  const isDot = def.effect?.kind === 'zone' || def.effect?.kind === 'rain' || def.effect?.kind === 'summon';
  const burstFactor = isDot ? Math.min(1, 5000 / Math.max(1, dotDurationMs(def.effect!))) : 1;

  function perActivation(N: number): number {
    if (def.effect?.kind === 'chain') {
      const jumps = Math.min(def.effect.jumps, N - 1);
      let total = 0; let mult = 1;
      for (let j = 0; j <= jumps; j++) { total += dmgOne * mult; mult *= def.effect.falloff ?? 0.75; }
      return total * hits;
    }
    return dmgOne * targetHits(def, N) * hits;
  }

  const dmgN1 = perActivation(1);
  const dmgN5 = perActivation(5);
  return {
    def, damagePct, cooldownMs, castTimeMs: def.castTimeMs ?? 350, mpCost: scalar(def.mpCost, level),
    hits, lifesteal: scalar(def.lifesteal, level), isDot,
    dmgN1, dmgN5, dmgN1Burst: dmgN1 * burstFactor, dmgN5Burst: dmgN5 * burstFactor,
  };
}

function basicAttackSkill(job: JobDef, level: number, stats: DerivedStats, target: { level: number; defense: number; isBoss?: boolean }, playerLevel: number): ScaledSkill {
  const damagePct = job.basicAttack.damagePct ?? 100;
  const dmgOne = expectedHitDamage(stats, job, damagePct, target, playerLevel);
  return {
    def: { id: 'attack', name: 'Attack', description: '', job: job.id, type: 'active', maxLevel: 1, reqLevel: 1, icon: { shape: 'slash', colors: [] } } as SkillDef,
    damagePct, cooldownMs: 0, castTimeMs: job.basicAttack.castTimeMs, mpCost: 0, hits: 1, lifesteal: 0, isDot: false,
    dmgN1: dmgOne, dmgN5: dmgOne, dmgN1Burst: dmgOne, dmgN5Burst: dmgOne,
  };
}

/** Buffs are folded in as a static average-uptime stat bonus rather than scheduled explicitly. */
function applyBuffUptime(stats: DerivedStats, state: CharacterState, level: number): DerivedStats {
  const out: DerivedStats = { ...stats };
  for (const [skillId, lvl] of Object.entries(state.skills)) {
    if (lvl <= 0) continue;
    const def = SKILLS[skillId];
    if (!def || def.type !== 'buff' || !def.buff) continue;
    const duration = scalar(def.buff.durationMs, lvl);
    const cooldown = scalar(def.cooldownMs, lvl);
    const uptime = Math.min(1, duration / (duration + cooldown));
    for (const k in def.buff.stats) {
      const key = k as keyof DerivedStats;
      (out[key] as number) += scalar((def.buff.stats as any)[key], lvl) * uptime;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Rotation simulation
// ---------------------------------------------------------------------------

function attackSkillsFor(state: CharacterState, job: JobDef): SkillDef[] {
  return Object.entries(state.skills)
    .filter(([, lvl]) => lvl > 0)
    .map(([id]) => SKILLS[id])
    .filter((d): d is SkillDef => !!d && d.type === 'active')
    .filter((d) => d.effect && d.effect.kind !== 'none' && d.effect.kind !== 'heal' && d.effect.kind !== 'doubleJump');
}

function simulateRotation(scaled: ScaledSkill[], N: 1 | 5, windowMs: number, burst: boolean): { damage: number; mpUsed: number; healed: number } {
  // The 0-cooldown "filler" used whenever nothing else is ready is whichever 0cd skill (a job's
  // own channel skill, an inherited tier-1 one, or plain basic attack) currently deals the MOST
  // damage per activation — not just the first one in array order.
  let filler = scaled[scaled.length - 1];
  let bestFillerDmg = -1;
  for (const s of scaled) {
    if (s.cooldownMs !== 0) continue;
    const d = N === 1 ? (burst ? s.dmgN1Burst : s.dmgN1) : (burst ? s.dmgN5Burst : s.dmgN5);
    if (d > bestFillerDmg) { bestFillerDmg = d; filler = s; }
  }
  const readyAt = new Map<SkillDef, number>();
  let t = 0; let damage = 0; let mpUsed = 0; let healed = 0;
  while (t < windowMs) {
    let pick: ScaledSkill | undefined; let bestDmg = -1;
    for (const s of scaled) {
      if (s.cooldownMs === 0) continue;
      if ((readyAt.get(s.def) ?? 0) > t) continue;
      const d = N === 1 ? (burst ? s.dmgN1Burst : s.dmgN1) : (burst ? s.dmgN5Burst : s.dmgN5);
      if (d > bestDmg) { bestDmg = d; pick = s; }
    }
    if (!pick) pick = filler;
    const d = N === 1 ? (burst ? pick.dmgN1Burst : pick.dmgN1) : (burst ? pick.dmgN5Burst : pick.dmgN5);
    damage += d;
    mpUsed += pick.mpCost;
    healed += d * pick.lifesteal;
    t += pick.castTimeMs;
    readyAt.set(pick.def, t + pick.cooldownMs);
  }
  return { damage, mpUsed, healed };
}

// ---------------------------------------------------------------------------
// Per-character report
// ---------------------------------------------------------------------------

interface Report {
  jobId: string; level: number;
  dpsSingle: number; dpsAoe: number; burst5s: number;
  ehp: number; hitsToDie: number; sustainHpPerSec: number;
  ttkMob: number; ttkBoss: number; mobId: string; bossId: string;
  oomSeconds: number; maxHp: number; maxMp: number; mpCostPerSec: number; mpRegenPerSec: number;
}

function sameLevelMob(level: number): MonsterDef {
  const byExact = Object.values(MONSTERS).find((m) => !m.isBoss && m.level === level);
  if (byExact) return byExact;
  // fall back to nearest level normal mob
  const candidates = Object.values(MONSTERS).filter((m) => !m.isBoss);
  candidates.sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
  return candidates[0];
}

const TIER_BOSS: Record<number, string> = { 10: 'king_barnacle', 14: 'old_tangle', 20: 'kraelith', 30: 'captain_rook', 40: 'blight_heart' };

function analyze(jobId: string, level: number): Report {
  const job = JOBS[jobId];
  const state = buildCharacter(jobId, level);
  const rawStats = computeStats(state);
  const stats = applyBuffUptime(rawStats, state, level);

  const mob = sameLevelMob(level);
  const boss = MONSTERS[TIER_BOSS[level]];
  const mobTarget = { level: mob.level, defense: mob.defense, isBoss: false };
  const bossTarget = { level: boss.level, defense: boss.defense, isBoss: true };

  const attackDefs = attackSkillsFor(state, job);
  const scaledVsMob = attackDefs.map((d) => scaleSkill(d, level, stats, job, mobTarget, level));
  scaledVsMob.push(basicAttackSkill(job, level, stats, mobTarget, level));
  const scaledVsBoss = attackDefs.map((d) => scaleSkill(d, level, stats, job, bossTarget, level));
  scaledVsBoss.push(basicAttackSkill(job, level, stats, bossTarget, level));

  const single60 = simulateRotation(scaledVsMob, 1, 60000, false);
  const aoe60 = simulateRotation(scaledVsMob, 5, 60000, false);
  const burst = simulateRotation(scaledVsMob, 1, 5000, true);
  const dpsSingle = single60.damage / 60;
  const dpsAoe = aoe60.damage / 60;

  const mpCostPerSec = single60.mpUsed / 60;
  const mpRegenPerSec = stats.mpRegen / 5;
  const netDrain = mpCostPerSec - mpRegenPerSec;
  const oomSeconds = netDrain > 0 ? stats.maxMp / netDrain : Infinity;

  // TTK
  const bossVsMobSim = simulateRotation(scaledVsBoss, 1, 600000, false);
  const dpsVsBoss = bossVsMobSim.damage / 600;
  const ttkMob = mob.hp / Math.max(1, dpsSingle);
  const ttkBoss = boss.hp / Math.max(1, dpsVsBoss);

  // EHP / sustain
  const defMult = 100 / (100 + stats.defense);
  const mitigatedHit = mob.attack * defMult * (1 - stats.avoid);
  const ehp = stats.maxHp / (defMult * (1 - stats.avoid));
  const hitsToDie = stats.maxHp / Math.max(1, mitigatedHit);
  let sustainHpPerSec = single60.healed / 60;
  const healSkill = Object.entries(state.skills).find(([id, lvl]) => lvl > 0 && SKILLS[id]?.effect?.kind === 'heal');
  if (healSkill) {
    const [id, lvl] = healSkill;
    const def = SKILLS[id];
    const cdMs = Math.max(1, scalar(def.cooldownMs, lvl) * (1 - stats.cooldownReduction));
    if (def.effect!.kind === 'heal') sustainHpPerSec += (stats.maxHp * def.effect.pct) / (cdMs / 1000);
  }

  return {
    jobId, level, dpsSingle, dpsAoe, burst5s: burst.damage,
    ehp, hitsToDie, sustainHpPerSec, ttkMob, ttkBoss, mobId: mob.id, bossId: boss.id,
    oomSeconds, maxHp: stats.maxHp, maxMp: stats.maxMp, mpCostPerSec, mpRegenPerSec,
  };
}

// ---------------------------------------------------------------------------
// Report printing
// ---------------------------------------------------------------------------

const TIER1_JOBS = ['vanguard', 'stormcaller', 'windrunner', 'shade'];
const TIER2_JOBS = ['bulwark', 'reaver', 'tempest', 'tidesinger', 'skyhunter', 'sparkgunner', 'duskblade', 'hexslinger'];
const BANDS: { level: number; jobs: string[] }[] = [
  { level: 10, jobs: TIER1_JOBS },
  { level: 14, jobs: TIER1_JOBS },
  { level: 20, jobs: TIER2_JOBS },
  { level: 30, jobs: TIER2_JOBS },
  { level: 40, jobs: TIER2_JOBS },
];

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function fmt(n: number): string {
  if (!isFinite(n)) return 'inf';
  if (n > 9999) return Math.round(n).toString();
  return n.toFixed(1);
}

function pad(s: string, w: number): string { return s.length >= w ? s : s + ' '.repeat(w - s.length); }

const AOE_SPECIALISTS = new Set(['tempest', 'skyhunter', 'sparkgunner', 'reaver']);
const TANKY = new Set(['bulwark']);

const allReports: Report[] = [];

for (const band of BANDS) {
  console.log(`\n=== LEVEL ${band.level} ===`);
  const reports = band.jobs.map((j) => analyze(j, band.level));
  allReports.push(...reports);
  const medDps = median(reports.map((r) => r.dpsSingle));
  console.log(pad('job', 12) + pad('dpsST', 9) + pad('dpsAoE', 9) + pad('burst5s', 9) + pad('EHP', 8) + pad('hitsDie', 9) + pad('sustain', 9) + pad('ttkMob', 8) + pad('ttkBoss', 9) + pad('oomSec', 8) + 'flags');
  for (const r of reports) {
    const devPct = (r.dpsSingle - medDps) / medDps;
    const flags: string[] = [];
    if (Math.abs(devPct) > 0.20 && !AOE_SPECIALISTS.has(r.jobId) && !TANKY.has(r.jobId)) flags.push(`ST_DPS ${(devPct * 100).toFixed(0)}%`);
    if (r.ttkBoss < 45 || r.ttkBoss > 90) flags.push(`bossTTK ${r.ttkBoss.toFixed(0)}s`);
    if (r.oomSeconds < 25) flags.push(`OOM ${r.oomSeconds.toFixed(0)}s`);
    console.log(
      pad(r.jobId, 12) + pad(fmt(r.dpsSingle), 9) + pad(fmt(r.dpsAoe), 9) + pad(fmt(r.burst5s), 9)
      + pad(fmt(r.ehp), 8) + pad(fmt(r.hitsToDie), 9) + pad(fmt(r.sustainHpPerSec), 9)
      + pad(fmt(r.ttkMob), 8) + pad(fmt(r.ttkBoss), 9) + pad(fmt(r.oomSeconds), 8)
      + flags.join(' '),
    );
  }
  // Dominant-combo flag: top-3 in both ST DPS and AoE DPS and EHP simultaneously.
  const byDps = [...reports].sort((a, b) => b.dpsSingle - a.dpsSingle);
  const byAoe = [...reports].sort((a, b) => b.dpsAoe - a.dpsAoe);
  const byEhp = [...reports].sort((a, b) => b.ehp - a.ehp);
  const top = (arr: Report[], n: number) => new Set(arr.slice(0, n).map((r) => r.jobId));
  const topDps = top(byDps, 2); const topAoe = top(byAoe, 2); const topEhp = top(byEhp, 2);
  for (const r of reports) {
    if (topDps.has(r.jobId) && topAoe.has(r.jobId) && topEhp.has(r.jobId)) {
      console.log(`  [DOMINANT COMBO] ${r.jobId} is top-2 in single-target DPS, AoE DPS AND EHP simultaneously.`);
    }
  }
}

console.log('\n=== DONE ===');
