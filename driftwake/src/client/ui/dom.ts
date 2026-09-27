/**
 * Tiny DOM helpers shared across the UI module. No framework — just a hyperscript-ish `el()`.
 */

type Child = Node | string | number | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props?: (Partial<Record<string, any>> & { class?: string; style?: Partial<CSSStyleDeclaration> }) | null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props) {
    for (const k in props) {
      if (k === 'class') node.className = props[k];
      else if (k === 'style' && typeof props[k] === 'object') Object.assign(node.style, props[k]);
      else if (k.startsWith('on') && typeof props[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), props[k]);
      else if (k === 'html') node.innerHTML = props[k];
      else if (props[k] === false || props[k] === null || props[k] === undefined) { /* skip */ }
      else if (k in node) (node as any)[k] = props[k];
      else node.setAttribute(k, String(props[k]));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export function clear(node: HTMLElement) { node.innerHTML = ''; }

export function fmtNum(n: number): string { return Math.round(n).toLocaleString('en-US'); }

export function fmtPct(n: number): string { return `${Math.round(n * 100)}%`; }

export function fmtTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function fmtPlaytime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function clamp(v: number, lo: number, hi: number): number { return Math.max(lo, Math.min(hi, v)); }

/** Local-storage helper, tolerant of private-mode / disabled storage. */
export const store = {
  get<T>(key: string, fallback: T): T {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

let uidN = 0;
export function domId(prefix = 'dw'): string { uidN += 1; return `${prefix}${uidN}`; }
