/**
 * Raw keyboard state via window keydown/keyup + keybinds.actionForCode (NOT Phaser key objects,
 * so rebinding takes effect live). Ignores game input while a UI panel captures input.
 */
import { actionForCode } from '../../input/keybinds';
import { bus } from '../../events';

export class InputController {
  private held = new Set<string>();
  private pressedFrame = new Set<string>();
  private releasedFrame = new Set<string>();
  private capture = false;
  private offCapture: () => void;

  private handleKeyDown = (e: KeyboardEvent) => {
    if (this.blocked()) return;
    const action = actionForCode(e.code);
    if (!action) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!this.held.has(action)) this.pressedFrame.add(action);
    this.held.add(action);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    const action = actionForCode(e.code);
    if (!action) return;
    this.held.delete(action);
    this.releasedFrame.add(action);
  };

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.offCapture = bus.on('input:capture', (v) => { this.capture = v; if (v) this.held.clear(); });
  }

  private blocked(): boolean {
    if (this.capture) return true;
    const ae = document.activeElement as HTMLElement | null;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return true;
    return false;
  }

  isDown(action: string): boolean { return this.held.has(action); }
  justPressed(action: string): boolean { return this.pressedFrame.has(action); }
  justReleased(action: string): boolean { return this.releasedFrame.has(action); }

  /** Call once per scene update, after all systems read this frame's justPressed()/justReleased(). */
  endFrame(): void { this.pressedFrame.clear(); this.releasedFrame.clear(); }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.offCapture();
  }
}
