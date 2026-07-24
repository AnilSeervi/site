import type { APIRoute } from 'astro';
import { getGarminMoving } from '~/lib/garmin';
import { isDbConfigured } from '~/lib/db';

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
  // No Turso kv → no stored Garmin tokens to refresh from. Section hides.
  if (!isDbConfigured) return json({ disabled: true }, 60);

  try {
    // Garmin is gentler than Strava on rate limits, but two calls per hit
    // (list + GPS track) still warrant a real cache window.
    return json(await getGarminMoving(), 900);
  } catch {
    // Auth/upstream failure (expired tokens, MFA, Garmin down…) — degrade,
    // never 5xx. Empty payload reads as "no data": the island hides Moving.
    return json({ latest: null, latestAny: null, month: null, days: [] }, 60);
  }
};
