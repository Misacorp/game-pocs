# DRIFTWAKE — Design Bible

> A 2D parallax platforming action MMORPG (Maplestory-inspired) that runs in the browser.
> Stack: Phaser 3.90 + TypeScript + Vite. All art is procedural pixel art drawn in code. All audio is WebAudio-synthesized.

## 1. Pitch & setting

The world of **Driftwake** has no ground. Civilization lives on the backs of **Skywhales** — colossal,
slow, ancient creatures drifting through an endless sunset sky above a bottomless cloud sea. Each whale
carries forests, caves, reefs and towns on its hide. The oldest and largest is **Grandmother Oma**, on
whose back sits the harbor town of **Driftmoor**.

For generations people lived peacefully in symbiosis with the whales. But Oma has begun to **stir** —
tremors shake Driftmoor, creatures in her barnacle caves turn violent, and a glowing purple rot called
**the Blight** is spreading across her hide. If Oma dives into the cloud sea, everyone on her back dies.

Two factions offer answers:
- **The Harpooners' Guild** (pragmatic, industrial; leader *Harpoonmaster Grell*): the whale is a resource
  and a vessel. Cut out the Blight, harvest the whale's **Ember** (the glowing heart-core that powers
  everything), and steer Oma by force if needed.
- **The Tidekeepers** (mystic whale-singers; leader *Songkeeper Aolani*): the whale is alive and sacred.
  Heal her through song, purify the Blight, and let her choose where to drift.

The truth (revealed in Act 4): generations ago the Harpooners' founder, **Captain Vashti Rook**,
speared Oma's heart to steer her. The Blight grew from that ancient wound. The Captain's ghost still
haunts her sunken galleon in the Lanternreef.

Tone: **whimsical and warm** (Maplestory-like cute creatures, funny NPCs, cozy towns) that gradually
turns eerie and melancholy in the late zones. Bright sunset palettes early; bioluminescent night later;
violet-and-black blight at the end.

## 2. Regions, maps and level ranges

World units are **art pixels**; the camera renders at 2x zoom (viewport ≈ 640×360 art px).
Characters are ~20×32 px. Recommended map sizes: width 1600–3200, height 500–900.

| Region | Map id | Name | Levels | Theme | Music | Notes |
|---|---|---|---|---|---|---|
| driftmoor | `driftmoor_town` | Driftmoor | town | driftmoor | town | Hub. NPCs arrive gradually — see §13 "Onboarding curve". |
| driftmoor | `mossback_meadows` | Mossback Meadows | 1–4 | meadow | meadow | Tutorial field |
| driftmoor | `mossback_hills` | Mossback Hills | 3–7 | meadow | meadow | Ropes & ladders introduced |
| driftmoor | `barnacle_grotto` | Barnacle Grotto | 6–9 | grotto | cave | dark-ish cave |
| driftmoor | `grotto_depths` | Grotto Depths | 8–11 | grotto | cave | Boss: King Barnacle (L11) |
| finreach | `kelpwood_edge` | Kelpwood Edge | 10–13 | kelpwood | kelp | |
| finreach | `kelpwood_deep` | Deep Kelpwood | 12–16 | kelpwood | kelp | Poacher camp |
| finreach | `tangle_heart` | The Tangle Heart | 16–18 | kelpwood | boss | Boss: Old Tangle (L17) |
| stormbreak | `gale_outpost` | Gale Outpost | town | galeoutpost | outpost | 2nd job instructors |
| stormbreak | `windswept_ledges` | Windswept Ledges | 16–20 | stormspire | storm | |
| stormbreak | `thunderhead_peaks` | Thunderhead Peaks | 19–23 | stormspire | storm | weather: storm |
| stormbreak | `roc_nest` | Kraelith's Aerie | 23–24 | stormspire | boss | Boss: Kraelith (L24) |
| lanternreef | `glowtide_shallows` | Glowtide Shallows | 23–26 | lanternreef | reef | Diver camp |
| lanternreef | `lantern_deeps` | Lantern Deeps | 26–29 | lanternreef | reef | dark |
| lanternreef | `sunken_galleon` | The Sunken Galleon | 29–30 | galleon | galleon | Boss: Captain Vashti Rook (L30) |
| hollow | `hollow_mouth` | The Hollow Mouth | 29–32 | hollow | hollow | Inside Oma |
| hollow | `blighted_veins` | Blighted Veins | 31–35 | hollow | hollow | dark |
| hollow | `heart_chamber` | Heart of Oma | 35–36 | heart | finalboss | Final boss: The Blight Heart (L36) |

Map connections (portal ids in parentheses; each connection is bidirectional — author both portals):
- driftmoor_town (`to_meadows`) ↔ mossback_meadows (`to_town`)
- mossback_meadows (`to_hills`) ↔ mossback_hills (`to_meadows`)
- mossback_hills (`to_grotto`) ↔ barnacle_grotto (`to_hills`)
- barnacle_grotto (`to_depths`) ↔ grotto_depths (`to_grotto`)
- driftmoor_town (`to_kelpwood`) ↔ kelpwood_edge (`to_town`)  — locked until main quest `mq_05_king_barnacle` completed (lockedText explains)
- kelpwood_edge (`to_deep`) ↔ kelpwood_deep (`to_edge`)
- kelpwood_deep (`to_tangle`) ↔ tangle_heart (`to_deep`)
- kelpwood_deep (`to_outpost`) ↔ gale_outpost (`to_kelpwood`) — a long updraft rope/lift; requires level 15
- gale_outpost (`to_ledges`) ↔ windswept_ledges (`to_outpost`)
- windswept_ledges (`to_peaks`) ↔ thunderhead_peaks (`to_ledges`)
- thunderhead_peaks (`to_nest`) ↔ roc_nest (`to_peaks`)
- gale_outpost (`to_reef`) ↔ glowtide_shallows (`to_outpost`) — requires main quest `mq_12_kraelith` completed
- glowtide_shallows (`to_deeps`) ↔ lantern_deeps (`to_shallows`)
- lantern_deeps (`to_galleon`) ↔ sunken_galleon (`to_deeps`)
- glowtide_shallows (`to_hollow`) ↔ hollow_mouth (`to_reef`) — requires main quest `mq_16_captain` completed
- hollow_mouth (`to_veins`) ↔ blighted_veins (`to_mouth`)
- blighted_veins (`to_heart`) ↔ heart_chamber (`to_veins`)
Also: Skyferry NPCs (`npc_ferry_tamsin` in driftmoor_town and gale_outpost) teleport between towns and to discovered camps for a small fee.

## 3. Classes & jobs

Four base classes chosen at creation (level 1). At **level 15**, the class instructor in Gale Outpost
gives a job-advancement quest; at turn-in the player **chooses one of two specializations** (a QuestChoice
with `jobAdvance`).

| Class (tier 1) | Main / 2nd stat | Weapons | Damage | Specializations (tier 2) |
|---|---|---|---|---|
| `vanguard` — Vanguard: sturdy frontline brawler with wide sword swings | STR / DEX | sword, axe | physical | `bulwark` (shield-bearer: counters, damage reduction, taunts, big defensive stats) / `reaver` (berserker: HP-cost skills, lifesteal, huge cleaves) |
| `stormcaller` — Stormcaller: elemental caster, fragile, big AoE | INT / LUK | staff, wand | magic | `tempest` (lightning & wind: chain lightning, storms, teleport) / `tidesinger` (water & ice: freezing, healing, zones) |
| `windrunner` — Windrunner: agile ranged attacker | DEX / STR | bow, gun | physical | `skyhunter` (bow precision: pierce, multishot, arrow rain) / `sparkgunner` (flintlock: explosive shots, turrets, knockback) |
| `shade` — Shade: fast, crit-heavy assassin | LUK / DEX | dagger, knives | physical | `duskblade` (dual-dagger melee combos, dashes, bleed) / `hexslinger` (thrown cursed knives, marks & debuffs, shadow clones) |

Skill budget per job: tier-1 jobs have **6 skills** (2–3 attacks, 1 mobility, 1 buff, 1–2 passives);
tier-2 jobs have **7 skills** including one "ultimate" (long cooldown, huge effect) at level 25+.
Max skill level: 10 (ultimates 5, passives 5–10). SP: 3 per level (constants.ts).

## 4. Monster roster (ids are binding)

| id | Name | L | Base | Behavior | Region / maps |
|---|---|---|---|---|---|
| `puffmoss` | Puffmoss | 1 | slime | hopper | meadows |
| `shellsnail` | Shellsnail | 2 | snail | walker | meadows |
| `sproutling` | Sproutling | 3 | mushroom | walker | meadows, hills |
| `dewbug` | Dewbug | 4 | beetle | walker | hills |
| `mossback_boar` | Mossback Boar | 6 | boar | charger | hills |
| `grotto_crab` | Grotto Crab | 7 | crab | walker | grotto |
| `barnacle_bat` | Barnacle Bat | 8 | bat | flyer | grotto, depths |
| `glowjelly` | Glowjelly | 8 | jelly | flyer | grotto |
| `rustclaw_crab` | Rustclaw Crab | 10 | crab | walker (aggressive) | depths |
| `king_barnacle` | King Barnacle | 11 | crab (scale 3) | boss | grotto_depths |
| `kelp_sprite` | Kelp Sprite | 11 | wisp | flyer | edge |
| `tanglevine` | Tanglevine | 12 | plant | stationary (shooter) | edge, deep |
| `driftfin_eel` | Driftfin Eel | 13 | eel | flyer | edge, deep |
| `spore_mushling` | Spore Mushling | 14 | mushroom | hopper | deep |
| `poacher` | Harpooner Poacher | 15 | humanoid | walker (projectile) | deep |
| `kelp_spider` | Kelp Spider | 16 | spider | walker | deep, tangle |
| `old_tangle` | Old Tangle | 17 | hydra | boss | tangle_heart |
| `gust_wisp` | Gust Wisp | 17 | wisp | flyer | ledges |
| `cloud_puff` | Cloud Puff | 18 | slime | hopper | ledges |
| `stormhawk` | Stormhawk | 19 | bird | flyer | ledges, peaks |
| `thunder_beetle` | Thunder Beetle | 20 | beetle | charger | peaks |
| `cliff_golem` | Cliff Golem | 21 | golem | walker | peaks |
| `sky_raider` | Sky Raider | 22 | humanoid | walker (projectile) | peaks |
| `kraelith` | Kraelith, the Storm Roc | 24 | roc | boss | roc_nest |
| `lantern_jelly` | Lantern Jelly | 23 | jelly | flyer | shallows |
| `reef_crab` | Reef Crab | 24 | crab | walker | shallows |
| `glimmerfish` | Glimmerfish | 25 | fish | flyer | shallows, deeps |
| `coral_golem` | Coral Golem | 26 | golem | walker | deeps |
| `abyss_eel` | Abyss Eel | 27 | eel | flyer (aggressive) | deeps |
| `drowned_sailor` | Drowned Sailor | 28 | humanoid | walker | deeps, galleon |
| `captain_rook` | Captain Vashti Rook | 30 | captain | boss | sunken_galleon |
| `blight_slime` | Blight Slime | 29 | slime | hopper | mouth |
| `rot_mushling` | Rot Mushling | 30 | mushroom | walker | mouth |
| `parasite_grub` | Parasite Grub | 31 | grub | walker | mouth, veins |
| `hollow_sentinel` | Hollow Sentinel | 32 | golem | walker (aggressive) | veins |
| `blighted_bat` | Blighted Bat | 33 | bat | flyer (aggressive) | veins |
| `whisper_wraith` | Whisper Wraith | 34 | wraith | flyer (projectile) | veins |
| `blight_heart` | The Blight Heart | 36 | heart | boss (stationary, summons) | heart_chamber |
| `blight_tendril` | Blight Tendril | 33 | plant | stationary | summoned by blight_heart |

Bosses: 3–4 attacks each, 2–3 phases, telegraphed (use slam/shockwave/rain/beam/projectile/summon/leap/charge).
Boss HP ≈ 60–200× a normal mob of its level, tuned with `scripts/balance-report.ts` for ≈60–70s real fights. Bosses drop boss-exclusive gear + a quest item.

## 5. NPC registry (ids are binding)

**Driftmoor (driftmoor_town)** — see "Onboarding curve" (§13) for exactly who is present when:
- `npc_pell` — Old Pell, Retired Whalewatcher (tutorial guide, first quests) — **always present**
- `npc_maren` — Captain Maren Holt, Harbor Master (main quest giver, Act 1–2) — **always present**
- `npc_pim` — Pim Pennywhistle, General Goods (general store `shop_pim`: potions, return scrolls) — **always present**
- `npc_wren` — Wren, Curious Kid (side quests) — **always present**
- `npc_rook_prospector` — Dusty Fen, Prospector (mining/foraging tips, gathering quests, sells tools/`shop_dusty`) — arrives at **level 5**
- `npc_juniper` — Juniper Vale, Alchemist (alchemy trainer, potion shop `shop_juniper`; also `mq_04` turn-in) — arrives at **level 6**
- `npc_brina` — Brina Ashhammer, Blacksmith (smithing trainer, weapon/armor shop `shop_brina`) — arrives at **level 8**
- `npc_ferry_tamsin` — Tamsin, Skyferry Pilot (travel; also placed in gale_outpost, always present there) — arrives once `mq_05_king_barnacle` is completed
- `npc_grell` — Harpoonmaster Grell (Harpooners faction) — arrives once `mq_07_kelp_sickness` is completed
- `npc_aolani` — Songkeeper Aolani (Tidekeepers faction) — arrives once `mq_07_kelp_sickness` is completed
- `npc_idris` — Scholar Idris (lore, Act 2) — placed in kelpwood_edge (always present there)

**Finreach:** `npc_fenna` — Kelp Warden Fenna (kelpwood_edge quests); `npc_poacher_defector` — Jory, Nervous Poacher (kelpwood_deep; moral choice); `npc_tobbin` — Tobbin Crumb, Cook (cooking trainer, food shop `shop_tobbin`) — **moved here from Driftmoor** (always present in kelpwood_edge).
**Gale Outpost (gale_outpost):** `npc_borran` — Outpost Chief Borran (main quests Act 3); `npc_hale` — Commander Hale (vanguard instructor); `npc_ysolde` — Archmage Ysolde (stormcaller instructor); `npc_kestrel` — Ranger Kestrel (windrunner instructor); `npc_whisper` — Whisper (shade instructor); `npc_quill` — Quill, Outpost Trader (`shop_quill`); `npc_sera` — Sera Glint, Jeweler (jewelcrafting trainer, `shop_sera`) — **moved here from Driftmoor** (always present).
**Windswept Ledges (faction camps, Act 3):** `npc_grell_camp` — Harpoonmaster Grell (Harpooner camp) and `npc_aolani_camp` — Songkeeper Aolani (Tidekeeper shrine). Separate NPC ids from the Driftmoor versions (same characters, travelled).
**Lanternreef:** `npc_nell` — Diver Nell (glowtide_shallows; Act 4 quests, shop `shop_nell`); `npc_lamplighter` — The Lamplighter, a gentle ghost (lantern_deeps; lore)
**Hollow:** `npc_first_singer` — Echo of the First Singer (hollow_mouth; Act 5 guide, spirit)

## 6. Main story (quest ids are binding)

Act 1 — *The Stirring* (Driftmoor, L1–11)
- `mq_01_welcome` (Pell): talk to Maren. Tutorial.
- `mq_02_tremors` (Maren): kill 8 puffmoss, collect 5 `mat_puffmoss_fluff` in meadows.
- `mq_03_strange_growth` (Maren): visit mossback_hills, kill 6 dewbug, bring 3 `qi_blighted_spore` (dropped by dewbug/sproutling only while quest active: normal drop with chance).
- `mq_04_into_the_grotto` (Maren → Juniper): Juniper analyzes spores; collect 6 `mat_glowing_barnacle` from grotto monsters.
- `mq_05_king_barnacle` (Maren): defeat King Barnacle (boss objective), bring back `qi_blighted_core`. Unlocks kelpwood portal.

Act 2 — *Two Currents* (Finreach, L10–18)
- `mq_06_the_scholar` (Maren → Idris in kelpwood_edge): deliver `qi_blighted_core`.
- `mq_07_kelp_sickness` (Idris): kill kelp sprites/tanglevines, collect samples.
- `mq_08_two_currents` (Idris): talk to Grell and Aolani (both in driftmoor_town). **MAJOR CHOICE** at turn-in (Idris): side with **Harpooners** or **Tidekeepers** (sets flag `faction` = 'harpooners' | 'tidekeepers', reputation, different reward gear). Future quests branch on this flag.
- `mq_09_poacher_camp` (Fenna): deal with poachers in kelpwood_deep. Side choice via `npc_poacher_defector`: turn Jory in / let him go (flag).
- `mq_10_old_tangle` (Fenna): defeat Old Tangle. Reward includes a region-tier weapon choice (chooseOne per class).

Act 3 — *Eye of the Storm* (Stormbreak, L15–24)
- `mq_11_updraft` (Fenna → Borran): ascend to Gale Outpost (visit). Also prompts job advancement.
- `mq_11b_skyships_down` (Borran): stormhawks & sky raiders harass skyships; faction-specific tasks from `npc_grell_camp` (harpooners: `fq_h_*`) or `npc_aolani_camp` (tidekeepers: `fq_t_*`).
- `mq_12_kraelith` (Borran): defeat Kraelith. **CHOICE** at turn-in: take the **Storm Heart** (powerful accessory, harpooner rep) or **free the Roc's spirit** (grants a permanent +XP/+speed title/buff item, tidekeeper rep).

Act 4 — *The Drowned Wound* (Lanternreef, L23–30)
- `mq_13_glowtide` (Borran → Nell): travel to the reef.
- `mq_14_lamplighter` (Nell → Lamplighter): learn about the ghost ship.
- `mq_15_logbook` (Lamplighter): collect logbook pages from drowned sailors → reveals the truth about Captain Rook's harpoon.
- `mq_16_captain` (Nell): defeat Captain Vashti Rook. **CHOICE**: *lay her to rest* (return the harpoon to the Lamplighter) or *claim her harpoon* (a powerful item; she remains cursed). Reward both.

Act 5 — *Heart of Oma* (Hollow, L29–36)
- `mq_17_inside` (Nell → First Singer): enter the Hollow.
- `mq_18_echoes` (First Singer): gather echo shards from wraiths/sentinels.
- `mq_19_heart` (First Singer): defeat The Blight Heart. **FINAL CHOICE** (3 endings, respecting earlier choices through condition-gated options): **Purify** (Tidekeeper ending, requires faction tidekeepers OR released roc), **Harvest the Ember** (Harpooner ending), or **Sing Together** (requires both: released roc AND laid Rook to rest — the "true" ending). Each gives unique title + legendary item.
- Post-game: `mq_20_epilogue` returning to Maren; repeatable boss hunts and daily quests.

Also required: **job quests** `jq_vanguard`, `jq_stormcaller`, `jq_windrunner`, `jq_shade` (instructors in gale_outpost, level 15+, trial kill/collect, choice between 2 jobs), **profession quests** (intro + 2 per crafting profession, 1–2 per gathering), **faction quests** (3–4 per faction), and **25+ side quests** across all regions, several with choices. Include a few **repeatable daily** quests (bounty boards).

## 7. Professions

Gathering (every character): **Mining** (ore/crystal nodes) and **Foraging** (herbs, kelp, coral, mushrooms).
Available from the start, but their intro quests (`pq_mining_1`, `pq_foraging_1`) begin around **level 5**,
once Dusty Fen arrives in Driftmoor — see "Onboarding curve" (§13).

Crafting (choose up to **2** of 4; can unlearn to switch, losing progress). **Crafting professions
unlock at character level `PROFESSION_UNLOCK_LEVEL` (10, `constants.ts`)** — `learnProfession`
below that level is rejected with a friendly in-character refusal ("Come back at level 10 — Brina
doesn't train greenhorns."). Profession quests (`pq_*`) are reqs-gated to match (level ≥ 10 for the
intro, ≥ 20 for the tier-3 batch), so no crafting quest can ever be offered before it's actually
learnable:
- **Smithing** (Brina, Driftmoor): ores → ingots → weapons & armor for every class per region tier (often better than drops, guaranteed rarity); also **Whetstones** (temporary attack buff) and **Enhancement Stones** tier 1–3 (used to add stars to gear).
- **Alchemy** (Juniper, Driftmoor): herbs + monster parts → HP/MP potions (cheaper/stronger than shop), **Elixirs** (30-min stat buffs: +attack, +magic, +crit, +defense), **Stat/Skill Reset Tonics**.
- **Cooking** (Tobbin, **Kelpwood Edge** — moved out of Driftmoor to give Finreach a trainer of its own): meat/fish/mushroom drops + herbs → **Food** (one active 'food' buff, 20–30 min: +XP %, +drop %, +HP regen, +speed; plus instant heal-over-time snacks). The XP/drop foods are the cooking hook.
- **Jewelcrafting** (Sera, **Gale Outpost** — moved out of Driftmoor alongside the job instructors): crystals/pearls/gems → **rings & amulets** (the best accessories come from here), **Gem Polish** (reroll bonus lines? — implemented as crafting "Polished" versions), and high-tier **Enhancement Stones**.
Profession levels 1–10. Recipes learned automatically at levels, bought from trainer, or from quest/drop recipe scrolls. Each region's materials feed the next tier of recipes: tier 1 (Driftmoor, prof L1–3), tier 2 (Finreach, L3–5), tier 3 (Stormbreak, L5–7), tier 4 (Lanternreef, L7–9), tier 5 (Hollow, L9–10).

Salvage: any equipment can be salvaged into `mat_scrap_*` materials by any character (feeds smithing).

## 8. Items overview

- Equipment slots: weapon, helmet, armor, gloves, boots, ring, amulet. Weapons per class per tier (~every 5 levels: 1, 5, 10, 15, 20, 25, 30, 35).
- Rarities: common → uncommon → rare → epic → legendary. Drops roll random bonus lines.
- Consumables: HP/MP potions (tiers), elixirs, food, return scroll (`use_return_scroll`), stat reset.
- Materials (`mat_*`), quest items (`qi_*`), equipment (`eq_*`), consumables (`use_*`), recipes (`rec_*`).

## 9. Controls (defaults, rebindable)

Arrows move/climb, Space jump (down+Space drops through one-way platforms), X basic attack, Shift dash,
Z interact/gather/talk, ↑ at portal/NPC, Q W E R A S D F + 1–6 hotbar, I inventory, C character,
K skills, L quests, B professions, M map, N bestiary, H help, Esc menu, Enter chat.

## 10. Code architecture & ownership

```
src/shared/          pure TS, no DOM/Phaser — runs in browser AND Node server
  types.ts           THE contract. Change only via the lead.
  protocol.ts        ClientAction / GameEvent / wire messages
  constants.ts       balance knobs (XP curve etc.)
  logic/             authoritative reducer + formulas (stats, combat, quests, loot, crafting)
  data/              content registries (items, monsters, maps, npcs, quests, skills...)
src/client/
  main.ts            bootstrap
  session.ts         GameSession (client state + dispatch)
  events.ts          typed bus between engine, UI and session
  net/               Backend interface, LocalBackend, WsBackend
  input/keybinds.ts  rebindable controls
  gfx/               procedural textures, parallax, vfx, DOM icon urls
  audio/             procedural sfx & music
  scenes/ entities/ combat/   Phaser gameplay (engine)
  ui/                DOM UI: title/char creation, HUD, windows
server/              Node WebSocket authoritative server (uses src/shared)
scripts/validate-data.ts   content cross-reference validator
```

Rules for all contributors:
1. Never change `src/shared/types.ts`, `protocol.ts`, `events.ts`, `Backend.ts` or public API
   signatures of other modules. If you need a contract change, note it in your final report.
2. Only edit files in your assigned area. Others are working in parallel in the same tree.
3. `npx tsc --noEmit` must pass for your files. Errors in files you don't own may be transient.
4. No external assets, no new npm dependencies without the lead's approval.

## 11. Cross-domain item & node ID registry (binding)

Monster drop tables, gathering nodes, recipes, shops and quests reference these ids. The items agent MUST
define every id below (more may be added). Other agents MUST only reference ids from this list (or ids
they own) — list anything extra they need in their final report.

**Consumables:** `use_hp_potion_s` (heal 60), `use_hp_potion_m` (200), `use_hp_potion_l` (500), `use_hp_potion_xl` (1200),
`use_mp_potion_s` (40), `use_mp_potion_m` (120), `use_mp_potion_l` (300), `use_mp_potion_xl` (700), `use_elixir_s` (restores 50% HP+MP),
`use_return_scroll` (teleport to last town), `use_stat_reset`, `use_skill_reset`.

**Monster materials (drop tables):**
- Driftmoor: `mat_puffmoss_fluff`, `mat_snail_shell`, `mat_sprout_cap`, `mat_dewbug_wing`, `mat_boar_hide`, `mat_boar_meat`,
  `mat_crab_claw`, `mat_bat_wing`, `mat_jelly_goo`, `mat_glowing_barnacle`, `mat_rust_shell`
- Finreach: `mat_kelp_essence`, `mat_vine_thorn`, `mat_eel_fillet`, `mat_spore_dust`, `mat_poacher_cloth`, `mat_spider_silk`
- Stormbreak: `mat_wisp_essence`, `mat_cloud_fluff`, `mat_storm_feather`, `mat_thunder_carapace`, `mat_golem_core`, `mat_raider_badge`, `mat_sky_egg`
- Lanternreef: `mat_lantern_goo`, `mat_reef_claw`, `mat_glimmer_scale`, `mat_fish_fillet`, `mat_coral_chunk`, `mat_abyss_fang`, `mat_drowned_cloth`
- Hollow: `mat_blight_goo`, `mat_rot_cap`, `mat_grub_meat`, `mat_sentinel_rune`, `mat_blighted_wing`, `mat_wraith_wisp`
- Boss: `mat_king_barnacle_shell`, `mat_tangle_heartwood`, `mat_storm_plume`, `mat_captain_doubloon`, `mat_heart_ember`
- Salvage: `mat_scrap_iron` (common/uncommon), `mat_scrap_fine` (rare), `mat_scrap_arcane` (epic+)
- Enhancement: `mat_enhance_stone_1` (tier 1; rare drop everywhere, and crafted), `mat_enhance_stone_2`, `mat_enhance_stone_3` (crafted / late drops)

**Gathered materials** (tier = region 1..5):
- Ores (mining): `mat_copper_ore` (1), `mat_iron_ore` (2), `mat_stormsteel_ore` (3), `mat_coralite_ore` (4), `mat_voidstone_ore` (5)
- Crystals (mining): `mat_quartz` (1), `mat_amber` (2), `mat_sky_crystal` (3), `mat_pearl` (4), `mat_heart_crystal` (5)
- Herbs (foraging): `mat_meadow_herb` (1), `mat_dewcap` (1), `mat_kelp_leaf` (2), `mat_sporecap` (2), `mat_windbloom` (3), `mat_glow_coral` (4), `mat_lantern_moss` (4), `mat_blightthorn` (5)
- Refined (crafted): `mat_copper_ingot`, `mat_iron_ingot`, `mat_stormsteel_ingot`, `mat_coralite_ingot`, `mat_voidstone_ingot`,
  `mat_cut_quartz`, `mat_cut_amber`, `mat_cut_sky_crystal`, `mat_polished_pearl`, `mat_cut_heart_crystal`

**Gather node ids** (data/gathering.ts, placed in maps): `node_copper`, `node_iron`, `node_stormsteel`, `node_coralite`, `node_voidstone`,
`node_quartz`, `node_amber`, `node_skycrystal`, `node_pearl`, `node_heartcrystal`, `node_meadow_herb`, `node_dewcap`, `node_kelp`,
`node_sporecap`, `node_windbloom`, `node_glowcoral`, `node_lanternmoss`, `node_blightthorn`.
Placement guide: tier-1 nodes in meadows/hills/grotto; tier 2 in kelpwood; tier 3 in stormbreak; tier 4 in lanternreef; tier 5 in hollow.
3–6 nodes per combat map.

**Quest items** (defined by the QUEST agent in `data/items/questItems.ts`): `qi_blighted_spore`, `qi_blighted_core`, `qi_kelp_sample`,
`qi_poacher_orders`, `qi_logbook_page`, `qi_echo_shard`, `qi_letter_maren`, `qi_lost_locket`, `qi_wren_kite`, `qi_ember_fragment`
(+ any more the quest agent needs). Monster drop tables in monsters.ts SHOULD include the quest drops listed here:
`qi_blighted_spore` (dewbug, sproutling 25%), `qi_kelp_sample` (kelp_sprite, tanglevine 30%), `qi_poacher_orders` (poacher 15%),
`qi_logbook_page` (drowned_sailor 25%), `qi_echo_shard` (whisper_wraith, hollow_sentinel 25%), `qi_blighted_core` (king_barnacle 100%),
`qi_lost_locket` (grotto_crab 8%). The reducer only rolls a `qi_*` drop while the player has an active quest needing it.

**Shops** (data/shops.ts): `shop_brina`, `shop_juniper`, `shop_tobbin`, `shop_sera`, `shop_dusty`, `shop_pim`, `shop_quill`, `shop_nell`.

**Equipment naming:** `eq_<weapontype|slot>_<name>` e.g. `eq_sword_driftwood`, `eq_staff_kelp`, `eq_helmet_barnacle`.
- Starter gear (referenced by classes.ts `starterItems`): `eq_sword_training`, `eq_staff_training`, `eq_bow_training`,
  `eq_dagger_training`, `eq_armor_traveler`, `eq_boots_traveler`.
- Old Tangle choose-one reward: `eq_sword_tangleroot`, `eq_staff_tangleroot`, `eq_bow_tangleroot`, `eq_dagger_tangleroot`.
- Act 2 faction choice: `eq_armor_harpooner_coat` (harpooners), `eq_armor_tidekeeper_robe` (tidekeepers).
- Kraelith choice: `eq_amulet_storm_heart` (take the heart), `eq_ring_roc_feather` (free the spirit).
- Captain Rook choice: `eq_amulet_rook_harpoon` (claim the harpoon), `eq_ring_lamplight` (lay her to rest).
- Finale (legendary): `eq_amulet_ember_harvest` (harvest), `eq_amulet_oma_purified` (purify), `eq_ring_songbound` (sing together).

## 12. Integration conventions (binding)

**Ownership** (only edit your own files; others work concurrently in the same tree):
| Area | Owner files |
|---|---|
| Engine | `src/client/scenes/**`, `src/client/entities/**`, `src/client/combat/**`, `src/client/dev/**`, `src/client/main.ts` |
| Graphics | `src/client/gfx/**`, `gallery.html` |
| Audio | `src/client/audio/**` |
| UI | `src/client/ui/**` |
| Logic | `src/shared/logic/**`, `tests/**`, `scripts/validate-data.ts` |
| Classes | `src/shared/data/classes.ts`, `src/shared/data/skills/**` |
| World | `src/shared/data/maps/**`, `src/shared/data/monsters.ts`, `src/shared/data/npcs.ts` |
| Items | `src/shared/data/items/{equipment,consumables,materials}.ts`, `recipes.ts`, `professions.ts`, `gathering.ts`, `shops.ts`, `sets.ts` |
| Story quests | `src/shared/data/quests/{main,job,faction}.ts`, `src/shared/data/items/questItems.ts`, `src/shared/data/dialogues/story.ts` |
| Side quests | `src/shared/data/quests/{side,profession}.ts`, `src/shared/data/items/sideQuestItems.ts`, `src/shared/data/dialogues/town.ts` |
| Lead | `src/shared/types.ts`, `protocol.ts`, `constants.ts`, `rng.ts`, `src/client/{session,events}.ts`, `src/client/net/**`, `src/client/input/**`, `DESIGN.md` |

**NPC interaction flow** (UI implements, content authors rely on it):
1. Player presses ↑/Z near an NPC or clicks it → engine emits `ui:dialogue {npcId}`.
2. UI opens the dialogue window and dispatches `{type:'talk', npcId}` (advances talk objectives).
3. The window shows the NPC's dialogue **start node** text (from `NpcDef.dialogue`, else `NpcDef.greeting`), then options in this order:
   quests ready to turn in (✔), quests offered (!), quests in progress (…), the start node's own `options`,
   role buttons (Shop if `shopId`, Crafting/Learn profession if `profession`), then "Goodbye".
4. Quest offer → shows `offer` text + objectives + rewards → Accept / Decline. Turn-in → `complete` text,
   choice cards if `choices` (label + description; a choice with `reqs` that fail is shown locked with its `lockedHint`) and a chooseOne reward picker.
5. Dialogue tree actions: UI-only actions (`openShop`, `openCrafting`, `close`) are handled by UI; all others are sent as
   `{type:'dialogueAction', npcId, action}` and the reducer only executes an action if it literally appears in that NPC's
   dialogue tree (anti-cheat).
6. NPC dialogue ids follow `dlg_<npc id without the npc_ prefix>` (e.g. `npc_pell` → `dlg_pell`). Every NPC gets one.

**Map changes** always flow through the reducer: portal → `changeMap`, return scroll → `useItem`, ferry → `dialogueAction teleport`,
death → `respawn`. The engine performs the actual scene transition when it receives a `mapChanged` or `respawned` GameEvent
(x/y of -1 means "use the target portal position, or the map spawnPoint").

**Physics budget for level design:** gravity 900 px/s², jump velocity 330 px/s → max jump height ≈ 60 px, so vertical gaps
between stacked platforms must be ≤ 52 px (else add a rope/ladder). Base run speed 110 px/s; horizontal jump reach ≈ 80 px.
Ground platforms: `type:'ground'`, spanning the map bottom (y ≈ height − 48). One-way platforms: `type:'oneway'` (jump up through,
↓+Space to drop). Ropes: `{x, top, bottom}` where top is ~8 px above the upper platform and bottom touches the lower surface.
Portals sit on a platform surface (y = platform top). Monster spawns need platforms ≥ 64 px wide inside the spawn x-range.

## 13. Onboarding curve

Playtest feedback: a new player immediately walked into a town with a dozen NPCs, a wall of quest
markers and every crafting profession on offer at once. The fix has two parts: **who is in
Driftmoor and when** (`MapNpcPlacement.reqs`), and **when a quest can be offered at all** (`QuestDef.reqs`) —
kept consistent with each other by `scripts/validate-data.ts`'s "pacing" check, which fails the
build if an NPC's placement reqs are ever stricter than the reqs of a quest that needs that NPC as
giver or turn-in.

**Driftmoor at level 1** is deliberately calm: only Old Pell (tutorial), Captain Maren (main story),
Pim (general store/potions) and Wren (one small side quest) are present. Nobody else shows up until
the character has a reason to meet them:

| NPC | Arrives when | Why |
|---|---|---|
| `npc_pell`, `npc_maren`, `npc_pim`, `npc_wren` | always | the calm starting cast |
| `npc_rook_prospector` (Dusty, gathering) | level ≥ 5 | gathering intro (`pq_mining_1`/`pq_foraging_1`) starts here |
| `npc_juniper` (alchemy) | level ≥ 6 | matches `mq_04`'s own reqs exactly, so she's there the moment the main story needs her, and stays for her (much later) profession role |
| `npc_brina` (smithing) | level ≥ 8 | teases crafting just ahead of the level-10 unlock, without dropping a profession quest on a level-1 character |
| `npc_ferry_tamsin` | `mq_05_king_barnacle` completed | same moment the Kelpwood portal itself unlocks — travel options open together |
| `npc_grell`, `npc_aolani` (faction reps) | `mq_07_kelp_sickness` completed | `mq_08` ("Two Currents") needs both of them, and itself requires `mq_07` completed |

**Moved out of Driftmoor entirely** (see §5/§7), to give the regions players travel to a reason to
be visited beyond the main quest, and to thin the starting town further:
- **Tobbin** (cooking) → **Kelpwood Edge** (Finreach), alongside Idris and Fenna.
- **Sera** (jewelcrafting) → **Gale Outpost** (Stormbreak), alongside the job instructors.

**Crafting professions unlock at level `PROFESSION_UNLOCK_LEVEL` (10)**: `learnProfession` below
that level is rejected by the reducer with a friendly in-character refusal, and every crafting
profession quest (`pq_smithing_*`, `pq_alchemy_*`, `pq_cooking_*`, `pq_jewelcrafting_*`) is reqs-gated
to match (level ≥ 10 for the intro tier, ≥ 20 for the tier-3 batch) so a crafting quest is never
offered before it's actually learnable. Gathering (mining/foraging) stays available from the start —
only its intro quest is pushed to level 5, alongside Dusty's arrival.

**Quest density**: at level 1–3 a fresh character sees at most the main quest plus one or two light
Driftmoor sides — `sq_driftmoor_pells_tea` and `sq_driftmoor_wren_kite` are gated behind `mq_01`/`mq_02`
completion (instead of a flat level ≥ 1) so they arrive one at a time as the player returns to town,
rather than all stacking up alongside the very first quest. Side/daily quests tied to an NPC that
arrives later (e.g. Dusty's ore/herb bounties) are gated to match that NPC's arrival level, so a
quest marker never appears over an empty spot in town.

Verified by: `npm run validate` (0 errors/0 warnings, including the giver/turn-in "pacing" check),
`npx vitest run` (level-gate + "≤ 3 offered quests at level 1" tests in `tests/reducer.test.ts`),
and `npx tsx scripts/simulate-playthrough.ts <class>` for two classes (0 blockers, main story ~75–100 min).

## 14. Illustrated art style (trial)

Characters and creatures can render in two styles, switchable under Settings → Graphics → Character Art
(stored in localStorage `driftwake:art`; switching restarts the world scene):

- **Illustrated** (default): rigged vector paper-dolls (`src/client/gfx/rig/**`). A shared humanoid
  skeleton plus pluggable outfits, headgear, hair and weapons, animated by deterministic pose clips
  and baked at 2x into spritesheets (`SpriteInfo.texScale = 2`; entities apply it through
  `spriteUtil.applySpriteInfo` and `applyBodyBottomAligned`, so physics and world sizes are unchanged).
- **Pixel**: the original 1x procedural pixel art.

The trial covers:
- all four classes (with equipment tints and tier-2 job accents);
- the slime, snail and mushroom monster bases (Puffmoss, Shellsnail and Sproutling, plus every
  palette or variant built on those bases);
- Old Pell.

Anything else falls back to pixel art automatically. Style rules are in `gfx/rig/ART_BIBLE.md`.
To view the lab, open `/rig-lab.html` under `npm run dev`, or run `node scripts/rig-lab-shot.mjs`.
