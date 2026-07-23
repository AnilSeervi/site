/**
 * <as-ascii-portrait> — ASCII-dither portrait (frames 6a hero 50×62 / 6e about 60×75).
 * Direct port of the prototype's loadPortrait/renderAscii/startHalfLoop
 * (design handoff, script block): 60×75 shared luminance grid, Rec.709 luma,
 * 6%/94% percentile contrast stretch, ramp ` .·:-=+*#%@`, 4px cells drawn at 2×,
 * per-cell hash shimmer ±0.08 advanced every 90ms, hover-develop gaussian σ≈80px,
 * warm tint rgb(m, .92m, .76m).
 *
 * Markup contract: <as-ascii-portrait data-cells="50x62"><canvas …></canvas></as-ascii-portrait>
 */

const GW = 60;
const GH = 75;
const RAMP = ' .·:-=+*#%@';

let lumPromise: Promise<{ L: Float32Array; gw: number; gh: number } | null> | null = null;

function loadPortrait() {
  lumPromise ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = GW;
      cv.height = GH;
      const x = cv.getContext('2d', { willReadFrequently: true })!;
      // cover-crop to the 240/300 = 4:5 target, biased ~6% toward the top
      const tR = 240 / 300;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      let sw = iw;
      let sh = ih;
      if (iw / ih > tR) sw = ih * tR;
      else sh = iw / tR;
      const sx = (iw - sw) / 2;
      const sy = Math.min(ih * 0.06, ih - sh);
      x.drawImage(img, sx, sy, sw, sh, 0, 0, GW, GH);
      const d = x.getImageData(0, 0, GW, GH).data;
      const raw = new Float32Array(GW * GH);
      for (let i = 0; i < GW * GH; i++) {
        raw[i] = (0.2126 * d[i * 4]! + 0.7152 * d[i * 4 + 1]! + 0.0722 * d[i * 4 + 2]!) / 255;
      }
      // 6% / 94% percentile contrast stretch
      const srt = Array.from(raw).sort((a, b) => a - b);
      const lo = srt[Math.floor(srt.length * 0.06)]!;
      const hi = srt[Math.floor(srt.length * 0.94)]!;
      const L = new Float32Array(GW * GH);
      for (let i = 0; i < GW * GH; i++) {
        L[i] = Math.max(0, Math.min(1, (raw[i]! - lo) / Math.max(0.001, hi - lo)));
      }
      resolve({ L, gw: GW, gh: GH });
    };
    img.onerror = () => resolve(null);
    img.src = '/portrait.jpg';
  });
  return lumPromise;
}

class AsAsciiPortrait extends HTMLElement {
  #cv: HTMLCanvasElement | null = null;
  #cols = 50;
  #rows = 62;
  #frame = 0;
  #loop: ReturnType<typeof setInterval> | null = null;
  #mouse: [number, number] | null = null;
  #queued = false;
  #lum: { L: Float32Array; gw: number; gh: number } | null = null;

  #onMove = (e: PointerEvent) => {
    const r = this.#cv!.getBoundingClientRect();
    // logical (1×) canvas coordinates — the develop falloff works in these units
    this.#mouse = [
      ((e.clientX - r.left) / r.width) * this.#cols * 4,
      ((e.clientY - r.top) / r.height) * this.#rows * 4
    ];
    if (!this.#queued) {
      this.#queued = true;
      requestAnimationFrame(() => {
        this.#queued = false;
        this.#draw();
      });
    }
  };

  #onLeave = () => {
    this.#mouse = null;
    this.#draw();
  };

  async connectedCallback() {
    this.#cv = this.querySelector('canvas');
    if (!this.#cv) return;
    const [c, r] = (this.dataset.cells ?? '50x62').split('x').map(Number);
    this.#cols = c || 50;
    this.#rows = r || 62;

    this.#cv.addEventListener('pointermove', this.#onMove);
    this.#cv.addEventListener('pointerleave', this.#onLeave);

    this.#lum = await loadPortrait();
    if (!this.isConnected) return;
    this.#draw();

    // 90ms shimmer — skipped under reduced motion (static render stays)
    if (this.#loop) return; // re-entry guard (mirrors the prototype's startHalfLoop)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#loop = setInterval(() => {
        this.#frame++;
        this.#draw();
      }, 90);
    }
  }

  disconnectedCallback() {
    if (this.#loop) clearInterval(this.#loop);
    this.#loop = null;
    this.#cv?.removeEventListener('pointermove', this.#onMove);
    this.#cv?.removeEventListener('pointerleave', this.#onLeave);
  }

  /** verbatim renderAscii port — constants must match the prototype */
  #draw() {
    const cv = this.#cv;
    if (!cv) return;
    const cols = this.#cols;
    const rows = this.#rows;
    const W = cols * 4;
    const H = rows * 4;
    const x = cv.getContext('2d')!;
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.fillStyle = '#100E0C';
    x.fillRect(0, 0, W, H);
    x.font = '600 5.6px "Spline Sans Mono", monospace';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const src = this.#lum;
    const m = this.#mouse;
    // prototype seeds mulberry(21) per render — consumed only by the
    // no-portrait fallback branch
    let a = 21;
    const rnd = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const px = 2 + ix * 4;
        const py = 2 + iy * 4;
        let lum: number;
        if (src) {
          lum =
            src.L[
              Math.min(src.gh - 1, Math.floor((iy * src.gh) / rows)) * src.gw +
                Math.min(src.gw - 1, Math.floor((ix * src.gw) / cols))
            ]!;
        } else {
          const dC = Math.hypot(px - W / 2, py - H * 0.4);
          lum = Math.max(0, 1 - dC / (H * 0.55)) * 0.75 + rnd() * 0.2;
        }
        let t = 0;
        if (m) {
          const d = Math.hypot(px - m[0], py - m[1]);
          t = Math.exp(-(d / 80) * (d / 80));
        }
        const nz = Math.sin(ix * 127.1 + iy * 311.7 + this.#frame * 0.93) * 43758.5453;
        const b = Math.max(0, Math.min(1, (lum + (nz - Math.floor(nz) - 0.5) * 0.16) * (0.72 + 0.42 * t)));
        const ch = RAMP[Math.round(b * (RAMP.length - 1))]!;
        if (ch === ' ') continue;
        const v = 50 + 185 * b;
        x.fillStyle = `rgb(${Math.round(v)},${Math.round(v * 0.92)},${Math.round(v * 0.76)})`;
        x.fillText(ch, px, py);
      }
    }
  }
}

if (!customElements.get('as-ascii-portrait')) {
  customElements.define('as-ascii-portrait', AsAsciiPortrait);
}
