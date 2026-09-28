/**
 * Presence "rooms" — one per mapId. Connections join the room for the map their character is
 * standing on, and broadcasts (playerJoined/playerLeft/playerMoved/map chat) only reach the
 * other connections currently in that same room. 'world' chat broadcasts to every room.
 */
import type { WebSocket } from 'ws';
import type { WireServerMessage } from '../src/shared/protocol';

export interface RoomMember {
  id: string;
  ws: WebSocket;
  mapId: string;
}

export class Rooms {
  private byMap = new Map<string, Set<RoomMember>>();

  join(member: RoomMember): void {
    let set = this.byMap.get(member.mapId);
    if (!set) { set = new Set(); this.byMap.set(member.mapId, set); }
    set.add(member);
  }

  leave(member: RoomMember): void {
    const set = this.byMap.get(member.mapId);
    if (!set) return;
    set.delete(member);
    if (set.size === 0) this.byMap.delete(member.mapId);
  }

  /** Move a member from its current room to `mapId` (updates member.mapId in place). */
  move(member: RoomMember, mapId: string): void {
    if (member.mapId === mapId) return;
    this.leave(member);
    member.mapId = mapId;
    this.join(member);
  }

  membersOf(mapId: string): RoomMember[] {
    return [...(this.byMap.get(mapId) ?? [])];
  }

  broadcast(mapId: string, msg: WireServerMessage, exceptId?: string): void {
    const set = this.byMap.get(mapId);
    if (!set || set.size === 0) return;
    const data = JSON.stringify(msg);
    for (const m of set) {
      if (m.id === exceptId) continue;
      if (m.ws.readyState === m.ws.OPEN) m.ws.send(data);
    }
  }

  broadcastAll(msg: WireServerMessage, exceptId?: string): void {
    const data = JSON.stringify(msg);
    for (const set of this.byMap.values()) {
      for (const m of set) {
        if (m.id === exceptId) continue;
        if (m.ws.readyState === m.ws.OPEN) m.ws.send(data);
      }
    }
  }
}
