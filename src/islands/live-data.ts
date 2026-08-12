// <as-live-data> — fetches /api/{spotify,github,mal,weather} and fills the [data-live] values.
// Only textContent of pre-rendered [data-part] children is written: creating fresh
// elements would lose Astro's scoped classes.

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
  /** upstream failed — distinct from nothing playing */
  error?: boolean;
  isPlaying?: boolean;
  now?: SpotifyNow | null;
  last?: SpotifyLast | null;
}
interface GithubRes {
  disabled?: boolean;
  total?: number | null;
  days?: number[][] | null;
  /** 52 weekly totals */
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

/** unwrap a settled fetch; rejected or {disabled:true} → null */
function alive<T extends { disabled?: boolean }>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' && !r.value.disabled ? r.value : null;
}

// ---- contribution-grid hover readout ---------------------------------------

const WEEKDAYS_SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const MONTHS_SHORT = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
] as const;

/** 'thu jul 30' from an ISO date — read as UTC so it stays a plain calendar day */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const at = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS_SHORT[at.getUTCDay()]} ${MONTHS_SHORT[m - 1]} ${d}`;
}

/**
 * Unbroken run of contributing days containing `index`, as [position, length].
 * Walks both directions; index = week * 7 + weekday, valid only because the grid is Sunday-aligned.
 */
function runAt(flat: number[], index: number): [number, number] {
  if ((flat[index] ?? 0) <= 0) return [0, 0];
  let start = index;
  while (start > 0 && (flat[start - 1] ?? 0) > 0) start--;
  let end = index;
  // the grid's trailing pad is zeros, so this stops at the last real day
  while (end + 1 < flat.length && (flat[end + 1] ?? 0) > 0) end++;
  return [index - start + 1, end - start + 1];
}

/** The two halves of a readout line: the figures, and the dim clause after them. */
function contribLine(
  cell: ContribCell,
  ctx: {
    weekTotal: number;
    best: number;
    bestWeek: number;
    /** peak held by exactly one day / week; a tied peak prints no superlative */
    bestIsUnique: boolean;
    bestWeekIsUnique: boolean;
    run: [number, number];
  }
): { main: string; tail: string } {
  const head = shortDate(cell.date!);
  if (cell.count <= 0) return { main: head, tail: ' — quiet' };

  const n = cell.count;
  let main = `${head} — ${n} contribution${n === 1 ? '' : 's'}`;
  if (ctx.weekTotal > n) main += ` · ${ctx.weekTotal} that week`;

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
  /** the LISTENING head note reads 'live' only if spotify actually answered */
  #spotifyOk = true;

  connectedCallback() {
    this.#phase.start();
    void this.#load();
    // bound here, not when the feed lands, so a re-apply can't stack duplicate listeners
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
    // a view transition may have swapped this subtree away mid-flight
    if (!this.isConnected) return;

    this.#phase.settle(() => {
      this.#applySpotify(alive(spotify));
      this.#applyGithub(alive(github));
      this.#applyMal(alive(mal));
      this.#applyWeather(alive(weather));
      const note = this.querySelector<HTMLElement>('[data-live="phase-note"]');
      if (note) note.textContent = this.#spotifyOk ? 'live' : 'unavailable';
      this.#pruneSections();
    });
  }

  #hideRow(name: string) {
    // inline display:none, not [hidden]: the row's display:grid out-cascades the UA hidden rule
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
    const eq = this.querySelector('[data-eq]');
    if (eq) eq.classList.toggle('playing', s?.isPlaying === true);

    // A dead feed and nothing-playing arrive as the same empty payload, so failure must
    // surface here: silence lets #pruneSections drop LISTENING entirely. `disabled` still prunes.
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

    // no answer → keep the empty dot-grid; never synthesise zeros into the calendar
    if (!g || !Array.isArray(g.days)) {
      if (el) el.textContent = 'github is quiet — try later';
      return;
    }

    const days = g.days;
    const contrib = this.querySelector('as-contrib');
    if (contrib) {
      contrib.setAttribute('data-values', JSON.stringify(days));
      // data-from is read lazily by the hit-test and deliberately not observed,
      // so setting it after data-values cannot trigger a second repaint
      if (g.from) contrib.setAttribute('data-from', g.from);
    }
    wrap?.classList.add('arrived');

    const total =
      typeof g.total === 'number' ? g.total : days.flat().reduce((a, b) => a + (b || 0), 0);
    if (el) {
      const base = `${total.toLocaleString('en-US')} contributions in the last year`;
      el.textContent = matchMedia('(max-width: 768px)').matches
        ? base
        : `${base} — brass runs hotter where the weeks did`;
    }
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
      bestIsUnique: best > 0 && flat.filter((v) => v === best).length === 1,
      bestWeekIsUnique: bestWeek > 0 && weekTotals.filter((v) => v === bestWeek).length === 1
    };
  }

  // ---- contribution grid hover readout -------------------------------------

  /** grid stats for the readout; null until the GitHub feed lands */
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
    // a cell with no date is pad for a day that hasn't happened, not an empty day
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
      // only the base title is italicised; a trailing season/part suffix stays upright + lowercase
      const split = title.match(/^(.*?)\s+((?:\d+(?:st|nd|rd|th)\s+season|season\s+\d+|part\s+\d+)\b.*)$/i);
      const base = split ? split[1]! : title;
      const suffix = split ? ` ${split[2]!.toLowerCase()}` : '';
      const eps = epTotal == null ? ` — episode ${ep}` : ` — episode ${ep} of ${epTotal}`;
      this.#setParts('watching', base, `${suffix}${eps}`);
    } else {
      this.#hideRow('watching');
    }

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

  /** hide any section whose data rows have all been hidden */
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
