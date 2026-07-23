/**
 * Strava data helpers — refresh-token OAuth flow, same shape as lib/spotify.ts.
 *
 * Server-only: reads STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET /
 * STRAVA_REFRESH_TOKEN from import.meta.env. Never import from client code.
 *
 * Everything the Moving section needs is precomputed here (rate limits are
 * tight — ~200 req/15 min — so /api/strava caches 15 min and ships finished
 * numbers, not raw activities):
 *   latest    — newest run/ride WITH a summary polyline (route etching)
 *   latestAny — newest activity of any kind (home ticker)
 *   month     — current-IST-month run km + active days (vitals row)
 *   days      — 90-day consistency strip, one entry per day, oldest→newest
 */

const CLIENT_ID = import.meta.env.STRAVA_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.STRAVA_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.STRAVA_REFRESH_TOKEN;

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';
const ACTIVITIES_ENDPOINT = 'https://www.strava.com/api/v3/athlete/activities';

/** IST offset in minutes — the site keeps the author's clock, not the visitor's */
const IST_OFFSET_MIN = 330;
const DAY_MS = 86_400_000;
const WINDOW_DAYS = 90;

export const isStravaConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);

export type Bucket = 'run' | 'lift' | 'racquet';

export interface MovingLatest {
  name: string;
  sportType: string;
  /** 1-decimal km */
  distanceKm: number;
  /** preformatted "58:12" / "1:02:41" */
  movingTime: string;
  /** preformatted "4:41"; null when distance is degenerate */
  paceMinKm: string | null;
  /** encoded summary polyline (decode client-side with @mapbox/polyline) */
  polyline: string;
  /** UTC instant (start_date) — client converts to IST for weekday copy */
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
  /** run km only (Run/TrailRun/VirtualRun), current IST month */
  runKm: number;
  /** distinct IST days with ANY activity this month */
  activeDays: number;
  /** days elapsed so far this month (prototype: "18 active days of 22") */
  daysInMonth: number;
}

export interface MovingDay {
  /** IST calendar day, YYYY-MM-DD */
  date: string;
  /** total moving seconds across all activities that day */
  seconds: number;
  bucket: Bucket | 'rest';
}

export interface MovingPayload {
  latest: MovingLatest | null;
  latestAny: MovingLatestAny | null;
  month: MovingMonth | null;
  days: MovingDay[];
}

interface StravaActivity {
  name?: string;
  sport_type?: string;
  type?: string;
  /** meters */
  distance?: number;
  /** seconds */
  moving_time?: number;
  /** true UTC instant */
  start_date?: string;
  /** athlete-local wall clock with a misleading Z suffix */
  start_date_local?: string;
  map?: { summary_polyline?: string | null } | null;
}

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);
const RIDE_TYPES = new Set([
  'Ride',
  'VirtualRide',
  'EBikeRide',
  'EMountainBikeRide',
  'GravelRide',
  'MountainBikeRide',
  'Handcycle',
  'Velomobile'
]);
const LIFT_TYPES = new Set(['WeightTraining', 'Workout', 'Crossfit', 'HIIT']);

/**
 * README bucket law: Run/TrailRun/VirtualRun → run;
 * WeightTraining/Workout/Crossfit/HIIT → lift; racquet sports → racquet;
 * anything else (Ride, Swim, Hike…) → racquet-cream. Every activity counts.
 */
export function bucketFor(sportType: string): Bucket {
  if (RUN_TYPES.has(sportType)) return 'run';
  if (LIFT_TYPES.has(sportType)) return 'lift';
  return 'racquet';
}

/** Exchange the long-lived refresh token for a short-lived access token. */
async function getAccessToken(): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN
    })
  });

  if (!res.ok) throw new Error(`Strava token request failed: ${res.status}`);
  const data = await res.json();
  if (!data?.access_token) throw new Error('Strava token response missing access_token');
  return data.access_token as string;
}

/** "m:ss" under an hour, "h:mm:ss" above (58:12, 1:02:41) */
function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** pace over the raw meters, "4:41"; null when the distance is degenerate */
function fmtPace(movingSeconds: number, meters: number): string | null {
  if (!meters || meters < 50) return null;
  const secPerKm = movingSeconds / (meters / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = String(Math.round(secPerKm % 60)).padStart(2, '0');
  return s === '60' ? `${m + 1}:00` : `${m}:${s}`;
}

const km1 = (meters: number) => Math.round(meters / 100) / 10;

/** a Date shifted so getUTC* reads IST wall-clock */
const istNow = () => new Date(Date.now() + IST_OFFSET_MIN * 60_000);

const isoDay = (d: Date) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;

/**
 * Calendar day an activity belongs to. Strava's start_date_local is the
 * athlete's wall clock (with a fake Z), so its date part is already right.
 * Falls back to start_date shifted into IST.
 */
function activityDay(a: StravaActivity): string | null {
  if (typeof a.start_date_local === 'string' && a.start_date_local.length >= 10) {
    return a.start_date_local.slice(0, 10);
  }
  if (typeof a.start_date === 'string') {
    const t = Date.parse(a.start_date);
    if (!Number.isNaN(t)) return isoDay(new Date(t + IST_OFFSET_MIN * 60_000));
  }
  return null;
}

const sport = (a: StravaActivity): string => a.sport_type ?? a.type ?? '';

/** Fetch + precompute the full /api/strava payload. Throws on upstream failure. */
export async function getMoving(): Promise<MovingPayload> {
  const token = await getAccessToken();

  const after = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86_400;
  const url = `${ACTIVITIES_ENDPOINT}?per_page=200&after=${after}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Strava activities request failed: ${res.status}`);

  const raw = (await res.json()) as StravaActivity[];
  if (!Array.isArray(raw)) throw new Error('Strava activities payload is not an array');

  // `after` queries come back oldest-first — normalise to newest-first
  const acts = raw
    .filter((a) => typeof a.start_date === 'string')
    .sort((a, b) => Date.parse(b.start_date!) - Date.parse(a.start_date!));

  // ---- latest run/ride with a polyline (route etching) ----
  let latest: MovingLatest | null = null;
  for (const a of acts) {
    const st = sport(a);
    const poly = a.map?.summary_polyline;
    if ((RUN_TYPES.has(st) || RIDE_TYPES.has(st)) && typeof poly === 'string' && poly.length > 0) {
      const meters = a.distance ?? 0;
      const seconds = a.moving_time ?? 0;
      latest = {
        name: a.name ?? '',
        sportType: st,
        distanceKm: km1(meters),
        movingTime: fmtDuration(seconds),
        paceMinKm: fmtPace(seconds, meters),
        polyline: poly,
        startedAt: a.start_date!,
        isRun: RUN_TYPES.has(st)
      };
      break;
    }
  }

  // ---- latest anything (home ticker) ----
  const first = acts[0];
  const latestAny: MovingLatestAny | null = first
    ? {
        name: first.name ?? '',
        sportType: sport(first),
        distanceKm: km1(first.distance ?? 0),
        startedAt: first.start_date!
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
    if (RUN_TYPES.has(sport(a))) runMeters += a.distance ?? 0;
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
    const secs = a.moving_time ?? 0;
    entry.seconds += secs;
    entry.byBucket[bucketFor(sport(a))] += secs;
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
    // dominant bucket by seconds; ties resolve run > lift > racquet
    const order: Bucket[] = ['run', 'lift', 'racquet'];
    let bucket: Bucket = 'run';
    for (const b of order) {
      if (entry.byBucket[b] > entry.byBucket[bucket]) bucket = b;
    }
    days.push({ date, seconds: entry.seconds, bucket });
  }

  return { latest, latestAny, month, days };
}
