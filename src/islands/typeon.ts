/**
 * <as-typeon> — hero h1 typing animation (frame 6a).
 * 75ms/char after a 450ms delay, 11 chars total: `Anil ` then `<em>Seervi</em>`.
 * SSR renders the full name (SEO/no-JS); JS clears and types unless
 * prefers-reduced-motion. The brass caret (sibling span) blinks throughout.
 */
class AsTypeon extends HTMLElement {
  #timers: ReturnType<typeof setTimeout | typeof setInterval>[] = [];

  connectedCallback() {
    const target = this.querySelector<HTMLElement>('[data-typeon]');
    if (!target) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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
          if (n >= total) clearInterval(iv);
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
