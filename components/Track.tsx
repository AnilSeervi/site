import clsx from 'clsx';
import Image from 'next/image';

export default function Track(track) {
  return (
    <div
      className={clsx(
        `grid auto-cols-min grid-flow-col items-center gap-3 pb-4 md:gap-5`,
        !track.last && `border-b border-gray-200 dark:border-gray-800`,
        `mt-8 w-full max-w-3xl`
      )}
    >
      <p className="whitespace-nowrap text-sm font-bold tabular-nums text-gray-400 dark:text-gray-600">
        {track.ranking}
      </p>
      <div className="flex min-w-[48px]">
        <Image
          src={track.image}
          alt={track.title}
          height={48}
          width={48}
          className="rounded-sm"
        />
      </div>
      <div className="flex flex-col">
        <a
          className="w-60 truncate font-medium text-gray-900 dark:text-gray-100 sm:w-96 md:w-[30rem]"
          href={track.songUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {track.title}
        </a>
        <p
          className="w-60 truncate text-gray-500 sm:w-96 md:w-[30rem]"
          color="gray.500"
        >
          {track.artist}
        </p>
      </div>
    </div>
  );
}
