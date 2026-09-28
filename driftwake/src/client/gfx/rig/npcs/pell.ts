/**
 * OLD PELL — the retired whalewatcher: a stooped elder in a weathered sea-coat, a big white
 * beard, a knit watch cap and a whalebone cane he leans on. A gentle idle: breathing, a slow
 * nod, and a soft cane tap.
 */
import { registerNpcKit } from '../npcs';
import { registerOutfit, registerHeadgear, BODY, type Rig } from '../humanoid';
import { shape, fill, stroke, path, local, glint, shade, lightOf, mix, TAU } from '../pen';

registerOutfit('pell_coat', {
  legs: 'robe',
  sleeves: 'fitted',
  torso(r: Rig) {
    const { g, look } = r;
    const c = look.colors;
    r.torso(() => {
      // long double-breasted coat body
      shape(g, path.blob([
        [-9.6, -BODY.torsoH - 0.6], [9.4, -BODY.torsoH - 0.6], [11, -9], [10.2, 4],
        [-10.6, 4], [-11.4, -9],
      ], 0.3), c.main, { depth: 3.2, light: lightOf(c.main, 0.18) });
      // lapel/collar flaps
      shape(g, path.blob([[-1, -BODY.torsoH - 1], [-7.6, -9], [-4.4, -1], [-0.6, -8]], 0.25), shade(c.main, -0.12), { depth: 1.4, line: shade(c.main, -0.4) });
      shape(g, path.blob([[1, -BODY.torsoH - 1], [7.6, -9], [4.4, -1], [0.6, -8]], 0.25), shade(c.main, -0.12), { depth: 1.4, line: shade(c.main, -0.4) });
      // brass buttons down the middle
      for (const by of [-11.5, -7, -2.5, 2]) fill(g, path.circle(0.4, by, 0.8), c.trim, 0.95);
      // belt / rope tie
      shape(g, path.rrect(-10.4, -6.4, 20.8, 2.4, 1), shade(c.acc, -0.15), { depth: 0.8 });
    });
  },
  overLegs(r: Rig) {
    const { g, look, pose } = r;
    const c = look.colors;
    const sx = -pose.sway * 2;
    r.torso(() => {
      // the coat's long hem, swaying gently past the knee
      shape(g, path.blob([
        [-10.8, 3], [10.4, 3], [11.6 + sx * 0.4, 15], [6 + sx, 19], [0, 16], [-6 + sx, 19], [-11.8 + sx * 0.4, 15],
      ], 0.3), shade(c.main, -0.08), { depth: 2.6, line: shade(c.main, -0.42) });
      stroke(g, [[0, 3.5], [0, 15.5]], shade(c.main, -0.35), 0.9, 0.7);
    });
  },
  cuff(r: Rig, side) {
    const { g, j, look } = r;
    const back = side === 'B';
    const el = back ? j.elB : j.elF, ha = back ? j.haB : j.haF;
    const c = back ? shade(look.colors.acc, -0.15) : look.colors.acc;
    const mx = el[0] + (ha[0] - el[0]) * 0.6, my = el[1] + (ha[1] - el[1]) * 0.6;
    shape(g, path.capsule(mx, my, 2.6, ha[0] + (el[0] - ha[0]) * 0.05, ha[1] + (el[1] - ha[1]) * 0.05, 2.5), c, { depth: 1.2 });
  },
  /** The big bushy white beard, drawn over the lower face once the head is in place. */
  collar(r: Rig) {
    const { g, look } = r;
    const beard = look.hair;
    const beardShadow = shade(beard, -0.16);
    const beardInk = mix(shade(beard, -0.35), '#241d18', 0.3);
    r.headFrame(() => {
      shape(g, path.blob([
        [-9.4, 6.4], [-10.6, 10.8], [-7, 16.2], [-2.4, 20], [2, 21.6], [6.4, 19.4], [10, 15],
        [11.2, 10.4], [10, 6.4], [6, 8.8], [0, 9.8], [-6, 8.6],
      ], 0.42), beard, { depth: 2.8, shadow: beardShadow, line: beardInk });
      // a little moustache tuft above the mouth
      fill(g, path.blob([[3.4, 6.2], [7.2, 5.8], [9, 8], [5.2, 9], [1.6, 8.2]], 0.4), shade(beard, -0.08), 0.95);
      stroke(g, [[-4, 11], [-1.5, 16.2]], beardShadow, 0.8, 0.55);
      stroke(g, [[8, 11], [6, 16.5]], beardShadow, 0.8, 0.55);
    });
  },
});

/** Snug knit watch cap: ribbed brim + a little fold, warm wool tone from the accent color. */
registerHeadgear('pell_cap', {
  hides: 'all',
  front(r: Rig) {
    const { g, look } = r;
    const [wool, rib] = look.headgear?.colors ?? ['#c9a45a', '#8a6a34'];
    r.headFrame(() => {
      const dome = path.blob([
        [-16.8, -6], [-16.2, -16], [-8.4, -25.4], [0, -27.4], [8.8, -25.2], [16.4, -15.8], [16.8, -6.5],
      ], 0.4);
      shape(g, dome, wool, { depth: 3, light: lightOf(wool, 0.25) });
      shape(g, path.blob([[-17, -10], [17, -10], [17.4, -5.4], [-17.4, -5.4]], 0.2), rib, { depth: 1.2 });
      for (let rx = -13; rx <= 13; rx += 5.2) stroke(g, [[rx, -10.4], [rx, -5.6]], shade(rib, -0.25), 0.8, 0.6);
      // little folded flop at the crown
      shape(g, path.blob([[6, -24], [13.4, -20.5], [10, -15.4], [3.6, -19]], 0.4), shade(wool, -0.1), { depth: 1 });
      glint(g, -7, -21, 2.4, 1.2, -0.4, 0.5);
    });
  },
});

const PELL_EYE = '#7c8f92';

registerNpcKit('npc_pell', {
  look(def) {
    const p = def.sprite.palette;
    const acc = p.accent ?? '#c9a45a';
    return {
      skin: p.skin,
      hair: p.hair,
      hairStyle: 0,
      eyes: PELL_EYE,
      outfit: 'pell_coat',
      colors: {
        main: p.outfit,
        acc,
        trim: shade(acc, -0.1),
        sleeve: shade(p.outfit, -0.05),
        pants: shade(p.outfit, -0.28),
        boots: '#4a3626',
        gloves: p.skin,
      },
      headgear: { id: 'pell_cap', colors: [acc, shade(acc, -0.35)] },
      extras: { beard: true },
      build: { stoop: 0.6 },
      face: { brows: 'bushy', eyeShape: 'sleepy', age: 1 },
    };
  },
  pose(p, t) {
    const ph = t * TAU;
    // a slow, kindly nod on top of the shared idle breathing
    p.head += Math.sin(ph * 0.5) * 0.05;
    p.headDy = Math.sin(ph * 0.5) * 0.4;
    p.mouth = 'smile';
    p.eyes = p.eyes === 'closed' ? 'closed' : 'happy';
  },
  props(g, _def, p, t) {
    // a whalebone cane he leans on, planted beside the front foot with a soft tap once per loop
    const tap = Math.max(0, Math.sin(t * TAU - 0.6)) * 1;
    const baseX = 17, baseY = -0.4;
    const topX = baseX - 1, topY = -24 + tap * 0.3;
    const bone = '#ece2c8', boneShadow = shade(bone, -0.2);
    local(g, 0, -tap * 0.4, 0, () => {
      shape(g, path.capsule(baseX, baseY, 1.15, topX, topY, 0.9), bone, { depth: 1, shadow: boneShadow });
      // curved shepherd's-hook handle at the top, drawn as a thin open stroked line (not a filled blob)
      stroke(g, (gg) => {
        gg.moveTo(topX, topY);
        gg.quadraticCurveTo(topX - 3, topY - 1, topX - 2.6, topY - 3.4);
        gg.quadraticCurveTo(topX - 2.2, topY - 5.2, topX + 0.5, topY - 4.2);
      }, bone, 1.5);
      fill(g, path.ellipse(baseX, baseY + 0.4, 1.4, 0.7, 0), '#3a3226', 0.85);
    });
  },
});
