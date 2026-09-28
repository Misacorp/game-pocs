/**
 * AudioContext management: lazy initialization, gain nodes, compressor/limiter.
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let compressor: DynamicsCompressorNode | null = null;

export interface AudioContextState {
  ctx: AudioContext | null;
  masterGain: GainNode | null;
  musicGain: GainNode | null;
  sfxGain: GainNode | null;
  compressor: DynamicsCompressorNode | null;
}

/**
 * Lazily initialize AudioContext on first call. Must never throw.
 * Handles suspended contexts (browsers require user gesture).
 */
export function initAudioContext(): AudioContextState {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume if suspended (browsers block audio until user gesture)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Silent fail if resume is not allowed yet
      });
    }

    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.connect(ctx.destination);
      masterGain.gain.value = 0.8;
    }

    if (!musicGain) {
      musicGain = ctx.createGain();
      musicGain.connect(masterGain);
      musicGain.gain.value = 0.5;
    }

    if (!sfxGain) {
      sfxGain = ctx.createGain();
      sfxGain.connect(masterGain);
      sfxGain.gain.value = 0.8;
    }

    // Gentle compressor/limiter on master
    if (!compressor && ctx.createDynamicsCompressor) {
      compressor = ctx.createDynamicsCompressor();
      // Insert after master gain but before destination
      masterGain.disconnect();
      masterGain.connect(compressor);
      compressor.connect(ctx.destination);

      // Gentle settings to avoid pumping
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
    }
  } catch (err) {
    // Silent fail if WebAudio unavailable
    console.warn('WebAudio not available', err);
  }

  return { ctx, masterGain, musicGain, sfxGain, compressor };
}

export function getAudioContext(): AudioContextState {
  return { ctx, masterGain, musicGain, sfxGain, compressor };
}

export function isAudioReady(): boolean {
  return !!(ctx && masterGain && musicGain && sfxGain);
}
