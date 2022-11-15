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
};

export type Anime = {
  id: number;
  title: string;
  score: number;
  status: string;
  episodes: number;
  image: string;
  start_date: string;
  finish_date: string;
};

export type Animes = Anime[];

export type AnimeStats = {
  name: string;
  mean_score: number;
  episodes: number;
  watching: number;
  completed: number;
  plan_to_watch: number;
  on_hold: number;
  dropped: number;
  total: number;
  days_watched: number;
};

export type Snippet = {
  _id: string;
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

export type Subscribers = {
  count: number;
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
