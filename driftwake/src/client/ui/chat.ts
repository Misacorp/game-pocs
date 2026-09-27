import { el } from './dom';
import { bus } from '../events';
import type { GameSession } from '../session';
import type { ChatMessage } from '@shared/protocol';

export function createChat(session: GameSession): { root: HTMLElement; cleanup: () => void } {
  const log = el('div', { class: 'dw-chat-log' });
  const input = el('input', { class: 'dw-input', placeholder: 'Press Enter to chat, /help for commands' }) as HTMLInputElement;
  const inputRow = el('div', { class: 'dw-chat-input-row' }, input);
  const root = el('div', { class: 'dw-panel dw-chat' }, log, inputRow);

  function addLine(text: string, cls = '') {
    const line = el('div', { class: cls }, text);
    log.appendChild(line);
    while (log.children.length > 60) log.removeChild(log.firstChild!);
    log.scrollTop = log.scrollHeight;
  }

  addLine('Welcome to Driftwake. Type /help for commands.', 'dw-chat-system');

  function onChatMsg(msg: ChatMessage) {
    if (msg.channel === 'system') addLine(msg.text, 'dw-chat-system');
    else addLine1(msg);
  }
  function addLine1(msg: ChatMessage) {
    const line = el('div', null, el('span', { class: 'dw-chat-name' }, `${msg.from}:`), ` ${msg.text}`);
    log.appendChild(line);
    while (log.children.length > 60) log.removeChild(log.firstChild!);
    log.scrollTop = log.scrollHeight;
  }

  const offBus = bus.on('chat', onChatMsg);
  const offBackend = session.backend.on('chat', onChatMsg);

  function openInput() {
    inputRow.classList.add('dw-active');
    input.focus();
    bus.emit('input:capture', true);
  }
  function closeInput() {
    inputRow.classList.remove('dw-active');
    input.blur();
    bus.emit('input:capture', false);
  }

  const offToggle = bus.on('ui:toggle', ({ panel }) => {
    if (panel !== 'chat') return;
    if (document.activeElement === input) closeInput(); else openInput();
  });

  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { input.value = ''; closeInput(); }
    else if (e.key === 'Enter') {
      const text = input.value.trim();
      input.value = '';
      if (text) send(text);
      closeInput();
    }
  });
  input.addEventListener('blur', () => { inputRow.classList.remove('dw-active'); bus.emit('input:capture', false); });

  function send(text: string) {
    if (text.startsWith('/')) {
      const [cmd, ...rest] = text.slice(1).split(' ');
      handleCommand(cmd.toLowerCase(), rest.join(' '));
      return;
    }
    session.backend.sendChat('map', text);
  }

  function handleCommand(cmd: string, _args: string) {
    switch (cmd) {
      case 'help':
        addLine('Commands: /help, /stuck', 'dw-chat-system');
        break;
      case 'stuck':
        bus.emit('ui:toast', { text: 'Use a Return Scroll or visit a Skyferry to get unstuck.', kind: 'info' });
        break;
      default:
        addLine(`Unknown command: /${cmd}`, 'dw-chat-system');
    }
  }

  return { root, cleanup: () => { offBus(); offBackend(); offToggle(); } };
}
