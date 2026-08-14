/**
 * <as-ascii-portrait> — ASCII-dither portrait canvas: 60×75 luminance grid,
 * Rec.709 luma, ramp ` .·:-=+*#%@`, 4px cells drawn at 2×, shimmer every 90ms.
 *
 * Markup: <as-ascii-portrait data-cells="50x62" data-cells-mobile="29x36">
 *   <canvas …></canvas></as-ascii-portrait>
 * CSS box (cols·4 × rows·4) and 2× backing store are set in JS from the active
 * cell grid, so the mobile size follows the breakpoint, not the markup.
 *
 * Loading: data-load goes idle → waiting → arrived, and the canvas draws the
 * noise field while waiting, then dissolves into the portrait.
 */

import { isMobile, onBreakpointChange } from './breakpoint';

const GW = 60;
const GH = 75;
const RAMP = ' .·:-=+*#%@';
/** hold the empty box this long before drawing noise — a cached image beats it
    and lands straight on the portrait, so a fast load shows no loading state */
const GRACE_MS = 180;
const DISSOLVE_MS = 420;

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
  #unsub: (() => void) | null = null;
  /** 0 = pure noise, 1 = pure portrait; the dissolve drives it between them */
  #mix = 0;
  #grace: ReturnType<typeof setTimeout> | null = null;
  #raf = 0;

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

  /** pick the cell grid for the current breakpoint and size the canvas from it */
  #applySize() {
    const attr = (isMobile() && this.dataset.cellsMobile) || this.dataset.cells || '50x62';
    const [c, r] = attr.split('x').map(Number);
    this.#cols = c || 50;
    this.#rows = r || 62;
    const cv = this.#cv;
    if (!cv) return;
    // CSS box = cols·4 × rows·4; backing store 2× to match setTransform(2,…) in #draw
    const cssW = this.#cols * 4;
    const cssH = this.#rows * 4;
    cv.width = cssW * 2;
    cv.height = cssH * 2;
    cv.style.width = `${cssW}px`;
    cv.style.height = `${cssH}px`;
  }

  async connectedCallback() {
    this.#cv = this.querySelector('canvas');
    if (!this.#cv) return;
    this.#applySize();

    this.#cv.addEventListener('pointermove', this.#onMove);
    this.#cv.addEventListener('pointerleave', this.#onLeave);

    // re-size + repaint when the viewport crosses the mobile breakpoint
    this.#unsub = onBreakpointChange(() => {
      this.#applySize();
      this.#draw();
    });

    this.dataset.load = 'idle';
    // held, not started: an image already in cache resolves inside GRACE_MS and
    // the noise never paints, so a warm load has no loading state to flicker
    this.#grace = setTimeout(() => {
      this.#grace = null;
      if (!this.isConnected || this.dataset.load === 'arrived') return;
      this.dataset.load = 'waiting';
      this.#mix = 0;
      this.#draw();
      this.#shimmer();
    }, GRACE_MS);

    const lum = await loadPortrait();
    if (!this.isConnected) return;
    if (this.#grace) clearTimeout(this.#grace);
    this.#grace = null;
    this.#lum = lum;
    // no image means the noise field IS the portrait, so it never dissolves
    if (!lum) this.dataset.fallback = '';
    const wasWaiting = this.dataset.load === 'waiting';
    this.dataset.load = 'arrived';

    if (lum && wasWaiting && !this.#reduced()) this.#dissolve();
    else {
      this.#mix = 1;
      this.#draw();
    }
    this.#shimmer();
  }

  #reduced() {
    return matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** 90ms shimmer — skipped under reduced motion (the static render stays) */
  #shimmer() {
    if (this.#loop || this.#reduced()) return; // re-entry guard: two callers now
    this.#loop = setInterval(() => {
      this.#frame++;
      this.#draw();
    }, 90);
  }

  /** noise → portrait over DISSOLVE_MS; the shimmer keeps running underneath */
  #dissolve() {
    const t0 = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / DISSOLVE_MS);
      this.#mix = 1 - (1 - p) ** 3;
      this.#draw();
      if (p < 1 && this.isConnected) this.#raf = requestAnimationFrame(step);
    };
    this.#raf = requestAnimationFrame(step);
  }

  disconnectedCallback() {
    if (this.#loop) clearInterval(this.#loop);
    this.#loop = null;
    if (this.#grace) clearTimeout(this.#grace);
    this.#grace = null;
    cancelAnimationFrame(this.#raf);
    this.#unsub?.();
    this.#unsub = null;
    this.#cv?.removeEventListener('pointermove', this.#onMove);
    this.#cv?.removeEventListener('pointerleave', this.#onLeave);
  }

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
    const mix = src ? this.#mix : 0;
    // mulberry(21) reseeded per render; drives the waiting field and the
    // no-portrait fallback. Drawn for every cell whenever it is visible at all,
    // so the sequence stays in step across frames and the field doesn't crawl.
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
        if (mix >= 1) {
          lum =
            src!.L[
              Math.min(src!.gh - 1, Math.floor((iy * src!.gh) / rows)) * src!.gw +
                Math.min(src!.gw - 1, Math.floor((ix * src!.gw) / cols))
            ]!;
        } else {
          const dC = Math.hypot(px - W / 2, py - H * 0.4);
          const noise = Math.max(0, 1 - dC / (H * 0.55)) * 0.75 + rnd() * 0.2;
          if (!src) lum = noise;
          else {
            const real =
              src.L[
                Math.min(src.gh - 1, Math.floor((iy * src.gh) / rows)) * src.gw +
                  Math.min(src.gw - 1, Math.floor((ix * src.gw) / cols))
              ]!;
            lum = noise + (real - noise) * mix;
          }
        }
        let t = 0;
        if (m) {
          const d = Math.hypot(px - m[0], py - m[1]);
          t = Math.exp(-(d / 80) * (d / 80));
        }
        const nz = Math.sin(ix * 127.1 + iy * 311.7 + this.#frame * 0.93) * 43758.5453;
        const b = Math.max(
          0,
          Math.min(1, (lum + (nz - Math.floor(nz) - 0.5) * 0.16) * (0.72 + 0.42 * t))
        );
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
