/**
 * WINDRUNNER — a fleet-footed scout: a fitted tunic/jerkin, a hood worn down on the shoulders
 * with its point trailing, a scarf whose tail streams behind, a fletched-arrow quiver on the
 * back, a belt pouch and forearm bracers. Bow or gun in hand.
 */
import { registerOutfit, BODY, type Rig } from '../humanoid';
import { registerClassKit } from '../classKits';
import { shape, path, stroke, fill, glint, local, shade, lightOf, mix, type Pt } from '../pen';

// ---------------------------------------------------------------------------
// tier-2 job accents: skyhunter (fletching tips + feather charm), sparkgunner (goggles)
// ---------------------------------------------------------------------------

const SKYHUNTER_TINT = '#e8dcb0', SPARKGUNNER_TINT = '#caa64a';

function jobBackAccent(r: Rig): void {
  const { g, look } = r;
  if (look.job !== 'skyhunter') return;
  r.torso(() => {
    for (let i = -1; i <= 1; i++) fill(g, path.rrect(-9.5 - i * 1.9 - 0.5, -21, 1, 2.6, 0.4), SKYHUNTER_TINT, 0.95);
  });
}

function jobCollarAccent(r: Rig): void {
  const { g, look } = r;
  if (look.job === 'skyhunter') {
    r.torso(() => {
      shape(g, path.poly([[-1, -BODY.torsoH - 0.6], [0, -BODY.torsoH - 4.4], [1, -BODY.torsoH - 0.6]]), SKYHUNTER_TINT, { shadow: false, lw: 0.8 });
    });
  } else if (look.job === 'sparkgunner') {
    const tint = SPARKGUNNER_TINT, dark = shade(tint, -0.55);
    r.headFrame(() => {
      const gy = -11.5;
      for (const s of [-1, 1] as const) {
        shape(g, path.circle(s * 6.4, gy, 3.4), dark, { depth: 1 });
        shape(g, path.circle(s * 6.4, gy, 2.1), tint, { shadow: shade(tint, -0.3), depth: 1, line: dark, lw: 0.8 });
        glint(g, s * 6.4 - 0.6, gy - 0.6, 0.7, 0.5, -0.4, 0.85);
      }
      fill(g, path.rrect(-2.2, gy - 0.9, 4.4, 1.8, 0.8), dark, 0.9);
    });
  }
}

// ---------------------------------------------------------------------------
// outfit: jerkin
// ---------------------------------------------------------------------------

registerOutfit('jerkin', {
  legs: 'pants',
  sleeves: 'fitted',
  back(r) {
    const { g, look, pose } = r;
    const c = look.colors;
    const sx = -pose.sway * 3.4, fy = -pose.flutter * 4.4;
    r.torso(() => {
      // quiver of fletched arrows, slung over the back (dorsal, -x) shoulder — shifted well
      // past the jerkin's own silhouette (torso left edge ~x=-9) so it isn't drawn over
      const quiver = path.blob([[-7, -13.5], [-12.5, -12], [-13.5, -2], [-11, 3], [-6, 1.5], [-5, -9.5]], 0.3);
      shape(g, quiver, shade(c.acc, -0.15), { depth: 2 });
      stroke(g, [[-7.2, -11.8], [-12, -10.6]], shade(c.acc, -0.4), 0.9);
      for (let i = -1; i <= 1; i++) {
        const bx = -9.5 - i * 1.9;
        stroke(g, [[bx, -12], [bx - i * 0.5, -21.5 - Math.max(0, i) * 0.4]], '#caa66a', 1);
        shape(g, path.poly([[bx - 1.2, -20.5], [bx, -23.6], [bx + 1.2, -20.5]]), i === 0 ? c.trim : shade(c.trim, -0.15), { shadow: false, lw: 0.7 });
      }
      // scarf tail, trailing well down past the hip with strong secondary motion (long enough
      // to clear the jerkin's own silhouette so it reads instead of being drawn over)
      const tail = path.blob([
        [-1.5, -14.5], [-6.5, -13], [-10 + sx * 0.5, -4 + fy * 0.2], [-13.5 + sx, 6 + fy * 0.5],
        [-14.5 + sx * 1.3, 14 + fy * 0.9], [-11 + sx * 0.9, 17 + fy * 1.1], [-7.5 + sx * 0.6, 10],
        [-6, 0], [-4, -8], [-2.4, -13],
      ], 0.4);
      shape(g, tail, c.acc, { depth: 2.2, light: lightOf(c.acc, 0.2) });
      stroke(g, [[-9 + sx * 0.5, -3], [-12.5 + sx, 7 + fy * 0.6], [-12 + sx * 0.9, 14 + fy * 0.9]], shade(c.acc, -0.35), 0.9, 0.85);
    });
    jobBackAccent(r);
  },
  torso(r) {
    const { g, look } = r;
    const c = look.colors;
    r.torso(() => {
      // fitted jerkin
      const body = path.blob([[-8, -BODY.torsoH - 0.6], [8.2, -BODY.torsoH - 0.6], [9.4, -8], [8.4, 3.4], [-8.6, 3.4], [-9.2, -8]], 0.28);
      shape(g, body, c.main, { depth: 2.8, light: lightOf(c.main, 0.18) });
      // open front placket
      stroke(g, [[0.4, -BODY.torsoH + 1], [0.6, 2.4]], shade(c.main, -0.32), 1);
      // belt + pouch
      shape(g, path.rrect(-9, -6, 18.4, 2.8, 1.2), '#6b4a30', { depth: 1 });
      shape(g, path.rrect(-6.6, -5.6, 4.4, 5, 1.2), shade(c.acc, -0.1), { depth: 1, lw: 0.9 });
      stroke(g, [[-4.4, -5.2], [-4.4, -1.4]], shade(c.acc, -0.3), 0.7);
      shape(g, path.rrect(3, -6.5, 3.6, 3.4, 1), c.trim, { depth: 0.8, light: '#fff3c0', lw: 0.8 });
    });
  },
  collar(r) {
    const { g, look, pose } = r;
    const c = look.colors;
    const hood = mix(c.acc, '#3a2a1a', 0.5); // a tanned-leather cloak tone, distinct from the jerkin
    const sx = -pose.sway * 2.2;
    r.torso(() => {
      // hood, worn down and draped across the shoulders/back, its point trailing
      shape(g, path.blob([[-7.6, -BODY.torsoH - 2.6], [7.8, -BODY.torsoH - 2.6], [6.4, -BODY.torsoH + 1.6], [-6.2, -BODY.torsoH + 1.6]], 0.3), hood, { depth: 1.6, light: lightOf(hood, 0.16) });
      shape(g, path.blob([[1, -BODY.torsoH - 1.4], [4.4 + sx * 0.4, -BODY.torsoH + 6 - sx], [2.2 + sx * 0.6, -BODY.torsoH + 9 - sx * 1.4], [-1, -BODY.torsoH + 2.4]], 0.4), shade(hood, -0.1), { depth: 1.4 });
      stroke(g, [[-6.6, -BODY.torsoH - 1.2], [6.8, -BODY.torsoH - 1.2]], c.trim, 0.7, 0.7);
      // scarf knot at the throat
      shape(g, path.poly([[-2.6, -BODY.torsoH - 0.4], [0, -BODY.torsoH + 2.2], [2.6, -BODY.torsoH - 0.4]]), c.acc, { depth: 1.2, light: lightOf(c.acc, 0.2) });
    });
    jobCollarAccent(r);
  },
  cuff(r, side) {
    const { g, j, look } = r;
    const back = side === 'B';
    const el = back ? j.elB : j.elF, ha = back ? j.haB : j.haF;
    const trim = back ? shade(look.colors.trim, -0.16) : look.colors.trim;
    const mx = el[0] + (ha[0] - el[0]) * 0.62, my = el[1] + (ha[1] - el[1]) * 0.62;
    shape(g, path.capsule(mx, my, 2.9, ha[0] + (el[0] - ha[0]) * 0.15, ha[1] + (el[1] - ha[1]) * 0.15, 2.7), trim, { depth: 1.4 });
  },
  backView(r) {
    const { g, look, pose } = r;
    const sx = pose.sway * 3, fy = -pose.flutter * 3.6;
    r.torso(() => {
      shape(g, path.rrect(-9.6, -BODY.torsoH - 1, 19.2, BODY.torsoH - 1, 5), look.colors.main, { depth: 3 });
      shape(g, path.blob([[3, -13], [8.4, -12], [9.4, -2.5], [6.8, 2], [2, 1], [1.4, -8.5]], 0.3), shade(look.colors.acc, -0.15), { depth: 2 });
      shape(g, path.blob([[-1.6, -14], [-6.4, -12.5], [-9.4 + sx * 0.5, -5 + fy * 0.3], [-11.6 + sx, 2 + fy * 0.6], [-6 + sx * 0.7, 0], [-3.6, -8]], 0.4), look.colors.acc, { depth: 2 });
    });
  },
});

// ---------------------------------------------------------------------------
// class kit
// ---------------------------------------------------------------------------

registerClassKit('windrunner', {
  look(l, b) {
    const main = b.armor ?? b.outfit;
    const acc = b.armorAcc ?? shade(mix(main, '#1e3a24', 0.3), -0.05);
    return {
      skin: l.appearance.skin, hair: l.appearance.hair, hairStyle: l.appearance.hairStyle, eyes: l.appearance.eyes,
      outfit: 'jerkin',
      colors: {
        main, acc, trim: b.armorAcc ?? '#caa64a',
        sleeve: shade(main, -0.12), pants: '#3a3226',
        boots: b.boots ?? shade(main, -0.3), gloves: b.gloves ?? shade(main, -0.06),
      },
      headgear: b.helmet ? { id: 'helm', colors: [b.helmet, b.helmetAcc ?? '#d9b25a'] } : undefined,
      weapon: l.weaponType ? { type: l.weaponType, colors: b.weapon } : undefined,
      job: l.jobId,
      face: { brows: 'soft' },
    };
  },
  pose(p, clip) {
    // light on the feet: a touch more bounce/lean than the default
    if (clip === 'walk') p.dy -= 0.3;
  },
});
