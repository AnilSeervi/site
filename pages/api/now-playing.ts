import { type NextRequest } from 'next/server';
import { getNowPlaying, getRecentlyPlayed } from 'lib/spotify';

export const config = {
  runtime: 'edge'
};

const buildEmptyResponse = () =>
  new Response(JSON.stringify({ isPlaying: false }), {
    status: 200,
    headers: {
      'content-type': 'application/json'
    }
  });

const getRecentTrackResponse = async () => {
  const recentResponse = await getRecentlyPlayed();
  if (!recentResponse.ok) {
    return buildEmptyResponse();
  }
  
  const recent = await recentResponse.json();
  const recentTrack = recent?.items?.[0]?.track;
  if (!recentTrack) {
    return buildEmptyResponse();
  }

  const title = recentTrack.name;
  const artist = recentTrack.artists.map((_artist) => _artist.name).join(', ');
  const album = recentTrack.album.name;
  const albumImageUrl =
    recentTrack.album.images?.[2]?.url ?? recentTrack.album.images?.[0]?.url;
  const songUrl = recentTrack.external_urls.spotify;
  const previewUrl = recentTrack.preview_url;

  return new Response(
    JSON.stringify({
      album,
      albumImageUrl,
      artist,
      isPlaying: false,
      songUrl,
      title,
      previewUrl
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    }
  );
};

export default async function handler(req: NextRequest) {
  const response = await getNowPlaying();
  
  let nowPlayingData: {
    album?: string;
    albumImageUrl?: string;
    artist?: string;
    isPlaying: boolean;
    songUrl?: string;
    title?: string;
    previewUrl?: string;
  } = { isPlaying: false };

  if (response.status !== 204 && response.status <= 400) {
    const song = await response.json();
    if (song?.item && song?.is_playing) {
      nowPlayingData = {
        album: song.item.album.name,
        albumImageUrl:
          song.item.album.images?.[2]?.url ?? song.item.album.images?.[0]?.url,
        artist: song.item.artists.map((_artist) => _artist.name).join(', '),
        isPlaying: song.is_playing,
        songUrl: song.item.external_urls.spotify,
        title: song.item.name,
        previewUrl: song.item.preview_url
      };
    }
  }

  if (!nowPlayingData.isPlaying) {
    return getRecentTrackResponse();
  }

  return new Response(
    JSON.stringify(nowPlayingData),
    {
      status: 200,
      headers: {
        'content-type': 'application/json'
      }
    }
  );
}
