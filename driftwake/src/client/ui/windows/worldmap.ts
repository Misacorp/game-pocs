/**
 * World Map — an illustrated sky-chart. Each map is drawn as an island on the back of a stylized
 * skywhale, grouped by region, with dotted route lines following the portal graph and a pulsing
 * marker on the player's current map. Undiscovered maps still get a place on the chart (so players
 * can see there's more world to find) but sit under fog. A signature screen per BRAND.md.
 */
import { el } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { MAPS } from '@shared/data';
import type { RegionId, MapDef } from '@shared/types';

const REGION_ORDER: RegionId[] = ['driftmoor', 'finreach', 'stormbreak', 'lanternreef', 'hollow'];
const REGION_LABEL: Record<RegionId, string> = { driftmoor: 'Driftmoor', finreach: 'Finreach', stormbreak: 'Stormbreak', lanternreef: 'Lanternreef', hollow: 'The Hollow' };

const ISLAND_W = 168;
const COL_W = 190;
const ROW_H = 148;
const COLS = 4;
const CHART_PAD = 14;

interface Placement { map: MapDef; x: number; y: number; }

function whaleIslandSvg(kind: 'town' | 'boss' | 'wild', current: boolean): string {
  const capFill = kind === 'town' ? 'rgba(255,179,71,0.42)' : kind === 'boss' ? 'rgba(255,107,107,0.36)' : 'rgba(95,227,198,0.32)';
  const capStroke = kind === 'town' ? 'var(--dw-lantern)' : kind === 'boss' ? 'var(--dw-coral)' : 'var(--dw-tide)';
  const ringSvg = current
    ? `<circle class="dw-current-pulse" cx="84" cy="34" r="14" fill="none" stroke="var(--dw-tide)" stroke-width="2"/>
       <circle cx="84" cy="34" r="4" fill="var(--dw-tide)"/>`
    : '';
  return `<svg width="${ISLAND_W}" height="66" viewBox="0 0 168 66" xmlns="http://www.w3.org/2000/svg">
    <ellipse class="dw-back" cx="84" cy="42" rx="78" ry="20" fill="var(--dw-hide-3)" stroke="var(--dw-bone-faint)" stroke-width="1.3"/>
    <ellipse cx="84" cy="30" rx="62" ry="13" fill="${capFill}" stroke="${capStroke}" stroke-width="1.2" stroke-opacity="0.85"/>
    <path d="M14 44 Q4 40 2 30" fill="none" stroke="var(--dw-bone-faint)" stroke-width="1.2"/>
    ${ringSvg}
  </svg>`;
}

export function createWorldMapWindow(wm: WindowManager, session: GameSession) {
  const chart = el('div', { class: 'dw-skychart' });
  const legend = el('div', { class: 'dw-skychart-legend' },
    el('span', null, el('i', { style: { background: 'var(--dw-lantern)' } }), 'Town'),
    el('span', null, el('i', { style: { background: 'var(--dw-tide)' } }), 'Wilds'),
    el('span', null, el('i', { style: { background: 'var(--dw-coral)' } }), 'Boss'),
    el('span', null, el('i', { style: { background: 'var(--dw-hide-3)' } }), 'Fog · Undiscovered'));
  const body = el('div', { class: 'dw-body', style: { width: '790px', maxHeight: '560px', overflowY: 'auto' } }, chart, legend);
  const ctrl = createWindow(wm, { panel: 'map', title: 'Sky-Chart', width: 820 }, body);

  function render() {
    chart.innerHTML = '';
    const st = session.state;
    const byRegion = new Map<RegionId, MapDef[]>();
    for (const m of Object.values(MAPS)) {
      if (!byRegion.has(m.region)) byRegion.set(m.region, []);
      byRegion.get(m.region)!.push(m);
    }
    if (!Object.keys(MAPS).length) { chart.appendChild(el('div', { style: { color: 'var(--dw-bone-dim)' } }, 'No maps discovered yet.')); return; }

    const placements = new Map<string, Placement>();
    let y = CHART_PAD;
    const regionRows: { region: RegionId; y: number }[] = [];

    for (const region of REGION_ORDER) {
      const maps = byRegion.get(region);
      if (!maps?.length) continue;
      regionRows.push({ region, y });
      y += 26;
      maps.forEach((m, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        placements.set(m.id, { map: m, x: CHART_PAD + col * COL_W, y: y + row * ROW_H });
      });
      const rows = Math.ceil(maps.length / COLS);
      y += rows * ROW_H + 18;
    }
    chart.style.minHeight = `${y}px`;

    // Route lines first (under the islands): connect every portal edge we have coordinates for.
    const drawn = new Set<string>();
    const pathParts: string[] = [];
    for (const p of placements.values()) {
      for (const portal of p.map.portals) {
        const target = placements.get(portal.to);
        if (!target) continue;
        const key = [p.map.id, target.map.id].sort().join('|');
        if (drawn.has(key)) continue;
        drawn.add(key);
        const x1 = p.x + ISLAND_W / 2, y1 = p.y + 34;
        const x2 = target.x + ISLAND_W / 2, y2 = target.y + 34;
        pathParts.push(`<path d="M${x1} ${y1} L${x2} ${y2}"/>`);
      }
    }
    const routesWrap = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    routesWrap.setAttribute('class', 'dw-skychart-routes');
    routesWrap.setAttribute('width', '100%');
    routesWrap.setAttribute('height', `${y}`);
    routesWrap.innerHTML = pathParts.join('');
    chart.appendChild(routesWrap);

    for (const { region, y: ry } of regionRows) {
      chart.appendChild(el('div', { class: 'dw-region-title', style: { top: `${ry}px` } }, REGION_LABEL[region]));
    }

    for (const p of placements.values()) {
      const m = p.map;
      const known = st.discoveredMaps.includes(m.id);
      const current = st.mapId === m.id;
      const kind: 'town' | 'boss' | 'wild' = m.town ? 'town' : m.boss ? 'boss' : 'wild';
      const island = el('div', {
        class: `dw-whale-island ${current ? 'dw-current' : ''} ${known ? '' : 'dw-unknown'}`,
        style: { left: `${p.x}px`, top: `${p.y}px` },
        onclick: () => bus.emit('ui:toast', { text: known ? m.name : 'An uncharted stretch of sky.', kind: 'info' }),
      });
      const svgHost = el('div', { html: whaleIslandSvg(kind, current) });
      island.appendChild(svgHost.firstElementChild!);
      island.appendChild(el('div', { class: 'dw-mn-name' }, known ? m.name : '???'));
      island.appendChild(el('div', { class: 'dw-mn-level' }, m.town ? 'TOWN' : known && m.levelRange ? `LV ${m.levelRange[0]}-${m.levelRange[1]}` : ''));
      if (m.boss && known) island.appendChild(el('div', { class: 'dw-boss-mark' }, '⚔ Boss'));
      chart.appendChild(island);
    }
  }

  wm.track(bus.on('state', render));
  render();
  return ctrl;
}
