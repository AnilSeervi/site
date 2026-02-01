import React from 'react';
import MetricCard from './metrics/Card';
import { MyMangaStats, GenericError } from 'lib/types';

function MangaMetrics({
  mangaStats,
  error
}: {
  mangaStats: MyMangaStats | null;
  error: GenericError | null;
}) {
  if (error) return <div className="text-center">Error: {error.message} </div>;
  if (!mangaStats) return <div className="text-center">Loading stats...</div>;

  const {
    read,
    mean_score,
    reading,
    plan_to_read,
    completed,
    on_hold,
    total,
    dropped
  } = mangaStats;

  return (
    <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
      <MetricCard header="Total" metric={String(total)} />
      <MetricCard header="Reading" metric={String(reading)} />
      <MetricCard header="Completed" metric={String(completed)} />
      <MetricCard header="Plan to Read" metric={String(plan_to_read)} />
      <MetricCard header="On Hold" metric={String(on_hold)} />
      <MetricCard header="Dropped" metric={String(dropped)} />
      <MetricCard header="Chapters Read" metric={String(read)} />
      <MetricCard header="Mean Score" metric={mean_score?.toFixed(2) ?? '0'} />
    </div>
  );
}

export default MangaMetrics;

const Card = ({ title, value }) => (
  <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
    <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">
      {value}
    </p>
    <p className="text-gray-600 dark:text-gray-400">{title}</p>
  </div>
);
