/**
 * garmin-bootstrap.mjs — one-time interactive Garmin SSO login (password + MFA prompt) that seeds
 * the Turso `kv` table with the long-lived OAuth1 token and a fresh OAuth2 bearer, then verifies
 * via profile displayName. Afterwards the server refreshes OAuth2 from OAuth1 on its own.
 * Run:   node --env-file=.env scripts/garmin-bootstrap.mjs   (node >= 24: imports .ts directly)
 * Needs: GARMIN_EMAIL, GARMIN_PASSWORD, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN
 * Prints a redacted summary only — never token or secret values.
 */
import { createClient } from '@libsql/client';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import {
  loginWithPassword,
  getDisplayName,
  getRestingHeartRate,
  getVo2Max,
  calendarDate,
  KV_KEYS
} from '../src/lib/garmin-core.ts';

const email = process.env.GARMIN_EMAIL;
const password = process.env.GARMIN_PASSWORD;
const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

const missing = [
  !email && 'GARMIN_EMAIL',
  !password && 'GARMIN_PASSWORD',
  !dbUrl && 'TURSO_DATABASE_URL',
  !dbToken && 'TURSO_AUTH_TOKEN'
].filter(Boolean);
if (missing.length > 0) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  console.error('Run as: node --env-file=.env scripts/garmin-bootstrap.mjs');
  process.exit(1);
}

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

const rl = createInterface({ input: stdin, output: stdout });
const promptMfaCode = async () => rl.question('Garmin asked for an MFA code — enter it: ');

const redact = (s) =>
  typeof s === 'string' && s.length > 0 ? `set (${s.length} chars)` : 'missing';

try {
  console.log(`Logging in to Garmin SSO as ${email.replace(/^(.).*(@.*)$/, '$1***$2')} ...`);
  const { oauth1, oauth2 } = await loginWithPassword(store, { email, password }, { promptMfaCode });

  console.log('\nTokens seeded into kv:');
  console.log(
    `  ${KV_KEYS.oauth1}  oauth_token ${redact(oauth1.oauth_token)}, secret ${redact(oauth1.oauth_token_secret)}${oauth1.mfa_token ? `, mfa_token ${redact(oauth1.mfa_token)}` : ''}`
  );
  console.log(
    `  ${KV_KEYS.oauth2}  access_token ${redact(oauth2.access_token)}, expires ${new Date(oauth2.expires_at).toISOString()}`
  );

  const displayName = await getDisplayName(store, oauth2.access_token);
  console.log(`\nVerified — displayName: ${displayName}`);

  const today = calendarDate();
  try {
    const [rhr, vo2] = await Promise.all([
      getRestingHeartRate(oauth2.access_token, displayName, today),
      getVo2Max(oauth2.access_token, today)
    ]);
    console.log(`Today (${today}): restingHr=${rhr ?? 'null'}, vo2max=${vo2 ?? 'null'}`);
  } catch (e) {
    console.log(`Vitals smoke-read failed (tokens are still seeded): ${e.message}`);
  }

  console.log(
    '\nDone. The server now refreshes OAuth2 from the stored OAuth1 token — no more prompts.'
  );
} catch (e) {
  console.error(`\nBootstrap failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  rl.close();
  client.close();
}
