import type { StatMods } from '../types';

/** Equipment set: bonuses unlock at piece counts. */
export interface SetDef {
  id: string;
  name: string;
  /** item ids in the set */
  pieces: string[];
  bonuses: { count: number; stats: StatMods }[];
}

export const SET_LIST: SetDef[] = [
  // --- Boss sets ---
  {
    id: 'set_kingsbarnacle',
    name: "King Barnacle's Battlegear",
    pieces: ['eq_armor_barnaclekingplate', 'eq_amulet_barnacle_pearl'],
    bonuses: [{ count: 2, stats: { maxHp: 40, defense: 6 } }],
  },
  {
    id: 'set_oldtangle',
    name: "Old Tangle's Grip",
    pieces: ['eq_gloves_tanglevine', 'eq_ring_tangleroot'],
    bonuses: [{ count: 2, stats: { maxMp: 35, dropBonus: 0.03 } }],
  },
  {
    id: 'set_kraelith',
    name: "Kraelith's Tempest",
    pieces: ['eq_helmet_rocfeather', 'eq_amulet_kraelith_eye'],
    bonuses: [{ count: 2, stats: { speed: 6, critRate: 0.03 } }],
  },
  {
    id: 'set_captainrook',
    name: "Captain Rook's Legacy",
    pieces: ['eq_boots_drownedsailor', 'eq_ring_rook_signet'],
    bonuses: [{ count: 2, stats: { bossDamagePct: 0.05 } }],
  },
  {
    id: 'set_blightheart',
    name: 'Blight-Purified Regalia',
    pieces: ['eq_armor_blightplate', 'eq_amulet_blightheart_core'],
    bonuses: [{ count: 2, stats: { damagePct: 0.05, maxHp: 60 } }],
  },

  // --- Crafted sets (Smithing, tier-20 Reinforced armor) ---
  {
    id: 'set_stormsteel_vanguard',
    name: 'Stormsteel Vanguard',
    pieces: ['eq_helmet_stormplate_forged', 'eq_armor_stormplate_forged', 'eq_gloves_stormplate_forged', 'eq_boots_stormplate_forged'],
    bonuses: [
      { count: 2, stats: { defense: 8 } },
      { count: 4, stats: { defense: 20, maxHp: 80 } },
    ],
  },
  {
    id: 'set_galehide_skirmisher',
    name: 'Galehide Skirmisher',
    pieces: ['eq_helmet_galehide_forged', 'eq_armor_galehide_forged', 'eq_gloves_galehide_forged', 'eq_boots_galehide_forged'],
    bonuses: [
      { count: 2, stats: { speed: 5 } },
      { count: 4, stats: { speed: 12, critRate: 0.03 } },
    ],
  },
];
