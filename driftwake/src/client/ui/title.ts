/**
 * Title screen: logo, character select and character creation.
 */
import { el, clamp } from './dom';
import type { Backend } from '../net';
import { JOBS } from '@shared/data';
import type { Appearance, ClassId, CharacterSummary } from '@shared/types';
import { characterPreviewUrlSafe } from './icons';
import { confirmDialog } from './widgets';
import { audio } from '../audio';

const CLASS_IDS: ClassId[] = ['vanguard', 'stormcaller', 'windrunner', 'shade'];
const FALLBACK_CLASSES: Record<ClassId, { name: string; description: string; playstyle: string; mainStat: string; weapons: string; color: string }> = {
  vanguard: { name: 'Vanguard', description: 'Sturdy frontline brawler with wide sword swings.', playstyle: 'Melee tank / bruiser', mainStat: 'STR', weapons: 'Sword, Axe', color: '#e07a4f' },
  stormcaller: { name: 'Stormcaller', description: 'Elemental caster, fragile, big AoE.', playstyle: 'Ranged magic AoE', mainStat: 'INT', weapons: 'Staff, Wand', color: '#5aa9ff' },
  windrunner: { name: 'Windrunner', description: 'Agile ranged attacker.', playstyle: 'Ranged physical DPS', mainStat: 'DEX', weapons: 'Bow, Gun', color: '#6fdc6f' },
  shade: { name: 'Shade', description: 'Fast, crit-heavy assassin.', playstyle: 'Melee burst / crit', mainStat: 'LUK', weapons: 'Dagger, Knives', color: '#c77dff' },
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

function skyBackdrop(): HTMLElement {
  const layer = el('div', { class: 'dw-title-sky-layer' });
  for (let i = 0; i < 9; i++) {
    const w = 90 + Math.random() * 160;
    const h = w * 0.34;
    const cloud = el('div', {
      class: 'dw-cloud',
      style: {
        width: `${w}px`, height: `${h}px`, top: `${5 + Math.random() * 55}%`, left: `${Math.random() * 100}%`,
        animationDuration: `${40 + Math.random() * 50}s`, animationDelay: `-${Math.random() * 40}s`, opacity: String(0.3 + Math.random() * 0.4),
      },
    });
    layer.appendChild(cloud);
  }
  const whale = el('div', {
    class: 'dw-whale', style: { width: '220px', height: '90px', top: '30%', background: 'radial-gradient(ellipse at 35% 35%, #4a5f8a, #253154 70%)', borderRadius: '50% 50% 45% 45% / 60% 60% 40% 40%' },
  });
  layer.appendChild(whale);
  return layer;
}

export function buildTitleScreen(root: HTMLElement, backend: Backend, onEnter: (characterId: string) => void): void {
  root.innerHTML = '';
  const screen = el('div', { class: 'dw-title-screen' }, skyBackdrop());
  root.appendChild(screen);
  showMenu();

  function showMenu() {
    const content = el('div', { class: 'dw-title-content' },
      el('div', { class: 'dw-logo' }, 'DRIFTWAKE'),
      el('div', { class: 'dw-subtitle' }, 'Tales of the Skywhales'),
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
    const listWrap = el('div', { class: 'dw-charlist' }, el('div', { style: { color: '#a7b0c4' } }, 'Loading...'));
    const panel = el('div', { class: 'dw-panel dw-charselect' },
      el('div', { class: 'dw-logo', style: { fontSize: '30px' } }, 'Choose Your Wayfarer'),
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
        const card = el('div', { class: `dw-charcard ${selected === c.id ? 'dw-selected' : ''}`, onclick: () => { selected = c.id; renderCards(); } },
          el('img', { src: characterPreviewUrlSafe({ classId: c.classId, jobId: c.jobId, appearance: c.appearance }, 3) }),
          el('div', { class: 'dw-cc-name' }, c.name),
          el('div', { class: 'dw-cc-sub' }, `Lv.${c.level} ${jobName}`),
          el('div', { style: { display: 'flex', gap: '6px', marginTop: '8px', justifyContent: 'center' } },
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
      listWrap.appendChild(el('div', { class: 'dw-charcard', style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '150px', fontSize: '13px', color: '#e8c477', fontWeight: '700' }, onclick: () => showCreate() }, '+ Create New'));
    }
    renderCards();

    function enter(id: string) { audio.playSfx('uiClick'); onEnter(id); }
  }

  function showCreate() {
    let name = '';
    let classId: ClassId = 'vanguard';
    let appearance: Appearance = randomAppearance();
    const errorEl = el('div', { class: 'dw-error-text' }, '');
    const preview = el('img', { class: 'dw-doll-preview', style: { position: 'static', width: '140px', height: '175px' } });
    const nameInput = el('input', { class: 'dw-input', placeholder: 'Character name', maxLength: 14, style: { width: '220px' } }) as HTMLInputElement;

    function classCard(id: ClassId): HTMLElement {
      const job = JOBS[id];
      const fb = FALLBACK_CLASSES[id];
      const card = el('div', { class: `dw-class-card ${classId === id ? 'dw-selected' : ''}`, onclick: () => { classId = id; rebuild(); } },
        el('h3', null, job?.name ?? fb.name),
        el('p', null, job?.description ?? fb.description),
        el('p', null, el('b', null, 'Playstyle: '), job?.playstyle ?? fb.playstyle),
        el('p', null, el('b', null, 'Main Stat: '), job ? job.mainStat.toUpperCase() : fb.mainStat),
        el('p', null, el('b', null, 'Weapons: '), job ? job.weaponTypes.join(', ') : fb.weapons));
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

    const body = el('div', { class: 'dw-panel dw-create-flow' });

    function rebuild() {
      preview.src = characterPreviewUrlSafe({ classId, jobId: classId, appearance }, 5);
      const nameVal = nameInput.value;
      body.innerHTML = '';
      body.appendChild(el('div', { class: 'dw-logo', style: { fontSize: '26px' } }, 'Create Your Wayfarer'));
      body.appendChild(el('div', { class: 'dw-class-cards' }, ...CLASS_IDS.map(classCard)));
      body.appendChild(el('div', { class: 'dw-appearance-row' },
        el('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' } }, preview,
          el('button', { class: 'dw-btn dw-btn-sm dw-btn-ghost', onclick: () => { appearance = randomAppearance(); rebuild(); } }, '\u{1F3B2} Random')),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          swatchRow('Skin Tone', SKIN_TONES, appearance.skin, (c) => appearance = { ...appearance, skin: c }),
          swatchRow('Hair Color', HAIR_COLORS, appearance.hair, (c) => appearance = { ...appearance, hair: c }),
          hairStyleRow()),
        el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
          swatchRow('Eye Color', EYE_COLORS, appearance.eyes, (c) => appearance = { ...appearance, eyes: c }),
          swatchRow('Outfit Color', OUTFIT_COLORS, appearance.outfit, (c) => appearance = { ...appearance, outfit: c }))));
      nameInput.value = nameVal;
      body.appendChild(el('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' } },
        el('div', { class: 'dw-field-label' }, ''), nameInput));
      body.appendChild(errorEl);
      body.appendChild(el('div', { style: { display: 'flex', gap: '10px', justifyContent: 'center' } },
        el('button', { class: 'dw-btn dw-btn-ghost', onclick: showCharSelect }, 'Back'),
        el('button', { class: 'dw-btn dw-btn-primary', onclick: doCreate }, 'Create')));
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
