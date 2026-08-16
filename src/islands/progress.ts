/** <as-progress> — 2px reading-progress bar; re-inits after view-transition swaps. */
class AsProgress extends HTMLElement {
  #raf = 0;
  #fill: HTMLElement | null = null;
  #onScroll = () => {
    cancelAnimationFrame(this.#raf);
    this.#raf = requestAnimationFrame(() => this.#update());
  };

  connectedCallback() {
    this.innerHTML =
      '<div class="track" aria-hidden="true"></div><div class="fill" aria-hidden="true"></div>';
    this.#fill = this.querySelector<HTMLElement>('.fill');
    addEventListener('scroll', this.#onScroll, { passive: true });
    addEventListener('resize', this.#onScroll, { passive: true });
    this.#update();
  }

  disconnectedCallback() {
    removeEventListener('scroll', this.#onScroll);
    removeEventListener('resize', this.#onScroll);
    cancelAnimationFrame(this.#raf);
    this.#fill = null;
  }

  #update() {
    if (!this.#fill) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    // Nothing to scroll: a page shorter than the viewport makes no claim —
    // reporting 100% here would paint a full bar before any scrolling.
    if (max <= 0) {
      this.#fill.style.width = '0%';
      this.hidden = true;
      return;
    }
    this.hidden = false;
    const pct = Math.min(100, Math.max(0, (scrollY / max) * 100));
    this.#fill.style.width = pct + '%';
  }
}

if (!customElements.get('as-progress')) customElements.define('as-progress', AsProgress);
