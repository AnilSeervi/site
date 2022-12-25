import clsx from 'clsx';
import { MyAnimeList } from 'lib/types';
import Image from 'next/image';
import { useState } from 'react';

const getEps = (anime: MyAnimeList) => {
  if (anime.media_type === 'movie') return 'Movie';
  if (anime.num_episodes === 0) return 'Unknown Eps';
  if (
    anime.my_list_status.num_episodes_watched === 0 ||
    anime.my_list_status.num_episodes_watched === anime.num_episodes
  )
    return `${anime.num_episodes} Eps`;

  return `${anime.my_list_status.num_episodes_watched} / ${anime.num_episodes} Eps`;
};

export default function AnimeCard({ anime }: { anime: MyAnimeList }) {
  const [loading, setLoading] = useState(true);

  return (
    <div
      key={anime.id}
      className="flex flex-col overflow-hidden rounded-md bg-white shadow dark:bg-gray-800"
    >
      <div className="relative">
        <Image
          className={clsx(
            'aspect-[2/3] object-cover duration-700 ease-in-out',
            loading
              ? 'scale-110 blur-lg grayscale'
              : 'scale-100 blur-0 grayscale-0'
          )}
          src={anime.main_picture.large}
          onLoadingComplete={() => setLoading(false)}
          alt={anime.title}
          width={400}
          height={600}
          loading="lazy"
        />
        <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-transparent  via-gray-700 to-gray-800  p-2 text-xs text-white dark:pb-0">
          {anime.title}
        </p>
      </div>
      <div className="p-2 pt-[0.4rem]">
        <div className="flex justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Score: {anime.my_list_status.score || 'TBD'}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {getEps(anime)}
          </span>
        </div>
      </div>
    </div>
  );
}
