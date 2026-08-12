/** GET /api/auth/me → {user:{login,name}|null}. no-store; never exposes email. */
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
