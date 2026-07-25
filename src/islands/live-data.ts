/**
 * <as-live-data> — the single data-plumbing island for ~/live (frame 6d).
 *
 * On connect it fetches /api/spotify, /api/github, /api/mal and /api/weather
 * in parallel (Promise.allSettled) and swaps the SSR placeholder copy (the
 * design's own values — the page looks right immediately) for real values.
 *
 * Fill hooks — value elements carry data-live="…":
 *   weather · now · last · watching · shelf · reading · contrib-total
 * Styled fragments inside a value (italic serif title, mono ctx suffix,
 * accent mean) are pre-rendered children tagged data-part="title|tail|ctx|
 * head|mean" so Astro's scoped classes survive the swap — the island only
 * writes textContent, never fresh elements.
 *
 * GitHub days grid (52×7) is handed to <as-contrib> by writing its
 * data-values attribute as JSON; as-contrib observes the attribute and
 * repaints (same contract as <as-spark>).
 *
 * Equalizer: the bars' animation runs only while spotify.isPlaying — the
 * island toggles the `playing` class on [data-eq], and the page CSS gates
 * animation-play-state on it.
 *
 * Degradation (design rule: drop missing rows, no zeros): a row whose feed
 * came back null / {disabled:true} / unreachable is hidden entirely; a
 * section whose rows all vanished is hidden with them.
 */

import { LoadPhase } from './loadphase';

interface SpotifyNow {
  title: string;
  artist: string;
  url: string;
  context: string | null;
}
interface SpotifyLast {
  title: string;
  artist: string;
  url: string;
  playedAt: string;
}
interface SpotifyRes {
  disabled?: boolean;
  isPlaying?: boolean;
  now?: SpotifyNow | null;
  last?: SpotifyLast | null;
}
interface GithubRes {
  disabled?: boolean;
  total?: number | null;
  days?: number[][] | null;
}
interface MalRes {
  disabled?: boolean;
  watching?: { title: string; ep: number; epTotal: number | null; updatedAt: string } | null;
  shelf?: { anime: number; episodes: number; days: number; mean: number } | null;
  reading?: { title: string } | null;
}
interface WeatherRes {
  disabled?: boolean;
  temp?: number | null;
  phrase?: string | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return (await res.json()) as T;
}

/** unwrap a settled fetch; rejected or {disabled:true} → null (feed is dead) */
function alive<T extends { disabled?: boolean }>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' && !r.value.disabled ? r.value : null;
}

class AsLiveData extends HTMLElement {
  #phase = new LoadPhase(this);

  connectedCallback() {
    this.#phase.start();
    void this.#load();
  }

  disconnectedCallback() {
    this.#phase.cancel();
  }

  async #load() {
    const [spotify, github, mal, weather] = await Promise.allSettled([
      getJson<SpotifyRes>('/api/spotify'),
      getJson<GithubRes>('/api/github'),
      getJson<MalRes>('/api/mal'),
      getJson<WeatherRes>('/api/weather')
    ]);
    // view transition may have swapped this subtree away mid-flight
    if (!this.isConnected) return;

    // hold the skeletons until min-show, then fill + fade the values in
    this.#phase.settle(() => {
      this.#applySpotify(alive(spotify));
      this.#applyGithub(alive(github));
      this.#applyMal(alive(mal));
      this.#applyWeather(alive(weather));
      // the LISTENING phase note flips to 'live' once the section resolves
      const note = this.querySelector<HTMLElement>('[data-live="phase-note"]');
      if (note) note.textContent = 'live';
      this.#pruneSections();
    });
  }

  #hideRow(name: string) {
    // inline display:none, not [hidden] — the rows' display:grid class would
    // out-cascade the UA hidden rule
    const row = this.querySelector<HTMLElement>(`[data-row="${name}"]`);
    if (row) row.style.display = 'none';
  }

  #part(live: string, part: string): HTMLElement | null {
    return this.querySelector<HTMLElement>(`[data-live="${live}"] [data-part="${part}"]`);
  }

  /** fill the pre-rendered title/tail(/ctx) fragments of a value element */
  #setParts(live: string, title: string, tail: string, ctx?: string | null) {
    const t = this.#part(live, 'title');
    if (t) t.textContent = title;
    const rest = this.#part(live, 'tail');
    if (rest) rest.textContent = tail;
    const c = this.#part(live, 'ctx');
    if (c) c.textContent = ctx ?? '';
  }

  #applyWeather(w: WeatherRes | null) {
    if (!w || w.temp == null || !w.phrase) return this.#hideRow('weather');
    const el = this.querySelector<HTMLElement>('[data-live="weather"]');
    if (el) el.textContent = `${w.temp}° · ${w.phrase}`;
  }

  #applySpotify(s: SpotifyRes | null) {
    // bars animate only while a track is actually playing
    const eq = this.querySelector('[data-eq]');
    if (eq) eq.classList.toggle('playing', s?.isPlaying === true);

    if (s?.now) {
      this.#setParts('now', s.now.title, ` — ${s.now.artist}${s.now.context ? ' · ' : ''}`, s.now.context);
    } else {
      this.#hideRow('now');
    }
    if (s?.last) this.#setParts('last', s.last.title, ` — ${s.last.artist}`);
    else this.#hideRow('last');
  }

  #applyGithub(g: GithubRes | null) {
    const wrap = this.querySelector<HTMLElement>('[data-contrib]');
    const el = this.querySelector<HTMLElement>('[data-live="contrib-total"]');

    // didn't answer → the empty dot-grid stays, the caption says why (8b).
    // (the contribution grid is never faked — no zeros, no synthetic field.)
    if (!g || !Array.isArray(g.days)) {
      if (el) el.textContent = 'github is quiet — try later';
      return;
    }

    const days = g.days;
    const contrib = this.querySelector('as-contrib');
    if (contrib) contrib.setAttribute('data-values', JSON.stringify(days));
    // reveal the real canvas (fade), drop the dot-field placeholder
    wrap?.classList.add('arrived');

    const total =
      typeof g.total === 'number' ? g.total : days.flat().reduce((a, b) => a + (b || 0), 0);
    if (el) {
      const base = `${total.toLocaleString('en-US')} contributions in the last year`;
      // the "brass runs hotter" clause is desktop-only (7d trims it so the
      // short total + "23 weeks shown" fit one row)
      el.textContent = matchMedia('(max-width: 768px)').matches
        ? base
        : `${base} — brass runs hotter where the weeks did`;
    }
  }

  #applyMal(m: MalRes | null) {
    if (m?.reading?.title) {
      // ' — the long haul' is flavor copy tied to Berserk; other titles render bare
      const tail = m.reading.title === 'Berserk' ? ' — the long haul' : '';
      this.#setParts('reading', m.reading.title, tail);
    } else {
      this.#hideRow('reading');
    }

    if (m?.watching) {
      const { title, ep, epTotal } = m.watching;
      // frame 6d italicizes only the base title — a trailing season/part
      // suffix stays upright and lowercase ('Sousou no Frieren 2nd season')
      const split = title.match(/^(.*?)\s+((?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|part\s+\d+)\b.*)$/i);
      const base = split ? split[1]! : title;
      const suffix = split ? ` ${split[2]!.toLowerCase()}` : '';
      const eps = epTotal == null ? ` — episode ${ep}` : ` — episode ${ep} of ${epTotal}`;
      this.#setParts('watching', base, `${suffix}${eps}`);
    } else {
      this.#hideRow('watching');
    }

    if (m?.shelf) {
      const { anime, episodes, days, mean } = m.shelf;
      const head = this.#part('shelf', 'head');
      if (head) {
        head.textContent = `${anime.toLocaleString('en-US')} anime · ${episodes.toLocaleString('en-US')} episodes · ${Math.round(days * 10) / 10} days · mean `;
      }
      const meanEl = this.#part('shelf', 'mean');
      if (meanEl) meanEl.textContent = mean.toFixed(2);
    } else {
      this.#hideRow('shelf');
    }
  }

  /** a section whose data rows all vanished keeps only its head — drop it whole */
  #pruneSections() {
    this.querySelectorAll<HTMLElement>('[data-section]').forEach((sec) => {
      if (sec.style.display === 'none') return;
      const rows = [...sec.querySelectorAll<HTMLElement>('[data-row]')];
      if (rows.length > 0 && rows.every((r) => r.style.display === 'none')) {
        sec.style.display = 'none';
      }
    });
  }
}

if (!customElements.get('as-live-data')) customElements.define('as-live-data', AsLiveData);
