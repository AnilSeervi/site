/**
 * <as-typeon> — hero h1 typing animation (frame 6a).
 * 75ms/char after a 450ms delay, 11 chars total: `Anil ` then `<em>Seervi</em>`.
 * SSR renders the full name (SEO/no-JS); JS clears and types unless
 * prefers-reduced-motion. The brass caret (sibling span) blinks throughout.
 *
 * Announces completion twice over, because the sparkline below waits for it
 * (design_handoff_loader — the caption only appears once the name is done):
 * `data-typed` for anyone who mounts late or misses the event, and a bubbling
 * `as-hero:typed` for anyone already listening. The event is deferred a
 * microtask so the synchronous bail-outs below still reach a listener that
 * hasn't been attached yet — <as-spark> upgrades after this element.
 */
class AsTypeon extends HTMLElement {
  #timers: ReturnType<typeof setTimeout | typeof setInterval>[] = [];

  #announce() {
    this.dataset.typed = '';
    queueMicrotask(() => {
      if (this.isConnected) this.dispatchEvent(new CustomEvent('as-hero:typed', { bubbles: true }));
    });
  }

  connectedCallback() {
    const target = this.querySelector<HTMLElement>('[data-typeon]');
    if (!target) {
      this.#announce();
      return;
    }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#announce();
      return;
    }

    const A = 'Anil ';
    const B = 'Seervi';
    const total = A.length + B.length;
    const em = document.createElement('em');
    let n = 0;

    const paint = () => {
      target.textContent = A.slice(0, Math.min(n, A.length));
      em.textContent = B.slice(0, Math.max(0, n - A.length));
      target.appendChild(em);
    };

    paint();
    this.#timers.push(
      setTimeout(() => {
        const iv = setInterval(() => {
          n++;
          paint();
          if (n >= total) {
            clearInterval(iv);
            this.#announce();
          }
        }, 75);
        this.#timers.push(iv);
      }, 450)
    );
  }

  disconnectedCallback() {
    this.#timers.forEach((t) => {
      clearTimeout(t as ReturnType<typeof setTimeout>);
      clearInterval(t as ReturnType<typeof setInterval>);
    });
    this.#timers = [];
  }
}

if (!customElements.get('as-typeon')) customElements.define('as-typeon', AsTypeon);
