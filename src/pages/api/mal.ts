import type { APIRoute } from 'astro';
import { isMALConfigured, getAccessToken, getWatching, getManga, getShelf } from '../../lib/mal';

export const prerender = false;

const json = (body: unknown, sMaxAge: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`
    }
  });

export const GET: APIRoute = async () => {
  if (!isMALConfigured) return json({ disabled: true }, 300);

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch {
    return json({ watching: null, manga: null, shelf: null }, 60);
  }

  // `undefined` marks an upstream failure; a legit empty list resolves to null.
  const [watching, manga, shelf] = await Promise.all([
    getWatching(accessToken).catch(() => undefined),
    getManga(accessToken).catch(() => undefined),
    getShelf(accessToken).catch(() => undefined)
  ]);

  const failed = watching === undefined || manga === undefined || shelf === undefined;

  return json(
    {
      watching: watching ?? null,
      manga: manga ?? null,
      shelf: shelf ?? null
    },
    failed ? 60 : 300
  );
};
