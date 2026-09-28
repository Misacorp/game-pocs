/**
 * Bottom HUD: HP/MP/XP bars, identity, hotbar (with cooldown sweep + drag targets), buff row.
 */
import { el, fmtNum, clamp } from './dom';
import { bus } from '../events';
import type { GameSession } from '../session';
import { HOTBAR_SIZE, xpToNext } from '@shared/constants';
import { ITEMS, SKILLS, JOBS, MAPS } from '@shared/data';
import { countItem } from '@shared/logic';
import { keyLabel, keysFor } from '../input/keybinds';
import { safeItemIcon, safeSkillIcon } from './icons';
import { attachTooltip } from './tooltip';
import type { HotbarEntry } from '@shared/types';

export function createHud(session: GameSession): { root: HTMLElement; cleanup: () => void } {
  const offs: (() => void)[] = [];

  // ---- Bars ----
  const hpFill = el('div', { class: 'dw-bar-fill dw-hp' });
  const hpText = el('div', { class: 'dw-bar-text' }, '');
  const mpFill = el('div', { class: 'dw-bar-fill dw-mp' });
  const mpText = el('div', { class: 'dw-bar-text' }, '');
  const xpFill = el('div', { class: 'dw-bar-fill dw-xp' });
  const idRow = el('div', { class: 'dw-id-row' });

  // Level medallion — porthole rim, job label on a small plate beneath (BRAND.md HUD spec).
  const medallionLevel = el('b', null, '1');
  const medallionJob = el('small', { class: 'dw-caps' }, '');
  const medallion = el('div', { class: 'dw-medallion' }, medallionLevel, medallionJob);

  const bars = el('div', { class: 'dw-panel dw-bars', style: { padding: '7px 10px' } },
    idRow,
    el('div', { class: 'dw-bar-row' }, el('div', { class: 'dw-bar-label' }, 'HP'), el('div', { class: 'dw-bar-track' }, hpFill, hpText)),
    el('div', { class: 'dw-bar-row' }, el('div', { class: 'dw-bar-label' }, 'MP'), el('div', { class: 'dw-bar-track' }, mpFill, mpText)),
    el('div', { class: 'dw-bar-row dw-xp-row' }, el('div', { class: 'dw-bar-label' }, 'XP'), el('div', { class: 'dw-bar-track' }, xpFill)));

  function renderVitals() {
    const hpPct = clamp(session.hp / Math.max(1, session.stats.maxHp), 0, 1);
    const mpPct = clamp(session.mp / Math.max(1, session.stats.maxMp), 0, 1);
    hpFill.style.width = `${hpPct * 100}%`;
    mpFill.style.width = `${mpPct * 100}%`;
    hpText.textContent = `${fmtNum(session.hp)} / ${fmtNum(session.stats.maxHp)}`;
    mpText.textContent = `${fmtNum(session.mp)} / ${fmtNum(session.stats.maxMp)}`;
  }
  function renderIdentity() {
    const st = session.state;
    const need = xpToNext(st.level);
    const pct = isFinite(need) ? clamp(st.xp / need, 0, 1) : 1;
    xpFill.style.width = `${pct * 100}%`;
    const jobName = JOBS[st.jobId]?.name ?? st.jobId;
    const mapName = MAPS[st.mapId]?.name ?? st.mapId;
    medallionLevel.textContent = String(st.level);
    medallionJob.textContent = jobName;
    idRow.innerHTML = '';
    idRow.appendChild(el('span', null, el('b', null, st.name)));
    idRow.appendChild(el('span', null, `${jobName} · ${mapName}`.toUpperCase()));
  }
  offs.push(bus.on('vitals', renderVitals));
  offs.push(bus.on('state', renderIdentity));

  // ---- Hotbar ----
  const slotEls: HTMLElement[] = [];
  const hotbarRoot = el('div', { class: 'dw-hotbar' });
  for (let i = 0; i < HOTBAR_SIZE; i++) {
    const slot = el('div', { class: 'dw-slot dw-empty' });
    slot.dataset.index = String(i);
    slotEls.push(slot);
    hotbarRoot.appendChild(slot);
  }

  function cooldownKeyFor(entry: HotbarEntry | null): string | null {
    if (!entry) return null;
    if (entry.kind === 'skill') return `skill:${entry.id}`;
    const def = ITEMS[entry.id];
    return `item:${def?.use?.cooldownGroup ?? entry.id}`;
  }

  function renderHotbar() {
    const hotbar = session.state.hotbar ?? [];
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const entry = hotbar[i] ?? null;
      const slot = slotEls[i];
      slot.innerHTML = '';
      slot.classList.toggle('dw-empty', !entry);
      slot.appendChild(el('div', { class: 'dw-keycap' }, keyLabel(keysFor(`hotbar${i}`)[0])));
      if (entry?.kind === 'skill') {
        const def = SKILLS[entry.id];
        slot.style.borderColor = '';
        slot.appendChild(el('img', { src: safeSkillIcon(def ?? { id: entry.id, icon: { shape: 'orb', colors: ['#666'] } }) }));
        const lvl = session.state.skills[entry.id];
        if (lvl) slot.appendChild(el('div', { class: 'dw-count' }, `${lvl}`));
        attachTooltip(slot, () => [def ? `${def.name} (Lv ${session.state.skills[entry.id] ?? 0})` : '??? Skill']);
      } else if (entry?.kind === 'item') {
        const def = ITEMS[entry.id];
        slot.appendChild(el('img', { src: safeItemIcon(def) }));
        const cnt = countItem(session.state, entry.id);
        if (cnt > 1) slot.appendChild(el('div', { class: 'dw-count' }, String(cnt)));
        attachTooltip(slot, () => [def?.name ?? '??? Item']);
      }
      const sweep = el('div', { class: 'dw-cd-sweep', style: { '--p': '0' } as any });
      const cdText = el('div', { class: 'dw-cd-text', style: { display: 'none' } });
      slot.appendChild(sweep);
      slot.appendChild(cdText);
    }
  }
  offs.push(bus.on('state', renderHotbar));
  offs.push(bus.on('keybinds:changed', renderHotbar));
  renderHotbar();

  // click / right-click / drag-drop
  slotEls.forEach((slot, i) => {
    slot.addEventListener('click', () => bus.emit('hotbar:activate', { index: i }));
    slot.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      session.dispatch({ type: 'setHotbar', index: i, entry: null });
    });
    slot.addEventListener('dragover', (e) => { e.preventDefault(); slot.classList.add('dw-dragover'); });
    slot.addEventListener('dragleave', () => slot.classList.remove('dw-dragover'));
    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      slot.classList.remove('dw-dragover');
      const data = e.dataTransfer?.getData('text/plain');
      if (!data) return;
      const [kind, id] = data.split(':', 2);
      if (kind === 'skill' || kind === 'item') session.dispatch({ type: 'setHotbar', index: i, entry: { kind, id } as HotbarEntry });
    });
  });

  // cooldown sweep via rAF (doesn't rebuild DOM, only updates a CSS var + text)
  let raf = 0;
  function tick() {
    const hotbar = session.state?.hotbar ?? [];
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const entry = hotbar[i] ?? null;
      const key = cooldownKeyFor(entry);
      const slot = slotEls[i];
      const sweep = slot.querySelector('.dw-cd-sweep') as HTMLElement | null;
      const cdText = slot.querySelector('.dw-cd-text') as HTMLElement | null;
      if (!sweep || !cdText) continue;
      const cd = key ? session.cooldowns[key] : undefined;
      if (cd && cd.readyAt > performance.now()) {
        const remaining = cd.readyAt - performance.now();
        const p = clamp((remaining / cd.duration) * 100, 0, 100);
        sweep.style.setProperty('--p', String(p));
        sweep.style.display = '';
        cdText.style.display = '';
        cdText.textContent = remaining > 1500 ? `${Math.ceil(remaining / 1000)}` : '';
      } else {
        sweep.style.display = 'none';
        cdText.style.display = 'none';
      }
    }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  // ---- Buffs ----
  const buffsRoot = el('div', { class: 'dw-buffs' });
  function renderBuffs(buffs: { id: string; name: string; expiresAt: number; icon?: { shape: string; colors: string[] } }[]) {
    buffsRoot.innerHTML = '';
    for (const b of buffs) {
      const timeEl = el('div', { class: 'dw-buff-time' }, '');
      const row = el('div', { class: 'dw-buff' },
        el('img', { src: b.icon ? safeSkillIcon({ id: b.id, icon: b.icon as any }) : safeSkillIcon(undefined) }), timeEl);
      attachTooltip(row, () => [b.name]);
      (row as any)._expiresAt = b.expiresAt;
      buffsRoot.appendChild(row);
    }
  }
  offs.push(bus.on('buffs', renderBuffs));
  let raf2 = 0;
  function tickBuffs() {
    for (const row of Array.from(buffsRoot.children) as HTMLElement[]) {
      const remain = (row as any)._expiresAt - Date.now();
      const timeEl = row.querySelector('.dw-buff-time');
      if (timeEl) timeEl.textContent = remain > 0 ? `${Math.ceil(remain / 1000)}s` : '';
    }
    raf2 = requestAnimationFrame(tickBuffs);
  }
  raf2 = requestAnimationFrame(tickBuffs);

  const hotbarWrap = el('div', { style: { pointerEvents: 'auto' } }, hotbarRoot);
  const bottom = el('div', { class: 'dw-hud-bottom' }, medallion, bars, hotbarWrap);

  renderVitals();
  renderIdentity();

  const root = el('div', {}, bottom, buffsRoot);
  return {
    root,
    cleanup: () => { offs.forEach((o) => o()); cancelAnimationFrame(raf); cancelAnimationFrame(raf2); },
  };
}
