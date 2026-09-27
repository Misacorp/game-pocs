/**
 * Dev-only visual QA gallery for the gfx module. Not part of the shipped game.
 */
import Phaser from 'phaser';
import type {
  MonsterDef, MonsterBase, NpcDef, NpcBase, ThemeId, DecorKind, VfxStyle, IconShape, SkillIconShape,
  GatherNodeDef, ClassId, JobId, WeaponType, ItemDef, Rarity,
} from '@shared/types';
import { MONSTER_LIST } from '@shared/data/monsters';
import { NPC_LIST } from '@shared/data/npcs';
import {
  registerBaseTextures, getCharacterSprite, getMonsterSprite, getNpcSprite, getPlatformTextures,
  createParallax, createWeather, getGatherNodeSprite, getPortalSprite, getDropTexture,
  getProjectileTexture, spawnVfx, spawnTelegraph, spawnHitSpark, getDecorTexture,
  iconUrl, skillIconUrl, characterPortraitUrl, characterPreviewUrl,
} from './index';
import type { CharacterLook } from './spec';
import { npcPortraitUrl } from './npcs';
import { THEMES as THEME_PALETTES } from './palette';

const THEMES: ThemeId[] = ['driftmoor', 'meadow', 'grotto', 'kelpwood', 'galeoutpost', 'stormspire', 'lanternreef', 'galleon', 'hollow', 'heart'];
let currentTheme: ThemeId = 'meadow';

// ---------------------------------------------------------------------------
// fallback data (used only if the world/monster agents haven't filled these in yet)
// ---------------------------------------------------------------------------

function mkMonster(id: string, base: MonsterBase, primary: string, secondary: string, accent?: string, eye?: string, scale = 1, variant = 0): MonsterDef {
  return {
    id, name: id, level: 1, hp: 10, attack: 1, defense: 0, xp: 1, gold: [0, 0], speed: 40,
    behavior: 'walker', aggressive: false, drops: [],
    sprite: { base, palette: { primary, secondary, accent, eye }, scale, variant },
  };
}

const FALLBACK_MONSTERS: MonsterDef[] = [
  mkMonster('demo_slime', 'slime', '#7ec850', '#5a9e3a'),
  mkMonster('demo_mushroom', 'mushroom', '#c9584a', '#e8dcc0'),
  mkMonster('demo_snail', 'snail', '#caa66a', '#8a6a48'),
  mkMonster('demo_bird', 'bird', '#5a8ac9', '#3a5a8a'),
  mkMonster('demo_crab', 'crab', '#d67a4a', '#a85a3a'),
  mkMonster('demo_jelly', 'jelly', '#5be2c9', '#2a9a8a'),
  mkMonster('demo_beetle', 'beetle', '#8a6ad6', '#5a4a9a'),
  mkMonster('demo_bat', 'bat', '#4a3a52', '#2a1c30', undefined, '#ff3344'),
  mkMonster('demo_wisp', 'wisp', '#caa6ff', '#8a6ad6'),
  mkMonster('demo_plant', 'plant', '#5a9e3a', '#3a6e28'),
  mkMonster('demo_golem', 'golem', '#8a8a92', '#5a5a62', '#5adfff'),
  mkMonster('demo_eel', 'eel', '#4aa0c9', '#2a6a8a'),
  mkMonster('demo_fish', 'fish', '#5adfff', '#2a9ad6'),
  mkMonster('demo_humanoid', 'humanoid', '#8a6a48', '#5a4636', '#d9b48a'),
  mkMonster('demo_spider', 'spider', '#3a3040', '#1c1620', undefined, '#ff3344'),
  mkMonster('demo_boar', 'boar', '#a9784a', '#7a5636'),
  mkMonster('demo_grub', 'grub', '#c9a15c', '#8a6a3a'),
  mkMonster('demo_wraith', 'wraith', '#8a3fae', '#5a2a7a', undefined, '#c85bff'),
  mkMonster('demo_hydra', 'hydra', '#4a9e5a', '#2a6e38', '#ffcf40', '#ffcf40', 2.6, 0),
  mkMonster('demo_roc', 'roc', '#8a97a6', '#5a6570', '#f0a030', '#ffe070', 2.8, 0),
  mkMonster('demo_captain', 'captain', '#3a6a5e', '#1c3a30', '#1a1a22', '#5adfff', 2.2, 0),
  mkMonster('demo_heart', 'heart', '#8b3fae', '#4a1c5e', '#ff2f4f', '#ffffff', 3.2, 0),
];

function mkNpc(id: string, base: NpcBase, skin: string, hair: string, outfit: string, accent?: string, accessory?: string): NpcDef {
  return { id, name: id, sprite: { base, palette: { skin, hair, outfit, accent }, accessory }, greeting: 'Hello.' };
}

const FALLBACK_NPCS: NpcDef[] = [
  mkNpc('demo_human', 'human', '#e8b98a', '#5a3a2a', '#7a8a9a', undefined, 'hood'),
  mkNpc('demo_elder', 'elder', '#e0b088', '#d8d8d8', '#8a6a48', undefined, 'beard'),
  mkNpc('demo_merchant', 'merchant', '#d9a878', '#3a2a1a', '#caa66a', '#8a5a3a', 'apron'),
  mkNpc('demo_guard', 'guard', '#d9a878', '#2a2a2a', '#5a6a7a', '#8a97a6', undefined),
  mkNpc('demo_mystic', 'mystic', '#c9a8e8', '#e8e0c8', '#6a5ac9', '#caa6ff', 'staff'),
  mkNpc('demo_smith', 'smith', '#c98a5a', '#2a1a10', '#5a4636', '#c9b088', 'hammer'),
  mkNpc('demo_child', 'child', '#e8c0a0', '#caa63a', '#4a9a5e', undefined, undefined),
  mkNpc('demo_sailor', 'sailor', '#d9a878', '#3a2a1a', '#3a5a6a', '#e2ddc8', 'hat'),
  mkNpc('demo_scholar', 'scholar', '#e0b088', '#2a2a30', '#5a4a6a', undefined, 'glasses'),
  mkNpc('demo_spirit', 'spirit', '#cfe6ff', '#eaf6ff', '#4a6a8a', undefined, 'cape'),
  mkNpc('demo_creature', 'creature', '#caa66a', '#8a6a48', '#7a5636', undefined, 'horns'),
];

function mkNode(id: string, base: GatherNodeDef['sprite']['base'], color: string, color2?: string): GatherNodeDef {
  return { id, name: id, profession: 'mining', level: 1, hits: 3, drops: [], xp: 1, respawnMs: 1000, sprite: { base, color, color2 } };
}
const GATHER_NODES: GatherNodeDef[] = [
  mkNode('demo_ore', 'ore', '#8a97a6', '#caa66a'),
  mkNode('demo_crystal', 'crystal', '#5adfff', '#a0e6ff'),
  mkNode('demo_herb', 'herb', '#7ec850', '#4a9e3a'),
  mkNode('demo_coral', 'coral', '#ff6ab0', '#c9358a'),
  mkNode('demo_mushroom', 'mushroom', '#c9584a', '#e8dcc0'),
  mkNode('demo_kelp', 'kelp', '#3f9a5a', '#2a6e3e'),
  mkNode('demo_wood', 'wood', '#8a6a48', '#5a4636'),
];

const CLASS_WEAPON: [ClassId, JobId, WeaponType][] = [
  ['vanguard', 'vanguard', 'sword'], ['stormcaller', 'stormcaller', 'staff'],
  ['windrunner', 'windrunner', 'bow'], ['shade', 'shade', 'dagger'],
];
const ANIM_ORDER = ['idle', 'walk', 'jump', 'fall', 'crouch', 'attack', 'cast', 'shoot', 'climb', 'hurt', 'dead'];

function look(classId: ClassId, jobId: JobId, weaponType: WeaponType, hairStyle: number): CharacterLook {
  return {
    classId, jobId, weaponType,
    appearance: { skin: '#e0b088', hair: '#5a3a2a', hairStyle, eyes: '#3a6ea8', outfit: '#7a8a9a' },
    weaponColors: undefined, armorColors: undefined, helmetColors: undefined, bootsColors: undefined, glovesColors: undefined,
  };
}

// ---------------------------------------------------------------------------
// Phaser scenes
// ---------------------------------------------------------------------------

function playLoop(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, animKey: string): void {
  sprite.play(animKey);
  sprite.on('animationcomplete', () => scene.time.delayedCall(400, () => { if (sprite.active) sprite.play(animKey); }));
}

class CharactersScene extends Phaser.Scene {
  constructor() { super('characters'); }
  create() {
    registerBaseTextures(this);
    this.cameras.main.setZoom(3);
    this.add.rectangle(0, 0, 4000, 3000, 0x1a2030).setOrigin(0);
    let row = 0;
    for (const [classId, jobId, weaponType] of CLASS_WEAPON) {
      let col = 0;
      for (const anim of ANIM_ORDER) {
        const info = getCharacterSprite(this, look(classId, jobId, weaponType, row));
        const x = 30 + col * 40, y = 30 + row * 60;
        const s = this.add.sprite(x, y, info.key).setOrigin(0.5, 1);
        playLoop(this, s, info.anims[anim]);
        this.add.text(x, y + 4, anim, { fontSize: '6px', color: '#9fb2ff' }).setOrigin(0.5, 0);
        col++;
      }
      this.add.text(6, 30 + row * 60 - 34, `${jobId} (${weaponType})`, { fontSize: '7px', color: '#ffe07a' });
      row++;
    }
  }
}

class MonstersScene extends Phaser.Scene {
  constructor() { super('monsters'); }
  create() {
    registerBaseTextures(this);
    this.cameras.main.setZoom(1.6);
    this.add.rectangle(0, 0, 4000, 3000, 0x161a26).setOrigin(0);
    const list = MONSTER_LIST.length ? MONSTER_LIST : FALLBACK_MONSTERS;
    let x = 40, y = 40, rowH = 0;
    for (const def of list) {
      const info = getMonsterSprite(this, def);
      if (x + info.frameWidth > 2200) { x = 40; y += rowH + 30; rowH = 0; }
      const s = this.add.sprite(x, y, info.key).setOrigin(0.5, 1);
      playLoop(this, s, info.anims.idle);
      this.add.text(x, y + 4, def.id, { fontSize: '7px', color: '#9fb2ff' }).setOrigin(0.5, 0);
      rowH = Math.max(rowH, info.frameHeight);
      x += info.frameWidth + 24;
    }
  }
}

class NpcsScene extends Phaser.Scene {
  constructor() { super('npcs'); }
  create() {
    registerBaseTextures(this);
    this.cameras.main.setZoom(2.4);
    this.add.rectangle(0, 0, 3000, 2000, 0x1a2030).setOrigin(0);
    const list = NPC_LIST.length ? NPC_LIST : FALLBACK_NPCS;
    let x = 30, y = 30, rowH = 0, col = 0;
    for (const def of list) {
      const info = getNpcSprite(this, def);
      const s = this.add.sprite(x, y, info.key).setOrigin(0.5, 1);
      playLoop(this, s, info.anims.idle);
      this.add.text(x, y + 4, def.id.replace('npc_', '').replace('demo_', ''), { fontSize: '6px', color: '#9fb2ff' }).setOrigin(0.5, 0);
      rowH = Math.max(rowH, info.frameHeight);
      x += 44; col++;
      if (col >= 12) { col = 0; x = 30; y += rowH + 26; rowH = 0; }
    }
  }
}

class WorldScene extends Phaser.Scene {
  parallax?: ReturnType<typeof createParallax>;
  weather?: ReturnType<typeof createWeather>;
  decorObjs: Phaser.GameObjects.GameObject[] = [];
  constructor() { super('world'); }
  create() { this.buildTheme(currentTheme); (window as any).__setGalleryTheme = (t: ThemeId) => this.buildTheme(t); }
  buildTheme(theme: ThemeId) {
    registerBaseTextures(this);
    this.cameras.main.setZoom(2);
    this.children.removeAll();
    this.parallax?.destroy(); this.weather?.destroy();
    this.parallax = createParallax(this, theme, 640, 360);
    this.weather = createWeather(this, THEME_PALETTES[theme].weather);
    const tex = getPlatformTextures(this, theme);
    for (let x = 0; x < 640; x += tex.tile) {
      this.add.image(x, 300, tex.groundTop).setOrigin(0).setDepth(1);
      for (let yy = 316; yy < 360; yy += tex.tile) this.add.image(x, yy, tex.groundFill).setOrigin(0).setDepth(1);
    }
    for (let x = 0; x < 160; x += tex.tile) this.add.image(x + 20, 220, tex.oneway).setOrigin(0).setDepth(1);
    for (let x = 0; x < 80; x += tex.tile) this.add.image(x + 220, 180, tex.solid).setOrigin(0).setDepth(1);
    for (let yy = 100; yy < 300; yy += tex.tile) this.add.image(340, yy, tex.rope).setOrigin(0).setDepth(1);
    for (let yy = 100; yy < 300; yy += tex.tile) this.add.image(370, yy, tex.ladder).setOrigin(0).setDepth(1);
    const kinds: DecorKind[] = ['house', 'shop', 'tent', 'lamp', 'lantern', 'sign', 'crate', 'barrel', 'fence', 'well', 'tree', 'bush', 'flower', 'grass', 'rock', 'mushroom', 'kelp', 'coral', 'crystal', 'barnacle', 'bones', 'ruin', 'pillar', 'statue', 'windmill', 'mast', 'anchor', 'banner', 'campfire', 'vine', 'shell', 'pod', 'tendril', 'chest'];
    let dx = 420;
    for (const k of kinds) {
      const d = getDecorTexture(this, k, theme);
      this.add.image(dx, 300, d.key).setOrigin(0.5, 1).setDepth(2);
      dx += 26;
      if (dx > 620) { dx = 420; }
    }
  }
  update() { this.parallax?.update(this.cameras.main); this.weather?.update(this.cameras.main, 16); }
}
class VfxScene extends Phaser.Scene {
  constructor() { super('vfx'); }
  create() {
    registerBaseTextures(this);
    this.cameras.main.setZoom(1.4);
    this.add.rectangle(0, 0, 2400, 1400, 0x10141e).setOrigin(0);
    const styles: VfxStyle[] = ['slash', 'heavySlash', 'thrust', 'spin', 'arc', 'bolt', 'orb', 'arrow', 'bullet', 'shuriken', 'dagger', 'explosion', 'lightning', 'ice', 'water', 'wave', 'wind', 'fire', 'shadow', 'holy', 'poison', 'heal', 'buff', 'shield', 'smoke', 'spark', 'bubble'];
    let x = 40, y = 40;
    for (const style of styles) {
      const px = x, py = y;
      this.add.text(px, py + 20, style, { fontSize: '8px', color: '#9fb2ff' }).setOrigin(0.5, 0);
      this.time.addEvent({ delay: 900, loop: true, callback: () => spawnVfx(this, style, px, py, { color: '#ffcc55', color2: '#ff6a3a', scale: 1.2, width: 24, height: 24 }) });
      x += 90;
      if (x > 2300) { x = 40; y += 90; }
    }
    // projectiles
    const projStyles: VfxStyle[] = ['arrow', 'bullet', 'bolt', 'shuriken', 'dagger', 'ice', 'fire', 'orb'];
    let px2 = 40;
    for (const s of projStyles) {
      const key = getProjectileTexture(this, s, '#66ccff');
      this.add.image(px2, y + 60, key).setScale(3);
      this.add.text(px2, y + 76, s, { fontSize: '7px', color: '#9fb2ff' }).setOrigin(0.5, 0);
      px2 += 80;
    }
    // telegraphs + hit sparks loop
    this.time.addEvent({ delay: 1400, loop: true, callback: () => spawnTelegraph(this, 'circle', 300, y + 140, 60, 60, 1000) });
    this.time.addEvent({ delay: 700, loop: true, callback: () => spawnHitSpark(this, 420, y + 140, false) });
    this.time.addEvent({ delay: 900, loop: true, callback: () => spawnHitSpark(this, 460, y + 140, true) });

    // gather nodes
    let gx = 40, gy = y + 220;
    for (const def of GATHER_NODES) {
      const info = getGatherNodeSprite(this, def);
      const s = this.add.sprite(gx, gy, info.key).setOrigin(0.5, 1).setScale(2);
      s.play(info.anims.idle);
      this.add.text(gx, gy + 8, def.sprite.base, { fontSize: '7px', color: '#9fb2ff' }).setOrigin(0.5, 0);
      gx += 60;
    }
    // portal
    const portal = getPortalSprite(this);
    const ps = this.add.sprite(gx + 60, gy, portal.key).setOrigin(0.5, 1).setScale(1.6);
    ps.play(portal.anims.idle);

    // drops (gold + a fake rare item)
    const fakeItem: ItemDef = { id: 'demo_sword', name: 'Demo Sword', description: '', category: 'equip', rarity: 'epic', icon: { shape: 'sword', colors: ['#cfd6de', '#6b5438', '#8a97a6'] }, stack: 1, sellPrice: 10 };
    const goldKey = getDropTexture(this, 'gold');
    this.add.image(gx + 140, gy - 10, goldKey).setScale(2);
    const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    let dxp = gx + 180;
    for (const r of rarities) {
      const k = getDropTexture(this, fakeItem, r);
      this.add.image(dxp, gy - 10, k).setScale(2);
      this.add.text(dxp, gy + 6, r, { fontSize: '6px', color: '#9fb2ff' }).setOrigin(0.5, 0);
      dxp += 40;
    }
  }
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#10141e',
  pixelArt: true,
  roundPixels: true,
  scene: [CharactersScene, MonstersScene, NpcsScene, WorldScene, VfxScene],
});
(window as any).__game = game;

const tabs = document.getElementById('tabs')!;
const themebar = document.getElementById('themebar')!;
const iconsRoot = document.getElementById('icons-root')!;
const gameDiv = document.getElementById('game')!;

function showTab(name: string) {
  for (const b of Array.from(tabs.querySelectorAll('button'))) b.classList.toggle('active', b.getAttribute('data-tab') === name);
  themebar.style.display = name === 'world' ? 'flex' : 'none';
  if (name === 'icons') { gameDiv.style.display = 'none'; iconsRoot.style.display = 'block'; return; }
  gameDiv.style.display = 'block'; iconsRoot.style.display = 'none';
  for (const s of ['characters', 'monsters', 'npcs', 'world', 'vfx']) {
    if (s === name) { if (!game.scene.isActive(s)) game.scene.start(s); }
    else game.scene.stop(s);
  }
}
tabs.addEventListener('click', (e) => {
  const t = (e.target as HTMLElement).getAttribute('data-tab');
  if (t) showTab(t);
});

for (const t of THEMES) {
  const b = document.createElement('button');
  b.textContent = t; b.classList.toggle('active', t === currentTheme);
  b.addEventListener('click', () => {
    currentTheme = t;
    for (const bb of Array.from(themebar.children)) bb.classList.toggle('active', bb === b);
    (window as any).__setGalleryTheme?.(t);
  });
  themebar.appendChild(b);
}

function buildIconGrid() {
  const itemShapes: IconShape[] = [
    'sword', 'axe', 'staff', 'wand', 'bow', 'gun', 'dagger', 'knives', 'helmet', 'armor', 'gloves', 'boots', 'ring', 'amulet',
    'potion', 'flask', 'elixir', 'food', 'soup', 'bread', 'fish', 'meat', 'scroll',
    'ore', 'ingot', 'herb', 'flower', 'mushroom', 'gem', 'shell', 'scale', 'feather', 'bone', 'cloth', 'leather', 'slime',
    'crystal', 'essence', 'stone', 'orb', 'leaf', 'coral', 'pearl', 'wood', 'core', 'claw', 'fang', 'dust',
    'key', 'letter', 'map', 'coin', 'bag', 'lantern', 'horn', 'relic', 'book',
  ];
  const skillShapes: SkillIconShape[] = [
    'slash', 'spin', 'shield', 'fist', 'burst', 'bolt', 'orb', 'flame', 'snow', 'wave', 'wind', 'arrow', 'arrows',
    'bullet', 'bomb', 'dash', 'dagger', 'shuriken', 'skull', 'eye', 'heart', 'star', 'moon', 'feather', 'claw', 'rune', 'aura', 'trap',
  ];
  const palette = ['#cfd6de', '#6b5438', '#8a97a6'];
  const skillPalette = ['#88ccff', '#3a6ea8', '#c9e8ff'];
  const section = (title: string) => { const h = document.createElement('h2'); h.textContent = title; iconsRoot.appendChild(h); const g = document.createElement('div'); g.className = 'grid'; iconsRoot.appendChild(g); return g; };
  const cell = (grid: HTMLElement, url: string, label: string) => {
    const c = document.createElement('div'); c.className = 'cell';
    const img = document.createElement('img'); img.src = url; c.appendChild(img);
    const l = document.createElement('div'); l.className = 'lbl'; l.textContent = label; c.appendChild(l);
    grid.appendChild(c);
  };
  const itemGrid = section('Item icons (IconShape)');
  for (const shape of itemShapes) cell(itemGrid, iconUrl({ shape, colors: palette }, 48), shape);
  const glyphGrid = section('Glyph overlays');
  cell(glyphGrid, iconUrl({ shape: 'sword', colors: palette, glyph: '+' }, 48), 'sword +');
  cell(glyphGrid, iconUrl({ shape: 'potion', colors: ['#ff6a8a'], glyph: '*' }, 48), 'potion *');
  const skillGrid = section('Skill icons (SkillIconShape)');
  for (const shape of skillShapes) cell(skillGrid, skillIconUrl({ id: `demo_${shape}`, icon: { shape, colors: skillPalette } }, 48), shape);
  const portraitGrid = section('Character portraits / previews');
  for (const [classId, jobId, weaponType] of CLASS_WEAPON) {
    cell(portraitGrid, characterPortraitUrl(look(classId, jobId, weaponType, 2), 64), `${jobId} portrait`);
    cell(portraitGrid, characterPreviewUrl(look(classId, jobId, weaponType, 2), 3), `${jobId} preview`);
  }
  const npcGrid = section('NPC portraits');
  for (const def of (NPC_LIST.length ? NPC_LIST : FALLBACK_NPCS)) cell(npcGrid, npcPortraitUrl(def, 64), def.id);
}

buildIconGrid();
showTab('characters');
