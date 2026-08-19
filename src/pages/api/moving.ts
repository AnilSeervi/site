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
  // no db → no stored Garmin tokens to refresh from; the island hides the section
  if (!isDbConfigured) return json({ disabled: true }, 60);

  try {
    // two upstream calls per hit (list + GPS track) — 900s cache window
    return json(await getGarminMoving(), 900);
  } catch (err) {
    // auth/upstream failure must not 5xx — an empty payload reads as "no data"
    // and the island hides the section. Log the reason: an empty payload is
    // indistinguishable from "nothing recorded lately", which is how a dead
    // token hid here for three days.
    console.error('[moving] garmin failed, serving empty payload:', (err as Error)?.message);
    return json({ latest: null, latestAny: null, month: null, days: [] }, 60);
  }
};
