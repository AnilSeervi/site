/**
 * <as-globe> — lazy COBE globe, brass marker on Bengaluru; markerColor resolves
 * --as-accent at init. IntersectionObserver defers createGlobe until visible;
 * disconnect destroys the globe, cancels the rAF and drops the observer.
 * cobe v2 has no onRender hook (it renders once per update() call), so an rAF
 * loop drives update({ phi }) at PHI_STEP per frame.
 */
import createGlobe from 'cobe';
import type { Globe } from 'cobe';
import { isMobile, onBreakpointChange } from './breakpoint';

const BENGALURU: [number, number] = [12.9716, 77.5946];
const PHI_START = 4.9;
const PHI_STEP = 0.0032;
/** reduced motion: fixed-phi redraws (~0.5s) so the async map texture paints */
const SETTLE_FRAMES = 30;

/** --as-accent hex → [r,g,b]/255, #D9A54A fallback */
function accentRgb(): [number, number, number] {
  let hex = getComputedStyle(document.documentElement)
    .getPropertyValue('--as-accent')
    .trim()
    .replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) hex = 'd9a54a';
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number
  ];
}

class AsGlobe extends HTMLElement {
  #globe: Globe | null = null;
  #io: IntersectionObserver | null = null;
  #raf = 0;
  #unsub: (() => void) | null = null;

  /** CSS box (px) — 280 desktop / 220 mobile; backing store is 2× */
  #cssSize() {
    return isMobile() ? 220 : 280;
  }

  /** size the canvas box for the current breakpoint (backing is set by cobe) */
  #applyCanvasSize(cv: HTMLCanvasElement) {
    const s = this.#cssSize();
    cv.style.width = `${s}px`;
    cv.style.height = `${s}px`;
  }

  connectedCallback() {
    const cv = this.querySelector('canvas');
    if (!cv) return;
    this.#applyCanvasSize(cv);
    this.#io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      this.#io?.disconnect();
      this.#io = null;
      this.#init(cv);
    });
    this.#io.observe(cv);
    // rebuild at the new size when the viewport crosses the breakpoint
    this.#unsub = onBreakpointChange(() => {
      this.#applyCanvasSize(cv);
      if (this.#globe) {
        cancelAnimationFrame(this.#raf);
        this.#raf = 0;
        this.#globe.destroy();
        this.#globe = null;
        this.#init(cv);
      }
    });
  }

  disconnectedCallback() {
    this.#io?.disconnect();
    this.#io = null;
    this.#unsub?.();
    this.#unsub = null;
    cancelAnimationFrame(this.#raf);
    this.#raf = 0;
    this.#globe?.destroy();
    this.#globe = null;
  }

  #init(cv: HTMLCanvasElement) {
    if (this.#globe || !this.isConnected) return;
    const backing = this.#cssSize() * 2;
    let phi = PHI_START;
    let globe: Globe;
    try {
      globe = createGlobe(cv, {
        devicePixelRatio: 2,
        width: backing,
        height: backing,
        phi,
        theta: 0.22,
        dark: 1,
        diffuse: 1.15,
        mapSamples: 16000,
        mapBrightness: 4.5,
        baseColor: [0.24, 0.22, 0.19],
        markerColor: accentRgb(),
        glowColor: [0.07, 0.06, 0.055],
        // cobe v2: default markerElevation floats the dot off the sphere near the
        // limb, and marker size renders ~2× the v0.6 scale (0.045 here ≈ 0.09 there)
        markerElevation: 0.01,
        markers: [{ location: BENGALURU, size: 0.045 }]
      });
    } catch {
      // WebGL unsupported → hide the box; the caption lives outside this element
      this.style.display = 'none';
      return;
    }
    this.#globe = globe;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let settle = SETTLE_FRAMES;
    const spin = () => {
      if (reduced && --settle < 0) {
        this.#raf = 0;
        return;
      }
      if (!reduced) phi += PHI_STEP;
      globe.update({ phi });
      this.#raf = requestAnimationFrame(spin);
    };
    this.#raf = requestAnimationFrame(spin);
  }
}

if (!customElements.get('as-globe')) customElements.define('as-globe', AsGlobe);
