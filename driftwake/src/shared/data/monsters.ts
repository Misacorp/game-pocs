import type { DropEntry, MonsterAttack, MonsterDef } from '../types';

// ---------------------------------------------------------------------------
// Small local helpers (not exported — keeps the roster below readable).
// ---------------------------------------------------------------------------

function mat(itemId: string, chance: number, min = 1, max = 1): DropEntry {
  return { itemId, chance, min, max };
}

/** Baseline potion / enhancement-stone tail every non-boss monster gets, plus its own region materials & extras. */
function drops(mats: DropEntry[], hpPot: string, mpPot: string, opts?: { stone2?: boolean; extra?: DropEntry[] }): DropEntry[] {
  const out: DropEntry[] = [
    ...mats,
    mat(hpPot, 0.09),
    mat(mpPot, 0.06),
    mat('mat_enhance_stone_1', 0.015),
  ];
  if (opts?.stone2) out.push(mat('mat_enhance_stone_2', 0.01));
  if (opts?.extra) out.push(...opts.extra);
  return out;
}

function bossDrops(bossMat: string, extra: DropEntry[] = []): DropEntry[] {
  return [
    mat(bossMat, 1, 1, 3),
    ...extra,
    mat('use_hp_potion_l', 0.6),
    mat('use_hp_potion_xl', 0.4),
    mat('use_mp_potion_l', 0.5),
    mat('use_mp_potion_xl', 0.3),
    mat('mat_enhance_stone_1', 0.5, 1, 2),
    mat('mat_enhance_stone_2', 0.35, 1, 2),
    mat('mat_enhance_stone_3', 0.15),
  ];
}

function proj(id: string, opts: Partial<MonsterAttack> & { damageMult: number; cooldownMs: number; range: number; telegraphMs: number }): MonsterAttack {
  return { id, kind: 'projectile', projectileSpeed: 170, vfx: 'bolt', color: '#8fd6ff', ...opts };
}

function charge(id: string, opts: Partial<MonsterAttack> & { damageMult: number; cooldownMs: number; range: number; telegraphMs: number }): MonsterAttack {
  return { id, kind: 'charge', vfx: 'wind', color: '#ffcf6b', ...opts };
}

// ---------------------------------------------------------------------------
// Driftmoor (levels 1-11)
// ---------------------------------------------------------------------------

const DRIFTMOOR_MONSTERS: MonsterDef[] = [
  {
    id: 'puffmoss', name: 'Puffmoss', level: 1, hp: 32, attack: 7, defense: 1, xp: 9, gold: [2, 4],
    speed: 35, behavior: 'hopper', aggressive: false,
    drops: drops([mat('mat_puffmoss_fluff', 0.45), mat('mat_snail_shell', 0.15)], 'use_hp_potion_s', 'use_mp_potion_s'),
    sprite: { base: 'slime', palette: { primary: '#8fe27a', secondary: '#5fae52', eye: '#1e2b1a' }, scale: 1 },
    knockbackResist: 0, respawnMs: 6500,
  },
  {
    id: 'shellsnail', name: 'Shellsnail', level: 2, hp: 61, attack: 9, defense: 2, xp: 15, gold: [4, 8],
    speed: 28, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_snail_shell', 0.45), mat('mat_puffmoss_fluff', 0.15)], 'use_hp_potion_s', 'use_mp_potion_s'),
    sprite: { base: 'snail', palette: { primary: '#d9b48a', secondary: '#a97c50', eye: '#2a1c10' }, scale: 1 },
    knockbackResist: 0.2, respawnMs: 6500,
  },
  {
    id: 'sproutling', name: 'Sproutling', level: 3, hp: 97, attack: 12, defense: 4, xp: 22, gold: [6, 12],
    speed: 32, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_sprout_cap', 0.45), mat('mat_dewbug_wing', 0.15)], 'use_hp_potion_s', 'use_mp_potion_s',
      { extra: [mat('qi_blighted_spore', 0.25)] }),
    sprite: { base: 'mushroom', palette: { primary: '#e8735a', secondary: '#f7d9c4', eye: '#2a1c10' }, scale: 1 },
    knockbackResist: 0.15, respawnMs: 7000,
  },
  {
    id: 'dewbug', name: 'Dewbug', level: 4, hp: 140, attack: 16, defense: 5, xp: 30, gold: [8, 16],
    speed: 38, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_dewbug_wing', 0.45), mat('mat_sprout_cap', 0.15)], 'use_hp_potion_s', 'use_mp_potion_s',
      { extra: [mat('qi_blighted_spore', 0.25)] }),
    sprite: { base: 'beetle', palette: { primary: '#6fc7e0', secondary: '#3d8fa8', eye: '#0e1c22' }, scale: 1 },
    knockbackResist: 0.2, respawnMs: 7000,
  },
  {
    id: 'mossback_boar', name: 'Mossback Boar', level: 6, hp: 245, attack: 23, defense: 7, xp: 49, gold: [12, 24],
    speed: 45, behavior: 'charger', aggressive: false,
    attacks: [charge('boar_charge', { damageMult: 1.3, cooldownMs: 5000, range: 300, telegraphMs: 600 })],
    drops: drops([mat('mat_boar_hide', 0.4), mat('mat_boar_meat', 0.4)], 'use_hp_potion_s', 'use_mp_potion_s'),
    sprite: { base: 'boar', palette: { primary: '#8a6b4a', secondary: '#5a4128', accent: '#2f2015', eye: '#120c08' }, scale: 1.1 },
    knockbackResist: 0.3, respawnMs: 7500,
  },
  {
    id: 'grotto_crab', name: 'Grotto Crab', level: 7, hp: 306, attack: 30, defense: 8, xp: 60, gold: [14, 28],
    speed: 30, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_crab_claw', 0.4), mat('mat_glowing_barnacle', 0.25)], 'use_hp_potion_s', 'use_mp_potion_s',
      { extra: [mat('qi_lost_locket', 0.08)] }),
    sprite: { base: 'crab', palette: { primary: '#3d8f7a', secondary: '#295c4d', eye: '#e8f7ee' }, scale: 1 },
    knockbackResist: 0.3, respawnMs: 7000,
  },
  {
    id: 'barnacle_bat', name: 'Barnacle Bat', level: 8, hp: 371, attack: 34, defense: 10, xp: 71, gold: [16, 32],
    speed: 55, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_bat_wing', 0.4), mat('mat_glowing_barnacle', 0.2)], 'use_hp_potion_s', 'use_mp_potion_s'),
    sprite: { base: 'bat', palette: { primary: '#5a4a7a', secondary: '#382a52', eye: '#ff6b6b' }, scale: 1 },
    knockbackResist: 0.1, respawnMs: 7500,
  },
  {
    id: 'glowjelly', name: 'Glowjelly', level: 8, hp: 371, attack: 34, defense: 10, xp: 71, gold: [16, 32],
    speed: 42, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_jelly_goo', 0.4), mat('mat_glowing_barnacle', 0.2)], 'use_hp_potion_s', 'use_mp_potion_s'),
    sprite: { base: 'jelly', palette: { primary: '#7ee0d8', secondary: '#3aa89e', accent: '#e8fff9' }, scale: 1 },
    knockbackResist: 0, respawnMs: 7500,
  },
  {
    id: 'rustclaw_crab', name: 'Rustclaw Crab', level: 10, hp: 517, attack: 40, defense: 12, xp: 96, gold: [20, 40],
    speed: 34, behavior: 'walker', aggressive: true,
    drops: drops([mat('mat_rust_shell', 0.4), mat('mat_crab_claw', 0.25), mat('mat_glowing_barnacle', 0.15)], 'use_hp_potion_m', 'use_mp_potion_s'),
    sprite: { base: 'crab', palette: { primary: '#b5502e', secondary: '#7a3319', eye: '#fff0d8' }, variant: 1, scale: 1.1 },
    knockbackResist: 0.35, respawnMs: 8000,
  },
  {
    id: 'king_barnacle', name: 'King Barnacle', level: 11, hp: 44700, attack: 46, defense: 22, xp: 1870, gold: [220, 400],
    speed: 30, behavior: 'boss', aggressive: true, isBoss: true, title: 'The Barnacled King',
    attacks: [
      { id: 'kb_pincer_slam', kind: 'slam', damageMult: 1.3, cooldownMs: 4200, range: 220, telegraphMs: 800, radius: 140, vfx: 'explosion', color: '#c98a4a' },
      { id: 'kb_shell_wave', kind: 'shockwave', damageMult: 1.0, cooldownMs: 6500, range: 9999, telegraphMs: 700, vfx: 'wave', color: '#4a8fb5' },
      { id: 'kb_barnacle_leap', kind: 'leap', damageMult: 1.4, cooldownMs: 7500, range: 320, telegraphMs: 900, radius: 100, vfx: 'arc', color: '#c98a4a' },
      { id: 'kb_shell_rain', kind: 'rain', damageMult: 0.9, cooldownMs: 9000, range: 420, telegraphMs: 1000, count: 6, vfx: 'water', color: '#4a8fb5' },
    ],
    phases: [
      { hpBelow: 1, attacks: ['kb_pincer_slam', 'kb_shell_wave'], speedMult: 1, shout: 'The King stirs beneath the barnacles!' },
      { hpBelow: 0.6, attacks: ['kb_pincer_slam', 'kb_shell_wave', 'kb_barnacle_leap'], speedMult: 1.1, shout: 'You dare disturb my shell?!' },
      { hpBelow: 0.3, attacks: ['kb_pincer_slam', 'kb_shell_wave', 'kb_barnacle_leap', 'kb_shell_rain'], speedMult: 1.25, shout: 'CRACK THE TIDE UPON THEM!' },
    ],
    drops: bossDrops('mat_king_barnacle_shell', [mat('qi_blighted_core', 1)]),
    sprite: { base: 'crab', palette: { primary: '#4a7a5a', secondary: '#2e4d38', accent: '#c98a4a', eye: '#fff0d8' }, scale: 3, variant: 2 },
    knockbackResist: 1, immune: ['stun', 'freeze'], respawnMs: 150000,
  },
];

// ---------------------------------------------------------------------------
// Finreach (levels 10-18)
// ---------------------------------------------------------------------------

const FINREACH_MONSTERS: MonsterDef[] = [
  {
    id: 'kelp_sprite', name: 'Kelp Sprite', level: 11, hp: 477, attack: 43, defense: 13, xp: 110, gold: [22, 44],
    speed: 55, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_kelp_essence', 0.4), mat('mat_spore_dust', 0.15)], 'use_hp_potion_m', 'use_mp_potion_m',
      { extra: [mat('qi_kelp_sample', 0.3)] }),
    sprite: { base: 'wisp', palette: { primary: '#8ef2b0', secondary: '#4bb37e', accent: '#e8fff2' }, scale: 1 },
    knockbackResist: 0, respawnMs: 7000,
  },
  {
    id: 'tanglevine', name: 'Tanglevine', level: 12, hp: 679, attack: 46, defense: 14, xp: 123, gold: [24, 48],
    speed: 0, behavior: 'stationary', aggressive: false,
    attacks: [proj('vine_thorn_shot', { damageMult: 0.9, cooldownMs: 3000, range: 220, telegraphMs: 500, projectileSpeed: 160, vfx: 'bolt', color: '#5a9e4a' })],
    drops: drops([mat('mat_vine_thorn', 0.4), mat('mat_kelp_essence', 0.2)], 'use_hp_potion_m', 'use_mp_potion_m',
      { extra: [mat('qi_kelp_sample', 0.3)] }),
    sprite: { base: 'plant', palette: { primary: '#5a9e4a', secondary: '#3a6b30', accent: '#c9e87a', eye: '#1a2a12' }, scale: 1.1 },
    knockbackResist: 0.4, respawnMs: 8000,
  },
  {
    id: 'driftfin_eel', name: 'Driftfin Eel', level: 13, hp: 766, attack: 50, defense: 16, xp: 138, gold: [26, 52],
    speed: 60, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_eel_fillet', 0.4), mat('mat_kelp_essence', 0.15)], 'use_hp_potion_m', 'use_mp_potion_m'),
    sprite: { base: 'eel', palette: { primary: '#4a8fc9', secondary: '#2a5a8a', eye: '#e8f7ff' }, scale: 1.1 },
    knockbackResist: 0.1, respawnMs: 7500,
  },
  {
    id: 'spore_mushling', name: 'Spore Mushling', level: 14, hp: 857, attack: 53, defense: 17, xp: 153, gold: [28, 56],
    speed: 34, behavior: 'hopper', aggressive: false,
    drops: drops([mat('mat_spore_dust', 0.4), mat('mat_vine_thorn', 0.15)], 'use_hp_potion_m', 'use_mp_potion_m'),
    sprite: { base: 'mushroom', palette: { primary: '#c9a2e0', secondary: '#8a5cae', eye: '#2a1a30' }, variant: 1, scale: 1.1 },
    knockbackResist: 0.15, respawnMs: 7500,
  },
  {
    id: 'poacher', name: 'Harpooner Poacher', level: 15, hp: 951, attack: 56, defense: 18, xp: 168, gold: [30, 60],
    speed: 40, behavior: 'walker', aggressive: false,
    attacks: [proj('poacher_bolt', { damageMult: 1.0, cooldownMs: 3200, range: 240, telegraphMs: 500, projectileSpeed: 180, vfx: 'bullet', color: '#c9c9c9' })],
    drops: drops([mat('mat_poacher_cloth', 0.4), mat('mat_spider_silk', 0.15)], 'use_hp_potion_m', 'use_mp_potion_m',
      { extra: [mat('qi_poacher_orders', 0.15)] }),
    sprite: { base: 'humanoid', palette: { primary: '#5a5a4a', secondary: '#3a3a2e', accent: '#8a2a2a', eye: '#e8e8d8' }, scale: 1.1 },
    knockbackResist: 0.2, respawnMs: 8000,
  },
  {
    id: 'kelp_spider', name: 'Kelp Spider', level: 16, hp: 1049, attack: 59, defense: 19, xp: 184, gold: [32, 64],
    speed: 48, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_spider_silk', 0.4), mat('mat_poacher_cloth', 0.15)], 'use_hp_potion_m', 'use_mp_potion_m'),
    sprite: { base: 'spider', palette: { primary: '#2a2a3a', secondary: '#4a4a5a', accent: '#8ef2b0', eye: '#ff4a4a' }, scale: 1.1 },
    knockbackResist: 0.25, respawnMs: 8000,
  },
  {
    id: 'old_tangle', name: 'Old Tangle', level: 17, hp: 92100, attack: 62, defense: 30, xp: 3618, gold: [400, 700],
    speed: 25, behavior: 'boss', aggressive: true, isBoss: true, title: 'The Ancient Root',
    attacks: [
      { id: 'ot_root_slam', kind: 'slam', damageMult: 1.3, cooldownMs: 4200, range: 240, telegraphMs: 800, radius: 150, vfx: 'wave', color: '#3a6b30' },
      { id: 'ot_thorn_shockwave', kind: 'shockwave', damageMult: 1.0, cooldownMs: 6000, range: 9999, telegraphMs: 700, vfx: 'wave', color: '#5a9e4a' },
      { id: 'ot_spore_rain', kind: 'rain', damageMult: 0.9, cooldownMs: 8500, range: 420, telegraphMs: 1000, count: 7, vfx: 'poison', color: '#8a5cae' },
      { id: 'ot_vine_summon', kind: 'summon', damageMult: 0, cooldownMs: 12000, range: 9999, telegraphMs: 1000, summonId: 'tanglevine', summonCount: 2, vfx: 'buff', color: '#5a9e4a' },
    ],
    phases: [
      { hpBelow: 1, attacks: ['ot_root_slam', 'ot_thorn_shockwave'], speedMult: 1, shout: 'Roots creak awake beneath the kelp...' },
      { hpBelow: 0.6, attacks: ['ot_root_slam', 'ot_thorn_shockwave', 'ot_spore_rain'], speedMult: 1.1, shout: 'The heartwood remembers every axe.' },
      { hpBelow: 0.3, attacks: ['ot_root_slam', 'ot_thorn_shockwave', 'ot_spore_rain', 'ot_vine_summon'], speedMult: 1.2, shout: 'GROW. STRANGLE. ENDURE.' },
    ],
    drops: bossDrops('mat_tangle_heartwood'),
    sprite: { base: 'hydra', palette: { primary: '#3a6b30', secondary: '#1e3a18', accent: '#c9e87a', eye: '#ff8a4a' }, scale: 3, variant: 1 },
    knockbackResist: 1, immune: ['stun', 'freeze'], respawnMs: 160000,
  },
];

// ---------------------------------------------------------------------------
// Stormbreak (levels 16-24)
// ---------------------------------------------------------------------------

const STORMBREAK_MONSTERS: MonsterDef[] = [
  {
    id: 'gust_wisp', name: 'Gust Wisp', level: 17, hp: 921, attack: 62, defense: 20, xp: 201, gold: [34, 68], // wisp: -20% hp
    speed: 60, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_wisp_essence', 0.4), mat('mat_cloud_fluff', 0.15)], 'use_hp_potion_l', 'use_mp_potion_m'),
    sprite: { base: 'wisp', palette: { primary: '#d8eaff', secondary: '#8fb8e0', accent: '#ffffff' }, scale: 1 },
    knockbackResist: 0, respawnMs: 7500,
  },
  {
    id: 'cloud_puff', name: 'Cloud Puff', level: 18, hp: 1255, attack: 66, defense: 22, xp: 217, gold: [36, 72],
    speed: 36, behavior: 'hopper', aggressive: false,
    drops: drops([mat('mat_cloud_fluff', 0.4), mat('mat_wisp_essence', 0.15)], 'use_hp_potion_l', 'use_mp_potion_m'),
    sprite: { base: 'slime', palette: { primary: '#f0f4ff', secondary: '#c9d8f0', eye: '#4a5a7a' }, variant: 2, scale: 1.1 },
    knockbackResist: 0.1, respawnMs: 7500,
  },
  {
    id: 'stormhawk', name: 'Stormhawk', level: 19, hp: 1363, attack: 69, defense: 23, xp: 235, gold: [38, 76],
    speed: 65, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_storm_feather', 0.4), mat('mat_sky_egg', 0.35)], 'use_hp_potion_l', 'use_mp_potion_m'),
    sprite: { base: 'bird', palette: { primary: '#5a6a9e', secondary: '#3a4a7a', accent: '#e0c96b', eye: '#ffe08a' }, scale: 1.1 },
    knockbackResist: 0.15, respawnMs: 8000,
  },
  {
    id: 'thunder_beetle', name: 'Thunder Beetle', level: 20, hp: 1475, attack: 72, defense: 24, xp: 252, gold: [40, 80],
    speed: 50, behavior: 'charger', aggressive: false,
    attacks: [charge('beetle_charge', { damageMult: 1.3, cooldownMs: 5000, range: 320, telegraphMs: 600, vfx: 'lightning', color: '#e0d84a' })],
    drops: drops([mat('mat_thunder_carapace', 0.4), mat('mat_storm_feather', 0.15)], 'use_hp_potion_l', 'use_mp_potion_m'),
    sprite: { base: 'beetle', palette: { primary: '#4a4a6a', secondary: '#e0d84a', accent: '#2a2a4a', eye: '#ffffff' }, scale: 1.1 },
    knockbackResist: 0.3, respawnMs: 8000,
  },
  {
    id: 'cliff_golem', name: 'Cliff Golem', level: 21, hp: 2066, attack: 75, defense: 25, xp: 270, gold: [42, 84], // golem: +30% hp
    speed: 26, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_golem_core', 0.35), mat('mat_thunder_carapace', 0.15)], 'use_hp_potion_l', 'use_mp_potion_m'),
    sprite: { base: 'golem', palette: { primary: '#8a8a8a', secondary: '#5a5a5a', accent: '#e0d84a', eye: '#4ae0ff' }, scale: 1.3 },
    knockbackResist: 0.6, respawnMs: 8500,
  },
  {
    id: 'sky_raider', name: 'Sky Raider', level: 22, hp: 1706, attack: 78, defense: 26, xp: 289, gold: [44, 88],
    speed: 42, behavior: 'walker', aggressive: false,
    attacks: [proj('raider_shot', { damageMult: 1.05, cooldownMs: 3000, range: 250, telegraphMs: 450, projectileSpeed: 190, vfx: 'bullet', color: '#e0d84a' })],
    drops: drops([mat('mat_raider_badge', 0.4), mat('mat_golem_core', 0.1)], 'use_hp_potion_l', 'use_mp_potion_m'),
    sprite: { base: 'humanoid', palette: { primary: '#3a4a5a', secondary: '#2a3a4a', accent: '#e0d84a', eye: '#ffffff' }, variant: 1, scale: 1.1 },
    knockbackResist: 0.2, respawnMs: 8500,
  },
  {
    id: 'kraelith', name: 'Kraelith, the Storm Roc', level: 24, hp: 165800, attack: 85, defense: 40, xp: 6213, gold: [700, 1100],
    speed: 45, behavior: 'boss', aggressive: true, isBoss: true, title: 'The Storm Roc',
    attacks: [
      { id: 'kr_wing_slam', kind: 'slam', damageMult: 1.3, cooldownMs: 4000, range: 240, telegraphMs: 750, radius: 160, vfx: 'wind', color: '#c9d8f0' },
      { id: 'kr_feather_rain', kind: 'rain', damageMult: 0.9, cooldownMs: 7000, range: 450, telegraphMs: 1000, count: 8, vfx: 'wind', color: '#e0e8f7' },
      { id: 'kr_lightning_beam', kind: 'beam', damageMult: 1.4, cooldownMs: 8000, range: 9999, telegraphMs: 900, vfx: 'lightning', color: '#e0d84a' },
      { id: 'kr_dive_leap', kind: 'leap', damageMult: 1.5, cooldownMs: 9000, range: 400, telegraphMs: 850, radius: 120, vfx: 'wind', color: '#c9d8f0' },
    ],
    phases: [
      { hpBelow: 1, attacks: ['kr_wing_slam', 'kr_feather_rain'], speedMult: 1, shout: 'The storm answers to no one!' },
      { hpBelow: 0.6, attacks: ['kr_wing_slam', 'kr_feather_rain', 'kr_lightning_beam'], speedMult: 1.15, shout: 'Feel the sky\'s fury!' },
      { hpBelow: 0.3, attacks: ['kr_wing_slam', 'kr_feather_rain', 'kr_lightning_beam', 'kr_dive_leap'], speedMult: 1.3, shout: 'FALL FROM MY AERIE!' },
    ],
    drops: bossDrops('mat_storm_plume'),
    sprite: { base: 'roc', palette: { primary: '#4a5a8a', secondary: '#2a3a5a', accent: '#e0d84a', eye: '#ffe08a' }, scale: 3.2, variant: 1 },
    knockbackResist: 1, immune: ['stun', 'freeze'], respawnMs: 170000,
  },
];

// ---------------------------------------------------------------------------
// Lanternreef (levels 23-30)
// ---------------------------------------------------------------------------

const LANTERNREEF_MONSTERS: MonsterDef[] = [
  {
    id: 'lantern_jelly', name: 'Lantern Jelly', level: 23, hp: 1826, attack: 82, defense: 28, xp: 308, gold: [46, 92],
    speed: 40, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_lantern_goo', 0.4), mat('mat_glimmer_scale', 0.15)], 'use_hp_potion_l', 'use_mp_potion_l'),
    sprite: { base: 'jelly', palette: { primary: '#e0a2ff', secondary: '#8a4ab5', accent: '#fff0ff' }, scale: 1.1 },
    knockbackResist: 0, respawnMs: 8000,
  },
  {
    id: 'reef_crab', name: 'Reef Crab', level: 24, hp: 1950, attack: 85, defense: 29, xp: 327, gold: [48, 96],
    speed: 32, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_reef_claw', 0.4), mat('mat_coral_chunk', 0.2)], 'use_hp_potion_l', 'use_mp_potion_l'),
    sprite: { base: 'crab', palette: { primary: '#e0704a', secondary: '#a04a2a', eye: '#fff0d8' }, variant: 2, scale: 1.1 },
    knockbackResist: 0.3, respawnMs: 8000,
  },
  {
    id: 'glimmerfish', name: 'Glimmerfish', level: 25, hp: 2076, attack: 88, defense: 30, xp: 347, gold: [50, 100],
    speed: 55, behavior: 'flyer', aggressive: false,
    drops: drops([mat('mat_glimmer_scale', 0.4), mat('mat_fish_fillet', 0.4)], 'use_hp_potion_l', 'use_mp_potion_l'),
    sprite: { base: 'fish', palette: { primary: '#4ad8e0', secondary: '#2a8a9e', accent: '#e0fff7', eye: '#0a1a1e' }, scale: 1.1 },
    knockbackResist: 0.1, respawnMs: 8000,
  },
  {
    id: 'coral_golem', name: 'Coral Golem', level: 26, hp: 2865, attack: 91, defense: 31, xp: 366, gold: [52, 104], // golem +30%
    speed: 26, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_coral_chunk', 0.35), mat('mat_reef_claw', 0.15)], 'use_hp_potion_l', 'use_mp_potion_l'),
    sprite: { base: 'golem', palette: { primary: '#e08a6b', secondary: '#a0503a', accent: '#4ad8e0', eye: '#4ae0ff' }, scale: 1.3 },
    knockbackResist: 0.6, respawnMs: 8500,
  },
  {
    id: 'abyss_eel', name: 'Abyss Eel', level: 27, hp: 2336, attack: 94, defense: 32, xp: 387, gold: [54, 108],
    speed: 65, behavior: 'flyer', aggressive: true,
    drops: drops([mat('mat_abyss_fang', 0.4), mat('mat_fish_fillet', 0.3)], 'use_hp_potion_l', 'use_mp_potion_l'),
    sprite: { base: 'eel', palette: { primary: '#2a2a4a', secondary: '#1a1a2e', accent: '#8a2aff', eye: '#ff2a6b' }, scale: 1.2 },
    knockbackResist: 0.15, respawnMs: 8500,
  },
  {
    id: 'drowned_sailor', name: 'Drowned Sailor', level: 28, hp: 2470, attack: 98, defense: 34, xp: 407, gold: [56, 112],
    speed: 34, behavior: 'walker', aggressive: false,
    attacks: [proj('drowned_toss', { damageMult: 0.85, cooldownMs: 3500, range: 220, telegraphMs: 550, projectileSpeed: 150, vfx: 'water', color: '#4a6b7a' })],
    drops: drops([mat('mat_drowned_cloth', 0.4), mat('mat_abyss_fang', 0.15)], 'use_hp_potion_l', 'use_mp_potion_l',
      { stone2: true, extra: [mat('qi_logbook_page', 0.25)] }),
    sprite: { base: 'humanoid', palette: { primary: '#3a5a5a', secondary: '#2a4040', accent: '#4a8a7a', eye: '#8affea' }, variant: 2, scale: 1.1 },
    knockbackResist: 0.25, respawnMs: 8500,
  },
  {
    id: 'captain_rook', name: 'Captain Vashti Rook', level: 30, hp: 247200, attack: 104, defense: 48, xp: 9000, gold: [1100, 1600],
    speed: 40, behavior: 'boss', aggressive: true, isBoss: true, title: 'The Ghost of the Sunken Galleon',
    attacks: [
      { id: 'cr_cutlass_slam', kind: 'slam', damageMult: 1.3, cooldownMs: 3800, range: 220, telegraphMs: 700, radius: 140, vfx: 'heavySlash', color: '#8affea' },
      { id: 'cr_flintlock_shot', kind: 'projectile', damageMult: 1.1, cooldownMs: 3200, range: 300, telegraphMs: 500, projectileSpeed: 220, count: 3, vfx: 'bullet', color: '#ffcf6b' },
      { id: 'cr_ghost_rain', kind: 'rain', damageMult: 0.9, cooldownMs: 8000, range: 420, telegraphMs: 1000, count: 7, vfx: 'shadow', color: '#4a6b7a' },
      { id: 'cr_crew_summon', kind: 'summon', damageMult: 0, cooldownMs: 13000, range: 9999, telegraphMs: 1000, summonId: 'drowned_sailor', summonCount: 2, vfx: 'shadow', color: '#3a5a5a' },
      { id: 'cr_harpoon_beam', kind: 'beam', damageMult: 1.5, cooldownMs: 9500, range: 9999, telegraphMs: 950, vfx: 'thrust', color: '#8affea' },
    ],
    phases: [
      { hpBelow: 1, attacks: ['cr_cutlass_slam', 'cr_flintlock_shot'], speedMult: 1, shout: 'Another soul for the deep.' },
      { hpBelow: 0.6, attacks: ['cr_cutlass_slam', 'cr_flintlock_shot', 'cr_ghost_rain', 'cr_crew_summon'], speedMult: 1.1, shout: 'Rise, my crew! One more boarding!' },
      { hpBelow: 0.3, attacks: ['cr_cutlass_slam', 'cr_flintlock_shot', 'cr_ghost_rain', 'cr_crew_summon', 'cr_harpoon_beam'], speedMult: 1.25, shout: 'I steered her once — I\'ll steer you to the bottom!' },
    ],
    drops: bossDrops('mat_captain_doubloon', [mat('qi_logbook_page', 1, 1, 2)]),
    sprite: { base: 'captain', palette: { primary: '#3a5a5a', secondary: '#8affea', accent: '#ffcf6b', eye: '#ff2a6b' }, scale: 3, variant: 1 },
    knockbackResist: 1, immune: ['stun', 'freeze'], respawnMs: 180000,
  },
];

// ---------------------------------------------------------------------------
// Hollow (levels 29-36)
// ---------------------------------------------------------------------------

const HOLLOW_MONSTERS: MonsterDef[] = [
  {
    id: 'blight_slime', name: 'Blight Slime', level: 29, hp: 2607, attack: 101, defense: 35, xp: 428, gold: [58, 116],
    speed: 30, behavior: 'hopper', aggressive: false,
    drops: drops([mat('mat_blight_goo', 0.4), mat('mat_rot_cap', 0.15)], 'use_hp_potion_xl', 'use_mp_potion_xl', { stone2: true }),
    sprite: { base: 'slime', palette: { primary: '#9a4ae0', secondary: '#5a2a8a', eye: '#e08aff' }, variant: 3, scale: 1.1 },
    knockbackResist: 0, respawnMs: 8500,
  },
  {
    id: 'rot_mushling', name: 'Rot Mushling', level: 30, hp: 2747, attack: 104, defense: 36, xp: 450, gold: [60, 120],
    speed: 32, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_rot_cap', 0.4), mat('mat_blight_goo', 0.15)], 'use_hp_potion_xl', 'use_mp_potion_xl', { stone2: true }),
    sprite: { base: 'mushroom', palette: { primary: '#6a4a8a', secondary: '#4a2a5a', eye: '#e08aff' }, variant: 2, scale: 1.1 },
    knockbackResist: 0.2, respawnMs: 8500,
  },
  {
    id: 'parasite_grub', name: 'Parasite Grub', level: 31, hp: 2889, attack: 107, defense: 37, xp: 471, gold: [62, 124],
    speed: 28, behavior: 'walker', aggressive: false,
    drops: drops([mat('mat_grub_meat', 0.4), mat('mat_rot_cap', 0.15)], 'use_hp_potion_xl', 'use_mp_potion_xl', { stone2: true }),
    sprite: { base: 'grub', palette: { primary: '#8a9e4a', secondary: '#5a6b2a', eye: '#e0ff8a' }, scale: 1.1 },
    knockbackResist: 0.2, respawnMs: 8500,
  },
  {
    id: 'hollow_sentinel', name: 'Hollow Sentinel', level: 32, hp: 3944, attack: 110, defense: 38, xp: 493, gold: [64, 128], // golem +30%
    speed: 28, behavior: 'walker', aggressive: true,
    drops: drops([mat('mat_sentinel_rune', 0.35), mat('mat_grub_meat', 0.15)], 'use_hp_potion_xl', 'use_mp_potion_xl',
      { stone2: true, extra: [mat('qi_echo_shard', 0.25)] }),
    sprite: { base: 'golem', palette: { primary: '#4a3a5a', secondary: '#2a1e3a', accent: '#9a4ae0', eye: '#ff4a4a' }, scale: 1.3 },
    knockbackResist: 0.6, respawnMs: 9000,
  },
  {
    id: 'blighted_bat', name: 'Blighted Bat', level: 33, hp: 3181, attack: 114, defense: 40, xp: 515, gold: [66, 132],
    speed: 60, behavior: 'flyer', aggressive: true,
    drops: drops([mat('mat_blighted_wing', 0.4), mat('mat_sentinel_rune', 0.15)], 'use_hp_potion_xl', 'use_mp_potion_xl', { stone2: true }),
    sprite: { base: 'bat', palette: { primary: '#6a2a8a', secondary: '#3a1a4a', eye: '#ff4a4a' }, variant: 2, scale: 1.1 },
    knockbackResist: 0.1, respawnMs: 9000,
  },
  {
    id: 'whisper_wraith', name: 'Whisper Wraith', level: 34, hp: 3331, attack: 117, defense: 41, xp: 538, gold: [68, 136],
    speed: 45, behavior: 'flyer', aggressive: false,
    attacks: [proj('wraith_whisper', { damageMult: 1.1, cooldownMs: 2800, range: 260, telegraphMs: 450, projectileSpeed: 200, vfx: 'shadow', color: '#9a4ae0' })],
    drops: drops([mat('mat_wraith_wisp', 0.4), mat('mat_blighted_wing', 0.15)], 'use_hp_potion_xl', 'use_mp_potion_xl',
      { stone2: true, extra: [mat('qi_echo_shard', 0.25)] }),
    sprite: { base: 'wraith', palette: { primary: '#2a1a3a', secondary: '#4a2a5a', accent: '#9a4ae0', eye: '#e08aff' }, scale: 1.2 },
    knockbackResist: 0.15, respawnMs: 9000,
  },
  {
    id: 'blight_tendril', name: 'Blight Tendril', level: 33, hp: 2545, attack: 114, defense: 40, xp: 515, gold: [66, 132],
    speed: 0, behavior: 'stationary', aggressive: true,
    attacks: [proj('tendril_lash', { damageMult: 0.9, cooldownMs: 2600, range: 200, telegraphMs: 450, projectileSpeed: 170, vfx: 'poison', color: '#9a4ae0' })],
    drops: drops([mat('mat_blight_goo', 0.3), mat('mat_rot_cap', 0.2)], 'use_hp_potion_xl', 'use_mp_potion_xl'),
    sprite: { base: 'plant', palette: { primary: '#5a2a8a', secondary: '#3a1a5a', accent: '#e08aff', eye: '#ff4a4a' }, variant: 2, scale: 1.2 },
    knockbackResist: 0.4, respawnMs: 6000,
  },
  {
    id: 'blight_heart', name: 'The Blight Heart', level: 36, hp: 363700, attack: 123, defense: 55, xp: 11680, gold: [1600, 2200],
    speed: 0, behavior: 'boss', aggressive: true, isBoss: true, title: 'The Ancient Wound',
    attacks: [
      { id: 'bh_pulse_shockwave', kind: 'shockwave', damageMult: 1.3, cooldownMs: 4500, range: 9999, telegraphMs: 800, vfx: 'poison', color: '#9a4ae0' },
      { id: 'bh_spore_rain', kind: 'rain', damageMult: 1.0, cooldownMs: 7500, range: 500, telegraphMs: 1000, count: 9, vfx: 'poison', color: '#c98aff' },
      { id: 'bh_corrupt_beam', kind: 'beam', damageMult: 1.5, cooldownMs: 9000, range: 9999, telegraphMs: 1000, vfx: 'shadow', color: '#ff4a4a' },
      { id: 'bh_tendril_summon', kind: 'summon', damageMult: 0, cooldownMs: 14000, range: 9999, telegraphMs: 1000, summonId: 'blight_tendril', summonCount: 3, vfx: 'buff', color: '#5a2a8a' },
      { id: 'bh_ember_burst', kind: 'slam', damageMult: 1.4, cooldownMs: 6000, range: 260, telegraphMs: 900, radius: 180, vfx: 'explosion', color: '#ff8a4a' },
    ],
    phases: [
      { hpBelow: 1, attacks: ['bh_pulse_shockwave', 'bh_spore_rain'], speedMult: 1, shout: 'A pulse in the dark... it feels you.' },
      { hpBelow: 0.6, attacks: ['bh_pulse_shockwave', 'bh_spore_rain', 'bh_tendril_summon', 'bh_ember_burst'], speedMult: 1, shout: 'The wound festers. It will not close.' },
      { hpBelow: 0.3, attacks: ['bh_pulse_shockwave', 'bh_spore_rain', 'bh_tendril_summon', 'bh_ember_burst', 'bh_corrupt_beam'], speedMult: 1, shout: 'OMA WILL DROWN WITH ME.' },
    ],
    drops: bossDrops('mat_heart_ember', [mat('qi_ember_fragment', 1, 1, 2)]),
    sprite: { base: 'heart', palette: { primary: '#8a2a5a', secondary: '#4a1a3a', accent: '#ff4a4a', eye: '#ffcf6b' }, scale: 4, variant: 3 },
    knockbackResist: 1, immune: ['stun', 'freeze'], respawnMs: 180000,
  },
];

export const MONSTER_LIST: MonsterDef[] = [
  ...DRIFTMOOR_MONSTERS,
  ...FINREACH_MONSTERS,
  ...STORMBREAK_MONSTERS,
  ...LANTERNREEF_MONSTERS,
  ...HOLLOW_MONSTERS,
];
