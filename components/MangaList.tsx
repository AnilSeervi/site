import { GenericError, MangaListNode } from 'lib/types';
import React from 'react';
import MangaCard from './MangaCard';

function MangaList({
  mangaList,
  error
}: {
  mangaList: MangaListNode[] | null;
  error: GenericError | null;
}) {
  if (error) return <div className="text-center">Error: {error.message}</div>;
  if (!mangaList) return <div className="text-center">Loading manga list...</div>;

  const reading = mangaList.filter(
    (manga) => manga.node.my_list_status.status === 'reading'
  );

  const completed = mangaList.filter(
    (manga) => manga.node.my_list_status.status === 'completed'
  );

  const onHold = mangaList.filter(
    (manga) => manga.node.my_list_status.status === 'on_hold'
  );

  const dropped = mangaList.filter(
    (manga) => manga.node.my_list_status.status === 'dropped'
  );

  const planToRead = mangaList.filter(
    (manga) => manga.node.my_list_status.status === 'plan_to_read'
  );

  return (
    <>
      {reading.length > 0 && (
        <section>
          <h3
            id="manga-reading"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Reading
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {reading.map((manga) => (
              <MangaCard manga={manga.node} key={manga.node.id} />
            ))}
          </div>
        </section>
      )}
      {completed.length > 0 && (
        <section>
          <h3
            id="manga-completed"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Completed
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {completed.map((manga) => (
              <MangaCard manga={manga.node} key={manga.node.id} />
            ))}
          </div>
        </section>
      )}
      {onHold.length > 0 && (
        <section>
          <h3
            id="manga-on-hold"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            On Hold
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {onHold.map((manga) => (
              <MangaCard manga={manga.node} key={manga.node.id} />
            ))}
          </div>
        </section>
      )}
      {dropped.length > 0 && (
        <section>
          <h3
            id="manga-dropped"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Dropped
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {dropped.map((manga) => (
              <MangaCard manga={manga.node} key={manga.node.id} />
            ))}
          </div>
        </section>
      )}
      {planToRead.length > 0 && (
        <section>
          <h3
            id="manga-plan-to-read"
            className="mb-4 text-2xl font-bold tracking-tight text-black dark:text-white"
          >
            Plan to Read
          </h3>
          <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
            {planToRead.map((manga) => (
              <MangaCard manga={manga.node} key={manga.node.id} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default MangaList;
