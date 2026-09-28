/**
 * Chibi pixel-art player characters. 32x40 frames, feet at the bottom of the frame.
 * Frames are pose-parameterized (single body renderer + per-anim pose tables) so every
 * class/job/weapon combination shares one code path.
 */
import Phaser from 'phaser';
import type { WeaponType, ClassId, JobId } from '@shared/types';
import {
  makeCanvas, ctx2d, rect, rrect, circle, ellipse, line, poly,
  registerSpriteSheet, ensureAnim, shade, hashStr, withAlpha,
} from './canvasKit';
import { CLASS_COLORS } from './palette';
import { outlineHued, coolShadow, warmHighlight, emissiveDab } from './shading';
import type { CharacterLook, SpriteInfo } from './spec';

const FW = 32, FH = 40, CX = 16;

interface Pose {
  headBob: number; crouch: number; chest: number; lying: boolean; climb: boolean;
  legFrontA: number; legBackA: number; legFrontL: number; legBackL: number;
  armFrontA: number; armBackA: number;
  weaponDeg: number; weaponHand: 'front' | 'back' | 'both';
  mouth: 'smile' | 'open' | 'flat' | 'x';
  glow?: boolean;
  /** vertical squash (0..1): >0 flattens the body a touch (hurt recoil). */
  squashY?: number;
  /** when set, the weapon swing frame also draws a fading motion arc from this start
   *  angle (deg) to the frame's weaponDeg — a 1-frame "smear" baked into the attack anim. */
  smearFrom?: number;
}

function basePose(): Pose {
  return {
    headBob: 0, crouch: 0, chest: 0, lying: false, climb: false,
    legFrontA: 0, legBackA: 0, legFrontL: 9, legBackL: 9,
    armFrontA: 5, armBackA: -5,
    weaponDeg: 100, weaponHand: 'front', mouth: 'smile',
  };
}

/** Fixed "elemental identity" tints per tier-2 job, so a specialization reads at a glance
 *  regardless of the player's chosen armor colors — layered on top of the tier-1 silhouette. */
const JOB_ACCENT: Partial<Record<JobId, string>> = {
  bulwark: '#c9d6de', reaver: '#c93a3a',
  tempest: '#ffe066', tidesinger: '#8fe0ff',
  skyhunter: '#e8dcb0', sparkgunner: '#caa64a',
  duskblade: '#d6dde3', hexslinger: '#b25be0',
};

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
      line(ctx, 8, -4.4, 13.6, -1.6, 0.6, shade(primary, 0.35)); // blade edge glint
      break;
    case 'staff':
      rect(ctx, 0, -1, 15, 2, secondary ?? '#7a5636');
      emissiveDab(ctx, 16, 0, 4.4, accent ?? primary, { coreStop: 0.26 }); // glowing orb — bloom pickup
      poly(ctx, [[2, 1], [1, 4], [3, 4]], shade(secondary ?? '#7a5636', -0.2)); // dangling cord/tassel
      break;
    case 'wand':
      rect(ctx, 0, -1, 8, 2, secondary ?? '#8a6a4a');
      emissiveDab(ctx, 9, 0, 3.2, accent ?? primary, { coreStop: 0.3 }); // glowing tip
      break;
    case 'bow':
      ctx.strokeStyle = primary; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(4, 0, 9, -1.15, 1.15); ctx.stroke();
      ctx.strokeStyle = secondary ?? '#e8dcb0'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(4 + Math.cos(-1.15) * 9, Math.sin(-1.15) * 9);
      ctx.lineTo(4 + Math.cos(1.15) * 9, Math.sin(1.15) * 9); ctx.stroke();
      circle(ctx, 4, 0, 0.9, accent ?? secondary ?? '#e8dcb0'); // grip wrap
      break;
    case 'gun':
      rect(ctx, 0, -2, 11, 4, primary);
      rect(ctx, 1, 2, 4, 6, secondary ?? '#6b4a30');
      rect(ctx, 9, -3, 2, 1, accent ?? '#caa64a');
      rect(ctx, 1, -1.6, 8, 0.6, shade(primary, 0.3)); // barrel glint
      break;
    case 'dagger':
      rect(ctx, -2, -1.5, 3, 3, secondary ?? '#6b5438');
      poly(ctx, [[1, -1.5], [8, -0.6], [9, 0], [8, 0.6], [1, 1.5]], primary);
      line(ctx, 2, -0.9, 7, -0.3, 0.4, shade(primary, 0.35));
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
      line(ctx, 2, -0.7, 11, -0.4, 0.5, shade(primary, 0.35)); // blade edge glint
      break;
  }
  ctx.restore();
}

/** Bakes a 1-frame motion arc (a fading fan of blade positions) into an attack peak frame,
 *  from `fromDeg` to `toDeg` — cheap "smear" that reads as a fast swing without extra frames. */
function drawSmear(ctx: CanvasRenderingContext2D, hx: number, hy: number, fromDeg: number, toDeg: number, len: number, color: string): void {
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const deg = fromDeg + (toDeg - fromDeg) * t;
    const rad = (deg * Math.PI) / 180;
    const ex = hx + Math.sin(rad) * len, ey = hy + Math.cos(rad) * len;
    ctx.save();
    ctx.strokeStyle = withAlpha(color, 0.05 + 0.15 * t * t);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.restore();
  }
}

function drawHair(ctx: CanvasRenderingContext2D, style: number, cx: number, cy: number, r: number, color: string): void {
  const dark = shade(color, -0.25);
  const light = shade(color, 0.28);
  switch (style % 6) {
    case 0: // buzz
      ellipse(ctx, cx, cy - r * 0.55, r * 0.96, r * 0.42, color);
      rect(ctx, cx - r * 0.5, cy - r * 0.72, r * 0.55, r * 0.16, light);
      break;
    case 1: // short & spiky
      ellipse(ctx, cx, cy - r * 0.5, r * 1.0, r * 0.55, color);
      for (let i = -2; i <= 2; i++) poly(ctx, [[cx + i * 2.6 - 1.4, cy - r * 0.55], [cx + i * 2.6, cy - r * 1.5], [cx + i * 2.6 + 1.4, cy - r * 0.55]], i === -1 ? light : color);
      break;
    case 2: // bob — top cap + side locks framing the face (never covers it)
      ellipse(ctx, cx, cy - r * 0.52, r * 1.02, r * 0.5, color);
      rect(ctx, cx - r * 1.05, cy - r * 0.35, r * 0.4, r * 1.15, color);
      rect(ctx, cx + r * 0.65, cy - r * 0.35, r * 0.4, r * 1.15, color);
      rect(ctx, cx - r * 0.35, cy - r * 0.78, r * 0.5, r * 0.14, light);
      break;
    case 3: // ponytail
      ellipse(ctx, cx, cy - r * 0.52, r * 0.98, r * 0.48, color);
      poly(ctx, [[cx + r * 0.7, cy - r * 0.3], [cx + r * 2.3, cy + r * 0.4], [cx + r * 1.9, cy + r * 1.6], [cx + r * 0.9, cy + r * 0.6]], dark);
      rect(ctx, cx - r * 0.3, cy - r * 0.76, r * 0.5, r * 0.14, light);
      break;
    case 4: // long flowing — top cap + long side strands past the shoulders
      ellipse(ctx, cx, cy - r * 0.52, r * 1.02, r * 0.5, color);
      rect(ctx, cx - r * 1.15, cy - r * 0.35, r * 0.5, r * 2.1, color);
      rect(ctx, cx + r * 0.65, cy - r * 0.35, r * 0.5, r * 2.1, color);
      rect(ctx, cx - r * 1.02, cy - r * 0.3, r * 0.16, r * 1.9, light);
      break;
    case 5: // mohawk
      ellipse(ctx, cx, cy - r * 0.5, r * 0.9, r * 0.4, shade(color, 0.15));
      for (let i = -1; i <= 1; i++) poly(ctx, [[cx + i * 2.4 - 1.6, cy - r * 0.5], [cx + i * 2.4, cy - r * 1.9], [cx + i * 2.4 + 1.6, cy - r * 0.5]], i === 0 ? light : color);
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

function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, eye: string, hair: string, mouth: Pose['mouth'], masked: boolean): void {
  if (masked) { rect(ctx, cx - r * 0.85, cy + r * 0.05, r * 1.7, r * 0.65, '#26232b'); }
  else {
    // soft brows hint at expression without adding extra frames
    const browY = cy - r * 0.32;
    line(ctx, cx - r * 0.56, browY, cx - r * 0.22, browY - r * 0.06, r * 0.16, shade(hair, -0.2));
    line(ctx, cx + r * 0.22, browY - r * 0.06, cx + r * 0.56, browY, r * 0.16, shade(hair, -0.2));
  }
  // eyes: 2px pupil + a clear 2-tone highlight for a lively, expressive read
  for (const dx of [-0.42, 0.42]) {
    const ex = cx + dx * r, ey = cy + r * 0.05;
    circle(ctx, ex, ey, 1.5, eye);
    circle(ctx, ex, ey, 0.9, '#12100f');
    circle(ctx, ex - 0.4, ey - 0.5, 0.55, '#ffffff');
  }
  if (masked) return;
  if (mouth === 'smile') { ctx.strokeStyle = '#7a3a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy + r * 0.45, r * 0.3, 0.2, Math.PI - 0.2); ctx.stroke(); }
  else if (mouth === 'open') circle(ctx, cx, cy + r * 0.55, 1.3, '#5a1f1f');
  else if (mouth === 'x') { line(ctx, cx - 1.4, cy + r * 0.45, cx + 1.4, cy + r * 0.75, 0.8, '#5a1f1f'); line(ctx, cx - 1.4, cy + r * 0.75, cx + 1.4, cy + r * 0.45, 0.8, '#5a1f1f'); }
  else rect(ctx, cx - 1.6, cy + r * 0.5, 3.2, 0.8, '#7a3a3a');
}

/** Small fixed-color hints layered over the tier-1 silhouette so a tier-2 specialization reads
 *  at a glance, independent of the player's own armor-color customization. */
function drawJobAccent(ctx: CanvasRenderingContext2D, jobId: JobId, cx: number, torsoTop: number, torsoBot: number, w: number): void {
  const tint = JOB_ACCENT[jobId];
  if (!tint) return;
  const dark = shade(tint, -0.55);
  switch (jobId) {
    case 'bulwark': { // bold riveted shield emblem on the chest, dark-rimmed for contrast
      const pts: [number, number][] = [[cx, torsoTop + 1.5], [cx + 2.8, torsoTop + 3], [cx + 2.8, torsoTop + 6.5], [cx, torsoTop + 9], [cx - 2.8, torsoTop + 6.5], [cx - 2.8, torsoTop + 3]];
      ctx.save(); ctx.strokeStyle = dark; ctx.lineWidth = 1; poly(ctx, pts, tint); ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.stroke(); ctx.restore();
      line(ctx, cx, torsoTop + 2.4, cx, torsoTop + 7.4, 0.6, dark);
      break;
    }
    case 'reaver': // jagged crimson spikes bristling off both pauldrons — reads as feral at a glance
      for (const s of [-1, 1]) poly(ctx, [[cx + s * w * 0.55, torsoTop], [cx + s * w * 0.85, torsoTop - 3.5], [cx + s * w * 0.65, torsoTop + 1.5]], tint);
      poly(ctx, [[cx - w * 0.35, torsoTop + 2], [cx - w * 0.05, torsoTop + 5], [cx + w * 0.35, torsoTop + 9], [cx + w * 0.2, torsoTop + 9.5], [cx - w * 0.15, torsoTop + 5.5]], tint); // claw-slash streak
      break;
    case 'tempest': { // a crackling bolt diagonally across the chest, dark-outlined so it pops on any armor color
      const pts: [number, number][] = [[cx - w * 0.35, torsoTop], [cx - w * 0.02, torsoTop + 2.5], [cx - w * 0.22, torsoTop + 3.3], [cx + w * 0.4, torsoTop + 8.5], [cx + w * 0.05, torsoTop + 5.6], [cx + w * 0.24, torsoTop + 4.6]];
      ctx.save(); ctx.strokeStyle = dark; ctx.lineWidth = 0.8; poly(ctx, pts, tint); ctx.beginPath(); ctx.moveTo(...pts[0]); for (const p of pts.slice(1)) ctx.lineTo(...p); ctx.closePath(); ctx.stroke(); ctx.restore();
      break;
    }
    case 'tidesinger': { // bright frost sigil at the collar
      circle(ctx, cx, torsoTop + 1.8, 2.1, tint);
      circle(ctx, cx, torsoTop + 1.8, 0.9, '#ffffff');
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; line(ctx, cx - Math.cos(a) * 3, torsoTop + 1.8 - Math.sin(a) * 3, cx + Math.cos(a) * 3, torsoTop + 1.8 + Math.sin(a) * 3, 0.6, tint); }
      break;
    }
    case 'skyhunter': // bright fletching tips on the quiver + a fine feather charm at the collar
      for (let i = -1; i <= 1; i++) rect(ctx, cx + w * 0.28 + i * 1.4 - 0.4, torsoTop - 5.5, 1.4, 2, tint);
      poly(ctx, [[cx - w * 0.15, torsoTop], [cx - w * 0.05, torsoTop - 3.2], [cx + w * 0.05, torsoTop]], tint);
      break;
    case 'sparkgunner': break; // goggles are drawn over the hair in drawBody (see drawHeadAccent), not here
    case 'duskblade': { // crossed twin blades emblem on the back, dark-outlined
      ctx.save(); ctx.strokeStyle = dark; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(cx - 3.2, torsoTop); ctx.lineTo(cx + 3.2, torsoTop + 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 3.2, torsoTop); ctx.lineTo(cx - 3.2, torsoTop + 7); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = tint; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(cx - 3.2, torsoTop); ctx.lineTo(cx + 3.2, torsoTop + 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 3.2, torsoTop); ctx.lineTo(cx - 3.2, torsoTop + 7); ctx.stroke();
      break;
    }
    case 'hexslinger': // a glowing violet rune ring with marks descending the chest
      ctx.save(); ctx.strokeStyle = tint; ctx.lineWidth = 0.9; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(cx, torsoTop + 2.6, 2.2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      circle(ctx, cx, torsoTop + 2.6, 0.9, tint);
      circle(ctx, cx, torsoTop + 6.5, 0.9, tint);
      break;
  }
}

function classSilhouette(ctx: CanvasRenderingContext2D, look: CharacterLook, c: Colors, cx: number, torsoTop: number, torsoBot: number, crouch: number, swayPhase = 0): void {
  const w = 11 - crouch * 1.5;
  const armor = c.armor, acc = c.armorAcc;
  // form-describing tone ramp: warm rim toward the top-left key light, cool hue-shifted
  // shadow on the trailing (right) edge — instead of one flat lighten-toward-white rim.
  const rim = warmHighlight(armor, 0.4);
  const shadowEdge = coolShadow(armor, 0.4);
  // secondary motion: cloth (scarf/robe hem/quiver) lags the current stride by trailing the
  // *opposite*-phase leg angle a touch, so it reads as trailing inertia rather than rigidly
  // following the torso — a cheap approximation of a one-frame animation lag.
  const trail = -swayPhase * 0.22;
  switch (look.classId) {
    case 'vanguard':
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, armor);
      rect(ctx, cx - w / 2, torsoTop, 1, torsoBot - torsoTop, rim); // rim light, left edge
      rect(ctx, cx + w / 2 - 1, torsoTop, 1, torsoBot - torsoTop, shadowEdge); // cool shadow, right edge
      rect(ctx, cx - 1.4, torsoTop + 2, 2.8, torsoBot - torsoTop - 3, acc); // tabard band
      rect(ctx, cx - w / 2 - 2, torsoTop, 3.4, 4, acc); rect(ctx, cx - w / 2 - 2, torsoTop, 3.4, 1.2, rim); // pauldron L (+ rim)
      rect(ctx, cx + w / 2 - 1.4, torsoTop, 3.4, 4, acc); rect(ctx, cx + w / 2 - 1.4, torsoTop, 3.4, 1.2, rim); // pauldron R (+ rim)
      rect(ctx, cx - w / 2 + 1, torsoTop + 4, w - 2, 1.5, shade(acc, -0.15)); // belt/plate seam
      break;
    case 'stormcaller':
      poly(ctx, [[cx - w * 0.5, torsoTop], [cx + w * 0.5, torsoTop], [cx + w * 0.85 + trail, torsoBot], [cx - w * 0.85 + trail, torsoBot]], armor);
      poly(ctx, [[cx - w * 0.5, torsoTop], [cx - w * 0.42, torsoTop], [cx - w * 0.72 + trail, torsoBot], [cx - w * 0.85 + trail, torsoBot]], rim); // robe fold rim light
      poly(ctx, [[cx + w * 0.42, torsoTop], [cx + w * 0.5, torsoTop], [cx + w * 0.85 + trail, torsoBot], [cx + w * 0.72 + trail, torsoBot]], shadowEdge); // robe fold shadow
      rect(ctx, cx - w / 2, torsoTop + 2, w, 1.4, acc);
      line(ctx, cx, torsoTop + 3, cx, torsoBot - 1, 1, shade(acc, -0.2)); // clasp trim
      break;
    case 'windrunner':
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, armor);
      rect(ctx, cx - w / 2, torsoTop, 1, torsoBot - torsoTop, rim);
      rect(ctx, cx + w / 2 - 1, torsoTop, 1, torsoBot - torsoTop, shadowEdge);
      poly(ctx, [[cx - w / 2 - 1, torsoTop - 1], [cx - 1, torsoTop - 4], [cx - 1 + trail, torsoTop + 1]], acc); // hood point back, trailing
      poly(ctx, [[cx - w * 0.3, torsoTop], [cx, torsoTop + 2], [cx + w * 0.3, torsoTop]], acc); // scarf knot at collar
      // quiver of fletched arrows peeking over the back shoulder
      for (let i = -1; i <= 1; i++) line(ctx, cx + w * 0.42 + i * 1.1, torsoTop + 1, cx + w * 0.55 + i * 1.4, torsoTop - 5, 0.9, i === 0 ? acc : shade(acc, -0.15));
      rect(ctx, cx + w * 0.3, torsoTop + 1, 3.2, 4, shade(acc, -0.3)); // quiver body
      rect(ctx, cx - w / 2 + 1, torsoBot - 2, w - 2, 1.4, acc); // belt
      break;
    case 'shade':
    default:
      rrect(ctx, cx - w / 2, torsoTop, w, torsoBot - torsoTop, 2, armor);
      rect(ctx, cx - w / 2, torsoTop, 1, torsoBot - torsoTop, rim);
      rect(ctx, cx + w / 2 - 1, torsoTop, 1, torsoBot - torsoTop, shadowEdge);
      // long scarf, trailing well past the hips — its tail lags the stride for secondary motion
      poly(ctx, [[cx - w / 2, torsoTop + 1], [cx + w / 2 + 2, torsoTop + 3], [cx + w / 2 + 4 + trail, torsoBot + 6], [cx + w / 2 - 2 + trail, torsoBot + 7], [cx + w / 2 - 3, torsoTop + 6], [cx + w / 2 - 1, torsoTop + 5]], acc);
      break;
  }
  drawJobAccent(ctx, look.jobId, cx, torsoTop, torsoBot, w);
}

function drawBody(ctx: CanvasRenderingContext2D, look: CharacterLook, c: Colors, pose: Pose): void {
  const cx = CX;
  const crouchOff = pose.crouch * 3;
  const headCy = 12 + pose.headBob + crouchOff;
  const torsoTop = 18 + crouchOff * 0.6;
  const torsoBot = 29 + crouchOff + pose.chest * 0.5;
  const hipY = torsoBot;
  const shoulderY = torsoTop + 1.5;
  const r = 7.2;
  const skinArm = look.classId === 'vanguard' ? c.armor : c.gloves;

  // back leg + arm (drawn first, behind torso)
  limb(ctx, cx - 3, hipY, pose.legBackA, pose.legBackL, 3.2, c.boots, c.boots);
  limb(ctx, cx - 4.2, shoulderY, pose.armBackA, 8.6, 2.6, c.outfit === c.armor ? c.armor : c.armor, c.gloves);

  classSilhouette(ctx, look, c, cx, torsoTop, torsoBot, pose.crouch, pose.legFrontA);

  // front leg
  const [footX, footY] = limb(ctx, cx + 3, hipY, pose.legFrontA, pose.legFrontL, 3.2, c.boots, c.boots);
  rect(ctx, footX - 2.4, footY - 1, 4.8, 2.2, shade(c.boots, -0.2));

  // head
  circle(ctx, cx, headCy, r, c.skin);
  circle(ctx, cx - r * 0.4, headCy - r * 0.45, r * 0.32, shade(c.skin, 0.22)); // soft cheek/rim highlight
  const masked = look.classId === 'shade';
  drawFace(ctx, cx, headCy, r, c.eye, c.hair, pose.mouth, masked);
  drawHair(ctx, look.appearance.hairStyle, cx, headCy, r, c.hair);
  if (c.helmet) ellipse(ctx, cx, headCy - r * 0.6, r * 1.05, r * 0.5, c.helmet);
  if (look.classId === 'stormcaller') {
    // pointed hat with a brim, worn over the hair
    poly(ctx, [[cx - r * 0.9, headCy - r * 0.7], [cx, headCy - r * 2.3], [cx + r * 0.9, headCy - r * 0.7]], c.armor);
    ellipse(ctx, cx, headCy - r * 0.68, r * 1.15, r * 0.3, shade(c.armor, -0.1)); // brim
    circle(ctx, cx, headCy - r * 1.5, r * 0.18, c.armorAcc); // hat band jewel
  }
  if (look.jobId === 'sparkgunner') { // brass goggles pushed up on the forehead, drawn over the hair so they read clearly
    const tint = JOB_ACCENT.sparkgunner!, dark = shade(tint, -0.55), gy = headCy - r * 0.62;
    for (const s of [-1, 1]) { circle(ctx, cx + s * r * 0.42, gy, r * 0.26, dark); circle(ctx, cx + s * r * 0.42, gy, r * 0.16, tint); circle(ctx, cx + s * r * 0.42 - 0.4, gy - 0.4, 0.5, '#ffffff'); }
    line(ctx, cx - r * 0.16, gy, cx + r * 0.16, gy, 1, dark); // bridge
  }

  // front arm + weapon
  const [handX, handY] = limb(ctx, cx + 4.2, shoulderY, pose.armFrontA, 8.6, 2.6, c.armor, c.gloves);
  if (pose.weaponHand !== 'back') {
    if (pose.smearFrom !== undefined) drawSmear(ctx, handX, handY, pose.smearFrom, pose.weaponDeg, 13, c.weapon[0] ?? '#ffffff');
    drawWeapon(ctx, handX, handY, look.weaponType, c.weapon, pose.weaponDeg);
  }
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
    classSilhouette(ctx, look, c, CX, 18, 29, 0, pose.legFrontA);
    limb(ctx, CX - 4, 19, pose.armBackA, 8, 2.6, c.armor, c.gloves);
    limb(ctx, CX + 4, 19, pose.armFrontA, 8, 2.6, c.armor, c.gloves);
    limb(ctx, CX - 3, 29, pose.legBackA, 9, 3.2, c.boots, c.boots);
    limb(ctx, CX + 3, 29, pose.legFrontA, 9, 3.2, c.boots, c.boots);
    ctx.restore();
  } else if (pose.squashY) {
    // hurt recoil: a brief, bloom-friendly-safe squash (no glow), anchored at the feet
    ctx.save();
    const sq = pose.squashY;
    ctx.translate(CX, FH); ctx.scale(1 + sq * 0.1, 1 - sq * 0.14); ctx.translate(-CX, -FH);
    drawBody(ctx, look, c, pose);
    ctx.restore();
  } else {
    drawBody(ctx, look, c, pose);
  }
  return outlineHued(art);
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
    // idle: slow 4-frame breathing cycle (chest rise + a hair's-breadth head bob) reads as alive at a standstill
    { name: 'idle', frameRate: 3, repeat: -1, poses: [0, 1, 2, 1].map((b) => ({ ...p(), headBob: b * 0.4, chest: b * 0.5, armBackA: -6 + b * 0.6, armFrontA: 6 - b * 0.6, weaponDeg: 100 })) },
    {
      name: 'walk', frameRate: 10, repeat: -1,
      poses: [-30, -12, 10, 30, 12, -10].map((a, i, arr) => ({
        ...p(), legFrontA: a, legBackA: -a, armFrontA: -a * 0.6, armBackA: a * 0.6,
        headBob: Math.sin((i / arr.length) * Math.PI * 2) * 0.8, // smooth continuous bounce, not a 2-step toggle
        chest: Math.abs(a) < 15 ? 0.4 : 0, weaponDeg: 100,
      })),
    },
    { name: 'jump', frameRate: 1, repeat: -1, poses: [{ ...p(), legFrontA: 18, legBackA: -14, armFrontA: -70, armBackA: -50, weaponDeg: 90 }] },
    { name: 'fall', frameRate: 1, repeat: -1, poses: [{ ...p(), legFrontA: -8, legBackA: 12, armFrontA: -40, armBackA: -20, weaponDeg: 100 }] },
    { name: 'crouch', frameRate: 1, repeat: -1, poses: [{ ...p(), crouch: 1, legFrontA: 12, legBackA: -12, armFrontA: 20, armBackA: -20, weaponDeg: 110 }] },
    {
      name: 'attack', frameRate: 11, repeat: 0,
      poses: swing.map((deg, i) => ({ ...p(), legFrontA: 14 - i * 6, legBackA: -10 + i * 4, armFrontA: deg * 0.35, weaponDeg: deg, mouth: i === 1 ? 'open' : 'flat' as const, smearFrom: i > 0 ? swing[i - 1] : undefined })),
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
    { name: 'hurt', frameRate: 8, repeat: 0, poses: [{ ...p(), headBob: -1, armFrontA: -30, armBackA: 30, legFrontA: -10, legBackA: 10, mouth: 'x' as const, squashY: 0.8 }] },
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
