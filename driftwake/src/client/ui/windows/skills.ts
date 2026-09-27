import { el } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { makeTabs } from '../widgets';
import { attachTooltip } from '../tooltip';
import { safeSkillIcon } from '../icons';
import { JOBS, SKILLS } from '@shared/data';
import { scalar, skillLearnCheck } from '@shared/logic';
import type { JobId, SkillDef } from '@shared/types';
import { JOB_ADVANCE_LEVEL } from '@shared/constants';
import { audio } from '../../audio';

export function createSkillsWindow(wm: WindowManager, session: GameSession) {
  const spLabel = el('div', { class: 'dw-caps', style: { color: '#e8c477', fontWeight: '700' } }, 'SP: 0');
  const tabsHost = el('div');
  const list = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' } });
  const body = el('div', { class: 'dw-body' }, spLabel, tabsHost, list);
  const ctrl = createWindow(wm, { panel: 'skills', title: 'Skills', width: 460 }, body);

  let activeJob: JobId | null = null;

  function jobTabs(): { id: JobId; label: string; locked: boolean }[] {
    const st = session.state;
    const tabs: { id: JobId; label: string; locked: boolean }[] = [{ id: st.classId, label: JOBS[st.classId]?.name ?? st.classId, locked: false }];
    if (st.jobId !== st.classId) {
      tabs.push({ id: st.jobId, label: JOBS[st.jobId]?.name ?? st.jobId, locked: false });
    } else {
      const candidates = Object.values(JOBS).filter((j) => j.tier === 2 && j.parent === st.classId);
      for (const c of candidates) tabs.push({ id: c.id, label: c.name, locked: true });
    }
    return tabs;
  }

  function renderTabs() {
    const tabDefs = jobTabs();
    if (!activeJob || !tabDefs.some((t) => t.id === activeJob)) activeJob = tabDefs[0]?.id ?? null;
    const tabs = makeTabs(tabDefs.map((t) => ({ id: t.id, label: t.locked ? `${t.label} 🔒` : t.label })), (id) => { activeJob = id as JobId; renderList(); }, activeJob ?? undefined);
    tabsHost.innerHTML = '';
    tabsHost.appendChild(tabs.root);
  }

  function renderList() {
    list.innerHTML = '';
    const st = session.state;
    spLabel.textContent = `SP: ${st.sp}`;
    const tabDefs = jobTabs();
    const tabInfo = tabDefs.find((t) => t.id === activeJob);
    const job = activeJob ? JOBS[activeJob] : undefined;
    if (!job) { list.appendChild(el('div', { style: { color: '#a7b0c4' } }, 'No skills yet.')); return; }
    if (tabInfo?.locked) {
      list.appendChild(el('div', { style: { padding: '20px', textAlign: 'center', color: '#a7b0c4' } },
        el('div', { style: { fontSize: '24px', marginBottom: '8px' } }, '🔒'),
        el('div', null, `Unlocks at level ${JOB_ADVANCE_LEVEL} via job advancement.`),
        el('div', { class: 'dw-tt-desc', style: { marginTop: '6px' } }, job.description)));
      return;
    }
    for (const skillId of job.skills) {
      const def = SKILLS[skillId];
      const level = st.skills[skillId] ?? 0;
      const row = el('div', { style: { display: 'flex', gap: '10px', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', alignItems: 'flex-start' } });
      const iconWrap = el('div', { class: 'dw-slot', style: { flexShrink: '0' } }, el('img', { src: safeSkillIcon(def ?? { id: skillId, icon: { shape: 'orb', colors: ['#666'] } }) }));
      if (def) { iconWrap.draggable = true; iconWrap.ondragstart = (e) => e.dataTransfer?.setData('text/plain', `skill:${skillId}`); }
      row.appendChild(iconWrap);

      const info = el('div', { style: { flex: '1' } });
      info.appendChild(el('div', { style: { display: 'flex', justifyContent: 'space-between' } },
        el('b', null, def?.name ?? skillId), el('span', { style: { color: '#a7b0c4', fontSize: '11.5px' } }, `Lv ${level} / ${def?.maxLevel ?? '?'}`)));
      if (def?.description) info.appendChild(el('div', { class: 'dw-tt-desc', style: { margin: '2px 0' } }, def.description));
      if (def) info.appendChild(valuesLine(def, level));
      row.appendChild(info);

      const check = def ? skillLearnCheck(st, skillId) : { ok: false, reason: 'Unknown skill' };
      const canLevel = level < (def?.maxLevel ?? 0);
      const btn = el('button', {
        class: 'dw-btn dw-btn-sm', disabled: !check.ok || !canLevel,
        onclick: () => { session.dispatch({ type: 'learnSkill', skillId }); audio.playSfx('uiClick'); },
      }, canLevel ? '+' : 'MAX');
      if (!check.ok && check.reason) attachTooltip(btn, () => [check.reason!]);
      row.appendChild(btn);
      list.appendChild(row);
    }
  }

  function valuesLine(def: SkillDef, level: number): HTMLElement {
    const cur = level > 0 ? level : 1;
    const bits: string[] = [];
    if (def.mpCost !== undefined) bits.push(`MP ${scalar(def.mpCost, cur)}`);
    if (def.hpCostPct !== undefined) bits.push(`HP ${Math.round(scalar(def.hpCostPct, cur) * 100)}%`);
    if (def.cooldownMs !== undefined) bits.push(`CD ${(scalar(def.cooldownMs, cur) / 1000).toFixed(1)}s`);
    if (def.damagePct !== undefined) bits.push(`${Math.round(scalar(def.damagePct, cur))}% dmg`);
    if (def.reqLevel) bits.push(`Req Lv ${def.reqLevel}`);
    let text = bits.join('  ·  ');
    if (level > 0 && level < def.maxLevel) {
      const next = level + 1;
      const nextBits: string[] = [];
      if (def.damagePct !== undefined) nextBits.push(`${Math.round(scalar(def.damagePct, next))}%`);
      if (def.mpCost !== undefined) nextBits.push(`MP ${scalar(def.mpCost, next)}`);
      if (nextBits.length) text += `  →  next: ${nextBits.join(', ')}`;
    }
    return el('div', { style: { fontSize: '11px', color: '#e8c477' } }, text);
  }

  bus.on('state', () => { renderTabs(); renderList(); });
  renderTabs();
  renderList();
  return ctrl;
}
