import { MDXRemoteSerializeResult } from 'next-mdx-remote';

export type Post = {
  _id: string;
  slug: string;
  content: MDXRemoteSerializeResult;
  title: string;
  date: string;
  excerpt: string;
  coverImage: string;
  readingTime: string;
  tweets: any[];
  coverURL: string;
  _createdAt: string;
  _updatedAt: string;
};

export type ListStatus =
  | 'finished_airing'
  | 'currently_airing'
  | 'not_yet_aired';
export type MyListStatus =
  | 'watching'
  | 'completed'
  | 'on_hold'
  | 'dropped'
  | 'plan_to_watch';

export type MangaStatus =
  | 'finished'
  | 'currently_publishing'
  | 'not_yet_published';

export type MangaListStatus =
  | 'reading'
  | 'completed'
  | 'on_hold'
  | 'dropped'
  | 'plan_to_read';

export type MyAnimeList = {
  id: number;
  title: string;
  main_picture: {
    large: string;
    medium: string;
  };
  status: ListStatus;
  media_type: 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'music' | 'unknown';
  num_episodes: number;
  my_list_status: {
    status: MyListStatus;
    score: number;
    num_episodes_watched: number;
    start_date: string;
    finish_date: string;
    updated_at: string;
    is_rewatching: boolean;
  };
};

export type MyMangaStats = {
  total: number;
  reading: number;
  completed: number;
  on_hold: number;
  dropped: number;
  plan_to_read: number;
  mean_score: number;
  read: number;
};

export type MyMangaList = {
  id: number;
  title: string;
  main_picture: {
    large: string;
    medium: string;
  };
  status: MangaStatus;
  media_type: 'manga' | 'novel' | 'oneshot' | 'doujin' | 'manhwa' | 'manhua';
  num_chapters: number;
  num_volumes: number;
  my_list_status: {
    status: MangaListStatus;
    score: number;
    num_chapters_read: number;
    num_volumes_read: number;
    start_date: string;
    finish_date: string;
    updated_at: string;
    is_rereading: boolean;
  };
};

export type MangaListNode = {
  node: MyMangaList;
};

export type AnimeListNode = {
  node: MyAnimeList;
};

export type GenericError = {
  message: string;
};

export type AnimeStats = {
  id: number;
  name: string;
  birthday: string;
  joined_at: string;
  location: string;
  anime_statistics: {
    num_items_watching: number;
    num_items_completed: number;
    num_items_on_hold: number;
    num_items_dropped: number;
    num_items_plan_to_watch: number;
    num_items: number;
    num_days_watched: number;
    num_days_watching: number;
    num_days_completed: number;
    num_days_on_hold: number;
    num_days_dropped: number;
    num_days: number;
    num_episodes: number;
    num_times_rewatched: number;
    mean_score: number;
  };
};

export type Snippet = {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  slug: string;
  content: MDXRemoteSerializeResult;
  title: string;
  description: string;
  logo: string;
};

export enum Form {
  Initial,
  Loading,
  Success,
  Error
}

export type FormState = {
  state: Form;
  message?: string;
};

export type PostLikes = {
  likes: string;
  currentUserLikes: string;
};

export type Views = {
  total: string;
};

export type Likes = {
  total: string;
};

export type Stats = {
  views: string;
  likes: string;
};

export type GuestbookType = {
  id: string;
  email: string;
  body: string;
  created_by: string;
  updated_at: string;
};

export type Song = {
  songUrl: string;
  artist: string;
  title: string;
  image: string;
  previewUrl: string;
  id: string;
};

export type NowPlayingSong = {
  album: string;
  albumImageUrl: string;
  artist: string;
  isPlaying: boolean;
  songUrl: string;
  title: string;
  previewUrl: string;
};

export type TopTracks = {
  tracks: Song[];
};

export type Artist = {
  artistUrl: string;
  name: string;
  followers: number;
  image: string;
};

export type TopArtists = {
  artists: Artist[];
};

export type GitHub = {
  stars: number;
  followers: number;
};
