import React from 'react';
import MetricCard from './metrics/Card';

function MangaMetrics({ mangaStats, error }) {
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

  if (error) return <div className="text-center">Error: {error.message} </div>;

  return (
    <div className="my-2 grid w-full grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
      <MetricCard header="Total" metric={total} />
      <MetricCard header="Reading" metric={reading} />
      <MetricCard header="Completed" metric={completed} />
      <MetricCard header="Plan to Read" metric={plan_to_read} />
      <MetricCard header="On Hold" metric={on_hold} />
      <MetricCard header="Dropped" metric={dropped} />
      <MetricCard header="Chapters Read" metric={read} />
      <MetricCard header="Mean Score" metric={mean_score} />
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
