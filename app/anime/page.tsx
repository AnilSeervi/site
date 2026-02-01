import AnimeList from 'components/AnimeList';
import AnimeMetrics from 'components/AnimeMetrics';
import ExternalLink from 'components/ExternalLink';
import MangaList from 'components/MangaList';
import MangaMetrics from 'components/MangaMetrics';
import { getMAL, getMALManga, getMALStats } from 'lib/mal';
import {
  AnimeListNode,
  AnimeStats,
  GenericError,
  MangaListNode,
  MyMangaStats
} from 'lib/types';
import { getOG } from 'utils/og';

export const revalidate = 300;

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
        width: 1280,
        height: 720,
        alt: 'Anime Dashboard'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Anime Dashboard',
    description:
      "Personal anime dashboard, with all the animes I've watched and am currently watching with their scores.",
    images: {
      url: getOG({
        title: 'Anime Dashboard',
        description:
          "Personal anime dashboard, with all the animes I've watched and am currently watching with their scores.",
        slug: '/anime',
        preTitle: 'Weeb Stats',
        image: 'unsplash/photo-1613376023733-0a73315d9b06'
      }),
      width: 1280,
      height: 720,
      alt: 'Anime Dashboard'
    }
  }
};

async function Anime() {
  let animeStats: AnimeStats = null;
  let animeList: AnimeListNode[] = null;
  let animeStatErr: GenericError = null;
  let animeListErr: GenericError = null;
  let mangaList: MangaListNode[] = null;
  let mangaListErr: GenericError = null;
  let mangaStats: MyMangaStats = null;

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
    console.error(err);
    animeListErr = {
      message: err.message
    };
  }

  try {
    const mangaListRes = await getMALManga();
    mangaList = (await mangaListRes.json())?.data;

    if (mangaList && mangaList.length > 0) {
      const scoredManga = mangaList.filter((manga) => manga.node.my_list_status.score);
      mangaStats = mangaList.reduce(
        (acc, manga) => {
          if (manga.node.my_list_status.status === 'reading') {
            acc.reading += 1;
          } else if (manga.node.my_list_status.status === 'plan_to_read') {
            acc.plan_to_read += 1;
          } else if (manga.node.my_list_status.status === 'completed') {
            acc.completed += 1;
          } else if (manga.node.my_list_status.status === 'on_hold') {
            acc.on_hold += 1;
          } else if (manga.node.my_list_status.status === 'dropped') {
            acc.dropped += 1;
          }
          acc.read += manga.node.my_list_status.num_chapters_read;
          return acc;
        },
        {
          total: mangaList.length,
          read: 0,
          mean_score: scoredManga.length > 0
            ? scoredManga.reduce((acc, manga) => acc + manga.node.my_list_status.score, 0) / scoredManga.length
            : 0,
          reading: 0,
          plan_to_read: 0,
          completed: 0,
          on_hold: 0,
          dropped: 0
        }
      );
    }
  } catch (err: any) {
    console.log(err);
    mangaListErr = {
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
          href="https://myanimelist.net/animelist/anilseervi"
          className="transition-colors hover:text-gray-800 dark:hover:text-gray-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          MyAnimeList
          <ExternalLink />
        </a>{' '}
        account. Currently I've watched{' '}
        {animeStats?.anime_statistics?.num_days ?? '--'} days of anime.
      </p>

      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
        <AnimeMetrics animeStats={animeStats} error={animeStatErr} />
      </div>
      <div className="flex w-full flex-col gap-10">
        <AnimeList animeList={animeList} error={animeListErr} />
      </div>
      <h2 className="mt-3 border-t-2 border-gray-200 pt-8 text-2xl font-bold text-black dark:border-gray-700 dark:text-white md:text-3xl">
        Manga Stats
      </h2>
      <p className="text-gray-600 dark:text-gray-400">
        Here's some of my manga reading stats, pulled also from my{' '}
        <a
          href="https://myanimelist.net/mangalist/anilseervi"
          className="transition-colors hover:text-gray-800 dark:hover:text-gray-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          MyAnimeList
          <ExternalLink />
        </a>{' '}
        account. Currently I've read {mangaStats?.total ?? '--'} mangas.
      </p>

      <section>
        <MangaMetrics mangaStats={mangaStats} error={mangaListErr} />
      </section>
      <div className="flex w-full flex-col gap-10">
        <MangaList mangaList={mangaList} error={mangaListErr} />
      </div>
    </>
  );
}

export default Anime;
