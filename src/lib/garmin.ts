/**
 * Astro-facing wrapper around src/lib/garmin-core.ts: credentials from
 * import.meta.env, TokenStore over the Turso `kv` table. Server-only — never
 * import from client code, and never log token or credential values.
 * MFA cannot be answered here; the core throws MFA_REQUIRED_MESSAGE.
 */
import { db, isDbConfigured } from '~/lib/db';
import { kv } from '~/lib/schema';
import { eq } from 'drizzle-orm';
import {
  withFreshToken,
  GarminHttpError,
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
      (await kvStore.get(KV_KEYS.oauth1)) !== null || (await kvStore.get(KV_KEYS.oauth2)) !== null
    );
  } catch {
    return false;
  }
}

export interface GarminFitness {
  vo2max: number | null;
  restingHr: number | null;
  /** fitness rating for the VO2max (Cooper norms, age+sex), or null */
  vo2maxRating: Vo2Rating | null;
}

/** Live vitals from Garmin. Throws on any auth/upstream failure, MFA included. */
export async function getGarminFitness(): Promise<GarminFitness> {
  if (!isDbConfigured) throw new Error('Garmin: Turso kv store not configured');

  const creds: GarminCredentials | null =
    hasGarminCredentials && EMAIL && PASSWORD ? { email: EMAIL, password: PASSWORD } : null;

  const today = calendarDate();

  /**
   * allSettled, not all: three independent readings, and Promise.all threw the
   * other two away whenever one hiccupped. The endpoint then served the file
   * fallback — which holds nulls — so both vitals rows vanished from the page
   * over a single transient failure. Observed in production: five consecutive
   * probes returned live data while a page load moments earlier got nulls.
   *
   * Auth failures must still reach withFreshToken or a stale token would be
   * swallowed here and never re-minted, so if every call failed on 401/403 the
   * first is rethrown to trigger one re-auth and retry.
   */
  const settled = await withFreshToken(kvStore, creds, async (accessToken) => {
    const displayName = await getDisplayName(kvStore, accessToken);
    const results = await Promise.allSettled([
      getRestingHeartRate(accessToken, displayName, today),
      getVo2Max(accessToken, today),
      getPersonalInfo(accessToken)
    ]);

    const authFailed = results.filter(
      (r) =>
        r.status === 'rejected' &&
        r.reason instanceof GarminHttpError &&
        (r.reason.status === 401 || r.reason.status === 403)
    );
    if (authFailed.length === results.length) {
      throw (authFailed[0] as PromiseRejectedResult).reason;
    }
    return results;
  });

  const restingHr = settled[0].status === 'fulfilled' ? settled[0].value : null;
  const vo2max = settled[1].status === 'fulfilled' ? settled[1].value : null;
  const personal =
    settled[2].status === 'fulfilled' ? settled[2].value : { gender: null, birthDate: null };

  // maxmet returns the value but not the rating, so classify locally
  let vo2maxRating: Vo2Rating | null = null;
  if (vo2max !== null && personal.gender && personal.birthDate) {
    const age = ageFromBirthDate(personal.birthDate);
    if (age !== null) vo2maxRating = vo2MaxRating(vo2max, personal.gender, age);
  }

  return { vo2max, restingHr, vo2maxRating };
}

/**
 * MOVING payload from Garmin activities. Two calls per cache window: the
 * activity list, then the GPS track of the newest run/ride. Throws on failure.
 */
export async function getGarminMoving(): Promise<MovingPayload> {
  if (!isDbConfigured) throw new Error('Garmin: Turso kv store not configured');

  const creds: GarminCredentials | null =
    hasGarminCredentials && EMAIL && PASSWORD ? { email: EMAIL, password: PASSWORD } : null;

  return withFreshToken(kvStore, creds, async (accessToken) => {
    // 80 covers a 90-day window even for a busy log
    const acts = await getActivities(accessToken, 80);
    const gps = acts.find((a) => a.hasPolyline && isRunOrRide(a.typeKey)) ?? null;
    const track = gps ? await getActivityTrack(accessToken, gps.activityId) : [];
    return buildMovingPayload(acts, gps, track);
  });
}
