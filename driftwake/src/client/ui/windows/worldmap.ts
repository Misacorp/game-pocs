import { el } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { MAPS } from '@shared/data';
import type { RegionId, MapDef } from '@shared/types';

const REGION_ORDER: RegionId[] = ['driftmoor', 'finreach', 'stormbreak', 'lanternreef', 'hollow'];
const REGION_LABEL: Record<RegionId, string> = { driftmoor: 'Driftmoor', finreach: 'Finreach', stormbreak: 'Stormbreak', lanternreef: 'Lanternreef', hollow: 'The Hollow' };

export function createWorldMapWindow(wm: WindowManager, session: GameSession) {
  const body = el('div', { class: 'dw-body', style: { width: '520px', maxHeight: '520px' } });
  const ctrl = createWindow(wm, { panel: 'map', title: 'World Map', width: 560 }, body);

  function render() {
    body.innerHTML = '';
    const st = session.state;
    const byRegion = new Map<RegionId, MapDef[]>();
    for (const m of Object.values(MAPS)) {
      if (!byRegion.has(m.region)) byRegion.set(m.region, []);
      byRegion.get(m.region)!.push(m);
    }
    if (!Object.keys(MAPS).length) { body.appendChild(el('div', { style: { color: '#a7b0c4' } }, 'No maps discovered yet.')); return; }
    for (const region of REGION_ORDER) {
      const maps = byRegion.get(region);
      if (!maps?.length) continue;
      const nodes = el('div', { class: 'dw-worldmap-nodes' });
      for (const m of maps) {
        const known = st.discoveredMaps.includes(m.id);
        const current = st.mapId === m.id;
        const node = el('div', { class: `dw-map-node ${current ? 'dw-current' : ''} ${known ? '' : 'dw-unknown'}` },
          el('div', { class: 'dw-mn-name' }, known ? m.name : '???'),
          el('div', { class: 'dw-mn-level' }, m.town ? 'Town' : known && m.levelRange ? `Lv ${m.levelRange[0]}-${m.levelRange[1]}` : ''),
          m.boss && known ? el('div', { style: { fontSize: '10px', color: '#ff8a8a' } }, '☠ Boss') : null);
        nodes.appendChild(node);
      }
      body.appendChild(el('div', { class: 'dw-worldmap-region' }, el('h4', { class: 'dw-caps' }, REGION_LABEL[region]), nodes));
    }
  }

  bus.on('state', render);
  render();
  return ctrl;
}
