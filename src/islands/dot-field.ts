/**
 * <as-dot-field> — cursor-reactive dot canvas, writing page only (frame 6c).
 * Replaces the CSS dot grid: 26px pitch (offset 13px), dot r=1.1px, base
 * α .045; within reach of the pointer α rises to .345 with gaussian falloff
 * σ=140px, and dots tint brass when the falloff g > .3. rAF-throttled.
 * Port of the prototype's initDots/drawDots.
 */
class AsDotField extends HTMLElement {
  #cv: HTMLCanvasElement | null = null;
  #w = 0;
  #h = 0;
  #queued = false;
  #mouse: [number, number] | null = null;

  #onMove = (e: PointerEvent) => {
    this.#mouse = [e.clientX, e.clientY];
    this.#queue();
  };

  #onLeave = () => {
    this.#mouse = null;
    this.#queue();
  };

  #onResize = () => {
    this.#size();
    this.#draw();
  };

  connectedCallback() {
    this.#cv = this.querySelector('canvas');
    if (!this.#cv) return;
    this.#size();
    this.#draw();
    window.addEventListener('pointermove', this.#onMove, { passive: true });
    // pointerleave on the root only fires when the pointer exits the viewport —
    // window 'pointerout' would also fire on every element-boundary crossing
    document.documentElement.addEventListener('pointerleave', this.#onLeave);
    window.addEventListener('resize', this.#onResize);
  }

  disconnectedCallback() {
    window.removeEventListener('pointermove', this.#onMove);
    document.documentElement.removeEventListener('pointerleave', this.#onLeave);
    window.removeEventListener('resize', this.#onResize);
  }

  #size() {
    const cv = this.#cv!;
    this.#w = window.innerWidth;
    this.#h = window.innerHeight;
    cv.width = this.#w * 2;
    cv.height = this.#h * 2;
    cv.getContext('2d')!.setTransform(2, 0, 0, 2, 0, 0);
  }

  #queue() {
    if (this.#queued) return;
    this.#queued = true;
    requestAnimationFrame(() => {
      this.#queued = false;
      this.#draw();
    });
  }

  #draw() {
    const cv = this.#cv;
    if (!cv || !this.#w) return;
    const x = cv.getContext('2d')!;
    x.clearRect(0, 0, this.#w, this.#h);
    const m = this.#mouse;
    for (let px = 13; px < this.#w; px += 26) {
      for (let py = 13; py < this.#h; py += 26) {
        let a = 0.045;
        let brass = false;
        if (m) {
          const d = Math.hypot(px - m[0], py - m[1]);
          const g = Math.exp(-(d / 140) * (d / 140));
          a = 0.045 + 0.3 * g;
          brass = g > 0.3;
        }
        x.fillStyle = brass ? `rgba(217,165,74,${a.toFixed(3)})` : `rgba(237,230,218,${a.toFixed(3)})`;
        x.beginPath();
        x.arc(px, py, 1.1, 0, 6.284);
        x.fill();
      }
    }
  }
}

if (!customElements.get('as-dot-field')) customElements.define('as-dot-field', AsDotField);
