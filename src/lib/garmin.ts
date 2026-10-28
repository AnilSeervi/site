/**
 * Astro-facing wrapper around src/lib/garmin-core.ts: the API key from
 * import.meta.env, the bearer token cached in the Turso `kv` table (or in
 * memory when there is no database). Server-only — never import from client
 * code, and never log token or key values.
 */
import { db, isDbConfigured } from '~/lib/db';
import { kv } from '~/lib/schema';
import { eq } from 'drizzle-orm';
import {
  withFreshToken,
  isAuthFailure,
  getActivities,
  getActivityFile,
  getAge,
  getLatestVo2Max,
  getRestingHeartRate,
  vo2MaxRating,
  calendarDate,
  type Vo2Rating
} from '~/lib/garmin-core';
import type { TokenStore } from '~/lib/garmin-core';
import { buildMovingPayload, isRunOrRide, WINDOW_DAYS, type MovingPayload } from '~/lib/moving';

const API_KEY = (import.meta.env.GARMIN_API_KEY as string | undefined)?.trim();

/** True when GARMIN_API_KEY is present in the env. */
export const hasGarminKey = Boolean(API_KEY);

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

/** Without a database each warm instance mints and keeps its own token. */
const memory = new Map<string, string>();
const memoryStore: TokenStore = {
  async get(k: string): Promise<string | null> {
    return memory.get(k) ?? null;
  },
  async set(k: string, v: string): Promise<void> {
    memory.set(k, v);
  }
};

const store: TokenStore = isDbConfigured ? kvStore : memoryStore;

function apiKey(): string {
  if (!API_KEY) throw new Error('Garmin: GARMIN_API_KEY is not set');
  return API_KEY;
}

export interface GarminFitness {
  vo2max: number | null;
  restingHr: number | null;
  /** fitness rating for the VO2max (Cooper norms, age+sex), or null */
  vo2maxRating: Vo2Rating | null;
  /** a reading failed rather than came back empty, so the answer should not be cached long */
  degraded: boolean;
}

/**
 * Live vitals from Garmin. Throws when no token can be had or every reading
 * fails auth; any other failed reading comes back null, logged and `degraded`.
 */
export async function getGarminFitness(): Promise<GarminFitness> {
  const key = apiKey();
  const today = calendarDate();

  /**
   * allSettled, not all: three independent readings, and Promise.all threw the
   * other two away whenever one hiccupped. The endpoint then served the file
   * fallback — which holds nulls — so both vitals rows vanished from the page
   * over a single transient failure. Observed in production: five consecutive
   * probes returned live data while a page load moments earlier got nulls.
   *
   * Auth failures must still reach withFreshToken or a stale token would be
   * swallowed here and never re-minted, so if every call failed on a 401 the
   * first is rethrown to trigger one re-mint and retry.
   */
  const settled = await withFreshToken(store, key, async (accessToken) => {
    const results = await Promise.allSettled([
      getRestingHeartRate(accessToken, today),
      getLatestVo2Max(accessToken),
      getAge(accessToken, today)
    ]);

    const authFailed = results.filter((r) => r.status === 'rejected' && isAuthFailure(r.reason));
    if (authFailed.length === results.length) {
      throw (authFailed[0] as PromiseRejectedResult).reason;
    }
    return results;
  });

  // a reading that failed reads as a missing value, so say which and why
  const labels = ['resting hr', 'vo2max', 'age'];
  settled.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[fitness] garmin ${labels[i]} failed:`, (r.reason as Error)?.message);
    }
  });

  const restingHr = settled[0].status === 'fulfilled' ? settled[0].value : null;
  const { vo2max, gender } =
    settled[1].status === 'fulfilled' ? settled[1].value : { vo2max: null, gender: null };
  const age = settled[2].status === 'fulfilled' ? settled[2].value : null;

  // Garmin's own rating isn't served, so classify locally
  const vo2maxRating =
    vo2max !== null && gender !== null && age !== null ? vo2MaxRating(vo2max, gender, age) : null;

  const degraded = settled.some((r) => r.status === 'rejected');
  return { vo2max, restingHr, vo2maxRating, degraded };
}

/**
 * MOVING payload from Garmin activities. Two calls per cache window: the
 * window's activity list, then the file of the newest run/ride for its route.
 * Throws on token or activity-list failure; a route file that won't download
 * or decode costs only the etching.
 */
export async function getGarminMoving(): Promise<MovingPayload> {
  const key = apiKey();

  return withFreshToken(store, key, async (accessToken) => {
    // the whole strip window by date — a count cap cut its first days on busy weeks
    const acts = await getActivities(accessToken, {
      limit: 200,
      startDate: calendarDate(WINDOW_DAYS - 1)
    });
    const gps = acts.find((a) => a.hasGps && isRunOrRide(a.typeKey)) ?? null;

    let track: Array<[number, number]> = [];
    if (gps) {
      try {
        track = (await getActivityFile(accessToken, gps.activityId)).track;
      } catch (err) {
        // auth goes back to withFreshToken; anything else (a GPX upload, a file
        // the decoder can't read) costs the etching, not the section
        if (isAuthFailure(err)) throw err;
        console.error('[moving] garmin route unavailable:', (err as Error)?.message);
      }
    }
    return buildMovingPayload(acts, gps, track);
  });
}
