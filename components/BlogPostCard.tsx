import Link from 'next/link';
import clsx from 'clsx';
import LoadingDots from './LoadingDots';
import InlineMetric from './InlineMetric';
import { usePageStats } from 'hooks/usePageStats';

export default function BlogPostCard({
  title,
  slug,
  gradient
}: {
  title: string;
  slug: string;
  gradient: string;
}) {
  const blogSlug = `/blog/${slug}`;
  return (
    <Link
      href={blogSlug}
      className={clsx(
        'transform transition-all hover:scale-[1.01]',
        'w-full rounded-xl bg-gradient-to-r p-1 md:w-1/3',
        gradient
      )}
    >
      <div className="flex h-full flex-col justify-between rounded-lg bg-white p-4 dark:bg-gray-900">
        <div className="flex flex-col justify-between md:flex-row">
          <h4 className="mb-6 w-full text-lg font-medium text-gray-900 dark:text-gray-100 md:text-lg">
            {title}
          </h4>
        </div>
        <div className="capsize flex items-center gap-2 text-gray-800 dark:text-gray-200">
          <Metrics slug={blogSlug} />
        </div>
      </div>
    </Link>
  );
}

const Metrics = ({ slug }: { slug: string }) => {
  const { stats, isLoading } = usePageStats(slug);
  const likes = stats?.likes || '0';
  const views = stats?.views || '1';
  return (
    <>
      <div className="flex items-center gap-2">
        <svg width="1em" height="1em" viewBox="0 0 512 512">
          <path
            fill="currentColor"
            d="M74.247 167.854C-90.602 374.671 219.872 342.307 219.872 342.307C138.961 289.214 74.247 167.854 74.247 167.854zm5.027 140.538c-8.384-13.955-4.365-37.814 11.23-68.749c3.447 4.516 7.256 9.333 11.335 14.406l19.178 62.17l7.346-31.115a561.216 561.216 0 0 0 50.158 49.33c-51.874 1.67-88.197-7.677-99.247-26.027zm358.494-140.538s-64.729 121.36-145.625 174.453c-.015 0 310.459 32.364 145.61-174.453zm-5.028 140.538c-11.049 18.38-47.372 27.713-99.246 26.072a561.276 561.276 0 0 0 50.158-49.33l7.33 31.085l19.179-62.215a733.836 733.836 0 0 0 11.335-14.406c15.595 30.995 19.66 54.84 11.23 68.809z"
          ></path>
        </svg>
        <span className="capsize flex text-sm">
          {isLoading ? <LoadingDots /> : <InlineMetric stat={views} />}
        </span>
      </div>
      <span>&middot;</span>
      <div className="flex items-center gap-2">
        <svg width="1em" height="1em" viewBox="0 0 512 512">
          <path
            fill="currentColor"
            d="M182.344 19.906L28.78 173.47L255.626 487.5L481.938 174L328.375 20.47l-72.75 72.75l-73.28-73.314zm-.938 27.75L188 54.28l67.625 67.626L323.25 54.28l6.625-6.624l6.594 6.625L452.56 170.376l5.625 5.625l-4.656 6.438l-190.31 263.78l-7.595 10.5l-7.563-10.5L57.72 182.44L53.062 176l5.624-5.625L174.78 54.28l6.626-6.624zm0 26.438L77.53 177.97l178.095 246.81L433.72 177.97L329.874 74.093l-61 60.97l66 66l6.594 6.592l-6.595 6.625l-78.25 78.25l-6.625 6.626l-6.594-6.625l-78.25-78.25l13.188-13.218L250 272.72l65.063-65.033l-59.407-59.406l-.03.032l-6.595-6.593l-67.624-67.626zm1.406 24.78l109.032 109.032l-13.22 13.22l-109.03-109.032l13.22-13.22zm147.97 0l81.437 81.407L399 193.5l-81.406-81.406l13.187-13.22z"
          ></path>
        </svg>
        <span className="capsize flex text-sm">
          {isLoading ? <LoadingDots /> : <InlineMetric stat={likes} />}
        </span>
      </div>
    </>
  );
};
