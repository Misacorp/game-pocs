/**
 * VANGUARD — the reference kit for the illustrated style. A stout little knight: rounded steel
 * cuirass, stacked pauldrons, an outfit-colored tabard with the Driftwake fluke emblem, and a
 * short cape that trails behind with secondary motion.
 */
import { registerOutfit, BODY, type Rig } from '../humanoid';
import { registerClassKit } from '../classKits';
import { shape, path, stroke, fill, glint, shade, lightOf, mix, clamp, type Pt } from '../pen';

/** Pauldron tilt from the upper-arm angle — clamped so an extreme attack windup (arm raised
 *  well past vertical) doesn't spin the shoulder plate up into the raised hand's space, where
 *  its similar steel tone would swallow the hand/weapon grip. */
function pauldronRot(ua: number): number { return clamp(-ua * 0.45, -0.55, 0.55); }

/** The brand's whale-fluke emblem, centered at (x,y), size s. */
export function fluke(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  const pts: Pt[] = [[0, 1.2], [-0.5, -0.2], [-2.2, -0.9], [-3, -0.2], [-1.6, 0.4], [-0.35, 1.6], [0, 2.6], [0.35, 1.6], [1.6, 0.4], [3, -0.2], [2.2, -0.9], [0.5, -0.2]];
  shape(g, path.blob(pts.map(([px, py]) => [x + px * s, y + py * s] as Pt), 0.3), color, { shadow: false, lw: 0.8 });
}

/** Tier-2 job accents (small, fixed-color identity marks, independent of the player's armor
 *  tint) — a riveted shield boss on the gorget for `bulwark`, jagged crimson spikes off both
 *  pauldrons plus a claw-slash streak across the cuirass for `reaver`. */
const BULWARK_TINT = '#c9d6de', REAVER_TINT = '#c93a3a';

function jobChestAccent(r: Rig): void {
  const { g, look } = r;
  if (look.job === 'bulwark') {
    const tint = BULWARK_TINT, dark = shade(tint, -0.55);
    r.torso(() => {
      const pts: Pt[] = [[0, -14.6], [3.4, -12.6], [3.4, -8], [0, -5.4], [-3.4, -8], [-3.4, -12.6]];
      shape(g, path.poly(pts), tint, { shadow: shade(tint, -0.2), line: dark, lw: 1.1 });
      stroke(g, [[0, -13.4], [0, -6.4]], dark, 0.9);
      fill(g, path.circle(0, -10, 0.8), dark);
    });
  } else if (look.job === 'reaver') {
    const tint = REAVER_TINT;
    r.torso(() => {
      stroke(g, [[-6.5, -15], [-1, -9], [5, -1]], tint, 1.6, 0.95);
      stroke(g, [[-5, -13.6], [0.4, -7.6], [6.2, 0.2]], shade(tint, -0.3), 0.8, 0.8);
    });
  }
}

function jobShoulderAccent(r: Rig, side: 'F' | 'B'): void {
  const { g, j, look } = r;
  if (look.job !== 'reaver') return;
  const back = side === 'B';
  const sh = back ? j.shB : j.shF;
  const ua = back ? j.ang.uaB : j.ang.uaF;
  const tint = back ? shade(REAVER_TINT, -0.16) : REAVER_TINT;
  g.save(); g.translate(sh[0], sh[1]); g.rotate(pauldronRot(ua));
  for (const s of [-1, 0, 1] as const) {
    shape(g, path.poly([[s * 2.6 - 1, 1.2], [s * 3.2, -4.4 - Math.abs(s) * 1.2], [s * 2.6 + 1, 1.2]]), tint, { depth: 0.8, lw: 0.9 });
  }
  g.restore();
}

registerOutfit('plate', {
  legs: 'pants',
  sleeves: 'fitted',
  back(r) {
    const { g, look, pose } = r;
    const cape = look.colors.acc;
    const sx = -pose.sway * 4, fy = -pose.flutter * 5;
    r.torso(() => {
      shape(g, path.blob([
        [-7, -BODY.torsoH], [2, -BODY.torsoH - 0.5], [-1.5, -6], [-5.5 + sx * 0.5, 6 + fy * 0.3],
        [-10 + sx, 12 + fy * 0.6], [-15 + sx * 1.2, 11 + fy], [-15.5 + sx * 0.8, 2 + fy * 0.5], [-12, -10],
      ], 0.45), shade(cape, -0.18), { depth: 3 });
      stroke(g, [[-9, -9], [-11 + sx * 0.6, 3 + fy * 0.4], [-12 + sx, 9 + fy * 0.6]], shade(cape, -0.4), 0.9);
    });
  },
  torso(r) {
    const { g, look, pose } = r;
    const c = look.colors;
    const steel = c.main;
    const sx = -pose.sway * 1.8;
    r.torso(() => {
      // faulds (hip plates)
      const faulds = path.blob([[-9.4, -6], [9.8, -6], [11.2, 3.8], [-10.8, 3.8]], 0.2);
      shape(g, faulds, shade(steel, -0.08), { depth: 2.4 });
      stroke(g, [[-10.2, -0.8], [10.6, -0.8]], shade(steel, -0.4), 0.9);
      // cuirass
      const cuirass = path.blob([[-9.8, -BODY.torsoH - 0.8], [9.6, -BODY.torsoH - 0.8], [11.2, -11], [9.2, -4.6], [-8.8, -4.6], [-10.8, -11]], 0.35);
      shape(g, cuirass, steel, { depth: 3.4, light: '#ffffff', lightDepth: 0.9 });
      stroke(g, (gg) => { gg.moveTo(4.4, -BODY.torsoH + 0.5); gg.quadraticCurveTo(6.2, -11, 4.8, -5.5); }, shade(steel, -0.35), 0.9);
      glint(g, -3.6, -13.2, 3.4, 1.5, -0.5, 0.5);
      // tabard: hangs from the belt and swings
      const tab = path.blob([[0.2, -9.5], [8.6, -9.5], [9.2 + sx, 7.5], [5.2 + sx * 1.2, 10], [1 + sx, 7.2]], 0.2);
      shape(g, tab, c.acc, { depth: 2.2, light: lightOf(c.acc, 0.2) });
      stroke(g, [[1.4 + sx * 0.4, -3], [1.8 + sx, 6.4]], c.trim, 0.9, 0.9);
      stroke(g, [[7.6 + sx * 0.4, -3], [8 + sx, 6.8]], c.trim, 0.9, 0.9);
      fluke(g, 4.8 + sx * 0.3, -1.6, 1.25, c.trim);
      // belt
      shape(g, path.rrect(-10, -7.4, 21, 3.4, 1.4), '#6b4a30', { depth: 1 });
      shape(g, path.rrect(4.4, -8.1, 4.4, 4.8, 1.1), c.trim, { depth: 0.9, light: '#fff3c0', lw: 0.9 });
      // gorget
      shape(g, path.blob([[-5.5, -BODY.torsoH - 1.6], [6.5, -BODY.torsoH - 1.6], [5.6, -BODY.torsoH + 1.8], [-4.8, -BODY.torsoH + 1.8]], 0.4), mix(steel, '#ffffff', 0.1), { depth: 1.2 });
    });
    jobChestAccent(r);
  },
  shoulder(r: Rig, side) {
    const { g, j, look } = r;
    const back = side === 'B';
    const sh = back ? j.shB : j.shF;
    const ua = back ? j.ang.uaB : j.ang.uaF;
    const steel = back ? shade(look.colors.main, -0.18) : look.colors.main;
    g.save(); g.translate(sh[0], sh[1]); g.rotate(pauldronRot(ua));
    shape(g, path.blob([[-6.6, 2.4], [-5.8, -3.2], [0, -5.4], [6, -3], [6.8, 2.6], [0, 1.4]], 0.45), steel, { depth: 2.2, light: back ? false : '#ffffff', lightDepth: 0.8 });
    shape(g, path.blob([[-6, 3.6], [0, 2.2], [6.2, 3.8], [5.4, 6.2], [0, 5], [-5.4, 6]], 0.45), shade(steel, -0.1), { depth: 1.4 });
    if (!back) fill(g, path.circle(0, -2.2, 0.9), look.colors.trim);
    g.restore();
    jobShoulderAccent(r, side);
  },
  cuff(r, side) {
    const { g, j, look } = r;
    const back = side === 'B';
    const el = back ? j.elB : j.elF, ha = back ? j.haB : j.haF;
    const steel = back ? shade(look.colors.main, -0.18) : look.colors.main;
    const mx = el[0] + (ha[0] - el[0]) * 0.55, my = el[1] + (ha[1] - el[1]) * 0.55;
    shape(g, path.capsule(mx, my, 3.4, ha[0] + (el[0] - ha[0]) * 0.1, ha[1] + (el[1] - ha[1]) * 0.1, 3.3), steel, { depth: 1.6 });
  },
  backView(r) {
    const { g, look, pose } = r;
    r.torso(() => {
      shape(g, path.rrect(-10.4, -BODY.torsoH - 1, 20.8, BODY.torsoH - 2, 5), look.colors.main, { depth: 3 });
      const sx = pose.sway * 1.5;
      shape(g, path.blob([[-9.5, -BODY.torsoH], [9.5, -BODY.torsoH], [11 + sx, 8], [0, 10.5], [-11 + sx, 8]], 0.3), shade(look.colors.acc, -0.1), { depth: 3 });
      fluke(g, 0, -6, 1.6, look.colors.trim);
    });
  },
});

registerClassKit('vanguard', {
  look(l, b) {
    const steel = b.armor ? mix(b.armor, '#b8c2cc', 0.35) : mix('#b3bdc8', b.outfit, 0.12);
    return {
      skin: l.appearance.skin, hair: l.appearance.hair, hairStyle: l.appearance.hairStyle, eyes: l.appearance.eyes,
      outfit: 'plate',
      colors: {
        main: steel, acc: b.outfit, trim: b.armorAcc ?? '#d9b25a',
        sleeve: shade(steel, -0.28), pants: '#4a3f52',
        boots: b.boots ?? mix('#8a94a2', steel, 0.3), gloves: b.gloves ?? '#7a5636',
      },
      headgear: b.helmet ? { id: 'helm', colors: [b.helmet, b.helmetAcc ?? '#d9b25a'] } : undefined,
      weapon: l.weaponType ? { type: l.weaponType, colors: b.weapon } : undefined,
      job: l.jobId,
      face: { brows: 'stern' },
    };
  },
  pose(p, clip) {
    // a planted, shield-wall stance
    if (clip === 'idle' || clip === 'crouch') { p.lF = [p.lF[0] + 0.12, p.lF[1]]; p.lB = [p.lB[0] - 0.08, p.lB[1]]; }
  },
});
