/**
 * <as-home-data> — invisible one-shot fetcher; fills index.astro's SSR
 * placeholders from /api/github. Lookups are scoped to this island's own <main>
 * because the outgoing and incoming page trees coexist during a view transition.
 * On failure the placeholders stay, but the hero spark is still settled.
 */

interface GitHubData {
  weeks?: number[] | null;
  followers?: number | null;
  repoCount?: number | null;
  stars?: number | null;
  devfolioStars?: number | null;
  devfolioForks?: number | null;
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
      this.#settleSpark(null);
    });
  }

  /**
   * Hand the hero spark its series, or `[]` for "answered, nothing to draw": an
   * absent attribute reads as in-flight, so every exit from #load must call this.
   */
  #settleSpark(weeks: number[] | null | undefined) {
    const usable = Array.isArray(weeks) && weeks.length > 1 ? weeks : [];
    (this.closest('main') ?? document)
      .querySelector('as-spark[data-kind="hero"]')
      ?.setAttribute('data-values', JSON.stringify(usable));
  }

  async #load() {
    const root: ParentNode = this.closest('main') ?? document;

    const res = await fetch('/api/github');
    if (!res.ok) {
      this.#settleSpark(null);
      return;
    }
    const data = (await res.json()) as GitHubData;
    if (data.disabled) {
      this.#settleSpark(null);
      return;
    }

    const set = (key: string, text: string) => {
      const el = root.querySelector<HTMLElement>(`[data-proof=${key}]`);
      if (el) el.textContent = text;
    };

    if (typeof data.devfolioStars === 'number') set('stars', `★${data.devfolioStars}`);
    if (typeof data.devfolioForks === 'number') set('forks', String(data.devfolioForks));
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
        // No public push in GitHub's event window. visibility, not display: the
        // chip is the strip's tallest item, so display:none shifts the row 1.5px.
        chip.style.visibility = 'hidden';
      }
    }

    this.#settleSpark(data.weeks);

    const sparks = data.sparks ?? {};
    root.querySelectorAll<HTMLElement>('as-spark[data-repo]').forEach((el) => {
      const series = sparks[el.dataset.repo ?? ''];
      if (Array.isArray(series) && series.length > 1) {
        el.setAttribute('data-values', JSON.stringify(series));
      }
      // no usable series for this repo → leave the placeholder as rendered
    });
  }
}

if (!customElements.get('as-home-data')) customElements.define('as-home-data', AsHomeData);
