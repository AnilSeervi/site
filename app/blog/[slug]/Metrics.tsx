'use client';

import InlineMetric from 'components/InlineMetric';
import LoadingDots from 'components/LoadingDots';
import { usePageStats } from 'hooks/usePageStats';

const Metrics = ({ slug }: { slug: string }) => {
  const { stats, isLoading } = usePageStats(slug);
  const likes = stats?.likes || '0';
  const views = stats?.views || '1';

  return (
    <>
      <span>{`•`}</span>
      <span>
        {isLoading ? <LoadingDots /> : <InlineMetric stat={views} />} views
      </span>
      {/* <span>{`•`}</span>
      <span>
        {isLoading ? <LoadingDots /> : <InlineMetric stat={likes} />} likes
      </span> */}
    </>
  );
};

export default Metrics;
