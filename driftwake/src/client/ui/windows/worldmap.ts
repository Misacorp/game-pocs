/**
 * World Map — an illustrated sky-chart. Each region is one stylized skywhale, biome-tinted, with
 * its maps sitting as small islands along its back; a compact 3-column grid of these region cards
 * fits the whole chart in an 1280x720 viewport with no clipping or scrolling. Undiscovered maps
 * still get a place on the back (so players can see there's more world to find) but sit fogged
 * and labelled '???'. A signature screen per BRAND.md.
 */
import { el } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { MAPS } from '@shared/data';
import type { RegionId, MapDef } from '@shared/types';

/** Display grouping is a client-only concept for the chart (RegionId itself is unchanged data —
 *  see @shared/types) — it lets the post-game "Drift Beyond" maps read as their own region
 *  ("Vesper", star-gold) instead of blending into Hollow's purple. */
type DisplayRegion = RegionId | 'vesper';
const VESPER_MAP_IDS = new Set(['vesper_landing', 'starfall_ruins', 'singers_spire', 'vesper_core']);
function displayRegionOf(m: MapDef): DisplayRegion { return VESPER_MAP_IDS.has(m.id) ? 'vesper' : m.region; }

const REGION_ORDER: DisplayRegion[] = ['driftmoor', 'finreach', 'stormbreak', 'lanternreef', 'hollow', 'vesper'];
const REGION_LABEL: Record<DisplayRegion, string> = {
  driftmoor: 'Driftmoor', finreach: 'Finreach', stormbreak: 'Stormbreak',
  lanternreef: 'Lanternreef', hollow: 'The Hollow', vesper: 'Vesper',
};

interface Tint { body: string; light: string; starry?: boolean; }
const REGION_TINT: Record<DisplayRegion, Tint> = {
  driftmoor: { body: '#2e4a33', light: '#436b49' },       // moss green
  finreach: { body: '#1f4a48', light: '#2c6a63' },        // kelp teal
  stormbreak: { body: '#3a4048', light: '#4c5865' },      // storm slate
  lanternreef: { body: '#3a2a52', light: '#3f6a63' },     // reef violet-teal
  hollow: { body: '#2a2038', light: '#3a2a52' },           // hollow purple
  vesper: { body: '#3a331a', light: '#5a4a20', starry: true }, // star-gold
};

const VIEW_W = 340, VIEW_H = 100;
const BACK_Y = 34;

/** A full-body stylized skywhale (head, dorsal fin, tail fluke) in a 340x100 viewBox, tinted per
 *  region, with a dotted spine connecting the given island x-positions (viewBox units). */
function regionWhaleSvg(tint: Tint, islandXs: number[]): string {
  const routeD = islandXs.length > 1 ? `M${islandXs.map((x) => `${x.toFixed(1)},${BACK_Y}`).join(' L')}` : '';
  const stars = tint.starry
    ? [[92, 46], [136, 68], [204, 42], [246, 64], [168, 76]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="#ffd27a" opacity=".85"/>`).join('')
    : '';
  return `<svg viewBox="0 0 ${VIEW_W} ${VIEW_H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="180" cy="58" rx="150" ry="32" fill="${tint.body}" stroke="var(--dw-bone-faint)" stroke-width="1.3"/>
    <ellipse cx="46" cy="60" rx="34" ry="23" fill="${tint.body}" stroke="var(--dw-bone-faint)" stroke-width="1.1"/>
    <circle cx="30" cy="54" r="2.4" fill="#0b1519"/>
    <path d="M158,34 168,10 186,36Z" fill="${tint.light}"/>
    <path d="M308,58 338,30 326,58Z" fill="${tint.light}" stroke="var(--dw-bone-faint)" stroke-width="1"/>
    <path d="M308,58 338,86 326,58Z" fill="${tint.light}" stroke="var(--dw-bone-faint)" stroke-width="1"/>
    ${stars}
    ${routeD ? `<path class="dw-chart-routes" d="${routeD}"/>` : ''}
  </svg>`;
}

export function createWorldMapWindow(wm: WindowManager, session: GameSession) {
  const grid = el('div', { class: 'dw-skychart-grid' });
  const legend = el('div', { class: 'dw-skychart-legend' },
    el('span', null, el('i', { style: { background: 'var(--dw-lantern)' } }), 'Town'),
    el('span', null, el('i', { style: { background: 'var(--dw-hide-3)', border: '1px solid var(--dw-bone-faint)' } }), 'Wilds'),
    el('span', null, el('i', { style: { background: 'var(--dw-coral)' } }), 'Boss'),
    el('span', null, el('i', { style: { background: 'var(--dw-lantern-hot)' } }), 'You Are Here'),
    el('span', null, el('i', { style: { background: 'var(--dw-hide-2)' } }), 'Fog · Undiscovered'));
  const body = el('div', { class: 'dw-body', style: { width: '1130px' } }, grid, legend);
  const ctrl = createWindow(wm, { panel: 'map', title: 'Sky-Chart', width: 1160, defaultPos: { x: 20, y: 10 } }, body);

  function render() {
    grid.innerHTML = '';
    const st = session.state;
    const byRegion = new Map<DisplayRegion, MapDef[]>();
    for (const m of Object.values(MAPS)) {
      const region = displayRegionOf(m);
      if (!byRegion.has(region)) byRegion.set(region, []);
      byRegion.get(region)!.push(m);
    }
    if (!Object.keys(MAPS).length) { grid.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)' } }, 'No maps discovered yet.')); return; }

    for (const region of REGION_ORDER) {
      const maps = byRegion.get(region);
      if (!maps?.length) continue;
      const hasCurrent = maps.some((m) => m.id === st.mapId);
      const tint = REGION_TINT[region];

      const n = maps.length;
      const xs = n === 1 ? [VIEW_W / 2] : maps.map((_, i) => 70 + (i * (VIEW_W - 140)) / (n - 1));

      const whaleHost = el('div', { class: 'dw-region-whale', html: regionWhaleSvg(tint, xs) });
      maps.forEach((m, i) => {
        const known = st.discoveredMaps.includes(m.id);
        const current = st.mapId === m.id;
        const kindClass = m.town ? 'town' : m.boss ? 'boss' : '';
        const isle = el('div', {
          class: `dw-chart-isle ${kindClass} ${current ? 'current' : ''} ${known ? '' : 'unknown'}`,
          style: { left: `${(xs[i] / VIEW_W) * 100}%`, top: `${(BACK_Y / VIEW_H) * 100}%` },
          onclick: () => bus.emit('ui:toast', { text: known ? m.name : 'An uncharted stretch of sky.', kind: 'info' }),
        },
          el('div', { class: 'dot' }, (m.town || m.boss) && known ? el('div', { class: 'badge' }) : null),
          el('div', { class: 'label' }, known ? m.name : '???'),
          el('div', { class: 'lvl' }, known ? (m.town ? 'TOWN' : m.levelRange ? `LV ${m.levelRange[0]}-${m.levelRange[1]}` : '') : ''));
        whaleHost.appendChild(isle);
      });

      const card = el('div', { class: `dw-region-card ${hasCurrent ? 'dw-region-current' : ''}` },
        el('div', { class: 'dw-region-name' }, REGION_LABEL[region]),
        whaleHost);
      grid.appendChild(card);
    }
  }

  wm.track(bus.on('state', render));
  render();
  return ctrl;
}
