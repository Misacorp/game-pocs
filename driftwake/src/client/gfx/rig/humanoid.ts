/**
 * The humanoid rig: one skeleton + pose solver + draw order shared by every illustrated
 * player character and humanoid NPC. Class/NPC identity comes from pluggable part drawers
 * (outfits, headgear, hair styles, weapons) registered in sibling modules — see
 * `registerOutfit` / `registerHeadgear` / `HAIR_STYLES` / `WEAPONS`.
 *
 * Space: texture px, origin at the feet, up = -y, facing +x (Phaser flipX handles facing left).
 * Limb angles: 0 = pointing straight DOWN, positive swings toward +x (forward).
 * Weapon angle `wA`: canvas convention (0 = pointing +x, positive = clockwise).
 */
import type { JobId, WeaponType } from '@shared/types';
import {
  shape, fill, stroke, path, local, occlude, glint, ink, shadowOf, lightOf, skinShadow, shade, mix, withAlpha,
  emissiveDab, along, lerp, clamp, pulse, easeOut, easeIn, easeInOut, TAU, type Pt, type PathFn,
} from './pen';
import type { RigClip } from './bake';

// ---------------------------------------------------------------------------
// proportions (chibi: head ≈ 42% of total height)
// ---------------------------------------------------------------------------

export const BODY = {
  hipY: -21,
  torsoH: 17,
  headOff: 14.5,
  headRx: 16.5,
  headRy: 15.5,
  upperArm: 8,
  foreArm: 7.5,
  thigh: 10,
  shin: 9,
  armW: 5.6,
  legW: 7,
  handR: 3.3,
};

/** World-px frame + body used by every humanoid sheet. */
export const HUMANOID_FRAME = { worldW: 56, worldH: 50, bodyW: 15, bodyH: 32, visualH: 38 };

// ---------------------------------------------------------------------------
// look + pose
// ---------------------------------------------------------------------------

export interface HumanColors {
  /** main garment / armor */
  main: string;
  /** secondary garment (tabard, sash, lining) */
  acc: string;
  /** metal / embroidery trim */
  trim: string;
  sleeve: string;
  pants: string;
  boots: string;
  gloves: string;
}

export interface HumanLook {
  skin: string;
  hair: string;
  hairStyle: number;
  eyes: string;
  outfit: string;
  colors: HumanColors;
  headgear?: { id: string; colors: string[] };
  weapon?: { type: WeaponType; colors: string[] };
  /** free-form feature flags read by outfit/headgear drawers: 'mask', 'scarf', 'quiver', 'beard', ... */
  extras?: Record<string, string | number | boolean>;
  job?: JobId;
  /** body tweaks: stoop (0..1 elderly hunch), belly (0..1), height (scale, 1 = default) */
  build?: { stoop?: number; belly?: number; height?: number };
  /** face tweaks: brows ('soft'|'bushy'|'stern'), eyeShape ('round'|'narrow'|'sleepy'), age (0..1 adds wrinkles) */
  face?: { brows?: 'soft' | 'bushy' | 'stern'; eyeShape?: 'round' | 'narrow' | 'sleepy'; age?: number; lashes?: boolean };
}

export type Eyes = 'open' | 'closed' | 'happy' | 'wide' | 'x' | 'focus' | 'squeeze';
export type Mouth = 'smile' | 'open' | 'flat' | 'grit' | 'o' | 'x' | 'grin';

export interface HumanPose {
  dx: number; dy: number;
  lean: number;
  head: number; headDy: number;
  aF: [number, number]; aB: [number, number];
  lF: [number, number]; lB: [number, number];
  wA: number;
  wHand: 'F' | 'B' | 'none';
  eyes: Eyes; mouth: Mouth;
  /** secondary motion: -1..1 horizontal lag of hair/cloth (positive = trails toward -x) */
  sway: number;
  /** -1..1 vertical lift of hair/cloth (positive = lifted up, e.g. falling) */
  flutter: number;
  breath: number;
  squash: [number, number];
  /** 0..1 magic glow at the front hand/weapon tip */
  glow: number;
  /** motion smear arc for the weapon, [fromA, toA] */
  smear?: [number, number];
  view: 'side' | 'back';
  /** 0..1 fall-over rotation for the death anim */
  lying: number;
  /** extra: bow-string draw 0..1, recoil etc. */
  draw: number;
}

export function basePose(): HumanPose {
  return {
    dx: 0, dy: 0, lean: 0.03, head: 0, headDy: 0,
    aF: [0.18, 0.35], aB: [-0.12, 0.25], lF: [0.1, -0.04], lB: [-0.1, 0],
    wA: -0.9, wHand: 'F', eyes: 'open', mouth: 'smile',
    sway: 0, flutter: 0, breath: 0, squash: [1, 1], glow: 0, view: 'side', lying: 0, draw: 0,
  };
}

// ---------------------------------------------------------------------------
// solved skeleton
// ---------------------------------------------------------------------------

export interface Joints {
  hip: Pt; chest: Pt; neck: Pt; head: Pt; headRot: number; lean: number;
  shF: Pt; elF: Pt; haF: Pt; shB: Pt; elB: Pt; haB: Pt;
  hiF: Pt; knF: Pt; anF: Pt; hiB: Pt; knB: Pt; anB: Pt;
  /** absolute segment angles (0 = down) */
  ang: { uaF: number; faF: number; uaB: number; faB: number; thF: number; shF: number; thB: number; shB: number };
}

export function solve(p: HumanPose, look?: HumanLook): Joints {
  const stoop = look?.build?.stoop ?? 0;
  const lean = p.lean + stoop * 0.3;
  const hip: Pt = [p.dx, BODY.hipY + p.dy];
  const cos = Math.cos(lean), sin = Math.sin(lean);
  const toRoot = (lx: number, ly: number): Pt => [hip[0] + lx * cos - ly * sin, hip[1] + lx * sin + ly * cos];
  const th = BODY.torsoH + p.breath * 0.6;
  const chest = toRoot(0, -th);
  const neck = toRoot(0.8, -th - 0.5);
  const headRot = lean * 0.55 + p.head + stoop * 0.15;
  const head: Pt = [neck[0] + Math.sin(headRot) * BODY.headOff + stoop * 3, neck[1] - Math.cos(headRot) * BODY.headOff + p.headDy + stoop * 2];
  const shF = toRoot(4.2, -th + 3), shB = toRoot(-4.2, -th + 3.2);
  const uaF = p.aF[0] + lean * 0.5, faF = uaF + p.aF[1];
  const uaB = p.aB[0] + lean * 0.5, faB = uaB + p.aB[1];
  const elF = along(shF[0], shF[1], uaF, BODY.upperArm), haF = along(elF[0], elF[1], faF, BODY.foreArm);
  const elB = along(shB[0], shB[1], uaB, BODY.upperArm), haB = along(elB[0], elB[1], faB, BODY.foreArm);
  const hiF = toRoot(3, -1.5), hiB = toRoot(-3, -1.5);
  const thF = p.lF[0], shFa = thF + p.lF[1], thB = p.lB[0], shBa = thB + p.lB[1];
  const knF = along(hiF[0], hiF[1], thF, BODY.thigh), anF = along(knF[0], knF[1], shFa, BODY.shin);
  const knB = along(hiB[0], hiB[1], thB, BODY.thigh), anB = along(knB[0], knB[1], shBa, BODY.shin);
  return {
    hip, chest, neck, head, headRot, lean,
    shF, elF, haF, shB, elB, haB, hiF, knF, anF, hiB, knB, anB,
    ang: { uaF, faF, uaB, faB, thF, shF: shFa, thB, shB: shBa },
  };
}

// ---------------------------------------------------------------------------
// part registries
// ---------------------------------------------------------------------------

/** Everything a part drawer needs. */
export interface Rig {
  g: CanvasRenderingContext2D;
  look: HumanLook;
  pose: HumanPose;
  j: Joints;
  clip: string;
  t: number;
  /** run fn in the torso frame (origin hip, rotated by lean; shoulders at y = -BODY.torsoH) */
  torso(fn: () => void): void;
  /** run fn in the head frame (origin head center, rotated) */
  headFrame(fn: () => void): void;
}

export interface OutfitDrawer {
  /** behind everything (capes, quivers, scarf tails, back hair is separate) */
  back?(r: Rig): void;
  /** the torso garment, drawn after both legs, in the torso frame is up to the drawer */
  torso(r: Rig): void;
  /** long hems that cover the legs (robes, coats) — drawn after torso */
  overLegs?(r: Rig): void;
  /** drawn over the upper arm at the shoulder joint (pauldrons, puffed sleeves) */
  shoulder?(r: Rig, side: 'F' | 'B'): void;
  /** drawn over the forearm (bracers, cuffs) */
  cuff?(r: Rig, side: 'F' | 'B'): void;
  /** drawn after the head (scarves over the chin, collars) */
  collar?(r: Rig): void;
  /** back view torso for climb */
  backView?(r: Rig): void;
  /** leg styling: hide the thighs under a robe (drawer handles the hem instead) */
  legs?: 'pants' | 'robe' | 'shorts';
  /** sleeve shape: 'fitted' (default) or 'wide' (flared cuffs) */
  sleeves?: 'fitted' | 'wide' | 'bare';
}

export interface HeadgearDrawer {
  /** behind the head (hat brims seen from behind, hood back) */
  back?(r: Rig): void;
  /** in front of hair, in head frame */
  front(r: Rig): void;
  /** how much of the hair to skip: 'none', 'top' (only draw back/side locks), 'all' */
  hides?: 'none' | 'top' | 'all';
}

export interface HairStyle {
  name: string;
  /** mass behind the head (head frame) */
  back?(r: Rig, c: HairColors): void;
  /** cap + bangs over the head (head frame) */
  front(r: Rig, c: HairColors): void;
  /** back-view (climb) hair, head frame */
  backView?(r: Rig, c: HairColors): void;
}
export interface HairColors { base: string; shadow: string; light: string; line: string }

const OUTFITS = new Map<string, OutfitDrawer>();
const HEADGEAR = new Map<string, HeadgearDrawer>();
export function registerOutfit(id: string, d: OutfitDrawer): void { OUTFITS.set(id, d); }
export function registerHeadgear(id: string, d: HeadgearDrawer): void { HEADGEAR.set(id, d); }
export function hasOutfit(id: string): boolean { return OUTFITS.has(id); }

export type WeaponDrawer = (r: Rig, colors: string[]) => void;
/** Weapons draw in the hand frame: origin = grip center, +x = toward the tip. */
export const WEAPONS: Partial<Record<WeaponType, WeaponDrawer>> = {};
export const HAIR_STYLES: HairStyle[] = [];

// ---------------------------------------------------------------------------
// drawing: limbs, hands, boots
// ---------------------------------------------------------------------------

function limbSeg(g: CanvasRenderingContext2D, a: Pt, b: Pt, r0: number, r1: number, color: string, back: boolean): void {
  const c = back ? shade(color, -0.16) : color;
  shape(g, path.capsule(a[0], a[1], r0, b[0], b[1], r1), c, { depth: 2 });
}

function drawArm(r: Rig, side: 'F' | 'B'): void {
  const { g, j, look } = r;
  const o = OUTFITS.get(look.outfit);
  const back = side === 'B';
  const sh = back ? j.shB : j.shF, el = back ? j.elB : j.elF, ha = back ? j.haB : j.haF;
  const sleeve = o?.sleeves === 'bare' ? look.skin : look.colors.sleeve;
  const w = BODY.armW / 2;
  limbSeg(g, sh, el, w, w * 0.92, sleeve, back);
  const foreColor = o?.sleeves === 'bare' ? look.skin : sleeve;
  if (o?.sleeves === 'wide') {
    // flared sleeve: a bell that opens toward the wrist
    const a = back ? j.ang.faB : j.ang.faF;
    local(g, el[0], el[1], -a, () => {
      shape(g, path.poly([[-w * 0.9, -1], [w * 0.9, -1], [w * 1.9, BODY.foreArm - 1], [-w * 1.9, BODY.foreArm - 1]]), back ? shade(sleeve, -0.16) : sleeve, { depth: 2 });
    });
  } else {
    limbSeg(g, el, ha, w * 0.92, w * 0.8, foreColor, back);
  }
  o?.cuff?.(r, side);
  o?.shoulder?.(r, side);
}

function drawHand(r: Rig, side: 'F' | 'B'): void {
  const { g, j, look } = r;
  const ha = side === 'B' ? j.haB : j.haF;
  const c = side === 'B' ? shade(look.colors.gloves, -0.14) : look.colors.gloves;
  shape(g, path.circle(ha[0], ha[1], BODY.handR), c, { depth: 1.4 });
}

function drawLeg(r: Rig, side: 'F' | 'B'): void {
  const { g, j, look } = r;
  const o = OUTFITS.get(look.outfit);
  const back = side === 'B';
  const hi = back ? j.hiB : j.hiF, kn = back ? j.knB : j.knF, an = back ? j.anB : j.anF;
  const w = BODY.legW / 2;
  if (o?.legs !== 'robe') {
    limbSeg(g, hi, kn, w, w * 0.9, look.colors.pants, back);
    limbSeg(g, kn, an, w * 0.9, w * 0.78, look.colors.pants, back);
  } else {
    limbSeg(g, kn, an, w * 0.8, w * 0.72, shade(look.colors.pants, -0.1), back);
  }
  drawBoot(r, an, back ? j.ang.shB : j.ang.shF, back);
}

function drawBoot(r: Rig, an: Pt, shinA: number, back: boolean): void {
  const { g, look } = r;
  const c = back ? shade(look.colors.boots, -0.16) : look.colors.boots;
  local(g, an[0], an[1], -shinA * 0.55, () => {
    // shaft + foot: rounded toe forward, flat sole
    shape(g, path.blob([[-3.2, -4.5], [2.4, -4.8], [3.4, -1.5], [7.6, -0.6], [8.2, 2.2], [-3.6, 2.6]], 0.35), c, { depth: 2 });
    fill(g, path.rrect(-3.8, 1.6, 12, 1.4, 0.7), shade(c, -0.35), 0.9);
    // cuff band
    fill(g, path.rrect(-3.3, -4.9, 6, 1.6, 0.8), lightOf(c, 0.25), 0.9);
  });
}

// ---------------------------------------------------------------------------
// head + face
// ---------------------------------------------------------------------------

/** Chibi head silhouette (head frame): rounder cranium, soft cheek, small chin toward +x. */
export function headPath(): PathFn {
  const rx = BODY.headRx, ry = BODY.headRy;
  return path.blob([
    [0.5, -ry], [rx * 0.72, -ry * 0.72], [rx, -ry * 0.05], [rx * 0.86, ry * 0.52],
    [rx * 0.4, ry * 0.92], [-rx * 0.2, ry * 0.95], [-rx * 0.78, ry * 0.62], [-rx * 1.0, -ry * 0.02], [-rx * 0.72, -ry * 0.74],
  ], 0.5);
}

function drawHead(r: Rig): void {
  const { g, look } = r;
  const skin = look.skin;
  r.headFrame(() => {
    // neck stub
    shape(g, path.rrect(-3.5, 9, 7.5, 7, 3), skinShadow(skin, 0.1), { shadow: false });
    shape(g, headPath(), skin, { depth: 3, shadow: skinShadow(skin) });
    // ear (back side)
    shape(g, path.ellipse(-6.4, 3.6, 2.4, 3.2, 0.1), skin, { depth: 1.2, shadow: skinShadow(skin, 0.1), lw: 1 });
    stroke(g, [[-7, 2.4], [-6.2, 3.8], [-6.8, 4.8]], skinShadow(skin, 0.3), 0.8);
    drawFace(r);
  });
}

function drawFace(r: Rig): void {
  const { g, look, pose } = r;
  const skin = look.skin;
  const masked = !!look.extras?.mask;
  const age = look.face?.age ?? 0;
  // blush
  if (!masked) {
    fill(g, path.ellipse(1.5, 7.8, 3.2, 1.8), '#ff7a8a', 0.28);
    fill(g, path.ellipse(13.2, 7.4, 2.4, 1.6), '#ff7a8a', 0.24);
  }
  const eyeY = 1.5;
  const eyes: { x: number; w: number }[] = [{ x: 3.2, w: 1 }, { x: 11.4, w: 0.84 }];
  const lineC = mix(ink(skin), '#2a1418', 0.5);
  const hairInk = shade(look.hair, -0.35);
  // brows
  const brows = look.face?.brows ?? 'soft';
  for (const e of eyes) {
    const bw = brows === 'bushy' ? 2 : 1.3;
    const lift = pose.eyes === 'wide' ? -1.5 : pose.eyes === 'focus' || brows === 'stern' ? 0.8 : 0;
    const tilt = pose.eyes === 'focus' || pose.eyes === 'squeeze' ? 1 : 0;
    const bx = e.x, by = eyeY - 6.2 + lift;
    stroke(g, [[bx - 2.6 * e.w, by + tilt * (e.x < 7 ? -0.6 : 0.8)], [bx + 2.6 * e.w, by + tilt * (e.x < 7 ? 0.8 : -0.6)]], brows === 'bushy' ? look.hair : hairInk, bw);
  }
  for (const e of eyes) drawEye(g, e.x, eyeY, e.w, look, pose.eyes, lineC);
  if (age > 0) {
    stroke(g, [[-1.4, 6.5], [0.2, 7.6]], shadowOf(skin, 0.4), 0.8, age);
    stroke(g, [[15.2, 1.5], [16.2, 2.6]], shadowOf(skin, 0.4), 0.8, age);
  }
  if (masked) return;
  // nose hint
  stroke(g, [[15.6, 4.2], [16.2, 5.2]], shadowOf(skin, 0.35), 0.9, 0.8);
  // mouth
  const mx = 9.4, my = 9.2;
  const mouthC = '#6a2a2e';
  switch (pose.mouth) {
    case 'smile': stroke(g, (gg) => { gg.moveTo(mx - 2.2, my - 0.4); gg.quadraticCurveTo(mx, my + 1.8, mx + 2.2, my - 0.6); }, mouthC, 1.1); break;
    case 'grin': shape(g, (gg) => { gg.moveTo(mx - 2.8, my - 0.6); gg.quadraticCurveTo(mx, my + 3.6, mx + 2.8, my - 0.8); gg.closePath(); }, '#8a2e36', { shadow: false, line: mouthC, lw: 0.9 }); break;
    case 'open': shape(g, path.ellipse(mx, my + 0.6, 1.9, 2.2), '#7a2630', { shadow: false, line: mouthC, lw: 0.9 }); fill(g, path.ellipse(mx, my + 1.8, 1.2, 0.8), '#e0707a', 0.9); break;
    case 'o': shape(g, path.ellipse(mx, my + 0.4, 1.3, 1.5), '#7a2630', { shadow: false, line: mouthC, lw: 0.9 }); break;
    case 'grit': shape(g, path.rrect(mx - 2.6, my - 1, 5.2, 2.6, 1), '#fff8f0', { shadow: false, line: mouthC, lw: 0.9 }); stroke(g, [[mx - 2.4, my + 0.3], [mx + 2.4, my + 0.3]], mouthC, 0.6); break;
    case 'x': stroke(g, [[mx - 1.6, my - 1], [mx + 1.6, my + 1.4]], mouthC, 1); stroke(g, [[mx - 1.6, my + 1.4], [mx + 1.6, my - 1]], mouthC, 1); break;
    case 'flat': default: stroke(g, [[mx - 1.8, my + 0.2], [mx + 1.8, my]], mouthC, 1.1); break;
  }
}

function drawEye(g: CanvasRenderingContext2D, x: number, y: number, w: number, look: HumanLook, state: Eyes, lineC: string): void {
  const shapeKind = look.face?.eyeShape ?? 'round';
  const ew = 2.5 * w, eh = shapeKind === 'narrow' ? 3.2 : shapeKind === 'sleepy' ? 2.8 : 3.9;
  switch (state) {
    case 'closed': stroke(g, (gg) => { gg.moveTo(x - ew, y + 0.5); gg.quadraticCurveTo(x, y + 2.2, x + ew, y + 0.4); }, lineC, 1.3); return;
    case 'happy': stroke(g, (gg) => { gg.moveTo(x - ew, y + 1.2); gg.quadraticCurveTo(x, y - 2.2, x + ew, y + 1.2); }, lineC, 1.4); return;
    case 'squeeze': stroke(g, [[x - ew, y - 1.6], [x + ew * 0.6, y + 0.4], [x - ew, y + 2]], lineC, 1.3); return;
    case 'x': stroke(g, [[x - ew * 0.8, y - 1.8], [x + ew * 0.8, y + 1.8]], lineC, 1.2); stroke(g, [[x - ew * 0.8, y + 1.8], [x + ew * 0.8, y - 1.8]], lineC, 1.2); return;
    default: break;
  }
  const focus = state === 'focus';
  const top = focus ? y - eh * 0.55 : y - eh;
  // sclera
  const sclera = path.blob([[x - ew, y - (focus ? eh * 0.4 : eh * 0.6)], [x, top], [x + ew, y - (focus ? eh * 0.55 : eh * 0.7)], [x + ew * 0.95, y + eh * 0.55], [x, y + eh], [x - ew * 0.95, y + eh * 0.6]], 0.5);
  fill(g, sclera, '#fffaf2');
  g.save(); g.beginPath(); sclera(g); g.clip();
  // iris (gradient: darker top, lighter bottom like anime eyes)
  const ir = state === 'wide' ? 1.55 : 1.95;
  const ix = x + 0.5 * w, iy = y + 0.6;
  const grad = g.createLinearGradient(0, iy - eh, 0, iy + eh);
  grad.addColorStop(0, shade(look.eyes, -0.45)); grad.addColorStop(0.55, look.eyes); grad.addColorStop(1, lightOf(look.eyes, 0.45));
  g.fillStyle = grad; g.beginPath(); g.ellipse(ix, iy, ir * w + 0.3, eh * 0.95, 0, 0, TAU); g.fill();
  fill(g, path.ellipse(ix + 0.2, iy + 0.3, ir * 0.55 * w, eh * 0.5), shade(look.eyes, -0.7));
  g.restore();
  // lash line (thick top lid) + small wing
  stroke(g, (gg) => { gg.moveTo(x - ew * 1.08, y - (focus ? eh * 0.35 : eh * 0.55)); gg.quadraticCurveTo(x, top - 1.1, x + ew * 1.12, y - (focus ? eh * 0.55 : eh * 0.72)); }, lineC, 1.5);
  if (look.face?.lashes) stroke(g, [[x + ew * 1.05, y - eh * 0.7], [x + ew * 1.7, y - eh * 1.05]], lineC, 1);
  // highlights
  glint(g, ix - 0.9 * w, iy - eh * 0.45, 1.05, 1.25, -0.3, 0.95);
  glint(g, ix + 0.9 * w, iy + eh * 0.45, 0.55, 0.55, 0, 0.7);
}

// ---------------------------------------------------------------------------
// hair
// ---------------------------------------------------------------------------

export function hairColors(hair: string): HairColors {
  return { base: hair, shadow: shadowOf(hair, 0.3), light: lightOf(hair, 0.32), line: ink(hair) };
}

/** Glossy "halo" highlight — the anime hair shine: a broken arc band across the crown,
 *  clipped to the hair shape. Head frame; `y` is the band's height (default just above the brow). */
export function hairShine(g: CanvasRenderingContext2D, c: HairColors, y = -11, clip?: PathFn): void {
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip(); }
  const cy = y + 14, rad = 14;
  g.strokeStyle = c.light; g.lineCap = 'round';
  g.globalAlpha = 0.7; g.lineWidth = 2.3;
  g.beginPath(); g.arc(1, cy, rad, -2.55, -1.75); g.stroke();
  g.beginPath(); g.arc(1, cy, rad, -1.55, -0.95); g.stroke();
  g.globalAlpha = 0.45; g.lineWidth = 1.2;
  g.beginPath(); g.arc(1, cy, rad - 2.6, -2.3, -1.9); g.stroke();
  g.restore();
}

function drawHairLayer(r: Rig, which: 'back' | 'front'): void {
  const hg = r.look.headgear ? HEADGEAR.get(r.look.headgear.id) : undefined;
  if (hg?.hides === 'all') return;
  const style = HAIR_STYLES[((r.look.hairStyle % Math.max(1, HAIR_STYLES.length)) + HAIR_STYLES.length) % Math.max(1, HAIR_STYLES.length)];
  if (!style) return;
  const c = hairColors(r.look.hair);
  r.headFrame(() => {
    if (which === 'back') style.back?.(r, c);
    else if (hg?.hides !== 'top') style.front(r, c);
    else sideLocksOnly(r, c);
  });
}

/** When a hat covers the crown, still show a fringe + side lock so the hair color reads. */
function sideLocksOnly(r: Rig, c: HairColors): void {
  const { g } = r;
  shape(g, path.blob([[-15.5, -6], [-9, -9], [-6, -4], [-9.5, 4.5], [-14.5, 3]], 0.45), c.base, { shadow: c.shadow, depth: 2 });
  shape(g, path.blob([[4, -9.5], [15.5, -8.6], [14.2, -3.6], [10.4, -5.2], [7.6, -3.4], [5, -5.6]], 0.35), c.base, { shadow: c.shadow, depth: 1.6 });
}

// ---------------------------------------------------------------------------
// the full character
// ---------------------------------------------------------------------------

export function drawHumanoid(g: CanvasRenderingContext2D, look: HumanLook, pose: HumanPose, clip: string, t: number): void {
  const j = solve(pose, look);
  const r: Rig = {
    g, look, pose, j, clip, t,
    torso: (fn) => local(g, j.hip[0], j.hip[1], j.lean, fn),
    headFrame: (fn) => local(g, j.head[0], j.head[1], j.headRot, fn),
  };
  const o = OUTFITS.get(look.outfit) ?? OUTFITS.get('tunic');
  const hs = look.build?.height ?? 1;

  g.save();
  if (pose.lying > 0) {
    const l = easeIn(pose.lying);
    g.translate(l * 30, -l * 11);
    g.rotate(-l * Math.PI / 2);
  }
  g.scale(pose.squash[0] * hs, pose.squash[1] * hs);

  if (pose.view === 'back') { drawBackView(r, o); g.restore(); return; }

  o?.back?.(r);
  drawHairLayer(r, 'back');
  if (look.headgear) HEADGEAR.get(look.headgear.id)?.back?.(r);
  // back arm (+ weapon when held in the back hand)
  drawArm(r, 'B');
  if (pose.wHand === 'B') drawWeapon(r, j.haB);
  drawHand(r, 'B');
  drawLeg(r, 'B');
  drawLeg(r, 'F');
  o?.torso(r);
  o?.overLegs?.(r);
  // head casts a soft shadow on the chest
  r.torso(() => occlude(g, path.rrect(-11, -BODY.torsoH - 2, 22, 12, 4), 2, -BODY.torsoH, 10, '#1d1420', 0.25));
  drawHead(r);
  drawHairLayer(r, 'front');
  if (look.headgear) HEADGEAR.get(look.headgear.id)?.front(r);
  o?.collar?.(r);
  // front arm + weapon
  drawArm(r, 'F');
  if (pose.wHand === 'F') {
    if (pose.smear) drawSmear(r, j.haF, pose.smear[0], pose.smear[1]);
    drawWeapon(r, j.haF);
  }
  drawHand(r, 'F');
  if (pose.glow > 0) {
    const tip = weaponTip(r);
    emissiveDab(g, tip[0], tip[1], 5 + pose.glow * 7, look.weapon?.colors[2] ?? '#9fe8ff', { alpha: 0.35 + pose.glow * 0.6, coreStop: 0.25 });
  }
  g.restore();
}

function drawWeapon(r: Rig, hand: Pt): void {
  const w = r.look.weapon;
  if (!w) return;
  const d = WEAPONS[w.type];
  if (!d) return;
  local(r.g, hand[0], hand[1], r.pose.wA, () => d(r, w.colors));
}

/** Where a weapon's business end is (for glows). */
export function weaponTip(r: Rig): Pt {
  const len = WEAPON_REACH[r.look.weapon?.type ?? 'sword'] ?? 10;
  const h = r.j.haF;
  return [h[0] + Math.cos(r.pose.wA) * len, h[1] + Math.sin(r.pose.wA) * len];
}
export const WEAPON_REACH: Partial<Record<WeaponType, number>> = { sword: 30, axe: 24, staff: 30, wand: 15, bow: 4, gun: 20, dagger: 14, knives: 12 };

function drawSmear(r: Rig, hand: Pt, from: number, to: number): void {
  const { g } = r;
  const len = (WEAPON_REACH[r.look.weapon?.type ?? 'sword'] ?? 20) + 2;
  const col = r.look.weapon?.colors[0] ?? '#ffffff';
  g.save();
  g.translate(hand[0], hand[1]);
  const a0 = Math.min(from, to), a1 = Math.max(from, to);
  const grad = g.createRadialGradient(0, 0, len * 0.6, 0, 0, len + 2);
  grad.addColorStop(0, withAlpha('#ffffff', 0));
  grad.addColorStop(0.75, withAlpha(lightOf(col, 0.6), 0.22));
  grad.addColorStop(1, withAlpha('#ffffff', 0.6));
  g.fillStyle = grad;
  g.beginPath();
  g.arc(0, 0, len + 2, a0, a1);
  g.arc(0, 0, len * 0.62, a1, a0, true);
  g.closePath();
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------------------
// back view (climbing)
// ---------------------------------------------------------------------------

function drawBackView(r: Rig, o: OutfitDrawer | undefined): void {
  const { g, j, look, pose } = r;
  const w = BODY.legW / 2;
  // legs
  for (const s of [-1, 1] as const) {
    const lift = s === 1 ? pose.lF[0] : pose.lB[0];
    const hi: Pt = [j.hip[0] + s * 3.4, j.hip[1] - 1];
    const kn: Pt = [hi[0] + s * 0.6, hi[1] + BODY.thigh - Math.max(0, lift) * 5];
    const an: Pt = [kn[0], kn[1] + BODY.shin - Math.max(0, lift) * 2];
    if (o?.legs !== 'robe') { limbSeg(g, hi, kn, w, w * 0.9, look.colors.pants, false); limbSeg(g, kn, an, w * 0.9, w * 0.78, look.colors.pants, false); }
    else limbSeg(g, kn, an, w * 0.8, w * 0.72, shade(look.colors.pants, -0.1), false);
    shape(g, path.rrect(an[0] - 3.4, an[1] - 4.5, 6.8, 7, 3), look.colors.boots, { depth: 2 });
  }
  if (o?.backView) o.backView(r);
  else r.torso(() => shape(g, path.rrect(-10, -BODY.torsoH - 1, 20, BODY.torsoH + 3, 5), look.colors.main, { depth: 3 }));
  // arms reaching up the rope
  for (const s of [-1, 1] as const) {
    const reach = s === 1 ? pose.aF[0] : pose.aB[0]; // 0..1 how high this hand is
    const sh: Pt = [j.chest[0] + s * 8, j.chest[1] + 3];
    const ha: Pt = [j.chest[0] + s * 3.2, j.chest[1] - 10 - reach * 9];
    const el: Pt = [(sh[0] + ha[0]) / 2 + s * 4.5, (sh[1] + ha[1]) / 2 + 1];
    limbSeg(g, sh, el, BODY.armW / 2, BODY.armW / 2 * 0.9, look.colors.sleeve, false);
    limbSeg(g, el, ha, BODY.armW / 2 * 0.9, BODY.armW / 2 * 0.8, look.colors.sleeve, false);
    shape(g, path.circle(ha[0], ha[1], BODY.handR), look.colors.gloves, { depth: 1.4 });
  }
  // head from behind: all hair
  const hg = look.headgear ? HEADGEAR.get(look.headgear.id) : undefined;
  const style = HAIR_STYLES[((look.hairStyle % Math.max(1, HAIR_STYLES.length)) + HAIR_STYLES.length) % Math.max(1, HAIR_STYLES.length)];
  const c = hairColors(look.hair);
  r.headFrame(() => {
    shape(g, path.ellipse(0, 0, BODY.headRx * 0.98, BODY.headRy), look.skin, { depth: 3 });
    if (hg?.hides !== 'all') {
      if (style?.backView) style.backView(r, c);
      else shape(g, path.blob([[-16.5, 4], [-14, -11], [0, -17.5], [14, -11], [16.5, 4], [9, 10], [0, 8], [-9, 10]], 0.5), c.base, { shadow: c.shadow, depth: 3 });
    }
  });
  if (hg) hg.front(r);
}

// ---------------------------------------------------------------------------
// animation clips (shared by every humanoid)
// ---------------------------------------------------------------------------

export const HUMANOID_CLIPS: RigClip[] = [
  { name: 'idle', frames: 16, frameRate: 8, repeat: -1 },
  { name: 'walk', frames: 8, frameRate: 13, repeat: -1 },
  { name: 'jump', frames: 2, frameRate: 7, repeat: -1 },
  { name: 'fall', frames: 2, frameRate: 7, repeat: -1 },
  { name: 'crouch', frames: 2, frameRate: 3, repeat: -1 },
  { name: 'attack', frames: 6, frameRate: 18, repeat: 0 },
  { name: 'cast', frames: 6, frameRate: 14, repeat: 0 },
  { name: 'shoot', frames: 5, frameRate: 15, repeat: 0 },
  { name: 'climb', frames: 4, frameRate: 7, repeat: -1 },
  { name: 'hurt', frames: 2, frameRate: 9, repeat: 0 },
  { name: 'dead', frames: 4, frameRate: 9, repeat: 0 },
];

/** NPCs only need a (longer, calmer) idle. */
export const NPC_CLIPS: RigClip[] = [{ name: 'idle', frames: 16, frameRate: 6, repeat: -1 }];

/** Resting weapon angle per weapon type (canvas radians). */
export function restWeaponAngle(type?: WeaponType): number {
  switch (type) {
    case 'staff': return -1.42;
    case 'wand': return -0.55;
    case 'bow': return 1.15;
    case 'gun': return 0.55;
    case 'dagger': case 'knives': return 0.95;
    case 'axe': return -1.15;
    case 'sword': default: return -1.0;
  }
}

type Family = 'blade' | 'staff' | 'bow' | 'gun' | 'short';
function family(type?: WeaponType): Family {
  if (type === 'staff' || type === 'wand') return 'staff';
  if (type === 'bow') return 'bow';
  if (type === 'gun') return 'gun';
  if (type === 'dagger' || type === 'knives') return 'short';
  return 'blade';
}

/** Pose for clip `clip` at normalized phase t (frame i of n). Pure — no randomness. */
export function humanoidPose(clip: string, t: number, i: number, n: number, weapon?: WeaponType): HumanPose {
  const p = basePose();
  const rest = restWeaponAngle(weapon);
  const fam = family(weapon);
  p.wA = rest;
  if (fam === 'staff') { p.aF = [0.5, 0.75]; }
  if (fam === 'bow') { p.aF = [0.35, 0.55]; }
  if (fam === 'gun') { p.aF = [0.25, 0.5]; }
  if (fam === 'short') { p.aF = [0.1, 0.55]; }
  const ph = t * TAU;
  switch (clip) {
    case 'idle': {
      const b = Math.sin(ph);
      p.breath = 0.5 + 0.5 * b;
      p.dy = -b * 0.5;
      p.aF = [p.aF[0] + b * 0.03, p.aF[1]];
      p.aB = [p.aB[0] - b * 0.04, p.aB[1]];
      p.head = b * 0.025;
      p.sway = Math.sin(ph + 0.8) * 0.18;
      p.wA = rest + b * 0.03;
      if (i === 12) p.eyes = 'closed';
      break;
    }
    case 'walk': {
      const s = Math.sin(ph), c = Math.cos(ph);
      p.lF = [s * 0.6, -0.8 * Math.max(0, c) - 0.05];
      p.lB = [-s * 0.6, -0.8 * Math.max(0, -c) - 0.05];
      p.aF = [p.aF[0] - s * (fam === 'blade' ? 0.35 : 0.2), p.aF[1]];
      p.aB = [p.aB[0] + s * 0.5, p.aB[1] + 0.1];
      p.dy = -Math.abs(c) * 1.8 + 0.6;
      p.lean = 0.1;
      p.sway = 0.5 + s * 0.25;
      p.head = -s * 0.02;
      p.wA = rest - s * (fam === 'blade' ? 0.25 : 0.12);
      break;
    }
    case 'jump': {
      p.lF = [0.75, -1.25 - i * 0.1]; p.lB = [-0.05, -0.9];
      p.aF = [p.aF[0] + 0.5, p.aF[1] - 0.2]; p.aB = [-1.2 - i * 0.1, 0.5];
      p.wA = rest - 0.25;
      p.lean = 0.12; p.flutter = -0.6 - i * 0.2; p.sway = 0.4; p.mouth = 'open';
      break;
    }
    case 'fall': {
      p.lF = [0.35, -0.35]; p.lB = [-0.35, -0.25 - i * 0.1];
      p.aF = [p.aF[0] + 0.9, p.aF[1] - 0.3]; p.aB = [-1.9 - i * 0.12, 0.3];
      p.wA = rest - 0.4;
      p.lean = 0; p.flutter = 0.8 + i * 0.2; p.sway = 0.2; p.mouth = 'o';
      break;
    }
    case 'crouch': {
      p.dy = 8.5; p.lean = 0.32;
      p.lF = [1.15, -1.95]; p.lB = [0.72, -1.95];
      p.aF = [p.aF[0] + 0.4, p.aF[1] + 0.2]; p.aB = [0.35, 0.6];
      p.head = -0.25; p.breath = i * 0.4; p.eyes = 'focus'; p.mouth = 'flat';
      p.wA = rest + 0.35;
      break;
    }
    case 'attack': return attackPose(p, t, i, n, fam, rest);
    case 'cast': {
      const up = easeOut(clamp(t / 0.45, 0, 1));
      p.aF = [lerp(p.aF[0], 1.75, up), lerp(p.aF[1], -0.15, up)];
      p.aB = [lerp(-0.1, 1.2, up), lerp(0.3, 0.7, up)];
      p.wA = fam === 'staff' ? lerp(rest, -1.45, up) : lerp(rest, -0.55, up);
      p.lean = lerp(0.03, -0.1, up); p.head = -0.08 * up;
      p.lF = [0.25 * up, -0.05]; p.lB = [-0.25 * up, 0];
      p.glow = clamp((t - 0.25) / 0.5, 0, 1) * (1 - clamp((t - 0.9) / 0.1, 0, 1) * 0.5);
      p.flutter = 0.5 * up; p.sway = -0.2 * up;
      p.eyes = t > 0.3 ? 'focus' : 'open'; p.mouth = t > 0.3 ? 'o' : 'flat';
      break;
    }
    case 'shoot': return shootPose(p, t, i, n, fam, rest);
    case 'climb': {
      p.view = 'back';
      const s = Math.sin(ph);
      p.aF = [0.5 + 0.5 * s, 0]; p.aB = [0.5 - 0.5 * s, 0];
      p.lF = [Math.max(0, -s), 0]; p.lB = [Math.max(0, s), 0];
      p.dy = -Math.abs(s) * 0.8;
      p.wHand = 'none';
      break;
    }
    case 'hurt': {
      const k = i === 0 ? 1 : 0.5;
      p.lean = -0.38 * k; p.dx = -2.5 * k; p.head = -0.2 * k;
      p.aF = [p.aF[0] - 0.6 * k, p.aF[1] + 0.5]; p.aB = [-0.9 * k, 0.6];
      p.lF = [0.35 * k, -0.4]; p.lB = [-0.1, -0.1];
      p.wA = rest - 0.5 * k;
      p.eyes = 'squeeze'; p.mouth = 'open'; p.squash = [1 + 0.06 * k, 1 - 0.07 * k]; p.sway = 0.8 * k;
      break;
    }
    case 'dead': {
      p.lying = easeInOut(clamp(t * 1.15, 0, 1));
      p.eyes = t > 0.4 ? 'x' : 'squeeze'; p.mouth = t > 0.4 ? 'x' : 'open';
      p.aF = [lerp(p.aF[0], 1.6, t), lerp(p.aF[1], 0.2, t)]; p.aB = [lerp(-0.1, -1.4, t), 0.1];
      p.lF = [lerp(0.1, 0.5, t), lerp(-0.04, -0.6, t)]; p.lB = [-0.1, -0.2];
      p.wA = lerp(rest, rest + 1.8, t);
      p.flutter = -p.lying * 0.6;
      break;
    }
    default: break;
  }
  return p;
}

function attackPose(p: HumanPose, t: number, i: number, n: number, fam: Family, rest: number): HumanPose {
  // keyframes: 0 anticipation, 1 windup peak, 2 strike, 3 impact/smear, 4 follow-through, 5 recover
  const keys: Record<Family, { a: number; e: number; w: number }[]> = {
    blade: [
      { a: 0.2, e: 0.4, w: rest }, { a: 2.7, e: 0.2, w: -2.7 }, { a: 2.0, e: -0.1, w: -1.3 },
      { a: 1.2, e: -0.05, w: 0.35 }, { a: 0.75, e: 0.1, w: 0.95 }, { a: 0.35, e: 0.3, w: 0.4 },
    ],
    staff: [
      { a: 0.5, e: 0.75, w: rest }, { a: 2.5, e: 0.3, w: -2.4 }, { a: 1.9, e: 0, w: -1.1 },
      { a: 1.3, e: 0, w: 0.1 }, { a: 1.0, e: 0.2, w: 0.5 }, { a: 0.6, e: 0.6, w: -0.6 },
    ],
    bow: [
      { a: 0.35, e: 0.55, w: rest }, { a: 1.9, e: 0.2, w: -2.2 }, { a: 1.6, e: 0, w: -1.2 },
      { a: 1.2, e: 0, w: -0.2 }, { a: 0.9, e: 0.2, w: 0.2 }, { a: 0.5, e: 0.5, w: -0.8 },
    ],
    gun: [
      { a: 0.25, e: 0.5, w: rest }, { a: 1.6, e: 0.9, w: -1.9 }, { a: 1.5, e: 0.2, w: -0.6 },
      { a: 1.35, e: 0, w: 0.4 }, { a: 1.0, e: 0.2, w: 0.7 }, { a: 0.5, e: 0.4, w: 0.6 },
    ],
    short: [
      { a: 0.1, e: 0.55, w: rest }, { a: -0.3, e: 1.9, w: -0.2 }, { a: 1.35, e: 0.1, w: 0.05 },
      { a: 1.62, e: 0, w: 0.0 }, { a: 1.4, e: 0.2, w: 0.4 }, { a: 0.4, e: 0.5, w: 0.8 },
    ],
  };
  const k = keys[fam][Math.min(i, 5)];
  const prev = i > 0 ? keys[fam][Math.min(i - 1, 5)] : undefined;
  p.aF = [k.a, k.e];
  p.wA = k.w;
  const lunge = [0, -1.5, 1.5, 4.5, 4, 1.5][i] ?? 0;
  p.dx = lunge;
  p.lean = [0.05, -0.12, 0.12, 0.26, 0.22, 0.1][i] ?? 0;
  p.lF = [[0.15, 0.1, 0.45, 0.62, 0.55, 0.3][i] ?? 0.1, -0.1];
  p.lB = [[-0.15, -0.2, -0.35, -0.5, -0.45, -0.25][i] ?? -0.1, -0.05];
  p.aB = [[-0.2, 0.6, -0.4, -0.9, -0.8, -0.4][i] ?? -0.2, 0.4];
  p.eyes = i >= 1 && i <= 4 ? 'focus' : 'open';
  p.mouth = i === 3 ? 'grit' : i >= 1 && i <= 4 ? 'flat' : 'smile';
  p.sway = [0, -0.3, 0.4, 0.9, 0.8, 0.4][i] ?? 0;
  if (prev && (i === 2 || i === 3)) p.smear = [prev.w, k.w];
  void t; void n;
  return p;
}

/** Solves the back arm so the drawing hand lands exactly on the bow's nocked-string point
 *  (computed from the front hand + `p.wA` + the string pull the bow itself draws), instead of
 *  a hand-tuned angle that only approximately tracks it. 2-bone IK, elbow bent up and back. */
function solveBowDrawHand(p: HumanPose): void {
  const j = solve(p);
  const pull = p.draw * 9;
  const target: Pt = [j.haF[0] - pull * Math.cos(p.wA), j.haF[1] - pull * Math.sin(p.wA)];
  const l1 = BODY.upperArm, l2 = BODY.foreArm;
  const dx = target[0] - j.shB[0], dy = target[1] - j.shB[1];
  const d = clamp(Math.hypot(dx, dy), Math.abs(l1 - l2) + 0.5, l1 + l2 - 0.01);
  const baseA = Math.atan2(dx, dy);
  const angleE = Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1));
  const shoulderOffset = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const bend = 1; // elbow pokes up/back, away from the body — a natural archer's draw
  const ua = baseA + bend * shoulderOffset;
  const fa = ua + Math.PI - bend * angleE;
  p.aB = [ua - p.lean * 0.5, fa - ua];
}

function shootPose(p: HumanPose, t: number, i: number, n: number, fam: Family, rest: number): HumanPose {
  void t; void n;
  if (fam === 'bow') {
    // raise, draw, full draw, release, recover
    const drawAmt = [0.2, 0.7, 1, 0, 0][i] ?? 0;
    p.aF = [1.55, 0.02];
    p.wA = 0.02;
    p.draw = drawAmt;
    p.lean = i === 3 ? -0.08 : 0.02;
    p.dx = i === 3 ? -1 : 0;
    p.lF = [0.35, -0.05]; p.lB = [-0.3, 0];
    p.eyes = i >= 1 && i <= 2 ? 'focus' : 'open'; p.mouth = 'flat';
    p.sway = i === 3 ? 0.5 : 0.1;
    // raise/draw/full-draw: solve the back hand onto the string; release/recover: follow-through
    if (i <= 2) solveBowDrawHand(p);
    else p.aB = [1.35 + (1 - drawAmt) * 0.15, 0.3 + drawAmt * 1.25];
    return p;
  }
  if (fam === 'gun') {
    const kick = [0, 0, 1, 0.5, 0.1][i] ?? 0;
    p.aF = [1.5 + kick * 0.25, 0.02 - kick * 0.1];
    p.wA = -kick * 0.45;
    p.aB = [1.2, 0.5];
    p.lean = -kick * 0.12; p.dx = -kick * 1.8;
    p.lF = [0.3, -0.05]; p.lB = [-0.3, 0];
    p.eyes = 'focus'; p.mouth = kick > 0.8 ? 'grit' : 'flat';
    p.glow = kick > 0.8 ? 0.6 : 0;
    return p;
  }
  // everything else "shoots" by thrusting forward (throwing knives, wand bolts)
  const thrust = [0.1, 0.35, 1, 0.8, 0.3][i] ?? 0;
  p.aF = [lerp(0.2, 1.6, thrust), lerp(1.4, 0.0, thrust)];
  p.wA = lerp(rest - 1.2, 0.0, thrust);
  p.aB = [lerp(0.3, -0.7, thrust), 0.5];
  p.lean = lerp(-0.08, 0.2, thrust); p.dx = thrust * 2.5;
  p.lF = [0.2 + thrust * 0.35, -0.05]; p.lB = [-0.2 - thrust * 0.2, 0];
  p.eyes = thrust > 0.5 ? 'focus' : 'open'; p.mouth = thrust > 0.9 ? 'grit' : 'flat';
  if (fam === 'staff') p.glow = thrust > 0.9 ? 0.8 : thrust * 0.4;
  return p;
}

export { pulse, withAlpha };
