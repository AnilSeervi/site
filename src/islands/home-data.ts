/**
 * <as-home-data> — invisible one-shot fetcher for the home page.
 *
 * Mounted near the top of index.astro (renders nothing); on connect it
 * fetches /api/github and fills the SSR placeholders in place:
 *   - proof strip: [data-proof=stars|repos|followers|pushed]
 *   - hero sparkline: data-values on <as-spark data-kind="hero">
 *   - work-row sparklines: data-values on each <as-spark data-repo> whose
 *     repo has a series in `sparks` (absent → the synthetic series stays)
 *
 * Query scope: all lookups go through `this.closest('main') ?? document`.
 * During a view transition the outgoing and incoming page trees briefly
 * coexist, so scoping to the island's own <main> guarantees we only ever
 * write into the page this island was rendered with. The element reconnects
 * fresh on every view-transition arrival, so each home view refetches
 * (cheap — the endpoint is CDN-cached via s-maxage).
 *
 * Degradation: fetch failure or {disabled:true} → do nothing; the SSR
 * placeholders remain. Null fields are skipped individually, except
 * lastPush: null, which hides the whole `pushed …` chip (pulse included)
 * because "pushed <nothing>" would be worse than absence.
 */

interface GitHubData {
  weeks?: number[] | null;
  followers?: number | null;
  repoCount?: number | null;
  stars?: number | null;
  devfolioStars?: number | null;
  lastPush?: { repo: string; commits: number; ago: string } | null;
  sparks?: Record<string, number[]>;
  disabled?: boolean;
}

class AsHomeData extends HTMLElement {
  #ran = false;

  connectedCallback() {
    if (this.#ran) return; // moved/re-adopted nodes shouldn't refetch
    this.#ran = true;
    this.#load().catch(() => {
      /* leave the SSR placeholders — never break the page */
    });
  }

  async #load() {
    const root: ParentNode = this.closest('main') ?? document;

    const res = await fetch('/api/github');
    if (!res.ok) return;
    const data = (await res.json()) as GitHubData;
    if (data.disabled) return;

    const set = (key: string, text: string) => {
      const el = root.querySelector<HTMLElement>(`[data-proof=${key}]`);
      if (el) el.textContent = text;
    };

    if (typeof data.devfolioStars === 'number') set('stars', `★${data.devfolioStars}`);
    if (typeof data.repoCount === 'number') set('repos', String(data.repoCount));
    if (typeof data.followers === 'number') set('followers', String(data.followers));
    // 'pull shark ×3' ([data-proof=shark]) stays static — no API for achievements.

    const pushed = root.querySelector<HTMLElement>('[data-proof=pushed]');
    const chip = pushed?.parentElement; // the .pushed wrapper (green pulse + text)
    if (pushed && chip) {
      if (data.lastPush?.ago) {
        pushed.textContent = `pushed ${data.lastPush.ago}`;
        chip.style.removeProperty('visibility');
      } else {
        // No public push in GitHub's event window — hide text and pulse.
        // visibility (not display): the chip is the tallest item in the
        // baseline-aligned strip, so display:none would shrink the row 1.5px
        // and shift everything below it.
        chip.style.visibility = 'hidden';
      }
    }

    if (Array.isArray(data.weeks) && data.weeks.length > 1) {
      root
        .querySelector('as-spark[data-kind="hero"]')
        ?.setAttribute('data-values', JSON.stringify(data.weeks));
    }

    const sparks = data.sparks ?? {};
    root.querySelectorAll<HTMLElement>('as-spark[data-repo]').forEach((el) => {
      const series = sparks[el.dataset.repo ?? ''];
      if (Array.isArray(series) && series.length > 1) {
        el.setAttribute('data-values', JSON.stringify(series));
      }
      // absent/failed repo stats → keep the synthetic series (by design)
    });
  }
}

if (!customElements.get('as-home-data')) customElements.define('as-home-data', AsHomeData);
