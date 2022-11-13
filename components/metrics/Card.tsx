import ExternalLink from 'components/ExternalLink';
import InlineMetric from 'components/InlineMetric';
import LoadingDots from 'components/LoadingDots';

type propType = {
  header: string;
  link?: string;
  metric: string;
  external?: boolean;
  isLoading: boolean;
};

export default function MetricCard({
  header,
  link = '',
  metric,
  external,
  isLoading
}: propType) {
  return (
    <div className="metric-card max-w-72 w-full rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      {link ? (
        <a
          aria-label={header}
          target={external ? '_blank' : undefined}
          rel="noopener noreferrer"
          href={link}
        >
          <div className="flex items-center text-gray-900 dark:text-gray-100">
            {header}
            {external && <ExternalLink />}
          </div>
        </a>
      ) : (
        <div className="flex items-center text-gray-900 dark:text-gray-100">
          {header}
        </div>
      )}
      <p className="spacing-sm mt-2 text-3xl font-bold text-black dark:text-white">
        {isLoading ? <LoadingDots /> : <InlineMetric stat={metric} />}
      </p>
    </div>
  );
}
