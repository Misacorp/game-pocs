/**
 * Feed (bottom-left pickups/xp/quest progress), toasts (center-top), banners (big center),
 * boss bar (top-center), interaction hint, and the death dialog.
 */
import { el, fmtNum } from './dom';
import { bus } from '../events';
import type { GameSession } from '../session';
import { ITEMS } from '@shared/data';
import { RARITY_COLORS } from '@shared/constants';
import { safeItemIcon, goldIconUrl, xpIconUrl } from './icons';
import { audio } from '../audio';

export function createNotificationLayer(_session: GameSession): { root: HTMLElement; cleanup: () => void } {
  const feed = el('div', { class: 'dw-feed' });
  const toasts = el('div', { class: 'dw-toasts' });
  const bannerSlot = el('div', {});
  const bossSlot = el('div', {});
  const hintSlot = el('div', {});
  const deathSlot = el('div', {});
  const root = el('div', { style: { position: 'absolute', inset: '0', pointerEvents: 'none' } }, feed, toasts, bannerSlot, bossSlot, hintSlot, deathSlot);

  const offs: (() => void)[] = [];

  function feedIcon(iconUrl?: string) {
    return iconUrl ? el('img', { src: iconUrl, style: { width: '14px', height: '14px', verticalAlign: 'middle', marginRight: '5px', imageRendering: 'pixelated' } }) : null;
  }
  function fadeAndRemove(item: HTMLElement) {
    item.style.transition = 'opacity .4s'; item.style.opacity = '0'; window.setTimeout(() => item.remove(), 420);
  }
  function pushFeed(text: string, kind: string, iconUrl?: string, textColor?: string) {
    const item = el('div', { class: `dw-feed-item dw-${kind}` }, feedIcon(iconUrl), el('span', { style: textColor ? { color: textColor } : undefined }, text));
    feed.appendChild(item);
    while (feed.children.length > 8) feed.removeChild(feed.firstChild!);
    window.setTimeout(() => fadeAndRemove(item), 6500);
  }

  // Rapid repeats of the same kind of event (killing several monsters in a row, picking up a
  // stack of the same material) collapse into one growing line instead of spamming the feed.
  const GROUP_WINDOW_MS = 3000;
  const groups = new Map<string, { item: HTMLElement; amount: number; timer: number; textSpan: HTMLElement }>();
  function pushAggregated(groupKey: string, amount: number, kind: string, iconUrl: string | undefined, textColor: string | undefined, render: (n: number) => string) {
    const g = groups.get(groupKey);
    if (g) {
      g.amount += amount;
      g.textSpan.textContent = render(g.amount);
      window.clearTimeout(g.timer);
      g.timer = window.setTimeout(() => { groups.delete(groupKey); fadeAndRemove(g.item); }, GROUP_WINDOW_MS);
      return;
    }
    const textSpan = el('span', { style: textColor ? { color: textColor } : undefined }, render(amount));
    const item = el('div', { class: `dw-feed-item dw-${kind}` }, feedIcon(iconUrl), textSpan);
    feed.appendChild(item);
    while (feed.children.length > 8) feed.removeChild(feed.firstChild!);
    const timer = window.setTimeout(() => { groups.delete(groupKey); fadeAndRemove(item); }, GROUP_WINDOW_MS);
    groups.set(groupKey, { item, amount, timer, textSpan });
  }

  offs.push(bus.on('ui:toast', ({ text, kind }) => {
    const t = el('div', { class: `dw-panel dw-toast` }, text);
    const kindColor: Record<string, string> = { error: '#ff6b6b', good: '#6fdc6f', warn: '#ff9a52', quest: '#c77dff' };
    if (kindColor[kind]) t.style.color = kindColor[kind];
    toasts.appendChild(t);
    window.setTimeout(() => { t.classList.add('dw-fade-out'); window.setTimeout(() => t.remove(), 260); }, 2600);
  }));

  offs.push(bus.on('ui:banner', ({ title, subtitle, kind }) => {
    bannerSlot.innerHTML = '';
    const b = el('div', { class: `dw-panel dw-banner dw-${kind ?? 'map'}` },
      el('div', { class: 'dw-banner-title' }, title),
      subtitle ? el('div', { class: 'dw-banner-sub' }, subtitle) : null);
    // banners are chrome-less (no panel bg) — override
    b.style.background = 'transparent'; b.style.border = 'none'; b.style.boxShadow = 'none';
    bannerSlot.appendChild(b);
    window.setTimeout(() => { b.classList.add('dw-fade-out'); window.setTimeout(() => b.remove(), 420); }, kind === 'job' ? 3400 : 2200);
  }));

  offs.push(bus.on('ui:bossBar', (payload) => {
    bossSlot.innerHTML = '';
    if (!payload) return;
    const pct = payload.maxHp > 0 ? payload.hp / payload.maxHp : 0;
    bossSlot.appendChild(el('div', { class: 'dw-panel dw-bossbar' },
      payload.title ? el('div', { class: 'dw-boss-title' }, payload.title) : null,
      el('div', { class: 'dw-boss-name dw-caps' }, payload.name),
      el('div', { class: 'dw-bar-track' }, el('div', { class: 'dw-bar-fill', style: { width: `${Math.round(pct * 100)}%` } }))));
  }));

  offs.push(bus.on('ui:hint', (payload) => {
    hintSlot.innerHTML = '';
    if (!payload) return;
    hintSlot.appendChild(el('div', { class: 'dw-panel dw-hint' }, payload.text));
  }));

  offs.push(bus.on('ui:death', ({ xpLost }) => {
    deathSlot.innerHTML = '';
    const overlay = el('div', { class: 'dw-death-overlay' },
      el('div', { class: 'dw-panel dw-death-box' },
        el('h2', { class: 'dw-caps' }, 'You Died'),
        el('div', { style: { color: '#a7b0c4', marginBottom: '16px' } }, `Lost ${fmtNum(xpLost)} XP`),
        el('button', {
          class: 'dw-btn dw-btn-primary', onclick: () => { overlay.remove(); bus.emit('player:respawn'); },
        }, 'Respawn')));
    deathSlot.appendChild(overlay);
  }));

  // Notification feed from GameEvents
  offs.push(bus.on('game', (ev) => {
    switch (ev.type) {
      case 'itemAdded': {
        const def = ITEMS[ev.itemId];
        const color = ev.rarity ? RARITY_COLORS[ev.rarity as keyof typeof RARITY_COLORS] : def ? RARITY_COLORS[def.rarity] : '#e8e8e8';
        pushAggregated(`item:${ev.itemId}`, ev.qty, 'loot', safeItemIcon(def), color, (n) => `+${n} ${def?.name ?? '???'}`);
        break;
      }
      case 'itemRemoved': {
        const def = ITEMS[ev.itemId];
        pushAggregated(`itemRemoved:${ev.itemId}`, ev.qty, 'warn', undefined, undefined, (n) => `-${n} ${def?.name ?? '???'}`);
        break;
      }
      case 'gold': if (ev.amount) pushAggregated('gold', ev.amount, ev.amount > 0 ? 'good' : 'warn', goldIconUrl(), undefined, (n) => `${n > 0 ? '+' : ''}${fmtNum(n)} Gold`); break;
      case 'xp': if (ev.amount) pushAggregated('xp', ev.amount, 'good', xpIconUrl(), undefined, (n) => `+${fmtNum(n)} XP`); break;
      case 'questProgress': pushFeed(`Quest progress ${ev.value}/${ev.target}`, 'quest'); break;
      case 'questAccepted': pushFeed('Quest accepted', 'quest'); audio.playSfx('questAccept'); break;
      case 'questReady': pushFeed('Quest ready to turn in!', 'quest'); break;
      case 'questCompleted': pushFeed('Quest completed!', 'quest'); audio.playSfx('questComplete'); bus.emit('ui:banner', { title: 'Quest Complete', kind: 'quest' }); break;
      case 'questAbandoned': pushFeed('Quest abandoned', 'warn'); break;
      case 'levelUp': bus.emit('ui:banner', { title: 'LEVEL UP!', subtitle: `+${ev.ap} AP, +${ev.sp} SP`, kind: 'level' }); audio.playSfx('levelUp'); break;
      case 'professionLevelUp': pushFeed(`${capitalize(ev.professionId)} reached level ${ev.level}!`, 'good'); break;
      case 'professionLearned': pushFeed(`Learned ${capitalize(ev.professionId)}`, 'good'); break;
      case 'recipeLearned': pushFeed('New recipe learned', 'good'); break;
      case 'jobAdvanced': bus.emit('ui:banner', { title: 'JOB ADVANCEMENT!', subtitle: capitalize(ev.jobId), kind: 'job' }); audio.playSfx('jobAdvance'); break;
      case 'titleUnlocked': pushFeed(`Title unlocked: "${ev.title}"`, 'good'); break;
      case 'reputation': if (ev.amount) pushFeed(`${capitalize(ev.faction)} reputation ${ev.amount > 0 ? '+' : ''}${ev.amount}`, 'good'); break;
      case 'mapChanged': bus.emit('ui:banner', { title: capitalize(ev.mapId.replace(/_/g, ' ')), kind: 'map' }); break;
      case 'bossDefeated': pushFeed('Boss defeated!', 'good'); break;
      case 'notify': pushFeed(ev.text, ev.kind === 'error' ? 'error' : ev.kind === 'good' ? 'good' : ev.kind === 'warn' ? 'warn' : ev.kind === 'quest' ? 'quest' : ev.kind === 'loot' ? 'loot' : ''); break;
      case 'died': bus.emit('ui:death', { xpLost: ev.xpLost }); audio.playSfx('death'); break;
    }
  }));

  return { root, cleanup: () => offs.forEach((o) => o()) };
}

function capitalize(s: string): string { return s.length ? s[0].toUpperCase() + s.slice(1) : s; }
