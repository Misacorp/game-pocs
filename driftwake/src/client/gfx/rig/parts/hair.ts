/**
 * The six player hair styles (index = Appearance.hairStyle) in the illustrated style.
 * All in the head frame: origin head center, face toward +x, head radii BODY.headRx/headRy.
 * Hanging masses read pose.sway (trail toward -x) and pose.flutter (lift) for secondary motion.
 */
import { HAIR_STYLES, type HairColors, type Rig, hairShine } from '../humanoid';
import { shape, path, stroke, fill, type Pt } from '../pen';

/** Hair cap from nape around the crown to the forehead, then back along `fringe` to the temple. */
function capPath(fringe: Pt[], crown: Pt[] = DEFAULT_CROWN, tension = 0.42) {
  const pts: Pt[] = [
    [-14.5, 6.5], [-17.4, -1.5], ...crown, [17.2, -7.4],
    ...fringe,
    [-7.2, -3.4], [-9.4, 4.4],
  ];
  return path.blob(pts, tension);
}
const DEFAULT_CROWN: Pt[] = [[-13.8, -12.6], [-3, -18.2], [9.5, -16.2]];

function capWithShine(r: Rig, c: HairColors, fringe: Pt[], crown?: Pt[], tension?: number): void {
  const p = capPath(fringe, crown, tension);
  shape(r.g, p, c.base, { shadow: c.shadow, depth: 3, line: c.line });
  hairShine(r.g, c, -11.5, p);
}

function swayOf(r: Rig): { sx: number; fy: number } {
  return { sx: -r.pose.sway * 3.2, fy: -r.pose.flutter * 4 };
}

// 0: cropped
HAIR_STYLES.push({
  name: 'cropped',
  front(r, c) {
    const crown: Pt[] = [[-14, -11.5], [-3, -17], [9.5, -15.2]];
    capWithShine(r, c, [[16.8, -7.4], [11, -9.6], [4, -9.8], [-1.5, -9], [-5, -7.4]], crown, 0.45);
  },
});

// 1: spiky
HAIR_STYLES.push({
  name: 'spiky',
  front(r, c) {
    const { fy } = swayOf(r);
    const f = fy * 0.4;
    const crown: Pt[] = [
      [-16.5, -10], [-21, -14 + f], [-13.5, -15.5], [-12, -23 + f], [-5.5, -17.8], [-1, -25 + f],
      [3.4, -17.8], [9.6, -22.5 + f], [10.6, -15.5], [17.5, -15 + f], [15.8, -10],
    ];
    const fringe: Pt[] = [[18.8, -4.2], [13.2, -7.4], [12.2, -2.4], [8.6, -7.6], [6.2, -2.6], [3, -8.2], [0.4, -4], [-2.6, -8.2]];
    capWithShine(r, c, fringe, crown, 0.12);
  },
});

// 2: bob
HAIR_STYLES.push({
  name: 'bob',
  back(r, c) {
    const { sx, fy } = swayOf(r);
    shape(r.g, path.blob([[-12, -12], [-19, -5], [-19.6 + sx * 0.5, 7], [-15.5 + sx, 14.5 + fy * 0.3], [-7.5 + sx * 0.6, 13.5], [-4, 4]], 0.5), c.base, { shadow: c.shadow, depth: 3, line: c.line });
  },
  front(r, c) {
    const { sx, fy } = swayOf(r);
    capWithShine(r, c, [[17.8, -3.6], [13, -4.8], [9, -3.8], [4.6, -5], [0.4, -4.4], [-3.6, -6.2]], [[-14.4, -12.8], [-3, -18.8], [10, -16.6]]);
    // side lock framing the cheek (covers the ear)
    shape(r.g, path.blob([[-4.6, -6], [-1.8, 1.5], [-2.6 + sx * 0.4, 12 + fy * 0.2], [-6.8 + sx * 0.5, 13.5], [-9.6, 4]], 0.5), c.base, { shadow: c.shadow, depth: 2, line: c.line });
  },
});

// 3: ponytail
HAIR_STYLES.push({
  name: 'ponytail',
  back(r, c) {
    const { sx, fy } = swayOf(r);
    const tail: Pt[] = [[-14, -12], [-21 + sx * 0.4, -11 + fy * 0.4], [-26 + sx, -2 + fy], [-25.5 + sx * 1.4, 9 + fy * 0.8], [-21 + sx * 1.6, 17 + fy * 0.6], [-20 + sx, 8], [-18, -3], [-12.5, -6.5]];
    shape(r.g, path.blob(tail, 0.5), c.base, { shadow: c.shadow, depth: 3, line: c.line });
    stroke(r.g, [[-20 + sx * 0.3, -7], [-23.5 + sx, 3 + fy * 0.6], [-22.5 + sx * 1.4, 11]], c.shadow, 1);
  },
  front(r, c) {
    capWithShine(r, c, [[17.4, -6], [11, -9.6], [6, -5], [3, -8.2], [-0.8, -6.6], [-4.4, -7.4]]);
    // tie band
    shape(r.g, path.ellipse(-15.2, -9.6, 2.6, 3.2, 0.5), '#c9464e', { depth: 1.2 });
  },
});

// 4: long
HAIR_STYLES.push({
  name: 'long',
  back(r, c) {
    const { sx, fy } = swayOf(r);
    const mass: Pt[] = [[-10, -15], [-19, -6], [-20.5 + sx * 0.4, 8], [-19.5 + sx, 22 + fy * 0.5], [-14 + sx * 1.2, 30 + fy], [-8 + sx, 27 + fy * 0.7], [-5 + sx * 0.5, 16], [-2, 6], [4, -6]];
    shape(r.g, path.blob(mass, 0.5), c.base, { shadow: c.shadow, depth: 3.4, line: c.line });
    stroke(r.g, [[-15, -2], [-16 + sx * 0.6, 12], [-13 + sx, 24 + fy * 0.6]], c.shadow, 1.1);
  },
  front(r, c) {
    const { sx, fy } = swayOf(r);
    capWithShine(r, c, [[17.8, -4.2], [12.8, -7.8], [9.6, -3.4], [6, -8.4], [1.4, -5], [-3.2, -7]], [[-14.4, -12.8], [-2, -18.8], [10.4, -16.6]]);
    // a lock falling in front of the shoulder
    shape(r.g, path.blob([[-3.8, -6], [-0.6, 3], [0.2 + sx * 0.4, 16 + fy * 0.4], [-2.6 + sx * 0.6, 22 + fy * 0.6], [-6.4 + sx * 0.4, 14], [-8.8, 2]], 0.5), c.base, { shadow: c.shadow, depth: 2.2, line: c.line });
  },
});

// 5: mohawk
HAIR_STYLES.push({
  name: 'mohawk',
  front(r, c) {
    const { fy } = swayOf(r);
    // shaved sides: a stubble tone close to the skull
    const stubble = path.blob([[-14.5, 6], [-17.2, -2], [-13.2, -12.4], [-2, -16.8], [9.5, -15], [16.6, -7.6], [9, -8.6], [-4.6, -7.4], [-7.4, -3.2], [-9.4, 4.2]], 0.45);
    fill(r.g, stubble, c.shadow, 0.55);
    const crest: Pt[] = [[14.5, -11.5], [13.5, -18 + fy * 0.3], [6, -26 + fy * 0.5], [-4, -27 + fy * 0.6], [-13, -22 + fy * 0.4], [-18.5, -13], [-13, -12.4], [-4, -16.8], [7, -15]];
    shape(r.g, path.blob(crest, 0.45), c.base, { shadow: c.shadow, depth: 3, line: c.line });
    hairShine(r.g, c, -21, path.blob(crest, 0.45));
  },
});

