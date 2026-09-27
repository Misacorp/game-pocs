/**
 * Smoke test for server/index.ts: spawns the real server as a child process on a random port,
 * connects with a plain `ws` client, and drives it through hello -> createCharacter ->
 * enterWorld -> action, exactly like a WsBackend would. This is a black-box integration check,
 * not a unit test — it exercises the actual wire protocol end to end.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { PROTOCOL_VERSION } from '../../src/shared/protocol';
import type { WireClientMessage, WireServerMessage } from '../../src/shared/protocol';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const PORT = 20000 + Math.floor(Math.random() * 10000);

let child: ChildProcess | null = null;

function waitForListening(proc: ChildProcess, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server did not start in time')), timeoutMs);
    const onData = (buf: Buffer) => {
      if (buf.toString().includes('listening')) {
        clearTimeout(timer);
        proc.stdout?.off('data', onData);
        resolve();
      }
    };
    proc.stdout?.on('data', onData);
    proc.on('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited early with code ${code}`));
    });
  });
}

function once(ws: WebSocket, match: (m: WireServerMessage) => boolean, timeoutMs = 10000): Promise<WireServerMessage> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out waiting for message')), timeoutMs);
    const onMessage = (raw: WebSocket.RawData) => {
      const msg = JSON.parse(raw.toString()) as WireServerMessage;
      if (match(msg)) {
        clearTimeout(timer);
        ws.off('message', onMessage);
        resolve(msg);
      }
    };
    ws.on('message', onMessage);
  });
}

function sendMsg(ws: WebSocket, msg: WireClientMessage): void {
  ws.send(JSON.stringify(msg));
}

afterAll(() => {
  if (child && child.pid) {
    try { process.kill(child.pid, 'SIGKILL'); } catch { /* already dead */ }
  }
});

describe('driftwake server (smoke)', () => {
  it('handshakes, creates a character, enters world, and runs an action', async () => {
    // Spawn the local tsx binary directly (not via `npx`) so `child.pid` is the real
    // server process and SIGKILL in afterAll actually reaches it (npx can fork through an
    // extra shell/wrapper layer that leaves the real node process orphaned).
    const tsxBin = path.join(ROOT, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
    child = spawn(tsxBin, ['server/index.ts'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    await waitForListening(child);

    const ws = new WebSocket(`ws://localhost:${PORT}`);
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    sendMsg(ws, { t: 'hello', token: 'smoke-test-token', protocol: PROTOCOL_VERSION });
    const welcome = await once(ws, (m) => m.t === 'welcome');
    expect(welcome.t).toBe('welcome');

    sendMsg(ws, { t: 'createCharacter', rid: 1, req: { name: 'Smokey', classId: 'vanguard', appearance: { skin: '#e8b98a', hair: '#3a2a1e', hairStyle: 0, eyes: '#2a2a2a', outfit: '#5a7a9a' } } });
    const created = await once(ws, (m) => m.t === 'reply' && m.rid === 1);
    if (created.t !== 'reply') throw new Error('unreachable');
    expect(created.ok).toBe(true);
    const character = created.data as { id: string; name: string };
    expect(character.name).toBe('Smokey');

    sendMsg(ws, { t: 'enterWorld', rid: 2, characterId: character.id });
    const entered = await once(ws, (m) => m.t === 'reply' && m.rid === 2);
    if (entered.t !== 'reply') throw new Error('unreachable');
    expect(entered.ok).toBe(true);

    sendMsg(ws, { t: 'action', rid: 3, action: { type: 'syncVitals', hp: 80, mp: 40, x: 10, y: 20 } });
    const acted = await once(ws, (m) => m.t === 'actionResult' && m.rid === 3);
    if (acted.t !== 'actionResult') throw new Error('unreachable');
    expect(acted.result.ok).toBe(true);

    ws.close();
  }, 20000);
});
