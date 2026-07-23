/**
 * <as-views> — silent page-view tracker. Renders nothing.
 *
 * Mounted once per page in Base.astro; the custom element reconnects on
 * every view-transition arrival, so connectedCallback fires exactly once
 * per page view. Fire-and-forget POST to /api/views — failures are silent.
 */
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
