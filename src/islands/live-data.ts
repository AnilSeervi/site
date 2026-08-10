/**
 * <as-live-data> — the single data-plumbing island for ~/live (frame 6d).
 *
 * On connect it fetches /api/spotify, /api/github, /api/mal and /api/weather
 * in parallel (Promise.allSettled) and swaps the SSR placeholder copy (the
 * design's own values — the page looks right immediately) for real values.
 *
 * Fill hooks — value elements carry data-live="…":
 *   weather · now · last · watching · manga · shelf · contrib-total
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
import type { ContribCell } from './contrib';

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
  /** upstream failed (token revoked, API down) — distinct from nothing playing */
  error?: boolean;
  isPlaying?: boolean;
  now?: SpotifyNow | null;
  last?: SpotifyLast | null;
}
interface GithubRes {
  disabled?: boolean;
  total?: number | null;
  days?: number[][] | null;
  /** 52 weekly totals — the readout's "N that week" */
  weeks?: number[] | null;
  /** ISO date of days[0][0]; <as-contrib> derives every cell's date from it */
  from?: string | null;
}
interface MalRes {
  disabled?: boolean;
  watching?: { title: string; ep: number; epTotal: number | null; updatedAt: string } | null;
  manga?: { title: string; ch: number; chTotal: number | null; vol: number } | null;
  shelf?: { anime: number; episodes: number; days: number; mean: number } | null;
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

// ---- contribution-grid hover readout ---------------------------------------

const WEEKDAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTHS_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
] as const;

/** 'thu jul 30' from an ISO date (the grid's dates are plain calendar days) */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const at = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS_SHORT[at.getUTCDay()]} ${MONTHS_SHORT[m - 1]} ${d}`;
}

/**
 * The unbroken run of contributing days containing `index`, as [position, length]
 * — `day 4 of a 6-day streak`. Walks both directions: a streak the hovered day
 * sits in the middle of is still a streak, and stopping at the cursor would
 * report it as shorter than it is.
 *
 * Runs off the flattened grid, where index = week * 7 + weekday is chronological
 * because the calendar is contiguous and Sunday-aligned.
 */
function runAt(flat: number[], index: number): [number, number] {
  if ((flat[index] ?? 0) <= 0) return [0, 0];
  let start = index;
  while (start > 0 && (flat[start - 1] ?? 0) > 0) start--;
  let end = index;
  // stop at the last day that actually happened — the padded tail is zeros
  while (end + 1 < flat.length && (flat[end + 1] ?? 0) > 0) end++;
  return [index - start + 1, end - start + 1];
}

/**
 * The two halves of a readout line: the figures, and the dim clause after them.
 * Everything here is computed from the grid — GitHub's calendar carries no repo
 * names or messages per day, so context is derived rather than fetched.
 */
function contribLine(
  cell: ContribCell,
  ctx: {
    weekTotal: number;
    best: number;
    bestWeek: number;
    /** whether the peak is held by a single day / week — see below */
    bestIsUnique: boolean;
    bestWeekIsUnique: boolean;
    run: [number, number];
  }
): { main: string; tail: string } {
  const head = shortDate(cell.date!);
  if (cell.count <= 0) return { main: head, tail: ' — quiet' };

  const n = cell.count;
  let main = `${head} — ${n} contribution${n === 1 ? '' : 's'}`;
  // only when the week holds more than this one day; `1 contribution · 1 that
  // week` spends a clause to repeat itself
  if (ctx.weekTotal > n) main += ` · ${ctx.weekTotal} that week`;

  // One closing clause, most-interesting first — a day can qualify for several
  // at once and stacking them turns a glance into a paragraph. Superlatives are
  // claimed only when the peak is unique: on a quiet year several days tie the
  // maximum, and calling each of them "busiest" is just wrong.
  const [pos, len] = ctx.run;
  let tail = '';
  if (ctx.bestIsUnique && n === ctx.best) tail = ' — busiest day of the year';
  else if (ctx.bestWeekIsUnique && ctx.weekTotal === ctx.bestWeek)
    tail = ' — busiest week of the year';
  else if (len >= 3) tail = ` — day ${pos} of a ${len}-day streak`;
  return { main, tail };
}

class AsLiveData extends HTMLElement {
  #phase = new LoadPhase(this);
  /** drives the LISTENING head note: 'live' only if spotify actually answered */
  #spotifyOk = true;

  connectedCallback() {
    this.#phase.start();
    void this.#load();
    // bound once here rather than when the feed lands, so a second #applyGithub
    // can never stack a duplicate pair; the handlers no-op until #grid is set
    const contrib = this.querySelector('as-contrib');
    contrib?.addEventListener('contrib:day', this.#onContribDay);
    contrib?.addEventListener('contrib:leave', this.#onContribLeave);
  }

  disconnectedCallback() {
    const contrib = this.querySelector('as-contrib');
    contrib?.removeEventListener('contrib:day', this.#onContribDay);
    contrib?.removeEventListener('contrib:leave', this.#onContribLeave);
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
      // the LISTENING phase note flips to 'live' once the section resolves —
      // but only if it resolved; 'live' over a dead feed is a lie
      const note = this.querySelector<HTMLElement>('[data-live="phase-note"]');
      if (note) note.textContent = this.#spotifyOk ? 'live' : 'unavailable';
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

    // A failed fetch and a quiet evening arrive as the same empty payload, so
    // the API flags the difference and the section says which it is. Silence
    // isn't neutral here: #pruneSections deletes a section whose rows all
    // vanish, so an unreported failure removes LISTENING from the page
    // entirely — which is how a revoked refresh token went unnoticed.
    // `disabled` is deliberate config, not failure: that one still prunes.
    this.#spotifyOk = !!s && !s.error;
    if (!this.#spotifyOk) {
      this.#setParts('now', '', "spotify didn't answer — try later");
      this.#hideRow('last');
      return;
    }

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
    if (contrib) {
      contrib.setAttribute('data-values', JSON.stringify(days));
      // the calendar anchor: read lazily by the hit-test, so NOT observed —
      // setting it must not trigger a second repaint
      if (g.from) contrib.setAttribute('data-from', g.from);
    }
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
    // stats the hover readout derives its context from
    const flat = days.flat();
    const weekTotals =
      g.weeks?.length === days.length ? g.weeks : days.map((w) => w.reduce((a, b) => a + (b || 0), 0));
    const best = Math.max(0, ...flat);
    const bestWeek = Math.max(0, ...weekTotals);
    this.#grid = {
      flat,
      weekTotals,
      best,
      bestWeek,
      // a peak shared by several days isn't a superlative worth printing
      bestIsUnique: best > 0 && flat.filter((v) => v === best).length === 1,
      bestWeekIsUnique: bestWeek > 0 && weekTotals.filter((v) => v === bestWeek).length === 1
    };
  }

  // ---- contribution grid hover readout -------------------------------------

  /** grid stats for the readout — set once the GitHub feed lands */
  #grid: {
    flat: number[];
    weekTotals: number[];
    best: number;
    bestWeek: number;
    bestIsUnique: boolean;
    bestWeekIsUnique: boolean;
  } | null = null;

  #onContribDay = (e: Event) => {
    const cell = (e as CustomEvent<ContribCell>).detail;
    const g = this.#grid;
    const out = this.querySelector<HTMLElement>('[data-contrib-readout]');
    if (!g || !out) return;
    // no date → the pad appended to the current week: days that haven't
    // happened, not days with nothing in them. Say nothing about them.
    if (!cell?.date) return this.#onContribLeave();

    const main = out.querySelector<HTMLElement>('[data-part="main"]');
    const tail = out.querySelector<HTMLElement>('[data-part="ctx"]');
    const line = contribLine(cell, {
      weekTotal: g.weekTotals[cell.week] ?? 0,
      best: g.best,
      bestWeek: g.bestWeek,
      bestIsUnique: g.bestIsUnique,
      bestWeekIsUnique: g.bestWeekIsUnique,
      run: runAt(g.flat, cell.week * 7 + cell.day)
    });
    if (main) main.textContent = line.main;
    if (tail) tail.textContent = line.tail;

    out.hidden = false;
    const total = this.querySelector<HTMLElement>('[data-live="contrib-total"]');
    if (total) total.hidden = true;
  };

  #onContribLeave = () => {
    const out = this.querySelector<HTMLElement>('[data-contrib-readout]');
    if (out) out.hidden = true;
    const total = this.querySelector<HTMLElement>('[data-live="contrib-total"]');
    if (total) total.hidden = false;
  };

  #applyMal(m: MalRes | null) {
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

    // Manga is MAL's, not Hardcover's: the volumes were deleted from that
    // account, so this row is the only place a manga can be claimed as read.
    if (m?.manga) {
      const { title, ch, chTotal, vol } = m.manga;
      const chapters = chTotal == null ? `chapter ${ch}` : `chapter ${ch} of ${chTotal}`;
      this.#setParts('manga', title, ` — ${chapters}${vol ? `, vol ${vol}` : ''}`);
    } else {
      this.#hideRow('manga');
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
