import { PropsWithChildren, Suspense } from 'react';
import Container from 'components/Container';
import { Post } from 'lib/types';
import { urlForImage } from 'lib/sanity';
import { repo, websiteURL } from 'lib/constants';
import Link from 'next/link';
import { JetBrains_Mono } from '@next/font/google';
import { LikeButton } from 'components/LikeButton';
import LoadingDots from 'components/LoadingDots';
import InlineMetric from 'components/InlineMetric';
import { usePageStats } from 'hooks/usePageStats';

const jetBrainsMono = JetBrains_Mono({
  weight: '400',
  display: 'swap',
  variable: '--font-jetbrains-mono'
});

export default function BlogLayout({
  children,
  post
}: PropsWithChildren<{ post: Post }>) {
  const coverURL = post.coverURL;
  return (
    <Container
      preTitle="Check out this article"
      title={`${post.title}`}
      description={post.excerpt}
      ogDescription={post.excerpt}
      image={coverURL || urlForImage(post.coverImage)}
      date={new Date(post.date).toISOString()}
      type="article"
      style={jetBrainsMono.variable}
    >
      <div className="xl:!col-end-5">
        <h1 className="mb-4 text-2xl font-medium text-black dark:text-white md:text-3xl">
          {post.title}
        </h1>
        <div className="mt-2 flex w-full items-baseline justify-between">
          <p className="space-x-2 text-sm text-gray-700 dark:text-gray-300 md:text-base">
            <time dateTime={post.date} title={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </time>
            <span>{`•`}</span>
            <span>{post.readingTime}</span>
            <Metrics slug={`/blog/${post.slug}`} />
          </p>
        </div>
      </div>
      <div className="sticky top-10 hidden h-0 self-center xl:!col-start-4 xl:row-start-2 xl:flex">
        <LikeButton slug={`/blog/${post.slug}`} />
      </div>
      <Suspense fallback={null}>{children}</Suspense>
      <div className="mt-8">
        <LikeButton slug={`/blog/${post.slug}`} />
      </div>
      <div className="mt-8 self-stretch">
        <p className="flex items-center justify-between font-mono text-sm text-gray-700 transition-colors  dark:text-gray-300">
          <Link
            href="/blog"
            className="hover:text-gray-900 hover:dark:text-gray-100"
          >
            cd <span className="font-semibold">..</span>
          </Link>
          <span
            className="cursor-pointer transition-colors hover:text-gray-900 hover:dark:text-gray-100 xl:hidden"
            onClick={() => window.scrollTo({ top: 0 })}
          >
            Back to top
          </span>
        </p>
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <a
          href="https://anilseervi.substack.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {'Subscribe for updates'}
        </a>
        {` • `}
        <a
          href={`https://mobile.twitter.com/search?q=${encodeURIComponent(
            `${websiteURL}/blog/${post.slug}`
          )}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {'Discuss on Twitter'}
        </a>
        {` • `}
        <a href={`${repo}/issues/`} target="_blank" rel="noopener noreferrer">
          {'Suggest Change'}
        </a>
      </div>
    </Container>
  );
}

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
