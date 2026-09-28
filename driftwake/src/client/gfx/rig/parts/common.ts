/**
 * Shared garments + headgear used by several kits: the generic 'tunic' fallback outfit and the
 * equipment 'helm' (drawn whenever a helmet is equipped on a class without signature headgear).
 */
import { registerOutfit, registerHeadgear, BODY, type Rig } from '../humanoid';
import { shape, path, stroke, fill, shade, lightOf, glint, type Pt } from '../pen';

/** Plain belted tunic — the fallback for any kit without its own outfit. */
registerOutfit('tunic', {
  torso(r) {
    const { g, look } = r;
    const c = look.colors;
    r.torso(() => {
      shape(g, path.blob([[-8.6, -BODY.torsoH - 0.5], [8.8, -BODY.torsoH - 0.5], [10, -8], [10.8, 3.5], [-10.4, 3.5], [-9.8, -8]], 0.25), c.main, { depth: 3, light: lightOf(c.main, 0.2) });
      shape(g, path.rrect(-10, -5.5, 20.6, 3.2, 1.4), c.acc, { depth: 1 });
      shape(g, path.rrect(2.4, -6.1, 4.2, 4.4, 1), c.trim, { depth: 0.8, lw: 0.9 });
      stroke(g, [[3.5, -BODY.torsoH + 1], [4.2, -7]], shade(c.main, -0.3), 0.9);
    });
  },
});

/** Generic equipped helmet: a rounded half-helm with a brow band and a little crest. */
registerHeadgear('helm', {
  hides: 'top',
  front(r: Rig) {
    const { g } = r;
    const [base, trim] = [r.look.headgear?.colors[0] ?? '#9aa6b4', r.look.headgear?.colors[1] ?? '#d9b25a'];
    r.headFrame(() => {
      const dome: Pt[] = [[-17.6, 1.5], [-16.6, -10], [-6, -19.4], [8, -18.2], [17.4, -8.6], [17.8, -4.2], [-8, -4.8], [-11, 1.8]];
      shape(g, path.blob(dome, 0.42), base, { depth: 3, light: lightOf(base, 0.35) });
      shape(g, path.blob([[-17.6, -2.4], [17.8, -6.6], [18.2, -3.4], [-17.2, 1.4]], 0.2), trim, { depth: 1 });
      stroke(g, [[1, -18.8], [2, -5.4]], shade(base, -0.3), 1);
      glint(g, -6, -14, 3.2, 1.4, -0.4, 0.55);
      // crest
      shape(g, path.blob([[-2, -19], [-8, -25.5 - r.pose.flutter * 2], [-14 - r.pose.sway * 2, -24], [-9, -18]], 0.5), trim, { depth: 1.4 });
      void fill;
    });
  },
});
