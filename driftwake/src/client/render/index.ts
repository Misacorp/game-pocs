/**
 * DRIFTWAKE rendering pipeline: quality tiers, per-theme shader skies, Light2D dynamic lighting +
 * normal maps, custom postFX (threshold bloom / color grade / vignette), atmosphere (mist,
 * foreground parallax), contact shadows and small render-side juice helpers. Thin barrel —
 * implementation lives in the sibling modules.
 */
export { getQuality, isShakeEnabled, isWebGLAvailable, onSettingsChanged, type Quality } from './quality';
export { setupWorldLighting, ensureNormalMap, type WorldLighting } from './lighting';
export { LightManager, selectNearestLights, type LightSource } from './LightManager';
export { ContactShadow } from './ContactShadow';
export { createSkyShader, type SkyShader } from './sky';
export { createMist, type MistLayer } from './mist';
export { setupPostFX, type PostFXHandle } from './PostFX';
export { registerPipelines } from './pipelines/registerPipelines';
export { ThresholdBloomPipeline } from './pipelines/ThresholdBloomPipeline';
export { GradingPipeline } from './pipelines/GradingPipeline';
export { GRADING, type GradingPreset } from './pipelines/gradingPresets';
export { ensurePixelFontLoading, isPixelFontReady, pixelFontFamily } from './pixelFont';
