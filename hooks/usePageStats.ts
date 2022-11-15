import { Stats } from 'lib/types';
import useSWR, { SWRConfiguration } from 'swr';

const API_URL = `/api/stats`;

async function getPageStats(slug: string): Promise<Stats> {
  const res = await fetch(API_URL + slug);
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
}

export const usePageStats = (slug: string, config?: SWRConfiguration) => {
  const properSlug = slug !== '/' ? slug : '/home';

  const { data: stats, error } = useSWR<Stats>(
    [API_URL, properSlug],
    () => getPageStats(properSlug),
    {
      dedupingInterval: 10000,
      ...config
    }
  );

  return {
    stats,
    isLoading: (!error && !stats) || !!error
  };
};
