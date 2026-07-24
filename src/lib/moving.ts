/**
 * MOVING section data model + builder.
 *
 * The feed is Garmin Connect (activitylist-service + activity details GPS),
 * replacing the retired Strava integration — Strava's API now sits behind a
 * paid tier. Everything the section needs is precomputed here so /api/moving
 * ships finished numbers, not raw activities:
 *   latest    — newest run/ride WITH a GPS track (route etching); the Garmin
 *               [lat,lon] points are encoded to a polyline so the client
 *               island decodes it exactly as it did the Strava summary line
 *   latestAny — newest activity of any kind (home ticker)
 *   month     — current-IST-month run km + active days (vitals row)
 *   days      — 90-day consistency strip, one entry per day, oldest→newest
 *
 * Server-only. Pure functions here; the authenticated orchestration (token +
 * fetch) lives in src/lib/garmin.ts.
 */
import polyline from '@mapbox/polyline';
import type { GarminActivity } from '~/lib/garmin-core';

const IST_OFFSET_MIN = 330;
const DAY_MS = 86_400_000;
export const WINDOW_DAYS = 90;

export type Bucket = 'run' | 'lift' | 'racquet';

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

export interface MovingDay {
  date: string;
  seconds: number;
  bucket: Bucket | 'rest';
}

export interface MovingPayload {
  latest: MovingLatest | null;
  latestAny: MovingLatestAny | null;
  month: MovingMonth | null;
  days: MovingDay[];
}

// ---- Garmin activityType.typeKey → bucket -------------------------------
// README bucket law: running family → run; strength/HIIT/crossfit → lift;
// everything else that moved (racquet sports, walks, rides, swims…) → racquet.
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

export function bucketFor(typeKey: string): Bucket {
  if (RUN_TYPES.has(typeKey)) return 'run';
  if (LIFT_TYPES.has(typeKey)) return 'lift';
  return 'racquet';
}

/** run or ride → carries a route worth etching / a km-leading ticker line */
export function isRunOrRide(typeKey: string): boolean {
  return RUN_TYPES.has(typeKey) || RIDE_TYPES.has(typeKey);
}

// ---- formatters (shared shapes with the old Strava lib) -----------------

/** "m:ss" under an hour, "h:mm:ss" above */
function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** pace over meters, "4:41"; null when distance is degenerate */
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

/**
 * Assemble the Moving payload from a newest-first activity list plus the GPS
 * track of the chosen latest run/ride (already fetched by the orchestrator).
 */
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
  const perDay = new Map<string, { seconds: number; byBucket: Record<Bucket, number> }>();
  for (const a of acts) {
    const day = activityDay(a);
    if (!day) continue;
    const entry = perDay.get(day) ?? { seconds: 0, byBucket: { run: 0, lift: 0, racquet: 0 } };
    entry.seconds += a.durationSeconds;
    entry.byBucket[bucketFor(a.typeKey)] += a.durationSeconds;
    perDay.set(day, entry);
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
    const order: Bucket[] = ['run', 'lift', 'racquet'];
    let bucket: Bucket = 'run';
    for (const b of order) if (entry.byBucket[b] > entry.byBucket[bucket]) bucket = b;
    days.push({ date, seconds: entry.seconds, bucket });
  }

  return { latest, latestAny, month, days };
}
