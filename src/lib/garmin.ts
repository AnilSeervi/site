/**
 * Garmin Connect — Astro-facing wrapper around src/lib/garmin-core.ts.
 *
 * Binds the environment-agnostic core to this app: credentials from
 * import.meta.env (GARMIN_EMAIL / GARMIN_PASSWORD) and a TokenStore over the
 * Turso `kv` table via the drizzle singleton. Server-only — never import from
 * client code, and never log token or credential values.
 *
 * The interactive bootstrap (scripts/garmin-bootstrap.mjs) uses garmin-core
 * directly with process.env + @libsql/client; this module is the read/refresh
 * path the server uses forever after. MFA can never be answered here — the
 * core throws MFA_REQUIRED_MESSAGE and /api/fitness degrades to the file
 * fallback.
 */
import { db, isDbConfigured } from '~/lib/db';
import { kv } from '~/lib/schema';
import { eq } from 'drizzle-orm';
import {
  getAccessToken,
  getActivities,
  getActivityTrack,
  getDisplayName,
  getRestingHeartRate,
  getVo2Max,
  getPersonalInfo,
  ageFromBirthDate,
  vo2MaxRating,
  calendarDate,
  KV_KEYS,
  type Vo2Rating
} from '~/lib/garmin-core';
import type { GarminCredentials, TokenStore } from '~/lib/garmin-core';
import { buildMovingPayload, isRunOrRide, type MovingPayload } from '~/lib/moving';

const EMAIL = import.meta.env.GARMIN_EMAIL as string | undefined;
const PASSWORD = import.meta.env.GARMIN_PASSWORD as string | undefined;

/** True when GARMIN_EMAIL + GARMIN_PASSWORD are present in the env. */
export const hasGarminCredentials = Boolean(EMAIL && PASSWORD);

/** TokenStore over the Turso kv table. Requires isDbConfigured. */
export const kvStore: TokenStore = {
  async get(k: string): Promise<string | null> {
    const row = await db().select({ v: kv.v }).from(kv).where(eq(kv.k, k)).get();
    return row?.v ?? null;
  },
  async set(k: string, v: string): Promise<void> {
    const updatedAt = Date.now();
    await db()
      .insert(kv)
      .values({ k, v, updatedAt })
      .onConflictDoUpdate({ target: kv.k, set: { v, updatedAt } });
  }
};

/** True when a bootstrap has seeded OAuth tokens into kv. Never throws. */
export async function hasStoredGarminTokens(): Promise<boolean> {
  if (!isDbConfigured) return false;
  try {
    return (
      (await kvStore.get(KV_KEYS.oauth1)) !== null ||
      (await kvStore.get(KV_KEYS.oauth2)) !== null
    );
  } catch {
    return false;
  }
}

export interface GarminFitness {
  vo2max: number | null;
  restingHr: number | null;
  /** Garmin's fitness rating for the VO2max (Cooper norms, age+sex), or null */
  vo2maxRating: Vo2Rating | null;
}

/**
 * Live vitals from Garmin Connect. Throws on any auth or upstream failure
 * (including an MFA challenge) — callers degrade to data/fitness.json.
 */
export async function getGarminFitness(): Promise<GarminFitness> {
  if (!isDbConfigured) throw new Error('Garmin: Turso kv store not configured');

  const creds: GarminCredentials | null =
    hasGarminCredentials && EMAIL && PASSWORD ? { email: EMAIL, password: PASSWORD } : null;

  const accessToken = await getAccessToken(kvStore, creds);
  const displayName = await getDisplayName(kvStore, accessToken);
  const today = calendarDate();

  const [restingHr, vo2max, personal] = await Promise.all([
    getRestingHeartRate(accessToken, displayName, today),
    getVo2Max(accessToken, today),
    getPersonalInfo(accessToken)
  ]);

  // classify on Garmin's own scale (maxmet gives the value, not the rating)
  let vo2maxRating: Vo2Rating | null = null;
  if (vo2max !== null && personal.gender && personal.birthDate) {
    const age = ageFromBirthDate(personal.birthDate);
    if (age !== null) vo2maxRating = vo2MaxRating(vo2max, personal.gender, age);
  }

  return { vo2max, restingHr, vo2maxRating };
}

/**
 * MOVING section payload from Garmin activities (replaces /api/strava).
 * Two Garmin calls per cache window: the activity list, then the GPS track of
 * the newest run/ride for the route etching. Throws on any auth/upstream
 * failure — /api/moving degrades to an empty payload (section hides).
 */
export async function getGarminMoving(): Promise<MovingPayload> {
  if (!isDbConfigured) throw new Error('Garmin: Turso kv store not configured');

  const creds: GarminCredentials | null =
    hasGarminCredentials && EMAIL && PASSWORD ? { email: EMAIL, password: PASSWORD } : null;

  const accessToken = await getAccessToken(kvStore, creds);
  // 80 covers a 90-day window comfortably even for a busy log
  const acts = await getActivities(accessToken, 80);

  const gps = acts.find((a) => a.hasPolyline && isRunOrRide(a.typeKey)) ?? null;
  const track = gps ? await getActivityTrack(accessToken, gps.activityId) : [];

  return buildMovingPayload(acts, gps, track);
}
