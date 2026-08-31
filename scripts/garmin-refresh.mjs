/**
 * garmin-refresh.mjs — scheduled OAuth2 refresh, run from GitHub Actions.
 *
 * The exchange endpoint (oauth-service/oauth/exchange/user/2.0) is rate limited
 * per IP, and Vercel's shared egress IPs have no quota left — every exchange
 * from production 429s. GitHub runners (and this laptop) have quota. So the
 * exchange happens here on a schedule and production only ever READS the token
 * from kv; it never needs to mint one itself.
 *
 * Run:   node --env-file=.env.production.local scripts/garmin-refresh.mjs
 * Needs: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN (kv holds the OAuth1 token —
 *        seeded once by scripts/garmin-bootstrap.mjs; no Garmin password here)
 * Env:   FORCE=1 exchanges even when the stored token is still fresh
 * Prints expiries and lengths only — never token or secret values.
 */
import { createClient } from '@libsql/client';
import { getOAuthConsumer, exchangeOAuth2, KV_KEYS } from '../src/lib/garmin-core.ts';

// Refresh when less than this remains. Tokens last ~24h and the job runs every
// 6h, so 12h means roughly two exchanges a day and a missed run costs nothing.
const MIN_REMAINING_MS = 12 * 60 * 60_000;
// A failed exchange is not fatal while the stored token still has this long —
// the next scheduled run retries well before production feels anything.
const SOFT_FAIL_REMAINING_MS = 2 * 60 * 60_000;

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;
const force = process.env.FORCE === '1' || process.env.FORCE === 'true';

if (!dbUrl || !dbToken) {
  console.error('Missing env vars: TURSO_DATABASE_URL and/or TURSO_AUTH_TOKEN');
  process.exit(1);
}
console.log(`kv store: ${new URL(dbUrl.replace(/^libsql:/, 'https:')).host}`);

const client = createClient({ url: dbUrl, authToken: dbToken });

/** TokenStore over the kv table (plain @libsql/client — no Astro imports). */
const store = {
  async get(k) {
    const res = await client.execute({ sql: 'SELECT v FROM kv WHERE k = ?', args: [k] });
    const v = res.rows[0]?.v;
    return typeof v === 'string' ? v : null;
  },
  async set(k, v) {
    await client.execute({
      sql: `INSERT INTO kv (k, v, updatedAt) VALUES (?, ?, ?)
            ON CONFLICT(k) DO UPDATE SET v = excluded.v, updatedAt = excluded.updatedAt`,
      args: [k, v, Date.now()]
    });
  }
};

const hours = (ms) => (ms / 3_600_000).toFixed(1);

function parseStored(raw) {
  try {
    const v = JSON.parse(raw ?? 'null');
    return typeof v === 'object' && v !== null ? v : null;
  } catch {
    return null;
  }
}

try {
  const stored2 = parseStored(await store.get(KV_KEYS.oauth2));
  const remaining =
    typeof stored2?.expires_at === 'number' ? stored2.expires_at - Date.now() : -Infinity;

  if (remaining > MIN_REMAINING_MS && !force) {
    console.log(`token still fresh — ${hours(remaining)}h left, nothing to do (FORCE=1 overrides)`);
    process.exit(0);
  }
  console.log(
    remaining > 0
      ? `token has ${hours(remaining)}h left — refreshing`
      : 'token expired — refreshing'
  );

  const stored1 = parseStored(await store.get(KV_KEYS.oauth1));
  if (typeof stored1?.oauth_token !== 'string' || typeof stored1?.oauth_token_secret !== 'string') {
    console.error(`no OAuth1 token in kv (${KV_KEYS.oauth1}) — run scripts/garmin-bootstrap.mjs`);
    process.exit(1);
  }

  try {
    const consumer = await getOAuthConsumer(store);
    const oauth2 = await exchangeOAuth2(stored1, consumer);
    await store.set(KV_KEYS.oauth2, JSON.stringify(oauth2));
    // a fresh token makes any standing 429 backoff stale — lift it
    await store.set(KV_KEYS.backoff, JSON.stringify({ until: 0 }));
    console.log(
      `refreshed — access_token set (${oauth2.access_token.length} chars), expires ${new Date(oauth2.expires_at).toISOString()} (${hours(oauth2.expires_at - Date.now())}h)`
    );
  } catch (err) {
    if (remaining > SOFT_FAIL_REMAINING_MS) {
      console.log(
        `exchange failed (${err.message}) but the stored token has ${hours(remaining)}h left — the next run retries`
      );
      process.exit(0);
    }
    console.error(`exchange failed with no usable stored token: ${err.message}`);
    process.exit(1);
  }
} finally {
  client.close();
}
