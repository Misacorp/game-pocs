/**
 * Illustrated weapons. Each draws in the hand frame: origin = grip center, +x = toward the tip.
 * `colors` are the equipped item's icon colors ([primary, secondary, accent]) or type defaults.
 */
import { WEAPONS } from '../humanoid';
import { shape, path, fill, stroke, glint, emissiveDab, glowHalo, shade, lightOf, type Pt } from '../pen';

export function weaponDefaultColors(type?: string): string[] {
  switch (type) {
    case 'sword': return ['#d4dbe4', '#6b5438', '#d9b25a'];
    case 'axe': return ['#bcc4ce', '#6b4a30', '#8a97a6'];
    case 'staff': return ['#7a5636', '#caa64a', '#8fe6ff'];
    case 'wand': return ['#8a6a4a', '#c86ad6', '#eaa6ff'];
    case 'bow': return ['#8a6238', '#e8dcb0', '#caa64a'];
    case 'gun': return ['#5a5a62', '#6b4a30', '#caa64a'];
    case 'dagger': return ['#d6dde3', '#6b5438', '#8a97a6'];
    case 'knives': return ['#d6dde3', '#3a3a40', '#8a97a6'];
    default: return ['#d4dbe4', '#6b5438', '#d9b25a'];
  }
}

function grip(g: CanvasRenderingContext2D, x0: number, x1: number, h: number, color: string): void {
  shape(g, path.rrect(x0, -h / 2, x1 - x0, h, h / 2), color, { depth: 1.2 });
  for (let x = x0 + 1.6; x < x1 - 0.8; x += 2) stroke(g, [[x, -h / 2 + 0.4], [x + 1, h / 2 - 0.4]], shade(color, -0.35), 0.7);
}

WEAPONS.sword = (r, [blade, hilt, guard]) => {
  const g = r.g;
  grip(g, -5, 3, 3.4, hilt);
  shape(g, path.circle(-6, 0, 2.2), guard, { depth: 1 });
  // crossguard
  shape(g, path.blob([[2.6, -6.4], [4.8, -5.4], [4.6, 5.4], [2.4, 6.4], [1.6, 0]], 0.3), guard, { depth: 1.2, light: lightOf(guard, 0.4) });
  // blade with a fuller
  const bladeP = path.poly([[4.6, -2.6], [29, -2.1], [34.5, 0], [29, 2.1], [4.6, 2.6]]);
  shape(g, bladeP, blade, { depth: 1.8, dir: [0, -1], light: '#ffffff', lightDepth: 0.9 });
  stroke(g, [[6.5, 0], [27, 0]], shade(blade, -0.25), 0.9);
  glint(g, 22, -1.2, 3, 0.6, 0, 0.7);
};

WEAPONS.axe = (r, [head, haft, trim]) => {
  const g = r.g;
  grip(g, -8, 20, 3.2, haft);
  const bit = path.blob([[14, -2], [19, -10.5], [25.5, -12], [27.5, -3], [26, 6.5], [20.5, 9.5], [15, 2.5]], 0.35);
  shape(g, bit, head, { depth: 2.2, light: '#ffffff', lightDepth: 0.8 });
  stroke(g, (gg) => { gg.moveTo(25.2, -10.4); gg.quadraticCurveTo(28.6, -2, 24.6, 7.6); }, lightOf(head, 0.6), 1);
  shape(g, path.rrect(13.5, -3.4, 5, 6.8, 1.4), trim, { depth: 1 });
  shape(g, path.poly([[20, -1.6], [23.5, 0], [20, 1.6]]), shade(head, -0.3), { shadow: false, lw: 0.8 });
};

WEAPONS.staff = (r, [wood, metal, orb]) => {
  const g = r.g;
  const pose = r.pose;
  shape(g, path.capsule(-16, 0, 1.6, 24, 0, 1.9), wood, { depth: 1.2 });
  stroke(g, [[-10, -0.4], [-4, 0.3], [2, -0.4], [9, 0.3]], shade(wood, -0.3), 0.7);
  // headpiece: curled prongs cradling the orb
  const prong = (s: number) => path.blob([[23, s * 1.2], [26.5, s * 5.2], [31.5, s * 6.2], [34.5, s * 3.6], [31.5, s * 3.6], [27.5, s * 2.2]], 0.45);
  shape(g, prong(1), metal, { depth: 1.2 });
  shape(g, prong(-1), metal, { depth: 1.2 });
  glowHalo(g, 30, 0, 9 + pose.glow * 6, orb, 0.35 + pose.glow * 0.4);
  shape(g, path.circle(30, 0, 4.4), orb, { shadow: shade(orb, -0.35), depth: 1.8, line: shade(orb, -0.6) });
  emissiveDab(g, 29.4, -0.6, 3.4, orb, { coreStop: 0.3 });
  glint(g, 28.6, -2, 1.3, 0.8, -0.5, 0.95);
  shape(g, path.rrect(21, -2.6, 3.6, 5.2, 1), metal, { depth: 1 });
  // hanging charm
  stroke(g, [[-11, 1], [-12.5, 5.5 - pose.sway * 1.5]], '#e8dcb0', 0.8);
  shape(g, path.poly([[-13.6, 5.2], [-11.4, 5.2], [-12.5, 8.5]]), metal, { depth: 0.8, lw: 0.8 });
};

WEAPONS.wand = (r, [wood, gem, glow]) => {
  const g = r.g;
  shape(g, path.capsule(-3.5, 0, 1.7, 13, 0, 1.1), wood, { depth: 1 });
  shape(g, path.rrect(-4, -2.2, 4, 4.4, 1.4), shade(wood, 0.15), { depth: 1 });
  glowHalo(g, 15, 0, 7 + r.pose.glow * 5, glow, 0.4);
  const star: Pt[] = [];
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const rr = k % 2 ? 1.6 : 3.8; star.push([15 + Math.cos(a) * rr, Math.sin(a) * rr]); }
  shape(g, path.poly(star), gem, { depth: 1, light: '#ffffff' });
  emissiveDab(g, 15, 0, 2.6, glow, { coreStop: 0.35 });
};

WEAPONS.bow = (r, [wood, string, wrap]) => {
  const g = r.g;
  const pull = r.pose.draw * 9;
  // limbs: recurve arc through the grip, spanning local y (the bow is held perpendicular to +x)
  const limb = (s: number) => path.blob([[0.5, s * 1.5], [3.6, s * 9], [2.4, s * 17.5], [-0.6, s * 21.5], [0.2, s * 22.4], [4.6, s * 17.8], [6.4, s * 9], [3, s * 1.2]], 0.4);
  // string first so the limbs overlap it
  stroke(g, [[-0.2, -21.6], [-pull, 0], [-0.2, 21.6]], string, 0.8);
  shape(g, limb(-1), wood, { depth: 1.4 });
  shape(g, limb(1), wood, { depth: 1.4 });
  shape(g, path.rrect(-1.6, -3.2, 5.6, 6.4, 1.8), wrap, { depth: 1 });
  if (r.pose.draw > 0.1) {
    // nocked arrow
    stroke(g, [[-pull, 0], [22, 0]], '#caa66a', 1.1);
    shape(g, path.poly([[21, -2.2], [26, 0], [21, 2.2]]), '#cfd6de', { depth: 0.8, lw: 0.8 });
    fill(g, path.poly([[-pull - 3, -2.4], [-pull + 2, 0], [-pull - 3, 2.4], [-pull - 1.5, 0]]), '#e8dcb0');
  }
};

WEAPONS.gun = (r, [metal, stock, brass]) => {
  const g = r.g;
  // stock back past the hand, barrel forward
  shape(g, path.blob([[-9, -1.5], [-2, -2.6], [0.5, 1], [-1.6, 6.5], [-5.4, 6.8], [-9.4, 2.4]], 0.35), stock, { depth: 1.4 });
  shape(g, path.rrect(-2.5, -4.2, 15, 5.4, 1.6), metal, { depth: 1.6, light: lightOf(metal, 0.4) });
  shape(g, path.rrect(11, -3.6, 9.5, 3.4, 1.2), shade(metal, -0.1), { depth: 1.2 });
  shape(g, path.rrect(19.2, -4.2, 2.6, 4.6, 1), brass, { depth: 0.8 });
  shape(g, path.circle(3, -1.5, 1.7), brass, { depth: 0.6, lw: 0.8 });
  stroke(g, [[-1, 1.2], [1, 3.4]], shade(metal, -0.4), 0.9);
  if (r.pose.glow > 0.4) emissiveDab(g, 25, -2, 6, '#ffd27a', { coreStop: 0.35 });
};

WEAPONS.dagger = (r, [blade, hilt, trim]) => {
  const g = r.g;
  grip(g, -4.5, 2, 3, hilt);
  shape(g, path.rrect(1.6, -4.2, 2.2, 8.4, 1.1), trim, { depth: 0.8 });
  shape(g, path.blob([[3.6, -2.1], [11, -2.6], [16.4, 0], [11, 1.7], [3.6, 2]], 0.2), blade, { depth: 1.4, dir: [0, -1], light: '#ffffff', lightDepth: 0.8 });
  glint(g, 10, -1, 2.2, 0.5, 0, 0.7);
};

WEAPONS.knives = (r, [blade, hilt, trim]) => {
  const g = r.g;
  // a fan of three throwing knives
  for (const [a, dy] of [[-0.28, -1.5], [0, 0], [0.28, 1.5]] as const) {
    g.save(); g.rotate(a); g.translate(0, dy * 0.3);
    shape(g, path.rrect(-3, -1.2, 4, 2.4, 1.2), hilt, { depth: 0.8, lw: 0.9 });
    shape(g, path.poly([[1, -1.6], [10.5, -0.6], [12.5, 0], [10.5, 0.6], [1, 1.6]]), blade, { depth: 1, dir: [0, -1], lw: 0.9 });
    g.restore();
  }
  shape(g, path.circle(-3.4, 0, 1.4), trim, { depth: 0.6, lw: 0.8 });
};
