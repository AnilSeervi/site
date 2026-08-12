// GitHub OAuth callback. `state` must match the httpOnly cookie set by
// /api/auth/github before the code is exchanged; any failure → redirect.
import type { APIRoute } from 'astro';
import { SESSION_COOKIE, SESSION_MAX_AGE, isSessionConfigured, signSession } from '~/lib/session';
import { STATE_COOKIE } from './github';

export const prerender = false;

const DONE = '/live#guestbook';

interface GithubUser {
  login?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

const gh = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'anil-site-guestbook'
});

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const clientId = import.meta.env.OAUTH_CLIENT_KEY as string | undefined;
  const clientSecret = import.meta.env.OAUTH_CLIENT_SECRET as string | undefined;
  if (!clientId || !clientSecret || !isSessionConfigured) {
    return new Response(JSON.stringify({ disabled: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: '/' });
  if (!code || !state || !expected || state !== expected) return redirect(DONE, 302);

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${url.origin}/api/auth/callback`
      })
    });
    const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string };
    if (!accessToken) return redirect(DONE, 302);

    const userRes = await fetch('https://api.github.com/user', { headers: gh(accessToken) });
    if (!userRes.ok) return redirect(DONE, 302);
    const user = (await userRes.json()) as GithubUser;
    if (!user.login) return redirect(DONE, 302);

    let email = user.email ?? null;
    if (!email) {
      // profile email is private — the user:email scope lets us read the list
      const emailsRes = await fetch('https://api.github.com/user/emails', {
        headers: gh(accessToken)
      });
      if (emailsRes.ok) {
        const emails = (await emailsRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        email = (emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified))
          ?.email ?? null;
      }
    }

    const jwt = await signSession({
      name: user.name ?? user.login,
      login: user.login,
      email,
      avatar: user.avatar_url ?? null
    });
    cookies.set(SESSION_COOKIE, jwt, {
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      path: '/',
      maxAge: SESSION_MAX_AGE
    });
  } catch {
    // upstream hiccup — land back on the page signed out
  }
  return redirect(DONE, 302);
};
