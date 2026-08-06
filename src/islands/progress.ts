/**
 * <as-progress> — 2px reading-progress line pinned to the viewport top
 * (frame 6f). Custom element: re-initialises automatically after
 * view-transition swaps.
 *
 * There used to be a `NN% read` readout in the article meta line as well. It
 * lived in normal page flow, so it scrolled out of view almost immediately —
 * readable only while it still said 0%, gone by the time the number meant
 * anything. The fixed bar carries the same information for the whole article,
 * so the readout was dropped rather than made sticky: two indicators saying one
 * thing is one too many.
 */
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
    // Nothing to scroll — an article shorter than the viewport is neither 0%
    // nor 100% read, so the bar makes no claim at all. It used to report 100%
    // here, painting a full brass line on a page the reader hadn't moved on.
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
