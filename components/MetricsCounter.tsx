import { useEffect } from 'react';
// import useSWR from 'swr';
import usePollIfInView from 'hooks/usePollIfInView';

// import fetcher from 'lib/fetcher';
// import { Views } from 'lib/types';
import InlineMetric from './InlineMetric';
import LoadingDots from './LoadingDots';
import { usePageViews } from 'hooks/usePageViews';
import { usePostLikes } from 'hooks/usePostLikes';

const interval = 10000;

export default function MetricsCounter({ slug }: { slug: string }) {
  // const { data, error } = useSWR<Views>(`/api/views/${slug}`, fetcher);
  const { shouldPoll, intersectionRef } = usePollIfInView(interval);

  const { views, isLoading: viewsIsLoading } = usePageViews(slug, true, {
    // Avoid fetching view count we *know* is stale since increment() mutation
    // returns view count
    revalidateOnMount: false,
    // Only poll when in view
    refreshInterval: shouldPoll ? interval : 0,
    // Override `usePostViews` default dedupingInterval for the polling usecase
    // (refresh interval can never be faster than deduping interval)
    dedupingInterval: interval
  });

  const { likes, isLoading: likesIsLoading } = usePostLikes(slug, {
    // only poll when in view
    refreshInterval: shouldPoll ? interval : 0
  });

  // const isLoading = (!data && !error) || !!error;
  // const views = new Number(data?.total);

  // useEffect(() => {
  //   const registerView = () =>
  //     fetch(`/api/views/${slug}`, {
  //       method: 'POST'
  //     });

  //   registerView();
  // }, [slug]);

  return (
    <div ref={intersectionRef} className="flex items-center gap-1">
      <span>
        {viewsIsLoading ? <LoadingDots /> : <InlineMetric stat={views} />} views
      </span>
      <span>&middot;</span>
      <span>
        {likesIsLoading ? <LoadingDots /> : <InlineMetric stat={likes} />} likes
      </span>
    </div>
  );
}
