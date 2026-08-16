/**
 * <as-contrib> — GitHub contribution field canvas. `data-values`: 52×7
 * weeks-major JSON of daily commit counts, written by <as-live-data> and
 * repainted on change; absent → deterministic synthetic field.
 * Intensity cap = max(1, p90 of nonzero counts) — p90 not max, so one monster
 * day can't wash every other cell down; the floor guards p90 < 1.
 */

import { isMobile, onBreakpointChange } from './breakpoint';

function mulberry(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PITCH = 13.5;
const CELL = 10;
const RADIUS = 2.5;
const DAY_MS = 86_400_000;

/** what a hovered cell reports — `date` is null for the padded future tail */
export interface ContribCell {
  /** column in the FULL grid, not the rendered one (mobile renders 23 weeks) */
  week: number;
  /** row = weekday, 0 = Sunday */
  day: number;
  count: number;
  /** ISO date, or null when the anchor is unknown / the cell is in the future */
  date: string | null;
}

/** resolve a theme token (:root custom property) to its hex, with a fallback */
function cssHex(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** hex (#rgb / #rrggbb) → rgba() string at the given alpha */
function hexToRgba(hex: string, a: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function cell(x: CanvasRenderingContext2D, w: number, d: number, style: string) {
  x.fillStyle = style;
  x.beginPath();
  if (x.roundRect) {
    x.roundRect(w * PITCH, d * PITCH, CELL, CELL, RADIUS);
    x.fill();
  } else {
    x.fillRect(w * PITCH, d * PITCH, CELL, CELL);
  }
}

class AsContrib extends HTMLElement {
  static observedAttributes = ['data-values'];

  /** set after the first paint; attribute replays before mount are ignored */
  #drawn = false;
  #unsub: (() => void) | null = null;
  /** weeks shown + CSS width — 52/702 desktop, 23/321 mobile */
  #weeks = 52;
  #cssW = 702;
  /** the last cell reported, so pointermove only fires an event on a change */
  #hot: string | null = null;
  /** #days() memo — the raw attribute it was parsed from, and the result */
  #parsedRaw = '';
  #parsed: number[][] | null = null;

  connectedCallback() {
    this.#applySize();
    this.#draw();
    this.#drawn = true;
    this.#unsub = onBreakpointChange(() => {
      this.#applySize();
      this.#draw();
    });

    // pointerdown is required for touch: a tap fires down/up with no move
    // between them, so pointermove alone would only ever serve a mouse.
    const cv = this.querySelector('canvas');
    cv?.addEventListener('pointermove', this.#onMove);
    cv?.addEventListener('pointerdown', this.#onMove);
    cv?.addEventListener('pointerleave', this.#onLeave);
    cv?.addEventListener('pointercancel', this.#onLeave);
  }

  disconnectedCallback() {
    const cv = this.querySelector('canvas');
    cv?.removeEventListener('pointermove', this.#onMove);
    cv?.removeEventListener('pointerdown', this.#onMove);
    cv?.removeEventListener('pointerleave', this.#onLeave);
    cv?.removeEventListener('pointercancel', this.#onLeave);
    this.#unsub?.();
    this.#unsub = null;
  }

  // ---- hover hit-test ------------------------------------------------------

  /**
   * Which cell is under a canvas-relative point, or null in the gutter.
   * Backing store is 2× with a matching setTransform, so offsetX/Y index the
   * grid in CSS px: PITCH 13.5 stride, CELL 10 painted, 3.5 gutter = a real miss.
   */
  #cellAt(x: number, y: number): ContribCell | null {
    if (x < 0 || y < 0) return null;
    const week = Math.floor(x / PITCH);
    const day = Math.floor(y / PITCH);
    if (week >= this.#weeks || day > 6) return null;
    if (x - week * PITCH > CELL || y - day * PITCH > CELL) return null;

    // translate the rendered column into a full-grid one (mobile shows a tail)
    const grid = this.#days();
    const skipped = grid ? Math.max(0, grid.length - this.#weeks) : 0;
    const at = skipped + week;
    const count = grid?.[at]?.[day] ?? 0;
    return { week: at, day, count, date: this.#dateAt(at, day) };
  }

  /**
   * ISO date of a full-grid cell: `data-from` anchor + (week * 7 + weekday) days.
   * Future cells return null — they're the pad on the current week, not zeroes.
   */
  #dateAt(week: number, day: number): string | null {
    const anchor = this.dataset.from;
    if (!anchor) return null;
    const t = Date.parse(`${anchor}T00:00:00Z`);
    if (Number.isNaN(t)) return null;
    const at = t + (week * 7 + day) * DAY_MS;
    if (at > Date.now()) return null;
    return new Date(at).toISOString().slice(0, 10);
  }

  #emit(name: 'contrib:day' | 'contrib:leave', detail?: ContribCell) {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
  }

  #onMove = (e: PointerEvent) => {
    const cell = this.#cellAt(e.offsetX, e.offsetY);
    // one event per cell change, not per mouse move
    const key = cell ? `${cell.week}:${cell.day}` : null;
    if (key === this.#hot) return;
    this.#hot = key;
    if (cell) this.#emit('contrib:day', cell);
    else this.#emit('contrib:leave');
  };

  #onLeave = () => {
    if (this.#hot === null) return;
    this.#hot = null;
    this.#emit('contrib:leave');
  };

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    // The element upgrade replays existing attributes before connectedCallback
    // (hence #drawn); no-op writes of identical JSON shouldn't repaint either.
    if (!this.isConnected || !this.#drawn || oldValue === newValue) return;
    this.#draw();
  }

  /** pick weeks + size the canvas (backing 2×) for the current breakpoint */
  #applySize() {
    const mobile = isMobile();
    this.#weeks = mobile ? 23 : 52;
    this.#cssW = mobile ? 321 : 702;
    const cv = this.querySelector('canvas');
    if (!cv) return;
    cv.width = this.#cssW * 2;
    cv.height = 182;
    cv.style.width = `${this.#cssW}px`;
    cv.style.height = '91px';
  }

  #draw() {
    const cv = this.querySelector('canvas');
    const x = cv?.getContext('2d');
    if (!x) return;
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.clearRect(0, 0, this.#cssW, 91);

    // colours resolve from theme tokens so accent re-theming applies
    const accent = cssHex('--as-accent', '#d9a54a');
    const empty = hexToRgba(cssHex('--text-hi', '#ede6da'), 0.06);

    const days = this.#days();
    if (days) this.#drawReal(x, days, accent, empty);
    else this.#drawSynthetic(x, accent, empty);
  }

  /**
   * Parse data-values into a 52×7 weeks-major grid; null when absent/malformed.
   * Memoized on the raw attribute — the hit-test calls this on every cell change.
   */
  #days(): number[][] | null {
    const raw = this.dataset.values ?? '';
    if (raw === this.#parsedRaw) return this.#parsed;
    this.#parsedRaw = raw;
    this.#parsed = null;
    try {
      const v: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(v) && v.length > 0 && v.every((wk) => Array.isArray(wk))) {
        this.#parsed = v as number[][];
      }
    } catch {
      /* malformed JSON → synthetic fallback */
    }
    return this.#parsed;
  }

  #drawReal(x: CanvasRenderingContext2D, days: number[][], accent: string, empty: string) {
    // mobile shows only the most recent weeks (23 vs 52)
    const grid = days.slice(-this.#weeks);
    const nonzero = grid
      .flat()
      .filter((c) => typeof c === 'number' && c > 0)
      .sort((a, b) => a - b);
    const cap = Math.max(1, nonzero.length ? nonzero[Math.floor(0.9 * (nonzero.length - 1))]! : 1);

    for (let w = 0; w < grid.length; w++) {
      for (let d = 0; d < 7; d++) {
        const count = grid[w]?.[d] ?? 0;
        if (count <= 0) cell(x, w, d, empty);
        else cell(x, w, d, hexToRgba(accent, 0.14 + 0.78 * Math.min(1, count / cap)));
      }
    }
  }

  /** synthetic field — SSR default until real data lands */
  #drawSynthetic(x: CanvasRenderingContext2D, accent: string, empty: string) {
    const rnd = mulberry(7);
    for (let w = 0; w < this.#weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const v = Math.max(0, Math.sin(w / 4.6) * 0.7 + rnd() * 1.5 - 0.55);
        if (v <= 0.1) cell(x, w, d, empty);
        else cell(x, w, d, hexToRgba(accent, 0.14 + 0.78 * Math.min(1, v / 1.5)));
      }
    }
  }
}

if (!customElements.get('as-contrib')) customElements.define('as-contrib', AsContrib);
