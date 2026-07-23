/**
 * GET /api/auth/github — kick off the GitHub OAuth flow.
 *
 * Redirects to github.com/login/oauth/authorize with a random `state` echoed
 * into a short-lived httpOnly cookie (verified by /api/auth/callback).
 * NOTE: the GitHub OAuth app must list <origin>/api/auth/callback as its
 * callback URL (prod + localhost dev).
 */
import type { APIRoute } from 'astro';

export const prerender = false;

export const STATE_COOKIE = 'as-oauth-state';

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  const clientId = import.meta.env.OAUTH_CLIENT_KEY as string | undefined;
  if (!clientId) {
    return new Response(JSON.stringify({ disabled: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const state = crypto.randomUUID();
  cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    path: '/',
    maxAge: 600 // 10 minutes — plenty for a round-trip to GitHub
  });

  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('redirect_uri', `${url.origin}/api/auth/callback`);
  authorize.searchParams.set('scope', 'read:user user:email');
  authorize.searchParams.set('state', state);

  return redirect(authorize.toString(), 302);
};
