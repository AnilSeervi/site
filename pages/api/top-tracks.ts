import { type NextRequest } from 'next/server';
import { getTopArtists, getTopTracks } from 'lib/spotify';

export const config = {
  runtime: 'edge'
};

export default async function handler(req: NextRequest) {
  const response = await getTopTracks();

  const { items } = await response.json();

  const tracks = items.map((track) => ({
    artist: track.artists.map((_artist) => _artist.name).join(', '),
    songUrl: track.external_urls.spotify,
    title: track.name,
    image: track.album.images[0].url,
    previewUrl: track.preview_url,
    id: track.id
  }));

  return new Response(JSON.stringify({ tracks }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, s-maxage=86400, stale-while-revalidate=43200'
    }
  });
}
