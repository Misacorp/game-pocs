/**
 * DRIFTWAKE procedural graphics API. All textures are generated at runtime from code
 * (Canvas2D -> Phaser textures / DOM data URLs) — there are no image assets.
 *
 * This file is a thin barrel: implementation lives in the sibling modules below.
 * Every exported signature from the original stub is preserved exactly.
 */
export type { CharacterLook, SpriteInfo, PlatformTextures, Parallax, Weather, VfxOpts } from './spec';

export { registerBaseTextures } from './base';
export { getCharacterSprite, getCharacterSpriteDeferred, getMonsterSprite, getNpcSprite, npcPortraitUrl, characterPortraitUrl, characterPreviewUrl } from './artDispatch';
export { getPetSprite } from './pets';
export { getPlatformTextures } from './tiles';
export { createParallax } from './parallax';
export { createWeather } from './weather';
export { getGatherNodeSprite, getPortalSprite, getDropTexture } from './gather';
export { getProjectileTexture, spawnVfx, spawnTelegraph, spawnHitSpark } from './vfx';
export { getDecorTexture } from './decor';
export { iconUrl, itemIconUrl, skillIconUrl } from './icons';
export { getArtStyle, setArtStyle, isIllustrated, type ArtStyle } from './rig/style';
