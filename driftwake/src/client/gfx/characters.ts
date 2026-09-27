/**
 * Chibi pixel-art player characters. 32x40 frames, feet at the bottom of the frame.
 * Frames are pose-parameterized (single body renderer + per-anim pose tables) so every
 * class/job/weapon combination shares one code path.
 */
import Phaser from 'phaser';
import type { WeaponType, ClassId } from '@shared/types';
import {
  makeCanvas, ctx2d, outlined, rect, rrect, circle, ellipse, line, poly,
  registerSpriteSheet, ensureAnim, shade, hashStr,
} from './canvasKit';
import { CLASS_COLORS, OUTLINE } from './palette';
import type { CharacterLook, SpriteInfo } from './spec';

const FW = 32, FH = 40, CX = 16;

interface Pose {
  headBob: number; crouch: number; lying: boolean; climb: boolean;
  legFrontA: number; legBackA: number; legFrontL: number; legBackL: number;
  armFrontA: number; armBackA: number;
  weaponDeg: number; weaponHand: 'front' | 'back' | 'both';
  mouth: 'smile' | 'open' | 'flat' | 'x';
  glow?: boolean;
}

function basePose(): Pose {
  return {
    headBob: 0, crouch: 0, lying: false, climb: false,
    legFrontA: 0, legBackA: 0, legFrontL: 9, legBackL: 9,
    armFrontA: 5, armBackA: -5,
    weaponDeg: 100, weaponHand: 'front', mouth: 'smile',
  };
}

function weaponDefaults(t?: WeaponType): string[] {
  switch (t) {
    case 'sword': return ['#cfd6de', '#6b5438', '#8a97a6'];
    case 'axe': return ['#b7bec8', '#6b4a30', '#5a6570'];
    case 'staff': return ['#7a5636', '#caa64a', '#ffe07a'];
    case 'wand': return ['#8a6a4a', '#c86ad6', '#eaa6ff'];
    case 'bow': return ['#8a6238', '#e8dcb0', '#caa64a'];
    case 'gun': return ['#5a5a62', '#6b4a30', '#caa64a'];
    case 'dagger': return ['#d6dde3', '#6b5438', '#8a97a6'];
    case 'knives': return ['#d6dde3', '#3a3a40', '#8a97a6'];
    default: return ['#cfd6de', '#6b5438', '#8a97a6'];
  }
}

/** Draws a limb as a thick line from (ox,oy) at `deg` from straight-down, returns hand/foot endpoint. */
function limb(ctx: CanvasRenderingContext2D, ox: number, oy: number, deg: number, len: number, w: number, color: string, tip?: string): [number, number] {
  const rad = (deg * Math.PI) / 180;
  const ex = ox + Math.sin(rad) * len;
  const ey = oy + Math.cos(rad) * len;
  line(ctx, ox, oy, ex, ey, w, color);
  if (tip) circle(ctx, ex, ey, w * 0.62, tip);
  return [ex, ey];
}

function drawWeapon(ctx: CanvasRenderingContext2D, hx: number, hy: number, type: WeaponType | undefined, colors: string[], deg: number): void {
  const [primary, secondary, accent] = colors.length ? colors : weaponDefaults(type);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate((deg * Math.PI) / 180);
  switch (type) {
    case 'axe':
      rect(ctx, 0, -1, 9, 2, secondary ?? '#6b4a30');
      poly(ctx, [[7, -1], [15, -6], [16, 0], [15, 7], [7, 1]], primary);
      break;
    case 'staff':
      rect(ctx, 0, -1, 15, 2, secondary ?? '#7a5636');
      circle(ctx, 16, 0, 3.4, accent ?? primary);
      circle(ctx, 16, 0, 1.6, '#ffffff');
      break;
    case 'wand':
      rect(ctx, 0, -1, 8, 2, secondary ?? '#8a6a4a');
      circle(ctx, 9, 0, 2.4, accent ?? primary);
      break;
    case 'bow':
      ctx.strokeStyle = primary; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(4, 0, 9, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = secondary ?? '#e8dcb0'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(4 + Math.cos(-1.15) * 9, Math.sin(-1.15) * 9);
      ctx.lineTo(4 + Math.cos(1.15) * 9, Math.sin(1.15) * 9); ctx.stroke();
      break;
    case 'gun':
      rect(ctx, 0, -2, 11, 4, primary);
      rect(ctx, 1, 2, 4, 6, secondary ?? '#6b4a30');
      rect(ctx, 9, -3, 2, 1, accent ?? '#caa64a');
      break;
    case 'dagger':
      rect(ctx, -2, -1.5, 3, 3, secondary ?? '#6b5438');
      poly(ctx, [[1, -1.5], [8, -0.6], [9, 0], [8, 0.6], [1, 1.5]], primary);
      break;
    case 'knives':
      poly(ctx, [[1, -2], [7, -1.2], [8, -0.6], [7, 0], [1, 0.6]], primary);
      poly(ctx, [[1, 0.6], [7, 1.4], [8, 2], [7, 2.4], [1, 1.8]], accent ?? primary);
      break;
    case 'sword':
    default:
      rect(ctx, -2, -1.6, 3, 3.2, secondary ?? '#6b5438');
      rect(ctx, -3, -2.4, 6, 0.8, accent ?? '#8a97a6');
      poly(ctx, [[1, -1.4], [12, -1], [14, 0], [12, 1], [1, 1.4]], primary);
      break;
  }
  ctx.restore();
}

function drawHair(ctx: CanvasRenderingContext2D, style: number, cx: number, cy: number, r: number, color: string): void {
  const dark = shade(color, -0.25);
  switch (style % 6) {
    case 0: // buzz
      ellipse(ctx, cx, cy - r * 0.55, r * 0.96, r * 0.42, color);
      break;
    case 1: // short & spiky
      ellipse(ctx, cx, cy - r * 0.5, r * 1.0, r * 0.55, color);
      for (let i = -2; i <= 2; i++) poly(ctx, [[cx + i * 2.6 - 1.4, cy - r * 0.55], [cx + i * 2.6, cy - r * 1.5], [cx + i * 2.6 + 1.4, cy - r * 0.55]], color);
      break;
    case 2: // bob
      circle(ctx, cx, cy - r * 0.05, r * 1.12, color);
      rect(ctx, cx - r * 1.05, cy - r * 0.1, r * 0.4, r * 1.3, color);
      rect(ctx, cx + r * 0.65, cy - r * 0.1, r * 0.4, r * 1.3, color);
      break;
    case 3: // ponytail
      circle(ctx, cx, cy - r * 0.15, r * 1.05, color);
      poly(ctx, [[cx + r * 0.7, cy - r * 0.3], [cx + r * 2.3, cy + r * 0.4], [cx + r * 1.9, cy + r * 1.6], [cx + r * 0.9, cy + r * 0.6]], dark);
      break;
    case 4: // long flowing
      circle(ctx, cx, cy - r * 0.1, r * 1.1, color);
      rect(ctx, cx - r * 1.15, cy - r * 0.2, r * 0.5, r * 2.2, color);
      rect(ctx, cx + r * 0.65, cy - r * 0.2, r * 0.5, r * 2.2, color);
      break;
    case 5: // mohawk
      ellipse(ctx, cx, cy - r * 0.5, r * 0.9, r * 0.4, shade(color, 0.15));
      for (let i = -1; i <= 1; i++) poly(ctx, [[cx + i * 2.4 - 1.6, cy - r * 0.5], [cx + i * 2.4, cy - r * 1.9], [cx + i * 2.4 + 1.6, cy - r * 0.5]], color);
      break;
  }
}

interface Colors { skin: string; hair: string; eye: string; outfit: string; armor: string; armorAcc: string; helmet?: string; boots: string; gloves: string; weapon: string[] }

function resolveColors(look: CharacterLook): Colors {
  const a = look.appearance;
  const outfit = a.outfit || CLASS_COLORS[look.classId];
  return {
    skin: a.skin, hair: a.hair, eye: a.eyes, outfit,
    armor: look.armorColors?.[0] ?? outfit,
    armorAcc: look.armorColors?.[1] ?? shade(look.armorColors?.[0] ?? outfit, -0.25),
    helmet: look.helmetColors?.[0],
    boots: look.bootsColors?.[0] ?? shade(outfit, -0.35),
    gloves: look.glovesColors?.[0] ?? a.skin,
    weapon: look.weaponColors ?? weaponDefaults(look.weaponType),
  };
}

function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, eye: string, mouth: Pose['mouth'], masked: boolean): void {
  if (masked) { rect(ctx, cx - r * 0.85, cy + r * 0.05, r * 1.7, r * 0.65, '#26232b'); }
  circle(ctx, cx - r * 0.42, cy + r * 0.05, 1.3, '#12100f');
  circle(ctx, cx + r * 0.42, cy + r * 0.05, 1.3, '#12100f');
  circle(ctx, cx - r * 0.42, cy - r * 0.05, 0.5, '#ffffff');
  circle(ctx, cx + r * 0.42, cy - r * 0.05, 0.5, '#ffffff');
  if (masked) return;
  if (mouth === 'smile') { ctx.strokeStyle = '#7a3a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy + r * 0.45, r * 0.3, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else if (mouth === 'open') circle(ctx, cx, cy + r * 0.55, 1.3, '#5a1f1f');
  else if (mouth === 'x') { line(ctx, cx - 1.4, cy + r * 0.45, cx + 1.4, cy + r * 0.75, 0.8, '#5a1f1f'); line(ctx, cx - 1.4, cy + r * 0.75, cx + 1.4, cy + r * 0.45, 0.8, '#5a1f1f'); }
  else rect(ctx, cx - 1.6, cy + r * 0.5, 3.2, 0.8, '#7a3a3a');
}

function classSilhouette(ctx: CanvasRenderingContext2D, look: CharacterLook, c: Colors, cx: number, torsoTop: number, torsoBot: number, crouch: number): void {
  const w = 11 - crouch * 1.5;
  const armor = c.armor, acc = c.armorAcc;
  switch (look.classId) {
    case 'vanguard':
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, armor);
      rect(ctx, cx - w / 2 - 1.5, torsoTop + 1, 2.5, 3, acc); // pauldron L
      rect(ctx, cx + w / 2 - 1, torsoTop + 1, 2.5, 3, acc); // pauldron R
      rect(ctx, cx - w / 2 + 1, torsoTop + 4, w - 2, 1.5, acc); // belt/plate seam
      break;
    case 'stormcaller':
      poly(ctx, [[cx - w * 0.5, torsoTop], [cx + w * 0.5, torsoTop], [cx + w * 0.85, torsoBot], [cx - w * 0.85, torsoBot]], armor);
      rect(ctx, cx - w / 2, torsoTop + 2, w, 1.4, acc);
      break;
    case 'windrunner':
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, armor);
      poly(ctx, [[cx - w / 2 - 1, torsoTop - 1], [cx - 1, torsoTop - 4], [cx - 1, torsoTop + 1]], acc); // hood point back
      rect(ctx, cx - w / 2 + 1, torsoBot - 2, w - 2, 1.4, acc); // belt
      break;
    case 'shade':
    default:
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, armor);
      poly(ctx, [[cx - w / 2, torsoTop + 1], [cx + w / 2 + 2, torsoTop + 3], [cx + w / 2 - 1, torsoTop + 5]], acc); // scarf flap
      break;
  }
}

function drawBody(ctx: CanvasRenderingContext2D, look: CharacterLook, c: Colors, pose: Pose): void {
  const cx = CX;
  const crouchOff = pose.crouch * 3;
  const headCy = 12 + pose.headBob + crouchOff;
  const torsoTop = 18 + crouchOff * 0.6;
  const torsoBot = 29 + crouchOff;
  const hipY = torsoBot;
  const shoulderY = torsoTop + 1.5;
  const r = 7.2;
  const skinArm = look.classId === 'vanguard' ? c.armor : c.gloves;

  // back leg + arm (drawn first, behind torso)
  limb(ctx, cx - 3, hipY, pose.legBackA, pose.legBackL, 3.2, c.boots, c.boots);
  limb(ctx, cx - 4.2, shoulderY, pose.armBackA, 8.6, 2.6, c.outfit === c.armor ? c.armor : c.armor, c.gloves);

  classSilhouette(ctx, look, c, cx, torsoTop, torsoBot, pose.crouch);

  // front leg
  const [footX, footY] = limb(ctx, cx + 3, hipY, pose.legFrontA, pose.legFrontL, 3.2, c.boots, c.boots);
  rect(ctx, footX - 2.4, footY - 1, 4.8, 2.2, shade(c.boots, -0.2));

  // head
  circle(ctx, cx, headCy, r, c.skin);
  const masked = look.classId === 'shade';
  drawFace(ctx, cx, headCy, r, c.eye, pose.mouth, masked);
  drawHair(ctx, look.appearance.hairStyle, cx, headCy, r, c.hair);
  if (c.helmet) ellipse(ctx, cx, headCy - r * 0.6, r * 1.05, r * 0.5, c.helmet);
  if (look.classId === 'stormcaller') poly(ctx, [[cx - r * 0.9, headCy - r * 0.7], [cx, headCy - r * 2.3], [cx + r * 0.9, headCy - r * 0.7]], c.armor);

  // front arm + weapon
  const [handX, handY] = limb(ctx, cx + 4.2, shoulderY, pose.armFrontA, 8.6, 2.6, c.armor, c.gloves);
  if (pose.weaponHand !== 'back') drawWeapon(ctx, handX, handY, look.weaponType, c.weapon, pose.weaponDeg);
  if (pose.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; circle(ctx, handX, handY, 5, 'rgba(255,255,255,0.35)'); ctx.restore(); }
}

function render(look: CharacterLook, pose: Pose): HTMLCanvasElement {
  const c = resolveColors(look);
  const art = makeCanvas(FW, FH);
  const ctx = ctx2d(art);
  if (pose.lying) {
    ctx.save();
    ctx.translate(4, 33);
    ctx.rotate(-Math.PI / 2);
    ctx.translate(-16, -20);
    drawBody(ctx, look, c, pose);
    ctx.restore();
  } else if (pose.climb) {
    // back view: simplified — head, back, alternating arms/legs reaching
    ctx.save();
    circle(ctx, CX, 12 + pose.headBob, 7.2, shade(c.hair, -0.1));
    classSilhouette(ctx, look, c, CX, 18, 29, 0);
    limb(ctx, CX - 4, 19, pose.armBackA, 8, 2.6, c.armor, c.gloves);
    limb(ctx, CX + 4, 19, pose.armFrontA, 8, 2.6, c.armor, c.gloves);
    limb(ctx, CX - 3, 29, pose.legBackA, 9, 3.2, c.boots, c.boots);
    limb(ctx, CX + 3, 29, pose.legFrontA, 9, 3.2, c.boots, c.boots);
    ctx.restore();
  } else {
    drawBody(ctx, look, c, pose);
  }
  return outlined(art, OUTLINE);
}

// ---------------------------------------------------------------------------
// anim pose tables
// ---------------------------------------------------------------------------

type AnimTable = { name: string; frameRate: number; repeat: number; poses: Pose[] };

function buildAnims(weaponType?: WeaponType): AnimTable[] {
  const p = basePose;
  const attackArc: Record<string, number[]> = {
    bow: [40, 15, -10], gun: [30, 55, 60], staff: [-30, -70, -40], wand: [-20, -60, -30],
  };
  const swing = attackArc[weaponType ?? 'sword'] ?? [-60, 40, 110];
  const isRanged = weaponType === 'bow' || weaponType === 'gun';
  const isCaster = weaponType === 'staff' || weaponType === 'wand';

  return [
    { name: 'idle', frameRate: 3, repeat: -1, poses: [0, 1, 0].map((b) => ({ ...p(), headBob: b, armBackA: -6 + b, armFrontA: 6 - b, weaponDeg: 100 })) },
    { name: 'walk', frameRate: 10, repeat: -1, poses: [-30, -12, 10, 30, 12, -10].map((a) => ({ ...p(), legFrontA: a, legBackA: -a, armFrontA: -a * 0.6, armBackA: a * 0.6, headBob: Math.abs(a) > 20 ? 1 : 0, weaponDeg: 100 })) },
    { name: 'jump', frameRate: 1, repeat: -1, poses: [{ ...p(), legFrontA: 18, legBackA: -14, armFrontA: -70, armBackA: -50, weaponDeg: 90 }] },
    { name: 'fall', frameRate: 1, repeat: -1, poses: [{ ...p(), legFrontA: -8, legBackA: 12, armFrontA: -40, armBackA: -20, weaponDeg: 100 }] },
    { name: 'crouch', frameRate: 1, repeat: -1, poses: [{ ...p(), crouch: 1, legFrontA: 12, legBackA: -12, armFrontA: 20, armBackA: -20, weaponDeg: 110 }] },
    {
      name: 'attack', frameRate: 11, repeat: 0,
      poses: swing.map((deg, i) => ({ ...p(), legFrontA: 14 - i * 6, legBackA: -10 + i * 4, armFrontA: deg * 0.35, weaponDeg: deg, mouth: i === 1 ? 'open' : 'flat' as const })),
    },
    {
      name: 'cast', frameRate: 6, repeat: 0,
      poses: [0, 1, 2].map((i) => ({ ...p(), armFrontA: -90 - i * 10, armBackA: isCaster ? -90 - i * 10 : -10, weaponDeg: -95 - i * 10, weaponHand: (isCaster ? 'both' : 'front') as Pose['weaponHand'], mouth: 'flat' as const, glow: i === 2 })),
    },
    {
      name: 'shoot', frameRate: 8, repeat: 0,
      poses: [{ ...p(), armFrontA: 60, armBackA: -70, weaponDeg: isRanged ? 15 : 100, mouth: 'flat' as const }, { ...p(), armFrontA: 75, armBackA: -85, weaponDeg: isRanged ? 5 : 100, mouth: 'open' as const, glow: true }],
    },
    { name: 'climb', frameRate: 5, repeat: -1, poses: [-25, 25].map((a) => ({ ...p(), climb: true, armFrontA: a, armBackA: -a, legFrontA: -a * 0.6, legBackA: a * 0.6 })) },
    { name: 'hurt', frameRate: 8, repeat: 0, poses: [{ ...p(), headBob: -1, armFrontA: -30, armBackA: 30, legFrontA: -10, legBackA: 10, mouth: 'x' as const }] },
    { name: 'dead', frameRate: 1, repeat: 0, poses: [{ ...p(), lying: true, armFrontA: 20, armBackA: -20, legFrontA: 10, legBackA: -10, mouth: 'x' as const }] },
  ];
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

function lookHash(look: CharacterLook): string {
  const a = look.appearance;
  const parts = [
    look.classId, look.jobId, look.weaponType ?? '',
    a.skin, a.hair, a.hairStyle, a.eyes, a.outfit,
    ...(look.weaponColors ?? []), ...(look.armorColors ?? []), ...(look.helmetColors ?? []),
    ...(look.bootsColors ?? []), ...(look.glovesColors ?? []),
  ].join('|');
  return hashStr(parts).toString(36);
}

const infoCache = new Map<string, SpriteInfo>();

export function getCharacterSprite(scene: Phaser.Scene, look: CharacterLook): SpriteInfo {
  const key = `char_${lookHash(look)}`;
  const cached = infoCache.get(key);
  if (cached && scene.textures.exists(key)) return cached;

  const tables = buildAnims(look.weaponType);
  const frames: HTMLCanvasElement[] = [];
  const anims: Record<string, string> = {};
  const ranges: { name: string; start: number; end: number; frameRate: number; repeat: number }[] = [];
  for (const t of tables) {
    const start = frames.length;
    for (const pose of t.poses) frames.push(render(look, pose));
    ranges.push({ name: t.name, start, end: frames.length - 1, frameRate: t.frameRate, repeat: t.repeat });
  }
  registerSpriteSheet(scene, key, frames, FW, FH);
  for (const r of ranges) anims[r.name] = ensureAnim(scene, key, `${key}:${r.name}`, r.start, r.end, r.frameRate, r.repeat);

  const info: SpriteInfo = { key, frameWidth: FW, frameHeight: FH, bodyWidth: 15, bodyHeight: 32, anims };
  infoCache.set(key, info);
  return info;
}

/** Full-body idle frame canvas (frame 0 of idle), used for portraits/previews. */
export function characterIdleCanvas(look: CharacterLook): HTMLCanvasElement {
  return render(look, buildAnims(look.weaponType)[0].poses[0]);
}
