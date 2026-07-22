/**
 * <as-progress> — 2px reading-progress line pinned to the viewport top,
 * plus a live `NN% read` readout in the article meta line (frame 6f).
 * Custom element: re-initialises automatically after view-transition swaps.
 */
class AsProgress extends HTMLElement {
  #raf = 0;
  #onScroll = () => {
    cancelAnimationFrame(this.#raf);
    this.#raf = requestAnimationFrame(() => this.#update());
  };

  connectedCallback() {
    this.innerHTML =
      '<div class="track" aria-hidden="true"></div><div class="fill" aria-hidden="true"></div>';
    addEventListener('scroll', this.#onScroll, { passive: true });
    addEventListener('resize', this.#onScroll, { passive: true });
    this.#update();
  }

  disconnectedCallback() {
    removeEventListener('scroll', this.#onScroll);
    removeEventListener('resize', this.#onScroll);
    cancelAnimationFrame(this.#raf);
  }

  #update() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const pct = max > 0 ? Math.min(100, Math.max(0, (scrollY / max) * 100)) : 100;
    const fill = this.querySelector<HTMLElement>('.fill');
    if (fill) fill.style.width = pct + '%';
    const readout = document.querySelector('[data-read-pct]');
    if (readout) readout.textContent = Math.round(pct) + '% read';
  }
}

if (!customElements.get('as-progress')) customElements.define('as-progress', AsProgress);
