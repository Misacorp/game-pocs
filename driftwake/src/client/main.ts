import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { createBackend } from './net';
import { GameSession, setSession } from './session';
import { initUI, showTitleScreen, showGameUI, hideGameUI } from './ui';
import { audio } from './audio';
import { bus } from './events';

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
    scene: [BootScene, WorldScene],
    input: { keyboard: true, mouse: true },
    audio: { noAudio: true },
  });
  (window as any).__game = game;
  (window as any).__session = session;

  const unlockAudio = () => audio.init();
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  const toTitle = () => {
    hideGameUI();
    audio.playMusic('title');
    showTitleScreen(backend, async (characterId) => {
      await session.enter(characterId);
      showGameUI(session);
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
