import type { APIRoute } from 'astro';
import { getMoving, isStravaConfigured } from '../../lib/strava';

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
  if (!isStravaConfigured) return json({ disabled: true }, 60);

  try {
    // Strava rate limits are tight (~200 req / 15 min) — cache a full window
    return json(await getMoving(), 900);
  } catch {
    // Upstream failure (token exchange, API down…) — degrade, never 5xx.
    // Nulls read as "no data": the island hides the whole Moving section.
    return json({ latest: null, latestAny: null, month: null, days: [] }, 60);
  }
};
