import { Views } from 'lib/types';
import useSWR, { SWRConfiguration, useSWRConfig } from 'swr';

const API_URL = `/api/views`;

async function getPageViews(slug: string): Promise<Views> {
  const res = await fetch(API_URL + slug);
  if (!res.ok) {
    throw new Error('An error occurred while fetching the data.');
  }
  return res.json();
}

async function updatePageViews(slug: string): Promise<Views> {
  const res = await fetch(API_URL + slug, {
    method: 'POST'
  });
  if (!res.ok) {
    throw new Error('An error occurred while posting the data.');
  }
  return res.json();
}

export const usePageViews = (
  slug: string,
  _: boolean = true,
  config?: SWRConfiguration
) => {
  const properSlug = slug !== '/' ? slug : '/home';

  const {
    data: views,
    error,
    mutate
  } = useSWR<Views>(
    _ ? [API_URL, properSlug] : null,
    () => getPageViews(properSlug),
    {
      dedupingInterval: 60000,
      ...config
    }
  );

  const increment = () => {
    mutate(
      updatePageViews(properSlug).catch((e) => {
        console.log(e);

        return { total: '0' };
      })
    );
  };

  return {
    views: views?.total || '0',
    isLoading: (!error && !views) || !!error,
    increment
  };
};
