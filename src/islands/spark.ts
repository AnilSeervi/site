/**
 * <as-spark> — commit-activity sparkline (frame 6a).
 * Hero: 320×22 (2× backing 640×44), 52 weekly points, brass rgba(217,165,74,.75).
 *
 * The 72×18 row variant is no longer mounted anywhere: /work dropped per-project
 * sparklines in the 6b handoff, and the home digest followed because every one of
 * those repos has an all-zero 52-week series — a 1.5px flat line pretending to be
 * a chart. The row sizing path is kept for when a row spark has real data again.
 *
 * Data: `data-values` JSON array of non-negative numbers — <as-home-data>
 * sets it from /api/github after mount, and attributeChangedCallback redraws.
 * Without it, or with an all-zero series, the element hides instead of drawing:
 * it used to substitute a deterministic synthetic wave to match the design
 * reference, which put invented commit history on the page.
 *
 * Mobile (7a): the hero sparkline is a touch narrower (300px full-column vs
 * 320px). Row sparks are hidden below 768px, so only the hero re-sizes.
 */

import { isMobile, onBreakpointChange } from './breakpoint';

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

    let parsed: number[] | null = null;
    try {
      parsed = this.dataset.values ? JSON.parse(this.dataset.values) : null;
    } catch {
      parsed = null;
    }

    // Draw nothing rather than draw a guess. This used to fall back to a
    // synthetic mulberry32 wave whenever real data was missing, which meant an
    // invented commit history rendered on every first paint — and would have
    // stayed on screen permanently if /api/github ever failed. Fabricated
    // activity on a page whose whole argument is receipts is not a fallback.
    //
    // An all-zero series is also nothing: five of the six repos have had no
    // commit in 52 weeks, and a 1.5px flat line reads as a broken chart rather
    // than as a quiet year. visibility, not display, so the column holds its
    // width and the rest of the row keeps its alignment.
    if (!parsed || parsed.length < 2 || Math.max(...parsed) <= 0) {
      this.style.visibility = 'hidden';
      cv.getContext('2d')?.clearRect(0, 0, cv.width, cv.height);
      return;
    }
    this.style.visibility = '';
    let values: number[] = parsed;

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
        for (let i = from; i < to; i++) sum += values[i]!;
        return sum / (to - from);
      });
    }
    // Brass at .75 for the hero, solid for a row. Rows used to take their
    // colour from the project's active/maintained/archived field; that field is
    // gone (it couldn't be checked), and with it the last reason for a
    // per-status palette here.
    const accent = cssHex('--as-accent', '#d9a54a');
    const stroke = hero ? hexToRgba(accent, 0.75) : accent;

    const x = cv.getContext('2d')!;
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.clearRect(0, 0, w, h);
    const top = Math.max(...values, 0.001);
    const bottom = h - 2;
    const usable = h - 5;
    x.beginPath();
    values.forEach((v, i) => {
      const px = i * (w / (values.length - 1));
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
