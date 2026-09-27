import type { Backend } from './Backend';
import { LocalBackend } from './LocalBackend';

export type { Backend } from './Backend';

/**
 * Choose a backend. Default: LocalBackend (offline, in-browser).
 * `?server=ws://host:port` selects the WebSocket backend (see server/ and WsBackend).
 */
export async function createBackend(): Promise<Backend> {
  const params = new URLSearchParams(location.search);
  const url = params.get('server');
  if (url) {
    const { WsBackend } = await import('./WsBackend');
    return new WsBackend(url);
  }
  const local = new LocalBackend();
  window.addEventListener('beforeunload', () => local.flush());
  return local;
}
