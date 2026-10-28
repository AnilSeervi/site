/**
 * Garmin Connect Personal API client. A personal API key (Garmin Connect →
 * Settings → Personal API Key, valid 30 days to a year) is exchanged for a 24h
 * bearer token. There is no refresh token: a token near expiry is replaced by
 * minting another, and minting does not revoke earlier tokens, so production
 * and a dev machine can each hold their own.
 * Must stay environment-agnostic and erasable-TS-only (node type stripping
 * imports this file directly). Never log token or key values.
 */
import { createHash } from 'node:crypto';
import { parseFitActivity, unzipFit, type FitActivity } from './fit.ts';

// Types

/** Minimal async key/value store (backed by the Turso `kv` table). */
export interface TokenStore {
  get(k: string): Promise<string | null>;
  set(k: string, v: string): Promise<void>;
}

export interface AccessToken {
  access_token: string;
  /** Absolute expiry, ms since epoch (the JWT's exp claim). */
  expires_at: number;
  /** Fingerprint of the key that minted it, so a rotated key never reuses it. */
  key_id: string;
}

/** kv-table keys used by the Garmin integration. */
export const KV_KEYS = {
  token: 'garmin:token'
} as const;

// Constants

const API = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';

/** Where a new key is made once the old one expires or is deleted. */
export const KEY_SETTINGS_URL = 'https://connect.garmin.com/app/settings/personalApiToken';

/** mint a replacement this long before expiry, so no request holds a dying token */
const EXPIRY_MARGIN_MS = 10 * 60_000;
const TIMEOUT_MS = 15_000;
/** route points kept for the etching — about one every 4 s on a half-hour run */
const MAX_TRACK_POINTS = 500;

// Small helpers

function asRecord(x: unknown): Record<string, unknown> | null {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
    ? (x as Record<string, unknown>)
    : null;
}

function safeParse(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Calendar date (YYYY-MM-DD) `daysAgo` days back in the given IANA time zone (default IST). */
export function calendarDate(daysAgo = 0, timeZone: string = 'Asia/Kolkata'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(Date.now() - daysAgo * 86_400_000));
}

/** At most `max` evenly spaced points, the first and last always among them. */
function thin<T>(points: T[], max: number): T[] {
  if (points.length <= max) return points;
  const step = (points.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => points[Math.round(i * step)]!);
}

// Errors

/** Carries the HTTP status so callers can tell "re-auth" from "upstream broke". */
export class GarminHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GarminHttpError';
    this.status = status;
  }
}

/**
 * A 401 — the token (or the key behind it) is no longer accepted. Not 403:
 * that means the key's scopes don't cover the endpoint, and a new token from
 * the same key can't change that.
 */
export function isAuthFailure(err: unknown): boolean {
  return err instanceof GarminHttpError && err.status === 401;
}

/**
 * fetch with a timeout, network failures rethrown under a fixed message: the
 * TypeError fetch throws for a malformed header quotes the header, key and all.
 */
async function send(url: string, init: RequestInit, what: string): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    const timedOut = (err as Error)?.name === 'TimeoutError';
    throw new Error(`${what} ${timedOut ? 'timed out' : 'could not be sent'}`);
  }
}

// Tokens

/** Short one-way fingerprint of an API key; safe to store beside the token. */
function keyId(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
}

/** exp claim of a JWT in ms — read, not verified; Garmin checks the signature. */
function jwtExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims = asRecord(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')));
    return typeof claims?.exp === 'number' ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Exchange the API key for a new 24h bearer token. */
export async function mintAccessToken(apiKey: string): Promise<AccessToken> {
  // a key pasted across two lines can never work, and must not reach a header
  if (!/^[\x21-\x7e]+$/.test(apiKey)) {
    throw new Error('Garmin: GARMIN_API_KEY contains whitespace or control characters');
  }
  const res = await send(
    `${API}${TOKEN_PATH}`,
    { method: 'POST', headers: { Accept: '*/*', Authorization: `ApiKey ${apiKey}` } },
    'Garmin: token request'
  );
  if (!res.ok) {
    // 401 is all Garmin says about a key that expired, was deleted or is mistyped
    const hint =
      res.status === 401 || res.status === 403
        ? ` — key rejected; make a new one at ${KEY_SETTINGS_URL}`
        : '';
    throw new GarminHttpError(`Garmin: token request failed (${res.status})${hint}`, res.status);
  }

  // the body is the bare JWT, not JSON; anything else is never cached, nor quoted
  const access_token = (await res.text()).trim();
  const expires_at = /^[\x21-\x7e]+$/.test(access_token) ? jwtExpiry(access_token) : null;
  if (expires_at === null) throw new Error('Garmin: token response was not a JWT');
  return { access_token, expires_at, key_id: keyId(apiKey) };
}

/*
 * The kv row is only a cache: a failed read counts as a miss and a failed write
 * is noted and shrugged off, since a token is in hand either way. The error
 * itself is never logged — drizzle puts the query's params, token included, in
 * its message.
 */

async function readToken(store: TokenStore, apiKey: string): Promise<string | null> {
  let stored: Record<string, unknown> | null;
  try {
    stored = safeParse(await store.get(KV_KEYS.token));
  } catch {
    console.error('[garmin] token cache read failed');
    return null;
  }
  return typeof stored?.access_token === 'string' &&
    typeof stored.expires_at === 'number' &&
    stored.expires_at - EXPIRY_MARGIN_MS > Date.now() &&
    stored.key_id === keyId(apiKey)
    ? stored.access_token
    : null;
}

async function saveToken(store: TokenStore, token: AccessToken): Promise<void> {
  try {
    await store.set(KV_KEYS.token, JSON.stringify(token));
  } catch {
    console.error('[garmin] token cache write failed');
  }
}

/** A usable bearer token: the stored one while it lasts, else a newly minted one. */
export async function getAccessToken(store: TokenStore, apiKey: string): Promise<string> {
  const stored = await readToken(store, apiKey);
  if (stored) return stored;
  const token = await mintAccessToken(apiKey);
  await saveToken(store, token);
  return token.access_token;
}

/**
 * Run `fn` with a bearer token, and on a 401 mint a new one and run it once
 * more. exp is not proof a token still works: deleting the key that minted it
 * revokes it on the spot.
 */
export async function withFreshToken<T>(
  store: TokenStore,
  apiKey: string,
  fn: (accessToken: string) => Promise<T>
): Promise<T> {
  const token = await getAccessToken(store, apiKey);
  try {
    return await fn(token);
  } catch (err) {
    if (!isAuthFailure(err)) throw err;
    const fresh = await mintAccessToken(apiKey);
    await saveToken(store, fresh);
    return await fn(fresh.access_token);
  }
}

// Data fetchers (personal.connectapi.garmin.com, Bearer auth)

async function apiFetch(accessToken: string, path: string, accept: string): Promise<Response> {
  const name = `Garmin API ${path.split('?')[0]}`;
  const res = await send(
    `${API}${path}`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: accept } },
    name
  );
  if (!res.ok) throw new GarminHttpError(`${name} failed (${res.status})`, res.status);
  return res;
}

async function apiGet(accessToken: string, path: string): Promise<unknown> {
  const res = await apiFetch(accessToken, path, 'application/json');
  // a day with nothing recorded can come back as an empty 200
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Garmin API ${path.split('?')[0]} returned non-JSON`);
  }
}

/**
 * Resting heart rate (bpm) for the given calendar date, or null. Today's figure
 * appears once the watch has synced the night; until then the 7-day average in
 * the same summary stands in, rather than a day-long empty row.
 */
export async function getRestingHeartRate(
  accessToken: string,
  date: string
): Promise<number | null> {
  const data = asRecord(
    await apiGet(accessToken, `/usersummary-service/usersummary/daily?calendarDate=${date}`)
  );
  for (const v of [data?.restingHeartRate, data?.lastSevenDaysAvgRestingHeartRate]) {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
  }
  return null;
}

/** The account holder's age in whole years — Fitness Age reports it — or null. */
export async function getAge(accessToken: string, date: string): Promise<number | null> {
  const raw = await apiGet(accessToken, `/fitnessage-service/fitnessage/v2/${date}`);
  // documented as an array, served as an object
  const entry = asRecord(Array.isArray(raw) ? raw[raw.length - 1] : raw);
  const age = entry?.chronologicalAge;
  return typeof age === 'number' && Number.isInteger(age) && age > 0 && age < 130 ? age : null;
}

export type Vo2Rating = 'superior' | 'excellent' | 'good' | 'fair' | 'poor';

/**
 * Cooper Institute VO2max norms (ml/kg/min), the scale Garmin rates against.
 * Each row is the lower bound of a category for an age band.
 */
const VO2_NORMS: Record<
  'male' | 'female',
  Array<{ maxAge: number; sup: number; exc: number; good: number; fair: number }>
> = {
  male: [
    { maxAge: 29, sup: 55.4, exc: 51.1, good: 45.4, fair: 41.7 },
    { maxAge: 39, sup: 54.0, exc: 48.3, good: 44.0, fair: 40.5 },
    { maxAge: 49, sup: 52.5, exc: 46.4, good: 42.4, fair: 38.5 },
    { maxAge: 59, sup: 48.9, exc: 43.4, good: 39.2, fair: 35.6 },
    { maxAge: 69, sup: 45.7, exc: 39.5, good: 35.5, fair: 32.3 },
    { maxAge: 200, sup: 42.1, exc: 36.7, good: 32.3, fair: 29.4 }
  ],
  female: [
    { maxAge: 29, sup: 49.6, exc: 43.9, good: 39.5, fair: 36.1 },
    { maxAge: 39, sup: 47.4, exc: 42.4, good: 37.8, fair: 34.4 },
    { maxAge: 49, sup: 45.3, exc: 39.7, good: 36.3, fair: 33.0 },
    { maxAge: 59, sup: 41.1, exc: 36.7, good: 33.0, fair: 30.1 },
    { maxAge: 69, sup: 37.8, exc: 33.0, good: 30.0, fair: 27.5 },
    { maxAge: 200, sup: 36.7, exc: 30.9, good: 28.1, fair: 25.9 }
  ]
};

/** classify a VO2max on Garmin's scale (Cooper norms) → rating word, or null */
export function vo2MaxRating(vo2: number, gender: string, age: number): Vo2Rating | null {
  if (!(vo2 > 0) || !(age > 0)) return null;
  const sex = gender.trim().toUpperCase().startsWith('F') ? 'female' : 'male';
  const bands = VO2_NORMS[sex];
  const band = bands.find((b) => age <= b.maxAge) ?? bands[bands.length - 1]!;
  if (vo2 >= band.sup) return 'superior';
  if (vo2 >= band.exc) return 'excellent';
  if (vo2 >= band.good) return 'good';
  if (vo2 >= band.fair) return 'fair';
  return 'poor';
}

// Activities

export interface GarminActivity {
  activityId: number;
  /** activityType.typeKey, e.g. "running" / "cycling" / "table_tennis" */
  typeKey: string;
  activityName: string;
  /** meters */
  distanceMeters: number;
  /** seconds (moving/elapsed — Garmin's `duration`) */
  durationSeconds: number;
  /** athlete wall clock "YYYY-MM-DD HH:MM:SS" (already IST for this account) */
  startTimeLocal: string;
  /** GMT "YYYY-MM-DD HH:MM:SS" (no zone suffix) */
  startTimeGMT: string;
  /** true when the activity carries a GPS track */
  hasGps: boolean;
}

export interface ActivitySearch {
  limit: number;
  /** YYYY-MM-DD, inclusive, by the activity's local start date */
  startDate?: string;
  /** parent type key; "running" also matches treadmill_running and the rest */
  activityType?: string;
}

/** Activities, newest-first (activitylist-service search). */
export async function getActivities(
  accessToken: string,
  search: ActivitySearch
): Promise<GarminActivity[]> {
  const params = new URLSearchParams({ start: '0', limit: String(search.limit) });
  if (search.startDate) params.set('startDate', search.startDate);
  if (search.activityType) params.set('activityType', search.activityType);
  const raw = await apiGet(
    accessToken,
    `/activitylist-service/activities/search/activities?${params}`
  );
  if (!Array.isArray(raw)) return [];
  const out: GarminActivity[] = [];
  for (const item of raw) {
    const r = asRecord(item);
    const id = r?.activityId;
    if (typeof id !== 'number') continue;
    const type = asRecord(r?.activityType);
    out.push({
      activityId: id,
      typeKey: typeof type?.typeKey === 'string' ? type.typeKey : '',
      activityName: typeof r?.activityName === 'string' ? r.activityName : '',
      distanceMeters: typeof r?.distance === 'number' ? r.distance : 0,
      durationSeconds: typeof r?.duration === 'number' ? r.duration : 0,
      startTimeLocal: typeof r?.startTimeLocal === 'string' ? r.startTimeLocal : '',
      startTimeGMT: typeof r?.startTimeGMT === 'string' ? r.startTimeGMT : '',
      // the Personal API leaves hasPolyline out of the list; a start fix means GPS
      hasGps: r?.hasPolyline === true || typeof r?.startLatitude === 'number'
    });
  }
  return out;
}

/**
 * The activity's original file (a ZIP around the .fit), decoded: the GPS track
 * thinned for drawing, the VO2max estimate, the profile's sex. The Personal API
 * has no route endpoint, so the file is the only source of the track.
 */
export async function getActivityFile(
  accessToken: string,
  activityId: number
): Promise<FitActivity> {
  const res = await apiFetch(
    accessToken,
    `/download-service/files/activity/${activityId}`,
    'application/zip, application/x-zip-compressed, application/octet-stream'
  );
  const fit = parseFitActivity(unzipFit(new Uint8Array(await res.arrayBuffer())));
  return { ...fit, track: thin(fit.track, MAX_TRACK_POINTS) };
}

/**
 * Latest VO2max, read from the newest run files — the Personal API has no
 * VO2max endpoint. Rounded the way Garmin shows it. Treadmill runs get no
 * estimate, so only outdoor ones are opened, up to three in case one lacks it.
 */
export async function getLatestVo2Max(
  accessToken: string
): Promise<{ vo2max: number | null; gender: 'male' | 'female' | null }> {
  const recent = await getActivities(accessToken, { limit: 10, activityType: 'running' });
  const runs = recent.filter((a) => a.hasGps).slice(0, 3);
  let lastError: unknown = null;
  let readAny = false;
  for (const run of runs) {
    try {
      const file = await getActivityFile(accessToken, run.activityId);
      readAny = true;
      if (file.vo2max !== null) return { vo2max: Math.round(file.vo2max), gender: file.gender };
    } catch (err) {
      if (isAuthFailure(err)) throw err;
      lastError = err;
    }
  }
  // files without an estimate are a null; files that wouldn't read are an error worth seeing
  if (!readAny && lastError) throw lastError;
  return { vo2max: null, gender: null };
}
