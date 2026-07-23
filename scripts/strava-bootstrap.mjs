/**
 * strava-bootstrap.mjs — one-time OAuth bootstrap for /api/strava.
 *
 * Walks you through minting the long-lived refresh token the endpoint needs:
 *   1. asks for your Strava API app's client id + secret,
 *   2. prints the authorize URL (scope activity:read_all, redirect
 *      http://localhost) for you to open in a browser,
 *   3. you approve → the browser lands on http://localhost/?code=… (a dead
 *      page is fine) → paste the code (or the whole redirected URL) here,
 *   4. exchanges it and prints the three STRAVA_* env lines to stdout.
 *
 * Nothing is written to disk — copy the lines into .env / Vercel yourself.
 * See docs/strava-setup.md for the full walkthrough.
 *
 * Usage: node scripts/strava-bootstrap.mjs
 */
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });

// a question asked after stdin closes never resolves — race it so piped /
// aborted input fails loudly instead of hanging
const stdinClosed = new Promise((resolve) => rl.once('close', () => resolve(null)));
const ask = async (q) => {
  const answer = await Promise.race([rl.question(q), stdinClosed]);
  if (answer === null) {
    console.error('\nstdin closed before all answers were given — aborting.');
    process.exit(1);
  }
  return answer.trim();
};

const clientId = await ask('Strava API app Client ID: ');
const clientSecret = await ask('Strava API app Client Secret: ');
if (!clientId || !clientSecret) {
  console.error('\nBoth values are required — create the app at https://www.strava.com/settings/api');
  process.exit(1);
}

const authorize = new URL('https://www.strava.com/oauth/authorize');
authorize.searchParams.set('client_id', clientId);
authorize.searchParams.set('response_type', 'code');
authorize.searchParams.set('redirect_uri', 'http://localhost');
authorize.searchParams.set('approval_prompt', 'force');
authorize.searchParams.set('scope', 'activity:read_all');

console.log('\n1. Open this URL in a browser and hit Authorize:\n');
console.log(`   ${authorize.href}\n`);
console.log('2. The browser will land on http://localhost/?…&code=…&scope=…');
console.log('   (the page itself will fail to load — that is expected).\n');

const pasted = await ask('3. Paste the `code` value (or the whole redirected URL): ');
rl.close();

let code = pasted;
if (pasted.includes('code=')) {
  try {
    code = new URL(pasted).searchParams.get('code') ?? pasted;
  } catch {
    code = pasted.split('code=')[1]?.split('&')[0] ?? pasted;
  }
}
if (!code) {
  console.error('\nNo code — run the script again.');
  process.exit(1);
}

const res = await fetch('https://www.strava.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code'
  })
});

if (!res.ok) {
  console.error(`\nToken exchange failed (${res.status}): ${await res.text()}`);
  console.error('Codes are single-use and short-lived — re-run and paste a fresh one.');
  process.exit(1);
}

const data = await res.json();
if (!data?.refresh_token) {
  console.error('\nUnexpected response — no refresh_token in the payload.');
  process.exit(1);
}

console.log('\nDone. Add these to .env (and the Vercel project env):\n');
console.log(`STRAVA_CLIENT_ID=${clientId}`);
console.log(`STRAVA_CLIENT_SECRET=${clientSecret}`);
console.log(`STRAVA_REFRESH_TOKEN=${data.refresh_token}`);
