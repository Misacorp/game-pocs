import { el, store } from '../dom';
import { bus } from '../../events';
import { WindowManager, createWindow } from '../manager';
import { audio, type Volumes } from '../../audio';
import { BIND_LABELS, DEFAULT_BINDS, getBinds, setBind, resetBinds, keyLabel } from '../../input/keybinds';
import { tipsEnabled, setTipsEnabled } from '../tips';

const UI_SCALE_KEY = 'driftwake:uiscale';

export function applyStoredUiScale(root: HTMLElement) {
  const scale = store.get(UI_SCALE_KEY, 1);
  (root.style as unknown as { zoom: string }).zoom = String(scale);
}

export function createSettingsWindow(wm: WindowManager, uiRoot: HTMLElement) {
  const body = el('div', { class: 'dw-body', style: { width: '360px' } });
  const ctrl = createWindow(wm, { panel: 'settings', title: 'Settings' }, body);

  let listeningFor: string | null = null;

  function volSlider(label: string, key: keyof Volumes): HTMLElement {
    const v = audio.getVolumes();
    const input = el('input', { type: 'range', min: '0', max: '100', value: String(Math.round((v[key] as number) * 100)), style: { flex: '1' } }) as HTMLInputElement;
    input.addEventListener('input', () => audio.setVolumes({ [key]: parseInt(input.value) / 100 } as Partial<Volumes>));
    return el('div', { class: 'dw-settings-row' }, el('label', null, label), input);
  }

  function muteRow(): HTMLElement {
    const cb = el('input', { type: 'checkbox', checked: audio.getVolumes().muted }) as HTMLInputElement;
    cb.addEventListener('change', () => audio.setVolumes({ muted: cb.checked }));
    return el('div', { class: 'dw-settings-row' }, el('label', null, 'Mute'), cb);
  }

  function tipsRow(): HTMLElement {
    const cb = el('input', { type: 'checkbox', checked: tipsEnabled() }) as HTMLInputElement;
    cb.addEventListener('change', () => setTipsEnabled(cb.checked));
    return el('div', { class: 'dw-settings-row' }, el('label', null, 'Tutorial Tips'), cb);
  }

  function scaleRow(): HTMLElement {
    const cur = store.get(UI_SCALE_KEY, 1);
    const input = el('input', { type: 'range', min: '80', max: '140', step: '5', value: String(Math.round(cur * 100)), style: { flex: '1' } }) as HTMLInputElement;
    const label = el('span', { style: { width: '40px', textAlign: 'right' } }, `${Math.round(cur * 100)}%`);
    input.addEventListener('input', () => {
      const scale = parseInt(input.value) / 100;
      label.textContent = `${input.value}%`;
      store.set(UI_SCALE_KEY, scale);
      applyStoredUiScale(uiRoot);
    });
    return el('div', { class: 'dw-settings-row' }, el('label', null, 'UI Scale'), input, label);
  }

  function bindsSection(): HTMLElement {
    const wrap = el('div', {});
    const binds = getBinds();
    for (const action of Object.keys(DEFAULT_BINDS)) {
      if (action.startsWith('hotbar')) continue;
      const keyEl = el('div', { class: 'dw-bind-key' }, keyLabel(binds[action]?.[0]));
      keyEl.addEventListener('click', () => {
        if (listeningFor) return;
        listeningFor = action;
        keyEl.classList.add('dw-listening');
        keyEl.textContent = '...';
        const onKey = (e: KeyboardEvent) => {
          e.preventDefault(); e.stopPropagation();
          window.removeEventListener('keydown', onKey, true);
          listeningFor = null;
          keyEl.classList.remove('dw-listening');
          if (e.code !== 'Escape') { setBind(action, e.code); bus.emit('keybinds:changed'); }
          keyEl.textContent = keyLabel(getBinds()[action]?.[0]);
        };
        window.addEventListener('keydown', onKey, true);
      });
      wrap.appendChild(el('div', { class: 'dw-bind-row' }, el('span', null, BIND_LABELS[action] ?? action), keyEl));
    }
    const resetBtn = el('button', { class: 'dw-btn dw-btn-sm dw-btn-ghost', style: { marginTop: '8px' }, onclick: () => { resetBinds(); bus.emit('keybinds:changed'); rebuild(); } }, 'Reset to Defaults');
    wrap.appendChild(resetBtn);
    return wrap;
  }

  function rebuild() {
    body.innerHTML = '';
    body.appendChild(el('b', { class: 'dw-caps' }, 'Audio'));
    body.appendChild(volSlider('Master', 'master'));
    body.appendChild(volSlider('Music', 'music'));
    body.appendChild(volSlider('SFX', 'sfx'));
    body.appendChild(muteRow());
    body.appendChild(el('b', { class: 'dw-caps', style: { display: 'block', marginTop: '12px' } }, 'Gameplay'));
    body.appendChild(tipsRow());
    body.appendChild(el('b', { class: 'dw-caps', style: { display: 'block', marginTop: '12px' } }, 'Display'));
    body.appendChild(scaleRow());
    body.appendChild(el('b', { class: 'dw-caps', style: { display: 'block', marginTop: '12px' } }, 'Keybinds'));
    body.appendChild(bindsSection());
  }

  rebuild();
  return { ctrl, isListening: () => listeningFor !== null };
}
