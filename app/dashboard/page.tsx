import AnalyticsCard from 'components/metrics/Analytics';
import GitHubCard from 'components/metrics/Github';
import React from 'react';
import { getOG } from 'utils/og';

export const metadata = {
  title: 'Dashboard',
  description:
    'My personal dashboard, built with Next.js API routes deployed as serverless functions.',
  openGraph: {
    title: 'Personal Dashboard',
    description:
      'My personal dashboard, built with Next.js API routes deployed as serverless functions.',
    images: [
      {
        url: getOG({
          title: 'Personal Dashboard',
          description:
            'My personal dashboard, built with Next.js API routes deployed as serverless functions.',
          slug: '/dashboard',
          image: 'unsplash/photo-1551288049-bebda4e38f71'
        }),
        width: 1920,
        height: 1080,
        alt: 'Personal Dashboard'
      }
    ]
  },
  twitter: {
    images: [
      {
        url: getOG({
          title: 'Personal Dashboard',
          description:
            'My personal dashboard, built with Next.js API routes deployed as serverless functions.',
          slug: '/dashboard',
          image: 'unsplash/photo-1551288049-bebda4e38f71'
        }),
        width: 1920,
        height: 1080,
        alt: 'Personal Dashboard'
      }
    ]
  }
};

function Dashboard() {
  return (
    <>
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /dashboard
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        This is my personal dashboard, built with Next.js API routes deployed as
        serverless functions. I use this dashboard to track various metrics
        across platforms like GitHub and this very site.
      </p>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        <AnalyticsCard />
        <GitHubCard />
      </div>
    </>
  );
}

export default Dashboard;
