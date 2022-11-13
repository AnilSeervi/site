import useSWR from 'swr';

import fetcher from 'lib/fetcher';
import { Likes, Views } from 'lib/types';
import MetricCard from 'components/metrics/Card';
import { websiteURL } from 'lib/constants';

export default function AnalyticsCard() {
  const { data: viewData, error: viewError } = useSWR<Views>(
    '/api/views',
    fetcher
  );
  const { data: likesData, error: likesError } = useSWR<Likes>(
    '/api/likes',
    fetcher
  );

  const isViewsLoading = (!viewData && !viewError) || !!viewError;
  const isLikesLoading = (!likesError && !likesData) || !!likesError;

  const views = viewData?.total ?? '0';
  const likes = likesData?.total ?? '0';

  return (
    <>
      <MetricCard
        header="All-Time Views"
        link={websiteURL}
        metric={views}
        isLoading={isViewsLoading}
      />

      <MetricCard
        header="Blog & Snippet Likes"
        link={websiteURL}
        metric={likes}
        isLoading={isLikesLoading}
      />
    </>
  );
}
