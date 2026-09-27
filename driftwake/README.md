# Driftwake — Tales of the Skywhales

A 2D parallax platforming action MMORPG that runs in the browser, inspired by Maplestory.
Civilization lives on the backs of colossal **Skywhales** drifting above an endless cloud sea — and the
oldest whale, Grandmother Oma, is sick with a spreading Blight.

Everything — sprites, tiles, parallax backgrounds, effects, icons, music and sound — is generated
procedurally in code. There are no asset files.

## Quick start

```bash
cd driftwake
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run typecheck` | TypeScript only |
| `npm test` | Vitest: reducer, balance and server smoke tests |
| `npm run validate` | Content cross-reference validator (ids, portals, drops, quests, dialogue links, balance warnings) |
| `npx tsx scripts/simulate-playthrough.ts [class]` | Headless bot plays the whole story through the authoritative reducer and reports pacing |
| `npm run server` | Node WebSocket authoritative server on :7777 (see `server/README.md`) |

Play online against the server: `npm run server`, then open `http://localhost:5173/?server=ws://localhost:7777`.

## Controls (rebindable in Settings)

| Key | Action |
|---|---|
| ← → | Move |
| ↑ / ↓ | Climb ropes & ladders, enter portals, talk to NPCs (↑) |
| Space | Jump (↓ + Space drops through platforms; Space mid-air = flash jump if learned) |
| X | Basic attack (hold to repeat) |
| Shift | Dash (brief invulnerability) |
| Z | Interact / gather / pick up |
| Q W E R A S D F, 1–6 | Hotbar (drag skills & items onto it) |
| I / C / K / L / B / M / N / J | Inventory / Character / Skills / Quests / Professions / World map / Bestiary / Achievements |
| H or F1 | Help |
| Enter | Chat |
| Esc | Close window / menu |

## Pacing

A headless bot (`scripts/simulate-playthrough.ts`) plays the whole story through the real game rules for every
class. An efficient player finishes the main story (all three endings are reachable) at **level ~36 in ~80
minutes**; side, faction, profession and daily content add several more hours. Global XP speed is one knob:
`XP_CURVE.globalRate` in `src/shared/constants.ts`.

## What's in the game

- **4 classes, 8 specializations** — Vanguard (Bulwark / Reaver), Stormcaller (Tempest / Tidesinger),
  Windrunner (Skyhunter / Sparkgunner), Shade (Duskblade / Hexslinger). 80 skills: spammable mains,
  AoE clears, bursts, mobility (dash, blink, flash jump), buffs, passives and one ultimate per specialization.
  Job advancement at level 15 through a class trial quest at Gale Outpost.
- **Combat** — Maplestory-style mob fighting (hotkey skills, MP, knockback, damage numbers, loot fountains)
  with action spice: i-frame dashes, status effects (burn, freeze, bleed, mark…), hit-stop, and
  **5 bosses** with telegraphed attack patterns and phases.
- **18 maps across 5 regions** — Driftmoor harbor town, Mossback Meadows & Hills, Barnacle Grotto,
  the floating Kelpwood, Gale Outpost & the Stormbreak Spires, the bioluminescent Lanternreef and a
  sunken ghost galleon, and finally the inside of the whale itself.
- **108 quests** — a 5-act main story with faction politics (Harpooners vs Tidekeepers), job quests,
  faction quests, 43 side quests, 10 daily bounties and 17 profession quests. Big choices set flags that later
  content reacts to; a secret "true ending" unlocks only if you made the merciful choices along the way.
- **Progression** — levels 1–40 (tunable curve in `src/shared/constants.ts`), AP/SP, items across
  5 rarities (350+ items) with random bonus lines, set bonuses, star enhancement, titles, bestiary,
  and 36 achievements (J) with rewards.
- **Professions** — everyone gathers (Mining, Foraging); pick two crafts: Smithing (the best non-boss gear
  + enhancement stones), Alchemy (potions & elixirs), Cooking (long XP/drop/stat food buffs),
  Jewelcrafting (the best accessories). 104 recipes, salvage for materials.
- **Pets** — six companions (from a baby Puffmoss to a tiny floating Skywhale) that follow you,
  auto-loot nearby drops and grant small bonuses.
- **Onboarding** — first-time contextual tutorial tips (toggle in Settings).
- **MMO feel offline** — the local backend simulates other wandering players and chat.

## Architecture

```
src/shared/     Pure TypeScript — runs in the browser AND in Node
  types.ts        the data contract
  protocol.ts     ClientAction → ActionResult(GameEvents + state) and the wire protocol
  constants.ts    balance knobs (XP curve, drop rates, enhancement odds…)
  logic/          the authoritative reducer: stats, combat formulas, loot, quests, crafting…
  data/           all content (items, monsters, maps, npcs, quests, dialogue, skills…)
src/client/
  net/            Backend adapter: LocalBackend (in-browser server + bot simulation) | WsBackend
  session.ts      client state + action dispatch
  events.ts       typed event bus between engine, UI and session
  scenes/ entities/ combat/   Phaser gameplay
  gfx/            procedural pixel art, parallax, VFX, icons
  audio/          WebAudio synth SFX + generative music
  ui/             DOM UI: title, HUD, windows
server/           Node WebSocket server using the same shared reducer
```

The client never mutates persistent state itself: every intent (kill, loot pickup, craft, quest turn-in,
map change…) goes through `Backend.send(action)`, which runs the shared reducer. Offline that reducer
runs in the tab (`LocalBackend`, saved to localStorage); online the identical code runs on the server.
Swapping backends is a URL parameter. See `server/README.md` for the roadmap to full server authority
(server-side monster simulation, auth, DB, sharding).

Design bible, lore and content registry: [`DESIGN.md`](./DESIGN.md).
Graphics gallery for visual QA: `http://localhost:5173/gallery.html`.
