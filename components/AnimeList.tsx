import { AnimeListNode, Error } from 'lib/types';
import AnimeCard from './AnimeCard';

export default function AnimeList({
  animeList,
  error
}: {
  animeList: AnimeListNode[];
  error: Error;
}) {
  const watching = animeList.filter(
    (anime) => anime.node.my_list_status.status === 'watching'
  );
  const completed = animeList.filter(
    (anime) => anime.node.my_list_status.status === 'completed'
  );
  const onHold = animeList.filter(
    (anime) => anime.node.my_list_status.status === 'on_hold'
  );
  const dropped = animeList.filter(
    (anime) => anime.node.my_list_status.status === 'dropped'
  );
  const planToWatch = animeList.filter(
    (anime) => anime.node.my_list_status.status === 'plan_to_watch'
  );

  if (error) return <div className="text-center">Error: {error.message}</div>;

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
              <AnimeCard anime={anime.node} key={anime.node.id} />
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
              <AnimeCard anime={anime.node} key={anime.node.id} />
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
              <AnimeCard anime={anime.node} key={anime.node.id} />
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
              <AnimeCard anime={anime.node} key={anime.node.id} />
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
              <AnimeCard anime={anime.node} key={anime.node.id} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
