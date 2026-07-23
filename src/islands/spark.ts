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
 */

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

/**
 * Row strokes are SOLID — the prototype dims via element-level opacity
 * (.75 normal / .6 archived), which the pages own via CSS. Baking alpha here
 * too would double-apply it.
 */
const STATUS_COLORS: Record<string, string> = {
  maintained: '#D9A54A',
  active: '#92C78C',
  archived: '#5E5749'
};

class AsSpark extends HTMLElement {
  static observedAttributes = ['data-values'];

  /** set after the first paint — attribute changes before then are handled by connectedCallback */
  #drawn = false;

  connectedCallback() {
    this.#draw();
    this.#drawn = true;
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
    const w = hero ? 320 : 72;
    const h = hero ? 22 : 18;

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
    // hero keeps the prototype's baked-in alpha (no element opacity there)
    const stroke = hero
      ? 'rgba(217,165,74,.75)'
      : (STATUS_COLORS[this.dataset.status ?? ''] ?? '#D9A54A');

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
