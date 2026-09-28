/**
 * Icon URL helpers with graceful fallbacks for missing/partial content registries.
 * The registries (ITEMS, SKILLS, NPCS...) may be empty while content agents are still working —
 * never let a missing id crash a render.
 */
import { iconUrl, itemIconUrl, skillIconUrl, npcPortraitUrl, characterPreviewUrl, characterPortraitUrl, type CharacterLook } from '../gfx';
import type { ItemDef, SkillDef, NpcDef, SkillIconSpec, MonsterDef } from '@shared/types';

const PLACEHOLDER_ICON = { shape: 'orb' as const, colors: ['#555b6e', '#333844'] };

export function safeItemIcon(def: ItemDef | undefined, size = 32): string {
  if (!def) return iconUrl(PLACEHOLDER_ICON, size);
  try { return itemIconUrl(def, size); } catch { return iconUrl(PLACEHOLDER_ICON, size); }
}

export function safeSkillIcon(def: (SkillDef | { icon: SkillIconSpec; id: string }) | undefined, size = 32): string {
  if (!def) return iconUrl({ shape: 'orb', colors: ['#555b6e'] }, size);
  try { return skillIconUrl(def, size); } catch { return iconUrl({ shape: 'orb', colors: ['#555b6e'] }, size); }
}

export function safeNpcPortrait(def: NpcDef | undefined, size = 96): string {
  if (!def) return iconUrl({ shape: 'book', colors: ['#444'] }, size);
  try { return npcPortraitUrl(def, size); } catch { return iconUrl({ shape: 'book', colors: ['#444'] }, size); }
}

export function characterPreviewUrlSafe(look: CharacterLook, scale = 4): string {
  try { return characterPreviewUrl(look, scale); } catch { return iconUrl({ shape: 'armor', colors: ['#556'] }, 32 * scale); }
}
export function characterPortraitUrlSafe(look: CharacterLook, size = 96): string {
  try { return characterPortraitUrl(look, size); } catch { return iconUrl({ shape: 'armor', colors: ['#556'] }, size); }
}

const monsterIconCache = new Map<string, string>();
/** Small procedural DOM icon for a monster (used by the bestiary; no Phaser scene available). */
export function iconUrlForMonster(def: MonsterDef, size = 40): string {
  const key = `${def.id}_${size}`;
  const hit = monsterIconCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const p = def.sprite.palette;
  ctx.fillStyle = p.secondary; ctx.beginPath(); ctx.ellipse(size / 2, size * 0.62, size * 0.34, size * 0.28, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.primary; ctx.beginPath(); ctx.ellipse(size / 2, size * 0.42, size * 0.3, size * 0.26, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = p.eye ?? '#111';
  ctx.beginPath(); ctx.arc(size * 0.42, size * 0.4, size * 0.045, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(size * 0.58, size * 0.4, size * 0.045, 0, Math.PI * 2); ctx.fill();
  const url = c.toDataURL();
  monsterIconCache.set(key, url);
  return url;
}

export function goldIconUrl(size = 20): string { return iconUrl({ shape: 'coin', colors: ['#ffb347', '#c9731f'] }, size); }
export function xpIconUrl(size = 20): string { return iconUrl({ shape: 'orb', colors: ['#5fe3c6'] }, size); }
