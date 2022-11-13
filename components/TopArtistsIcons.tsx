import fetcher from 'lib/fetcher';
import { TopArtists } from 'lib/types';
import Image from 'next/image';
import useSWR from 'swr';

const formatNumberToIntl = (number) =>
  new Intl.NumberFormat('en-US').format(number);

export default function TopArtistsIcons() {
  const { data } = useSWR<TopArtists>('api/top-artists', fetcher);
  if (!data) return null;

  return (
    <>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        These are some of the top artists on Spotify that I'm currently vibing
        to.{' '}
        {
          data.artists[
            Math.floor(Math.random() * data.artists.length)
          ].name.split(' ')[0]
        }
        's songs are pretty good.
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {data.artists.map((artist, index) => (
          <div className="flex flex-col items-center" key={index}>
            <div className="flex min-w-[42px]">
              <a href={artist.artistUrl} target="_blank" rel="noreferrer">
                <Image
                  src={artist.image}
                  alt={artist.name}
                  height={42}
                  width={42}
                  className="h-11 w-11 rounded-full object-cover"
                  title={`${artist.name} - ${formatNumberToIntl(
                    artist.followers
                  )}`}
                />
              </a>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
