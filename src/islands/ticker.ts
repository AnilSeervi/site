/**
 * <as-ticker> — home live ticker (frame 6a, `03 · LIVE`).
 * Cycles label/value pairs every 3.4s with a .26s opacity dip (the spans carry
 * `transition: opacity .25s ease`). Items come from the data-items JSON
 * attribute — Phase 5 replaces the placeholders with live feed values and
 * skips items whose feed is stale or missing.
 */
class AsTicker extends HTMLElement {
  #iv: ReturnType<typeof setInterval> | null = null;
  #dip: ReturnType<typeof setTimeout> | null = null;
  #idx = 0;

  connectedCallback() {
    let items: [string, string][] = [];
    try {
      items = JSON.parse(this.dataset.items ?? '[]');
    } catch {
      /* leave empty */
    }
    if (items.length < 2) return; // nothing to rotate

    const label = this.querySelector<HTMLElement>('[data-ticker-label]');
    const value = this.querySelector<HTMLElement>('[data-ticker-value]');
    if (!label || !value) return;

    this.#iv = setInterval(() => {
      label.style.opacity = '0';
      value.style.opacity = '0';
      this.#dip = setTimeout(() => {
        this.#idx = (this.#idx + 1) % items.length;
        const [l, v] = items[this.#idx]!;
        label.textContent = l;
        value.textContent = v;
        label.style.opacity = '1';
        value.style.opacity = '1';
      }, 260);
    }, 3400);
  }

  disconnectedCallback() {
    if (this.#iv) clearInterval(this.#iv);
    if (this.#dip) clearTimeout(this.#dip);
    this.#iv = null;
    this.#dip = null;
  }
}

if (!customElements.get('as-ticker')) customElements.define('as-ticker', AsTicker);
