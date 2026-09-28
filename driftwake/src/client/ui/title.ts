/**
 * Title screen: logo lockup, character select and character creation.
 * The background is a translucent vignette only (BRAND.md) — the Phaser "Title" scene's shader
 * sky (see scenes/TitleScene.ts) is what actually paints behind the DOM here.
 */
import { el } from './dom';
import type { Backend } from '../net';
import { JOBS } from '@shared/data';
import type { Appearance, ClassId, CharacterSummary } from '@shared/types';
import { characterPreviewUrlSafe } from './icons';
import { confirmDialog } from './widgets';
import { attachTooltip } from './tooltip';
import { audio } from '../audio';

const CLASS_IDS: ClassId[] = ['vanguard', 'stormcaller', 'windrunner', 'shade'];
const FALLBACK_CLASSES: Record<ClassId, { name: string; description: string; playstyle: string; mainStat: string; weapons: string; color: string }> = {
  vanguard: { name: 'Vanguard', description: 'Sturdy frontline brawler with wide sword swings.', playstyle: 'Melee tank / bruiser', mainStat: 'STR', weapons: 'Sword, Axe', color: '#e07a4f' },
  stormcaller: { name: 'Stormcaller', description: 'Elemental caster, fragile, big AoE.', playstyle: 'Ranged magic AoE', mainStat: 'INT', weapons: 'Staff, Wand', color: '#5aa9ff' },
  windrunner: { name: 'Windrunner', description: 'Agile ranged attacker.', playstyle: 'Ranged physical DPS', mainStat: 'DEX', weapons: 'Bow, Gun', color: '#6fdc6f' },
  shade: { name: 'Shade', description: 'Fast, crit-heavy assassin.', playstyle: 'Melee burst / crit', mainStat: 'LUK', weapons: 'Dagger, Knives', color: '#c77dff' },
};

// Small scrimshaw-style sigils, one per class, drawn in bone line-work (BRAND.md: engraved bone tablets).
const CLASS_SIGILS: Record<ClassId, string> = {
  vanguard: `<path d="M5 20 17 4" stroke="var(--dw-bone)" stroke-width="2" stroke-linecap="round"/><path d="M13 2 21 8" stroke="var(--dw-bone)" stroke-width="2" stroke-linecap="round"/><circle cx="5" cy="20" r="2" fill="var(--dw-bone)"/>`,
  stormcaller: `<path d="M13 1 5 13 h5 L8 23 19 9 h-5Z" fill="var(--dw-bone)"/>`,
  windrunner: `<path d="M2 9c4-6 16-6 20 0M2 15c4 6 16 6 20 0" stroke="var(--dw-bone)" fill="none" stroke-width="1.6" stroke-linecap="round"/>`,
  shade: `<path d="M12 1 14.5 13 12 23 9.5 13Z" fill="var(--dw-bone)"/><path d="M4 8h16" stroke="var(--dw-bone)" stroke-width="1.4"/>`,
};

const SKIN_TONES = ['#ffe0bd', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5a3825'];
const HAIR_COLORS = ['#1c130d', '#4a2c16', '#8a5a2a', '#c9a227', '#e8e2d0', '#8a2e2e', '#2e4f7a', '#6a2e7a'];
const EYE_COLORS = ['#223344', '#3a6ea5', '#4a7a3a', '#7a3a3a', '#7a5a2a', '#161616'];
const OUTFIT_COLORS = ['#3a6ea5', '#7a2e2e', '#2e7a4f', '#7a5a2a', '#5a2e7a', '#33363f', '#a5793a', '#2e6a7a'];
const HAIR_STYLE_COUNT = 6;

function rand<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomAppearance(): Appearance {
  return { skin: rand(SKIN_TONES), hair: rand(HAIR_COLORS), hairStyle: Math.floor(Math.random() * HAIR_STYLE_COUNT), eyes: rand(EYE_COLORS), outfit: rand(OUTFIT_COLORS) };
}

/** The fluke-rises / wake-draws-itself logo lockup (BRAND.md). Re-runs its entrance animation
 *  every time it's (re)built, since CSS animations restart on element (re)insertion. */
function logoLockup(size: 'lg' | 'sm' = 'lg'): HTMLElement {
  const wakeSvg = `<svg viewBox="0 0 120 14" fill="none" stroke="#f1e6cf" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 7 C 22 1, 38 13, 60 7 S 98 1, 118 7" stroke-opacity=".85" stroke-width="1.3"/>
    <path d="M14 11 C 30 7, 44 14, 60 11 S 88 7, 106 11" stroke-opacity=".45"/>
    <path d="M14 3 C 30 -1, 44 6, 60 3 S 88 -1, 106 3" stroke-opacity=".45"/>
  </svg>`;
  const wakeHost = el('div', { class: 'dw-logo-wake', html: wakeSvg });
  const lockup = el('div', { class: 'dw-logo-lockup' },
    el('div', { class: 'dw-logo-fluke' }),
    el('div', { class: 'dw-logo-word', style: size === 'sm' ? { fontSize: '30px' } : undefined },
      'DRIFT', el('span', { class: 'dw-logo-w' }, 'W'), 'AKE'),
    wakeHost);
  if (size === 'lg') lockup.appendChild(el('div', { class: 'dw-logo-tag' }, 'Tales of the Skywhales'));
  return lockup;
}

export function buildTitleScreen(root: HTMLElement, backend: Backend, onEnter: (characterId: string) => void): void {
  root.innerHTML = '';
  const screen = el('div', { class: 'dw-title-screen' });
  root.appendChild(screen);
  showMenu();

  function showMenu() {
    const content = el('div', { class: 'dw-title-content' },
      logoLockup('lg'),
      el('div', { class: 'dw-title-menu' },
        el('button', { class: 'dw-btn dw-btn-primary', onclick: () => { audio.playSfx('uiClick'); showCharSelect(); } }, 'Play')));
    setContent(content);
  }

  function setContent(node: HTMLElement) {
    const existing = screen.querySelector('.dw-title-content, .dw-panel');
    existing?.remove();
    screen.appendChild(node);
  }

  async function showCharSelect() {
    const listWrap = el('div', { class: 'dw-charlist' }, el('div', { style: { color: 'var(--dw-bone-dim)' } }, 'Loading...'));
    const panel = el('div', { class: 'dw-panel dw-charselect' },
      el('span', { class: 'dwb-corners' }, el('i'), el('i'), el('i'), el('i')),
      logoLockup('sm'),
      listWrap,
      el('div', { style: { display: 'flex', justifyContent: 'center', marginTop: '6px' } },
        el('button', { class: 'dw-btn dw-btn-ghost', onclick: showMenu }, 'Back')));
    setContent(panel);

    let chars: CharacterSummary[] = [];
    try { chars = await backend.listCharacters(); } catch { /* ignore */ }
    listWrap.innerHTML = '';
    let selected: string | null = chars[0]?.id ?? null;

    function renderCards() {
      listWrap.innerHTML = '';
      for (const c of chars) {
        const jobName = JOBS[c.jobId]?.name ?? FALLBACK_CLASSES[c.classId]?.name ?? c.classId;
        const porthole = el('div', { class: 'dw-cc-porthole' }, el('img', { src: characterPreviewUrlSafe({ classId: c.classId, jobId: c.jobId, appearance: c.appearance }, 3) }));
        const card = el('div', { class: `dw-charcard ${selected === c.id ? 'dw-selected' : ''}`, onclick: () => { selected = c.id; renderCards(); } },
          porthole,
          el('div', { class: 'dw-cc-name' }, c.name),
          el('div', { class: 'dw-cc-sub' }, `Lv.${c.level} ${jobName}`),
          el('div', { style: { display: 'flex', gap: '6px', marginTop: '9px', justifyContent: 'center' } },
            el('button', { class: 'dw-btn dw-btn-sm dw-btn-primary', onclick: (e: MouseEvent) => { e.stopPropagation(); enter(c.id); } }, 'Play'),
            el('button', {
              class: 'dw-btn dw-btn-sm dw-btn-danger', onclick: async (e: MouseEvent) => {
                e.stopPropagation();
                if (await confirmDialog(`Permanently delete "${c.name}"? This cannot be undone.`, { danger: true, okLabel: 'Delete' })) {
                  await backend.deleteCharacter(c.id);
                  chars = chars.filter((x) => x.id !== c.id);
                  renderCards();
                }
              },
            }, 'Delete')));
        listWrap.appendChild(card);
      }
      listWrap.appendChild(el('div', { class: 'dw-charcard', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px', fontFamily: 'var(--dw-font-display)', fontSize: '15px', color: 'var(--dw-lantern-hot)' }, onclick: () => showCreate() }, '+ Create New'));
    }
    renderCards();

    function enter(id: string) { audio.playSfx('uiClick'); onEnter(id); }
  }

  function showCreate() {
    let name = '';
    let classId: ClassId = 'vanguard';
    let appearance: Appearance = randomAppearance();
    const errorEl = el('div', { class: 'dw-error-text' }, '');
    const preview = el('img', { class: 'dw-doll-preview', style: { position: 'static', width: '92px', height: '115px' } });
    const nameInput = el('input', { class: 'dw-input', placeholder: 'Character name', maxLength: 14, style: { width: '200px' } }) as HTMLInputElement;

    function classCard(id: ClassId): HTMLElement {
      const job = JOBS[id];
      const fb = FALLBACK_CLASSES[id];
      const card = el('div', {
        class: `dw-class-card ${classId === id ? 'dw-selected' : ''}`, onclick: () => { classId = id; rebuild(); },
        style: { '--dw-class-color': fb.color } as any,
      },
        el('div', { class: 'dw-class-sigil', html: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${CLASS_SIGILS[id]}</svg>` }),
        el('h3', null, job?.name ?? fb.name),
        el('p', null, el('b', null, 'Playstyle: '), job?.playstyle ?? fb.playstyle),
        el('p', null, el('b', null, 'Main Stat: '), job ? job.mainStat.toUpperCase() : fb.mainStat),
        el('p', null, el('b', null, 'Weapons: '), job ? job.weaponTypes.join(', ') : fb.weapons));
      // Full flavor description moves to a hover tooltip — keeps the tablet compact enough that
      // the whole creation screen fits an 1280x720 viewport without scrolling.
      attachTooltip(card, () => [job?.description ?? fb.description]);
      return card;
    }

    function swatchRow(label: string, colors: string[], current: string, onPick: (c: string) => void): HTMLElement {
      return el('div', {}, el('div', { class: 'dw-field-label' }, label),
        el('div', { class: 'dw-swatches' }, ...colors.map((c) => el('div', {
          class: `dw-swatch ${current === c ? 'dw-selected' : ''}`, style: { background: c }, onclick: () => { onPick(c); rebuild(); },
        }))));
    }
    function hairStyleRow(): HTMLElement {
      return el('div', {}, el('div', { class: 'dw-field-label' }, 'Hair Style'),
        el('div', { style: { display: 'flex', gap: '5px' } }, ...Array.from({ length: HAIR_STYLE_COUNT }, (_, i) => el('button', {
          class: `dw-btn dw-btn-sm ${appearance.hairStyle === i ? 'dw-btn-primary' : 'dw-btn-ghost'}`, onclick: () => { appearance = { ...appearance, hairStyle: i }; rebuild(); },
        }, String(i + 1)))));
    }

    const body = el('div', { class: 'dw-panel dw-create-flow' }, el('span', { class: 'dwb-corners' }, el('i'), el('i'), el('i'), el('i')));

    function rebuild() {
      preview.src = characterPreviewUrlSafe({ classId, jobId: classId, appearance }, 5);
      const nameVal = nameInput.value;
      body.innerHTML = '';
      body.appendChild(el('span', { class: 'dwb-corners' }, el('i'), el('i'), el('i'), el('i')));
      // Compact heading (not the full logo lockup) — keeps the whole flow inside 1280x720.
      body.appendChild(el('div', { class: 'dw-create-heading' }, 'Create Your Wayfarer'));
      body.appendChild(el('div', { class: 'dw-class-cards' }, ...CLASS_IDS.map(classCard)));
      body.appendChild(el('div', { class: 'dw-appearance-row' },
        el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' } }, preview,
          el('button', { class: 'dw-btn dw-btn-sm dw-btn-ghost', onclick: () => { appearance = randomAppearance(); rebuild(); } }, '\u{1F3B2} Random')),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          swatchRow('Skin Tone', SKIN_TONES, appearance.skin, (c) => appearance = { ...appearance, skin: c }),
          swatchRow('Hair Color', HAIR_COLORS, appearance.hair, (c) => appearance = { ...appearance, hair: c }),
          hairStyleRow()),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          swatchRow('Eye Color', EYE_COLORS, appearance.eyes, (c) => appearance = { ...appearance, eyes: c }),
          swatchRow('Outfit Color', OUTFIT_COLORS, appearance.outfit, (c) => appearance = { ...appearance, outfit: c }))));
      nameInput.value = nameVal;
      // Name plate + Back/Create share one row so the flow never needs a scrollbar at 720p.
      body.appendChild(el('div', { class: 'dw-name-plate', style: { display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center' } },
        nameInput,
        el('button', { class: 'dw-btn dw-btn-ghost', onclick: showCharSelect }, 'Back'),
        el('button', { class: 'dw-btn dw-btn-primary', onclick: doCreate }, 'Create')));
      body.appendChild(errorEl);
      nameInput.oninput = () => { name = nameInput.value; };
      nameInput.onkeydown = (e) => { if (e.key === 'Enter') doCreate(); };
    }

    async function doCreate() {
      errorEl.textContent = '';
      name = nameInput.value.trim();
      if (name.length < 2) { errorEl.textContent = 'Name must be at least 2 characters.'; return; }
      try {
        const c = await backend.createCharacter({ name, classId, appearance });
        audio.playSfx('uiClick');
        onEnter(c.id);
      } catch (e) {
        errorEl.textContent = (e as Error).message ?? String(e);
      }
    }

    rebuild();
    setContent(body);
    nameInput.focus();
  }
}
