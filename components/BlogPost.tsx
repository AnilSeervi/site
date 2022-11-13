import Link from 'next/link';
import InlineMetric from './InlineMetric';
import LoadingDots from './LoadingDots';
import React from 'react';
import { usePageViews } from 'hooks/usePageViews';
import { usePostLikes } from 'hooks/usePostLikes';
import { useEnabledOnFirstIntersection } from 'hooks/useEnabledOnFirstIntersection';

export default function BlogPost({
  slug,
  title,
  excerpt,
  date
}: {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
}) {
  const { enabled, intersectionRef } = useEnabledOnFirstIntersection();
  const blogSlug = `/blog/${slug}`;
  return (
    <div ref={intersectionRef}>
      <Link href={blogSlug} className="w-full">
        <div className="w-full">
          <h4 className="w-full text-lg font-medium text-gray-900 dark:text-gray-100 md:text-xl">
            {title}
          </h4>
          <div className="flex items-center space-x-2 text-sm text-gray-400 dark:text-gray-500">
            <time dateTime={date}>
              {new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
              })}
            </time>
            {enabled ? <Metrics slug={blogSlug} /> : null}
          </div>
          <p className="mt-3 text-gray-600 dark:text-gray-400">{excerpt}</p>
        </div>
      </Link>
    </div>
  );
}

const Metrics = ({ slug }: { slug: string }) => {
  const { views, isLoading: viewsIsLoading } = usePageViews(slug);
  const { likes, isLoading: likesIsLoading } = usePostLikes(slug);

  return (
    <>
      <span>&middot;</span>
      <span>
        {viewsIsLoading ? <LoadingDots /> : <InlineMetric stat={views} />} views
      </span>
      <span>&middot;</span>
      <span>
        {likesIsLoading ? <LoadingDots /> : <InlineMetric stat={likes} />} likes
      </span>
    </>
  );
};
