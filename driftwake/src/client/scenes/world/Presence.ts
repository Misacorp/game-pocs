/**
 * Multiplayer presence: renders other players on the same map as non-colliding interpolated
 * sprites with name tags, and throttles outgoing presence updates to ~8Hz.
 */
import Phaser from 'phaser';
import type { PresenceUpdate, RemotePlayer } from '@shared/protocol';
import { RemotePlayerEntity } from '../../entities/RemotePlayer';
import { session } from '../../session';

const SEND_INTERVAL_MS = 125; // ~8Hz

export class Presence {
  private players = new Map<string, RemotePlayerEntity>();
  private lastSendAt = 0;
  private offJoined: () => void;
  private offMoved: () => void;
  private offLeft: () => void;

  constructor(private scene: Phaser.Scene, private mapId: string) {
    this.offJoined = session.backend.on('playerJoined', (p) => this.onJoined(p));
    this.offMoved = session.backend.on('playerMoved', ({ id, p }) => this.onMoved(id, p));
    this.offLeft = session.backend.on('playerLeft', ({ id }) => this.onLeft(id));
  }

  /** Guards against bot/backend events still arriving after this scene instance has moved on
   *  (scene.restart reuses the same Scene object, so a stale closure could otherwise touch it). */
  private isLive(): boolean {
    return !!this.scene.sys && this.scene.sys.isActive();
  }

  private onJoined(p: RemotePlayer): void {
    if (!this.isLive() || p.mapId !== this.mapId || this.players.has(p.id)) return;
    this.players.set(p.id, new RemotePlayerEntity(this.scene, p));
  }

  private onMoved(id: string, p: PresenceUpdate): void {
    if (!this.isLive()) return;
    if (p.mapId !== this.mapId) { this.onLeft(id); return; }
    this.players.get(id)?.applyMove(p);
  }

  private onLeft(id: string): void {
    const e = this.players.get(id);
    if (e) { try { e.destroy(); } catch { /* ignore */ } this.players.delete(id); }
  }

  update(dtMs: number, playerX: number, playerY: number, vx: number, vy: number, facing: 1 | -1, anim: string): void {
    const dt = dtMs / 1000;
    for (const e of this.players.values()) e.update(dt);
    const now = performance.now();
    if (now - this.lastSendAt > SEND_INTERVAL_MS) {
      this.lastSendAt = now;
      session.backend.sendPresence({ x: playerX, y: playerY, vx, vy, facing, anim, mapId: this.mapId });
    }
  }

  positions(): { x: number; y: number }[] { return [...this.players.values()].map((e) => ({ x: e.sprite.x, y: e.sprite.y })); }

  destroy(): void {
    try { this.offJoined(); } catch { /* ignore */ }
    try { this.offMoved(); } catch { /* ignore */ }
    try { this.offLeft(); } catch { /* ignore */ }
    for (const e of this.players.values()) { try { e.destroy(); } catch { /* ignore */ } }
    this.players.clear();
  }
}
