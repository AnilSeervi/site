import { Song } from 'lib/types';
import Track from 'components/Track';

export default function Tracks({ data }: { data: Song[] }) {
  if (!data) {
    return null;
  }

  return (
    <>
      {data.map((track, index) => (
        <Track
          ranking={index + 1}
          key={track.id}
          {...track}
          last={index === data.length - 1}
        />
      ))}
    </>
  );
}
