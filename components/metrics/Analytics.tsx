'use client';

import useSWR from 'swr';
import fetcher from 'lib/fetcher';
import { Stats } from 'lib/types';
import MetricCard from 'components/metrics/Card';
import { websiteURL } from 'lib/constants';

export default function AnalyticsCard() {
  const { data: stats, error } = useSWR<Stats>('/api/stats', fetcher);

  const isLoading = (!error && !stats) || !!error;

  const views = stats?.views ?? '0';
  const likes = stats?.likes ?? '0';

  return (
    <>
      <MetricCard
        header="All-Time Views"
        link={websiteURL}
        metric={views}
        isLoading={isLoading}
      />
      <MetricCard
        header="Blog & Snippet Likes"
        link={websiteURL}
        metric={likes}
        isLoading={isLoading}
      />
    </>
  );
}
