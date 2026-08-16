// <as-views> — renders nothing. Reconnects on every view-transition arrival,
// so connectedCallback fires once per page view.
class AsViews extends HTMLElement {
  #tracked = false;

  connectedCallback() {
    if (this.#tracked) return;
    this.#tracked = true;
    const path = (this.dataset.slug || location.pathname).replace(/\/+$/, '');
    const slug = path === '' || path === '/home' ? '/home' : path;
    try {
      fetch(`/api/views${slug}`, { method: 'POST', keepalive: true }).catch(() => {});
    } catch {
      /* never let tracking break the page */
    }
  }
}

if (!customElements.get('as-views')) customElements.define('as-views', AsViews);
