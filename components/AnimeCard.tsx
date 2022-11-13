import clsx from 'clsx';
import Image from 'next/image';
import { useState } from 'react';

export default function AnimeCard({ anime }) {
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
          src={anime.image}
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
            Score: {anime.score}
          </span>
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {anime.episodes} Eps
          </span>
        </div>
      </div>
    </div>
  );
}
