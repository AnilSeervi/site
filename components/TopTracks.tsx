import { TopTracks } from 'lib/types';
import Track from 'components/Track';

export default function Tracks({ data }: { data: TopTracks }) {
  if (!data) {
    return null;
  }

  return (
    <>
      {data.tracks.map((track, index) => (
        <Track
          ranking={index + 1}
          key={track.id}
          {...track}
          last={index === data.tracks.length - 1}
        />
      ))}
    </>
  );
}
