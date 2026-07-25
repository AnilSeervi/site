/**
 * LoadPhase — the shared skeleton-timing controller for the live feeds
 * (design_handoff_loading_states, "8 · waiting").
 *
 * Drives an island's `data-load` attribute through idle → waiting → arrived,
 * enforcing the two timing rules that keep skeletons from reading as glitches:
 *
 *   - Under 180ms → no skeleton. The skeleton is delayed by 180ms; if data
 *     resolves first the value shows straight away and `waiting` never happens.
 *   - Minimum show 400ms. Once the skeleton is visible it is held ≥400ms — a
 *     sub-frame flash reads as a stutter.
 *
 * Usage: `const phase = new LoadPhase(el); phase.start();` on connect, then
 * `phase.settle(() => …fill + reveal…)` when the fetch resolves (or `.fail()`
 * to hide/degrade). The DOM write in `settle` runs behind the min-show gate,
 * and the CSS `[data-load]` rules fade the values in.
 *
 * Uses performance.now() + setTimeout; both are torn down by `cancel()` from
 * the island's disconnectedCallback so a view-transition swap leaks nothing.
 */

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

  /** begin the wait — reserved space only until the 180ms skeleton gate fires */
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
      // skeleton never shown (resolved < 180ms) → straight to the value
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
