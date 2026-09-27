import { el, fmtNum } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { makeTabs, confirmDialog, progressBar } from '../widgets';
import { attachTooltip } from '../tooltip';
import { buildItemTooltip } from '../itemTooltip';
import { safeItemIcon } from '../icons';
import { PROFESSIONS, RECIPES, ITEMS } from '@shared/data';
import { recipeAvailability, enhanceChance, rarityOf } from '@shared/logic';
import { MAX_CRAFTING_PROFESSIONS, PROFESSION_MAX_LEVEL, professionXpToNext, RARITY_COLORS } from '@shared/constants';
import type { CraftingProfessionId, GatheringProfessionId, ItemInstance } from '@shared/types';
import { uiState } from '../state';

const CRAFTING_IDS: CraftingProfessionId[] = ['smithing', 'alchemy', 'cooking', 'jewelcrafting'];
const GATHERING_IDS: GatheringProfessionId[] = ['mining', 'foraging'];

export function createProfessionsWindow(wm: WindowManager, session: GameSession) {
  let tab: 'overview' | 'recipes' | 'salvage' | 'enhance' = 'overview';
  let selectedProfession: CraftingProfessionId | null = null;

  const tabsHost = el('div');
  const content = el('div', { style: { marginTop: '10px' } });
  const body = el('div', { class: 'dw-body' }, tabsHost, content);
  const ctrl = createWindow(wm, { panel: 'professions', title: 'Professions', width: 480 }, body);

  const tabs = makeTabs([
    { id: 'overview', label: 'Overview' }, { id: 'recipes', label: 'Recipes' },
    { id: 'salvage', label: 'Salvage' }, { id: 'enhance', label: 'Enhance' },
  ], (id) => { tab = id as any; render(); });
  tabsHost.appendChild(tabs.root);

  function atTrainerFor(profId: CraftingProfessionId): boolean { return uiState.trainerNpcId != null && uiState.trainerProfessionId === profId; }

  function render() {
    content.innerHTML = '';
    if (tab === 'overview') renderOverview();
    else if (tab === 'recipes') renderRecipes();
    else if (tab === 'salvage') renderSalvage();
    else renderEnhance();
  }

  function renderOverview() {
    const st = session.state;
    content.appendChild(el('b', null, 'Gathering'));
    for (const gid of GATHERING_IDS) {
      const def = PROFESSIONS[gid];
      const prog = st.professions[gid] ?? { level: 1, xp: 0 };
      const need = professionXpToNext(prog.level);
      content.appendChild(profRow(def?.name ?? gid, prog.level, prog.xp, need, def?.benefit));
    }
    content.appendChild(el('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: '14px' } },
      el('b', null, 'Crafting'), el('span', { style: { fontSize: '11px', color: '#a7b0c4' } }, `${CRAFTING_IDS.filter((c) => st.professions[c]).length} / ${MAX_CRAFTING_PROFESSIONS} learned`)));
    for (const cid of CRAFTING_IDS) {
      const def = PROFESSIONS[cid];
      const prog = st.professions[cid];
      const row = el('div', { style: { padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' } });
      if (prog) {
        const need = professionXpToNext(prog.level);
        row.appendChild(profRow(def?.name ?? cid, prog.level, prog.xp, need, def?.benefit));
        const btnRow = el('div', { style: { display: 'flex', gap: '8px', marginTop: '4px' } },
          el('button', { class: 'dw-btn dw-btn-sm', onclick: () => { selectedProfession = cid; tab = 'recipes'; tabs.select('recipes'); render(); } }, 'View Recipes'));
        if (atTrainerFor(cid)) {
          btnRow.appendChild(el('button', {
            class: 'dw-btn dw-btn-sm dw-btn-danger',
            onclick: async () => { if (await confirmDialog(`Unlearn ${def?.name ?? cid}? You will lose all progress in this profession.`, { danger: true, okLabel: 'Unlearn' })) session.dispatch({ type: 'unlearnProfession', professionId: cid }); },
          }, 'Unlearn'));
        }
        row.appendChild(btnRow);
      } else {
        row.appendChild(el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
          el('div', null, el('div', null, def?.name ?? cid), el('div', { class: 'dw-tt-desc' }, def?.benefit ?? '')),
          atTrainerFor(cid)
            ? el('button', {
              class: 'dw-btn dw-btn-sm', disabled: CRAFTING_IDS.filter((c) => st.professions[c]).length >= MAX_CRAFTING_PROFESSIONS,
              onclick: () => session.dispatch({ type: 'learnProfession', professionId: cid }),
            }, 'Learn')
            : el('span', { class: 'dw-tt-sub' }, 'Visit a trainer to learn')));
      }
      content.appendChild(row);
    }
  }

  function profRow(name: string, level: number, xp: number, need: number, benefit?: string): HTMLElement {
    const pct = level >= PROFESSION_MAX_LEVEL ? 1 : xp / Math.max(1, need);
    return el('div', { style: { padding: '4px 0' } },
      el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' } }, el('span', null, `${name} — Lv ${level}`), el('span', { style: { color: '#a7b0c4' } }, level >= PROFESSION_MAX_LEVEL ? 'MAX' : `${fmtNum(xp)}/${fmtNum(need)}`)),
      progressBar(pct),
      benefit ? el('div', { class: 'dw-tt-desc', style: { fontSize: '11px' } }, benefit) : null);
  }

  function renderRecipes() {
    const profSelect = el('select', { class: 'dw-select' },
      el('option', { value: '' }, 'Select profession...'),
      ...CRAFTING_IDS.filter((c) => session.state.professions[c]).map((c) => el('option', { value: c, selected: selectedProfession === c }, PROFESSIONS[c]?.name ?? c)));
    profSelect.addEventListener('change', () => { selectedProfession = (profSelect as HTMLSelectElement).value as CraftingProfessionId || null; render(); });
    content.appendChild(profSelect);
    if (!selectedProfession) { content.appendChild(el('div', { style: { color: '#a7b0c4', marginTop: '10px' } }, 'Learn a crafting profession and pick it above to see recipes.')); return; }
    const recipes = Object.values(RECIPES).filter((r) => r.profession === selectedProfession);
    const list = el('div', { style: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' } });
    for (const r of recipes) {
      const known = session.state.knownRecipes.includes(r.id);
      const out = ITEMS[r.output.itemId];
      const card = el('div', { style: { padding: '8px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', opacity: known ? '1' : '0.55' } });
      const head = el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
        el('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, el('img', { src: safeItemIcon(out), style: { width: '26px', height: '26px', imageRendering: 'pixelated' } }), el('b', null, `${out?.name ?? r.output.itemId} x${r.output.qty}`)),
        el('span', { class: 'dw-tt-sub' }, `Req Lv ${r.level}`));
      attachTooltip(head, () => out ? buildItemTooltip(session.state, { uid: '', itemId: out.id, qty: r.output.qty } as ItemInstance) : ['??? Recipe']);
      card.appendChild(head);
      const inputsRow = el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '6px 0' } });
      if (known) {
        const check = recipeAvailability(session.state, r.id);
        for (const inp of check.inputs.length ? check.inputs : r.inputs.map((i) => ({ itemId: i.itemId, have: 0, need: i.qty }))) {
          const ok = inp.have >= inp.need;
          inputsRow.appendChild(el('div', { style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: ok ? '#6fdc6f' : '#ff6b6b' } },
            el('img', { src: safeItemIcon(ITEMS[inp.itemId]), style: { width: '18px', height: '18px', imageRendering: 'pixelated' } }), `${inp.have}/${inp.need}`));
        }
        card.appendChild(inputsRow);
        const btnRow = el('div', { style: { display: 'flex', gap: '6px' } });
        for (const qty of [1, 5]) btnRow.appendChild(el('button', { class: 'dw-btn dw-btn-sm', disabled: !check.canCraft, onclick: () => session.dispatch({ type: 'craft', recipeId: r.id, qty }) }, `x${qty}`));
        btnRow.appendChild(el('button', { class: 'dw-btn dw-btn-sm', disabled: check.maxQty <= 0, onclick: () => session.dispatch({ type: 'craft', recipeId: r.id, qty: check.maxQty }) }, `Max (${check.maxQty})`));
        card.appendChild(btnRow);
        if (!check.canCraft && check.reason) card.appendChild(el('div', { class: 'dw-tt-unmet', style: { fontSize: '11px' } }, check.reason));
      } else {
        for (const inp of r.inputs) inputsRow.appendChild(el('div', { style: { fontSize: '11px', color: '#a7b0c4' } }, `${ITEMS[inp.itemId]?.name ?? inp.itemId} x${inp.qty}`));
        card.appendChild(inputsRow);
        if (r.learn === 'trainer') {
          card.appendChild(atTrainerFor(selectedProfession!)
            ? el('button', { class: 'dw-btn dw-btn-sm', onclick: () => session.dispatch({ type: 'buyRecipe', recipeId: r.id }) }, `Buy Recipe (${r.trainerCost ?? 0}g)`)
            : el('div', { class: 'dw-tt-sub' }, `Learn from a ${PROFESSIONS[selectedProfession!]?.name ?? ''} trainer for ${r.trainerCost ?? 0}g`));
        } else if (r.learn === 'auto') {
          card.appendChild(el('div', { class: 'dw-tt-sub' }, `Learned automatically at profession level ${r.level}`));
        } else {
          card.appendChild(el('div', { class: 'dw-tt-sub' }, r.learn === 'quest' ? 'Learned from a quest reward' : 'Learned from a recipe scroll'));
        }
      }
      list.appendChild(card);
    }
    content.appendChild(list);
  }

  function renderSalvage() {
    content.appendChild(el('div', { class: 'dw-tt-desc', style: { marginBottom: '8px' } }, 'Salvage equipment into materials. Right-click an item in your Inventory and choose Salvage, or drag it here.'));
    const grid = el('div', { class: 'dw-grid' });
    grid.addEventListener('dragover', (e) => e.preventDefault());
    grid.addEventListener('drop', (e) => {
      e.preventDefault();
      const data = e.dataTransfer?.getData('text/plain');
      if (data?.startsWith('item:')) {
        const itemId = data.slice(5);
        const inst = Object.values(session.state.inventory).flat().find((i) => i?.itemId === itemId && ITEMS[i.itemId]?.equip);
        if (inst) session.dispatch({ type: 'salvage', uid: inst.uid });
      }
    });
    for (const tabArr of Object.values(session.state.inventory)) {
      for (const inst of tabArr) {
        if (!inst || !ITEMS[inst.itemId]?.equip) continue;
        const slot = el('div', { class: 'dw-slot', onclick: async () => { if (await confirmDialog(`Salvage ${ITEMS[inst.itemId]?.name}?`)) session.dispatch({ type: 'salvage', uid: inst.uid }); } }, el('img', { src: safeItemIcon(ITEMS[inst.itemId]) }));
        attachTooltip(slot, () => buildItemTooltip(session.state, inst));
        grid.appendChild(slot);
      }
    }
    content.appendChild(grid);
  }

  function renderEnhance() {
    let equipUid: string | null = null;
    let stoneItemId: string | null = null;
    const equipGrid = el('div', { class: 'dw-grid' });
    const stoneGrid = el('div', { class: 'dw-grid' });
    const resultLine = el('div', { style: { marginTop: '10px', fontSize: '12.5px' } });
    const goBtn = el('button', { class: 'dw-btn dw-btn-primary', disabled: true, style: { marginTop: '8px' } }, 'Enhance');

    function refresh() {
      resultLine.innerHTML = '';
      (goBtn as HTMLButtonElement).disabled = !equipUid || !stoneItemId;
      if (equipUid && stoneItemId) {
        const inst = findInst(equipUid);
        if (inst) {
          const chance = enhanceChance(inst, stoneItemId);
          const color = RARITY_COLORS[rarityOf(inst)];
          resultLine.appendChild(el('div', null, `Current: ${'★'.repeat(inst.stars ?? 0)} (${inst.stars ?? 0} stars) — Success chance: `, el('b', { style: { color: chance >= 0.6 ? '#6fdc6f' : chance >= 0.3 ? '#ff9a52' : '#ff6b6b' } }, `${Math.round(chance * 100)}%`)));
        }
      }
    }
    function findInst(uid: string): ItemInstance | undefined {
      for (const tab of Object.values(session.state.inventory)) for (const i of tab) if (i?.uid === uid) return i;
      for (const i of Object.values(session.state.equipment)) if (i?.uid === uid) return i;
      return undefined;
    }
    for (const tabArr of Object.values(session.state.inventory)) {
      for (const inst of tabArr) {
        if (!inst || !ITEMS[inst.itemId]?.equip) continue;
        const slot = el('div', { class: 'dw-slot', onclick: () => { equipUid = inst.uid; refresh(); highlight(equipGrid, slot); } }, el('img', { src: safeItemIcon(ITEMS[inst.itemId]) }));
        attachTooltip(slot, () => buildItemTooltip(session.state, inst));
        equipGrid.appendChild(slot);
      }
    }
    for (const tabArr of Object.values(session.state.inventory)) {
      for (const inst of tabArr) {
        if (!inst || !ITEMS[inst.itemId]?.enhanceStone) continue;
        const slot = el('div', { class: 'dw-slot', onclick: () => { stoneItemId = inst.itemId; refresh(); highlight(stoneGrid, slot); } }, el('img', { src: safeItemIcon(ITEMS[inst.itemId]) }), inst.qty > 1 ? el('div', { class: 'dw-count' }, String(inst.qty)) : null);
        attachTooltip(slot, () => buildItemTooltip(session.state, inst));
        stoneGrid.appendChild(slot);
      }
    }
    function highlight(grid: HTMLElement, sel: HTMLElement) { Array.from(grid.children).forEach((c) => (c as HTMLElement).style.borderColor = c === sel ? '#e8c477' : ''); }

    goBtn.addEventListener('click', () => { if (equipUid && stoneItemId) session.dispatch({ type: 'enhance', uid: equipUid, stoneItemId }); });

    content.appendChild(el('b', null, 'Equipment'));
    content.appendChild(equipGrid);
    content.appendChild(el('b', { style: { display: 'block', marginTop: '10px' } }, 'Enhancement Stone'));
    content.appendChild(stoneGrid);
    content.appendChild(resultLine);
    content.appendChild(goBtn);
  }

  bus.on('ui:crafting', ({ professionId }) => {
    if (professionId) selectedProfession = professionId as CraftingProfessionId;
    tab = 'overview'; tabs.select('overview');
    ctrl.open();
    render();
  });
  bus.on('state', render);

  let lastResultAt = 0;
  bus.on('game', (ev) => {
    if (ev.type === 'enhanceResult' && Date.now() - lastResultAt > 10) {
      lastResultAt = Date.now();
      bus.emit('ui:toast', { text: ev.success ? `Enhance success! +${ev.stars} ★` : ev.destroyed ? 'Enhance failed — item destroyed!' : 'Enhance failed.', kind: ev.success ? 'good' : 'error' });
    }
  });

  render();
  return ctrl;
}
