/** <as-moving> — fetches /api/moving + /api/fitness, draws the route etching, vitals rows and 90-day strip. */

import polyline from '@mapbox/polyline';
import { isMobile, onBreakpointChange } from './breakpoint';
import { LoadPhase } from './loadphase';

type Bucket = 'run' | 'lift' | 'racquet' | 'other';

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
  /** hover-readout detail — absent on rest days */
  count?: number;
  parts?: Array<{ bucket: Bucket; seconds: number }>;
  names?: string[];
  km?: number;
  pace?: string;
}
interface MovingRes {
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
  vo2maxRating?: string | null;
  source?: string;
}

/** viewBox + inset of the route etching */
const VIEW_W = 230;
const VIEW_H = 150;
const INSET = 12;

/** IST offset in minutes — every weekday/date string is IST, not UTC */
const IST_OFFSET_MIN = 330;

const BAR_COLORS: Record<Bucket, string> = {
  run: 'var(--as-accent)',
  lift: 'var(--live-green)',
  racquet: 'var(--quote)',
  other: 'var(--meta)'
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

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec'
] as const;

/** IST wall clock of a UTC instant */
function istDate(iso: string): Date | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t + IST_OFFSET_MIN * 60_000);
}

/** time-of-day suffix from the IST start hour */
function heatPhrase(hour: number): string {
  if (hour < 12) return 'before the heat';
  if (hour < 17) return 'braving the heat';
  return 'after the heat';
}

/** seconds → coarse duration for the strip readout: `42m`, `1h12`, `<1m` */
function coarse(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return '<1m';
  if (s < 3600) return `${Math.round(s / 60)}m`;
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
}

/** 'sat jul 18' — strip dates are already IST calendar days, so no offset maths */
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const at = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[at.getUTCDay()]!.slice(0, 3)} ${MONTHS[m - 1]} ${d}`;
}

/** keep the readout on one line — Garmin names can run long */
function clip(s: string, n = 34): string {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

class AsMoving extends HTMLElement {
  #io: IntersectionObserver | null = null;
  #unsub: (() => void) | null = null;
  #phase = new LoadPhase(this);
  /** kept so the strip can be rebuilt (60d ↔ 90d) on a breakpoint crossing */
  #days: MovingDay[] | null = null;
  /** the slice currently on screen — bars index into this via data-day */
  #stripDays: MovingDay[] = [];
  /** connect time — a fetch resolving under 180ms skips the route loader */
  #t0 = 0;
  /** route GPS-acquire lock→unfurl→settle timers */
  #etchT1: ReturnType<typeof setTimeout> | null = null;
  #etchT2: ReturnType<typeof setTimeout> | null = null;

  connectedCallback() {
    this.#t0 = performance.now();
    this.hidden = false;
    this.#phase.start();
    void this.#load();
    this.#unsub = onBreakpointChange(() => {
      if (this.#days) this.#buildStrip(this.#days);
    });

    // pointer-fine only — a ~4px bar is not targetable by touch
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      const strip = this.querySelector<HTMLElement>('[data-strip]');
      strip?.addEventListener('pointerover', this.#onStripOver);
      strip?.addEventListener('pointerleave', this.#onStripLeave);
    }
  }

  disconnectedCallback() {
    const strip = this.querySelector<HTMLElement>('[data-strip]');
    strip?.removeEventListener('pointerover', this.#onStripOver);
    strip?.removeEventListener('pointerleave', this.#onStripLeave);
    this.#phase.cancel();
    if (this.#etchT1) clearTimeout(this.#etchT1);
    if (this.#etchT2) clearTimeout(this.#etchT2);
    this.#etchT1 = null;
    this.#etchT2 = null;
    this.#io?.disconnect();
    this.#io = null;
    this.#unsub?.();
    this.#unsub = null;
  }

  async #load() {
    const [moving, fitness] = await Promise.allSettled([
      getJson<MovingRes>('/api/moving'),
      getJson<FitnessRes>('/api/fitness')
    ]);
    // view transition may have swapped this subtree away mid-flight
    if (!this.isConnected) return;

    const s = alive(moving);
    // no answer / disabled / empty → hide the whole block, never show zeros
    if (!s || !Array.isArray(s.days) || s.days.length === 0) {
      this.#phase.cancel();
      this.hidden = true;
      return;
    }
    const days = s.days;
    const f = alive(fitness);

    this.#phase.settle(() => {
      this.#days = days;
      this.#applyEtch(s.latest ?? null);
      this.#applyVitals(s.latest ?? null, s.month ?? null, f);
      this.#buildStrip(days);
    });
  }

  #hideRow(name: string) {
    // inline display:none, not [hidden] — the row's display:grid out-cascades
    // the UA [hidden] rule
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

    // equirectangular: x = lng·cos(midLat), y = −lat (north up), then fit the
    // viewBox preserving aspect. lat/lng arrive in degrees, cos() needs radians.
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

    const base = this.querySelector<SVGPathElement>('[data-route-base]');
    const fix = this.querySelector<SVGGElement>('[data-route-fix]');
    const cap = this.querySelector<HTMLElement>('[data-live="etch-cap"]');
    const when = istDate(latest.startedAt);
    const weekday = when ? WEEKDAYS[when.getUTCDay()] : null;
    const shape = weekday
      ? `the shape of ${weekday} — ${latest.name.toLowerCase()}`
      : `the shape of it — ${latest.name.toLowerCase()}`;

    if (fix) fix.style.transform = `translate(${px(0)}px,${py(0)}px)`;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const instant = performance.now() - this.#t0 < 180;

    // cached or reduced motion → no loader, draw the route whole
    if (reduced || instant) {
      if (base) base.style.strokeDashoffset = '0';
      this.classList.add('settled');
      if (cap) cap.textContent = shape;
      return;
    }

    // ordered: locking (ping) → unfurl (draw) → settled (runner laps)
    this.classList.add('locking');
    this.#etchT1 = setTimeout(() => {
      if (!this.isConnected) return;
      this.classList.remove('locking');
      this.classList.add('unfurl');
      if (cap) cap.textContent = shape;
      this.#etchT2 = setTimeout(() => {
        if (this.isConnected) this.classList.add('settled');
      }, 1150);
    }, 640);
  }

  // ---- vitals rows ---------------------------------------------------------

  #applyVitals(latest: MovingLatest | null, month: MovingRes['month'], fitness: FitnessRes | null) {
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
          ? `— ${WEEKDAYS[when.getUTCDay()]} ${MONTHS[when.getUTCMonth()]} ${when.getUTCDate()}, ${heatPhrase(when.getUTCHours())}`
          : '';
      }
    } else {
      this.#hideRow('lastrun');
    }

    const monthEl = this.querySelector<HTMLElement>('[data-live="month"]');
    if (month && monthEl) {
      monthEl.textContent = `${month.runKm} km on foot · ${month.activeDays} active days of ${month.daysInMonth}`;
    } else {
      this.#hideRow('month');
    }

    // /api/fitness: a missing or zero value drops its whole row
    if (typeof fitness?.vo2max === 'number' && fitness.vo2max > 0) {
      const num = this.#part('vo2max', 'num');
      if (num) num.textContent = String(fitness.vo2max);
      const tail = this.#part('vo2max', 'tail');
      if (tail) {
        tail.textContent = fitness.vo2maxRating
          ? ` — garmin calls it “${fitness.vo2maxRating}”; the legs disagree`
          : ' ml/kg/min';
      }
    } else {
      this.#hideRow('vo2max');
    }

    if (typeof fitness?.restingHr === 'number' && fitness.restingHr > 0) {
      const rhr = Math.round(fitness.restingHr);
      const text = this.#part('rhr', 'text');
      if (text) text.textContent = `${rhr} bpm — the dot keeps time`;
      const dot = this.querySelector<HTMLElement>('[data-rhr-dot]');
      if (dot && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        // one beat cycle = 60/RHR seconds (bpm → seconds per beat)
        const period = (60 / rhr).toFixed(4);
        dot.style.animation = `as-beat ${period}s ease-in-out infinite, as-pulse ${period}s ease-out infinite`;
      }
    } else {
      this.#hideRow('rhr');
    }
  }

  // ---- strip hover readout -------------------------------------------------

  /** Fill the readout with one day. DOM nodes, not innerHTML — names come off the wire. */
  #showDay(day: MovingDay) {
    const out = this.querySelector<HTMLElement>('[data-readout]');
    if (!out) return;

    const frag = document.createDocumentFragment();
    const put = (text: string, cls?: string) => {
      const el = document.createElement('span');
      el.textContent = text;
      if (cls) el.className = cls;
      frag.appendChild(el);
    };

    put(dayLabel(day.date));
    if (day.bucket === 'rest' || day.seconds <= 0) {
      put(' — rest', 'ro-dim');
    } else {
      put(' — ');
      const parts = day.parts?.length
        ? day.parts
        : [{ bucket: day.bucket as Bucket, seconds: day.seconds }];
      parts.forEach((p, i) => {
        if (i) put(' · ');
        put(p.bucket, `k-${p.bucket}`);
        put(` ${coarse(p.seconds)}`);
      });
      if (day.km) put(` · ${day.km} km`);
      if (day.pace) put(` · ${day.pace}/km`);
      // ×n when more sessions ran than names shown — same-day names are deduped
      const names = day.names ?? [];
      if (names.length) {
        const more = (day.count ?? 0) > names.length ? ` ×${day.count}` : '';
        put(` — ${clip(names.join(', '))}${more}`, 'ro-dim');
      }
    }

    out.replaceChildren(frag);
    out.hidden = false;
    const legend = this.querySelector<HTMLElement>('[data-legend]');
    if (legend) legend.hidden = true;
  }

  /** hand the line back to the legend */
  #clearDay() {
    const out = this.querySelector<HTMLElement>('[data-readout]');
    if (out) out.hidden = true;
    const legend = this.querySelector<HTMLElement>('[data-legend]');
    if (legend) legend.hidden = false;
  }

  #onStripOver = (e: PointerEvent) => {
    const bar = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-day]');
    // the 2.5px gaps between bars target the strip itself — keep the last day
    // showing rather than flickering back to the legend on every crossing
    if (!bar) return;
    const day = this.#stripDays[Number(bar.dataset.day)];
    if (day) this.#showDay(day);
  };

  #onStripLeave = () => this.#clearDay();

  // ---- 90-day consistency strip -------------------------------------------

  #buildStrip(allDays: MovingDay[]) {
    const strip = this.querySelector<HTMLElement>('[data-strip]');
    if (!strip) return;

    // a rebuild must retire the prior observer and clear the readout — the
    // data-day indices are about to shift
    this.#io?.disconnect();
    this.#io = null;
    this.#clearDay();

    // mobile shows the last 60 days, desktop all 90
    const days = isMobile() ? allDays.slice(-60) : allDays;
    const stagger = isMobile() ? 20 : 16; // ms/bar

    this.#stripDays = days;

    const max = Math.max(1, ...days.map((d) => d.seconds));
    const frag = document.createDocumentFragment();
    days.forEach((day, i) => {
      const bar = document.createElement('span');
      bar.dataset.day = String(i);
      if (day.bucket === 'rest' || day.seconds <= 0) {
        bar.style.height = '4px';
        bar.style.background = REST_COLOR;
      } else {
        // 12–30px tall, linear against the window's max seconds
        bar.style.height = `${Math.round(12 + 18 * (day.seconds / max))}px`;
        bar.style.background = BAR_COLORS[day.bucket];
      }
      bar.style.animationDelay = `${i * stagger}ms`;
      frag.appendChild(bar);
    });
    strip.replaceChildren(frag);
    // must be removed to re-arm the animation on a rebuild
    strip.classList.remove('rise');

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // instant — the global reduced-motion override zeroes the durations
      strip.classList.add('rise');
      return;
    }

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
