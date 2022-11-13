import fetcher from 'lib/fetcher';
import { Animes } from 'lib/types';
import Image from 'next/image';
import useSWR from 'swr';
import AnimeCard from './AnimeCard';

interface AnimesWithError extends Animes {
  message?: string;
}

export default function AnimeList() {
  const { data } = useSWR<AnimesWithError>('/api/get-mal', fetcher);

  if (!data || data.message)
    return <p className="text-black dark:text-white">{data?.message}</p>;

  const watching = data.filter((anime) => anime.status === 'watching');
  const completed = data.filter((anime) => anime.status === 'completed');
  const onHold = data.filter((anime) => anime.status === 'on_hold');
  const dropped = data.filter((anime) => anime.status === 'dropped');
  const planToWatch = data.filter((anime) => anime.status === 'plan_to_watch');

  return (
    <>
      {watching?.length > 0 && (
        <section>
          <h3
            id="anime-watching"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Watching
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {watching.map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        </section>
      )}
      {completed?.length > 0 && (
        <section>
          <h3
            id="anime-completed"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Completed
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {completed.map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        </section>
      )}
      {planToWatch?.length > 0 && (
        <section>
          <h3
            id="anime-plan_to_watch"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Plan to Watch
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {planToWatch.map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        </section>
      )}
      {onHold?.length > 0 && (
        <section>
          <h3
            id="anime-on_hold"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            On Hold
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {onHold.map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        </section>
      )}
      {dropped?.length > 0 && (
        <section>
          <h3
            id="anime-dropped"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Dropped
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {dropped.map((anime) => (
              <AnimeCard anime={anime} key={anime.id} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
