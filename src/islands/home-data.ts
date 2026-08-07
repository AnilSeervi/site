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
 * Degradation: fetch failure or {disabled:true} → the SSR placeholders remain,
 * with one exception — the hero sparkline is always told the fetch is over, so
 * its boot loader can drop the caption instead of blinking a fetch caret at a
 * request that will never answer (see #settleSpark and design_handoff_loader).
 * Null fields are skipped individually, except lastPush: null, which hides the
 * whole `pushed …` chip (pulse included) because "pushed <nothing>" would be
 * worse than absence.
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
   * Hand the hero sparkline its series, or `[]` for "asked, nothing to draw".
   * The distinction the loader needs is *answered* vs *still in flight*, and an
   * absent attribute is the latter — so every exit from #load comes through here.
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
    // /work quotes DevFolio's forks beside its stars. Both were hardcoded and
    // both had drifted — in opposite directions — so the page now asks GitHub.
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
        // No public push in GitHub's event window — hide text and pulse.
        // visibility (not display): the chip is the tallest item in the
        // baseline-aligned strip, so display:none would shrink the row 1.5px
        // and shift everything below it.
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
      // absent/failed repo stats → keep the synthetic series (by design)
    });
  }
}

if (!customElements.get('as-home-data')) customElements.define('as-home-data', AsHomeData);
