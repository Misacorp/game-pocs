/**
 * Generative music: a lookahead step sequencer per Chris Wilson's
 * "A Tale of Two Clocks" (https://web.dev/articles/audio-scheduling).
 *
 * Each MusicId is a small composition: a key/mode, a chord progression (one
 * roman-numeral chord per bar), and per-voice patterns written as compact
 * strings (one character per 16th-note step):
 *   - lead/bass "scale degree" patterns: '.' rest, '-' hold previous note,
 *     '1'-'9' scale degree (wraps to higher octaves past the scale length),
 *     'a'-'g' the same degree one octave down, 'A'-'G' one octave up.
 *   - arp "chord tone" patterns: '.' rest, '-' hold, '0'-'3' chord-tone index
 *     (0=root, 1=third, 2=fifth, 3=root+octave) of the CURRENT bar's chord.
 *   - drum patterns: '.' rest, '1'-'3' hit velocity (soft -> accent).
 *
 * Every playing track is its own object with its own GainNode feeding into
 * the shared musicGain bus, so crossfades ramp two independent gains and
 * never fight over one shared node.
 */

import type { MusicId } from '@shared/types';
import { getAudioContext } from './context';
import { playLeadVoice, playTriangleWave, playSineWave, playKick, playSnareDrum, playHatDrum } from './instruments';
import type { Send } from './instruments';

// ---------------------------------------------------------------------------
// Music theory helpers
// ---------------------------------------------------------------------------

/** Semitone intervals of each mode/scale, ascending from the root. */
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
} as const;
type ModeName = keyof typeof MODES;

/** Convert a MIDI note number to frequency (Hz). */
function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Resolve a 1-indexed scale degree (may be <1 or >scale length; wraps into
 * further octaves) plus an extra octave shift (in semitones) to a frequency.
 */
function degreeToFreq(rootMidi: number, scale: readonly number[], degree: number, extraSemis = 0): number {
  const idx = degree - 1;
  const len = scale.length;
  const octaveAdd = Math.floor(idx / len) * 12;
  const scaleIdx = ((idx % len) + len) % len;
  const semis = scale[scaleIdx] + octaveAdd + extraSemis;
  return midiToFreq(rootMidi + semis);
}

/** Scale-degree index for chord tone `toneIdx` (0=root,1=third,2=fifth,3=root+8ve) stacked on `rootDegree`. */
function chordToneDegree(rootDegree: number, toneIdx: number, scaleLen: number): number {
  if (toneIdx >= 3) return rootDegree + scaleLen;
  return rootDegree + toneIdx * 2;
}

// Standard roman numerals plus a couple of "borrowed neighbor chord" tokens
// (bII, bIV) used for eerie progressions; unrecognized tokens fall back to
// the tonic (degree 1) rather than silently producing `undefined`.
const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, bii: 2, biv: 4 };
/** Parse a progression like 'I V vi IV I V vi IV' into one scale degree per bar. */
function parseProgression(prog: string): number[] {
  return prog
    .trim()
    .split(/\s+/)
    .map((tok) => ROMAN[tok.toLowerCase()] ?? 1);
}

// ---------------------------------------------------------------------------
// Pattern parsing
// ---------------------------------------------------------------------------

interface NoteEvent {
  /** Step index (within the full loop) this note starts on. */
  step: number;
  /** Duration in 16th-note steps (>=1), including any held '-' steps. */
  steps: number;
  /** Scale-degree token, or null for chord-tone patterns. */
  degree: number | null;
  /** Extra octave shift in semitones, for scale-degree tokens. */
  extraSemis: number;
  /** Chord-tone index (0-3), or null for scale-degree patterns. */
  toneIdx: number | null;
  velocity: number;
}

function parseDegreeChar(ch: string): { degree: number; extraSemis: number } | null {
  if (ch >= '1' && ch <= '9') return { degree: Number(ch), extraSemis: 0 };
  if (ch >= 'a' && ch <= 'g') return { degree: ch.charCodeAt(0) - 96, extraSemis: -12 };
  if (ch >= 'A' && ch <= 'G') return { degree: ch.charCodeAt(0) - 64, extraSemis: 12 };
  return null;
}

function parseToneChar(ch: string): { toneIdx: number } | null {
  if (ch >= '0' && ch <= '3') return { toneIdx: Number(ch) };
  return null;
}

/** Build note events for a melodic (scale-degree) pattern string. */
function buildDegreeEvents(pattern: string): NoteEvent[] {
  const events: NoteEvent[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    const parsed = parseDegreeChar(ch);
    if (!parsed) {
      i++;
      continue;
    }
    let steps = 1;
    let j = i + 1;
    while (j < pattern.length && pattern[j] === '-') {
      steps++;
      j++;
    }
    events.push({ step: i, steps, degree: parsed.degree, extraSemis: parsed.extraSemis, toneIdx: null, velocity: 1 });
    i = j;
  }
  return events;
}

/** Build note events for a chord-tone (arp/bass) pattern string. */
function buildToneEvents(pattern: string): NoteEvent[] {
  const events: NoteEvent[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    const parsed = parseToneChar(ch);
    if (!parsed) {
      i++;
      continue;
    }
    let steps = 1;
    let j = i + 1;
    while (j < pattern.length && pattern[j] === '-') {
      steps++;
      j++;
    }
    events.push({ step: i, steps, degree: null, extraSemis: 0, toneIdx: parsed.toneIdx, velocity: 1 });
    i = j;
  }
  return events;
}

/** Build note events for a drum pattern string ('.' rest, '1'-'3' velocity). */
function buildDrumEvents(pattern: string): NoteEvent[] {
  const events: NoteEvent[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch >= '1' && ch <= '3') {
      events.push({ step: i, steps: 1, degree: null, extraSemis: 0, toneIdx: null, velocity: Number(ch) / 3 });
    }
  }
  return events;
}

/** Index events by step for O(1) lookup during scheduling. */
function indexByStep(events: NoteEvent[]): Map<number, NoteEvent> {
  const map = new Map<number, NoteEvent>();
  for (const ev of events) map.set(ev.step, ev);
  return map;
}

/** Splice a replacement bar (stepsPerBar chars) into `pattern` at `barIndex`, for loop variation. */
function withVariantBar(pattern: string, barIndex: number, stepsPerBar: number, replacement?: string): string {
  if (!replacement) return pattern;
  const start = barIndex * stepsPerBar;
  if (start + stepsPerBar > pattern.length) return pattern;
  return pattern.slice(0, start) + replacement + pattern.slice(start + stepsPerBar);
}

// Dev-only sanity check (never throws): warns if a hand-authored pattern's
// length doesn't line up with the declared bar count.
function checkPatternLength(trackId: string, voice: string, pattern: string, stepsPerBar: number, bars: number): void {
  if (pattern.length !== stepsPerBar * bars) {
    console.warn(
      `[music] ${trackId}.${voice} pattern length ${pattern.length} != ${stepsPerBar}*${bars} (${stepsPerBar * bars})`
    );
  }
}

// ---------------------------------------------------------------------------
// Track definitions
// ---------------------------------------------------------------------------

interface SectionPatterns {
  lead: string;
  bass: string;
  arp: string;
  kick: string;
  snare: string;
  hat: string;
}

interface VariantBars {
  lead?: string;
  bass?: string;
  arp?: string;
  kick?: string;
  snare?: string;
  hat?: string;
}

interface TrackDef {
  bpm: number;
  rootMidi: number;
  mode: ModeName;
  /** One roman numeral per bar, covering the whole A+B loop (wraps if shorter). */
  progression: string;
  sections: { a: SectionPatterns; barsA: number; b: SectionPatterns; barsB: number };
  stepsPerBar?: number; // default 16 (4/4); 12 for a 3/4 waltz feel
  leadWave: 'square' | 'triangle';
  bassWave: 'sine' | 'triangle';
  leadFilterHz: number;
  useDelay?: boolean;
  /** Small variation applied to the LAST bar of the loop on every other repeat. */
  variation?: VariantBars;
  gainTrim?: number; // per-track loudness balance, default 1
}

function bars(...b: string[]): string {
  return b.join('');
}

/** Double a motif (e.g. an 8-char half-bar) into a full bar (e.g. 16 chars). */
function rep2(motif: string): string {
  return motif + motif;
}

export const TRACKS: Record<MusicId, TrackDef> = {
  // --- Title: wistful, grand, lydian lift -----------------------------------
  title: {
    bpm: 84,
    rootMidi: 57, // A3
    mode: 'lydian',
    progression: 'I V vi IV I V IV IV',
    stepsPerBar: 16,
    leadWave: 'triangle',
    bassWave: 'triangle',
    leadFilterHz: 2400,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '....5...4...3...',
          '2.......1.......',
          '....5...4...6...',
          '5...............'
        ),
        bass: bars('0...2...0...2...', '0...2...0...2...', '0...2...0...2...', '0.......0.......'),
        arp: bars('0.2.1.2.', '0.2.1.2.').repeat(4),
        kick: bars('1...............', '1.......1.......', '1...............', '1.......1.......'),
        snare: bars('........2.......', '........2.......', '........2.......', '........2.......'),
        hat: bars('..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '....7...6...5...',
          '4.......3.......',
          '....7...9...7...',
          '6...5...4.......'
        ),
        bass: bars('4...6...4...6...', '4...6...4...6...', '2...4...2...4...', '0.......0.......'),
        arp: bars(rep2('1.3.2.3.'), rep2('1.3.2.3.'), rep2('0.2.1.2.'), rep2('0.2.1.2.')),
        kick: bars('1.......1.......', '1...............', '1.......1.......', '1...1...1.......'),
        snare: bars('........2.......', '........2.......', '........2.......', '........3.......'),
        hat: bars('..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.', '..1.1.1...1...1.'),
      },
    },
    variation: { lead: '6...5...4...3...', kick: '1...1...1.......' },
    gainTrim: 1,
  },

  // --- Town: cozy, bouncy, major ---------------------------------------------
  town: {
    bpm: 112,
    rootMidi: 60, // C4
    mode: 'major',
    progression: 'I IV V I vi IV V I',
    stepsPerBar: 16,
    leadWave: 'square',
    bassWave: 'triangle',
    leadFilterHz: 2800,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1.3.5...4.3.....',
          '2.......1.......',
          '1.3.5...6.5.....',
          '4.3.2...1.......'
        ),
        bass: bars('0.2.0.2.0.2.0.2.', '3.5.3.5.3.5.3.5.', '4.6.4.6.4.6.4.6.', '0.2.0.2.0.2.0.2.'),
        arp: bars('0123', '0123', '0123', '0123').repeat(4),
        kick: bars('1...1...1...1...', '1...1...1...1...', '1...1...1...1...', '1...1...1...1...'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2.......3...'),
        hat: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '5.6.7...6.5.....',
          '4.3.2...1.......',
          '5.6.7...9.......',
          '7.6.5.4.3.2.1...'
        ),
        bass: bars('0.2.0.2.0.2.0.2.', '5.7.5.7.5.7.5.7.', '3.5.3.5.3.5.3.5.', '4.6.4.6.0.2.0...'),
        arp: bars('0123', '2103', '0123', '3210').repeat(4),
        kick: bars('1...1...1...1...', '1...1...1...1...', '1...1...1...1...', '1.1.1...1...1...'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2...2...3...'),
        hat: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1111111111111111'),
      },
    },
    variation: { lead: '5.6.7.9.7.6.5.4.', hat: '1111111111111111' },
  },

  // --- Meadow: pastoral, light, major pentatonic -----------------------------
  meadow: {
    bpm: 100,
    rootMidi: 57, // A3
    mode: 'majorPentatonic',
    progression: 'I V IV I I V IV I',
    stepsPerBar: 16,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadFilterHz: 2600,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1...2...3.......',
          '....2...1.......',
          '1...2...3...4...',
          '3...........1...'
        ),
        bass: bars('0.......0.......', '4.......4.......', '3.......3.......', '0.......0.......'),
        arp: bars(rep2('0.2.0.2.'), rep2('0.2.0.2.'), rep2('0.2.0.2.'), rep2('0.2.0.2.')),
        kick: bars('1.......2.......', '1.......2.......', '1.......2.......', '1.......2.......'),
        snare: bars('........2.......', '........2.......', '........2.......', '........2.......'),
        hat: bars('..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '4...3...2.......',
          '3.......4.......',
          '5...4...3...2...',
          '1...............'
        ),
        bass: bars('2.......2.......', '0.......0.......', '4.......4.......', '0.......0.......'),
        arp: bars(rep2('1.3.1.3.'), rep2('0.2.0.2.'), rep2('1.3.2.3.'), rep2('0.2.0.2.')),
        kick: bars('1.......2.......', '1.......2.......', '1.......2.......', '1...2...1.......'),
        snare: bars('........2.......', '........2.......', '........2.......', '........3.......'),
        hat: bars('..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.', '..1.1.1...1...1.'),
      },
    },
    variation: { lead: '5...4...3...2...' },
  },

  // --- Cave: sparse, echoey minor pentatonic, feedback delay -----------------
  cave: {
    bpm: 76,
    rootMidi: 55, // G3
    mode: 'minorPentatonic',
    progression: 'i iv v i i iv v i',
    stepsPerBar: 16,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadFilterHz: 1700,
    useDelay: true,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1...............',
          '....4...........',
          '................',
          '3.......1.......'
        ),
        bass: bars('0.......0.......', '0.......0.......', '3.......3.......', '0.......0.......'),
        arp: bars(rep2('........'), rep2('0.......'), rep2('........'), rep2('2.......')),
        kick: bars('1.......0.......', '0.......0.......', '1.......0.......', '0.......0.......'),
        snare: bars('........0.......', '0.......0.......', '........1.......', '0.......0.......'),
        hat: bars('....1.......1...', '................', '....1.......1...', '................'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '5...............',
          '....3...........',
          '....1...........',
          '................'
        ),
        bass: bars('4.......4.......', '0.......0.......', '3.......3.......', '0...............'),
        arp: bars(rep2('1.......'), rep2('........'), rep2('0.......'), rep2('........')),
        kick: bars('1.......0.......', '0.......1.......', '0.......0.......', '1.......0.......'),
        snare: bars('........0.......', '........1.......', '0.......0.......', '........0.......'),
        hat: bars('....1.......1...', '................', '....1...1.......', '................'),
      },
    },
    variation: { lead: '5.......4.......' },
    gainTrim: 1.05,
  },

  // --- Kelp: flowing, mysterious dorian --------------------------------------
  kelp: {
    bpm: 92,
    rootMidi: 59, // B3
    mode: 'dorian',
    progression: 'i IV i v i IV v i',
    stepsPerBar: 16,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadFilterHz: 2200,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1...3...5.......',
          '3.......1.......',
          '1...3...5...6...',
          '5...3...........'
        ),
        bass: bars('0...2...0...2...', '3...5...3...5...', '0...2...0...2...', '4...2...0.......'),
        arp: bars(rep2('0.2.1.2.'), rep2('0.2.1.2.'), rep2('0.2.1.2.'), rep2('0.2.1.2.')),
        kick: bars('1.......1.......', '1.......1.......', '1.......1.......', '1.......1.......'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2.......2...'),
        hat: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '6...5...3.......',
          '5.......6.......',
          '8...6...5...3...',
          '1...............'
        ),
        bass: bars('3...5...3...5...', '0...2...0...2...', '4...2...4...2...', '0...2...0.......'),
        arp: bars(rep2('1.3.2.3.'), rep2('0.2.1.2.'), rep2('2.4.3.4.'), rep2('0.2.1.2.')),
        kick: bars('1.......1.......', '1.......1.......', '1.......1.......', '1...1...1.......'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2...2...3...'),
        hat: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1111'),
      },
    },
    variation: { lead: '8...6...5...3...' },
  },

  // --- Outpost: breezy, adventurous mixolydian -------------------------------
  outpost: {
    bpm: 120,
    rootMidi: 62, // D4
    mode: 'mixolydian',
    progression: 'I IV I v IV I v I',
    stepsPerBar: 16,
    leadWave: 'square',
    bassWave: 'triangle',
    leadFilterHz: 3000,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1.3.5.......4.3.',
          '2.......1.......',
          '1.3.5.......6.5.',
          '4.......3.2.1...'
        ),
        bass: bars('0.2.0.2.0.2.0.2.', '3.5.3.5.3.5.3.5.', '0.2.0.2.0.2.0.2.', '4.6.4.6.0.2.0.2.'),
        arp: bars('0213', '0213', '0213', '0213').repeat(4),
        kick: bars('1...1.1.1...1...', '1...1.1.1...1...', '1...1.1.1...1...', '1...1.1.1...1...'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2.......3...'),
        hat: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '5.6.7.......6.5.',
          '4.......3.2.....',
          '5.6.8.......7.6.',
          '5.4.3.2.1.......'
        ),
        bass: bars('0.2.0.2.0.2.0.2.', '4.6.4.6.4.6.4.6.', '3.5.3.5.3.5.3.5.', '0.2.0.2.0.2.0.2.'),
        arp: bars('1203', '2103', '0213', '3210').repeat(4),
        kick: bars('1...1.1.1...1...', '1...1.1.1...1...', '1...1.1.1...1...', '1.1.1.1.1...1...'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2.2.....3...'),
        hat: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1111111111111111'),
      },
    },
    variation: { lead: '8.6.5.6.5.4.3.2.', hat: '1111111111111111' },
  },

  // --- Storm: driving, tense, natural minor -----------------------------------
  storm: {
    bpm: 138,
    rootMidi: 54, // F#3
    mode: 'aeolian',
    progression: 'i VI VII i i VI VII v',
    stepsPerBar: 16,
    leadWave: 'square',
    bassWave: 'triangle',
    leadFilterHz: 2500,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1.1.3.1.5.3.1...',
          '1.1.3.1.6.5.....',
          '1.1.3.1.5.3.1...',
          '4.3.2.1.........'
        ),
        bass: bars('0.0.0.0.0.0.0.0.', '5.5.5.5.5.5.5.5.', '6.6.6.6.6.6.6.6.', '0.0.0.0.4.4.4.4.'),
        arp: bars('0202', '0202', '1313', '0202').repeat(4),
        kick: bars('1.1.1...1.1.1...', '1.1.1...1.1.1...', '1.1.1...1.1.1...', '1.1.1...1.1.1...'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2.......3...'),
        hat: bars('1111111111111111', '1111111111111111', '1111111111111111', '1111111111111111'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '5.5.6.5.8.6.5...',
          '5.5.6.5.9.8.....',
          '5.5.6.5.8.6.5...',
          '4.3.2.1.........'
        ),
        bass: bars('4.4.4.4.4.4.4.4.', '0.0.0.0.0.0.0.0.', '5.5.5.5.5.5.5.5.', '0.0.0.0.0.0.0.0.'),
        arp: bars('2424', '0202', '1313', '0202').repeat(4),
        kick: bars('1.1.1...1.1.1...', '1.1.1...1.1.1...', '1.1.1...1.1.1...', '1.1.1.1.1.1.1...'),
        snare: bars('....2.......2...', '....2.......2...', '....2.......2...', '....2.2.....3...'),
        hat: bars('1111111111111111', '1111111111111111', '1111111111111111', '1111111111111111'),
      },
    },
    variation: { lead: '8.6.5.6.5.3.1.3.', kick: '1.1.1...1.1.1...' },
  },

  // --- Reef: dreamy, shimmering, lots of arp + delay --------------------------
  reef: {
    bpm: 70,
    rootMidi: 57, // A3
    mode: 'major',
    progression: 'I iii vi IV I iii ii V',
    stepsPerBar: 16,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadFilterHz: 2000,
    useDelay: true,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '................',
          '5.......4.......',
          '................',
          '3.......2.......'
        ),
        bass: bars('0.......0.......', '4.......4.......', '5.......5.......', '3.......3.......'),
        arp: bars(rep2('0.1.2.3.'), rep2('2.1.0.1.'), rep2('0.1.2.3.'), rep2('2.1.0.1.')),
        kick: bars('1...............', '................', '1...............', '................'),
        snare: bars('........0.......', '........1.......', '........0.......', '........1.......'),
        hat: bars('..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '................',
          '6.......5.......',
          '................',
          '4...3...2.......'
        ),
        bass: bars('1.......1.......', '5.......5.......', '2.......2.......', '4.......4.......'),
        arp: bars(rep2('1.2.3.4.'), rep2('0.1.2.3.'), rep2('1.2.3.4.'), rep2('0.1.2.3.')),
        kick: bars('1...............', '................', '1...............', '1.......1.......'),
        snare: bars('........0.......', '........1.......', '........0.......', '........1.......'),
        hat: bars('..1...1...1...1.', '..1...1...1...1.', '..1...1...1...1.', '..1.1.1...1...1.'),
      },
    },
    variation: { lead: '8.......6.......' },
    gainTrim: 1.1,
  },

  // --- Galleon: eerie 3/4 waltz, harmonic minor -------------------------------
  galleon: {
    bpm: 96,
    rootMidi: 52, // E3
    mode: 'harmonicMinor',
    progression: 'i iv V i i VI V i',
    stepsPerBar: 12,
    leadWave: 'triangle',
    bassWave: 'triangle',
    leadFilterHz: 2100,
    sections: {
      barsA: 4,
      a: {
        lead: bars('1.......5...', '3.......1...', '1.......5...', '4.......3...'),
        bass: bars('0.......0...', '3.......3...', '4.......4...', '0.......0...'),
        arp: bars('0.1.2.', '0.1.2.', '0.1.2.', '0.1.2.'),
        kick: bars('1.......0...', '1.......0...', '1.......0...', '1.......0...'),
        snare: bars('....2...0...', '....2...0...', '....2...0...', '....2...0...'),
        hat: bars('..1...1...1.', '..1...1...1.', '..1...1...1.', '..1...1...1.'),
      },
      barsB: 4,
      b: {
        lead: bars('6.......5...', '4.......3...', '6.......8...', '7.......5...'),
        bass: bars('3.......3...', '0.......0...', '5.......5...', '4.......4...'),
        arp: bars('1.2.3.', '0.1.2.', '2.3.4.', '1.2.3.'),
        kick: bars('1.......0...', '1.......0...', '1.......0...', '1...0...1...'),
        snare: bars('....2...0...', '....2...0...', '....2...0...', '....2...3...'),
        hat: bars('..1...1...1.', '..1...1...1.', '..1...1...1.', '..1.1.1...1.'),
      },
    },
    variation: { lead: '8.......5...3...' },
  },

  // --- Hollow: dark ambient pulse, heartbeat kick, phrygian -------------------
  hollow: {
    bpm: 60,
    rootMidi: 45, // A2
    mode: 'phrygian',
    progression: 'i bII i v i bII i v',
    stepsPerBar: 16,
    leadWave: 'triangle',
    bassWave: 'sine',
    leadFilterHz: 1100,
    useDelay: true,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '................',
          '1...............',
          '................',
          '................'
        ),
        bass: bars('0...............', '0...............', '0...............', '0...............'),
        arp: bars('........', '0.......', '........', '........'),
        kick: bars('3.2.............', '3.2.............', '3.2.............', '3.2.............'),
        snare: bars('................', '................', '................', '................'),
        hat: bars('................', '........1.......', '................', '........1.......'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '................',
          '3...............',
          '................',
          '2...............'
        ),
        bass: bars('1...............', '1...............', '4...............', '0...............'),
        arp: bars('1.......', '........', '2.......', '........'),
        kick: bars('3.2.............', '3.2.............', '3.2.............', '3.2.2...........'),
        snare: bars('................', '................', '................', '................'),
        hat: bars('................', '........1.......', '................', '........1.......'),
      },
    },
    variation: { kick: '3.2.3...........' },
    gainTrim: 1.1,
  },

  // --- Boss: fast, intense, minor ---------------------------------------------
  boss: {
    bpm: 150,
    rootMidi: 67, // G4
    mode: 'aeolian',
    progression: 'i VII VI VII i VII VI v',
    stepsPerBar: 16,
    leadWave: 'square',
    bassWave: 'triangle',
    leadFilterHz: 3000,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1.3.5.3.1.3.5...',
          '7.5.3.1.........',
          '6.8.6.5.3.......',
          '1.3.5.1.........'
        ),
        bass: bars('0.0.0.0.0.0.0.0.', '7.7.7.7.7.7.7.7.', '5.5.5.5.5.5.5.5.', '7.7.7.7.7.7.7.7.'),
        arp: bars('0213', '0213', '0213', '0213').repeat(4),
        kick: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.'),
        snare: bars('..2...2...2...2.', '..2...2...2...2.', '..2...2...2...2.', '..2...2...2...3.'),
        hat: bars('1111111111111111', '1111111111111111', '1111111111111111', '1111111111111111'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '8.6.5.6.8.6.5...',
          '3.5.3.1.........',
          '6.8.9.8.6.......',
          '5.3.1.5.........'
        ),
        bass: bars('5.5.5.5.5.5.5.5.', '0.0.0.0.0.0.0.0.', '6.6.6.6.6.6.6.6.', '7.7.7.7.0.0.0.0.'),
        arp: bars('2103', '0213', '1324', '0213').repeat(4),
        kick: bars('1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1.1.1.1.1.1.1.1.', '1111111111111111'),
        snare: bars('..2...2...2...2.', '..2...2...2...2.', '..2...2...2...2.', '..2.2.2...2...3.'),
        hat: bars('1111111111111111', '1111111111111111', '1111111111111111', '1111111111111111'),
      },
    },
    variation: { lead: '9.8.6.5.3.1.3.5.8.6.5.3.1.......', kick: '1111111111111111111111111111111'.slice(0, 16) },
  },

  // --- Final boss: epic, harmonic minor, big bass -----------------------------
  finalboss: {
    bpm: 144,
    rootMidi: 57, // A3
    mode: 'harmonicMinor',
    progression: 'i VI VII i iv VI VII v',
    stepsPerBar: 16,
    leadWave: 'square',
    bassWave: 'triangle',
    leadFilterHz: 2800,
    sections: {
      barsA: 4,
      a: {
        lead: bars(
          '1.3.5.8.5.3.1...',
          '6.8.6.5.3.......',
          '7.9.7.5.3.......',
          '1.3.5.8.........'
        ),
        bass: bars('0.0.0.0.0.0.0.0.', '5.5.5.5.5.5.5.5.', '6.6.6.6.6.6.6.6.', '0.0.0.0.0.0.0.0.'),
        arp: bars('0213', '0213', '1324', '0213').repeat(4),
        kick: bars('1.1.1...1.1.1...', '1.1.1...1.1.1...', '1.1.1...1.1.1...', '1.1.1...1.1.1...'),
        snare: bars('..2...2...2...2.', '..2...2...2...2.', '..2...2...2...2.', '..2...2...2...3.'),
        hat: bars('1111111111111111', '1111111111111111', '1111111111111111', '1111111111111111'),
      },
      barsB: 4,
      b: {
        lead: bars(
          '8.6.5.3.5.6.8...',
          '9.8.6.5.3.......',
          '1.3.5.8.9.8.6...',
          '5.3.1.5.........'
        ),
        bass: bars('3.3.3.3.3.3.3.3.', '0.0.0.0.0.0.0.0.', '4.4.4.4.4.4.4.4.', '0.0.0.0.5.5.5.5.'),
        arp: bars('2103', '0213', '2436', '0213').repeat(4),
        kick: bars('1.1.1...1.1.1...', '1.1.1...1.1.1...', '1.1.1...1.1.1...', '1111111111111111'),
        snare: bars('..2...2...2...2.', '..2...2...2...2.', '..2...2...2...2.', '..2.2.2...2...3.'),
        hat: bars('1111111111111111', '1111111111111111', '1111111111111111', '1111111111111111'),
      },
    },
    variation: {
      lead: '9.8.6.5.3.1.3.5.6.8.9.8.6.5.3...',
      bass: '0.0.0.0.0.0.0.0.5.5.5.5.5.5.5.5.',
    },
    gainTrim: 1.05,
  },
};

// ---------------------------------------------------------------------------
// Shared feedback delay send (used by tracks with useDelay)
// ---------------------------------------------------------------------------

let delayBusInput: GainNode | null = null;
function getDelayBus(ctx: AudioContext, destination: AudioNode): GainNode {
  if (delayBusInput) return delayBusInput;
  const input = ctx.createGain();
  input.gain.value = 1;
  const delay = ctx.createDelay(1.2);
  delay.delayTime.value = 0.34;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.36;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 2200;
  const wet = ctx.createGain();
  wet.gain.value = 0.5;

  input.connect(delay);
  delay.connect(lowpass);
  lowpass.connect(feedback);
  feedback.connect(delay); // feedback loop
  lowpass.connect(wet);
  wet.connect(destination);

  delayBusInput = input;
  return input;
}

// ---------------------------------------------------------------------------
// Playing-song state & scheduler
// ---------------------------------------------------------------------------

interface VoiceEvents {
  base: Map<number, NoteEvent>;
  alt: Map<number, NoteEvent>;
}

interface Song {
  id: MusicId;
  gain: GainNode;
  def: TrackDef;
  scale: readonly number[];
  chords: number[]; // one scale degree per bar, whole loop
  stepsPerBar: number;
  totalSteps: number;
  stepDur: number; // seconds per 16th step
  nextStepTime: number;
  stepIndex: number; // absolute step counter (not wrapped)
  loopCount: number;
  timerId: number | null;
  stopping: boolean;
  events: { lead: VoiceEvents; bass: VoiceEvents; arp: VoiceEvents; kick: VoiceEvents; snare: VoiceEvents; hat: VoiceEvents };
  send?: Send;
}

let currentSong: Song | null = null;
let pendingSongs: Song[] = []; // fading-out songs still finishing their release
let currentMusicId: MusicId | null = null;

const SCHEDULE_INTERVAL_MS = 25;
const LOOKAHEAD_SEC = 0.12;
const CROSSFADE_SEC = 1.5;
const MUSIC_TRACK_TRIM = 0.35; // music master relative to sfx, per spec

function buildSong(id: MusicId, def: TrackDef, ctx: AudioContext, musicGain: GainNode): Song {
  const scale = MODES[def.mode];
  const stepsPerBar = def.stepsPerBar ?? 16;
  const barsA = def.sections.barsA;
  const barsB = def.sections.barsB;
  const totalBars = barsA + barsB;
  const totalSteps = totalBars * stepsPerBar;

  const full: SectionPatterns = {
    lead: def.sections.a.lead + def.sections.b.lead,
    bass: def.sections.a.bass + def.sections.b.bass,
    arp: def.sections.a.arp + def.sections.b.arp,
    kick: def.sections.a.kick + def.sections.b.kick,
    snare: def.sections.a.snare + def.sections.b.snare,
    hat: def.sections.a.hat + def.sections.b.hat,
  };

  (['lead', 'bass', 'arp', 'kick', 'snare', 'hat'] as const).forEach((v) => {
    checkPatternLength(id, v, full[v], stepsPerBar, totalBars);
  });

  const lastBar = totalBars - 1;
  const variantFull: SectionPatterns = {
    lead: withVariantBar(full.lead, lastBar, stepsPerBar, def.variation?.lead),
    bass: withVariantBar(full.bass, lastBar, stepsPerBar, def.variation?.bass),
    arp: withVariantBar(full.arp, lastBar, stepsPerBar, def.variation?.arp),
    kick: withVariantBar(full.kick, lastBar, stepsPerBar, def.variation?.kick),
    snare: withVariantBar(full.snare, lastBar, stepsPerBar, def.variation?.snare),
    hat: withVariantBar(full.hat, lastBar, stepsPerBar, def.variation?.hat),
  };

  const events = {
    lead: { base: indexByStep(buildDegreeEvents(full.lead)), alt: indexByStep(buildDegreeEvents(variantFull.lead)) },
    bass: { base: indexByStep(buildToneEvents(full.bass)), alt: indexByStep(buildToneEvents(variantFull.bass)) },
    arp: { base: indexByStep(buildToneEvents(full.arp)), alt: indexByStep(buildToneEvents(variantFull.arp)) },
    kick: { base: indexByStep(buildDrumEvents(full.kick)), alt: indexByStep(buildDrumEvents(variantFull.kick)) },
    snare: { base: indexByStep(buildDrumEvents(full.snare)), alt: indexByStep(buildDrumEvents(variantFull.snare)) },
    hat: { base: indexByStep(buildDrumEvents(full.hat)), alt: indexByStep(buildDrumEvents(variantFull.hat)) },
  };

  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(musicGain);

  const send: Send | undefined = def.useDelay ? { node: getDelayBus(ctx, musicGain), amount: 0.28 } : undefined;

  const chords = parseProgression(def.progression);

  return {
    id,
    gain,
    def,
    scale,
    chords,
    stepsPerBar,
    totalSteps,
    stepDur: 60 / def.bpm / 4,
    nextStepTime: ctx.currentTime + 0.05,
    stepIndex: 0,
    loopCount: 0,
    timerId: null,
    stopping: false,
    events,
    send,
  };
}

function triggerLead(song: Song, ev: NoteEvent, time: number, ctx: AudioContext): void {
  if (ev.degree === null) return;
  const freq = degreeToFreq(song.def.rootMidi, song.scale, ev.degree, ev.extraSemis);
  const dur = ev.steps * song.stepDur;
  const trim = (song.def.gainTrim ?? 1) * MUSIC_TRACK_TRIM;
  playLeadVoice(freq, Math.max(dur - 0.02, 0.06), {
    wave: song.def.leadWave,
    filterFreq: song.def.leadFilterHz,
    attack: 0.008,
    release: Math.min(0.14, dur * 0.35),
    maxGain: 0.32 * trim,
    destination: song.gain,
    send: song.send,
    time,
  });
}

function triggerBass(song: Song, ev: NoteEvent, chordDegree: number, time: number, ctx: AudioContext): void {
  if (ev.toneIdx === null) return;
  const degree = chordToneDegree(chordDegree, Math.min(ev.toneIdx, 2), song.scale.length);
  const freq = degreeToFreq(song.def.rootMidi, song.scale, degree, -24);
  const dur = ev.steps * song.stepDur;
  const trim = (song.def.gainTrim ?? 1) * MUSIC_TRACK_TRIM;
  if (song.def.bassWave === 'sine') {
    playSineWave(freq, Math.max(dur - 0.015, 0.08), {
      attack: 0.012,
      decay: 0.06,
      sustain: 0.55,
      release: Math.min(0.18, dur * 0.4),
      maxGain: 0.4 * trim,
      destination: song.gain,
      time,
    });
  } else {
    playTriangleWave(freq, Math.max(dur - 0.015, 0.08), {
      attack: 0.01,
      decay: 0.05,
      sustain: 0.5,
      release: Math.min(0.16, dur * 0.4),
      maxGain: 0.36 * trim,
      destination: song.gain,
      time,
    });
  }
}

function triggerArp(song: Song, ev: NoteEvent, chordDegree: number, time: number, ctx: AudioContext): void {
  if (ev.toneIdx === null) return;
  const degree = chordToneDegree(chordDegree, ev.toneIdx, song.scale.length);
  const freq = degreeToFreq(song.def.rootMidi, song.scale, degree, 0);
  const dur = ev.steps * song.stepDur;
  const trim = (song.def.gainTrim ?? 1) * MUSIC_TRACK_TRIM;
  playSineWave(freq, Math.max(dur - 0.01, 0.05), {
    attack: 0.006,
    decay: 0.05,
    sustain: 0.3,
    release: Math.min(0.12, dur * 0.5),
    maxGain: 0.16 * trim,
    destination: song.gain,
    send: song.send,
    time,
  });
}

function triggerKick(song: Song, ev: NoteEvent, time: number): void {
  const trim = (song.def.gainTrim ?? 1) * MUSIC_TRACK_TRIM;
  const isHeartbeat = song.def.mode === 'phrygian' && song.def.bpm <= 65;
  playKick(isHeartbeat ? 0.35 : 0.18, {
    pitch: isHeartbeat ? 65 : 95,
    endPitch: isHeartbeat ? 25 : 32,
    maxGain: (isHeartbeat ? 0.55 : 0.4) * ev.velocity * trim,
    destination: song.gain,
    time,
  });
}

function triggerSnare(song: Song, ev: NoteEvent, time: number): void {
  const trim = (song.def.gainTrim ?? 1) * MUSIC_TRACK_TRIM;
  playSnareDrum(0.14, { maxGain: 0.32 * ev.velocity * trim, destination: song.gain, send: song.send, time });
}

function triggerHat(song: Song, ev: NoteEvent, time: number): void {
  const trim = (song.def.gainTrim ?? 1) * MUSIC_TRACK_TRIM;
  playHatDrum(0.045, { maxGain: 0.16 * ev.velocity * trim, destination: song.gain, time });
}

function scheduleStep(song: Song, ctx: AudioContext): void {
  const step = song.stepIndex % song.totalSteps;
  const bar = Math.floor(step / song.stepsPerBar);
  const barsTotal = song.totalSteps / song.stepsPerBar;
  const chordDegree = song.chords[bar % song.chords.length] ?? 1;
  const useAlt = song.loopCount % 2 === 1 && bar === barsTotal - 1;
  const time = song.nextStepTime;

  const leadEv = (useAlt ? song.events.lead.alt : song.events.lead.base).get(step);
  if (leadEv) triggerLead(song, leadEv, time, ctx);

  const bassEv = (useAlt ? song.events.bass.alt : song.events.bass.base).get(step);
  if (bassEv) triggerBass(song, bassEv, chordDegree, time, ctx);

  const arpEv = (useAlt ? song.events.arp.alt : song.events.arp.base).get(step);
  if (arpEv) triggerArp(song, arpEv, chordDegree, time, ctx);

  const kickEv = (useAlt ? song.events.kick.alt : song.events.kick.base).get(step);
  if (kickEv) triggerKick(song, kickEv, time);

  const snareEv = (useAlt ? song.events.snare.alt : song.events.snare.base).get(step);
  if (snareEv) triggerSnare(song, snareEv, time);

  const hatEv = (useAlt ? song.events.hat.alt : song.events.hat.base).get(step);
  if (hatEv) triggerHat(song, hatEv, time);

  song.stepIndex++;
  if (song.stepIndex % song.totalSteps === 0) song.loopCount++;
  song.nextStepTime += song.stepDur;
}

function startScheduler(song: Song, ctx: AudioContext): void {
  const tick = () => {
    if (song.stopping) return;
    while (song.nextStepTime < ctx.currentTime + LOOKAHEAD_SEC) {
      scheduleStep(song, ctx);
    }
  };
  song.timerId = window.setInterval(tick, SCHEDULE_INTERVAL_MS);
  tick();
}

function stopSong(song: Song): void {
  song.stopping = true;
  if (song.timerId !== null) {
    clearInterval(song.timerId);
    song.timerId = null;
  }
}

function fadeAndRemove(song: Song, ctx: AudioContext, durationSec: number, thenDisconnect: boolean): void {
  const now = ctx.currentTime;
  song.gain.gain.cancelScheduledValues(now);
  song.gain.gain.setValueAtTime(song.gain.gain.value, now);
  song.gain.gain.linearRampToValueAtTime(0, now + durationSec);
  window.setTimeout(
    () => {
      stopSong(song);
      if (thenDisconnect) {
        try {
          song.gain.disconnect();
        } catch {
          // already disconnected
        }
      }
      pendingSongs = pendingSongs.filter((s) => s !== song);
    },
    durationSec * 1000 + 50
  );
}

/**
 * Start playing music for a region, crossfading with whatever is currently
 * playing. No-op if the same track is already the current (or fading-in) one.
 */
export function playMusicTrack(id: MusicId): void {
  if (currentMusicId === id) return;

  const { ctx, musicGain } = getAudioContext();
  if (!ctx || !musicGain) return;

  const def = TRACKS[id];
  if (!def) {
    console.warn(`Unknown music track: ${id}`);
    return;
  }

  // Move the outgoing current song to the fade-out list; it keeps scheduling
  // (so it doesn't cut off mid-phrase) until its own gain ramp finishes, then
  // stops and disconnects independently of the new track's gain node.
  if (currentSong) {
    const outgoing = currentSong;
    fadeAndRemove(outgoing, ctx, CROSSFADE_SEC, true);
    pendingSongs.push(outgoing);
  }
  // Also cancel any older still-fading songs beyond a small cap, to bound CPU use.
  while (pendingSongs.length > 2) {
    const stale = pendingSongs.shift();
    if (stale) {
      stopSong(stale);
      try {
        stale.gain.disconnect();
      } catch {
        // already disconnected
      }
    }
  }

  const song = buildSong(id, def, ctx, musicGain);
  currentSong = song;
  currentMusicId = id;

  const now = ctx.currentTime;
  song.gain.gain.setValueAtTime(0, now);
  song.gain.gain.linearRampToValueAtTime(1, now + CROSSFADE_SEC);

  startScheduler(song, ctx);
}

/**
 * Fade out and stop all music.
 */
export function stopMusicTrack(durationMs: number = 1000): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;
  const durationSec = Math.max(durationMs / 1000, 0.05);

  if (currentSong) {
    fadeAndRemove(currentSong, ctx, durationSec, true);
    pendingSongs.push(currentSong);
    currentSong = null;
  }
  currentMusicId = null;

  for (const song of pendingSongs) {
    // Already fading songs: leave their own fade-out alone, just let them finish.
    void song;
  }
}
