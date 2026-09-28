# Driftwake illustrated style — art bible

The "illustrated" art style replaces 1x pixel sprites with **rigged vector paper-dolls**: every
character is assembled from Canvas2D vector parts on a small skeleton, animated by pose functions,
and baked once into a spritesheet at **2x resolution** (`RIG_SCALE`), which at the camera's zoom 2
lands 1:1 on screen pixels. Nothing is hand-drawn; everything is code.

## Proportions
- Chibi: the head is ~42% of total height. A humanoid is ~74 texture px (37 world px) tall;
  head radii 16.5 x 15.5 tex px. Hands and feet are small and round.
- Monsters keep the physics body of their pixel version (see `rig/monsters.ts`), so the art should
  fill roughly the same footprint: slime ~22x16 world px, snail ~26x17, mushroom ~20x22.

## Line
- Every part is outlined with an **ink** color derived from its own fill (`ink(fill)`): dark,
  hue-consistent, never pure black. Default width `LINE_W` = 1.35 tex px.
- The baker adds a thicker AA **silhouette rim** (`rimOutline`) around the whole sprite: outer lines
  are always heavier than inner ones. That's what lets sprites pop off busy parallax.
- Interior detail lines (seams, folds, cracks) are thinner (0.7–1.0) and use `shade(fill, -0.3..-0.4)`.

## Shading
- Cel shading with **one shadow crescent** per part: `shape(g, path, fill)` does it for you. The key
  light comes from **up and toward the facing side** (`LIGHT_DIR`), so faces stay lit and shadows
  pool on the back and underside.
- Shadows are cool, hue-shifted (`shadowOf`), except skin, which uses the rosy `skinShadow`.
- Highlights are rare and deliberate: an optional warm rim light (`light:` option), and white `glint`s
  only on glossy things (eyes, metal, slime, gems). Hair gets the anime shine band (`hairShine`).
- Back limbs are darkened ~16% to read as depth.
- Soft ambient occlusion (`occlude`) where big masses meet (the head over the chest).
- Emissive things (orbs, magic, glowing eyes) use `emissiveDab`/`glowHalo`. They are the only
  near-white-hot pixels, so the bloom pass picks exactly them.

## Color
- Everything is derived from a few base colors per subject (palette/outfit/equipment tints) through
  the tone helpers. Don't invent unrelated hues per part.
- Saturation stays medium; only magic and emissives go fully saturated.
- Equipment tints must visibly change the look (armor → main garment, helmet → headgear,
  boots/gloves → those parts). Weapons use the item's icon colors.

## Faces
- Big anime eyes: white sclera, gradient iris (dark top, light bottom), pupil, a thick top lash line,
  two glints. The eye nearer the facing direction is ~16% narrower (3/4 view).
- Expressions come from pose (`eyes`, `mouth`): focus while attacking, squeeze when hurt, x when
  dead, one blink frame per idle loop.

## Motion
- Poses are pure functions of (clip, t, frame). No randomness, so bakes are deterministic.
- Secondary motion: hair, capes, scarves, tails and tabards read `pose.sway` (trail) and
  `pose.flutter` (lift), and must lag the body.
- Anticipation → action → follow-through on attacks; smear arcs on the fast frames.
- Squash & stretch on anything soft (slimes, mushrooms): preserve volume (sx * sy ≈ 1).
- Idles breathe, and a cute mob always has a little life in it (blink, wobble, antenna bob).

## Silhouette tests
Each class must be recognizable at 1x in-game size from silhouette alone:
- **Vanguard**: pauldrons, cape, sword or axe.
- **Stormcaller**: pointed hat, robe hem, staff orb.
- **Windrunner**: hood point, quiver, scarf tail, bow.
- **Shade**: mask, long trailing scarf, low stance, blades.

## Code map
- `pen.ts`: path builders, `shape`/`fill`/`stroke`/`glint`/`occlude`, tone helpers.
- `bake.ts`: `RigSpec` → spritesheet + anims + `SpriteInfo { texScale: 2 }`, and `renderRigFrame` for DOM.
- `humanoid.ts`: skeleton, solver, draw order, face, clips, and the part registries (outfits,
  headgear, hair, weapons).
- `parts/*`: hair styles, weapons, common garments. `classes/*`: one kit per class.
- `monsters.ts` (+ `monsters/*`): per-MonsterBase drawers. `npcs.ts` (+ `npcs/*`): NPC kits.
- `register.ts`: side-effect imports. Every new module goes here.
- Lab: `npm run dev`, then open `/rig-lab.html?only=vanguard&zoom=3`; or run
  `node scripts/rig-lab-shot.mjs out.png "only=vanguard&zoom=3&clips=idle,attack"`.
