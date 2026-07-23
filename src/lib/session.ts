/**
 * Guestbook session — a jose-signed HS256 JWT in the `as-session` httpOnly
 * cookie (30d). Secret: SESSION_SECRET, falling back to NEXTAUTH_SECRET
 * (carried over from the old site). Server-only.
 */
import type { AstroCookies } from 'astro';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'as-session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, seconds

export interface SessionUser {
  name: string;
  login: string;
  email: string | null;
  avatar: string | null;
}

const secret = (import.meta.env.SESSION_SECRET ?? import.meta.env.NEXTAUTH_SECRET) as
  | string
  | undefined;

/** True when a signing secret is present. */
export const isSessionConfigured = Boolean(secret);

function key(): Uint8Array {
  if (!secret) throw new Error('SESSION_SECRET / NEXTAUTH_SECRET is not configured');
  return new TextEncoder().encode(secret);
}

/** Sign a 30-day session JWT for the given user. */
export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    login: user.login,
    email: user.email,
    avatar: user.avatar
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key());
}

/** Verify a session JWT — null on any failure (bad signature, expired, malformed). */
export async function verifySession(token: string): Promise<SessionUser | null> {
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    if (typeof payload.login !== 'string' || !payload.login) return null;
    return {
      name: typeof payload.name === 'string' && payload.name ? payload.name : payload.login,
      login: payload.login,
      email: typeof payload.email === 'string' ? payload.email : null,
      avatar: typeof payload.avatar === 'string' ? payload.avatar : null
    };
  } catch {
    return null;
  }
}

/** Read + verify the session cookie from an Astro request. */
export async function readSession(cookies: AstroCookies): Promise<SessionUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}
