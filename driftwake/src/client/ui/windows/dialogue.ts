import { el, fmtNum } from '../dom';
import { bus } from '../../events';
import type { GameSession } from '../../session';
import { WindowManager, createWindow } from '../manager';
import { confirmDialog, createListNav, keyHintFooter } from '../widgets';
import { safeNpcPortrait, safeItemIcon, goldIconUrl } from '../icons';
import { attachItemTooltip } from '../itemTooltip';
import { NPCS, DIALOGUES, QUESTS, ITEMS } from '@shared/data';
import { checkConditions, questsOfferedBy, questsReadyAt, questsInProgressAt, questObjectiveProgress, describeObjectiveBase } from '@shared/logic';
import type { DialogueAction, DialogueNode, DialogueDef, QuestDef } from '@shared/types';
import { uiState } from '../state';
import { audio } from '../../audio';

const LOCAL_ACTIONS = new Set(['openShop', 'openCrafting', 'close']);

/** Keys that either advance the keyboard-only quest UI (nav/select/back) or should, while the
 *  typewriter is still revealing text, just finish that reveal instead (first press completes
 *  the text, next press acts — see PLAYTEST_NOTES on the dialogue window). */
function isAdvanceKey(e: KeyboardEvent): boolean {
  if (['Enter', 'Space', 'KeyZ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'Escape', 'Backspace'].includes(e.code)) return true;
  return /^Digit[1-9]$/.test(e.code);
}

export function createDialogueWindow(wm: WindowManager, session: GameSession, openWindow: (panel: string) => void) {
  const portrait = el('img', { class: 'dw-dlg-portrait' });
  const nameEl = el('div', { class: 'dw-dlg-name' });
  const titleEl = el('div', { class: 'dw-dlg-title' });
  const textEl = el('div', { class: 'dw-dlg-text' });
  const optionsEl = el('div', { class: 'dw-dlg-options' });
  const footerEl = keyHintFooter('');
  const top = el('div', { class: 'dw-dlg-top' }, portrait, el('div', { style: { flex: '1' } }, nameEl, titleEl, textEl));
  const body = el('div', {}, top, optionsEl, footerEl);

  const ctrl = createWindow(wm, {
    panel: 'dialogue', title: 'Conversation', width: 560, className: 'dw-dialogue-window',
    // Talking to an NPC must block movement/attack/skill input the same way typing in chat does —
    // otherwise the player can walk off, swing weapons or fire skills at monsters while the
    // conversation window sits on top (see ClientEventMap['input:capture']'s own doc comment).
    onOpen: () => bus.emit('input:capture', true),
    // "At the trainer" only applies for the duration of the conversation — closing it (Goodbye/Esc)
    // means the player has to talk to a trainer NPC again before learning/unlearning/buying recipes.
    onClose: () => { uiState.trainerNpcId = null; uiState.trainerProfessionId = null; bus.emit('input:capture', false); },
  }, body);

  let npcId = '';
  let typingCancel: (() => void) | null = null;

  // ---- Keyboard nav plumbing ----------------------------------------------------------------
  // One persistent window-level listener (registered once, at module/window creation time, so it
  // runs before the WindowManager's own Escape-closes-topmost listener registered later in
  // ui/index.ts — see that file's onKeydown). Each screen (root/tree/offer/progress/turn-in)
  // installs its own `keyHandler` via setKeyHandler(); typeText() installs a "complete the
  // typewriter" one first and hands off to the screen's real handler once text finishes revealing.
  let keyHandler: ((e: KeyboardEvent) => void) | null = null;
  function setKeyHandler(fn: ((e: KeyboardEvent) => void) | null) { keyHandler = fn; }
  const onWindowKeyDown = (e: KeyboardEvent) => {
    if (!ctrl.isOpen()) return;
    keyHandler?.(e);
  };
  window.addEventListener('keydown', onWindowKeyDown, true);
  wm.track(() => window.removeEventListener('keydown', onWindowKeyDown, true));

  function currentDlgId(): string | undefined { return NPCS[npcId]?.dialogue; }

  const CHARS_PER_SEC = 55;
  function typeText(text: string, onDone: () => void) {
    typingCancel?.();
    textEl.textContent = '';
    optionsEl.innerHTML = ''; // clear the previous view's options immediately, don't let them linger mid-typing
    footerEl.textContent = '';
    let done = false;
    const start = performance.now();
    const finish = () => { if (done) return; done = true; textEl.textContent = text; onDone(); };
    // Elapsed-time based (not tick-count based) so a laggy frame never slows total reveal time.
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const i = Math.floor((elapsed / 1000) * CHARS_PER_SEC);
      textEl.textContent = text.slice(0, i);
      if (i >= text.length) { window.clearInterval(timer); finish(); }
    }, 16);
    typingCancel = () => { window.clearInterval(timer); finish(); };
    textEl.onclick = () => { if (!done) typingCancel?.(); };
    // First press of any nav/select/back key just completes the reveal (matches the click-to-skip
    // behavior above) — the screen's real key handler takes over once `onDone()` installs it.
    setKeyHandler((e) => {
      if (!isAdvanceKey(e)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      typingCancel?.();
    });
  }

  function runActions(actions: DialogueAction[] | undefined) {
    if (!actions) return;
    for (const a of actions) {
      if (a.type === 'close') { ctrl.close(); continue; }
      if (a.type === 'openShop') { uiState.openShopId = a.shopId; bus.emit('ui:shop', { shopId: a.shopId, npcId }); openWindow('shop'); continue; }
      if (a.type === 'openCrafting') {
        uiState.trainerNpcId = npcId; uiState.trainerProfessionId = a.professionId ?? NPCS[npcId]?.profession ?? null;
        bus.emit('ui:crafting', { professionId: a.professionId, npcId });
        openWindow('professions');
        continue;
      }
      session.dispatch({ type: 'dialogueAction', npcId, action: a });
    }
  }

  function optionRow(label: string, marker: string | null, markerClass: string, onClick: () => void): HTMLElement {
    const row = el('div', { class: `dw-dlg-opt ${markerClass}`, onclick: () => { audio.playSfx('uiClick'); onClick(); } });
    if (marker) row.appendChild(el('span', { class: 'dw-dlg-marker' }, marker));
    row.appendChild(el('span', null, label));
    return row;
  }

  /** Wires ↑/↓ (+W/S) nav, Enter/Space/Z select, 1-9 direct pick and Esc/Backspace-back over every
   *  `.dw-dlg-opt` row currently in optionsEl. Call once options are fully built for the screen. */
  function navigateOptions(onBack: () => void, hint = '↑↓ choose · Enter select · 1-9 pick · Esc back'): void {
    const items = Array.from(optionsEl.querySelectorAll<HTMLElement>('.dw-dlg-opt'));
    const nav = createListNav(items, { numbered: true, onBack });
    setKeyHandler((e) => nav.handleKey(e));
    footerEl.textContent = hint;
  }

  function renderRoot() {
    const npc = NPCS[npcId];
    nameEl.textContent = npc?.name ?? '???';
    titleEl.textContent = npc?.title ?? '';
    portrait.src = safeNpcPortrait(npc);
    const dlgId = currentDlgId();
    const dlg = dlgId ? DIALOGUES[dlgId] : undefined;
    const startNode = dlg?.nodes[dlg.start];
    const text = startNode?.text ?? npc?.greeting ?? '...';

    typeText(text, () => buildRootOptions(dlg, startNode));
  }

  function buildRootOptions(dlg: DialogueDef | undefined, startNode: DialogueNode | undefined) {
    optionsEl.innerHTML = '';
    const st = session.state;
    for (const q of questsReadyAt(st, npcId)) optionsEl.appendChild(optionRow(q.name, '✔', 'dw-marker-ready', () => renderTurnIn(q.id)));
    for (const q of questsOfferedBy(st, npcId)) optionsEl.appendChild(optionRow(q.name, '!', 'dw-marker-offer', () => renderOffer(q.id)));
    for (const q of questsInProgressAt(st, npcId)) optionsEl.appendChild(optionRow(q.name, '…', 'dw-marker-progress', () => renderProgress(q.id)));
    if (startNode?.options) {
      for (const opt of startNode.options) {
        if (!checkConditions(st, opt.conditions)) continue;
        optionsEl.appendChild(optionRow(opt.text, null, '', () => {
          runActions(opt.actions);
          if (opt.next) showTreeNode(opt.next); else renderRoot();
        }));
      }
    }
    const npc = NPCS[npcId];
    if (npc?.shopId) optionsEl.appendChild(optionRow(`Shop`, '$', '', () => runActions([{ type: 'openShop', shopId: npc.shopId! }])));
    if (npc?.profession) optionsEl.appendChild(optionRow(`Crafting (${capitalize(npc.profession)})`, '⚒', '', () => runActions([{ type: 'openCrafting', professionId: npc.profession as any }])));
    optionsEl.appendChild(optionRow('Goodbye', null, 'dw-goodbye', () => ctrl.close()));
    // Root has nowhere to "go back" to — Esc/Backspace closes the conversation instead.
    navigateOptions(() => ctrl.close());
  }

  function showTreeNode(nodeId: string) {
    const dlgId = currentDlgId();
    const dlg = dlgId ? DIALOGUES[dlgId] : undefined;
    const node = dlg?.nodes[nodeId];
    if (!dlg || !node) { renderRoot(); return; }
    runActions(node.actions);
    typeText(node.text, () => {
      optionsEl.innerHTML = '';
      const st = session.state;
      const opts = (node.options ?? []).filter((o) => checkConditions(st, o.conditions));
      if (opts.length) {
        for (const opt of opts) {
          optionsEl.appendChild(optionRow(opt.text, null, '', () => {
            runActions(opt.actions);
            if (opt.next) showTreeNode(opt.next); else renderRoot();
          }));
        }
      } else {
        optionsEl.appendChild(optionRow(node.next ? 'Continue' : 'Goodbye', null, 'dw-goodbye', () => {
          if (node.next) showTreeNode(node.next); else ctrl.close();
        }));
      }
      navigateOptions(() => renderRoot());
    });
  }

  // ---- Quest offer / turn-in / in-progress views ----
  function renderOffer(questId: string, page = 0) {
    const def = QUESTS[questId];
    if (!def) { renderRoot(); return; }
    nameEl.textContent = NPCS[npcId]?.name ?? '???';
    titleEl.textContent = def.name;
    const paragraphs = def.offer.split(/\n\n+/);
    const isLast = page >= paragraphs.length - 1;
    typeText(paragraphs[Math.min(page, paragraphs.length - 1)] ?? '', () => {
      optionsEl.innerHTML = '';
      if (!isLast) {
        optionsEl.appendChild(optionRow('Continue ▸', null, '', () => renderOffer(questId, page + 1)));
        optionsEl.appendChild(optionRow('Back', null, 'dw-goodbye', () => (page > 0 ? renderOffer(questId, page - 1) : renderRoot())));
        footerEl.textContent = '←→ page · Enter continue · Esc decline';
        setKeyHandler((e) => {
          const c = e.code;
          if (c === 'ArrowRight' || c === 'Enter' || c === 'Space' || c === 'KeyZ') { e.preventDefault(); e.stopImmediatePropagation(); renderOffer(questId, page + 1); }
          else if (c === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); if (page > 0) renderOffer(questId, page - 1); else renderRoot(); }
          else if (c === 'Escape' || c === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); renderRoot(); }
        });
        return;
      }
      for (const o of def.objectives) optionsEl.appendChild(el('div', { class: 'dw-dlg-obj' }, `• ${describeObjectiveBase(o)}`));
      optionsEl.appendChild(rewardsRow(def));
      const actions = el('div', { class: 'dw-dlg-actions' },
        el('button', { class: 'dw-btn dw-btn-ghost', onclick: () => renderRoot() }, 'Decline'),
        el('button', { class: 'dw-btn dw-btn-primary', onclick: () => { session.dispatch({ type: 'acceptQuest', questId }); renderRoot(); } }, 'Accept'));
      optionsEl.appendChild(actions);
      // Quest offer's final page: Enter always accepts, Esc always declines, ←/→ still page
      // (there's nowhere for → to go here, but ← can revisit earlier paragraphs).
      footerEl.textContent = paragraphs.length > 1 ? '← page back · Enter accept · Esc decline' : 'Enter accept · Esc decline';
      setKeyHandler((e) => {
        const c = e.code;
        if (c === 'Enter' || c === 'Space' || c === 'KeyZ') { e.preventDefault(); e.stopImmediatePropagation(); session.dispatch({ type: 'acceptQuest', questId }); renderRoot(); }
        else if (c === 'Escape' || c === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); renderRoot(); }
        else if (c === 'ArrowLeft' && page > 0) { e.preventDefault(); e.stopImmediatePropagation(); renderOffer(questId, page - 1); }
      });
    });
  }

  function renderProgress(questId: string) {
    const def = QUESTS[questId];
    if (!def) { renderRoot(); return; }
    nameEl.textContent = NPCS[npcId]?.name ?? '???';
    titleEl.textContent = def.name;
    typeText(def.progress, () => {
      optionsEl.innerHTML = '';
      for (const o of questObjectiveProgress(session.state, questId)) {
        optionsEl.appendChild(el('div', { class: `dw-dlg-obj ${o.done ? 'dw-done' : ''}` }, `${o.done ? '✓' : '•'} ${o.text} (${o.current}/${o.target})`));
      }
      optionsEl.appendChild(optionRow('Back', null, 'dw-goodbye', () => renderRoot()));
      navigateOptions(() => renderRoot());
    });
  }

  function renderTurnIn(questId: string) {
    const def = QUESTS[questId];
    if (!def) { renderRoot(); return; }
    nameEl.textContent = NPCS[npcId]?.name ?? '???';
    titleEl.textContent = def.name;
    let choiceId: string | undefined;
    let chooseIndex: number | undefined;

    typeText(def.complete, () => {
      optionsEl.innerHTML = '';
      for (const o of questObjectiveProgress(session.state, questId)) {
        optionsEl.appendChild(el('div', { class: 'dw-dlg-obj dw-done' }, `✓ ${o.text}`));
      }
      optionsEl.appendChild(rewardsRow(def));

      let chooseOneRow: HTMLElement | null = null;
      if (def.rewards.chooseOne?.length) {
        chooseOneRow = el('div', { style: { display: 'flex', gap: '8px', margin: '6px 0' } });
        def.rewards.chooseOne.forEach((it, idx) => {
          const card = el('div', {
            class: 'dw-choice-card', style: { flex: '1', textAlign: 'center' },
            onclick: () => { chooseIndex = idx; refreshChoiceCards(); updateCompleteBtn(); },
          }, el('img', { src: safeItemIcon(ITEMS[it.itemId]), style: { width: '28px', height: '28px' } }), el('div', { class: 'dw-choice-label', style: { fontSize: '11.5px' } }, ITEMS[it.itemId]?.name ?? it.itemId));
          attachItemTooltip(card, session.state, { uid: '', itemId: it.itemId, qty: it.qty ?? 1 });
          chooseOneRow!.appendChild(card);
        });
        optionsEl.appendChild(chooseOneRow);
      }

      let choicesHost: HTMLElement | null = null;
      if (def.choices?.length) {
        choicesHost = el('div', {});
        for (const c of def.choices) {
          const locked = !checkConditions(session.state, c.reqs);
          const card = el('div', {
            class: `dw-choice-card ${locked ? 'dw-locked' : ''}`,
            onclick: () => { if (locked) return; choiceId = c.id; refreshChoiceCards(); updateCompleteBtn(); },
          },
            el('div', { class: 'dw-choice-label' }, c.label),
            el('div', { class: locked ? 'dw-choice-hint' : 'dw-choice-desc' }, locked ? (c.lockedHint ?? 'A path not yet open to you...') : c.description));
          choicesHost.appendChild(card);
        }
        optionsEl.appendChild(choicesHost);
      }

      function refreshChoiceCards() {
        if (choicesHost) Array.from(choicesHost.children).forEach((el2, i) => el2.classList.toggle('dw-selected', def.choices![i].id === choiceId));
        if (chooseOneRow) Array.from(chooseOneRow.children).forEach((el2, i) => el2.classList.toggle('dw-selected', i === chooseIndex));
      }

      const completeBtn = el('button', { class: 'dw-btn dw-btn-primary' }, 'Complete');
      function updateCompleteBtn() {
        const needsChoice = !!def.choices?.length && !choiceId;
        const needsChoose = !!def.rewards.chooseOne?.length && chooseIndex === undefined;
        (completeBtn as HTMLButtonElement).disabled = needsChoice || needsChoose;
      }
      completeBtn.addEventListener('click', async () => {
        if (def.choices?.length) {
          const chosen = def.choices.find((c) => c.id === choiceId);
          // The "weighty choice" confirm is confirmDialog (never native confirm()) — fully
          // keyboard-operable (←/→, Enter, Esc) per widgets.ts.
          const ok = await confirmDialog(`Confirm: "${chosen?.label}"?\nThis choice is permanent.`, { okLabel: 'Confirm Choice' });
          if (!ok) return;
        }
        session.dispatch({ type: 'completeQuest', questId, choiceId, chooseIndex });
        renderRoot();
      });
      updateCompleteBtn();
      optionsEl.appendChild(el('div', { class: 'dw-dlg-actions' }, completeBtn));

      // Keyboard nav across reward picks / choice cards (locked ones skipped) + Complete.
      const navItems: HTMLElement[] = [
        ...(chooseOneRow ? (Array.from(chooseOneRow.children) as HTMLElement[]) : []),
        ...(choicesHost ? (Array.from(choicesHost.children).filter((c) => !c.classList.contains('dw-locked')) as HTMLElement[]) : []),
        completeBtn,
      ];
      const nav = createListNav(navItems, { horizontal: true, onBack: () => renderRoot() });
      setKeyHandler((e) => nav.handleKey(e));
      footerEl.textContent = '↑↓←→ choose · Enter confirm · Esc back';
    });
  }

  function rewardsRow(def: QuestDef): HTMLElement {
    const row = el('div', { class: 'dw-dlg-reward-row' });
    if (def.rewards.xp) row.appendChild(el('div', { class: 'dw-dlg-reward' }, `${fmtNum(def.rewards.xp)} XP`));
    if (def.rewards.gold) row.appendChild(el('div', { class: 'dw-dlg-reward' }, el('img', { src: goldIconUrl(16) }), `${fmtNum(def.rewards.gold)}`));
    for (const it of def.rewards.items ?? []) {
      const chip = el('div', { class: 'dw-dlg-reward' }, el('img', { src: safeItemIcon(ITEMS[it.itemId]) }), `${ITEMS[it.itemId]?.name ?? it.itemId}${it.qty && it.qty > 1 ? ` x${it.qty}` : ''}`);
      attachItemTooltip(chip, session.state, { uid: '', itemId: it.itemId, qty: it.qty ?? 1 });
      row.appendChild(chip);
    }
    return row;
  }

  wm.track(bus.on('ui:dialogue', ({ npcId: id }) => {
    if (npcId !== id) { uiState.trainerNpcId = null; uiState.trainerProfessionId = null; }
    npcId = id;
    session.dispatch({ type: 'talk', npcId: id });
    ctrl.open();
    renderRoot();
  }));

  return ctrl;
}

function capitalize(s: string): string { return s.length ? s[0].toUpperCase() + s.slice(1) : s; }
