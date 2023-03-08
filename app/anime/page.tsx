import AnimeList from 'components/AnimeList';
import AnimeMetrics from 'components/AnimeMetrics';
import ExternalLink from 'components/ExternalLink';
import { getMAL, getMALStats } from 'lib/mal';
import { AnimeListNode, AnimeStats, GenericError } from 'lib/types';
import { getOG } from 'utils/og';

export const revalidate = 86400; // 24 hours

export const metadata = {
  title: 'Anime Dashboard',
  description:
    "My personal anime dashboard, with all the animes I've watched and am currently watching with their scores.",
  openGraph: {
    title: 'Anime Dashboard',
    description:
      "Personal anime dashboard, with all the animes I've watched and am currently watching with their scores.",
    images: [
      {
        url: getOG({
          title: 'Anime Dashboard',
          description:
            "Personal anime dashboard, with all the animes I've watched and am currently watching with their scores.",
          slug: '/anime',
          preTitle: 'Weeb Stats',
          image: 'unsplash/photo-1613376023733-0a73315d9b06'
        }),
        width: 1920,
        height: 1080,
        alt: 'Anime Dashboard'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anime Dashboard',
    images: [
      {
        url: getOG({
          title: 'Anime Dashboard',
          description:
            "Personal anime dashboard, with all the animes I've watched and am currently watching with their scores.",
          slug: '/anime',
          preTitle: 'Weeb Stats',
          image: 'unsplash/photo-1613376023733-0a73315d9b06'
        }),
        width: 1920,
        height: 1080,
        alt: 'Anime Dashboard'
      }
    ]
  }
};

async function Anime() {
  let animeStats: AnimeStats = null;
  let animeList: AnimeListNode[] = null;
  let animeStatErr: GenericError = null;
  let animeListErr: GenericError = null;
  try {
    const animeStatsRes = await getMALStats();
    animeStats = await animeStatsRes.json();
  } catch (err: any) {
    animeStatErr = {
      message: err.message
    };
  }
  try {
    const animeListRes = await getMAL();
    animeList = (await animeListRes.json())?.data;
  } catch (err: any) {
    animeListErr = {
      message: err.message
    };
  }

  return (
    <>
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
        account. Currently I've watched{' '}
        {animeStats.anime_statistics.num_days ?? '--'} days of anime.
      </p>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        <AnimeMetrics animeStats={animeStats} error={animeStatErr} />
      </div>
      <div className="flex w-full flex-col gap-10">
        <AnimeList animeList={animeList} error={animeListErr} />
      </div>
    </>
  );
}

export default Anime;
