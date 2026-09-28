/**
 * VANGUARD — the reference kit for the illustrated style. A stout little knight: rounded steel
 * cuirass, stacked pauldrons, an outfit-colored tabard with the Driftwake fluke emblem, and a
 * short cape that trails behind with secondary motion.
 */
import { registerOutfit, BODY, type Rig } from '../humanoid';
import { shape, path, stroke, fill, glint, shade, lightOf, mix, type Pt } from '../pen';

/** The brand's whale-fluke emblem, centered at (x,y), size s. */
export function fluke(g: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  const pts: Pt[] = [[0, 1.2], [-0.5, -0.2], [-2.2, -0.9], [-3, -0.2], [-1.6, 0.4], [-0.35, 1.6], [0, 2.6], [0.35, 1.6], [1.6, 0.4], [3, -0.2], [2.2, -0.9], [0.5, -0.2]];
  shape(g, path.blob(pts.map(([px, py]) => [x + px * s, y + py * s] as Pt), 0.3), color, { shadow: false, lw: 0.8 });
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
  },
  shoulder(r: Rig, side) {
    const { g, j, look } = r;
    const back = side === 'B';
    const sh = back ? j.shB : j.shF;
    const ua = back ? j.ang.uaB : j.ang.uaF;
    const steel = back ? shade(look.colors.main, -0.18) : look.colors.main;
    g.save(); g.translate(sh[0], sh[1]); g.rotate(-ua * 0.45);
    shape(g, path.blob([[-6.6, 2.4], [-5.8, -3.2], [0, -5.4], [6, -3], [6.8, 2.6], [0, 1.4]], 0.45), steel, { depth: 2.2, light: back ? false : '#ffffff', lightDepth: 0.8 });
    shape(g, path.blob([[-6, 3.6], [0, 2.2], [6.2, 3.8], [5.4, 6.2], [0, 5], [-5.4, 6]], 0.45), shade(steel, -0.1), { depth: 1.4 });
    if (!back) fill(g, path.circle(0, -2.2, 0.9), look.colors.trim);
    g.restore();
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
