/**
 * Waits for the brand's pixel font (@fontsource/pixelify-sans, loaded by the UI module) before
 * text styles switch over to it, falling back gracefully to monospace until (or if) it's ready.
 */
let ready = false;
let loading: Promise<void> | null = null;

/** Start loading the pixel font (idempotent). Resolves when loaded, or on failure/unsupported. */
export function ensurePixelFontLoading(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const fonts = (document as unknown as { fonts?: { load: (f: string) => Promise<unknown> } }).fonts;
      if (!fonts?.load) return;
      await Promise.all([fonts.load('400 16px "Pixelify Sans"'), fonts.load('600 16px "Pixelify Sans"')]);
      ready = true;
    } catch { /* stay on fallback */ }
  })();
  return loading;
}

/** Wait for the pixel font, but never longer than `timeoutMs` (world text must not block play). */
export function waitForPixelFont(timeoutMs = 2000): Promise<void> {
  return Promise.race([ensurePixelFontLoading(), new Promise<void>((r) => setTimeout(r, timeoutMs))]);
}

export function isPixelFontReady(): boolean { return ready; }

export function pixelFontFamily(): string {
  return ready ? '"Pixelify Sans", monospace' : 'monospace';
}
