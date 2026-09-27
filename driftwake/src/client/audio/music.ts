/**
 * Generative music with step sequencer.
 * Each MusicId gets its own key, scale, tempo, and patterns.
 */

import type { MusicId } from '@shared/types';
import { getAudioContext } from './context';
import { playSineWave, playSquareWave, playNoise, playKick } from './instruments';

interface SequencerNote {
  freq: number | null; // null = rest
  duration: number; // in steps
  velocity?: number; // 0..1
}

interface SequencerPattern {
  name: string;
  steps: SequencerNote[];
  bpm: number;
  noteLength: number; // ms per step
}

interface MusicConfig {
  key: number; // Base frequency (Hz)
  scale: number[]; // Intervals above key in semitones
  patterns: {
    lead: SequencerPattern;
    bass: SequencerPattern;
    arp: SequencerPattern;
    kick: SequencerPattern;
    snare: SequencerPattern;
    hat: SequencerPattern;
  };
  loop: boolean;
  crossfadeMs?: number;
}

let currentMusicId: MusicId | null = null;
let currentOscillators: OscillatorNode[] = [];
let currentSources: AudioBufferSourceNode[] = [];
let fadeOutId: number | null = null;
let fadeOutGain: GainNode | null = null;

/** Convert semitone offset to frequency multiplier */
function semitoneToFreq(base: number, semitones: number): number {
  return base * Math.pow(2, semitones / 12);
}

/**
 * Music configurations for each region.
 */
const MUSIC_CONFIGS: Record<MusicId, MusicConfig> = {
  title: {
    key: 220, // A3
    scale: [0, 2, 4, 5, 7, 9, 11], // A major scale
    patterns: {
      lead: {
        name: 'Wistful title melody',
        steps: [
          { freq: 0, duration: 2 }, // Rest
          { freq: 4, duration: 1 }, // E (0+4 semitones)
          { freq: 7, duration: 1 }, // B
          { freq: 9, duration: 2 }, // C#
          { freq: 7, duration: 1 }, // B
          { freq: 4, duration: 2 }, // E
        ],
        bpm: 100,
        noteLength: 150,
      },
      bass: {
        name: 'Title bass',
        steps: [
          { freq: -12, duration: 4 }, // Root lower octave
          { freq: -10, duration: 2 }, // Next note
          { freq: -12, duration: 4 },
          { freq: -5, duration: 2 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      arp: {
        name: 'Title pad',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 4, duration: 1 },
          { freq: 7, duration: 2 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      kick: {
        name: 'Title kick',
        steps: [
          { freq: 1, duration: 2 }, // Dummy value, not used by kick
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      snare: {
        name: 'Title snare',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      hat: {
        name: 'Title hat',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
        ],
        bpm: 100,
        noteLength: 150,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  town: {
    key: 262, // C4 (cozy)
    scale: [0, 2, 4, 5, 7, 9, 11], // C major
    patterns: {
      lead: {
        name: 'Town bouncy melody',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 4, duration: 1 },
          { freq: 7, duration: 2 },
          { freq: 5, duration: 1 },
          { freq: 4, duration: 2 },
          { freq: 2, duration: 1 },
        ],
        bpm: 120,
        noteLength: 125,
      },
      bass: {
        name: 'Town bass',
        steps: [
          { freq: -12, duration: 4 },
          { freq: -8, duration: 2 },
          { freq: -12, duration: 2 },
          { freq: -3, duration: 2 },
        ],
        bpm: 120,
        noteLength: 125,
      },
      arp: {
        name: 'Town arp',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 4, duration: 1 },
          { freq: 7, duration: 1 },
          { freq: 4, duration: 1 },
        ],
        bpm: 120,
        noteLength: 125,
      },
      kick: {
        name: 'Town kick',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
        ],
        bpm: 120,
        noteLength: 125,
      },
      snare: {
        name: 'Town snare',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
        ],
        bpm: 120,
        noteLength: 125,
      },
      hat: {
        name: 'Town hat',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 0, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 0, duration: 1 },
        ],
        bpm: 120,
        noteLength: 125,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  meadow: {
    key: 220, // A3 (pastoral)
    scale: [0, 2, 4, 5, 7, 9, 11], // A major
    patterns: {
      lead: {
        name: 'Meadow light melody',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 2, duration: 1 },
          { freq: 4, duration: 2 },
          { freq: 5, duration: 1 },
          { freq: 7, duration: 3 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      bass: {
        name: 'Meadow bass',
        steps: [
          { freq: -12, duration: 4 },
          { freq: -8, duration: 4 },
          { freq: -7, duration: 4 },
          { freq: -5, duration: 4 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      arp: {
        name: 'Meadow arp',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 4, duration: 2 },
          { freq: 7, duration: 2 },
          { freq: 5, duration: 2 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      kick: {
        name: 'Meadow kick',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 6 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      snare: {
        name: 'Meadow snare',
        steps: [
          { freq: 0, duration: 4 },
          { freq: 1, duration: 4 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      hat: {
        name: 'Meadow hat',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 1 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 1 },
        ],
        bpm: 90,
        noteLength: 167,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  cave: {
    key: 196, // G3 (sparse, minor-ish)
    scale: [0, 3, 5, 7, 10], // G minor pentatonic
    patterns: {
      lead: {
        name: 'Cave sparse melody',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 5, duration: 2 },
          { freq: 0, duration: 4 },
          { freq: 7, duration: 2 },
          { freq: 5, duration: 2 },
          { freq: 3, duration: 4 },
        ],
        bpm: 80,
        noteLength: 188,
      },
      bass: {
        name: 'Cave bass',
        steps: [
          { freq: -12, duration: 8 },
          { freq: -8, duration: 4 },
          { freq: -12, duration: 4 },
        ],
        bpm: 80,
        noteLength: 188,
      },
      arp: {
        name: 'Cave arp',
        steps: [
          { freq: 0, duration: 3 },
          { freq: 5, duration: 3 },
          { freq: 0, duration: 2 },
          { freq: -5, duration: 2 },
        ],
        bpm: 80,
        noteLength: 188,
      },
      kick: {
        name: 'Cave kick',
        steps: [
          { freq: 1, duration: 4 },
          { freq: 0, duration: 4 },
          { freq: 1, duration: 4 },
          { freq: 0, duration: 4 },
        ],
        bpm: 80,
        noteLength: 188,
      },
      snare: {
        name: 'Cave snare',
        steps: [
          { freq: 0, duration: 4 },
          { freq: 1, duration: 4 },
          { freq: 0, duration: 4 },
          { freq: 1, duration: 4 },
        ],
        bpm: 80,
        noteLength: 188,
      },
      hat: {
        name: 'Cave hat',
        steps: [
          { freq: 1, duration: 4 },
          { freq: 0, duration: 4 },
        ],
        bpm: 80,
        noteLength: 188,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  kelp: {
    key: 246.94, // B3 (flowing, mysterious)
    scale: [0, 2, 3, 5, 7, 8, 11], // B Dorian mode
    patterns: {
      lead: {
        name: 'Kelp flowing melody',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 3, duration: 1 },
          { freq: 5, duration: 2 },
          { freq: 3, duration: 1 },
          { freq: 0, duration: 3 },
          { freq: 8, duration: 1 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      bass: {
        name: 'Kelp bass',
        steps: [
          { freq: -12, duration: 4 },
          { freq: -10, duration: 2 },
          { freq: -12, duration: 2 },
          { freq: -5, duration: 4 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      arp: {
        name: 'Kelp arp',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 5, duration: 1 },
          { freq: 8, duration: 2 },
          { freq: 3, duration: 2 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      kick: {
        name: 'Kelp kick',
        steps: [
          { freq: 1, duration: 3 },
          { freq: 0, duration: 3 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 4 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      snare: {
        name: 'Kelp snare',
        steps: [
          { freq: 0, duration: 3 },
          { freq: 1, duration: 3 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 4 },
        ],
        bpm: 100,
        noteLength: 150,
      },
      hat: {
        name: 'Kelp hat',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 1 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 1 },
        ],
        bpm: 100,
        noteLength: 150,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  outpost: {
    key: 293.66, // D4 (breezy, adventurous)
    scale: [0, 2, 4, 5, 7, 9, 11], // D major
    patterns: {
      lead: {
        name: 'Outpost adventurous melody',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 2, duration: 1 },
          { freq: 4, duration: 2 },
          { freq: 5, duration: 1 },
          { freq: 7, duration: 2 },
          { freq: 9, duration: 1 },
        ],
        bpm: 110,
        noteLength: 136,
      },
      bass: {
        name: 'Outpost bass',
        steps: [
          { freq: -12, duration: 3 },
          { freq: -9, duration: 2 },
          { freq: -12, duration: 3 },
          { freq: -5, duration: 2 },
        ],
        bpm: 110,
        noteLength: 136,
      },
      arp: {
        name: 'Outpost arp',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 4, duration: 1 },
          { freq: 7, duration: 2 },
        ],
        bpm: 110,
        noteLength: 136,
      },
      kick: {
        name: 'Outpost kick',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
        ],
        bpm: 110,
        noteLength: 136,
      },
      snare: {
        name: 'Outpost snare',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 2 },
        ],
        bpm: 110,
        noteLength: 136,
      },
      hat: {
        name: 'Outpost hat',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
        ],
        bpm: 110,
        noteLength: 136,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  storm: {
    key: 185, // F#3 (driving, tense)
    scale: [0, 3, 5, 7, 10], // F# minor pentatonic
    patterns: {
      lead: {
        name: 'Storm driving melody',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 5, duration: 1 },
          { freq: 7, duration: 1 },
          { freq: 10, duration: 1 },
          { freq: 7, duration: 1 },
          { freq: 5, duration: 2 },
        ],
        bpm: 130,
        noteLength: 115,
      },
      bass: {
        name: 'Storm bass',
        steps: [
          { freq: -12, duration: 2 },
          { freq: -8, duration: 2 },
          { freq: -12, duration: 2 },
          { freq: -7, duration: 2 },
        ],
        bpm: 130,
        noteLength: 115,
      },
      arp: {
        name: 'Storm arp',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 5, duration: 1 },
          { freq: 10, duration: 2 },
        ],
        bpm: 130,
        noteLength: 115,
      },
      kick: {
        name: 'Storm kick',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 1 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 1 },
        ],
        bpm: 130,
        noteLength: 115,
      },
      snare: {
        name: 'Storm snare',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 1, duration: 1 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 1 },
        ],
        bpm: 130,
        noteLength: 115,
      },
      hat: {
        name: 'Storm hat',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 1, duration: 1 },
        ],
        bpm: 130,
        noteLength: 115,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  reef: {
    key: 220, // A3 (dreamy, shimmering, slow)
    scale: [0, 2, 4, 5, 7, 9, 11], // A major
    patterns: {
      lead: {
        name: 'Reef dreamy melody',
        steps: [
          { freq: 0, duration: 3 },
          { freq: 4, duration: 2 },
          { freq: 7, duration: 3 },
          { freq: 5, duration: 4 },
          { freq: 4, duration: 2 },
          { freq: 2, duration: 2 },
        ],
        bpm: 60,
        noteLength: 250,
      },
      bass: {
        name: 'Reef bass',
        steps: [
          { freq: -12, duration: 6 },
          { freq: -8, duration: 4 },
          { freq: -12, duration: 6 },
        ],
        bpm: 60,
        noteLength: 250,
      },
      arp: {
        name: 'Reef arp',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 4, duration: 2 },
          { freq: 7, duration: 2 },
          { freq: 5, duration: 2 },
        ],
        bpm: 60,
        noteLength: 250,
      },
      kick: {
        name: 'Reef kick',
        steps: [
          { freq: 1, duration: 4 },
          { freq: 0, duration: 8 },
          { freq: 1, duration: 4 },
          { freq: 0, duration: 4 },
        ],
        bpm: 60,
        noteLength: 250,
      },
      snare: {
        name: 'Reef snare',
        steps: [
          { freq: 0, duration: 6 },
          { freq: 1, duration: 6 },
          { freq: 0, duration: 4 },
          { freq: 1, duration: 2 },
        ],
        bpm: 60,
        noteLength: 250,
      },
      hat: {
        name: 'Reef hat',
        steps: [
          { freq: 1, duration: 3 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 3 },
          { freq: 0, duration: 2 },
        ],
        bpm: 60,
        noteLength: 250,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  galleon: {
    key: 164.81, // E3 (eerie waltz, 3/4 time)
    scale: [0, 3, 5, 7, 10], // E minor pentatonic
    patterns: {
      lead: {
        name: 'Galleon eerie melody',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 5, duration: 1 },
          { freq: 7, duration: 2 },
          { freq: 10, duration: 1 },
          { freq: 7, duration: 1 },
          { freq: 5, duration: 1 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      bass: {
        name: 'Galleon bass',
        steps: [
          { freq: -12, duration: 3 },
          { freq: -8, duration: 3 },
          { freq: -12, duration: 3 },
          { freq: -5, duration: 3 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      arp: {
        name: 'Galleon arp',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 5, duration: 1 },
          { freq: 7, duration: 2 },
          { freq: 3, duration: 1 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      kick: {
        name: 'Galleon kick',
        steps: [
          { freq: 1, duration: 3 },
          { freq: 0, duration: 3 },
          { freq: 1, duration: 3 },
          { freq: 0, duration: 3 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      snare: {
        name: 'Galleon snare',
        steps: [
          { freq: 0, duration: 3 },
          { freq: 1, duration: 3 },
          { freq: 0, duration: 3 },
          { freq: 1, duration: 3 },
        ],
        bpm: 90,
        noteLength: 167,
      },
      hat: {
        name: 'Galleon hat',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 1 },
        ],
        bpm: 90,
        noteLength: 167,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  hollow: {
    key: 110, // A2 (dark ambient, heartbeat pulse)
    scale: [0, 3, 5, 7, 10], // A minor pentatonic
    patterns: {
      lead: {
        name: 'Hollow dark ambient',
        steps: [
          { freq: 0, duration: 4 },
          { freq: -5, duration: 4 },
          { freq: 0, duration: 4 },
          { freq: 3, duration: 4 },
        ],
        bpm: 50,
        noteLength: 300,
      },
      bass: {
        name: 'Hollow bass',
        steps: [
          { freq: -12, duration: 8 },
          { freq: -10, duration: 4 },
          { freq: -12, duration: 4 },
        ],
        bpm: 50,
        noteLength: 300,
      },
      arp: {
        name: 'Hollow arp',
        steps: [
          { freq: 0, duration: 4 },
          { freq: -7, duration: 4 },
          { freq: -5, duration: 2 },
          { freq: 0, duration: 2 },
        ],
        bpm: 50,
        noteLength: 300,
      },
      kick: {
        name: 'Hollow heartbeat kick',
        steps: [
          { freq: 1, duration: 3 },
          { freq: 0, duration: 3 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 8 },
        ],
        bpm: 50,
        noteLength: 300,
      },
      snare: {
        name: 'Hollow snare',
        steps: [
          { freq: 0, duration: 8 },
          { freq: 1, duration: 2 },
          { freq: 0, duration: 6 },
          { freq: 1, duration: 2 },
        ],
        bpm: 50,
        noteLength: 300,
      },
      hat: {
        name: 'Hollow hat',
        steps: [
          { freq: 1, duration: 2 },
          { freq: 0, duration: 2 },
        ],
        bpm: 50,
        noteLength: 300,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  boss: {
    key: 392, // G4 (fast, intense)
    scale: [0, 2, 3, 5, 7, 8, 10], // G minor scale
    patterns: {
      lead: {
        name: 'Boss intense lead',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 3, duration: 1 },
          { freq: 5, duration: 1 },
          { freq: 8, duration: 1 },
          { freq: 5, duration: 1 },
          { freq: 3, duration: 1 },
        ],
        bpm: 150,
        noteLength: 100,
      },
      bass: {
        name: 'Boss bass',
        steps: [
          { freq: -12, duration: 2 },
          { freq: -8, duration: 2 },
          { freq: -12, duration: 2 },
          { freq: -5, duration: 2 },
        ],
        bpm: 150,
        noteLength: 100,
      },
      arp: {
        name: 'Boss arp',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 5, duration: 1 },
          { freq: 8, duration: 1 },
          { freq: 3, duration: 1 },
        ],
        bpm: 150,
        noteLength: 100,
      },
      kick: {
        name: 'Boss kick',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 0, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 0, duration: 1 },
        ],
        bpm: 150,
        noteLength: 100,
      },
      snare: {
        name: 'Boss snare',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 1, duration: 1 },
          { freq: 0, duration: 1 },
          { freq: 1, duration: 1 },
        ],
        bpm: 150,
        noteLength: 100,
      },
      hat: {
        name: 'Boss hat',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 0, duration: 1 },
        ],
        bpm: 150,
        noteLength: 100,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },

  finalboss: {
    key: 220, // A3 (epic, intense)
    scale: [0, 2, 3, 5, 7, 8, 11], // A natural minor
    patterns: {
      lead: {
        name: 'Final boss epic lead',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 3, duration: 1 },
          { freq: 5, duration: 2 },
          { freq: 8, duration: 1 },
          { freq: 11, duration: 2 },
          { freq: 8, duration: 1 },
        ],
        bpm: 140,
        noteLength: 107,
      },
      bass: {
        name: 'Final boss bass',
        steps: [
          { freq: -12, duration: 3 },
          { freq: -8, duration: 2 },
          { freq: -12, duration: 3 },
          { freq: -5, duration: 2 },
        ],
        bpm: 140,
        noteLength: 107,
      },
      arp: {
        name: 'Final boss arp',
        steps: [
          { freq: 0, duration: 1 },
          { freq: 5, duration: 1 },
          { freq: 8, duration: 2 },
        ],
        bpm: 140,
        noteLength: 107,
      },
      kick: {
        name: 'Final boss kick',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 1 },
          { freq: 0, duration: 2 },
        ],
        bpm: 140,
        noteLength: 107,
      },
      snare: {
        name: 'Final boss snare',
        steps: [
          { freq: 0, duration: 2 },
          { freq: 1, duration: 1 },
          { freq: 0, duration: 2 },
          { freq: 1, duration: 1 },
        ],
        bpm: 140,
        noteLength: 107,
      },
      hat: {
        name: 'Final boss hat',
        steps: [
          { freq: 1, duration: 1 },
          { freq: 0, duration: 1 },
        ],
        bpm: 140,
        noteLength: 107,
      },
    },
    loop: true,
    crossfadeMs: 1500,
  },
};

/**
 * Start playing music for a region.
 * Crossfades if a track is already playing.
 */
export function playMusicTrack(id: MusicId): void {
  if (currentMusicId === id) return; // Already playing

  const config = MUSIC_CONFIGS[id];
  if (!config) {
    console.warn(`Unknown music track: ${id}`);
    return;
  }

  // Fade out current track
  if (fadeOutId !== null) {
    clearInterval(fadeOutId);
  }
  if (currentOscillators.length > 0 || currentSources.length > 0) {
    fadeOutCurrentTrack(config.crossfadeMs ?? 1500);
    // Start new track after brief overlap
    setTimeout(() => {
      startMusicSequencer(id, config);
    }, 100);
  } else {
    startMusicSequencer(id, config);
  }
}

function fadeOutCurrentTrack(durationMs: number): void {
  const { musicGain } = getAudioContext();
  if (!musicGain) return;

  const startGain = musicGain.gain.value;
  const startTime = Date.now();

  fadeOutId = window.setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    musicGain.gain.value = startGain * (1 - progress);

    if (progress >= 1) {
      clearInterval(fadeOutId!);
      fadeOutId = null;
      stopAllMusicNodes();
    }
  }, 10);
}

function stopAllMusicNodes(): void {
  try {
    currentOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Already stopped
      }
    });
    currentOscillators = [];

    currentSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Already stopped
      }
    });
    currentSources = [];
  } catch {
    // Cleanup errors are non-critical
  }
}

function startMusicSequencer(id: MusicId, config: MusicConfig): void {
  const { ctx, musicGain } = getAudioContext();
  if (!ctx || !musicGain) return;

  currentMusicId = id;
  musicGain.gain.value = 0;
  musicGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.5);

  // Run a simple step sequencer with ~25ms scheduling lookahead
  const patterns = config.patterns;
  let stepIndex = { lead: 0, bass: 0, arp: 0, kick: 0, snare: 0, hat: 0 };

  const scheduleNotes = () => {
    const now = ctx.currentTime;
    const lookaheadMs = 100;
    const lookahead = lookaheadMs / 1000;

    // Schedule notes from each pattern
    schedulePatternSteps('lead', patterns.lead, stepIndex.lead, now, lookahead, config.key, config.scale, musicGain);
    schedulePatternSteps('bass', patterns.bass, stepIndex.bass, now, lookahead, config.key, config.scale, musicGain);
    schedulePatternSteps('arp', patterns.arp, stepIndex.arp, now, lookahead, config.key, config.scale, musicGain);
    scheduleDrumSteps('kick', patterns.kick, stepIndex.kick, now, lookahead, musicGain);
    scheduleDrumSteps('snare', patterns.snare, stepIndex.snare, now, lookahead, musicGain);
    scheduleDrumSteps('hat', patterns.hat, stepIndex.hat, now, lookahead, musicGain);

    // Advance indices
    stepIndex.lead = (stepIndex.lead + 1) % patterns.lead.steps.length;
    stepIndex.bass = (stepIndex.bass + 1) % patterns.bass.steps.length;
    stepIndex.arp = (stepIndex.arp + 1) % patterns.arp.steps.length;
    stepIndex.kick = (stepIndex.kick + 1) % patterns.kick.steps.length;
    stepIndex.snare = (stepIndex.snare + 1) % patterns.snare.steps.length;
    stepIndex.hat = (stepIndex.hat + 1) % patterns.hat.steps.length;
  };

  const schedulerInterval = window.setInterval(() => {
    if (currentMusicId !== id) {
      clearInterval(schedulerInterval);
      return;
    }
    scheduleNotes();
  }, 25);
}

function schedulePatternSteps(
  name: string,
  pattern: SequencerPattern,
  stepIndex: number,
  now: number,
  lookahead: number,
  baseFreq: number,
  scale: number[],
  destination: GainNode
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;

  const note = pattern.steps[stepIndex];
  if (!note || note.freq === null) return; // Rest

  const scheduleTime = now + lookahead;
  const noteStartTime = scheduleTime;
  const noteDurationMs = (note.duration * pattern.noteLength) / 1000;

  // Map scale index to frequency
  const scaleIdx = Math.floor(note.freq);
  const semitones = scale[scaleIdx % scale.length] + Math.floor(note.freq / scale.length) * 12;
  const freq = semitoneToFreq(baseFreq, semitones);

  const velocity = note.velocity ?? 0.5;

  switch (name) {
    case 'lead':
      playSquareWave(freq, noteDurationMs, {
        attack: 0.02,
        decay: 0.05,
        sustain: 0.6,
        release: 0.1,
        maxGain: 0.15 * velocity,
        filterFreq: 4000,
        destination,
      });
      break;
    case 'bass':
      playSineWave(freq, noteDurationMs, {
        attack: 0.03,
        decay: 0.08,
        sustain: 0.5,
        release: 0.15,
        maxGain: 0.2 * velocity,
        destination,
      });
      break;
    case 'arp':
      playSineWave(freq, noteDurationMs, {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.3,
        release: 0.2,
        maxGain: 0.12 * velocity,
        destination,
      });
      break;
  }
}

function scheduleDrumSteps(
  name: string,
  pattern: SequencerPattern,
  stepIndex: number,
  now: number,
  lookahead: number,
  destination: GainNode
): void {
  const { ctx } = getAudioContext();
  if (!ctx) return;

  const note = pattern.steps[stepIndex];
  if (!note || note.freq === 0) return; // Rest (freq 0 for drums = rest)

  const scheduleTime = now + lookahead;
  const noteDurationMs = (note.duration * pattern.noteLength) / 1000;

  switch (name) {
    case 'kick':
      playKick(noteDurationMs, { maxGain: 0.15, destination });
      break;
    case 'snare':
      playNoise(noteDurationMs, {
        attack: 0.01,
        decay: noteDurationMs * 0.5,
        sustain: 0.3,
        release: noteDurationMs * 0.2,
        maxGain: 0.1,
        filterFreq: 6000,
        filterType: 'highpass',
        destination,
      });
      break;
    case 'hat':
      playNoise(noteDurationMs * 0.3, {
        attack: 0.005,
        release: noteDurationMs * 0.25,
        maxGain: 0.08,
        filterFreq: 8000,
        filterType: 'highpass',
        destination,
      });
      break;
  }
}

/**
 * Fade out and stop music.
 */
export function stopMusicTrack(durationMs: number = 1000): void {
  fadeOutCurrentTrack(durationMs);
  currentMusicId = null;
}
