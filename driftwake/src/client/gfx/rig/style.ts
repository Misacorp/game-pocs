/**
 * Art-style switch for the illustrated-rig trial: 'illustrated' (vector paper-doll rigs baked at
 * 2x) or 'pixel' (the original 1x procedural pixel art). Persisted in localStorage so an A/B
 * comparison survives reloads; entities pick the style up when their sprites are (re)built.
 */
export type ArtStyle = 'illustrated' | 'pixel';
const KEY = 'driftwake:art';
let cached: ArtStyle | null = null;

export function getArtStyle(): ArtStyle {
  if (cached) return cached;
  let v: string | null = null;
  try { v = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  cached = v === 'pixel' ? 'pixel' : 'illustrated';
  return cached;
}

export function setArtStyle(s: ArtStyle): void {
  cached = s;
  try { localStorage.setItem(KEY, s); } catch { /* storage blocked */ }
  if (typeof document !== 'undefined') document.documentElement.dataset.art = s;
}

export function isIllustrated(): boolean { return getArtStyle() === 'illustrated'; }
