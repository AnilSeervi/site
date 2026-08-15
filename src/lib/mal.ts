/**
 * MyAnimeList fetchers (refresh-token OAuth flow).
 * MAL may rotate the refresh token per refresh; the rotated token is not persisted.
 */

const TOKEN_ENDPOINT = 'https://myanimelist.net/v1/oauth2/token';
const API_BASE = 'https://api.myanimelist.net/v2';

const clientId = import.meta.env.MAL_CLIENT_ID;
const clientSecret = import.meta.env.MAL_CLIENT_SECRET;
const refreshToken = import.meta.env.MAL_REFRESH_TOKEN;

export const isMALConfigured = Boolean(clientId && clientSecret && refreshToken);

/** MAL serves `medium` at ~225px and `large` at ~600px; some entries have neither. */
interface MALPicture {
  medium?: string;
  large?: string;
}

/** medium is plenty — the preview caps at 176px tall. */
const pictureUrl = (p?: MALPicture): string | null => p?.medium ?? p?.large ?? null;

export interface MALWatching {
  title: string;
  ep: number;
  epTotal: number | null;
  updatedAt: string;
  /** poster URL, or null when the entry has no picture */
  art: string | null;
  /** myanimelist page for the entry, or null when MAL gave no id */
  url: string | null;
}

export interface MALManga {
  title: string;
  /** chapters read; MAL tracks these separately from volumes */
  ch: number;
  chTotal: number | null;
  vol: number;
  /** poster URL, or null when the entry has no picture */
  art: string | null;
  /** myanimelist page for the entry, or null when MAL gave no id */
  url: string | null;
}

export interface MALShelf {
  anime: number;
  episodes: number;
  days: number;
  mean: number;
}

export async function getAccessToken(): Promise<string> {
  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!res.ok) throw new Error(`MAL token refresh failed: ${res.status}`);

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('MAL token refresh returned no access token');
  return data.access_token;
}

async function malFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`MAL request failed: ${res.status} ${path.split('?')[0]}`);
  return res.json() as Promise<T>;
}

/** Most recently updated 'watching' anime, or null if the list is empty. */
export async function getWatching(accessToken: string): Promise<MALWatching | null> {
  const data = await malFetch<{
    data?: Array<{
      node?: { id?: number; title?: string; num_episodes?: number; main_picture?: MALPicture };
      list_status?: { num_episodes_watched?: number; updated_at?: string };
    }>;
  }>(
    '/users/@me/animelist?status=watching&sort=list_updated_at&fields=list_status,num_episodes,main_picture&limit=1',
    accessToken
  );

  const entry = data.data?.[0];
  if (!entry?.node?.title) return null;

  return {
    title: entry.node.title,
    ep: entry.list_status?.num_episodes_watched ?? 0,
    // MAL reports 0 for shows whose episode count isn't finalized.
    epTotal: entry.node.num_episodes ? entry.node.num_episodes : null,
    updatedAt: entry.list_status?.updated_at ?? '',
    art: pictureUrl(entry.node.main_picture),
    url: entry.node.id ? `https://myanimelist.net/anime/${entry.node.id}` : null
  };
}

/** Most recently updated 'reading' manga. */
export async function getManga(accessToken: string): Promise<MALManga | null> {
  const data = await malFetch<{
    data?: Array<{
      node?: { id?: number; title?: string; num_chapters?: number; main_picture?: MALPicture };
      list_status?: { num_chapters_read?: number; num_volumes_read?: number };
    }>;
  }>(
    '/users/@me/mangalist?status=reading&sort=list_updated_at&fields=list_status,num_chapters,main_picture&limit=1',
    accessToken
  );

  const entry = data.data?.[0];
  if (!entry?.node?.title) return null;

  return {
    title: entry.node.title,
    ch: entry.list_status?.num_chapters_read ?? 0,
    // MAL reports 0 for unfinalized chapter counts, same as episodes.
    chTotal: entry.node.num_chapters ? entry.node.num_chapters : null,
    vol: entry.list_status?.num_volumes_read ?? 0,
    art: pictureUrl(entry.node.main_picture),
    url: entry.node.id ? `https://myanimelist.net/manga/${entry.node.id}` : null
  };
}

export async function getShelf(accessToken: string): Promise<MALShelf | null> {
  const data = await malFetch<{
    anime_statistics?: {
      num_items?: number;
      num_episodes?: number;
      num_days?: number;
      mean_score?: number;
    };
  }>('/users/@me?fields=anime_statistics', accessToken);

  const stats = data.anime_statistics;
  if (!stats) return null;

  return {
    anime: stats.num_items ?? 0,
    episodes: stats.num_episodes ?? 0,
    days: stats.num_days ?? 0,
    mean: stats.mean_score ?? 0
  };
}
