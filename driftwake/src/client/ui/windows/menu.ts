import { el } from '../dom';
import { WindowManager, createWindow } from '../manager';
import { bus } from '../../events';

export function createMenuWindow(wm: WindowManager) {
  const body = el('div', { class: 'dw-body' });
  const ctrl = createWindow(wm, { panel: 'menu', title: 'Menu', className: 'dw-menu-window', defaultPos: { x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 140 } }, body);

  const list = el('div', { class: 'dw-menu-list' },
    el('button', { class: 'dw-btn', onclick: () => ctrl.close() }, 'Resume'),
    el('button', { class: 'dw-btn', onclick: () => { ctrl.close(); wm.open('settings'); } }, 'Settings'),
    el('button', { class: 'dw-btn', onclick: () => { ctrl.close(); wm.open('help'); } }, 'Help'),
    el('button', { class: 'dw-btn dw-btn-danger', onclick: () => { ctrl.close(); bus.emit('game:quit'); } }, 'Save & Quit to Title'));
  body.appendChild(list);
  return ctrl;
}
