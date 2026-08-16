/**
 * Spotify data helpers — refresh-token OAuth flow.
 * Server-only: reads SPOTIFY_CLIENT_ID / _SECRET / _REFRESH_TOKEN. Never import from client code.
 */

const CLIENT_ID = import.meta.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.SPOTIFY_REFRESH_TOKEN;

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

export const isSpotifyConfigured = Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);

export interface SpotifyNow {
  title: string;
  artist: string;
  url: string;
  /** album cover URL, or null when the track has no artwork */
  art: string | null;
  /** Name of the playlist being played from, when applicable. */
  context: string | null;
}

export interface SpotifyLast {
  title: string;
  artist: string;
  url: string;
  /** album cover URL, or null when the track has no artwork */
  art: string | null;
  /** ISO timestamp of when the track finished playing. */
  playedAt: string;
}

export interface SpotifyStatus {
  isPlaying: boolean;
  now: SpotifyNow | null;
  last: SpotifyLast | null;
}

interface SpotifyTrack {
  type?: string;
  name?: string;
  artists?: Array<{ name?: string }>;
  external_urls?: { spotify?: string };
  album?: { images?: Array<{ url?: string; width?: number; height?: number }> };
}

/**
 * Smallest album image at least ART_MIN_PX wide. Spotify returns 640/300/64;
 * the art is dithered down to an 18-cell grid, so 640 is ~40x more pixels than
 * survive the reduction, and 64 is too soft once the contrast stretch runs.
 */
const ART_MIN_PX = 128;

function albumArt(track: SpotifyTrack): string | null {
  const usable = (track.album?.images ?? [])
    .filter((i): i is { url: string; width: number } => !!i.url && (i.width ?? 0) >= ART_MIN_PX)
    .sort((a, b) => a.width - b.width);
  return usable[0]?.url ?? track.album?.images?.[0]?.url ?? null;
}

/** Exchange the long-lived refresh token for a short-lived access token. */
async function getAccessToken(): Promise<string> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN
    })
  });

  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const data = await res.json();
  if (!data?.access_token) throw new Error('Spotify token response missing access_token');
  return data.access_token as string;
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function trackFields(track: SpotifyTrack): {
  title: string;
  artist: string;
  url: string;
  art: string | null;
} {
  return {
    title: track.name ?? '',
    artist: (track.artists ?? [])
      .map((a) => a.name)
      .filter(Boolean)
      .join(', '),
    url: track.external_urls?.spotify ?? '',
    art: albumArt(track)
  };
}

/** Fetch the playlist's display name; null on any failure. */
async function getPlaylistName(token: string, href: string): Promise<string | null> {
  try {
    const url = new URL(href);
    url.searchParams.set('fields', 'name');
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.name === 'string' && data.name.length > 0 ? data.name : null;
  } catch {
    return null;
  }
}

/** me/player/currently-playing: 204 or empty body → not playing; only `track` items count. */
async function getNowPlaying(
  token: string
): Promise<{ isPlaying: boolean; now: SpotifyNow | null }> {
  const res = await fetch(NOW_PLAYING_ENDPOINT, { headers: authHeaders(token) });

  if (res.status === 204) return { isPlaying: false, now: null };
  if (!res.ok) throw new Error(`Spotify currently-playing failed: ${res.status}`);

  const text = await res.text();
  if (!text) return { isPlaying: false, now: null };

  const data = JSON.parse(text);
  const item: SpotifyTrack | null = data?.item ?? null;
  if (!item || item.type !== 'track') return { isPlaying: false, now: null };

  const context =
    data?.context?.type === 'playlist' && typeof data.context.href === 'string'
      ? await getPlaylistName(token, data.context.href)
      : null;

  return {
    isPlaying: data?.is_playing === true,
    now: { ...trackFields(item), context }
  };
}

/** me/player/recently-played?limit=1 → most recently finished track. */
async function getRecentlyPlayed(token: string): Promise<SpotifyLast | null> {
  const res = await fetch(RECENTLY_PLAYED_ENDPOINT, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Spotify recently-played failed: ${res.status}`);

  const data = await res.json();
  const entry = data?.items?.[0];
  if (!entry?.track) return null;

  return { ...trackFields(entry.track), playedAt: entry.played_at ?? '' };
}

/** Full status for /api/spotify. Throws if the token exchange fails; per-fetch failures set `degraded`. */
export async function getSpotifyStatus(): Promise<{ status: SpotifyStatus; degraded: boolean }> {
  const token = await getAccessToken();

  const [nowResult, lastResult] = await Promise.allSettled([
    getNowPlaying(token),
    getRecentlyPlayed(token)
  ]);

  let degraded = false;
  let isPlaying = false;
  let now: SpotifyNow | null = null;
  let last: SpotifyLast | null = null;

  if (nowResult.status === 'fulfilled') {
    ({ isPlaying, now } = nowResult.value);
  } else {
    degraded = true;
  }

  if (lastResult.status === 'fulfilled') {
    last = lastResult.value;
  } else {
    degraded = true;
  }

  return { status: { isPlaying, now, last }, degraded };
}
