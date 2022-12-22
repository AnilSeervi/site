import AnimeList from 'components/AnimeList';
import AnimeMetrics from 'components/AnimeMetrics';
import Container from 'components/Container';
import ExternalLink from 'components/ExternalLink';
import fetcher from 'lib/fetcher';
import { AnimeStats } from 'lib/types';
import useSWR from 'swr';

export default function Anime() {
  const { data } = useSWR<AnimeStats>('/api/get-mal-stats', fetcher);
  return (
    <Container
      title="Anime Dashboard"
      description="My personal anime dashboard, with all the animes I've watched and am currently watching with their scores."
      preTitle="Weeb Stats"
      ogDescription="Personal anime dashboard, with all the animes I've watched and am currently watching with their scores."
      image="unsplash/photo-1613376023733-0a73315d9b06"
    >
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /anime
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        This is my personal anime dashboard, with all the animes I've watched,
        am currently watching and plan to watch with their scores.
      </p>
      <h2 className="mt-3 border-t-2 border-gray-200 pt-8 text-2xl font-bold text-black dark:border-gray-700 dark:text-white md:text-3xl">
        Anime Stats
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Here's some of my weeb stats, pulled from my{' '}
        <a
          href="https://myanimelist.net/profile/anilseervi"
          className="transition-colors hover:text-gray-800 dark:hover:text-gray-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          MyAnimeList
          <ExternalLink />
        </a>{' '}
        account. Currently I've watched {data?.days_watched ?? '--'} days of
        anime.
      </p>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        <AnimeMetrics />
      </div>
      <div className="flex w-full flex-col gap-10">
        <AnimeList />
      </div>
    </Container>
  );
}
