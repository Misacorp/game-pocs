/**
 * Driftwake authoritative server.
 *
 * Run with:  npx tsx server/index.ts   (PORT env var, default 7777)
 * Connect the client with:             http://localhost:5173/?server=ws://localhost:7777
 *
 * See server/README.md for architecture notes and the roadmap.
 */
import { WebSocketServer } from 'ws';
import { FileStore } from './store';
import { Rooms } from './rooms';
import { Connection } from './connection';

const PORT = Number(process.env.PORT) || 7777;

const store = new FileStore();
const rooms = new Rooms();
const connections = new Set<Connection>();

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  const conn = new Connection(ws, store, rooms);
  connections.add(conn);
  ws.on('close', () => connections.delete(conn));
});

wss.on('listening', () => {
  console.log(`[driftwake-server] listening on ws://localhost:${PORT}`);
});

wss.on('error', (e) => {
  console.error('[driftwake-server] server error', e);
});

function shutdown(): void {
  console.log('[driftwake-server] shutting down...');
  wss.close(() => process.exit(0));
  // Force-exit if close hangs (e.g. sockets not draining).
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
