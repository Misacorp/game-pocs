/**
 * 16x16-native pixel icon renderers for every IconShape and SkillIconShape.
 * Shared by DOM icon URLs (icons.ts) and world drop textures (gather.ts).
 */
import type { IconShape, SkillIconShape } from '@shared/types';
import { rect, rrect, circle, ellipse, line, poly, shade } from './canvasKit';
import { emissiveDab } from './shading';

const S = 16;

function gem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, c1: string, c2: string): void {
  poly(ctx, [[cx, cy - r], [cx + r, cy - r * 0.2], [cx + r * 0.6, cy + r], [cx - r * 0.6, cy + r], [cx - r, cy - r * 0.2]], c1);
  poly(ctx, [[cx, cy - r], [cx + r, cy - r * 0.2], [cx, cy + r * 0.1]], c2);
}
function bottle(ctx: CanvasRenderingContext2D, liquid: string, glass = '#dfeaf0'): void {
  rect(ctx, 6, 2, 4, 2, '#6b5438');
  rrect(ctx, 4, 4, 8, 10, 2, glass);
  rrect(ctx, 5, 7, 6, 6, 1, liquid);
  rect(ctx, 6, 5, 2, 1, 'rgba(255,255,255,0.6)');
}
function sack(ctx: CanvasRenderingContext2D, color: string): void {
  poly(ctx, [[4, 6], [12, 6], [13, 14], [3, 14]], color);
  rect(ctx, 5, 3, 6, 3, shade(color, -0.2));
  line(ctx, 6, 4, 10, 4, 1, shade(color, -0.4));
}

export function drawItemIcon(ctx: CanvasRenderingContext2D, shape: IconShape, colors: string[]): void {
  const [c1 = '#cccccc', c2 = shade(c1, -0.3), c3 = shade(c1, 0.3)] = colors;
  switch (shape) {
    case 'sword': rect(ctx, 7, 2, 2, 3, c2); rect(ctx, 5, 5, 6, 1, c3); rect(ctx, 7, 6, 2, 8, c1); poly(ctx, [[7, 14], [9, 14], [8, 16]], c1); break;
    case 'axe': rect(ctx, 7, 6, 2, 9, c2); poly(ctx, [[8, 2], [14, 3], [15, 6], [13, 9], [8, 8]], c1); poly(ctx, [[8, 2], [14, 3], [8, 5]], shade(c1, 0.25)); break;
    case 'staff': rect(ctx, 7, 4, 2, 11, c2); circle(ctx, 8, 3, 3, c3); circle(ctx, 8, 3, 1.4, '#fff'); break;
    case 'wand': rect(ctx, 7, 7, 2, 8, c2); circle(ctx, 8, 5, 2.6, c1); break;
    case 'bow': ctx.strokeStyle = c1; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(6, 8, 6.5, -0.9, 0.9); ctx.stroke(); ctx.strokeStyle = c3; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(6 + Math.cos(-0.9) * 6.5, 8 + Math.sin(-0.9) * 6.5); ctx.lineTo(6 + Math.cos(0.9) * 6.5, 8 + Math.sin(0.9) * 6.5); ctx.stroke(); break;
    case 'gun': rect(ctx, 3, 6, 10, 3, c1); rect(ctx, 4, 9, 3, 5, c2); rect(ctx, 12, 6, 2, 1.4, c3); break;
    case 'dagger': rect(ctx, 6, 3, 3, 3, c2); poly(ctx, [[7, 6], [9, 6], [8.5, 14], [7.5, 14]], c1); break;
    case 'knives': rect(ctx, 3.4, 3, 1.6, 3, c2); poly(ctx, [[4.2, 6], [7.5, 9.5], [4.2, 13]], c1); rect(ctx, 11, 3, 1.6, 3, c2); poly(ctx, [[11.8, 6], [8.5, 9.5], [11.8, 13]], c3); break;
    case 'helmet': poly(ctx, [[4, 9], [4, 6], [8, 3], [12, 6], [12, 9]], c1); rect(ctx, 4, 9, 8, 2, c2); rect(ctx, 6, 9, 4, 2, '#2a241f'); break;
    case 'armor': poly(ctx, [[5, 4], [11, 4], [12, 7], [11, 13], [5, 13], [4, 7]], c1); rect(ctx, 5, 6, 6, 1.4, c3); break;
    case 'gloves': ellipse(ctx, 8, 9, 4, 5, c1); for (let i = 0; i < 3; i++) rect(ctx, 5 + i * 2, 3, 1.4, 4, c1); break;
    case 'boots': rect(ctx, 5, 3, 4, 7, c1); poly(ctx, [[5, 10], [11, 10], [12, 13], [4, 13]], c2); break;
    case 'ring': circle(ctx, 8, 9, 4, c2); circle(ctx, 8, 9, 2, '#0000'); ctx.globalCompositeOperation = 'destination-out'; circle(ctx, 8, 9, 2, '#fff'); ctx.globalCompositeOperation = 'source-over'; circle(ctx, 8, 5, 1.6, c1); break;
    case 'amulet': circle(ctx, 8, 10, 3, c1); line(ctx, 6, 4, 8, 7, 1, c2); line(ctx, 10, 4, 8, 7, 1, c2); circle(ctx, 8, 10, 1.3, c3); break;
    case 'potion': bottle(ctx, c1); break;
    case 'flask': rect(ctx, 6, 2, 4, 3, '#dfeaf0'); poly(ctx, [[6, 5], [10, 5], [12, 14], [4, 14]], '#dfeaf0'); poly(ctx, [[5, 9], [11, 9], [12, 14], [4, 14]], c1); break;
    case 'elixir': bottle(ctx, c1, '#f0d8ff'); circle(ctx, 8, 8, 1, c3); break;
    case 'food': circle(ctx, 8, 9, 5, c1); circle(ctx, 8, 9, 5, 'rgba(0,0,0,0)'); rect(ctx, 3, 8, 10, 1, c2); break;
    case 'soup': ellipse(ctx, 8, 10, 6, 3, c2); rrect(ctx, 3, 9, 10, 4, 1, c2); ellipse(ctx, 8, 9, 5, 2, c1); break;
    case 'bread': ellipse(ctx, 8, 9, 6, 4, c1); line(ctx, 5, 8, 7, 10, 0.8, c2); line(ctx, 9, 8, 11, 10, 0.8, c2); break;
    case 'fish': ellipse(ctx, 8, 8, 5, 3, c1); poly(ctx, [[3, 8], [0, 5], [0, 11]], c2); circle(ctx, 11, 7, 0.8, '#111'); break;
    case 'meat': ellipse(ctx, 8, 8, 4, 5, c1); rect(ctx, 7, 12, 2, 3, '#e8dcc0'); break;
    case 'scroll': rrect(ctx, 4, 5, 8, 7, 1, '#e8dcc0'); rect(ctx, 4, 4, 8, 1.4, c1); rect(ctx, 4, 11, 8, 1.4, c1); line(ctx, 6, 7, 10, 7, 0.6, c2); line(ctx, 6, 9, 10, 9, 0.6, c2); break;
    case 'ore': poly(ctx, [[5, 5], [11, 4], [13, 9], [9, 13], [4, 11]], c2); circle(ctx, 8, 8, 1.6, c1); break;
    case 'ingot': poly(ctx, [[4, 10], [5, 6], [11, 6], [12, 10], [11, 12], [5, 12]], c1); rect(ctx, 5, 6, 6, 1, c3); break;
    case 'herb': line(ctx, 8, 13, 8, 6, 1, '#4a7a3a'); ellipse(ctx, 6, 8, 2.4, 1.6, c1); ellipse(ctx, 10, 6, 2.4, 1.6, c1); ellipse(ctx, 8, 4, 2, 1.4, c1); break;
    case 'flower': line(ctx, 8, 14, 8, 8, 1, '#4a7a3a'); circle(ctx, 8, 5, 3, c1); circle(ctx, 8, 5, 1.2, c3); break;
    case 'mushroom': rect(ctx, 7, 8, 2, 5, '#e8dcc0'); ellipse(ctx, 8, 7, 5, 3, c1); circle(ctx, 6, 6, 0.8, c3); circle(ctx, 10, 7, 0.8, c3); break;
    case 'gem': gem(ctx, 8, 8, 5, c1, c3); break;
    case 'shell': ellipse(ctx, 8, 10, 6, 4, c1); for (let i = -2; i <= 2; i++) line(ctx, 8, 6, 8 + i * 2.2, 13, 0.7, c2); break;
    case 'scale': poly(ctx, [[8, 3], [12, 9], [8, 14], [4, 9]], c1); poly(ctx, [[8, 6], [10, 9], [8, 12], [6, 9]], c3); break;
    case 'feather': poly(ctx, [[8, 2], [11, 8], [8, 14], [7, 8]], c1); line(ctx, 8, 3, 8, 13, 0.6, c2); break;
    case 'bone': rect(ctx, 5, 7, 6, 2, '#e8e0c8'); circle(ctx, 5, 6, 1.6, '#e8e0c8'); circle(ctx, 5, 10, 1.6, '#e8e0c8'); circle(ctx, 11, 6, 1.6, '#e8e0c8'); circle(ctx, 11, 10, 1.6, '#e8e0c8'); break;
    case 'cloth': rrect(ctx, 4, 5, 8, 6, 1, c1); poly(ctx, [[4, 11], [6, 14], [8, 11], [10, 14], [12, 11]], c1); break;
    case 'leather': rrect(ctx, 4, 4, 8, 8, 2, c1); line(ctx, 5, 7, 11, 7, 0.6, c2); line(ctx, 5, 9, 11, 9, 0.6, c2); break;
    case 'slime': ellipse(ctx, 8, 10, 5, 3.4, c1); ellipse(ctx, 8, 8, 4, 2.6, c3); circle(ctx, 6.5, 9, 0.7, '#111'); circle(ctx, 9.5, 9, 0.7, '#111'); break;
    case 'crystal': poly(ctx, [[8, 2], [12, 8], [9, 14], [7, 14], [4, 8]], c1); poly(ctx, [[8, 2], [12, 8], [8, 14]], c3); break;
    case 'essence': emissiveDab(ctx, 8, 8, 6, c1, { coreStop: 0.3 }); break;
    case 'stone': poly(ctx, [[4, 11], [5, 6], [10, 4], [13, 8], [11, 12], [5, 13]], c1); break;
    case 'orb': emissiveDab(ctx, 8, 8, 5.6, c1, { coreStop: 0.32 }); break;
    case 'leaf': poly(ctx, [[8, 2], [13, 9], [8, 14], [3, 9]], c1); line(ctx, 8, 2, 8, 14, 0.6, c2); break;
    case 'coral': for (let i = 0; i < 3; i++) ellipse(ctx, 5 + i * 3, 10 - (i % 2) * 3, 2, 4, i % 2 ? c1 : c3); break;
    case 'pearl': circle(ctx, 8, 9, 4.4, c1); circle(ctx, 6.5, 7.5, 1.4, '#fff'); break;
    case 'wood': rect(ctx, 4, 6, 8, 4, c1); circle(ctx, 5, 8, 1, c2); circle(ctx, 10, 8, 1, c2); break;
    case 'core': circle(ctx, 8, 8, 5, c2); emissiveDab(ctx, 8, 8, 3.2, c1, { coreStop: 0.35 }); break;
    case 'claw': for (const dx of [-2, 0, 2]) poly(ctx, [[8 + dx, 4], [9 + dx, 4], [8 + dx * 0.6, 13]], c1); break;
    case 'fang': poly(ctx, [[6, 3], [10, 3], [8, 14]], c1); break;
    case 'dust': for (let i = 0; i < 8; i++) circle(ctx, 3 + (i * 5) % 12, 4 + ((i * 7) % 10), 0.7, c1); break;
    case 'key': circle(ctx, 6, 5, 2.6, c1); rect(ctx, 5.4, 7, 1.2, 7, c1); rect(ctx, 6.6, 11, 2, 1.2, c1); rect(ctx, 6.6, 13, 1.6, 1.2, c1); break;
    case 'letter': rrect(ctx, 3, 5, 10, 7, 1, '#e8dcc0'); poly(ctx, [[3, 5], [8, 10], [13, 5]], c1); break;
    case 'map': rrect(ctx, 3, 3, 10, 10, 1, '#e2d4a8'); line(ctx, 5, 7, 8, 5, 0.6, c1); line(ctx, 8, 5, 11, 9, 0.6, c1); circle(ctx, 11, 9, 1, c1); break;
    case 'coin': circle(ctx, 8, 9, 5, '#ffd24a'); circle(ctx, 8, 9, 3.2, '#f0b32a'); break;
    case 'bag': sack(ctx, c1); break;
    case 'lantern': rect(ctx, 7.4, 2, 1.2, 2, '#3a3226'); rrect(ctx, 5, 4, 6, 8, 1, '#5a4636'); emissiveDab(ctx, 8, 8, 2.6, '#ffdd88', { coreStop: 0.35 }); rect(ctx, 5, 12, 6, 1.4, '#3a3226'); break;
    case 'horn': poly(ctx, [[5, 13], [6, 5], [11, 4], [9, 12]], c1); line(ctx, 6, 9, 9, 8, 0.6, c2); break;
    case 'relic': poly(ctx, [[8, 2], [12, 8], [8, 14], [4, 8]], c2); circle(ctx, 8, 8, 2, c1); break;
    case 'book': rect(ctx, 4, 3, 8, 10, c1); rect(ctx, 4, 3, 1.4, 10, c2); line(ctx, 7, 6, 10, 6, 0.5, c3); line(ctx, 7, 8, 10, 8, 0.5, c3); break;
    default: circle(ctx, 8, 8, 5, c1);
  }
}

export function drawSkillIcon(ctx: CanvasRenderingContext2D, shape: SkillIconShape, colors: string[]): void {
  const [c1 = '#88ccff', c2 = shade(c1, -0.3), c3 = shade(c1, 0.3)] = colors;
  switch (shape) {
    case 'slash': poly(ctx, [[3, 12], [9, 2], [13, 4], [7, 14]], c1); break;
    case 'spin': ctx.strokeStyle = c1; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(8, 8, 5, 0.3, 5.3); ctx.stroke(); poly(ctx, [[12, 4], [14, 6], [11, 7]], c1); break;
    case 'shield': poly(ctx, [[8, 2], [13, 4], [13, 9], [8, 14], [3, 9], [3, 4]], c1); poly(ctx, [[8, 4], [11, 5.4], [11, 8.6], [8, 12], [8, 4]], c3); break;
    case 'fist': rrect(ctx, 5, 5, 7, 6, 2, c1); for (let i = 0; i < 3; i++) rect(ctx, 6 + i * 2, 3, 1.4, 3, c1); rect(ctx, 5, 11, 4, 3, c3); break;
    case 'burst': for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; line(ctx, 8, 8, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 1.6, c1); } circle(ctx, 8, 8, 2.2, c3); break;
    case 'bolt': poly(ctx, [[9, 1], [4, 9], [7, 9], [6, 15], [12, 6], [9, 6]], c1); break;
    case 'orb': emissiveDab(ctx, 8, 8, 5.6, c1, { coreStop: 0.32 }); break;
    case 'flame': poly(ctx, [[8, 1], [11, 8], [8, 15], [5, 8]], c1); emissiveDab(ctx, 8, 9, 3, c3, { coreStop: 0.4 }); break;
    case 'snow': for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI; line(ctx, 8 - Math.cos(a) * 6, 8 - Math.sin(a) * 6, 8 + Math.cos(a) * 6, 8 + Math.sin(a) * 6, 1.2, c1); } circle(ctx, 8, 8, 1.6, c3); break;
    case 'wave': for (let y = 4; y <= 12; y += 4) { ctx.strokeStyle = c1; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(2, y); ctx.quadraticCurveTo(6, y - 3, 8, y); ctx.quadraticCurveTo(10, y + 3, 14, y); ctx.stroke(); } break;
    case 'wind': for (let i = 0; i < 3; i++) { ctx.strokeStyle = c1; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(2, 5 + i * 3); ctx.quadraticCurveTo(10, 3 + i * 3, 14, 6 + i * 3); ctx.stroke(); } break;
    case 'arrow': rect(ctx, 3, 7.4, 8, 1.2, c1); poly(ctx, [[10, 5], [15, 8], [10, 11]], c1); break;
    case 'arrows': rect(ctx, 2, 4.4, 7, 1, c1); poly(ctx, [[8, 2.4], [13, 5], [8, 7.4]], c1); rect(ctx, 2, 10.4, 7, 1, c2); poly(ctx, [[8, 8.4], [13, 11], [8, 13.4]], c2); break;
    case 'bullet': ellipse(ctx, 8, 8, 5, 2.6, c1); poly(ctx, [[12, 6], [15, 8], [12, 10]], c2); break;
    case 'bomb': circle(ctx, 8, 10, 5, '#222'); rect(ctx, 9, 3, 1.2, 3, '#6b5438'); circle(ctx, 9.6, 3, 1.4, c1); break;
    case 'dash': for (let i = 0; i < 3; i++) rect(ctx, 2 + i * 4, 6.6 + i * 0.4, 3, 1.4, c1); break;
    case 'dagger': rect(ctx, 6.6, 2, 2.8, 3, c2); poly(ctx, [[7, 5], [9, 5], [8.4, 14], [7.6, 14]], c1); break;
    case 'shuriken': poly(ctx, [[8, 1], [10, 6], [15, 8], [10, 10], [8, 15], [6, 10], [1, 8], [6, 6]], c1); circle(ctx, 8, 8, 1.4, '#222'); break;
    case 'skull': circle(ctx, 8, 7, 5, c1); rect(ctx, 5, 10, 6, 3, c1); circle(ctx, 6, 7, 1, '#222'); circle(ctx, 10, 7, 1, '#222'); break;
    case 'eye': ellipse(ctx, 8, 8, 6, 3.4, '#e8e0c8'); circle(ctx, 8, 8, 2.4, c1); circle(ctx, 8, 8, 1, '#111'); break;
    case 'heart': poly(ctx, [[8, 13], [3, 7], [3, 4], [6, 2], [8, 5], [10, 2], [13, 4], [13, 7]], c1); break;
    case 'star': poly(ctx, [[8, 1], [9.8, 6], [15, 6.4], [10.8, 9.6], [12.2, 15], [8, 11.8], [3.8, 15], [5.2, 9.6], [1, 6.4], [6.2, 6]], c1); break;
    case 'moon': circle(ctx, 9, 8, 6, c1); ctx.globalCompositeOperation = 'destination-out'; circle(ctx, 6.4, 6, 5.2, '#fff'); ctx.globalCompositeOperation = 'source-over'; break;
    case 'feather': poly(ctx, [[8, 1], [11, 8], [8, 15], [7, 8]], c1); line(ctx, 8, 2, 8, 14, 0.6, c2); break;
    case 'claw': for (const dx of [-3, 0, 3]) poly(ctx, [[8 + dx, 3], [9 + dx, 3], [8 + dx * 0.6, 13]], c1); break;
    case 'rune': rrect(ctx, 3, 3, 10, 10, 1, '#00000000'); ctx.strokeStyle = c1; ctx.lineWidth = 1.4; ctx.strokeRect(3.5, 3.5, 9, 9); line(ctx, 8, 3.5, 8, 12.5, 1.2, c1); line(ctx, 3.5, 8, 12.5, 8, 1.2, c3); break;
    case 'aura': circle(ctx, 8, 8, 3, c3); ctx.strokeStyle = c1; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.stroke(); break;
    case 'trap': poly(ctx, [[2, 8], [8, 3], [14, 8], [8, 13]], c1); for (let i = 0; i < 5; i++) line(ctx, 5 + i * 1.4, 6.4, 5 + i * 1.4, 9.6, 0.6, c2); break;
    default: circle(ctx, 8, 8, 5, c1);
  }
}
