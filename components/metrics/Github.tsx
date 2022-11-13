import useSWR from 'swr';

import fetcher from 'lib/fetcher';
import { GitHub } from 'lib/types';
import MetricCard from 'components/metrics/Card';

export default function GitHubCard() {
  const { data, error } = useSWR<GitHub>('/api/github', fetcher);
  const isLoading = (!data && !error) || !!error;

  const stars = data?.stars.toString() ?? '0';
  const followers = data?.followers.toString() ?? '0';
  const link = 'https://github.com/AnilSeervi';

  return (
    <>
      <MetricCard
        external
        header="GitHub Stars"
        link={link}
        metric={stars}
        isLoading={isLoading}
      />
      <MetricCard
        external
        header="Github Followers"
        link={link}
        metric={followers}
        isLoading={isLoading}
      />
    </>
  );
}
