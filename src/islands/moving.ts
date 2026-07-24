/**
 * <as-moving> — data plumbing + drawing for the MOVING section (frame 6d).
 *
 * On connect it fetches /api/strava and /api/fitness in parallel
 * (Promise.allSettled — a dead fitness feed never blocks the strip) and:
 *   - decodes the latest run/ride polyline (@mapbox/polyline) into the
 *     230×150 route etching (normalized, aspect-preserving, ~12px inset);
 *   - fills the vitals rows (last run / this month / vo2max / resting hr);
 *     the RHR dot's beat+pulse duration is 60/RHR seconds, set inline;
 *   - builds the 90-bar consistency strip and fires its rise-in stagger via
 *     IntersectionObserver on first viewport entry.
 *
 * Degradation (README rule): Strava disabled / unreachable / empty → the
 * section stays `hidden` — it renders NOTHING. Fitness nulls → only those
 * rows drop. The SSR content under <as-moving> is placeholder copy that is
 * never shown; the island overwrites everything before un-hiding.
 *
 * Reduced motion: bars render risen instantly (no IO wait), the RHR dot
 * stays static (no inline animation), and CSS hides the route runner.
 */

import polyline from '@mapbox/polyline';
import { isMobile, onBreakpointChange } from './breakpoint';

type Bucket = 'run' | 'lift' | 'racquet';

interface MovingLatest {
  name: string;
  sportType: string;
  distanceKm: number;
  movingTime: string;
  paceMinKm: string | null;
  polyline: string;
  startedAt: string;
  isRun: boolean;
}
interface MovingDay {
  date: string;
  seconds: number;
  bucket: Bucket | 'rest';
}
interface StravaRes {
  disabled?: boolean;
  latest?: MovingLatest | null;
  latestAny?: { name: string; sportType: string; distanceKm: number; startedAt: string } | null;
  month?: { runKm: number; activeDays: number; daysInMonth: number } | null;
  days?: MovingDay[];
}
interface FitnessRes {
  disabled?: boolean;
  vo2max?: number | null;
  restingHr?: number | null;
  source?: string;
}

/** viewBox + inset of the route etching */
const VIEW_W = 230;
const VIEW_H = 150;
const INSET = 12;

/** IST offset — weekday/heat copy keeps the author's clock */
const IST_OFFSET_MIN = 330;

const BAR_COLORS: Record<Bucket, string> = {
  run: 'var(--as-accent)',
  lift: 'var(--live-green)',
  racquet: 'var(--quote)'
};
const REST_COLOR = 'rgba(237,230,218,.12)';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  return (await res.json()) as T;
}

/** unwrap a settled fetch; rejected or {disabled:true} → null (feed is dead) */
function alive<T extends { disabled?: boolean }>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' && !r.value.disabled ? r.value : null;
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
] as const;

/** IST wall clock of a UTC instant */
function istDate(iso: string): Date | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t + IST_OFFSET_MIN * 60_000);
}

/** '— saturday, before the heat' — time-of-day suffix from the IST start hour */
function heatPhrase(hour: number): string {
  if (hour < 12) return 'before the heat';
  if (hour < 17) return 'braving the heat';
  return 'after the heat';
}

class AsMoving extends HTMLElement {
  #io: IntersectionObserver | null = null;
  #unsub: (() => void) | null = null;
  /** kept so the strip can be rebuilt (60d ↔ 90d) on a breakpoint crossing */
  #days: MovingDay[] | null = null;

  connectedCallback() {
    void this.#load();
    this.#unsub = onBreakpointChange(() => {
      if (this.#days) this.#buildStrip(this.#days);
    });
  }

  disconnectedCallback() {
    this.#io?.disconnect();
    this.#io = null;
    this.#unsub?.();
    this.#unsub = null;
  }

  async #load() {
    const [strava, fitness] = await Promise.allSettled([
      getJson<StravaRes>('/api/strava'),
      getJson<FitnessRes>('/api/fitness')
    ]);
    // view transition may have swapped this subtree away mid-flight
    if (!this.isConnected) return;

    const s = alive(strava);
    // Strava disabled or down (nulls + empty days) → the section never shows
    if (!s || !Array.isArray(s.days) || s.days.length === 0) return;
    const f = alive(fitness);

    this.#days = s.days;
    this.#applyEtch(s.latest ?? null);
    this.#applyVitals(s.latest ?? null, s.month ?? null, f);
    this.#buildStrip(s.days);

    this.hidden = false;
  }

  #hideRow(name: string) {
    // inline display:none, not [hidden] — the rows' display:grid class would
    // out-cascade the UA hidden rule (same trick as <as-live-data>)
    const row = this.querySelector<HTMLElement>(`[data-row="${name}"]`);
    if (row) row.style.display = 'none';
  }

  #part(live: string, part: string): HTMLElement | null {
    return this.querySelector<HTMLElement>(`[data-live="${live}"] [data-part="${part}"]`);
  }

  // ---- route etching -------------------------------------------------------

  #applyEtch(latest: MovingLatest | null) {
    const grid = this.querySelector<HTMLElement>('[data-mgrid]');
    const etch = this.querySelector<HTMLElement>('[data-etch]');
    const drop = () => {
      if (etch) etch.style.display = 'none';
      grid?.classList.add('no-etch');
    };

    if (!latest?.polyline) return drop();

    let pts: Array<[number, number]>;
    try {
      pts = polyline.decode(latest.polyline);
    } catch {
      return drop();
    }
    if (!Array.isArray(pts) || pts.length < 2) return drop();

    // project: x = lng·cos(midLat) (equirectangular, keeps the shape honest),
    // y = −lat (north up); then fit into the viewBox preserving aspect
    const midLat = (pts.reduce((a, [lat]) => a + lat, 0) / pts.length) * (Math.PI / 180);
    const k = Math.cos(midLat);
    const xs = pts.map(([, lng]) => lng * k);
    const ys = pts.map(([lat]) => -lat);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1e-9;
    const spanY = maxY - minY || 1e-9;
    const availW = VIEW_W - 2 * INSET;
    const availH = VIEW_H - 2 * INSET;
    const scale = Math.min(availW / spanX, availH / spanY);
    const offX = INSET + (availW - spanX * scale) / 2;
    const offY = INSET + (availH - spanY * scale) / 2;

    const px = (i: number) => (offX + (xs[i]! - minX) * scale).toFixed(2);
    const py = (i: number) => (offY + (ys[i]! - minY) * scale).toFixed(2);

    let d = `M${px(0)} ${py(0)}`;
    for (let i = 1; i < pts.length; i++) d += ` L${px(i)} ${py(i)}`;

    this.querySelector('[data-route-base]')?.setAttribute('d', d);
    this.querySelector('[data-route-runner]')?.setAttribute('d', d);
    const start = this.querySelector('[data-route-start]');
    start?.setAttribute('cx', px(0));
    start?.setAttribute('cy', py(0));

    const cap = this.querySelector<HTMLElement>('[data-live="etch-cap"]');
    if (cap) {
      const when = istDate(latest.startedAt);
      const weekday = when ? WEEKDAYS[when.getUTCDay()] : null;
      cap.textContent = weekday
        ? `the shape of ${weekday} — ${latest.name.toLowerCase()}`
        : `the shape of it — ${latest.name.toLowerCase()}`;
    }
  }

  // ---- vitals rows ---------------------------------------------------------

  #applyVitals(
    latest: MovingLatest | null,
    month: StravaRes['month'],
    fitness: FitnessRes | null
  ) {
    // last run — the same activity the etching draws
    if (latest) {
      const label = this.querySelector<HTMLElement>('[data-live="lastrun-label"]');
      if (label) label.textContent = latest.isRun ? 'last run' : 'last ride';
      const bits = [`${latest.distanceKm} km`, latest.movingTime];
      if (latest.paceMinKm) bits.push(`${latest.paceMinKm}/km`);
      const head = this.#part('lastrun', 'head');
      if (head) head.textContent = `${bits.join(' · ')} `;
      const tail = this.#part('lastrun', 'tail');
      if (tail) {
        const when = istDate(latest.startedAt);
        tail.textContent = when
          ? `— ${WEEKDAYS[when.getUTCDay()]}, ${heatPhrase(when.getUTCHours())}`
          : '';
      }
    } else {
      this.#hideRow('lastrun');
    }

    // this month
    const monthEl = this.querySelector<HTMLElement>('[data-live="month"]');
    if (month && monthEl) {
      monthEl.textContent = `${month.runKm} km on foot · ${month.activeDays} active days of ${month.daysInMonth}`;
    } else {
      this.#hideRow('month');
    }

    // vitals from /api/fitness — missing values DROP their row entirely
    if (typeof fitness?.vo2max === 'number' && fitness.vo2max > 0) {
      const num = this.#part('vo2max', 'num');
      if (num) num.textContent = String(fitness.vo2max);
      const tail = this.#part('vo2max', 'tail');
      if (tail) tail.textContent = ' — garmin calls it “superior”; the legs disagree';
    } else {
      this.#hideRow('vo2max');
    }

    if (typeof fitness?.restingHr === 'number' && fitness.restingHr > 0) {
      const rhr = Math.round(fitness.restingHr);
      const text = this.#part('rhr', 'text');
      if (text) text.textContent = `${rhr} bpm — the dot keeps time`;
      const dot = this.querySelector<HTMLElement>('[data-rhr-dot]');
      if (dot && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // the dot literally keeps time: one beat cycle = 60/RHR seconds
        const period = (60 / rhr).toFixed(4);
        dot.style.animation = `as-beat ${period}s ease-in-out infinite, as-pulse ${period}s ease-out infinite`;
      }
    } else {
      this.#hideRow('rhr');
    }
  }

  // ---- 90-day consistency strip -------------------------------------------

  #buildStrip(allDays: MovingDay[]) {
    const strip = this.querySelector<HTMLElement>('[data-strip]');
    if (!strip) return;

    // a re-entry (breakpoint crossing) must retire the prior stagger observer
    this.#io?.disconnect();
    this.#io = null;

    // mobile shows the last 60 days (7d); desktop the full 90
    const days = isMobile() ? allDays.slice(-60) : allDays;
    const stagger = isMobile() ? 20 : 16; // ms/bar

    const max = Math.max(1, ...days.map((d) => d.seconds));
    const frag = document.createDocumentFragment();
    days.forEach((day, i) => {
      const bar = document.createElement('span');
      if (day.bucket === 'rest' || day.seconds <= 0) {
        bar.style.height = '4px';
        bar.style.background = REST_COLOR;
      } else {
        // 12–30px, linear vs the window max
        bar.style.height = `${Math.round(12 + 18 * (day.seconds / max))}px`;
        bar.style.background = BAR_COLORS[day.bucket];
      }
      bar.style.animationDelay = `${i * stagger}ms`;
      frag.appendChild(bar);
    });
    strip.replaceChildren(frag);
    // a rebuild after the rise already played must re-arm the animation
    strip.classList.remove('rise');

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // instant — the global reduced-motion override zeroes the durations
      strip.classList.add('rise');
      return;
    }

    // fire the stagger on first viewport entry; re-mounts re-fire naturally
    this.#io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          strip.classList.add('rise');
          this.#io?.disconnect();
          this.#io = null;
        }
      },
      { threshold: 0.15 }
    );
    this.#io.observe(strip);
  }
}

if (!customElements.get('as-moving')) customElements.define('as-moving', AsMoving);
