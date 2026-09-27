# Driftwake server

A small Node/WebSocket authoritative server that speaks the same wire protocol
(`src/shared/protocol.ts`) the client's `WsBackend` expects, and runs the exact same shared
reducer (`src/shared/logic`) that `LocalBackend` runs in the browser. Swapping the client from
offline to online is just adding `?server=ws://host:port` to the URL — no game code changes.

## Running it

```sh
# from the project root
npx tsx server/index.ts
# or with a custom port
PORT=8080 npx tsx server/index.ts
```

The server listens on `PORT` (env var, default `7777`) and persists character data as JSON
files under `server/data/` (gitignored — ask the lead to add `server/data/` to `.gitignore`
if it isn't already).

## Connecting the client

Run the normal dev server (`npm run dev`) and open:

```
http://localhost:5173/?server=ws://localhost:7777
```

`src/client/net/index.ts` reads the `server` query param and constructs a `WsBackend` instead
of the default `LocalBackend`. Everything else (session, UI, engine) is unaware of which
backend is in use — that's the whole point of the `Backend` interface.

## Files

- `index.ts` — entry point: creates the `WebSocketServer`, a `FileStore`, a `Rooms` registry,
  and one `Connection` per socket.
- `connection.ts` — per-socket protocol handling: hello/welcome handshake, character CRUD,
  `enterWorld`, running `ClientAction`s through the shared `handleAction` reducer, presence
  relay, and chat.
- `rooms.ts` — presence "rooms" keyed by `mapId`; broadcasts playerJoined/playerLeft/
  playerMoved/chat only to sockets currently on the same map (`world` chat broadcasts to
  everyone, across all rooms).
- `rateLimit.ts` — a tiny sliding-window limiter used for both incoming actions and incoming
  presence updates, so one misbehaving/buggy client can't flood the server or other players.
- `store.ts` — `Store` interface + a `FileStore` implementation (JSON files under
  `server/data/`). Swapping to a real database means writing one new class here; nothing
  else touches disk directly.

## What's authoritative vs. client-simulated

This mirrors the split already documented in `src/shared/protocol.ts` and `DESIGN.md` §10:

- **Authoritative (server-decided, persisted):** xp, levels, gold, inventory, equipment,
  quests, crafting, professions, currency, flags, reputation — anything that comes back as
  part of `CharacterState` from an `ActionResult`. The server runs the exact same
  `handleAction` reducer the offline `LocalBackend` runs, so behavior is identical online and
  offline (mechanically — obviously other real players are only visible online).
- **Client-simulated (server just relays it):** real-time movement/physics, monster AI, hit
  detection/animation timing, VFX. The client tells the server "I killed monster X at (x,y)
  on map M" (`killMonster` action) and the server decides whether that's *believed* — right
  now that means "yes, always" (see anti-cheat roadmap below). Position broadcast for other
  players (`presence`/`playerMoved`) is pure relay: the server does not simulate anyone's
  movement, it just rate-limits and rebroadcasts what each client reports about itself.

### The path to server-side combat validation

Today `killMonster` is taken at face value (see `handleAction`, owned by the logic agent).
To make combat properly authoritative later, without changing the wire protocol:

1. The server keeps its own list of live monster instances per map (spawn points +
   respawn timers from `MapDef.spawns`/`.boss`), each with server-tracked HP.
2. `killMonster` actions would carry enough info (attacker damage roll, or better: a
   `hitMonster { instanceId, damage }` action per hit) for the server to decrement that
   HP itself and emit `killMonster`-equivalent rewards only when HP actually reaches 0,
   rather than trusting the client's claim.
3. Until then, cheap heuristics can catch obvious abuse cheaply: a per-connection kill-rate
   limiter (e.g. no more than N kills of a given monster level within M seconds — already
   easy to bolt onto `connection.ts`'s existing `RateLimiter`), and dropping kills of a
   `monsterId` that doesn't exist on the character's current map.

## Roadmap

- **Auth:** tokens are currently arbitrary client-generated guest strings (persisted in
  `localStorage['driftwake:token']` by `WsBackend`) that double as the account id. Real auth
  (email/password, OAuth, etc.) would replace `Connection`'s trivial
  `token -> characterIds` lookup in `FileStore` with a real account system; nothing else
  in the protocol needs to change.
- **Database:** replace `FileStore` with a class implementing the same `Store` interface
  (Postgres/SQLite/Mongo/etc.). `connection.ts` only calls the interface methods.
- **Sharding by map:** `Rooms` already partitions presence/chat by `mapId`. For real
  horizontal scaling, each map (or region) could run on its own process/machine, with a
  lightweight router in front that hands a connecting socket to the shard hosting its
  character's current map, and a small cross-shard bus for `changeMap` hand-offs and `world`
  chat.
- **Anti-cheat on `killMonster`:** see above — either full server-side monster simulation,
  or (much smaller lift) kill-rate heuristics per connection (max kills/sec per monster
  tier, reject kills referencing a `monsterId` not present on the reported map).
- **Presence scaling:** currently O(n) broadcast per room; fine for the demo, would want
  spatial partitioning (grid cells within a map) if a single map ever hosts hundreds of
  concurrent players.
