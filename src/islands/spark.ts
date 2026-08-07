/**
 * <as-spark> — commit-activity sparkline (frame 6a) and its boot sequence
 * (design_handoff_loader/LOADER.md).
 *
 * Hero: 320×22 (2× backing 640×44), 52 weekly points, brass rgba(217,165,74,.75).
 * Geometry per the handoff: x(i) = i·(w/(n−1)), y = 20 − (v/max)·17.
 *
 * The line no longer pops in when data lands — it boots in sequence with the
 * typed name above it:
 *
 *   boot   baseline only. <as-typeon> is still typing; one ritual at a time.
 *   fetch  name finished, request still in flight → caption fades in, caret blinks.
 *   draw   data resolved → caption fades out while the polyline reveals
 *          left→right over 900ms (ease-out cubic) behind a cream head dot.
 *   done   full polyline, no dot.
 *   fail   nothing to draw → caption fades out, the dim baseline just stays.
 *
 * The baseline is consumed by the reveal rather than sitting under it: each
 * frame draws it only from the head dot rightwards, so the spark visibly
 * replaces it ("never removed until the spark covers it").
 *
 * Coordination across three islands, no shared singleton:
 *   - typing:  <as-typeon> sets data-typed and fires `as-hero:typed` (bubbling).
 *              This element also reads the attribute on connect, so it doesn't
 *              matter which of the two upgrades first.
 *   - data:    <as-home-data> writes data-values once /api/github answers —
 *              a JSON array on success, `[]` when there is nothing to draw.
 *              Attribute absent = still in flight; that distinction is the
 *              whole difference between `fetch` and `fail`.
 *   Both signals are scoped to this island's own <main>, so the two page trees
 *   that briefly coexist during a view transition can't drive each other.
 *
 * Never draws a guess. This used to substitute a synthetic mulberry32 wave
 * whenever real data was missing, which put invented commit history on the page
 * — and would have left it there permanently if /api/github failed. An all-zero
 * series counts as nothing too: five of the six repos have had no commit in 52
 * weeks, and a flat 1.5px line reads as a broken chart, not a quiet year.
 *
 * The 72×18 row variant is no longer mounted anywhere (the 6b handoff dropped
 * per-project sparklines and the home digest followed), and it deliberately has
 * no part in this sequence: it has no baseline, no caption, and paints in one
 * shot. The sizing path is kept for when a row spark has real data again.
 *
 * Mobile (7a): the hero is a touch narrower (300px full-column vs 320px).
 */

import { isMobile, onBreakpointChange } from './breakpoint';

/** ms the reveal takes, and its curve — `1−(1−p)³` (handoff §Sequence 3) */
const DRAW_MS = 900;
const easeOutCubic = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;

type Phase = 'boot' | 'fetch' | 'draw' | 'done' | 'fail';

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

class AsSpark extends HTMLElement {
  static observedAttributes = ['data-values'];

  #hero = false;
  #reduced = false;
  #phase: Phase = 'boot';
  /** the name above has finished typing (or was never going to) */
  #typed = false;
  /** the fetch has answered — independent of whether it answered with anything */
  #resolved = false;
  /** a drawable series, or null once resolved with nothing worth drawing */
  #series: number[] | null = null;

  #raf = 0;
  #t0 = 0;
  #root: ParentNode = document;
  #unsub: (() => void) | null = null;
  #onTyped = () => {
    if (this.#typed) return;
    this.#typed = true;
    this.#advance();
  };

  connectedCallback() {
    this.#hero = this.dataset.kind === 'hero';
    this.#read();

    // row variant: no sequence, no baseline — draw once and be done
    if (!this.#hero) {
      this.#phase = this.#series ? 'done' : 'fail';
      this.#render(1);
      return;
    }

    this.#reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.#root = this.closest('main') ?? document;
    // Arms the caption's opacity transition (see index.astro). Without the gate
    // the caption fades 1 → 0 on first paint whenever the stylesheet lands after
    // the markup — which is exactly what dev's JS-injected styles do — so the
    // "fetching" line flashes on a page that hasn't fetched anything yet.
    this.dataset.seq = '';
    this.#unsub = onBreakpointChange(() => this.#resize());

    // Reduced motion skips the whole sequence: typing is skipped site-wide, so
    // there is nothing to sequence against — the line just appears when it can.
    // Otherwise: already-typed (attribute) or no <as-typeon> on the page at all
    // both count as typed, which keeps this independent of upgrade order.
    const typer = this.#root.querySelector('as-typeon');
    this.#typed = this.#reduced || !typer || typer.hasAttribute('data-typed');
    if (!this.#typed) this.#root.addEventListener('as-hero:typed', this.#onTyped);

    this.#advance();
  }

  disconnectedCallback() {
    this.#stop();
    this.#root.removeEventListener('as-hero:typed', this.#onTyped);
    this.#unsub?.();
    this.#unsub = null;
  }

  attributeChangedCallback(_name: string, oldValue: string | null, newValue: string | null) {
    // The custom-element upgrade replays pre-existing attributes before
    // connectedCallback (which reads them itself), and a no-op write of the
    // same JSON shouldn't repaint.
    if (!this.isConnected || oldValue === newValue) return;
    this.#read();
    if (this.#hero) this.#advance();
    else {
      this.#phase = this.#series ? 'done' : 'fail';
      this.#render(1);
    }
  }

  /* ---------------- state ---------------- */

  /** parse data-values into (#resolved, #series) */
  #read() {
    const raw = this.dataset.values;
    if (raw === undefined) {
      this.#resolved = false;
      this.#series = null;
      return;
    }
    // The attribute is only ever written once the fetch answers, so its mere
    // presence means resolved — `[]` (or anything unusable) means resolved with
    // nothing to draw, which is `fail`, not "still waiting".
    this.#resolved = true;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const ok =
      Array.isArray(parsed) &&
      parsed.length > 1 &&
      parsed.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0) &&
      Math.max(...(parsed as number[])) > 0;
    this.#series = ok ? (parsed as number[]) : null;
  }

  /** run the state machine off the two signals; idempotent */
  #advance() {
    if (!this.#resolved) {
      // in flight — caption only once the name has finished typing
      this.#phase = this.#typed ? 'fetch' : 'boot';
      this.#caption(this.#phase === 'fetch');
      this.#render(0);
      return;
    }
    if (!this.#typed) {
      // data beat the typing: hold the baseline and let the name finish
      this.#render(0);
      return;
    }
    this.#caption(false);
    if (!this.#series) {
      this.#phase = 'fail';
      this.#render(0);
      return;
    }
    if (this.#reduced) {
      this.#phase = 'done';
      this.#render(1);
      return;
    }
    if (this.#phase === 'draw' || this.#phase === 'done') return;
    this.#phase = 'draw';
    this.#t0 = performance.now();
    this.#raf = requestAnimationFrame(this.#tick);
  }

  #tick = (now: number) => {
    const p = easeOutCubic((now - this.#t0) / DRAW_MS);
    this.#render(p);
    if (p >= 1) {
      this.#phase = 'done';
      this.#raf = 0;
      return;
    }
    this.#raf = requestAnimationFrame(this.#tick);
  };

  #stop() {
    if (this.#raf) cancelAnimationFrame(this.#raf);
    this.#raf = 0;
  }

  /** the caption is CSS-driven — this only flips the flag it keys off */
  #caption(on: boolean) {
    // reduced motion has no caption at all; CSS hides it either way, but there
    // is no reason to narrate a sequence that isn't running
    if (this.#reduced) return;
    if (on) this.dataset.cap = 'on';
    else delete this.dataset.cap;
  }

  /** breakpoint crossed: re-size and repaint whatever we're showing */
  #resize() {
    if (this.#phase === 'draw') return; // the rAF re-reads the width each frame
    this.#render(this.#phase === 'done' ? 1 : 0);
  }

  /* ---------------- painting ---------------- */

  /**
   * Paint at reveal progress `p` (0 = baseline only, 1 = whole polyline).
   * The hero sizes its own canvas so the width can track the breakpoint; row
   * sparks keep their markup dims.
   */
  #render(p: number) {
    const cv = this.querySelector('canvas');
    if (!cv) return;

    const w = this.#hero ? (isMobile() ? 300 : 320) : 72;
    const h = this.#hero ? 22 : 18;
    if (this.#hero && (cv.width !== w * 2 || cv.height !== h * 2)) {
      cv.width = w * 2;
      cv.height = h * 2;
      cv.style.width = `${w}px`;
      cv.style.height = `${h}px`;
    }

    // A row spark with nothing to draw takes up no ink at all. visibility, not
    // display, so the column holds its width and the row keeps its alignment.
    // The hero always stays visible — its baseline is the waiting state.
    this.style.visibility = !this.#hero && !this.#series ? 'hidden' : '';

    const x = cv.getContext('2d');
    if (!x) return;
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.clearRect(0, 0, w, h);

    const bottom = h - 2; // y=20 at h=22 — the baseline sits on it
    const usable = h - 5; // 17px of headroom above it

    let values = this.#series;
    const edge = values ? p * w : 0;

    // Baseline, from the reveal edge rightwards — the spark eats it as it draws.
    // 1 CSS px tall on a half-pixel centre so it lands crisp at 2× backing.
    if (this.#hero && edge < w) {
      x.fillStyle = 'rgba(237, 230, 218, 0.12)';
      x.fillRect(edge, bottom - 0.5, w - edge, 1);
    }
    if (!values || p <= 0) return;

    // row sparks read as gentle 12-month waves in the design — bucket the
    // 52-week series down so 72px doesn't render as noise
    if (!this.#hero && values.length > 16) {
      const buckets = 12;
      const per = values.length / buckets;
      const src = values;
      values = Array.from({ length: buckets }, (_, b) => {
        const from = Math.floor(b * per);
        const to = Math.max(from + 1, Math.floor((b + 1) * per));
        let sum = 0;
        for (let i = from; i < to; i++) sum += src[i]!;
        return sum / (to - from);
      });
    }

    // Brass at .75 for the hero, solid for a row. Rows used to take their
    // colour from the project's active/maintained/archived field; that field is
    // gone (it couldn't be checked), and with it the last reason for a
    // per-status palette here.
    const accent = cssHex('--as-accent', '#d9a54a');
    const top = Math.max(...values, 0.001);
    const step = w / (values.length - 1);
    const py = (i: number) => bottom - (values![i]! / top) * usable;

    x.save();
    x.beginPath();
    x.rect(0, 0, edge, h);
    x.clip();
    x.beginPath();
    values.forEach((_, i) => (i ? x.lineTo(i * step, py(i)) : x.moveTo(0, py(0))));
    x.strokeStyle = this.#hero ? hexToRgba(accent, 0.75) : accent;
    x.lineWidth = 1.5;
    x.lineJoin = 'round';
    x.lineCap = 'round';
    x.stroke();
    x.restore();

    // draw-on head: a cream dot riding the reveal edge, interpolated between
    // the two points it sits between so it never floats off the line
    if (p < 1) {
      const i = Math.min(values.length - 1, edge / step);
      const lo = Math.floor(i);
      const hi = Math.min(values.length - 1, lo + 1);
      x.beginPath();
      x.arc(edge, py(lo) + (py(hi) - py(lo)) * (i - lo), 2, 0, Math.PI * 2);
      x.fillStyle = cssHex('--text-hi', '#ede6da');
      x.fill();
    }
  }
}

if (!customElements.get('as-spark')) customElements.define('as-spark', AsSpark);
