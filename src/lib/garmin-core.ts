/**
 * Garmin Connect client: SSO login → long-lived OAuth1 → ~1h OAuth2 bearer.
 * Refresh re-exchanges the stored OAuth1; the password is only needed when
 * OAuth1 is missing or invalid. MFA needs an interactive `promptMfaCode`.
 * Must stay environment-agnostic and erasable-TS-only (node type stripping
 * imports this file directly). Never log token or credential values.
 */
import { createHmac, randomBytes } from 'node:crypto';

// Types

export interface GarminCredentials {
  email: string;
  password: string;
}

/** Minimal async key/value store (backed by the Turso `kv` table). */
export interface TokenStore {
  get(k: string): Promise<string | null>;
  set(k: string, v: string): Promise<void>;
}

export interface OAuthConsumer {
  consumer_key: string;
  consumer_secret: string;
}

export interface OAuth1Token {
  oauth_token: string;
  oauth_token_secret: string;
  /** Present when login went through an MFA challenge; re-sent on exchange. */
  mfa_token?: string;
}

export interface OAuth2Token {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  /** Absolute expiry, ms since epoch (computed from expires_in). */
  expires_at: number;
}

export interface SsoLoginOptions {
  /** Interactive MFA code prompt (bootstrap script only). */
  promptMfaCode?: () => Promise<string>;
}

/** kv-table keys used by the Garmin integration. */
export const KV_KEYS = {
  oauth1: 'garmin:oauth1',
  oauth2: 'garmin:oauth2',
  consumer: 'garmin:consumer',
  displayName: 'garmin:displayName',
  /** epoch ms before which no refresh may be attempted — see REFRESH_BACKOFF_MS */
  backoff: 'garmin:refresh-backoff'
} as const;

/**
 * How long to stop attempting a refresh after Garmin answers 429.
 *
 * The exchange endpoint is rate limited, and nothing here used to know that.
 * Every request that found an expired token started its own exchange, across
 * however many serverless instances were warm, so a site with traffic hammered
 * a limited endpoint and stayed 429 indefinitely — the outage sustained itself
 * and looked exactly like a hard block. One attempt per window instead.
 */
const REFRESH_BACKOFF_MS = 15 * 60_000;

/**
 * Refresh this long before the token actually expires.
 *
 * With a zero margin the first request after expiry pays for the refresh, and
 * every concurrent request alongside it starts one too. A margin means the
 * refresh happens while the current token still works, so a 429 costs nothing
 * and can simply be retried later.
 */
const REFRESH_MARGIN_MS = 30 * 60_000;

export const MFA_REQUIRED_MESSAGE = 'MFA required — run scripts/garmin-bootstrap.mjs';

// Constants (mirroring garth)

const SSO = 'https://sso.garmin.com/sso';
const SSO_EMBED = `${SSO}/embed`;
const CONNECT_API = 'https://connectapi.garmin.com';
const GARTH_CONSUMER_URL = 'https://thegarth.s3.amazonaws.com/oauth_consumer.json';

const USER_AGENT_SSO = 'com.garmin.android.apps.connectmobile';
const USER_AGENT_API = 'GCM-iOS-5.7.2.1';

const SSO_EMBED_PARAMS: Record<string, string> = {
  id: 'gauth-widget',
  embedWidget: 'true',
  gauthHost: SSO
};

const SIGNIN_PARAMS: Record<string, string> = {
  ...SSO_EMBED_PARAMS,
  gauthHost: SSO_EMBED,
  service: SSO_EMBED,
  source: SSO_EMBED,
  redirectAfterAccountLoginUrl: SSO_EMBED,
  redirectAfterAccountCreationUrl: SSO_EMBED
};

// OAuth1 HMAC-SHA1 signing (RFC 5849)

/** RFC 3986 percent-encoding (stricter than encodeURIComponent). */
export function percentEncode(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

/** Query-string pairs, decoded (`+` → space per x-www-form-urlencoded). */
function queryPairs(search: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (const [k, v] of new URLSearchParams(search)) pairs.push([k, v]);
  return pairs;
}

export interface OAuth1SignInput {
  method: string;
  /** Full request URL, query string included. */
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  /** Decoded x-www-form-urlencoded body params, if any. */
  bodyParams?: Record<string, string>;
  /** Overridable for deterministic tests. */
  timestamp?: string;
  nonce?: string;
  /** Include oauth_version="1.0" (default true; RFC test vector omits it). */
  includeVersion?: boolean;
}

export interface OAuth1SignResult {
  /** `Authorization` header value. */
  header: string;
  /** RFC 5849 §3.4.1 base string; scripts/garmin-oauth-selftest.mjs asserts it. */
  baseString: string;
  /** Base64 HMAC-SHA1 signature. */
  signature: string;
}

/** Sign a request per RFC 5849 with HMAC-SHA1; returns the auth header. */
export function oauth1Sign(input: OAuth1SignInput): OAuth1SignResult {
  const u = new URL(input.url);
  const baseUrl = `${u.protocol}//${u.host}${u.pathname}`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: input.consumerKey,
    oauth_nonce: input.nonce ?? randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: input.timestamp ?? Math.floor(Date.now() / 1000).toString()
  };
  if (input.token) oauthParams.oauth_token = input.token;
  if (input.includeVersion !== false) oauthParams.oauth_version = '1.0';

  // Query + body + oauth_* params, percent-encoded then sorted by encoded name
  // then encoded value — order is required by RFC 5849 §3.4.1.3.2.
  const all: Array<[string, string]> = [
    ...queryPairs(u.search),
    ...Object.entries(input.bodyParams ?? {}),
    ...Object.entries(oauthParams)
  ].map(([k, v]) => [percentEncode(k), percentEncode(v)] as [string, string]);
  all.sort(([ak, av], [bk, bv]) => (ak < bk ? -1 : ak > bk ? 1 : av < bv ? -1 : av > bv ? 1 : 0));
  const paramString = all.map(([k, v]) => `${k}=${v}`).join('&');

  const baseString = [
    input.method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(paramString)
  ].join('&');

  const signingKey = `${percentEncode(input.consumerSecret)}&${percentEncode(input.tokenSecret ?? '')}`;
  const signature = createHmac('sha1', signingKey).update(baseString).digest('base64');

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature
  };
  const header =
    'OAuth ' +
    Object.keys(headerParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(headerParams[k])}"`)
      .join(', ');

  return { header, baseString, signature };
}

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

function qs(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

/** Calendar date (YYYY-MM-DD) in the given IANA time zone (default IST). */
export function calendarDate(timeZone: string = 'Asia/Kolkata'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

// Garth consumer key/secret — public constants, not secrets; cached in kv.

let consumerMemo: OAuthConsumer | null = null;

export async function getOAuthConsumer(store: TokenStore): Promise<OAuthConsumer> {
  if (consumerMemo) return consumerMemo;

  const cached = safeParse(await store.get(KV_KEYS.consumer));
  if (typeof cached?.consumer_key === 'string' && typeof cached?.consumer_secret === 'string') {
    consumerMemo = { consumer_key: cached.consumer_key, consumer_secret: cached.consumer_secret };
    return consumerMemo;
  }

  const res = await fetch(GARTH_CONSUMER_URL);
  if (!res.ok) throw new Error(`Garmin: consumer fetch failed (${res.status})`);
  const data = asRecord(await res.json());
  if (typeof data?.consumer_key !== 'string' || typeof data?.consumer_secret !== 'string') {
    throw new Error('Garmin: consumer JSON missing keys');
  }
  consumerMemo = { consumer_key: data.consumer_key, consumer_secret: data.consumer_secret };
  await store.set(KV_KEYS.consumer, JSON.stringify(consumerMemo));
  return consumerMemo;
}

// SSO login — manual cookie jar + redirects, since fetch has no cookie store.

interface SsoResponse {
  status: number;
  text: string;
  finalUrl: string;
}

function createSsoClient() {
  const cookies = new Map<string, string>();

  async function request(
    url: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ): Promise<SsoResponse> {
    let current = url;
    let method = init?.method ?? 'GET';
    let body = init?.body;

    for (let hop = 0; hop < 8; hop++) {
      const headers: Record<string, string> = {
        'User-Agent': USER_AGENT_SSO,
        ...(hop === 0 ? (init?.headers ?? {}) : {})
      };
      if (cookies.size > 0) {
        headers.Cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join('; ');
      }

      const res = await fetch(current, { method, headers, body, redirect: 'manual' });
      for (const sc of res.headers.getSetCookie()) {
        const pair = sc.split(';')[0];
        const i = pair.indexOf('=');
        if (i > 0) cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw new Error(`Garmin SSO: redirect without location (${res.status})`);
        await res.arrayBuffer().catch(() => undefined); // drain
        current = new URL(loc, current).toString();
        if (res.status !== 307 && res.status !== 308) {
          method = 'GET';
          body = undefined;
        }
        continue;
      }

      return { status: res.status, text: await res.text(), finalUrl: current };
    }
    throw new Error('Garmin SSO: too many redirects');
  }

  return { request };
}

function extractCsrf(html: string): string {
  const m = /name="_csrf"\s+value="(.+?)"/.exec(html);
  if (!m) throw new Error('Garmin SSO: CSRF token not found');
  return m[1];
}

function extractTitle(html: string): string {
  return /<title>([\s\S]*?)<\/title>/.exec(html)?.[1]?.trim() ?? '';
}

function extractTicket(html: string): string {
  const m = /embed\?ticket=([^"]+)"/.exec(html);
  if (!m) throw new Error('Garmin SSO: service ticket not found in response');
  return m[1];
}

/**
 * SSO login → one-time service ticket. Throws MFA_REQUIRED_MESSAGE when Garmin
 * asks for a code and no `promptMfaCode` handler was provided.
 */
export async function ssoLogin(creds: GarminCredentials, opts?: SsoLoginOptions): Promise<string> {
  const client = createSsoClient();

  // Cookies must be seeded on the embed widget before the signin page loads.
  await client.request(`${SSO_EMBED}?${qs(SSO_EMBED_PARAMS)}`);

  const signinUrl = `${SSO}/signin?${qs(SIGNIN_PARAMS)}`;
  const page = await client.request(signinUrl, { headers: { Referer: SSO_EMBED } });
  if (page.status !== 200) throw new Error(`Garmin SSO: signin page ${page.status}`);
  const csrf = extractCsrf(page.text);

  const post = await client.request(signinUrl, {
    method: 'POST',
    headers: { Referer: signinUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      username: creds.email,
      password: creds.password,
      embed: 'true',
      _csrf: csrf
    }).toString()
  });
  if (post.status === 429) throw new Error('Garmin SSO: rate limited (429) — try again later');
  if (post.status >= 400) throw new Error(`Garmin SSO: signin POST ${post.status}`);

  let html = post.text;
  const title = extractTitle(html);

  if (title.includes('MFA')) {
    if (!opts?.promptMfaCode) throw new Error(MFA_REQUIRED_MESSAGE);
    const code = (await opts.promptMfaCode()).trim();
    const mfa = await client.request(`${SSO}/verifyMFA/loginEnterMfaCode?${qs(SIGNIN_PARAMS)}`, {
      method: 'POST',
      headers: { Referer: post.finalUrl, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        'mfa-code': code,
        embed: 'true',
        _csrf: extractCsrf(html),
        fromPage: 'setupEnterMfaCode'
      }).toString()
    });
    if (mfa.status >= 400) throw new Error(`Garmin SSO: MFA POST ${mfa.status}`);
    html = mfa.text;
  } else if (!title.includes('Success')) {
    throw new Error(`Garmin SSO: login failed (page title: ${title || 'unknown'})`);
  }

  return extractTicket(html);
}

// OAuth token exchanges

/** Service ticket → long-lived OAuth1 token. */
export async function getOAuth1Token(
  ticket: string,
  consumer: OAuthConsumer
): Promise<OAuth1Token> {
  const u = new URL(`${CONNECT_API}/oauth-service/oauth/preauthorized`);
  u.searchParams.set('ticket', ticket);
  u.searchParams.set('login-url', SSO_EMBED);
  u.searchParams.set('accepts-mfa-tokens', 'true');

  const { header } = oauth1Sign({
    method: 'GET',
    url: u.toString(),
    consumerKey: consumer.consumer_key,
    consumerSecret: consumer.consumer_secret
  });

  const res = await fetch(u, {
    headers: { Authorization: header, 'User-Agent': USER_AGENT_SSO }
  });
  if (!res.ok) throw new Error(`Garmin: OAuth1 preauthorized failed (${res.status})`);

  const parsed = new URLSearchParams(await res.text());
  const token = parsed.get('oauth_token');
  const secret = parsed.get('oauth_token_secret');
  if (!token || !secret) throw new Error('Garmin: OAuth1 response missing token fields');

  const out: OAuth1Token = { oauth_token: token, oauth_token_secret: secret };
  const mfaToken = parsed.get('mfa_token');
  if (mfaToken) out.mfa_token = mfaToken;
  return out;
}

/** OAuth1 → OAuth2 bearer (~1h); the OAuth1 token stays reusable for refresh. */
export async function exchangeOAuth2(
  oauth1: OAuth1Token,
  consumer: OAuthConsumer
): Promise<OAuth2Token> {
  const url = `${CONNECT_API}/oauth-service/oauth/exchange/user/2.0`;
  const bodyParams: Record<string, string> = oauth1.mfa_token
    ? { mfa_token: oauth1.mfa_token }
    : {};

  const { header } = oauth1Sign({
    method: 'POST',
    url,
    consumerKey: consumer.consumer_key,
    consumerSecret: consumer.consumer_secret,
    token: oauth1.oauth_token,
    tokenSecret: oauth1.oauth_token_secret,
    bodyParams
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: header,
      'User-Agent': USER_AGENT_SSO,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(bodyParams).toString()
  });
  if (!res.ok) {
    // GarminHttpError, not Error: the caller has to see 429 to back off
    throw new GarminHttpError(`Garmin: OAuth2 exchange failed (${res.status})`, res.status);
  }

  const data = asRecord(await res.json());
  if (typeof data?.access_token !== 'string') {
    throw new Error('Garmin: OAuth2 response missing access_token');
  }
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;

  const out: OAuth2Token = {
    access_token: data.access_token,
    token_type: typeof data.token_type === 'string' ? data.token_type : 'Bearer',
    expires_at: Date.now() + expiresIn * 1000
  };
  if (typeof data.refresh_token === 'string') out.refresh_token = data.refresh_token;
  return out;
}

// Orchestration

/** Full password login chain; seeds kv with both tokens. */
export async function loginWithPassword(
  store: TokenStore,
  creds: GarminCredentials,
  opts?: SsoLoginOptions
): Promise<{ oauth1: OAuth1Token; oauth2: OAuth2Token }> {
  const consumer = await getOAuthConsumer(store);
  const ticket = await ssoLogin(creds, opts);
  const oauth1 = await getOAuth1Token(ticket, consumer);
  await store.set(KV_KEYS.oauth1, JSON.stringify(oauth1));
  const oauth2 = await exchangeOAuth2(oauth1, consumer);
  await store.set(KV_KEYS.oauth2, JSON.stringify(oauth2));
  return { oauth1, oauth2 };
}

/**
 * Valid OAuth2 bearer: reuse a fresh stored one, else re-exchange the stored
 * OAuth1 without the password, else password login (may throw on MFA).
 */
export async function getAccessToken(
  store: TokenStore,
  creds: GarminCredentials | null,
  opts?: SsoLoginOptions
): Promise<string> {
  /** why the no-password refresh gave up, for the error thrown at the end */
  let refreshFailure: string | null = null;

  const stored2 = safeParse(await store.get(KV_KEYS.oauth2));
  const storedToken =
    typeof stored2?.access_token === 'string' && typeof stored2.expires_at === 'number'
      ? { token: stored2.access_token, expiresAt: stored2.expires_at }
      : null;

  // Still comfortably valid — nothing to do.
  if (storedToken && storedToken.expiresAt > Date.now() + REFRESH_MARGIN_MS) {
    return storedToken.token;
  }

  // Inside the margin, or expired. A refresh is wanted, but the old token may
  // still work, so a failed refresh below is not necessarily fatal.
  const backoffUntil = Number(safeParse(await store.get(KV_KEYS.backoff))?.until ?? 0);
  if (backoffUntil > Date.now()) {
    if (storedToken && storedToken.expiresAt > Date.now()) return storedToken.token;
    const mins = Math.ceil((backoffUntil - Date.now()) / 60_000);
    throw new Error(
      `Garmin: refresh rate limited, backing off for ${mins}m, and the stored token has expired`
    );
  }

  const stored1 = safeParse(await store.get(KV_KEYS.oauth1));
  if (typeof stored1?.oauth_token === 'string' && typeof stored1.oauth_token_secret === 'string') {
    const oauth1: OAuth1Token = {
      oauth_token: stored1.oauth_token,
      oauth_token_secret: stored1.oauth_token_secret
    };
    if (typeof stored1.mfa_token === 'string') oauth1.mfa_token = stored1.mfa_token;
    // Three unrelated things can fail in here: the consumer lookup (a kv read,
    // or an S3 fetch when it is not cached), the exchange POST, and the kv
    // write of the new token. They used to collapse into one bare catch whose
    // comment asserted "OAuth1 invalid/expired" — a cause it never
    // established — and the throw below then reported "no stored tokens" even
    // though oauth1 was sitting right there. That cost days of looking in the
    // wrong place. Record which step actually failed.
    let stage = 'consumer';
    try {
      const consumer = await getOAuthConsumer(store);
      stage = 'exchange';
      const oauth2 = await exchangeOAuth2(oauth1, consumer);
      stage = 'kv write';
      await store.set(KV_KEYS.oauth2, JSON.stringify(oauth2));
      return oauth2.access_token;
    } catch (err) {
      refreshFailure = `${stage} — ${(err as Error)?.message ?? String(err)}`;
      // 429 means the exchange is rate limited. Stop every other instance from
      // trying for a while, or they keep the limit tripped and nothing recovers.
      if (err instanceof GarminHttpError && err.status === 429) {
        await store
          .set(KV_KEYS.backoff, JSON.stringify({ until: Date.now() + REFRESH_BACKOFF_MS }))
          .catch(() => {});
      }
    }
  }

  // The refresh failed, but an unexpired token beats no data: this is the whole
  // point of refreshing early rather than on the first request past expiry.
  if (storedToken && storedToken.expiresAt > Date.now()) return storedToken.token;

  if (!creds) {
    throw new Error(
      refreshFailure
        ? `Garmin: refresh failed at ${refreshFailure}, and no credentials to fall back on`
        : 'Garmin: no stored tokens and no credentials'
    );
  }
  const { oauth2 } = await loginWithPassword(store, creds, opts);
  return oauth2.access_token;
}

// Data fetchers (connectapi.garmin.com, Bearer auth)

/** Carries the HTTP status so callers can tell "re-auth" from "upstream broke". */
export class GarminHttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GarminHttpError';
    this.status = status;
  }
}

async function apiGet(accessToken: string, path: string): Promise<unknown> {
  const res = await fetch(`${CONNECT_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': USER_AGENT_API }
  });
  if (!res.ok) {
    throw new GarminHttpError(
      `Garmin API ${path.split('?')[0]} failed (${res.status})`,
      res.status
    );
  }
  return res.json();
}

/**
 * Run `fn` with an access token, and on 401/403 mint a new one and run it once
 * more.
 *
 * expires_at is not proof a token still works. Garmin invalidates the previous
 * access token when oauth1 is exchanged again, so any second consumer of the
 * same oauth1 — a dev machine alongside production, say — silently kills the
 * other's token well before it expires. Without this the stored token is
 * returned happily until expiry and every call 401s.
 */
export async function withFreshToken<T>(
  store: TokenStore,
  creds: GarminCredentials | null,
  fn: (accessToken: string) => Promise<T>,
  opts?: SsoLoginOptions
): Promise<T> {
  const token = await getAccessToken(store, creds, opts);
  try {
    return await fn(token);
  } catch (err) {
    const status = err instanceof GarminHttpError ? err.status : 0;
    if (status !== 401 && status !== 403) throw err;
    // Another writer — the scheduled refresh job, or a parallel instance — may
    // have exchanged since this token was read, which is exactly what kills a
    // token mid-flight. The 401 then belongs to the OLD token, and blindly
    // dropping kv here would destroy the fresh one and force an exchange from
    // an IP that cannot make one. Re-read first and retry with what's stored.
    const stored = safeParse(await store.get(KV_KEYS.oauth2));
    if (
      typeof stored?.access_token === 'string' &&
      stored.access_token !== token &&
      typeof stored.expires_at === 'number' &&
      stored.expires_at > Date.now()
    ) {
      try {
        return await fn(stored.access_token);
      } catch (err2) {
        const status2 = err2 instanceof GarminHttpError ? err2.status : 0;
        if (status2 !== 401 && status2 !== 403) throw err2;
      }
    }
    // drop the rejected token so getAccessToken cannot hand it back
    await store.set(KV_KEYS.oauth2, JSON.stringify({ expires_at: 0 }));
    const fresh = await getAccessToken(store, creds, opts);
    return await fn(fresh);
  }
}

/** displayName via userprofile-service/socialProfile, cached in kv. */
export async function getDisplayName(store: TokenStore, accessToken: string): Promise<string> {
  const cached = await store.get(KV_KEYS.displayName);
  if (cached) return cached;

  const profile = asRecord(await apiGet(accessToken, '/userprofile-service/socialProfile'));
  const displayName = profile?.displayName;
  if (typeof displayName !== 'string' || displayName.length === 0) {
    throw new Error('Garmin: socialProfile missing displayName');
  }
  await store.set(KV_KEYS.displayName, displayName);
  return displayName;
}

/** Resting heart rate (bpm) for the given calendar date, or null. */
export async function getRestingHeartRate(
  accessToken: string,
  displayName: string,
  date: string
): Promise<number | null> {
  const data = asRecord(
    await apiGet(
      accessToken,
      `/usersummary-service/usersummary/daily/${encodeURIComponent(displayName)}?calendarDate=${date}`
    )
  );
  const rhr = data?.restingHeartRate;
  return typeof rhr === 'number' && Number.isFinite(rhr) && rhr > 0 ? rhr : null;
}

/** Latest VO2max (generic.vo2MaxValue) as of the given date, or null. */
export async function getVo2Max(accessToken: string, date: string): Promise<number | null> {
  const raw = await apiGet(accessToken, `/metrics-service/metrics/maxmet/latest/${date}`);
  // Endpoint is documented to return an object, but can return an array.
  const entry = asRecord(Array.isArray(raw) ? raw[raw.length - 1] : raw);
  const generic = asRecord(entry?.generic);
  const vo2 = generic?.vo2MaxValue;
  return typeof vo2 === 'number' && Number.isFinite(vo2) && vo2 > 0 ? vo2 : null;
}

/** gender + birthDate — maxmet returns a VO2max value but no age/sex rating. */
export async function getPersonalInfo(
  accessToken: string
): Promise<{ gender: string | null; birthDate: string | null }> {
  const data = asRecord(
    await apiGet(accessToken, '/userprofile-service/userprofile/personal-information')
  );
  return {
    gender: typeof data?.gender === 'string' ? data.gender : null,
    birthDate: typeof data?.birthDate === 'string' ? data.birthDate : null
  };
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

/** whole years between an ISO birthDate ("YYYY-MM-DD") and now, or null */
export function ageFromBirthDate(birthDate: string): number | null {
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - b.getUTCFullYear();
  const m = now.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

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
  hasPolyline: boolean;
}

/** Recent activities, newest-first (activitylist-service search). */
export async function getActivities(accessToken: string, limit = 60): Promise<GarminActivity[]> {
  const raw = await apiGet(
    accessToken,
    `/activitylist-service/activities/search/activities?start=0&limit=${limit}`
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
      hasPolyline: r?.hasPolyline === true
    });
  }
  return out;
}

/**
 * GPS track as [lat, lon] pairs, empty when none. maxChartSize=0 suppresses the
 * unused chart payload; only geoPolylineDTO is read.
 */
export async function getActivityTrack(
  accessToken: string,
  activityId: number
): Promise<Array<[number, number]>> {
  const data = asRecord(
    await apiGet(
      accessToken,
      `/activity-service/activity/${activityId}/details?maxChartSize=0&maxPolylineSize=1000`
    )
  );
  const poly = asRecord(data?.geoPolylineDTO)?.polyline;
  if (!Array.isArray(poly)) return [];
  const pts: Array<[number, number]> = [];
  for (const p of poly) {
    const r = asRecord(p);
    if (typeof r?.lat === 'number' && typeof r?.lon === 'number') pts.push([r.lat, r.lon]);
  }
  return pts;
}
