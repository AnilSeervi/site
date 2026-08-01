/**
 * <as-spark> — commit-activity sparklines (frames 6a/6b).
 * Hero: 320×22 (2× backing 640×44), 52 weekly points, brass rgba(217,165,74,.75).
 * Row: 72×18 (2× 144×36), colored by project status —
 *   maintained → accent brass · active → #92C78C · archived → #5E5749.
 *
 * Data: `data-values` JSON array of non-negative numbers — <as-home-data>
 * sets it from /api/github after mount, and attributeChangedCallback redraws.
 * Without (or with invalid) data-values it falls back to the prototype's
 * deterministic synthetic series (mulberry32 seed 7 + sin wave) so the visual
 * matches the design reference exactly.
 *
 * Mobile (7a): the hero sparkline is a touch narrower (300px full-column vs
 * 320px). Row sparks are hidden below 768px, so only the hero re-sizes.
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

/** the prototype's synthetic 52-week series (drawSpark, seed 7) */
function syntheticWeeks(seed = 7): number[] {
  const rnd = mulberry(seed);
  const wk: number[] = [];
  for (let w = 0; w < 52; w++) {
    let s = 0;
    for (let d = 0; d < 7; d++) s += Math.max(0, Math.sin(w / 4.6) * 0.7 + rnd() * 1.5 - 0.55);
    wk.push(s);
  }
  return wk;
}

/** resolve a theme token (:root custom property) to its hex, with a fallback */
function cssHex(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** hex (#rgb / #rrggbb) → rgba() string at the given alpha */
function hexToRgba(hex: string, a: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * Row stroke colours come from the theme tokens (status → accent/green/faint).
 * Strokes are SOLID — the prototype dims via element-level opacity (.75 normal
 * / .6 archived), which the pages own via CSS; baking alpha here would double it.
 */
function statusColor(status: string | undefined): string {
  if (status === 'active') return cssHex('--live-green', '#92c78c');
  if (status === 'archived') return cssHex('--faint', '#5e5749');
  return cssHex('--as-accent', '#d9a54a');
}

class AsSpark extends HTMLElement {
  static observedAttributes = ['data-values'];

  /** set after the first paint — attribute changes before then are handled by connectedCallback */
  #drawn = false;
  #unsub: (() => void) | null = null;

  connectedCallback() {
    this.#draw();
    this.#drawn = true;
    // only the hero sparkline changes width across the breakpoint
    if (this.dataset.kind === 'hero') {
      this.#unsub = onBreakpointChange(() => this.#draw());
    }
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

  #draw() {
    const cv = this.querySelector('canvas');
    if (!cv) return;

    let values: number[] | null = null;
    try {
      values = this.dataset.values ? JSON.parse(this.dataset.values) : null;
    } catch {
      values = null;
    }
    if (!values || values.length < 2) {
      // deterministic per-element seed so different rows don't render identically
      const seed = this.dataset.seed ? Number(this.dataset.seed) : 7;
      values = syntheticWeeks(seed);
    }

    const hero = this.dataset.kind === 'hero';
    const w = hero ? (isMobile() ? 300 : 320) : 72;
    const h = hero ? 22 : 18;
    // hero sizes its own canvas (backing 2×) so the width tracks the breakpoint;
    // row sparks keep their markup dims
    if (hero) {
      cv.width = w * 2;
      cv.height = h * 2;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
    }

    // row sparks read as gentle 12-month waves in the design — bucket the
    // 52-week series down so 72px doesn't render as noise
    if (!hero && values.length > 16) {
      const buckets = 12;
      const per = values.length / buckets;
      values = Array.from({ length: buckets }, (_, b) => {
        const from = Math.floor(b * per);
        const to = Math.max(from + 1, Math.floor((b + 1) * per));
        let sum = 0;
        for (let i = from; i < to; i++) sum += values![i]!;
        return sum / (to - from);
      });
    }
    // hero keeps the prototype's --as-accent at .75 (no element opacity there)
    const stroke = hero
      ? hexToRgba(cssHex('--as-accent', '#d9a54a'), 0.75)
      : statusColor(this.dataset.status);

    const x = cv.getContext('2d')!;
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.clearRect(0, 0, w, h);
    const top = Math.max(...values, 0.001);
    const bottom = h - 2;
    const usable = h - 5;
    x.beginPath();
    values.forEach((v, i) => {
      const px = i * (w / (values!.length - 1));
      const py = bottom - (v / top) * usable;
      if (i) x.lineTo(px, py);
      else x.moveTo(px, py);
    });
    x.strokeStyle = stroke;
    x.lineWidth = 1.5;
    x.lineJoin = 'round';
    x.lineCap = 'round';
    x.stroke();
  }
}

if (!customElements.get('as-spark')) customElements.define('as-spark', AsSpark);
