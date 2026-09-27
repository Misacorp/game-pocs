/**
 * Temporary QA fixtures for content that other agents are still authoring (maps, monsters, jobs,
 * skills, npcs, gather nodes). NEVER written into src/shared/data — these are only used as a
 * fallback when the real registry (src/shared/data) doesn't have the requested id yet, so the
 * engine keeps working end-to-end while content is empty/partial, and automatically stops using
 * a fixture the moment the real id lands.
 */
import type { GatherNodeDef, JobDef, MapDef, MonsterDef, NpcDef, SkillDef } from '@shared/types';
import { suggestedMonsterHp, suggestedMonsterXp } from '@shared/constants';
import { MAPS, MONSTERS, JOBS, SKILLS, NPCS, GATHER_NODES } from '@shared/data';

// ---------------------------------------------------------------------------
// Skills (fixture "vanguard" kit — covers every SkillEffect kind touched by QA)
// ---------------------------------------------------------------------------

const FIXTURE_SKILL_LIST: SkillDef[] = [
  {
    id: 'skill_vanguard_cleave', name: 'Cleave', description: 'A wide, heavy sword swing.',
    job: 'vanguard', type: 'active', maxLevel: 10, reqLevel: 1,
    icon: { shape: 'slash', colors: ['#ffdd55'] },
    mpCost: { base: 8, perLevel: 0.5 }, cooldownMs: 3200,
    damagePct: { base: 130, perLevel: 8 }, hits: 1, maxTargets: 3,
    effect: { kind: 'melee', range: 52, height: 44, offsetY: 16, knockback: 90, hitsAll: true },
    vfx: { style: 'heavySlash', color: '#ffdd55' }, sfx: 'swing',
    status: { kind: 'bleed', chance: 0.3, durationMs: 4000, power: 0.06 },
    castTimeMs: 380, anim: 'attack',
  },
  {
    id: 'skill_vanguard_whirlwind', name: 'Whirlwind', description: 'Spin, striking everything nearby.',
    job: 'vanguard', type: 'active', maxLevel: 10, reqLevel: 3,
    icon: { shape: 'spin', colors: ['#ff9944'] },
    mpCost: { base: 14, perLevel: 1 }, cooldownMs: 6500,
    damagePct: { base: 95, perLevel: 6 }, hits: 1,
    effect: { kind: 'aoe', radius: 58, at: 'self' },
    vfx: { style: 'spin', color: '#ff9944' }, sfx: 'swing',
    castTimeMs: 420, anim: 'attack',
  },
  {
    id: 'skill_vanguard_leapstrike', name: 'Leap Strike', description: 'Dash forward, cleaving through foes.',
    job: 'vanguard', type: 'active', maxLevel: 10, reqLevel: 6,
    icon: { shape: 'dash', colors: ['#66ccff'] },
    mpCost: { base: 15, perLevel: 1 }, cooldownMs: 8000,
    damagePct: { base: 140, perLevel: 9 }, hits: 1,
    effect: { kind: 'dash', distance: 150, invulnMs: 220 },
    vfx: { style: 'slash', color: '#66ccff' }, sfx: 'dash',
    castTimeMs: 200, anim: 'attack',
  },
  {
    id: 'skill_vanguard_warcry', name: 'War Cry', description: 'Bolster attack and defense briefly.',
    job: 'vanguard', type: 'buff', maxLevel: 10, reqLevel: 4,
    icon: { shape: 'aura', colors: ['#ff6666'] },
    mpCost: { base: 12, perLevel: 0.5 }, cooldownMs: 22000,
    effect: { kind: 'none' },
    buff: { stats: { attack: { base: 14, perLevel: 2 }, defense: { base: 8, perLevel: 1 } }, durationMs: { base: 8000, perLevel: 400 } },
    vfx: { style: 'buff', color: '#ff6666' }, sfx: 'buff',
    castTimeMs: 300, anim: 'cast',
  },
  {
    id: 'skill_vanguard_secondwind', name: 'Second Wind', description: 'Passively regenerate HP faster.',
    job: 'vanguard', type: 'passive', maxLevel: 10, reqLevel: 5,
    icon: { shape: 'heart', colors: ['#7dffb3'] },
    effect: { kind: 'none' },
    passive: { stats: { hpRegen: { base: 3, perLevel: 0.6 } } },
  },
  {
    id: 'skill_vanguard_flashstep', name: 'Flash Step', description: 'An extra jump mid-air.',
    job: 'vanguard', type: 'active', maxLevel: 5, reqLevel: 8,
    icon: { shape: 'wind', colors: ['#cceeff'] },
    mpCost: { base: 8, perLevel: 0.5 }, cooldownMs: 2500,
    effect: { kind: 'doubleJump', power: 260, horizontalBoost: 190 },
    vfx: { style: 'wind', color: '#cceeff' }, sfx: 'jump',
    castTimeMs: 0, anim: 'cast',
  },
];
const FIXTURE_SKILLS: Record<string, SkillDef> = Object.fromEntries(FIXTURE_SKILL_LIST.map((s) => [s.id, s]));

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

const FIXTURE_JOBS: Record<string, JobDef> = {
  vanguard: {
    id: 'vanguard', name: 'Vanguard', tier: 1, classId: 'vanguard',
    description: 'A sturdy frontline brawler with wide sword swings.',
    playstyle: 'Stand your ground, swing hard, shrug off hits.',
    mainStat: 'str', secondaryStat: 'dex', weaponTypes: ['sword', 'axe'],
    hpPerLevel: 16, mpPerLevel: 6,
    skills: ['skill_vanguard_cleave', 'skill_vanguard_whirlwind', 'skill_vanguard_leapstrike', 'skill_vanguard_warcry', 'skill_vanguard_secondwind', 'skill_vanguard_flashstep'],
    color: '#3a6ea5',
    basicAttack: { effect: { kind: 'melee', range: 40, height: 38, offsetY: 14 }, vfx: { style: 'slash', color: '#e8f0ff' }, sfx: 'swing', castTimeMs: 260, anim: 'attack', damagePct: 100 },
    damageType: 'physical',
    starterItems: ['eq_sword_training', 'eq_armor_traveler', 'eq_boots_traveler'],
  },
};

// ---------------------------------------------------------------------------
// Monsters (ids match DESIGN.md's binding bestiary so fixtures retire automatically)
// ---------------------------------------------------------------------------

const FIXTURE_MONSTERS: Record<string, MonsterDef> = {
  puffmoss: {
    id: 'puffmoss', name: 'Puffmoss', level: 1, hp: suggestedMonsterHp(1), attack: 4, defense: 1,
    xp: suggestedMonsterXp(1), gold: [1, 3], speed: 34, behavior: 'hopper', aggressive: false,
    drops: [], sprite: { base: 'slime', palette: { primary: '#8fd98f', secondary: '#5aa65a' } },
    respawnMs: 8000,
  },
  shellsnail: {
    id: 'shellsnail', name: 'Shellsnail', level: 2, hp: suggestedMonsterHp(2), attack: 5, defense: 3,
    xp: suggestedMonsterXp(2), gold: [1, 4], speed: 24, behavior: 'walker', aggressive: false,
    drops: [], sprite: { base: 'snail', palette: { primary: '#d9b98f', secondary: '#8a6a4a' } },
    respawnMs: 9000,
  },
  sproutling: {
    id: 'sproutling', name: 'Sproutling', level: 3, hp: suggestedMonsterHp(3), attack: 6, defense: 2,
    xp: suggestedMonsterXp(3), gold: [2, 4], speed: 30, behavior: 'walker', aggressive: true,
    drops: [], sprite: { base: 'mushroom', palette: { primary: '#c96f6f', secondary: '#7a3a3a' } },
    respawnMs: 9000,
  },
  king_barnacle: {
    id: 'king_barnacle', name: 'King Barnacle', level: 11, hp: Math.round(suggestedMonsterHp(11) * 30),
    attack: 22, defense: 10, xp: suggestedMonsterXp(11) * 20, gold: [40, 80], speed: 40,
    behavior: 'boss', aggressive: true, isBoss: true, title: 'Terror of the Grotto', knockbackResist: 1,
    respawnMs: 120_000,
    attacks: [
      { id: 'bubble', kind: 'projectile', damageMult: 0.9, cooldownMs: 2600, range: 300, telegraphMs: 400, projectileSpeed: 200, count: 3, vfx: 'bubble', color: '#66ddff' },
      { id: 'slam', kind: 'slam', damageMult: 1.5, cooldownMs: 5200, range: 130, telegraphMs: 700, radius: 74, vfx: 'water', color: '#3399cc' },
      { id: 'summon', kind: 'summon', damageMult: 0, cooldownMs: 14000, range: 500, telegraphMs: 600, summonId: 'shellsnail', summonCount: 2 },
      { id: 'shock', kind: 'shockwave', damageMult: 1.1, cooldownMs: 8000, range: 340, telegraphMs: 500 },
    ],
    phases: [
      { hpBelow: 1, attacks: ['bubble', 'slam'], shout: 'You dare enter my grotto?' },
      { hpBelow: 0.5, attacks: ['bubble', 'slam', 'summon', 'shock'], speedMult: 1.3, shout: 'Crush them all!' },
    ],
    drops: [{ itemId: 'mat_king_barnacle_shell', chance: 1, min: 1, max: 1 }],
    sprite: { base: 'crab', palette: { primary: '#dd8855', secondary: '#aa5522', eye: '#ffee66' }, scale: 3.2 },
  },
};

// ---------------------------------------------------------------------------
// NPCs
// ---------------------------------------------------------------------------

const FIXTURE_NPCS: Record<string, NpcDef> = {
  npc_pell: {
    id: 'npc_pell', name: 'Old Pell', title: 'Retired Whalewatcher',
    sprite: { base: 'elder', palette: { skin: '#e8b98a', hair: '#e8e8e8', outfit: '#5a6a4a' }, accessory: 'beard' },
    greeting: "Ah, a new face on Oma's back. Mind your step near the grotto.",
    barks: ["Lovely weather on Oma's back today.", 'Mind the barnacles — they bite!', 'The whale trembled again last night...'],
  },
};

// ---------------------------------------------------------------------------
// Gather nodes
// ---------------------------------------------------------------------------

const FIXTURE_GATHER_NODES: Record<string, GatherNodeDef> = {
  node_meadow_herb: {
    id: 'node_meadow_herb', name: 'Meadow Herb', profession: 'foraging', level: 1, hits: 3,
    drops: [{ itemId: 'mat_meadow_herb', chance: 1, min: 1, max: 2 }], xp: 5, respawnMs: 15000,
    sprite: { base: 'herb', color: '#7fbf5f' },
  },
};

// ---------------------------------------------------------------------------
// Maps
// ---------------------------------------------------------------------------

function townMap(): MapDef {
  const width = 1600, height = 600;
  const groundY = height - 48;
  return {
    id: 'driftmoor_town', name: 'Driftmoor', region: 'driftmoor', theme: 'driftmoor', music: 'town',
    width, height, town: true, spawnPoint: { x: 120, y: groundY },
    platforms: [
      { x: 0, y: groundY, w: width, type: 'ground' },
      { x: 500, y: groundY - 44, w: 140, type: 'oneway' },
      { x: 900, y: groundY - 44, w: 140, type: 'oneway' },
    ],
    ropes: [],
    portals: [{ id: 'to_meadows', x: 1500, y: groundY, to: 'mossback_meadows', toPortal: 'to_town', label: 'Mossback Meadows' }],
    npcs: [{ npcId: 'npc_pell', x: 320, y: groundY }],
    spawns: [],
    gather: [],
    decor: [
      { kind: 'lamp', x: 200, y: groundY }, { kind: 'lamp', x: 1400, y: groundY },
      { kind: 'house', x: 650, y: groundY }, { kind: 'mast', x: 1100, y: groundY, front: false },
      { kind: 'crate', x: 420, y: groundY, front: true }, { kind: 'barrel', x: 460, y: groundY, front: true },
    ],
    weather: 'none', subtitle: 'Hub of the Skywhale', dark: false,
  };
}

function meadowMap(): MapDef {
  const width = 2400, height = 720;
  const groundY = height - 48;
  return {
    id: 'mossback_meadows', name: 'Mossback Meadows', region: 'driftmoor', theme: 'meadow', music: 'meadow',
    width, height, levelRange: [1, 4], spawnPoint: { x: 140, y: groundY },
    platforms: [
      { x: 0, y: groundY, w: width, type: 'ground' },
      { x: 380, y: groundY - 44, w: 150, type: 'oneway' },
      { x: 700, y: groundY - 44, w: 150, type: 'oneway' },
      { x: 1050, y: groundY - 90, w: 160, type: 'oneway' },
      { x: 1400, y: groundY - 44, w: 150, type: 'oneway' },
      { x: 1750, y: groundY - 44, w: 150, type: 'solid' },
      { x: 1950, y: groundY - 160, w: 200, type: 'oneway' },
    ],
    ropes: [{ x: 1850, top: groundY - 158, bottom: groundY - 2, kind: 'rope' }],
    portals: [{ id: 'to_town', x: 80, y: groundY, to: 'driftmoor_town', toPortal: 'to_meadows', label: 'Driftmoor' }],
    npcs: [],
    spawns: [
      { monsterId: 'puffmoss', count: 5, x1: 200, x2: 1300, respawnMs: 8000 },
      { monsterId: 'shellsnail', count: 3, x1: 900, x2: 1700, respawnMs: 10000 },
      { monsterId: 'sproutling', count: 3, x1: 1400, x2: 2200, respawnMs: 9000 },
    ],
    gather: [{ nodeId: 'node_meadow_herb', x: 600, y: groundY }],
    decor: [
      { kind: 'tree', x: 260, y: groundY }, { kind: 'bush', x: 520, y: groundY, front: true },
      { kind: 'flower', x: 640, y: groundY, front: true }, { kind: 'rock', x: 1250, y: groundY, front: true },
      { kind: 'mushroom', x: 1600, y: groundY, front: true }, { kind: 'tree', x: 2100, y: groundY },
    ],
    boss: { monsterId: 'king_barnacle', x: 2150, y: groundY, respawnMs: 120_000 },
    weather: 'leaves', subtitle: 'A tutorial field on the whale-back', dark: false,
  };
}

const FIXTURE_MAPS: Record<string, MapDef> = {
  driftmoor_town: townMap(),
  mossback_meadows: meadowMap(),
};

// ---------------------------------------------------------------------------
// Lookups with fallback (real data wins whenever the id exists there)
// ---------------------------------------------------------------------------

export function getMapDef(id: string): MapDef | undefined { return MAPS[id] ?? FIXTURE_MAPS[id]; }
/** Never-undefined variant: falls back to the fixture town so the engine can always boot a scene. */
export function getMapDefOrFallback(id: string): MapDef {
  const m = getMapDef(id);
  if (m) return m;
  console.warn(`[fixtures] map "${id}" not found in data or fixtures — falling back to ${FIXTURE_START_MAP}`);
  return FIXTURE_MAPS[FIXTURE_START_MAP];
}
/** Never-undefined variant: falls back to the fixture vanguard kit so combat always has a job to run. */
export function getJobDefOrFallback(id: string): JobDef {
  const j = getJobDef(id);
  if (j) return j;
  return FIXTURE_JOBS.vanguard;
}
export function getMonsterDef(id: string): MonsterDef | undefined { return MONSTERS[id] ?? FIXTURE_MONSTERS[id]; }
export function getJobDef(id: string): JobDef | undefined { return JOBS[id] ?? FIXTURE_JOBS[id]; }
export function getSkillDef(id: string): SkillDef | undefined { return SKILLS[id] ?? FIXTURE_SKILLS[id]; }
export function getNpcDef(id: string): NpcDef | undefined { return NPCS[id] ?? FIXTURE_NPCS[id]; }
export function getGatherNodeDef(id: string): GatherNodeDef | undefined { return GATHER_NODES[id] ?? FIXTURE_GATHER_NODES[id]; }

/** Fallback entry map id used when a character's saved mapId isn't known anywhere (very first boot). */
export const FIXTURE_START_MAP = 'driftmoor_town';

export const FIXTURE_IDS = {
  maps: Object.keys(FIXTURE_MAPS),
  monsters: Object.keys(FIXTURE_MONSTERS),
  jobs: Object.keys(FIXTURE_JOBS),
  skills: Object.keys(FIXTURE_SKILLS),
  npcs: Object.keys(FIXTURE_NPCS),
  gatherNodes: Object.keys(FIXTURE_GATHER_NODES),
};
