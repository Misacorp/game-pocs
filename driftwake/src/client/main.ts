import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';
import { createBackend } from './net';
import { GameSession, setSession } from './session';
import { initUI, showTitleScreen, showGameUI, hideGameUI } from './ui';
import { audio } from './audio';
import { bus } from './events';
import { installDevHandle } from './dev/debug';
import { registerPipelines } from './render/pipelines/registerPipelines';
import { ensurePixelFontLoading, waitForPixelFont } from './render/pixelFont';
import { getArtStyle } from './gfx/rig/style';

document.documentElement.dataset.art = getArtStyle();

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

async function main() {
  const backend = await createBackend();
  await backend.connect();
  const session = new GameSession(backend);
  setSession(session);
  initUI(document.getElementById('ui')!);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#0b1020',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 }, debug: false } },
    scene: [BootScene, TitleScene, WorldScene],
    input: { keyboard: true, mouse: true },
    audio: { noAudio: true },
    // Compiled-in light count for the Light2D pipeline shader — fixed regardless of quality tier
    // (Phaser recompiles the light shader's loop bound from this constant, and it can't change at
    // runtime). LightManager (render/LightManager.ts) is what actually caps how many are active at
    // once (8 on High, 4 on Medium, Light2D unused entirely on Low) — this is the compiled ceiling
    // both tiers share, kept deliberately modest since every lit pixel on screen (which, between
    // terrain and characters, is most of them) pays for this many loop iterations every frame
    // regardless of how many lights are actually doing anything that frame — profiling in headless
    // SwiftShader showed Light2D as a meaningful chunk of total frame cost.
    render: { maxLights: 8 },
  });
  (window as any).__game = game;
  (window as any).__session = session;
  installDevHandle(game);
  registerPipelines(game);

  const unlockAudio = () => audio.init();
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  ensurePixelFontLoading();
  const toTitle = () => {
    hideGameUI();
    audio.playMusic('title');
    if (game.scene.isActive('World')) game.scene.stop('World');
    if (!game.scene.isActive('Title')) game.scene.start('Title');
    showTitleScreen(backend, async (characterId) => {
      await session.enter(characterId);
      // World labels/barks/damage numbers are created with the pixel font as soon as the scene starts.
      await waitForPixelFont();
      showGameUI(session);
      game.scene.stop('Title');
      game.scene.start('World', { mapId: session.state.mapId });
    });
  };

  bus.on('game:quit', async () => {
    game.scene.stop('World');
    await session.leave();
    toTitle();
  });

  game.events.once('boot-complete', toTitle);
}

main().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f66;position:fixed;top:0;left:0">${String(e?.stack ?? e)}</pre>`);
});
