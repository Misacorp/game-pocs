/**
 * Dev-only rig lab (open /rig-lab.html under `npm run dev`). Renders every illustrated subject's
 * clips frame-by-frame plus an in-game-scale comparison against the pixel-art version.
 * Query: ?only=vanguard,puffmoss  &zoom=2 (inspect at 2x the sheet resolution)  &clips=idle,attack
 * Sets window.__labReady = true when done (used by scripts/rig-lab-shot.mjs).
 */
import type { CharacterLook } from '../spec';
import type { ClassId, JobId, WeaponType } from '@shared/types';
import { MONSTER_LIST } from '@shared/data/monsters';
import { NPC_LIST } from '@shared/data/npcs';
import { renderRigFrame, type RigSpec } from './bake';
import { characterRigSpec } from './characters';
import { hasRigMonster, monsterRigSpec } from './monsters';
import { hasRigNpc, npcRigSpec } from './npcs';
import { characterIdleCanvas } from '../characters';
import { scaleNearest } from '../canvasKit';
import './register';

const q = new URLSearchParams(location.search);
const only = q.get('only')?.split(',').filter(Boolean);
const zoom = Number(q.get('zoom') ?? 1);
const clipFilter = q.get('clips')?.split(',').filter(Boolean);
const root = document.getElementById('root')!;

interface Subject { id: string; spec: RigSpec; pixel?: HTMLCanvasElement }

const A = (skin: string, hair: string, hairStyle: number, eyes: string, outfit: string) => ({ skin, hair, hairStyle, eyes, outfit });
const CHARS: [string, ClassId, WeaponType, ReturnType<typeof A>][] = [
  ['vanguard', 'vanguard', 'sword', A('#f1c27d', '#4a2c16', 1, '#3a6ea5', '#3a6ea5')],
  ['vanguard_axe', 'vanguard', 'axe', A('#8d5524', '#1c130d', 0, '#6a3a1a', '#7a2e2e')],
  ['stormcaller', 'stormcaller', 'staff', A('#ffe0bd', '#e8e2d0', 4, '#6a4ac9', '#5a2e7a')],
  ['stormcaller_wand', 'stormcaller', 'wand', A('#e0ac69', '#2e4f7a', 2, '#2e7a8a', '#2e6a7a')],
  ['windrunner', 'windrunner', 'bow', A('#f1c27d', '#8a5a2a', 3, '#2e7a4f', '#2e7a4f')],
  ['windrunner_gun', 'windrunner', 'gun', A('#c68642', '#c9a227', 1, '#7a5a2a', '#a5793a')],
  ['shade', 'shade', 'dagger', A('#ffe0bd', '#1c130d', 5, '#8a2e2e', '#33363f')],
  ['shade_knives', 'shade', 'knives', A('#5a3825', '#8a2e2e', 4, '#c9a227', '#5a2e7a')],
];

const subjects: Subject[] = [];
for (const [id, classId, weaponType, appearance] of CHARS) {
  const look: CharacterLook = { classId, jobId: classId, appearance, weaponType };
  subjects.push({ id, spec: characterRigSpec(look), pixel: characterIdleCanvas(look) });
}
// a geared-up variant (equipment tints: armor, helmet, boots, gloves)
subjects.push({ id: 'vanguard_geared', spec: characterRigSpec({ classId: 'vanguard', jobId: 'vanguard', weaponType: 'sword', appearance: CHARS[0][3], armorColors: ['#8a5a3a', '#caa66a'], helmetColors: ['#9aa6b4', '#c9464e'], bootsColors: ['#5a3a2a'], glovesColors: ['#6b4a30'] }) });
subjects.push({ id: 'stormcaller_geared', spec: characterRigSpec({ classId: 'stormcaller', jobId: 'stormcaller', weaponType: 'staff', appearance: CHARS[2][3], armorColors: ['#3a2a5a', '#8fe6ff'], helmetColors: ['#7a2e4a', '#ffd27a'], bootsColors: ['#2a2036'], glovesColors: ['#3a2a46'] }) });
subjects.push({ id: 'windrunner_geared', spec: characterRigSpec({ classId: 'windrunner', jobId: 'windrunner', weaponType: 'bow', appearance: CHARS[4][3], armorColors: ['#2e5a3a', '#caa64a'], bootsColors: ['#3a2a1a'], glovesColors: ['#4a3a26'] }) });
subjects.push({ id: 'shade_geared', spec: characterRigSpec({ classId: 'shade', jobId: 'shade', weaponType: 'knives', appearance: CHARS[6][3], armorColors: ['#232028', '#8a2e2e'], bootsColors: ['#1a1820'], glovesColors: ['#2a2630'] }) });
// tier-2 job accent variants
const JOB_VARIANTS: [string, ClassId, JobId, WeaponType][] = [
  ['vanguard_bulwark', 'vanguard', 'bulwark', 'sword'],
  ['vanguard_reaver', 'vanguard', 'reaver', 'axe'],
  ['stormcaller_tempest', 'stormcaller', 'tempest', 'staff'],
  ['stormcaller_tidesinger', 'stormcaller', 'tidesinger', 'wand'],
  ['windrunner_skyhunter', 'windrunner', 'skyhunter', 'bow'],
  ['windrunner_sparkgunner', 'windrunner', 'sparkgunner', 'gun'],
  ['shade_duskblade', 'shade', 'duskblade', 'dagger'],
  ['shade_hexslinger', 'shade', 'hexslinger', 'knives'],
];
for (const [id, classId, jobId, weaponType] of JOB_VARIANTS) {
  const base = CHARS.find((c) => c[1] === classId)!;
  subjects.push({ id, spec: characterRigSpec({ classId, jobId, appearance: base[3], weaponType }) });
}
for (const def of MONSTER_LIST) if (hasRigMonster(def)) subjects.push({ id: def.id, spec: monsterRigSpec(def) });
for (const def of NPC_LIST) if (hasRigNpc(def)) subjects.push({ id: def.id, spec: npcRigSpec(def) });

function label(text: string): HTMLElement { const s = document.createElement('span'); s.textContent = text; return s; }

for (const s of subjects) {
  if (only && !only.some((o) => s.id === o || (!q.get('exact') && s.id.startsWith(o)))) continue;
  const h = document.createElement('h2'); h.textContent = s.id; root.appendChild(h);
  const row = document.createElement('div'); row.className = 'row'; root.appendChild(row);
  // in-game scale comparison: pixel (1x world => 2x nearest) vs illustrated (sheet res 1:1)
  if (s.pixel) {
    const wrap = document.createElement('div'); wrap.className = 'clip';
    const c = scaleNearest(s.pixel, s.pixel.width * 2, s.pixel.height * 2); c.className = 'scene pix';
    wrap.append(c, label('pixel (in-game size)')); row.appendChild(wrap);
  }
  for (const clip of s.spec.clips) {
    if (clipFilter && !clipFilter.includes(clip.name)) continue;
    const wrap = document.createElement('div'); wrap.className = 'clip';
    const strip = document.createElement('div'); strip.style.display = 'flex'; strip.style.gap = '1px';
    for (let i = 0; i < clip.frames; i++) {
      if (clip.name === 'idle' && clip.frames > 8 && i % 2 === 1 && i !== 13) continue; // keep long idles compact
      const f = renderRigFrame(s.spec, clip, i, zoom);
      f.className = 'scene';
      strip.appendChild(f);
    }
    wrap.append(strip, label(`${clip.name} (${clip.frames}f @${clip.frameRate})`));
    row.appendChild(wrap);
  }
}
if (q.get('perf')) {
  for (const s of subjects) {
    if (only && !only.some((o) => s.id === o || (!q.get('exact') && s.id.startsWith(o)))) continue;
    const t0 = performance.now();
    for (const clip of s.spec.clips) for (let i = 0; i < clip.frames; i++) renderRigFrame(s.spec, clip, i);
    console.warn(`[perf] ${s.id}: ${s.spec.clips.reduce((a, c) => a + c.frames, 0)} frames in ${(performance.now() - t0).toFixed(1)}ms`);
  }
}
(window as unknown as { __labReady: boolean }).__labReady = true;
