import Link from 'next/link';
import Image from 'next/image';
import { urlForImage } from 'lib/sanity';
import { useEnabledOnFirstIntersection } from 'hooks/useEnabledOnFirstIntersection';
import LoadingDots from './LoadingDots';
import InlineMetric from './InlineMetric';
import { usePageStats } from 'hooks/usePageStats';

export default function FunctionCard({
  title,
  description,
  slug,
  logo,
  ...rest
}) {
  const { enabled, intersectionRef } = useEnabledOnFirstIntersection();
  return (
    <Link
      href={`/snippets/${slug}`}
      className="border-grey-200 w-full rounded border bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
      {...rest}
    >
      <div
        className="flex flex-row-reverse items-center justify-between"
        ref={intersectionRef}
      >
        <Image
          alt={title}
          height={32}
          width={32}
          src={urlForImage(logo).url()}
          className="rounded-full"
        />
        <h3 className="text-left text-lg font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
      </div>
      <p className="mt-1 text-gray-700 dark:text-gray-400">{description}</p>
      <div className="flex items-center justify-end gap-1 text-sm text-gray-700 dark:text-gray-500">
        {enabled ? <Metrics slug={`/snippets/${slug}`} /> : null}
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
      <span>
        {isLoading ? <LoadingDots /> : <InlineMetric stat={views} />} views
      </span>
      <span>&middot;</span>
      <span>
        {isLoading ? <LoadingDots /> : <InlineMetric stat={likes} />} likes
      </span>
    </>
  );
};
