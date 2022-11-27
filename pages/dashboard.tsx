import Analytics from 'components/metrics/Analytics';
import Container from 'components/Container';
import GitHub from 'components/metrics/Github';

export default function Dashboard() {
  return (
    <Container
      title="Dashboard"
      description="My personal dashboard, built with Next.js API routes deployed as serverless functions."
    >
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-start justify-center">
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-white md:text-5xl">
          /dashboard
        </h1>
        <div className="mb-8">
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            This is my personal dashboard, built with Next.js API routes
            deployed as serverless functions. I use this dashboard to track
            various metrics across platforms like GitHub and this very site.
          </p>
        </div>
        <div className="my-2 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
          <Analytics />
          <GitHub />
        </div>
      </div>
    </Container>
  );
}
