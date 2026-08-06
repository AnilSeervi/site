import type { APIRoute } from 'astro';
import { getSpotifyStatus, isSpotifyConfigured } from '../../lib/spotify';

export const prerender = false;

function json(body: unknown, sMaxAge: number): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`
    }
  });
}

export const GET: APIRoute = async () => {
  if (!isSpotifyConfigured) return json({ disabled: true }, 30);

  try {
    const { status, degraded } = await getSpotifyStatus();
    return json(status, degraded ? 60 : 30);
  } catch {
    // Upstream failure (token exchange etc.) — degrade, never 5xx. `error`
    // matters: without it this body is byte-identical to a genuinely quiet
    // evening, so the page hides the section and a revoked refresh token
    // looks exactly like nobody listening to anything. No detail is carried —
    // the reason lives in the server log, not in a public response.
    return json({ error: true, isPlaying: false, now: null, last: null }, 60);
  }
};
