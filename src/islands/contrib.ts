/**
 * <as-contrib> — GitHub contribution field (frame 6d).
 * Port of the prototype's drawContrib: 1404×182 backing canvas (2×) shown
 * 702×91, 52×7 grid at 13.5px pitch, 10×10 cells with radius 2.5.
 * Empty cells rgba(237,230,218,.06); active cells brass
 * rgba(217,165,74, .14 + .78t).
 *
 * Data: `data-values` — JSON 52×7 array of daily commit counts
 * (weeks-major, exactly the `days` field served by /api/github).
 * <as-live-data> writes the attribute once the fetch resolves; changes are
 * observed and repainted (same contract as <as-spark>). Without data it
 * draws the prototype's deterministic synthetic field (mulberry32 seed 7 +
 * sin wave) so the SSR default matches the design reference exactly.
 *
 * Intensity with real data: t = min(1, count / cap) where
 * cap = max(1, p90 of nonzero counts). The p90 cap keeps a single monster
 * day from washing every other cell down to faint brass (a max-normalise
 * would), while still saturating genuinely hot days; the max(1, …) floor
 * avoids a degenerate cap on quiet years where p90 could be < 1.
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

const EMPTY = 'rgba(237,230,218,.06)';
const PITCH = 13.5;
const CELL = 10;
const RADIUS = 2.5;

function brass(t: number): string {
  return `rgba(217,165,74,${(0.14 + 0.78 * t).toFixed(2)})`;
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

  /** set after the first paint — attribute changes before then are handled by connectedCallback */
  #drawn = false;
  #unsub: (() => void) | null = null;
  /** weeks shown + CSS width — 52/702 desktop, 23/321 mobile (7d) */
  #weeks = 52;
  #cssW = 702;

  connectedCallback() {
    this.#applySize();
    this.#draw();
    this.#drawn = true;
    this.#unsub = onBreakpointChange(() => {
      this.#applySize();
      this.#draw();
    });
  }

  disconnectedCallback() {
    this.#unsub?.();
    this.#unsub = null;
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    // Redraw only for a real post-mount change: the custom-element upgrade
    // replays pre-existing attributes before connectedCallback (guarded by
    // #drawn), and no-op writes of the same JSON shouldn't repaint.
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

    const days = this.#days();
    if (days) this.#drawReal(x, days);
    else this.#drawSynthetic(x);
  }

  /** parse data-values into a 52×7 weeks-major grid; null when absent/malformed */
  #days(): number[][] | null {
    try {
      const v: unknown = this.dataset.values ? JSON.parse(this.dataset.values) : null;
      if (Array.isArray(v) && v.length > 0 && v.every((wk) => Array.isArray(wk))) {
        return v as number[][];
      }
    } catch {
      /* malformed JSON → synthetic fallback */
    }
    return null;
  }

  #drawReal(x: CanvasRenderingContext2D, days: number[][]) {
    // mobile shows only the most recent weeks (7d: 23 vs 52)
    const grid = days.slice(-this.#weeks);
    const nonzero = grid
      .flat()
      .filter((c) => typeof c === 'number' && c > 0)
      .sort((a, b) => a - b);
    // cap = p90 of nonzero counts (see header comment for why not max)
    const cap = Math.max(1, nonzero.length ? nonzero[Math.floor(0.9 * (nonzero.length - 1))]! : 1);

    for (let w = 0; w < grid.length; w++) {
      for (let d = 0; d < 7; d++) {
        const count = grid[w]?.[d] ?? 0;
        if (count <= 0) cell(x, w, d, EMPTY);
        else cell(x, w, d, brass(Math.min(1, count / cap)));
      }
    }
  }

  /** prototype's synthetic field — SSR default until real data lands */
  #drawSynthetic(x: CanvasRenderingContext2D) {
    const rnd = mulberry(7);
    for (let w = 0; w < this.#weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const v = Math.max(0, Math.sin(w / 4.6) * 0.7 + rnd() * 1.5 - 0.55);
        if (v <= 0.1) cell(x, w, d, EMPTY);
        else cell(x, w, d, brass(Math.min(1, v / 1.5)));
      }
    }
  }
}

if (!customElements.get('as-contrib')) customElements.define('as-contrib', AsContrib);
