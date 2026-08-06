/**
 * spotify-token.mjs — mint a fresh SPOTIFY_REFRESH_TOKEN.
 *
 * Spotify revokes refresh tokens when the account password changes, the app is
 * removed under Account → Apps with access, or the client secret is rotated.
 * The symptom is a 400 `invalid_grant` on every token exchange, which is not
 * something code can recover from: the authorization-code flow needs a human
 * at a browser, which is what this script drives.
 *
 * The redirect URI is the production site, so the callback lands there rather
 * than on this machine — there is no local server to catch it. The flow is
 * therefore manual: authorize, then paste the URL you were redirected to back
 * into the terminal. Pasting the whole URL (not just the code) is what lets
 * the script verify the `state` it generated.
 *
 * It never prints the refresh token. The new value is written straight into
 * `.env` and copied to the clipboard so it can be pasted into Vercel; the
 * terminal only ever sees its length.
 *
 * Prerequisite (one time): `https://anil.vercel.app` must be listed in the
 * app's Redirect URIs at developer.spotify.com/dashboard. Spotify matches it
 * byte-for-byte, so REDIRECT below has to spell it exactly — no path, no
 * trailing slash.
 *
 * Usage: node scripts/spotify-token.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const ENV_FILE = '.env';
const KEY = 'SPOTIFY_REFRESH_TOKEN';
/** must equal the dashboard entry exactly — Spotify does no normalising */
const REDIRECT = 'https://anil.vercel.app';
/** exactly what src/lib/spotify.ts calls — no more */
const SCOPES = 'user-read-currently-playing user-read-recently-played';

function readEnv(file) {
  const out = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue;
    const i = line.indexOf('=');
    out[line.slice(0, i).trim()] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return out;
}

/** replace the key's line in place, preserving every other line and comment */
function writeKey(file, key, value) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const i = lines.findIndex((l) => l.trim().startsWith(`${key}=`));
  if (i === -1) lines.push(`${key}=${value}`);
  else lines[i] = `${key}=${value}`;
  writeFileSync(file, lines.join('\n'));
}

const env = readEnv(ENV_FILE);
if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) {
  console.error(`missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET in ${ENV_FILE}`);
  process.exit(1);
}

const state = randomUUID();
const authorizeUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
  client_id: env.SPOTIFY_CLIENT_ID,
  response_type: 'code',
  redirect_uri: REDIRECT,
  scope: SCOPES,
  state,
  // force the consent screen even if the app is already authorized — a silent
  // re-approval can hand back the same revoked grant
  show_dialog: 'true'
})}`;

console.log('\nopening the consent screen. if it does not open, visit:\n');
console.log(authorizeUrl + '\n');
spawn('open', [authorizeUrl], { stdio: 'ignore', detached: true }).unref();

console.log(`you will land on ${REDIRECT} with ?code=… in the address bar.`);
console.log('copy that whole URL and paste it here.\n');

const rl = createInterface({ input: stdin, output: stdout });
const answer = (await rl.question('redirected URL (or bare code): ')).trim();
rl.close();

let code = answer;
if (/^https?:\/\//.test(answer)) {
  const url = new URL(answer);
  const err = url.searchParams.get('error');
  if (err) {
    console.error(`\nauthorization denied: ${err}`);
    process.exit(1);
  }
  code = url.searchParams.get('code') ?? '';
  const back = url.searchParams.get('state');
  if (back !== state) {
    console.error('\nstate mismatch — that URL is from a different run. Start over.');
    process.exit(1);
  }
} else {
  // a bare code carries no state, so the CSRF check is skipped; harmless when
  // the value came straight off your own screen, worth knowing all the same
  console.warn('\n(no state to verify — pasting the full URL next time checks it)');
}

if (!code) {
  console.error('\nno code found in that input — nothing written.');
  process.exit(1);
}

const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
const res = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT })
});

if (!res.ok) {
  // error bodies carry error/error_description only — safe to surface
  console.error(`\ntoken exchange failed: HTTP ${res.status}`);
  console.error(await res.text());
  console.error(`\n"Invalid redirect URI" → ${REDIRECT} is not on the app's Redirect URIs at`);
  console.error('developer.spotify.com/dashboard, or does not match byte-for-byte.');
  console.error('"invalid_grant" → the code was already used or is older than ~10 minutes.');
  console.error('Run this again for a fresh one.');
  process.exit(1);
}

const data = await res.json();
if (!data.refresh_token) {
  console.error('\nno refresh_token in the response — nothing written.');
  process.exit(1);
}

writeKey(ENV_FILE, KEY, data.refresh_token);
spawn('pbcopy', { stdio: ['pipe', 'ignore', 'ignore'] }).stdin.end(data.refresh_token);

console.log(`\n✓ ${KEY} written to ${ENV_FILE} (${data.refresh_token.length} chars) and copied to the clipboard.`);
console.log('  granted scopes:', data.scope ?? '(none reported)');
console.log('\nnext: paste it into the Vercel project env, then restart the dev server.');
