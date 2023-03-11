import { Artist } from 'lib/types';
import Image from 'next/image';

const formatNumberToIntl = (number) =>
  new Intl.NumberFormat('en-US').format(number);

export default function TopArtistsIcons({ data }: { data: Artist[] }) {
  if (!data) return null;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {data.map((artist, index) => (
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
                loading="lazy"
              />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
