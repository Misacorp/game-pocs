import { el } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { makeTabs, progressBar } from '../widgets';
import { iconUrl, skillIconUrl } from '../../gfx';
import { ACHIEVEMENT_LIST } from '@shared/data/achievements';
import { achievementProgress } from '@shared/logic';
import type { AchievementCategory, AchievementDef, SkillIconShape } from '@shared/types';

const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  combat: 'Combat', exploration: 'Exploration', professions: 'Professions',
  quests: 'Quests', collection: 'Collection', economy: 'Economy', social: 'Social',
};
const CATEGORY_ORDER: AchievementCategory[] = ['combat', 'exploration', 'professions', 'quests', 'collection', 'economy', 'social'];

// Same shape list as shared/types.ts SkillIconShape — used to decide which icon drawer to call
// for an AchievementDef.icon (SkillIconSpec | IconSpec).
const SKILL_SHAPES = new Set<string>([
  'slash', 'spin', 'shield', 'fist', 'burst', 'bolt', 'orb', 'flame', 'snow', 'wave', 'wind', 'arrow',
  'arrows', 'bullet', 'bomb', 'dash', 'dagger', 'shuriken', 'skull', 'eye', 'heart', 'star', 'moon',
  'feather', 'claw', 'rune', 'aura', 'trap',
]);

function achievementIconUrl(def: AchievementDef, size = 32): string {
  try {
    if (SKILL_SHAPES.has(def.icon.shape)) return skillIconUrl({ id: def.id, icon: def.icon as { shape: SkillIconShape; colors: string[] } }, size);
    return iconUrl(def.icon as any, size);
  } catch { return iconUrl({ shape: 'orb', colors: ['#555b6e'] }, size); }
}

export function createAchievementsWindow(wm: WindowManager, session: GameSession) {
  let tab: AchievementCategory | 'all' = 'all';
  const list = el('div', { class: 'dw-ach-list' });
  const summary = el('div', { style: { fontSize: '11.5px', color: '#a7b0c4', marginBottom: '6px' } });
  const tabsHost = el('div');
  const body = el('div', { class: 'dw-body', style: { width: '440px' } }, summary, tabsHost, list);
  const ctrl = createWindow(wm, { panel: 'achievements', title: 'Achievements', width: 460 }, body);

  const tabs = makeTabs(
    [{ id: 'all', label: 'All' }, ...CATEGORY_ORDER.map((c) => ({ id: c, label: CATEGORY_LABEL[c] }))],
    (id) => { tab = id as AchievementCategory | 'all'; render(); },
  );
  tabsHost.appendChild(tabs.root);

  function render() {
    const st = session.state;
    const unlocked = st.achievements ?? {};
    const total = ACHIEVEMENT_LIST.length;
    const have = Object.keys(unlocked).length;
    summary.textContent = `${have} / ${total} unlocked`;

    list.innerHTML = '';
    const defs = ACHIEVEMENT_LIST.filter((a) => tab === 'all' || a.category === tab);
    for (const def of defs) {
      const at = unlocked[def.id];
      const isUnlocked = !!at;
      const showHidden = def.hidden && !isUnlocked;
      const row = el('div', { class: `dw-ach-row ${isUnlocked ? 'dw-ach-unlocked' : 'dw-ach-locked'}` });
      row.appendChild(el('img', { src: showHidden ? iconUrl({ shape: 'orb', colors: ['#333844'] }, 32) : achievementIconUrl(def), class: 'dw-ach-icon' }));
      const info = el('div', { class: 'dw-ach-info' });
      info.appendChild(el('div', { class: 'dw-ach-name' }, showHidden ? '???' : def.name));
      info.appendChild(el('div', { class: 'dw-ach-desc' }, showHidden ? 'Hidden achievement' : def.description));
      if (!showHidden && !isUnlocked) {
        const prog = achievementProgress(st, def);
        if (prog && prog.target > 1) {
          info.appendChild(el('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' } },
            progressBar(prog.current / prog.target, 'dw-ach-progress'),
            el('span', { style: { fontSize: '10px', color: '#a7b0c4', whiteSpace: 'nowrap' } }, `${Math.floor(prog.current)}/${prog.target}`)));
        }
      }
      if (isUnlocked) info.appendChild(el('div', { class: 'dw-ach-date' }, `Unlocked ${new Date(at).toLocaleDateString()}`));
      row.appendChild(info);
      list.appendChild(row);
    }
    if (!defs.length) list.appendChild(el('div', { style: { color: '#a7b0c4' } }, 'Nothing here yet.'));
  }

  wm.track(bus.on('state', render));
  wm.track(bus.on('game', (ev) => { if (ev.type === 'achievementUnlocked') render(); }));
  render();
  return ctrl;
}
