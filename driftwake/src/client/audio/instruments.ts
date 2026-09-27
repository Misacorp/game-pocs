/**
 * Reusable synth voices: oscillators, noise generators, envelopes.
 * Manages lifetime of nodes to avoid leaks.
 */

import { getAudioContext } from './context';

/**
 * Play a sine wave with an ADSR envelope.
 * Returns the gain node so caller can monitor it if needed.
 */
export function playSineWave(
  freq: number,
  duration: number,
  opts?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    maxGain?: number;
    destination?: AudioNode;
  }
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const attack = opts?.attack ?? 0.01;
  const decay = opts?.decay ?? 0.05;
  const sustain = opts?.sustain ?? 0.3;
  const release = opts?.release ?? 0.1;
  const maxGain = opts?.maxGain ?? 0.3;
  const destination = opts?.destination ?? ctx.destination;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;

  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(destination);

  const now = ctx.currentTime;

  // ADSR envelope
  gain.gain.linearRampToValueAtTime(maxGain, now + attack);
  gain.gain.linearRampToValueAtTime(sustain * maxGain, now + attack + decay);
  gain.gain.setValueAtTime(sustain * maxGain, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.start(now);
  osc.stop(now + duration);

  // Cleanup after stop
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };

  return gain;
}

/**
 * Play a square wave (with optional lowpass to reduce harshness).
 */
export function playSquareWave(
  freq: number,
  duration: number,
  opts?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    maxGain?: number;
    filterFreq?: number; // Lowpass cutoff (Hz). Omit for no filter.
    destination?: AudioNode;
  }
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const attack = opts?.attack ?? 0.005;
  const decay = opts?.decay ?? 0.05;
  const sustain = opts?.sustain ?? 0.2;
  const release = opts?.release ?? 0.1;
  const maxGain = opts?.maxGain ?? 0.3;
  const destination = opts?.destination ?? ctx.destination;

  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;

  let output: AudioNode = osc;

  // Optional lowpass filter
  if (opts?.filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = opts.filterFreq;
    osc.connect(filter);
    output = filter;
  }

  const gain = ctx.createGain();
  gain.gain.value = 0;
  output.connect(gain);
  gain.connect(destination);

  const now = ctx.currentTime;

  // ADSR envelope
  gain.gain.linearRampToValueAtTime(maxGain, now + attack);
  gain.gain.linearRampToValueAtTime(sustain * maxGain, now + attack + decay);
  gain.gain.setValueAtTime(sustain * maxGain, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.start(now);
  osc.stop(now + duration);

  // Cleanup after stop
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };

  return gain;
}

/**
 * White noise burst (e.g. for impacts, hisses, explosions).
 */
export function playNoise(
  duration: number,
  opts?: {
    attack?: number;
    decay?: number;
    sustain?: number;
    release?: number;
    maxGain?: number;
    filterFreq?: number; // Highpass cutoff (Hz) if specified
    filterType?: 'highpass' | 'lowpass';
    destination?: AudioNode;
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

  // Create white noise with buffer
  const bufferSize = ctx.sampleRate * 0.5; // Half second of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  let output: AudioNode = source;

  // Optional filter
  if (opts?.filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType ?? 'highpass';
    filter.frequency.value = opts.filterFreq;
    source.connect(filter);
    output = filter;
  }

  const gain = ctx.createGain();
  gain.gain.value = 0;
  output.connect(gain);
  gain.connect(destination);

  const now = ctx.currentTime;

  // ADSR envelope
  gain.gain.linearRampToValueAtTime(maxGain, now + attack);
  gain.gain.linearRampToValueAtTime(sustain * maxGain, now + attack + decay);
  gain.gain.setValueAtTime(sustain * maxGain, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  source.start(now);
  source.stop(now + duration);

  // Cleanup after stop
  source.onended = () => {
    source.disconnect();
    gain.disconnect();
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
  }
): GainNode | null {
  const { ctx } = getAudioContext();
  if (!ctx) return null;

  const waveType = opts?.waveType ?? 'sine';
  const attack = opts?.attack ?? 0.005;
  const release = opts?.release ?? 0.1;
  const maxGain = opts?.maxGain ?? 0.3;
  const destination = opts?.destination ?? ctx.destination;

  const osc = ctx.createOscillator();
  osc.type = waveType;
  osc.frequency.setValueAtTime(freq1, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration);

  const gain = ctx.createGain();
  gain.gain.value = 0;
  osc.connect(gain);
  gain.connect(destination);

  const now = ctx.currentTime;
  gain.gain.linearRampToValueAtTime(maxGain, now + attack);
  gain.gain.setValueAtTime(maxGain, now + duration - release);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  osc.start(now);
  osc.stop(now + duration);

  // Cleanup after stop
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };

  return gain;
}

/**
 * Play a drum kick (low sine + noise thump).
 */
export function playKick(
  duration: number = 0.3,
  opts?: {
    pitch?: number; // Pitch slide start
    maxGain?: number;
    destination?: AudioNode;
  }
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;

  const pitch = opts?.pitch ?? 80;
  const maxGain = opts?.maxGain ?? 0.4;
  const destination = opts?.destination ?? ctx.destination;

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(pitch, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(maxGain, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(destination);

  const now = ctx.currentTime;
  osc.start(now);
  osc.stop(now + duration);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
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
  }
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;

  const maxGain = opts?.maxGain ?? 0.3;
  const waveType = opts?.waveType ?? 'sine';
  const destination = opts?.destination ?? ctx.destination;

  const osc = ctx.createOscillator();
  osc.type = waveType;
  osc.frequency.setValueAtTime(freq1, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(maxGain, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(destination);

  const now = ctx.currentTime;
  osc.start(now);
  osc.stop(now + duration);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}
