/**
 * Waits for the brand's pixel font (@fontsource/pixelify-sans, loaded by the UI module) before
 * text styles switch over to it, falling back gracefully to monospace until (or if) it's ready.
 */
let ready = false;
let started = false;

export function ensurePixelFontLoading(): void {
  if (started) return;
  started = true;
  try {
    const fonts = (document as unknown as { fonts?: { load: (f: string) => Promise<unknown> } }).fonts;
    if (!fonts?.load) return;
    fonts.load('600 16px "Pixelify Sans"').then(() => { ready = true; }).catch(() => { /* stay on fallback */ });
  } catch { /* fonts API unavailable (jsdom/old browser) */ }
}

export function isPixelFontReady(): boolean { return ready; }

export function pixelFontFamily(): string {
  return ready ? '"Pixelify Sans", monospace' : 'monospace';
}
