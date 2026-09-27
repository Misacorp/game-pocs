/**
 * Icon URL helpers with graceful fallbacks for missing/partial content registries.
 * The registries (ITEMS, SKILLS, NPCS...) may be empty while content agents are still working —
 * never let a missing id crash a render.
 */
import { iconUrl, itemIconUrl, skillIconUrl, npcPortraitUrl } from '../gfx';
import type { ItemDef, SkillDef, NpcDef, SkillIconSpec } from '@shared/types';

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

export function goldIconUrl(size = 20): string { return iconUrl({ shape: 'coin', colors: ['#ffd24a', '#c98a1c'] }, size); }
export function xpIconUrl(size = 20): string { return iconUrl({ shape: 'orb', colors: ['#4fd8c4'] }, size); }
