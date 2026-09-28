/**
 * DRIFTWAKE — shared type contract.
 *
 * Everything in src/shared is pure TypeScript with NO Phaser / DOM dependencies,
 * so it can run both in the browser (LocalBackend) and in a Node server.
 *
 * Coordinate convention: world units are "art pixels". y grows DOWNWARD.
 * Camera zoom renders them at 2x on screen.
 */

// ---------------------------------------------------------------------------
// Primitive ids / enums
// ---------------------------------------------------------------------------

export type StatKey = 'str' | 'dex' | 'int' | 'luk';

export type ClassId = 'vanguard' | 'stormcaller' | 'windrunner' | 'shade';
export type AdvancedJobId =
  | 'bulwark' | 'reaver'          // vanguard
  | 'tempest' | 'tidesinger'      // stormcaller
  | 'skyhunter' | 'sparkgunner'   // windrunner
  | 'duskblade' | 'hexslinger';   // shade
export type JobId = ClassId | AdvancedJobId;

export type WeaponType = 'sword' | 'axe' | 'staff' | 'wand' | 'bow' | 'gun' | 'dagger' | 'knives';

export type EquipSlot = 'weapon' | 'helmet' | 'armor' | 'gloves' | 'boots' | 'ring' | 'amulet';
export const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet'];

export type InventoryTab = 'equip' | 'use' | 'etc';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type RegionId = 'driftmoor' | 'finreach' | 'stormbreak' | 'lanternreef' | 'hollow';

/** Visual theme for tiles + parallax background of a map. */
export type ThemeId =
  | 'driftmoor'     // cozy harbor town on the whale's back, lanterns, sails, dusk sky
  | 'meadow'        // mossy green whale-back meadows, sky + distant whales
  | 'grotto'        // barnacle caves, damp teal rock, glowing barnacles
  | 'kelpwood'      // towering floating sky-kelp forest, green/amber light
  | 'galeoutpost'   // wooden outpost on cloud cliffs, windmills, skyships
  | 'stormspire'    // stormy cliffs, dark clouds, lightning flashes
  | 'lanternreef'   // bioluminescent coral reef floating in night sky
  | 'galleon'       // sunken ghost ship interior, eerie green
  | 'hollow'        // inside the whale: fleshy caverns + ancient ruins, blight purple
  | 'heart';        // final boss chamber: huge pulsing blighted heart

export type MusicId =
  | 'title' | 'town' | 'meadow' | 'cave' | 'kelp' | 'outpost'
  | 'storm' | 'reef' | 'galleon' | 'hollow' | 'boss' | 'finalboss';

export type SfxId =
  | 'swing' | 'hit' | 'crit' | 'cast' | 'shoot' | 'gunshot' | 'explosion' | 'lightning' | 'ice'
  | 'jump' | 'dash' | 'land' | 'playerHurt' | 'monsterHurt' | 'monsterDie' | 'bossRoar' | 'death'
  | 'levelUp' | 'pickup' | 'coin' | 'potion' | 'buff' | 'heal'
  | 'questAccept' | 'questComplete' | 'questProgress'
  | 'uiClick' | 'uiOpen' | 'uiClose' | 'error' | 'equip'
  | 'portal' | 'craft' | 'gather' | 'enhanceSuccess' | 'enhanceFail' | 'jobAdvance' | 'talk';

export type WeatherId = 'none' | 'rain' | 'storm' | 'snow' | 'embers' | 'bubbles' | 'leaves' | 'fireflies' | 'spores' | 'wind';

export type FactionId = 'harpooners' | 'tidekeepers';

export type ProfessionId =
  | 'mining' | 'foraging'                                 // gathering — every character has these
  | 'smithing' | 'alchemy' | 'cooking' | 'jewelcrafting'; // crafting — pick up to MAX_CRAFTING_PROFESSIONS
export type GatheringProfessionId = 'mining' | 'foraging';
export type CraftingProfessionId = 'smithing' | 'alchemy' | 'cooking' | 'jewelcrafting';

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

/**
 * Derived / combat stats. All additive when combined from sources.
 *  - maxHp, maxMp, str/dex/int/luk, attack, magicAttack, defense: flat numbers
 *  - critRate: fraction (0.05 = 5%)
 *  - critDamage: fraction BONUS on top of the base 1.5x crit multiplier (0.2 = crits deal 1.7x)
 *  - speed, jump: percent points added to 100 (10 = 110% move speed)
 *  - hpRegen, mpRegen: points per 5 seconds (out of combat regen is doubled)
 *  - xpBonus, goldBonus, dropBonus, damagePct, bossDamagePct, cooldownReduction: fractions (0.1 = +10%)
 *  - hpPct / mpPct: fraction bonus to maxHp/maxMp
 *  - avoid: fraction chance to dodge contact damage (cap 0.5)
 */
export interface DerivedStats {
  maxHp: number; maxMp: number;
  str: number; dex: number; int: number; luk: number;
  attack: number; magicAttack: number; defense: number;
  critRate: number; critDamage: number;
  speed: number; jump: number;
  hpRegen: number; mpRegen: number;
  xpBonus: number; goldBonus: number; dropBonus: number;
  damagePct: number; bossDamagePct: number; cooldownReduction: number;
  hpPct: number; mpPct: number; avoid: number;
}
export type DerivedStatKey = keyof DerivedStats;
export type StatMods = Partial<Record<DerivedStatKey, number>>;

/** A number that scales with skill level: value = base + perLevel * (level - 1). */
export type Scalar = number | { base: number; perLevel: number };
export type ScalarMods = Partial<Record<DerivedStatKey, Scalar>>;

// ---------------------------------------------------------------------------
// Visual specs (interpreted by client/gfx, but declared here so data can use them)
// ---------------------------------------------------------------------------

export type IconShape =
  // equipment
  | 'sword' | 'axe' | 'staff' | 'wand' | 'bow' | 'gun' | 'dagger' | 'knives'
  | 'helmet' | 'armor' | 'gloves' | 'boots' | 'ring' | 'amulet'
  // consumables
  | 'potion' | 'flask' | 'elixir' | 'food' | 'soup' | 'bread' | 'fish' | 'meat' | 'scroll'
  // materials
  | 'ore' | 'ingot' | 'herb' | 'flower' | 'mushroom' | 'gem' | 'shell' | 'scale' | 'feather'
  | 'bone' | 'cloth' | 'leather' | 'slime' | 'crystal' | 'essence' | 'stone' | 'orb' | 'leaf'
  | 'coral' | 'pearl' | 'wood' | 'core' | 'claw' | 'fang' | 'dust'
  // misc
  | 'key' | 'letter' | 'map' | 'coin' | 'bag' | 'lantern' | 'horn' | 'relic' | 'book';

export interface IconSpec {
  shape: IconShape;
  /** CSS hex colors, e.g. '#ff8844'. [primary, secondary?, accent?] */
  colors: string[];
  /** Optional little glyph/marker overlay, e.g. '+' for upgraded, '*' sparkle. */
  glyph?: string;
}

export type SkillIconShape =
  | 'slash' | 'spin' | 'shield' | 'fist' | 'burst' | 'bolt' | 'orb' | 'flame' | 'snow'
  | 'wave' | 'wind' | 'arrow' | 'arrows' | 'bullet' | 'bomb' | 'dash' | 'dagger' | 'shuriken'
  | 'skull' | 'eye' | 'heart' | 'star' | 'moon' | 'feather' | 'claw' | 'rune' | 'aura' | 'trap';

export interface SkillIconSpec { shape: SkillIconShape; colors: string[] }

/** Monster body templates the gfx module knows how to draw procedurally. */
export type MonsterBase =
  | 'slime' | 'mushroom' | 'snail' | 'bird' | 'crab' | 'jelly' | 'beetle' | 'bat' | 'wisp'
  | 'plant' | 'golem' | 'eel' | 'fish' | 'humanoid' | 'spider' | 'boar' | 'grub' | 'wraith'
  // boss-only templates
  | 'hydra' | 'roc' | 'captain' | 'heart';

export interface MonsterSpriteSpec {
  base: MonsterBase;
  /** hex colors */
  palette: { primary: string; secondary: string; accent?: string; eye?: string };
  /** 1 = normal size for the base (~24-32px). Bosses typically 2.5-4. */
  scale?: number;
  /** small variations: 0..3 — horns, spots, spikes, etc. interpreted per base */
  variant?: number;
}

export type NpcBase = 'human' | 'elder' | 'merchant' | 'guard' | 'mystic' | 'smith' | 'child' | 'sailor' | 'scholar' | 'spirit' | 'creature';

export interface NpcSpriteSpec {
  base: NpcBase;
  palette: { skin: string; hair: string; outfit: string; accent?: string };
  /** accessory hint: 'hat' | 'hood' | 'beard' | 'glasses' | 'apron' | 'cape' | 'horns' | 'lantern' | 'staff' | 'hammer' */
  accessory?: string;
}

export type VfxStyle =
  | 'slash' | 'heavySlash' | 'thrust' | 'spin' | 'arc' | 'bolt' | 'orb' | 'arrow' | 'bullet'
  | 'shuriken' | 'dagger' | 'explosion' | 'lightning' | 'ice' | 'water' | 'wave' | 'wind'
  | 'fire' | 'shadow' | 'holy' | 'poison' | 'heal' | 'buff' | 'shield' | 'smoke' | 'spark' | 'bubble';

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export interface BuffDef {
  /** Buff identity; re-applying the same id refreshes it. Food buffs should use id 'food' (one food at a time). */
  id: string;
  name: string;
  stats: StatMods;
  durationMs: number;
  icon?: SkillIconSpec;
}

export interface EquipData {
  slot: EquipSlot;
  weaponType?: WeaponType;
  /** Guaranteed stats. Weapons MUST have attack (physical classes) or magicAttack (staff/wand). */
  stats: StatMods;
  /** Number of random bonus lines rolled when the item drops/crafts (0-3). Rarity also adds lines. */
  randomLines?: number;
  /** Max enhancement stars (default by rarity, see constants). */
  maxStars?: number;
  /** Set membership for set bonuses. */
  setId?: string;
}

export interface UseData {
  heal?: { hp?: number; mp?: number; hpPct?: number; mpPct?: number };
  buff?: BuffDef;
  /** Teleport to this map (return scroll uses 'town' = last visited town). */
  teleport?: string | 'town';
  /** Consuming teaches this recipe. */
  learnRecipe?: string;
  /** Resets allocated AP (stat reset). */
  resetStats?: boolean;
  /** Resets SP of current tier. */
  resetSkills?: boolean;
  /** Shared cooldown group, e.g. 'potion' */
  cooldownGroup?: string;
  cooldownMs?: number;
}

/** Maplestory-style companion species the gfx module knows how to draw (see gfx/pets.ts). */
export type PetSpecies = 'puffling' | 'shellsnail' | 'kelpfox' | 'stormkit' | 'lanternfish' | 'whalecalf';

/** A pet item (category 'use', stack 1) that can be summoned as an active companion. */
export interface PetData {
  species: PetSpecies;
  /** px radius within which the pet will fly out and auto-loot drops for the player. */
  lootRadius: number;
  /** Small passive stat bonuses while this pet is active (see computeStats). */
  stats?: StatMods;
  /** One-line flavor text shown in the tooltip. */
  flavor: string;
}

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: InventoryTab;
  rarity: Rarity;
  icon: IconSpec;
  /** Max stack size; equipment is always 1. */
  stack: number;
  /** Gold received when selling to a shop. */
  sellPrice: number;
  /** Default shop price (if sold in shops). */
  buyPrice?: number;
  levelReq?: number;
  /** Base classes allowed to equip (advanced jobs inherit). Omit = everyone. */
  classReq?: ClassId[];
  equip?: EquipData;
  use?: UseData;
  /** Quest items can't be sold/dropped; stack in etc. */
  quest?: boolean;
  /** Enhancement material: value = success bonus tier; used by enhance action */
  enhanceStone?: { tier: number; maxStarsUsable: number };
  /** Salvaging an equip gives these (default computed from level/rarity if omitted) */
  salvage?: { itemId: string; qty: number }[];
  /** Pet companion (category 'use', stack 1); dispatch summonPet with this item's uid/itemId to activate. */
  pet?: PetData;
  tags?: string[];
}

export interface ItemInstance {
  uid: string;
  itemId: string;
  qty: number;
  /** Random rolled bonus lines (equipment). */
  bonus?: StatMods;
  /** Enhancement level. */
  stars?: number;
  /** Rolled rarity override (drops may be upgraded above def rarity). */
  rarity?: Rarity;
  /** Crafted-by name tag. */
  crafter?: string;
}

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

export type MonsterBehavior =
  | 'walker'      // patrols platform, turns at edges, chases when aggro
  | 'hopper'      // moves by hopping
  | 'flyer'       // floats/flies in sine pattern, ignores platforms, swoops at player when aggro
  | 'stationary'  // doesn't move (plants, turrets); usually has ranged attacks
  | 'charger'     // walks, then when aggro telegraphs and charges fast
  | 'boss';       // uses attacks[] + phases[]

export type MonsterAttackKind =
  | 'projectile'  // fires projectile(s) toward player
  | 'slam'        // telegraphed ground AoE around self or at player position
  | 'charge'      // dashes horizontally
  | 'summon'      // spawns minions
  | 'beam'        // horizontal line after telegraph
  | 'rain'        // things fall from sky across an area around player
  | 'shockwave'   // ground wave travelling along the floor both directions (jump over it)
  | 'leap';       // jumps to player position and lands with small AoE

export interface MonsterAttack {
  id: string;
  kind: MonsterAttackKind;
  /** Damage as multiple of monster attack stat. */
  damageMult: number;
  cooldownMs: number;
  /** Trigger when player within this distance (px). */
  range: number;
  /** Warning time before the attack lands (visual telegraph). */
  telegraphMs: number;
  projectileSpeed?: number;
  count?: number;
  radius?: number;
  summonId?: string;
  summonCount?: number;
  vfx?: VfxStyle;
  color?: string;
}

export interface BossPhase {
  /** Phase starts when hp fraction drops below this (1 = start). */
  hpBelow: number;
  /** Attack ids usable in this phase. */
  attacks: string[];
  speedMult?: number;
  /** Shout text shown when phase starts */
  shout?: string;
}

export interface DropEntry {
  itemId: string;
  /** 0..1 */
  chance: number;
  min?: number;
  max?: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  level: number;
  hp: number;
  /** Base contact / attack damage. */
  attack: number;
  defense: number;
  xp: number;
  gold: [number, number];
  /** Move speed in px/s (art pixels). Typical 30-70. */
  speed: number;
  behavior: MonsterBehavior;
  /** Aggressive monsters chase on sight; passive ones only after being hit. */
  aggressive: boolean;
  attacks?: MonsterAttack[];
  phases?: BossPhase[];
  drops: DropEntry[];
  sprite: MonsterSpriteSpec;
  /** 0..1 — resistance to knockback. Bosses 1. */
  knockbackResist?: number;
  isBoss?: boolean;
  /** Boss intro subtitle */
  title?: string;
  respawnMs?: number;
  /** Status immunities */
  immune?: StatusKind[];
}

// ---------------------------------------------------------------------------
// Classes / jobs / skills
// ---------------------------------------------------------------------------

export type StatusKind = 'slow' | 'stun' | 'burn' | 'poison' | 'freeze' | 'weaken' | 'bleed' | 'mark';

export interface StatusOnHit {
  kind: StatusKind;
  chance: number;
  durationMs: number;
  /** burn/poison/bleed: fraction of hit damage per tick (1s); slow: fraction slowed; weaken: fraction dmg taken bonus; mark: fraction bonus dmg taken */
  power?: number;
}

export type SkillEffect =
  /** Hitbox in front of player: width=range, height. lunge moves the player forward. */
  | { kind: 'melee'; range: number; height: number; offsetY?: number; lunge?: number; knockback?: number; hitsAll?: boolean }
  /** Projectiles. pierce = number of extra targets. gravity>0 arcs. explodeRadius creates AoE on impact. */
  | { kind: 'projectile'; speed: number; range: number; count?: number; spreadDeg?: number; pierce?: number; gravity?: number; homing?: boolean; explodeRadius?: number; knockback?: number }
  /** Instant AoE around a point. at: self | front (offsetX px in facing dir) | nearest (nearest enemy within range). */
  | { kind: 'aoe'; radius: number; at: 'self' | 'front' | 'nearest'; offsetX?: number; range?: number; delayMs?: number; knockback?: number }
  /** Bounce between enemies. */
  | { kind: 'chain'; range: number; jumps: number; falloff?: number }
  /** Move the player quickly; damages enemies passed through if damage defined. invulnMs = i-frames. */
  | { kind: 'dash'; distance: number; invulnMs: number; vertical?: number }
  /** Blink forward (passes through). */
  | { kind: 'teleport'; distance: number }
  /** Extra mid-air jump (flash jump). */
  | { kind: 'doubleJump'; power: number; horizontalBoost?: number }
  /** Ground zone dealing damage every tickMs. */
  | { kind: 'zone'; radius: number; durationMs: number; tickMs: number; at: 'self' | 'front'; offsetX?: number; follow?: boolean }
  /** Many projectiles falling from above across width in front of player. */
  | { kind: 'rain'; width: number; count: number; durationMs: number; offsetX?: number }
  /** Heal self (pct of maxHp) — also usable as selfHeal in other skills. */
  | { kind: 'heal'; pct: number }
  /** Stationary turret/totem that attacks nearest enemy every intervalMs. */
  | { kind: 'summon'; durationMs: number; intervalMs: number; range: number; projectileSpeed?: number }
  /** Pure buff (no effect) */
  | { kind: 'none' };

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  job: JobId;
  type: 'active' | 'buff' | 'passive';
  maxLevel: number;
  /** Required character level to learn level 1. */
  reqLevel: number;
  prereq?: { skillId: string; level: number };
  icon: SkillIconSpec;
  mpCost?: Scalar;
  /** Some reaver skills cost HP instead (fraction of current HP). */
  hpCostPct?: Scalar;
  cooldownMs?: Scalar;
  /** Damage percent per hit (100 = 1x base damage). */
  damagePct?: Scalar;
  /** Hits per target. */
  hits?: number;
  /** Max targets per cast (melee/aoe). */
  maxTargets?: number;
  effect?: SkillEffect;
  vfx?: { style: VfxStyle; color: string; color2?: string; scale?: number };
  sfx?: SfxId;
  status?: StatusOnHit;
  /** buff: applied to self when cast. */
  buff?: { stats: ScalarMods; durationMs: Scalar };
  /** passive: always-on stats while learned. */
  passive?: { stats: ScalarMods };
  /** Skill can be held down to repeat (like maple mains). */
  channel?: boolean;
  /** Self heal fraction of damage dealt */
  lifesteal?: Scalar;
  /** Cast/animation lock time in ms before next action (default 350). */
  castTimeMs?: number;
  /** The animation to use */
  anim?: 'attack' | 'cast' | 'shoot';
}

export interface JobDef {
  id: JobId;
  name: string;
  tier: 1 | 2;
  /** For tier 2 jobs. */
  parent?: ClassId;
  /** Base class for this job (tier1: itself). */
  classId: ClassId;
  description: string;
  /** Short playstyle blurb for selection UI. */
  playstyle: string;
  mainStat: StatKey;
  secondaryStat: StatKey;
  weaponTypes: WeaponType[];
  /** Max HP/MP gained per level. */
  hpPerLevel: number;
  mpPerLevel: number;
  /** Skill ids in display order. */
  skills: string[];
  /** Theme color for UI. */
  color: string;
  /** Basic attack when no skill is used (the "attack" key). Uses damagePct 100 by default. */
  basicAttack: { effect: SkillEffect; vfx: { style: VfxStyle; color: string }; sfx: SfxId; castTimeMs: number; anim: 'attack' | 'cast' | 'shoot'; damagePct?: number };
  /** Physical or magical damage scaling */
  damageType: 'physical' | 'magic';
  /** Starting equipment item ids (tier 1 only). */
  starterItems?: string[];
}

// ---------------------------------------------------------------------------
// World: maps, NPCs, gathering
// ---------------------------------------------------------------------------

export type PlatformType = 'ground' | 'oneway' | 'solid';

export interface PlatformDef {
  /** Left x of the platform. */
  x: number;
  /** Top surface y. */
  y: number;
  /** Width. */
  w: number;
  /** Thickness (visual/solid). Default: ground → down to map bottom, oneway → 12, solid → 16. */
  h?: number;
  type: PlatformType;
}

export interface RopeDef { x: number; top: number; bottom: number; kind?: 'rope' | 'ladder' }

export interface PortalDef {
  id: string;
  x: number;
  /** y of the ground the portal stands on */
  y: number;
  to: string;
  toPortal: string;
  label?: string;
  /** Conditions required to use it (e.g. main quest progress). */
  reqs?: Condition[];
  lockedText?: string;
}

export interface SpawnDef {
  monsterId: string;
  count: number;
  /** Horizontal range where they spawn (on any platform within). Defaults to whole map. */
  x1?: number;
  x2?: number;
  /** Restrict to platforms with top y between (optional). */
  y1?: number;
  y2?: number;
  respawnMs?: number;
}

export interface MapNpcPlacement {
  npcId: string; x: number; y: number; flip?: boolean;
  /** NPC is only present on the map while these pass (e.g. crafters arrive after a main quest). */
  reqs?: Condition[];
}

export interface GatherPlacement { nodeId: string; x: number; y: number }

/** Decoration placed in the world (non-colliding). gfx draws per theme. */
export interface DecorDef {
  kind: DecorKind;
  x: number;
  y: number;
  scale?: number;
  flip?: boolean;
  /** draw in front of entities */
  front?: boolean;
}
export type DecorKind =
  | 'house' | 'shop' | 'tent' | 'lamp' | 'lantern' | 'sign' | 'crate' | 'barrel' | 'fence' | 'well'
  | 'tree' | 'bush' | 'flower' | 'grass' | 'rock' | 'mushroom' | 'kelp' | 'coral' | 'crystal'
  | 'barnacle' | 'bones' | 'ruin' | 'pillar' | 'statue' | 'windmill' | 'mast' | 'anchor'
  | 'banner' | 'campfire' | 'vine' | 'shell' | 'pod' | 'tendril' | 'chest';

export interface MapDef {
  id: string;
  name: string;
  region: RegionId;
  theme: ThemeId;
  music: MusicId;
  width: number;
  height: number;
  /** Safe zone: no monster spawns, faster regen; death respawn point candidates. */
  town?: boolean;
  levelRange?: [number, number];
  spawnPoint: { x: number; y: number };
  platforms: PlatformDef[];
  ropes: RopeDef[];
  portals: PortalDef[];
  npcs: MapNpcPlacement[];
  spawns: SpawnDef[];
  gather: GatherPlacement[];
  decor: DecorDef[];
  /** Boss spawn */
  boss?: { monsterId: string; x: number; y: number; respawnMs: number; reqs?: Condition[] };
  weather?: WeatherId;
  /** Text shown when entering the map (region card) */
  subtitle?: string;
  /** Map is dark (lighting overlay) */
  dark?: boolean;
}

export interface NpcDef {
  id: string;
  name: string;
  title?: string;
  sprite: NpcSpriteSpec;
  /** Default greeting dialogue id (see DialogueDef). Optional: generic greeting used otherwise. */
  dialogue?: string;
  /** Short greeting line if no dialogue tree. */
  greeting: string;
  shopId?: string;
  /** Crafting station/trainer for this profession */
  profession?: CraftingProfessionId | GatheringProfessionId;
  /** Job instructor for class */
  instructorFor?: ClassId;
  /** Ambient lines shown as speech bubbles */
  barks?: string[];
}

export interface GatherNodeDef {
  id: string;
  name: string;
  profession: GatheringProfessionId;
  /** Required gathering profession level. */
  level: number;
  /** Hits (interactions) needed. */
  hits: number;
  drops: DropEntry[];
  xp: number;
  respawnMs: number;
  sprite: { base: 'ore' | 'herb' | 'crystal' | 'coral' | 'mushroom' | 'kelp' | 'wood'; color: string; color2?: string };
}

export interface ShopDef {
  id: string;
  name: string;
  items: { itemId: string; price?: number; reqs?: Condition[] }[];
}

// ---------------------------------------------------------------------------
// Professions & recipes
// ---------------------------------------------------------------------------

export interface ProfessionDef {
  id: ProfessionId;
  name: string;
  kind: 'gathering' | 'crafting';
  description: string;
  /** What the loop is good for, shown when choosing */
  benefit: string;
  maxLevel: number;
  icon: IconSpec;
}

export interface RecipeDef {
  id: string;
  profession: CraftingProfessionId;
  /** Required profession level */
  level: number;
  inputs: { itemId: string; qty: number }[];
  output: { itemId: string; qty: number };
  goldCost?: number;
  xp: number;
  /** How the recipe is learned. 'auto' = on reaching level; 'trainer' = buy at trainer; 'item' = from a recipe scroll; 'quest' = quest reward */
  learn: 'auto' | 'trainer' | 'item' | 'quest';
  trainerCost?: number;
  /** Crafted equipment gets guaranteed min rarity */
  minRarity?: Rarity;
}

// ---------------------------------------------------------------------------
// Conditions, dialogue & quests
// ---------------------------------------------------------------------------

export type QuestStateName = 'notStarted' | 'active' | 'ready' | 'completed';

export type Condition =
  | { type: 'quest'; questId: string; state: QuestStateName | QuestStateName[] }
  | { type: 'flag'; flag: string; value?: boolean | number | string; not?: boolean }
  | { type: 'level'; min?: number; max?: number }
  | { type: 'class'; classId: ClassId | ClassId[] }
  | { type: 'job'; jobId: JobId | JobId[] }
  | { type: 'jobTier'; tier: 1 | 2 }
  | { type: 'item'; itemId: string; qty?: number }
  | { type: 'profession'; professionId: ProfessionId; minLevel?: number }
  | { type: 'reputation'; faction: FactionId; min: number }
  | { type: 'questChoice'; questId: string; choiceId: string };

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export type AchievementCategory = 'combat' | 'exploration' | 'professions' | 'quests' | 'collection' | 'economy' | 'social';

/** Cheap, data-driven conditions the reducer checks after every successful action (see logic/achievements.ts). */
export type AchievementCondition =
  | { type: 'kills'; count: number }
  | { type: 'bossKill'; monsterId: string }
  | { type: 'level'; level: number }
  | { type: 'exploreRegion'; region: RegionId }
  | { type: 'exploreAll' }
  | { type: 'professionLevel'; level: number }
  | { type: 'crafted'; count: number }
  | { type: 'gathered'; count: number }
  | { type: 'enhanceStars'; stars: number }
  | { type: 'questCompleted'; questId: string }
  | { type: 'sideQuestCount'; count: number }
  | { type: 'allSideQuests' }
  | { type: 'bestiaryCount'; count: number }
  | { type: 'allBestiary' }
  | { type: 'goldEarned'; amount: number }
  | { type: 'petsOwned'; count: number }
  | { type: 'flag'; flag: string; value?: boolean | number | string };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon: SkillIconSpec | IconSpec;
  condition: AchievementCondition;
  /** Granted once, on unlock (titles use the existing titles mechanism). */
  reward?: Reward;
  /** Shown as '???' until unlocked (spoiler protection, e.g. story endings). */
  hidden?: boolean;
}

export type DialogueAction =
  | { type: 'acceptQuest'; questId: string }
  | { type: 'setFlag'; flag: string; value: boolean | number | string }
  | { type: 'openShop'; shopId: string }
  | { type: 'openCrafting'; professionId?: CraftingProfessionId }
  | { type: 'learnProfession'; professionId: CraftingProfessionId }
  | { type: 'teleport'; mapId: string; portalId?: string; cost?: number }
  | { type: 'giveItem'; itemId: string; qty?: number }
  | { type: 'takeItem'; itemId: string; qty?: number }
  | { type: 'heal' }
  | { type: 'reputation'; faction: FactionId; amount: number }
  | { type: 'jobAdvance'; jobId: AdvancedJobId }
  | { type: 'close' };

export interface DialogueOption {
  text: string;
  next?: string;
  conditions?: Condition[];
  actions?: DialogueAction[];
}

export interface DialogueNode {
  /** npc id, 'player', or omitted = the npc being talked to */
  speaker?: string;
  text: string;
  options?: DialogueOption[];
  /** If no options: continue to this node (or end if omitted) */
  next?: string;
  actions?: DialogueAction[];
}

export interface DialogueDef {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

export type Objective =
  | { type: 'kill'; monsterId: string; count: number; desc?: string }
  | { type: 'collect'; itemId: string; count: number; /** remove on turn in (default true) */ consume?: boolean; desc?: string }
  | { type: 'talk'; npcId: string; desc?: string }
  | { type: 'visit'; mapId: string; desc?: string }
  | { type: 'craft'; itemId?: string; professionId?: CraftingProfessionId; count: number; desc?: string }
  | { type: 'gather'; nodeId?: string; professionId?: GatheringProfessionId; count: number; desc?: string }
  | { type: 'level'; level: number; desc?: string }
  | { type: 'boss'; monsterId: string; desc?: string }
  | { type: 'enhance'; stars: number; desc?: string }
  | { type: 'learnProfession'; desc?: string };

export interface Reward {
  xp?: number;
  gold?: number;
  items?: { itemId: string; qty?: number }[];
  /** Player picks ONE of these. */
  chooseOne?: { itemId: string; qty?: number }[];
  flags?: Record<string, boolean | number | string>;
  reputation?: Partial<Record<FactionId, number>>;
  recipes?: string[];
  /** bonus AP / SP */
  ap?: number;
  sp?: number;
  title?: string;
}

export interface QuestChoice {
  id: string;
  /** Button label */
  label: string;
  /** What this choice means (shown before confirming) */
  description: string;
  /** Replaces the NPC completion text for this choice */
  completeText?: string;
  rewards: Reward;
  /** Advance job (job quests) */
  jobAdvance?: AdvancedJobId;
  /** Choice only selectable if these pass (UI shows it locked with `lockedHint`). */
  reqs?: Condition[];
  lockedHint?: string;
}

export type QuestType = 'main' | 'side' | 'job' | 'faction' | 'profession' | 'daily';

export interface QuestDef {
  id: string;
  name: string;
  type: QuestType;
  /** Act/chapter for main quests */
  chapter?: number;
  giver: string;
  /** Defaults to giver */
  turnIn?: string;
  /** Recommended level (display). */
  level: number;
  /** Conditions for the quest to be offered. Level minimums go here. */
  reqs: Condition[];
  /** One-line summary for the quest log. */
  summary: string;
  /** Offer dialogue (paragraphs separated by \n\n). */
  offer: string;
  /** Text while active but not complete. */
  progress: string;
  /** Completion dialogue (default; choices may override). */
  complete: string;
  objectives: Objective[];
  rewards: Reward;
  /** If present, player must pick one at turn-in. Choice rewards ADD to base rewards. */
  choices?: QuestChoice[];
  /** Actions run on accept (e.g. give letter). */
  onAccept?: DialogueAction[];
  /** Repeatable (daily-ish) quests can be redone after cooldown */
  repeatable?: { cooldownMs: number };
}

// ---------------------------------------------------------------------------
// Character state (persisted; authoritative on the backend)
// ---------------------------------------------------------------------------

export interface Appearance {
  skin: string;
  hair: string;
  hairStyle: number; // 0..5
  eyes: string;
  /** Optional outfit tint chosen at creation */
  outfit: string;
}

export interface QuestProgress {
  state: 'active' | 'completed';
  /** Progress counter per objective */
  progress: number[];
  choiceId?: string;
  acceptedAt: number;
  completedAt?: number;
  timesCompleted?: number;
}

export type HotbarEntry = { kind: 'skill'; id: string } | { kind: 'item'; id: string /* itemId */ };

export interface ActiveBuff {
  id: string;
  name: string;
  stats: StatMods;
  expiresAt: number;
  icon?: SkillIconSpec;
  source: 'item' | 'skill' | 'food' | 'other';
}

export interface CharacterState {
  version: number;
  id: string;
  name: string;
  classId: ClassId;
  jobId: JobId;
  level: number;
  /** XP into current level */
  xp: number;
  gold: number;
  appearance: Appearance;
  /** Allocated base stats (before equipment). */
  baseStats: Record<StatKey, number>;
  /** Unspent ability points / skill points */
  ap: number;
  sp: number;
  skills: Record<string, number>;
  hp: number;
  mp: number;
  inventory: Record<InventoryTab, (ItemInstance | null)[]>;
  equipment: Partial<Record<EquipSlot, ItemInstance>>;
  /** HOTBAR_SIZE entries */
  hotbar: (HotbarEntry | null)[];
  quests: Record<string, QuestProgress>;
  flags: Record<string, boolean | number | string>;
  reputation: Record<FactionId, number>;
  professions: Partial<Record<ProfessionId, { level: number; xp: number }>>;
  knownRecipes: string[];
  buffs: ActiveBuff[];
  mapId: string;
  position: { x: number; y: number };
  /** Last town visited — death/return scroll destination */
  townMapId: string;
  discoveredMaps: string[];
  bestiary: Record<string, number>;
  titles: string[];
  activeTitle?: string;
  counters: { kills: number; deaths: number; playTimeMs: number; crafted: number; gathered: number; bossKills: number; goldEarned: number };
  /** Active companion pet (an owned pet item's itemId), if any. */
  activePet?: string;
  /** Unlocked achievement ids -> unlock timestamp. */
  achievements?: Record<string, number>;
  createdAt: number;
  updatedAt: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  classId: ClassId;
  jobId: JobId;
  level: number;
  mapId: string;
  appearance: Appearance;
  updatedAt: number;
}
