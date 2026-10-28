/**
 * garmin-check.mjs — live smoke test of the Garmin Personal API key: mints a
 * token, then reads everything the site shows (resting HR, VO2max and its
 * rating, the activity window, the newest route). Touches no database; the
 * token lives in memory for the run.
 * Run:   node --env-file=.env scripts/garmin-check.mjs   (node >= 24: imports .ts directly)
 * Needs: GARMIN_API_KEY (make one at connect.garmin.com/app/settings/personalApiToken)
 * Prints expiries, counts and readings only — never token or key values.
 */
import {
  mintAccessToken,
  getRestingHeartRate,
  getLatestVo2Max,
  getAge,
  vo2MaxRating,
  getActivities,
  getActivityFile,
  calendarDate
} from '../src/lib/garmin-core.ts';
import { isRunOrRide, WINDOW_DAYS } from '../src/lib/moving.ts';

const apiKey = process.env.GARMIN_API_KEY?.trim();
if (!apiKey) {
  console.error('Missing env var: GARMIN_API_KEY');
  console.error('Run as: node --env-file=.env scripts/garmin-check.mjs');
  process.exit(1);
}

/** run one reading; a failure is printed and the rest still run */
async function step(label, fn) {
  try {
    return await fn();
  } catch (e) {
    process.exitCode = 1;
    console.log(`  ${label}: FAILED — ${e.message}`);
    return undefined;
  }
}

try {
  const token = await mintAccessToken(apiKey);
  const hours = ((token.expires_at - Date.now()) / 3_600_000).toFixed(1);
  console.log(
    `token minted (${token.access_token.length} chars), expires ${new Date(token.expires_at).toISOString()} (${hours}h)\n`
  );
  const t = token.access_token;
  const today = calendarDate();

  const rhr = await step('resting hr', () => getRestingHeartRate(t, today));
  if (rhr !== undefined) console.log(`  resting hr (${today}): ${rhr ?? 'null'}`);

  const vo2 = await step('vo2max', () => getLatestVo2Max(t));
  const age = await step('age', () => getAge(t, today));
  if (vo2 !== undefined) {
    const rating =
      vo2.vo2max !== null && vo2.gender && typeof age === 'number'
        ? vo2MaxRating(vo2.vo2max, vo2.gender, age)
        : null;
    console.log(
      `  vo2max: ${vo2.vo2max ?? 'null'}, rating: ${rating ?? 'null'} (sex ${vo2.gender ? 'known' : 'unknown'}, age ${typeof age === 'number' ? 'known' : 'unknown'})`
    );
  }

  const acts = await step('activities', () =>
    getActivities(t, { limit: 200, startDate: calendarDate(WINDOW_DAYS - 1) })
  );
  if (acts) {
    console.log(`  activities in the ${WINDOW_DAYS}-day window: ${acts.length}`);
    const gps = acts.find((a) => a.hasGps && isRunOrRide(a.typeKey));
    if (gps) {
      const file = await step('route', () => getActivityFile(t, gps.activityId));
      if (file) {
        console.log(
          `  newest route: ${gps.typeKey} on ${gps.startTimeLocal.slice(0, 10)}, ${file.track.length} points after thinning`
        );
      }
    } else {
      console.log('  newest route: none in the window');
    }
  }

  console.log(process.exitCode ? '\nSome readings failed.' : '\nAll readings OK.');
} catch (e) {
  console.error(`\nCheck failed: ${e.message}`);
  process.exitCode = 1;
}
