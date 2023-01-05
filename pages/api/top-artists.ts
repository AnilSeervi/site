import { getTopArtists } from 'lib/spotify';
import { type NextRequest } from 'next/server';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: NextRequest) {
  const response = await getTopArtists();
  const { items } = await response.json();

  const artists = items.slice(0, 13).map((artist) => ({
    artistUrl: artist.external_urls.spotify,
    name: artist.name,
    followers: artist.followers.total,
    image: artist.images[2].url
  }));

  return new Response(JSON.stringify({ artists }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=43200'
    }
  });
}
