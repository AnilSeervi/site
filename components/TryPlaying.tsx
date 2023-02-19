import { useRef, useState } from 'react';
import { Button } from './ui/Button';

export const TryPlaying = ({ previewUrl }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = () => {
    if (typeof audioRef.current?.volume === 'number')
      audioRef.current.volume = 0.4;
    if (audioRef.current?.paused) {
      audioRef.current?.play();
      setPlaying(true);
    } else {
      audioRef.current?.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <audio
        className="hidden"
        src={previewUrl}
        onEnded={() => setPlaying(false)}
        ref={audioRef}
        controls
      />
      <button
        aria-label="Play/Pause Currently Playing Song"
        className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600"
        onClick={handlePlay}
        title="Play/Pause"
      >
        {!playing ? (
          <svg width="30" height="30" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.998.998 0 0 0 8 6.82z"
            />
          </svg>
        ) : (
          <svg width="30" height="30" viewBox="0 0 24 24">
            <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        )}
      </button>
    </>
  );
};
