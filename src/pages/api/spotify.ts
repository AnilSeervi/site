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
    // Degrade, never 5xx. `error` distinguishes failure from nothing-playing; no detail leaked.
    return json({ error: true, isPlaying: false, now: null, last: null }, 60);
  }
};
