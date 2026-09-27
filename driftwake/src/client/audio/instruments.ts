/**
 * Reusable synth voices: oscillators, noise generators, envelopes.
 * Manages lifetime of nodes to avoid leaks.
 *
 * Every voice takes an optional `time` (AudioContext time to start at, for
 * lookahead-scheduled callers like the music sequencer) and defaults to
 * `ctx.currentTime` for immediate one-shot callers (SFX).
 */

import { getAudioContext } from './context';

/** Shared white-noise buffer, built once and reused by every noise-based voice. */
let sharedNoiseBuffer: AudioBuffer | null = null;
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (sharedNoiseBuffer && sharedNoiseBuffer.sampleRate === ctx.sampleRate) return sharedNoiseBuffer;
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * 2));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  sharedNoiseBuffer = buffer;
  return buffer;
}

/** Clamp the sustain-hold time so automation events never go non-monotonic (which glitches/clicks). */
function safeHoldTime(start: number, attack: number, decay: number, duration: number, release: number): number {
  const afterDecay = start + attack + decay;
  const beforeRelease = start + Math.max(duration - release, 0.001);
  return Math.max(afterDecay, beforeRelease);
}

export interface Send {
  node: AudioNode;
  amount: number;
}

function applySend(gain: GainNode, ctx: AudioContext, send?: Send): GainNode | null {
  if (!send || send.amount <= 0) return null;
  const sendGain = ctx.createGain();
  sendGain.gain.value = send.amount;
  gain.connect(sendGain);
  sendGain.connect(send.node);
  return sendGain;
}

interface EnvelopeOpts {
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  maxGain?: number;
  destination?: AudioNode;
  send?: Send;
  time?: number;
}

/**
 * Play a sine wave with an ADSR envelope.
 * Returns the gain node so caller can monitor it if needed.
 */
export function playSineWave(
  freq: number,
  duration: number,
  opts?: EnvelopeOpts
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const attack = opts?.attack ?? 0.01;
  const decay = opts?.decay ?? 0.05;
  const sustain = opts?.sustain ?? 0.3;
  const release = opts?.release ?? 0.1;
  const maxGain = opts?.maxGain ?? 0.3;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  osc.connect(gain);
  gain.connect(destination);
  const sendNode = applySend(gain, ctx, opts?.send);

  const holdTime = safeHoldTime(start, attack, decay, duration, release);

  gain.gain.linearRampToValueAtTime(maxGain, start + attack);
  gain.gain.linearRampToValueAtTime(sustain * maxGain, start + attack + decay);
  gain.gain.setValueAtTime(sustain * maxGain, holdTime);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.start(start);
  osc.stop(start + duration + 0.02);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
    sendNode?.disconnect();
  };

  return gain;
}

/**
 * Play a square wave (with optional lowpass to reduce harshness).
 */
export function playSquareWave(
  freq: number,
  duration: number,
  opts?: EnvelopeOpts & { filterFreq?: number }
): GainNode | null {
  return playOscWave('square', freq, duration, opts);
}

/**
 * Play a triangle wave (with optional lowpass). Softer than square, good for
 * mellow leads and basses.
 */
export function playTriangleWave(
  freq: number,
  duration: number,
  opts?: EnvelopeOpts & { filterFreq?: number }
): GainNode | null {
  return playOscWave('triangle', freq, duration, opts);
}

function playOscWave(
  type: 'square' | 'triangle',
  freq: number,
  duration: number,
  opts?: EnvelopeOpts & { filterFreq?: number }
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const attack = opts?.attack ?? 0.005;
  const decay = opts?.decay ?? 0.05;
  const sustain = opts?.sustain ?? 0.2;
  const release = opts?.release ?? 0.1;
  const maxGain = opts?.maxGain ?? 0.3;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;

  let output: AudioNode = osc;
  let filter: BiquadFilterNode | null = null;
  if (opts?.filterFreq) {
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.filterFreq;
    osc.connect(filter);
    output = filter;
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  output.connect(gain);
  gain.connect(destination);
  const sendNode = applySend(gain, ctx, opts?.send);

  const holdTime = safeHoldTime(start, attack, decay, duration, release);

  gain.gain.linearRampToValueAtTime(maxGain, start + attack);
  gain.gain.linearRampToValueAtTime(sustain * maxGain, start + attack + decay);
  gain.gain.setValueAtTime(sustain * maxGain, holdTime);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.start(start);
  osc.stop(start + duration + 0.02);

  osc.onended = () => {
    osc.disconnect();
    filter?.disconnect();
    gain.disconnect();
    sendNode?.disconnect();
  };

  return gain;
}

/**
 * A melodic lead voice: square/triangle oscillator, optional lowpass, and a
 * gentle pitch vibrato LFO. Used by the music sequencer's lead line.
 */
export function playLeadVoice(
  freq: number,
  duration: number,
  opts?: EnvelopeOpts & {
    wave?: 'square' | 'triangle';
    filterFreq?: number;
    vibratoRate?: number; // Hz
    vibratoCents?: number; // depth in cents
  }
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const wave = opts?.wave ?? 'square';
  const attack = opts?.attack ?? 0.008;
  const decay = opts?.decay ?? 0.04;
  const sustain = opts?.sustain ?? 0.55;
  const release = opts?.release ?? Math.min(0.15, duration * 0.4);
  const maxGain = opts?.maxGain ?? 0.15;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;
  const vibratoRate = opts?.vibratoRate ?? 5;
  const vibratoCents = opts?.vibratoCents ?? 8;

  const osc = ctx.createOscillator();
  osc.type = wave;
  osc.frequency.value = freq;

  let vibratoOsc: OscillatorNode | null = null;
  let vibratoGain: GainNode | null = null;
  if (vibratoCents > 0 && duration > 0.15) {
    vibratoOsc = ctx.createOscillator();
    vibratoOsc.type = 'sine';
    vibratoOsc.frequency.value = vibratoRate;
    vibratoGain = ctx.createGain();
    // detune is in cents; ramp the vibrato in slightly after the attack so short notes stay clean
    vibratoGain.gain.setValueAtTime(0, start);
    vibratoGain.gain.linearRampToValueAtTime(vibratoCents, start + Math.max(attack, 0.08));
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(osc.detune);
    vibratoOsc.start(start);
    vibratoOsc.stop(start + duration + 0.02);
  }

  let output: AudioNode = osc;
  let filter: BiquadFilterNode | null = null;
  if (opts?.filterFreq) {
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.filterFreq;
    filter.Q.value = 0.7;
    osc.connect(filter);
    output = filter;
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  output.connect(gain);
  gain.connect(destination);
  const sendNode = applySend(gain, ctx, opts?.send);

  const holdTime = safeHoldTime(start, attack, decay, duration, release);

  gain.gain.linearRampToValueAtTime(maxGain, start + attack);
  gain.gain.linearRampToValueAtTime(sustain * maxGain, start + attack + decay);
  gain.gain.setValueAtTime(sustain * maxGain, holdTime);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.start(start);
  osc.stop(start + duration + 0.02);

  osc.onended = () => {
    osc.disconnect();
    filter?.disconnect();
    gain.disconnect();
    vibratoOsc?.disconnect();
    vibratoGain?.disconnect();
    sendNode?.disconnect();
  };

  return gain;
}

/**
 * White noise burst (e.g. for impacts, hisses, explosions, hats, snares).
 */
export function playNoise(
  duration: number,
  opts?: EnvelopeOpts & {
    filterFreq?: number; // Highpass/lowpass cutoff (Hz) if specified
    filterType?: 'highpass' | 'lowpass';
  }
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const attack = opts?.attack ?? 0.01;
  const decay = opts?.decay ?? 0.1;
  const sustain = opts?.sustain ?? 0.3;
  const release = opts?.release ?? 0.15;
  const maxGain = opts?.maxGain ?? 0.3;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;

  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);
  source.loop = true;
  // Start at a random offset so simultaneous noise voices don't sound identical.
  const offset = Math.random() * (source.buffer.duration - 0.05);

  let output: AudioNode = source;
  let filter: BiquadFilterNode | null = null;
  if (opts?.filterFreq) {
    filter = ctx.createBiquadFilter();
    filter.type = opts.filterType ?? 'highpass';
    filter.frequency.value = opts.filterFreq;
    source.connect(filter);
    output = filter;
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  output.connect(gain);
  gain.connect(destination);
  const sendNode = applySend(gain, ctx, opts?.send);

  const holdTime = safeHoldTime(start, attack, decay, duration, release);

  gain.gain.linearRampToValueAtTime(maxGain, start + attack);
  gain.gain.linearRampToValueAtTime(sustain * maxGain, start + attack + decay);
  gain.gain.setValueAtTime(sustain * maxGain, holdTime);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  source.start(start, offset);
  source.stop(start + duration + 0.02);

  source.onended = () => {
    source.disconnect();
    filter?.disconnect();
    gain.disconnect();
    sendNode?.disconnect();
  };

  return gain;
}

/**
 * Frequency sweep (chirp) from freq1 to freq2.
 */
export function playFreqSweep(
  freq1: number,
  freq2: number,
  duration: number,
  opts?: {
    waveType?: 'sine' | 'square' | 'sawtooth' | 'triangle';
    attack?: number;
    release?: number;
    maxGain?: number;
    destination?: AudioNode;
    time?: number;
  }
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const waveType = opts?.waveType ?? 'sine';
  const attack = opts?.attack ?? 0.005;
  const release = opts?.release ?? 0.1;
  const maxGain = opts?.maxGain ?? 0.3;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;

  const osc = ctx.createOscillator();
  osc.type = waveType;
  osc.frequency.setValueAtTime(Math.max(freq1, 1), start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freq2, 1), start + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  osc.connect(gain);
  gain.connect(destination);

  const holdTime = Math.max(start + attack, start + duration - release);
  gain.gain.linearRampToValueAtTime(maxGain, start + attack);
  gain.gain.setValueAtTime(maxGain, holdTime);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.start(start);
  osc.stop(start + duration + 0.02);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };

  return gain;
}

/**
 * Play a drum kick (low sine + pitch drop).
 */
export function playKick(
  duration: number = 0.3,
  opts?: {
    pitch?: number; // Pitch slide start
    endPitch?: number; // Pitch slide end
    maxGain?: number;
    destination?: AudioNode;
    time?: number;
  }
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;

  const pitch = opts?.pitch ?? 80;
  const endPitch = opts?.endPitch ?? 30;
  const maxGain = opts?.maxGain ?? 0.4;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;
  const attack = 0.004;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch, start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endPitch, 1), start + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(maxGain, start + attack);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * A snare drum: filtered noise body plus a short tonal "ping" for punch.
 */
export function playSnareDrum(
  duration: number = 0.15,
  opts?: { maxGain?: number; destination?: AudioNode; send?: Send; time?: number }
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  const maxGain = opts?.maxGain ?? 0.25;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;

  playNoise(duration, {
    attack: 0.002,
    decay: duration * 0.4,
    sustain: 0.25,
    release: duration * 0.35,
    maxGain: maxGain * 0.8,
    filterFreq: 1800,
    filterType: 'highpass',
    destination,
    send: opts?.send,
    time: start,
  });
  playTriangleWave(190, duration * 0.6, {
    attack: 0.002,
    decay: 0.02,
    sustain: 0,
    release: duration * 0.4,
    maxGain: maxGain * 0.5,
    destination,
    time: start,
  });
}

/**
 * A hi-hat: very short highpassed noise burst.
 */
export function playHatDrum(
  duration: number = 0.05,
  opts?: { maxGain?: number; destination?: AudioNode; open?: boolean; time?: number }
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  const maxGain = opts?.maxGain ?? 0.12;
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;
  const dur = opts?.open ? duration * 2.5 : duration;

  playNoise(dur, {
    attack: 0.001,
    decay: dur * 0.3,
    sustain: 0.15,
    release: dur * 0.6,
    maxGain,
    filterFreq: 8500,
    filterType: 'highpass',
    destination,
    time: start,
  });
}

/**
 * Ramp a frequency exponentially with gain falloff.
 * Useful for sweeps, glissandos, laser sounds.
 */
export function playGlissando(
  freq1: number,
  freq2: number,
  duration: number,
  opts?: {
    maxGain?: number;
    waveType?: 'sine' | 'square' | 'sawtooth' | 'triangle';
    destination?: AudioNode;
    time?: number;
  }
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;

  const maxGain = opts?.maxGain ?? 0.3;
  const waveType = opts?.waveType ?? 'sine';
  const destination = opts?.destination ?? ctx.destination;
  const start = opts?.time ?? ctx.currentTime;
  const attack = 0.005;

  const osc = ctx.createOscillator();
  osc.type = waveType;
  osc.frequency.setValueAtTime(Math.max(freq1, 1), start);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freq2, 1), start + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(maxGain, start + attack);
  gain.gain.linearRampToValueAtTime(0, start + duration);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
