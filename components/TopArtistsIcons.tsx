'use client';

import { Tooltip } from '@reach/tooltip';
import { Artist } from 'lib/types';

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
              <Tooltip
                className="reach-tooltip"
                label={`${artist.name} - ${formatNumberToIntl(
                  artist.followers
                )}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={artist.image}
                  alt={artist.name}
                  height={42}
                  width={42}
                  className="h-11 w-11 rounded-full object-cover"
                  loading="lazy"
                />
              </Tooltip>
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
