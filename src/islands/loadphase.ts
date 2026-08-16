/** Skeleton-timing controller: drives an island's `data-load` idle → waiting → arrived. */
// Skeleton is delayed 180ms (fast fetch shows none) then held ≥400ms so it can't flash.
// Callers must invoke cancel() from disconnectedCallback or the timers leak.

const SKELETON_DELAY = 180;
const MIN_SHOW = 400;

export class LoadPhase {
  #el: HTMLElement;
  #showTimer: ReturnType<typeof setTimeout> | null = null;
  #settleTimer: ReturnType<typeof setTimeout> | null = null;
  #shownAt = 0;
  #done = false;

  constructor(el: HTMLElement) {
    this.#el = el;
  }

  /** begin the wait — the skeleton only appears once the 180ms gate fires */
  start() {
    this.#el.dataset.load = 'idle';
    this.#showTimer = setTimeout(() => {
      this.#showTimer = null;
      this.#shownAt = performance.now();
      this.#el.dataset.load = 'waiting';
    }, SKELETON_DELAY);
  }

  /** data landed — run the fill/reveal, respecting the min-show gate */
  settle(apply: () => void) {
    if (this.#done) return;
    this.#done = true;
    const reveal = () => {
      apply();
      this.#el.dataset.load = 'arrived';
    };
    if (this.#showTimer) {
      // timer still pending → skeleton never shown, so no min-show debt
      clearTimeout(this.#showTimer);
      this.#showTimer = null;
      reveal();
      return;
    }
    const held = performance.now() - this.#shownAt;
    const wait = Math.max(0, MIN_SHOW - held);
    if (wait === 0) reveal();
    else this.#settleTimer = setTimeout(reveal, wait);
  }

  /** the feed didn't answer — let the caller hide/degrade, no min-show wait */
  fail(apply: () => void) {
    if (this.#done) return;
    this.#done = true;
    if (this.#showTimer) {
      clearTimeout(this.#showTimer);
      this.#showTimer = null;
    }
    apply();
    this.#el.dataset.load = 'arrived';
  }

  cancel() {
    if (this.#showTimer) clearTimeout(this.#showTimer);
    if (this.#settleTimer) clearTimeout(this.#settleTimer);
    this.#showTimer = null;
    this.#settleTimer = null;
  }
}
