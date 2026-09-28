import { el } from './dom';
import { bus } from '../events';
import type { GameSession } from '../session';
import { QUESTS, NPCS } from '@shared/data';
import { getQuestState, questObjectiveProgress } from '@shared/logic';
import { WindowManager } from './manager';

const MAX_SHOWN = 6;

export function createQuestTracker(session: GameSession, wm: WindowManager): { root: HTMLElement; cleanup: () => void } {
  const root = el('div', { class: 'dw-tracker' });

  function render() {
    root.innerHTML = '';
    const active = Object.entries(session.state.quests)
      .filter(([, p]) => p.state === 'active')
      .map(([id]) => id)
      .slice(0, MAX_SHOWN);
    for (const questId of active) {
      const def = QUESTS[questId];
      const ready = getQuestState(session.state, questId) === 'ready';
      const card = el('div', { class: `dw-panel dw-tracker-quest ${ready ? 'dw-ready' : ''}`, onclick: () => wm.open('quests') },
        el('div', { class: 'dw-tq-name' }, def?.name ?? questId, ready ? ' ✔' : ''));
      if (ready && def) {
        const turnInNpc = NPCS[def.turnIn ?? def.giver]?.name ?? def.turnIn ?? def.giver;
        card.appendChild(el('div', { class: 'dw-tq-obj dw-tq-return' }, `Return to ${turnInNpc}`));
      }
      const objectives = questObjectiveProgress(session.state, questId);
      for (const o of objectives) {
        card.appendChild(el('div', { class: `dw-tq-obj ${o.done ? 'dw-done' : ''}` }, `${o.text} (${o.current}/${o.target})`));
      }
      root.appendChild(card);
    }
  }
  render();
  const off = bus.on('state', render);
  return { root, cleanup: off };
}
