/**
 * GET /api/auth/me — {user: {login, name} | null} for client-side state
 * toggling ('sign with github →' vs 'signed in as <login>'). Session-derived,
 * so never cached (no-store) and never exposes the email.
 */
import type { APIRoute } from 'astro';
import { readSession } from '~/lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const session = await readSession(cookies);
  return new Response(
    JSON.stringify({ user: session ? { login: session.login, name: session.name } : null }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
  );
};
