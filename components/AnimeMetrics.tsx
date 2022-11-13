import fetcher from 'lib/fetcher';
import { AnimeStats } from 'lib/types';
import useSWR from 'swr';
import MetricCard from './metrics/Card';

export default function AnimeMetrics() {
  const { data, error } = useSWR<AnimeStats>('/api/get-mal-stats', fetcher);
  const isLoading = (!data && !error) || !!error;

  const total = data?.total.toString() ?? '0';
  const episodes = data?.episodes.toString() ?? '0';
  // const days = data?.days_watched ?? '0';
  const watching = data?.watching.toString() ?? '0';
  const completed = data?.completed.toString() ?? '0';
  const onHold = data?.on_hold.toString() ?? '0';
  const dropped = data?.dropped.toString() ?? '0';
  const planToWatch = data?.plan_to_watch.toString() ?? '0';
  const score = data?.mean_score.toString() ?? '0';

  return (
    <>
      <MetricCard header="Total" metric={total} isLoading={isLoading} />
      <MetricCard header="Episodes" metric={episodes} isLoading={isLoading} />
      <MetricCard
        header="Watching"
        link="#anime-watching"
        metric={watching}
        isLoading={isLoading}
      />
      <MetricCard
        header="Completed"
        link="#anime-completed"
        metric={completed}
        isLoading={isLoading}
      />
      <MetricCard
        header="Plan to Watch"
        link="#anime-plan_to_watch"
        metric={planToWatch}
        isLoading={isLoading}
      />
      <MetricCard
        header="On hold"
        link="#anime-on_hold"
        metric={onHold}
        isLoading={isLoading}
      />
      <MetricCard
        header="Dropped"
        link="#anime-dropped"
        metric={dropped}
        isLoading={isLoading}
      />
      <MetricCard header="Mean Score" metric={score} isLoading={isLoading} />
    </>
  );
}
