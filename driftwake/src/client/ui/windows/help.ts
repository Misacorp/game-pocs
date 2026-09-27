import { el } from '../dom';
import { WindowManager, createWindow } from '../manager';
import { BIND_LABELS, DEFAULT_BINDS, getBinds, keyLabel } from '../../input/keybinds';
import { JOB_ADVANCE_LEVEL } from '@shared/constants';

export function createHelpWindow(wm: WindowManager) {
  const body = el('div', { class: 'dw-body', style: { width: '380px' } });
  const ctrl = createWindow(wm, { panel: 'help', title: 'Help' }, body);

  const controls = el('div', { class: 'dw-help-section' }, el('h4', null, 'Controls'));
  const binds = getBinds();
  for (const action of Object.keys(DEFAULT_BINDS)) {
    if (action.startsWith('hotbar')) continue;
    controls.appendChild(el('div', { class: 'dw-bind-row' }, el('span', null, BIND_LABELS[action] ?? action), el('span', { style: { color: '#e8c477' } }, (binds[action] ?? []).map((k) => keyLabel(k)).join(' / '))));
  }

  const tips = el('div', { class: 'dw-help-section' },
    el('h4', null, 'Tips'),
    el('div', null, '• Combat: hold direction to move, X to attack, Shift to dash through danger with brief invulnerability.'),
    el('div', null, '• Quests: talk to NPCs with a ! above their head. Ready quests show ✔ — return to the giver to turn in.'),
    el('div', null, '• Professions: gather Mining/Foraging nodes anywhere. Crafting can be done anywhere once learned, but learning a profession or buying recipes requires visiting its trainer NPC.'),
    el('div', { style: { marginTop: '4px' } }, `• Job Advancement: at level ${JOB_ADVANCE_LEVEL}, visit your class instructor in Gale Outpost to specialize into a tier-2 job.`));

  body.appendChild(controls);
  body.appendChild(tips);
  return ctrl;
}
