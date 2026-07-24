/**
 * <as-clock> — IST clock + time-aware greeting (frames 6a/6d).
 * Always the author's IST (UTC+5:30), never the visitor's zone. Ticks every 30s.
 * Buckets: <5 up too late · <12 good morning · <17 good afternoon ·
 * <22 good evening · else winding down.
 *
 * data-format="greeting" → `18:42 ist · good evening, from bengaluru`
 *   (mobile 7a shortens this to just the greeting — `good evening`)
 * data-format="time"     → `18:42 ist · bengaluru`
 */
import { onBreakpointChange } from './breakpoint';

class AsClock extends HTMLElement {
  #iv: ReturnType<typeof setInterval> | null = null;
  #unsub: (() => void) | null = null;

  connectedCallback() {
    this.#tick();
    this.#iv = setInterval(() => this.#tick(), 30_000);
    // the greeting collapses to just the phrase on mobile — re-render on cross
    this.#unsub = onBreakpointChange(() => this.#tick());
  }

  disconnectedCallback() {
    if (this.#iv) clearInterval(this.#iv);
    this.#iv = null;
    this.#unsub?.();
    this.#unsub = null;
  }

  #tick() {
    const now = new Date();
    const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60_000);
    const hh = String(ist.getHours()).padStart(2, '0');
    const mm = String(ist.getMinutes()).padStart(2, '0');
    const h = ist.getHours();
    const greet =
      h < 5 ? 'up too late' : h < 12 ? 'good morning' : h < 17 ? 'good afternoon' : h < 22 ? 'good evening' : 'winding down';
    if (this.dataset.format === 'time') {
      this.textContent = `${hh}:${mm} ist · bengaluru`;
    } else if (matchMedia('(max-width: 768px)').matches) {
      // 7a whoami: short greeting only
      this.textContent = greet;
    } else {
      this.textContent = `${hh}:${mm} ist · ${greet}, from bengaluru`;
    }
  }
}

if (!customElements.get('as-clock')) customElements.define('as-clock', AsClock);
