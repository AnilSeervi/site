/** MOVING payload builder — latest / latestAny / month / 90-day strip from a Garmin activity list. Server-only. */
import polyline from '@mapbox/polyline';
import type { GarminActivity } from '~/lib/garmin-core';

const IST_OFFSET_MIN = 330;
const DAY_MS = 86_400_000;
export const WINDOW_DAYS = 90;

export type Bucket = 'run' | 'lift' | 'racquet' | 'other';

export interface MovingLatest {
  name: string;
  sportType: string;
  distanceKm: number;
  movingTime: string;
  paceMinKm: string | null;
  /** encoded polyline (decode client-side with @mapbox/polyline) */
  polyline: string;
  /** UTC instant (ISO) — client converts to IST for weekday copy */
  startedAt: string;
  isRun: boolean;
}

export interface MovingLatestAny {
  name: string;
  sportType: string;
  distanceKm: number;
  startedAt: string;
}

export interface MovingMonth {
  runKm: number;
  activeDays: number;
  daysInMonth: number;
}

export interface MovingDayPart {
  bucket: Bucket;
  seconds: number;
}

/** One day of the consistency strip; the optional detail fields are absent on rest days. */
export interface MovingDay {
  date: string;
  seconds: number;
  bucket: Bucket | 'rest';
  /** activities that day */
  count?: number;
  /** per-bucket seconds, dominant first — parts[0].bucket IS `bucket` */
  parts?: MovingDayPart[];
  /** activity names, deduped, at most 2 — `count` carries the rest */
  names?: string[];
  /** day's distance, km to 1dp */
  km?: number;
  /** pace over the day's run legs, "m:ss" — run-dominant days only */
  pace?: string;
}

export interface MovingPayload {
  latest: MovingLatest | null;
  latestAny: MovingLatestAny | null;
  month: MovingMonth | null;
  days: MovingDay[];
}

// ---- Garmin activityType.typeKey → bucket -------------------------------
const RUN_TYPES = new Set([
  'running',
  'trail_running',
  'treadmill_running',
  'track_running',
  'virtual_run',
  'ultra_run',
  'obstacle_run',
  'indoor_running'
]);
const RIDE_TYPES = new Set([
  'cycling',
  'road_biking',
  'mountain_biking',
  'gravel_cycling',
  'indoor_cycling',
  'virtual_ride',
  'cyclocross',
  'downhill_biking',
  'track_cycling',
  'recumbent_cycling',
  'e_bike_fitness',
  'e_bike_mountain'
]);
const LIFT_TYPES = new Set([
  'strength_training',
  'indoor_cardio',
  'hiit',
  'crossfit',
  'functional_strength'
]);
const RACQUET_TYPES = new Set([
  'table_tennis',
  'tennis',
  'badminton',
  'squash',
  'racquetball',
  'pickleball',
  'padel',
  'platform_tennis'
]);

/** tie-break order when two buckets share a day's minutes */
const BUCKET_ORDER: Bucket[] = ['run', 'lift', 'racquet', 'other'];

export function bucketFor(typeKey: string): Bucket {
  if (RUN_TYPES.has(typeKey)) return 'run';
  if (LIFT_TYPES.has(typeKey)) return 'lift';
  if (RACQUET_TYPES.has(typeKey)) return 'racquet';
  return 'other';
}

/** run or ride → carries a route worth etching */
export function isRunOrRide(typeKey: string): boolean {
  return RUN_TYPES.has(typeKey) || RIDE_TYPES.has(typeKey);
}

// ---- formatters ---------------------------------------------------------

/** "m:ss" under an hour, "h:mm:ss" above */
function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** seconds + metres → pace per km, "4:41"; null under 50 m */
function fmtPace(movingSeconds: number, meters: number): string | null {
  if (!meters || meters < 50) return null;
  const secPerKm = movingSeconds / (meters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = String(Math.round(secPerKm % 60)).padStart(2, '0');
  return s === '60' ? `${m + 1}:00` : `${m}:${s}`;
}

const km1 = (meters: number) => Math.round(meters / 100) / 10;

const istNow = () => new Date(Date.now() + IST_OFFSET_MIN * 60_000);

const isoDay = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;

/** Garmin GMT "YYYY-MM-DD HH:MM:SS" (no zone) → UTC ISO the client can parse */
function gmtToIso(gmt: string): string {
  return gmt ? `${gmt.trim().replace(' ', 'T')}Z` : '';
}

/** IST calendar day of an activity — startTimeLocal is already athlete-local */
function activityDay(a: GarminActivity): string | null {
  if (a.startTimeLocal && a.startTimeLocal.length >= 10) return a.startTimeLocal.slice(0, 10);
  if (a.startTimeGMT) {
    const t = Date.parse(gmtToIso(a.startTimeGMT));
    if (!Number.isNaN(t)) return isoDay(new Date(t + IST_OFFSET_MIN * 60_000));
  }
  return null;
}

/** Assemble the Moving payload from a newest-first activity list + the chosen GPS track. */
export function buildMovingPayload(
  acts: GarminActivity[],
  gps: GarminActivity | null,
  track: Array<[number, number]>
): MovingPayload {
  // ---- latest run/ride with a route ----
  let latest: MovingLatest | null = null;
  if (gps && track.length >= 2) {
    latest = {
      name: gps.activityName,
      sportType: gps.typeKey,
      distanceKm: km1(gps.distanceMeters),
      movingTime: fmtDuration(gps.durationSeconds),
      paceMinKm: fmtPace(gps.durationSeconds, gps.distanceMeters),
      polyline: polyline.encode(track),
      startedAt: gmtToIso(gps.startTimeGMT),
      isRun: RUN_TYPES.has(gps.typeKey)
    };
  }

  // ---- latest anything (home ticker) ----
  const first = acts[0];
  const latestAny: MovingLatestAny | null = first
    ? {
        name: first.activityName,
        sportType: first.typeKey,
        distanceKm: km1(first.distanceMeters),
        startedAt: gmtToIso(first.startTimeGMT)
      }
    : null;

  // ---- this month (IST): run km + distinct active days ----
  const now = istNow();
  const monthPrefix = isoDay(now).slice(0, 7);
  let runMeters = 0;
  const activeDaySet = new Set<string>();
  for (const a of acts) {
    const day = activityDay(a);
    if (!day || !day.startsWith(monthPrefix)) continue;
    activeDaySet.add(day);
    if (RUN_TYPES.has(a.typeKey)) runMeters += a.distanceMeters;
  }
  const month: MovingMonth = {
    runKm: Math.round(runMeters / 1000),
    activeDays: activeDaySet.size,
    daysInMonth: now.getUTCDate()
  };

  // ---- 90-day consistency strip, oldest → newest ----
  interface DayAgg {
    seconds: number;
    byBucket: Record<Bucket, number>;
    /** name → total seconds, so names rank like buckets */
    byName: Map<string, number>;
    count: number;
    meters: number;
    runMeters: number;
    runSeconds: number;
  }
  const perDay = new Map<string, DayAgg>();
  for (const a of acts) {
    const day = activityDay(a);
    if (!day) continue;
    let entry = perDay.get(day);
    if (!entry) {
      entry = {
        seconds: 0,
        byBucket: { run: 0, lift: 0, racquet: 0, other: 0 },
        byName: new Map(),
        count: 0,
        meters: 0,
        runMeters: 0,
        runSeconds: 0
      };
      perDay.set(day, entry);
    }
    entry.seconds += a.durationSeconds;
    entry.byBucket[bucketFor(a.typeKey)] += a.durationSeconds;
    entry.count += 1;
    entry.meters += a.distanceMeters;
    // Garmin auto-names repeat within a day — fold same-name legs into one entry
    const name = a.activityName.trim().toLowerCase();
    if (name) entry.byName.set(name, (entry.byName.get(name) ?? 0) + a.durationSeconds);
    if (RUN_TYPES.has(a.typeKey)) {
      entry.runMeters += a.distanceMeters;
      entry.runSeconds += a.durationSeconds;
    }
  }

  const days: MovingDay[] = [];
  const todayUtcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
    const date = isoDay(new Date(todayUtcMidnight - i * DAY_MS));
    const entry = perDay.get(date);
    if (!entry || entry.seconds <= 0) {
      days.push({ date, seconds: 0, bucket: 'rest' });
      continue;
    }
    // sort is stable, so the BUCKET_ORDER filter above breaks equal-seconds ties
    const parts: MovingDayPart[] = BUCKET_ORDER.filter((b) => entry.byBucket[b] > 0)
      .map((b) => ({ bucket: b, seconds: Math.round(entry.byBucket[b]) }))
      .sort((x, y) => y.seconds - x.seconds);
    const bucket = parts[0]?.bucket ?? 'other';
    const day: MovingDay = {
      date,
      seconds: Math.round(entry.seconds),
      bucket,
      count: entry.count,
      parts,
      names: [...entry.byName.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 2)
        .map(([name]) => name)
    };
    // run-dominant days use run metres only, so km and pace agree; others total.
    // 500 m floor: Garmin logs incidental metres for indoor sessions.
    const meters = bucket === 'run' ? entry.runMeters : entry.meters;
    if (meters >= 500) day.km = km1(meters);
    if (bucket === 'run') {
      const pace = fmtPace(entry.runSeconds, entry.runMeters);
      if (pace) day.pace = pace;
    }
    days.push(day);
  }

  return { latest, latestAny, month, days };
}
