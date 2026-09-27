/**
 * Sound effect synthesizers for each SfxId.
 * Each sound is procedurally generated using WebAudio.
 */

import type { SfxId } from '@shared/types';
import { getAudioContext } from './context';
import { playSineWave, playSquareWave, playNoise, playFreqSweep, playKick, playGlissando } from './instruments';

/** Rate limit identical SFX within this time window (ms) */
const SFX_RATE_LIMIT_MS = 30;

/** Max concurrent voices of the same sound */
const MAX_CONCURRENT_VOICES = 12;

/** Track recent SFX plays for rate limiting */
interface SfxVoice {
  id: SfxId;
  timestamp: number;
}

const recentVoices: SfxVoice[] = [];

/** Cleanup old voice tracking */
function pruneVoiceHistory(now: number): void {
  while (recentVoices.length > 0 && recentVoices[0].timestamp < now - 1000) {
    recentVoices.shift();
  }
}

/**
 * Check if we should play this SFX (rate limit + concurrent limit).
 */
function shouldPlaySfx(id: SfxId): boolean {
  const { ctx } = getAudioContext();
  if (!ctx) return false;

  const now = ctx.currentTime * 1000; // Convert to ms
  pruneVoiceHistory(now);

  // Check if we're exceeding max concurrent voices
  const sameIdCount = recentVoices.filter((v) => v.id === id).length;
  if (sameIdCount >= MAX_CONCURRENT_VOICES) return false;

  // Check if last play was too recent (rate limit)
  const lastPlay = recentVoices.find((v) => v.id === id);
  if (lastPlay && now - lastPlay.timestamp < SFX_RATE_LIMIT_MS) {
    return false;
  }

  return true;
}

function recordVoicePlay(id: SfxId): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime * 1000;
  recentVoices.push({ id, timestamp: now });
  pruneVoiceHistory(now);
}

/** Add random pitch variation (±0..maxCents) */
function varyPitch(freq: number, maxCents: number = 20): number {
  const variation = (Math.random() - 0.5) * 2 * (maxCents / 1200);
  return freq * Math.pow(2, variation);
}

/**
 * Main SFX dispatcher. Synthesizes a distinct sound for each SfxId.
 */
export function synthesizeSfx(
  id: SfxId,
  opts?: { volume?: number; pitch?: number; pan?: number }
): void {
  if (!shouldPlaySfx(id)) return;
  recordVoicePlay(id);

  const { ctx, sfxGain } = getAudioContext();
  if (!ctx || !sfxGain) return;

  // Apply pan if specified
  let destination: AudioNode = sfxGain;
  if (opts?.pan !== undefined && opts.pan !== 0) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
    panner.connect(sfxGain);
    destination = panner;
  }

  const volume = opts?.volume ?? 1;
  const pitchShift = opts?.pitch ?? 1;

  switch (id) {
    // Combat
    case 'swing':
      playSfxSwing(volume, pitchShift, destination);
      break;
    case 'hit':
      playSfxHit(volume, pitchShift, destination);
      break;
    case 'crit':
      playSfxCrit(volume, pitchShift, destination);
      break;
    case 'cast':
      playSfxCast(volume, destination);
      break;
    case 'shoot':
      playSfxShoot(volume, destination);
      break;
    case 'gunshot':
      playSfxGunshot(volume, destination);
      break;
    case 'explosion':
      playSfxExplosion(volume, destination);
      break;
    case 'lightning':
      playSfxLightning(volume, destination);
      break;
    case 'ice':
      playSfxIce(volume, destination);
      break;

    // Movement
    case 'jump':
      playSfxJump(volume, destination);
      break;
    case 'dash':
      playSfxDash(volume, destination);
      break;
    case 'land':
      playSfxLand(volume, destination);
      break;

    // Damage / Status
    case 'playerHurt':
      playSfxPlayerHurt(volume, destination);
      break;
    case 'monsterHurt':
      playSfxMonsterHurt(volume, destination);
      break;
    case 'monsterDie':
      playSfxMonsterDie(volume, destination);
      break;
    case 'bossRoar':
      playSfxBossRoar(volume, destination);
      break;
    case 'death':
      playSfxDeath(volume, destination);
      break;

    // Progression
    case 'levelUp':
      playSfxLevelUp(volume, destination);
      break;
    case 'pickup':
      playSfxPickup(volume, destination);
      break;
    case 'coin':
      playSfxCoin(volume, destination);
      break;
    case 'potion':
      playSfxPotion(volume, destination);
      break;
    case 'buff':
      playSfxBuff(volume, destination);
      break;
    case 'heal':
      playSfxHeal(volume, destination);
      break;

    // Quests
    case 'questAccept':
      playSfxQuestAccept(volume, destination);
      break;
    case 'questComplete':
      playSfxQuestComplete(volume, destination);
      break;
    case 'questProgress':
      playSfxQuestProgress(volume, destination);
      break;

    // UI
    case 'uiClick':
      playSfxUiClick(volume, destination);
      break;
    case 'uiOpen':
      playSfxUiOpen(volume, destination);
      break;
    case 'uiClose':
      playSfxUiClose(volume, destination);
      break;
    case 'error':
      playSfxError(volume, destination);
      break;

    // Crafting / equip
    case 'equip':
      playSfxEquip(volume, destination);
      break;
    case 'portal':
      playSfxPortal(volume, destination);
      break;
    case 'craft':
      playSfxCraft(volume, destination);
      break;
    case 'gather':
      playSfxGather(volume, destination);
      break;
    case 'enhanceSuccess':
      playSfxEnhanceSuccess(volume, destination);
      break;
    case 'enhanceFail':
      playSfxEnhanceFail(volume, destination);
      break;
    case 'jobAdvance':
      playSfxJobAdvance(volume, destination);
      break;
    case 'talk':
      playSfxTalk(volume, destination);
      break;
  }
}

// ============================================================================
// SFX Synthesizers
// ============================================================================

function playSfxSwing(volume: number, pitchShift: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Filtered noise sweep with small pitch variation
  const freqStart = varyPitch(8000, 30);
  playFreqSweep(freqStart, 4000, 0.15, {
    waveType: 'square',
    maxGain: 0.2 * volume,
    destination: dest,
  });
}

function playSfxHit(volume: number, pitchShift: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Short punchy thump + click
  playKick(0.08, { pitch: varyPitch(200, 30), maxGain: 0.25 * volume, destination: dest });
  // Click on top
  playNoise(0.05, { attack: 0, release: 0.02, maxGain: 0.15 * volume, destination: dest });
}

function playSfxCrit(volume: number, pitchShift: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Brighter layered hit
  playKick(0.1, { pitch: varyPitch(300, 20), maxGain: 0.3 * volume, destination: dest });
  playSineWave(varyPitch(800, 30), 0.15, {
    attack: 0.005,
    release: 0.05,
    maxGain: 0.2 * volume,
    destination: dest,
  });
}

function playSfxCast(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Rising shimmer
  playFreqSweep(2000, 4000, 0.4, {
    waveType: 'sine',
    attack: 0.01,
    release: 0.1,
    maxGain: 0.2 * volume,
    destination: dest,
  });
  // Add a harmonic
  playFreqSweep(4000, 8000, 0.4, {
    waveType: 'sine',
    attack: 0.02,
    release: 0.1,
    maxGain: 0.1 * volume,
    destination: dest,
  });
}

function playSfxShoot(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Bow twang: descending pitch
  playGlissando(800, 300, 0.1, {
    maxGain: 0.25 * volume,
    waveType: 'square',
    destination: dest,
  });
}

function playSfxGunshot(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Noise burst + low thump
  playNoise(0.15, {
    attack: 0,
    decay: 0.08,
    sustain: 0.1,
    release: 0.05,
    maxGain: 0.3 * volume,
    filterFreq: 10000,
    filterType: 'highpass',
    destination: dest,
  });
  playKick(0.12, {
    pitch: 120,
    maxGain: 0.25 * volume,
    destination: dest,
  });
}

function playSfxExplosion(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Noise sweep + low rumble
  playNoise(0.6, {
    attack: 0.02,
    decay: 0.2,
    sustain: 0.4,
    release: 0.3,
    maxGain: 0.35 * volume,
    destination: dest,
  });
  playKick(0.4, { pitch: 100, maxGain: 0.3 * volume, destination: dest });
}

function playSfxLightning(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Crackle: fast noise bursts
  for (let i = 0; i < 4; i++) {
    const delay = i * 0.05;
    setTimeout(() => {
      playNoise(0.08, {
        attack: 0.01,
        release: 0.03,
        maxGain: 0.2 * volume * (1 - i * 0.15),
        filterFreq: 6000 + i * 1000,
        filterType: 'highpass',
        destination: dest,
      });
    }, delay * 1000);
  }
}

function playSfxIce(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Glassy tinkle: high pitched sine bells
  playSineWave(varyPitch(4000, 20), 0.15, {
    attack: 0.01,
    decay: 0.05,
    sustain: 0,
    release: 0.08,
    maxGain: 0.2 * volume,
    destination: dest,
  });
  playSineWave(varyPitch(5000, 20), 0.2, {
    attack: 0.015,
    decay: 0.06,
    sustain: 0,
    release: 0.1,
    maxGain: 0.15 * volume,
    destination: dest,
  });
}

function playSfxJump(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Rising tone
  playFreqSweep(400, 800, 0.15, {
    waveType: 'sine',
    attack: 0.01,
    release: 0.05,
    maxGain: 0.2 * volume,
    destination: dest,
  });
}

function playSfxDash(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Whoosh swirl: noise + upward sweep
  playNoise(0.1, {
    attack: 0.02,
    release: 0.08,
    maxGain: 0.15 * volume,
    destination: dest,
  });
  playFreqSweep(1000, 3000, 0.1, {
    waveType: 'sine',
    maxGain: 0.15 * volume,
    destination: dest,
  });
}

function playSfxLand(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Short thump
  playKick(0.1, { pitch: varyPitch(150, 40), maxGain: 0.15 * volume, destination: dest });
}

function playSfxPlayerHurt(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Short descending tone
  playGlissando(600, 300, 0.2, {
    maxGain: 0.2 * volume,
    waveType: 'sine',
    destination: dest,
  });
}

function playSfxMonsterHurt(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Cute squishy tone
  playSquareWave(varyPitch(400, 40), 0.12, {
    attack: 0.01,
    decay: 0.1,
    sustain: 0,
    release: 0.01,
    maxGain: 0.18 * volume,
    filterFreq: 3000,
    destination: dest,
  });
}

function playSfxMonsterDie(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Cute pop + descending blip
  playSquareWave(varyPitch(800, 30), 0.08, {
    attack: 0.01,
    release: 0.05,
    maxGain: 0.15 * volume,
    filterFreq: 4000,
    destination: dest,
  });
  playFreqSweep(400, 100, 0.15, {
    waveType: 'sine',
    attack: 0.02,
    release: 0.1,
    maxGain: 0.15 * volume,
    destination: dest,
  });
}

function playSfxBossRoar(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Low growl: sine + noise
  playSineWave(80, 0.6, {
    attack: 0.1,
    decay: 0.2,
    sustain: 0.5,
    release: 0.3,
    maxGain: 0.25 * volume,
    destination: dest,
  });
  playNoise(0.5, {
    attack: 0.05,
    decay: 0.15,
    sustain: 0.3,
    release: 0.25,
    maxGain: 0.1 * volume,
    filterFreq: 200,
    filterType: 'highpass',
    destination: dest,
  });
}

function playSfxDeath(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Sad descending arpeggio-ish
  for (let i = 0; i < 3; i++) {
    const delay = i * 0.12;
    const freq = [400, 300, 150][i];
    setTimeout(() => {
      playFreqSweep(freq, freq * 0.5, 0.2, {
        waveType: 'sine',
        maxGain: 0.15 * volume * (1 - i * 0.25),
        destination: dest,
      });
    }, delay * 1000);
  }
}

function playSfxLevelUp(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Triumphant arpeggio fanfare (~1.2s)
  const freqs = [440, 550, 660, 880]; // C-E-G-C2
  for (let i = 0; i < freqs.length; i++) {
    const delay = i * 0.15;
    setTimeout(() => {
      playSineWave(freqs[i], 0.3, {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.3,
        release: 0.1,
        maxGain: 0.2 * volume,
        destination: dest,
      });
    }, delay * 1000);
  }
}

function playSfxPickup(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Small blip with slight variation
  playSineWave(varyPitch(1000, 30), 0.08, {
    attack: 0.01,
    release: 0.06,
    maxGain: 0.15 * volume,
    destination: dest,
  });
}

function playSfxCoin(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Classic two-tone coin: high + low
  playSineWave(1200, 0.1, {
    attack: 0.01,
    decay: 0.08,
    sustain: 0,
    release: 0.01,
    maxGain: 0.18 * volume,
    destination: dest,
  });
  setTimeout(() => {
    playSineWave(800, 0.12, {
      attack: 0.01,
      decay: 0.1,
      sustain: 0,
      release: 0.01,
      maxGain: 0.15 * volume,
      destination: dest,
    });
  }, 60);
}

function playSfxPotion(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Gulp/bubble
  playSquareWave(varyPitch(500, 50), 0.15, {
    attack: 0.05,
    decay: 0.1,
    sustain: 0,
    release: 0.05,
    maxGain: 0.15 * volume,
    filterFreq: 3000,
    destination: dest,
  });
}

function playSfxBuff(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Sparkle: rising chord
  playSineWave(1200, 0.25, { attack: 0.05, release: 0.1, maxGain: 0.15 * volume, destination: dest });
  playSineWave(1600, 0.25, { attack: 0.06, release: 0.1, maxGain: 0.1 * volume, destination: dest });
}

function playSfxHeal(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Sparkle: bright tones
  playSineWave(1800, 0.2, { attack: 0.03, release: 0.1, maxGain: 0.15 * volume, destination: dest });
  playSineWave(2400, 0.2, { attack: 0.04, release: 0.1, maxGain: 0.12 * volume, destination: dest });
}

function playSfxQuestAccept(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Short fanfare
  playSineWave(550, 0.15, {
    attack: 0.05,
    decay: 0.08,
    sustain: 0,
    release: 0.02,
    maxGain: 0.15 * volume,
    destination: dest,
  });
  playSineWave(660, 0.2, {
    attack: 0.07,
    decay: 0.08,
    sustain: 0,
    release: 0.05,
    maxGain: 0.15 * volume,
    destination: dest,
  });
}

function playSfxQuestComplete(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Fanfare
  const freqs = [660, 880];
  for (let i = 0; i < freqs.length; i++) {
    setTimeout(() => {
      playSineWave(freqs[i], 0.25, {
        attack: 0.05,
        decay: 0.1,
        sustain: 0.2,
        release: 0.1,
        maxGain: 0.18 * volume,
        destination: dest,
      });
    }, i * 100);
  }
}

function playSfxQuestProgress(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Positive blip
  playSineWave(880, 0.12, {
    attack: 0.03,
    decay: 0.08,
    sustain: 0,
    release: 0.05,
    maxGain: 0.15 * volume,
    destination: dest,
  });
}

function playSfxUiClick(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Soft click
  playNoise(0.06, {
    attack: 0.01,
    release: 0.04,
    maxGain: 0.1 * volume,
    destination: dest,
  });
}

function playSfxUiOpen(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Gentle open sound
  playFreqSweep(1000, 1500, 0.15, {
    waveType: 'sine',
    maxGain: 0.12 * volume,
    destination: dest,
  });
}

function playSfxUiClose(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Gentle close sound
  playFreqSweep(1500, 1000, 0.15, {
    waveType: 'sine',
    maxGain: 0.12 * volume,
    destination: dest,
  });
}

function playSfxError(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Buzz/error
  playSquareWave(300, 0.2, {
    attack: 0.05,
    decay: 0.15,
    sustain: 0,
    release: 0.05,
    maxGain: 0.15 * volume,
    filterFreq: 2000,
    destination: dest,
  });
}

function playSfxEquip(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Clank/metallic
  playNoise(0.1, {
    attack: 0.02,
    release: 0.08,
    maxGain: 0.15 * volume,
    filterFreq: 5000,
    filterType: 'highpass',
    destination: dest,
  });
}

function playSfxPortal(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Whoosh swirl
  playNoise(0.3, {
    attack: 0.05,
    decay: 0.1,
    sustain: 0.2,
    release: 0.15,
    maxGain: 0.15 * volume,
    destination: dest,
  });
  playFreqSweep(2000, 4000, 0.3, {
    waveType: 'sine',
    attack: 0.05,
    release: 0.1,
    maxGain: 0.1 * volume,
    destination: dest,
  });
}

function playSfxCraft(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Hammer/clink
  playNoise(0.08, {
    attack: 0.01,
    release: 0.06,
    maxGain: 0.12 * volume,
    filterFreq: 8000,
    filterType: 'highpass',
    destination: dest,
  });
  playKick(0.08, { pitch: varyPitch(200, 20), maxGain: 0.1 * volume, destination: dest });
}

function playSfxGather(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Pick/rustle
  playNoise(0.12, {
    attack: 0.02,
    decay: 0.08,
    sustain: 0,
    release: 0.05,
    maxGain: 0.12 * volume,
    destination: dest,
  });
  playSineWave(varyPitch(600, 40), 0.1, {
    attack: 0.03,
    release: 0.07,
    maxGain: 0.1 * volume,
    destination: dest,
  });
}

function playSfxEnhanceSuccess(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Bright chime
  playSineWave(2000, 0.25, {
    attack: 0.05,
    decay: 0.1,
    sustain: 0.2,
    release: 0.1,
    maxGain: 0.2 * volume,
    destination: dest,
  });
  playSineWave(2600, 0.3, {
    attack: 0.06,
    decay: 0.12,
    sustain: 0.15,
    release: 0.12,
    maxGain: 0.15 * volume,
    destination: dest,
  });
}

function playSfxEnhanceFail(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Sad descend
  playFreqSweep(600, 300, 0.25, {
    waveType: 'sine',
    maxGain: 0.18 * volume,
    destination: dest,
  });
}

function playSfxJobAdvance(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Big fanfare
  const freqs = [440, 550, 660, 880, 1100];
  for (let i = 0; i < freqs.length; i++) {
    const delay = i * 0.12;
    setTimeout(() => {
      playSineWave(freqs[i], 0.35, {
        attack: 0.05,
        decay: 0.15,
        sustain: 0.2,
        release: 0.1,
        maxGain: 0.18 * volume,
        destination: dest,
      });
    }, delay * 1000);
  }
}

function playSfxTalk(volume: number, dest: AudioNode): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  // Soft blip
  playSineWave(varyPitch(1200, 50), 0.06, {
    attack: 0.02,
    release: 0.04,
    maxGain: 0.12 * volume,
    destination: dest,
  });
}
