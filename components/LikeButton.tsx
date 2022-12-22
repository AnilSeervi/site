import cx from 'clsx';
import { usePostLikes } from 'hooks/usePostLikes';
import React from 'react';
import LoadingDots from './LoadingDots';

const emojis = ['👍', '🙏', '🥰'];

const HeartIcon = ({ className }) => (
  <svg
    className={cx(className)}
    fill="currentColor"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
      clipRule="evenodd"
    ></path>
  </svg>
);

const FOCUS_VISIBLE_OUTLINE =
  'focus:outline-none focus-visible:outline-none focus-visible:ring-2 dar:focus-visible:ring-gray-800 focus-visible:ring-gray-200';
// A visual component that...
// 1. Fills a heart shape with a gradient depending on the number of likes passed
// 2. Animates a thank you emoji as the number of likes increase
export const LikeButton = ({ slug }: { slug: string }) => {
  const {
    currentUserLikes: orCurrentLike,
    likes: orLikes,
    isLoading,
    increment
  } = usePostLikes(slug);
  const likes = +orLikes;
  const currentUserLikes = +orCurrentLike;

  let [animatedEmojis, setAnimatedEmojis] = React.useState<string[]>(
    currentUserLikes ? [emojis[currentUserLikes]] : []
  );

  const handleClick = () => {
    increment();
    if (currentUserLikes && currentUserLikes <= 2) {
      setAnimatedEmojis([...animatedEmojis, emojis[currentUserLikes]]);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        {/* Thank you emojis */}
        {animatedEmojis.map((emoji, index) => {
          return (
            <div
              key={index}
              className="absolute w-full animate-[emoji_0.75s_ease-out] text-center opacity-0"
            >
              {emoji}
            </div>
          );
        })}

        <button
          className={cx(
            'shadow-lgx group relative block transform overflow-hidden rounded-lg bg-gradient-to-tl from-gray-200/70 to-gray-200/90 p-1 transition-all duration-300 ease-out hover:scale-[1.2] hover:rounded-[10px] active:scale-100 active:rounded-lg dark:from-white/5 dark:to-white/30',
            FOCUS_VISIBLE_OUTLINE,
            {
              'animate-pulse': isLoading,
              'hover:shadow-gray-500/30': currentUserLikes === 0,
              'hover:shadow-purple-500/50': currentUserLikes !== 0
            }
          )}
          onClick={handleClick}
        >
          <div
            className={cx(
              'absolute inset-0 transform-gpu bg-gradient-to-tl from-purple-500/70 to-rose-400/70 transition-transform dark:from-purple-500 dark:to-rose-400',
              {
                'translate-y-8': currentUserLikes === 0,
                'translate-y-5': currentUserLikes === 1,
                'translate-y-3': currentUserLikes === 2
              }
            )}
          />

          <HeartIcon className="relative w-5 transform text-rose-200 transition delay-100 duration-500 ease-out group-hover:scale-110 dark:text-rose-100" />
        </button>
      </div>

      {/* Like counter text */}
      <div className="text-base font-medium slashed-zero tabular-nums leading-none text-gray-600 dark:text-gray-300">
        {isLoading ? <LoadingDots /> : <span>{likes}</span>}
      </div>
    </div>
  );
};
