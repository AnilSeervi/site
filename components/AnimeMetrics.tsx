import { AnimeStats, GenericError } from 'lib/types';
import MetricCard from './metrics/Card';

export default function AnimeMetrics({
  animeStats,
  error
}: {
  animeStats: AnimeStats | null;
  error: GenericError | null;
}) {
  if (error) return <div className="text-center">Error: {error.message} </div>;
  if (!animeStats) return <div className="text-center">Loading stats...</div>;

  const total = animeStats.anime_statistics?.num_items?.toString() ?? '0';
  const episodes = animeStats.anime_statistics?.num_episodes?.toString() ?? '0';
  const watching =
    animeStats.anime_statistics?.num_items_watching?.toString() ?? '0';
  const completed =
    animeStats.anime_statistics?.num_items_completed?.toString() ?? '0';
  const onHold =
    animeStats.anime_statistics?.num_items_on_hold?.toString() ?? '0';
  const dropped =
    animeStats.anime_statistics?.num_items_dropped?.toString() ?? '0';
  const planToWatch =
    animeStats.anime_statistics?.num_items_plan_to_watch?.toString() ?? '0';
  const score = animeStats.anime_statistics?.mean_score?.toString() ?? '0';

  return (
    <>
      <MetricCard header="Total" metric={total} />
      <MetricCard header="Episodes" metric={episodes} />
      <MetricCard header="Watching" link="#anime-watching" metric={watching} />
      <MetricCard
        header="Completed"
        link="#anime-completed"
        metric={completed}
      />
      <MetricCard
        header="Plan to Watch"
        link="#anime-plan_to_watch"
        metric={planToWatch}
      />
      <MetricCard header="On hold" link="#anime-on_hold" metric={onHold} />
      <MetricCard header="Dropped" link="#anime-dropped" metric={dropped} />
      <MetricCard header="Mean Score" metric={score} />
    </>
  );
}
