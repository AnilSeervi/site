import { PropsWithChildren, Suspense } from 'react';

import Container from 'components/Container';
import Subscribe from 'components/Subscribe';
import { Post } from 'lib/types';
import { urlForImage } from 'lib/sanity';
import { siteTitle, repo, websiteURL } from 'lib/constants';
import Link from 'next/link';
import localFont from '@next/font/local';
import clsx from 'clsx';
import { LikeButton } from 'components/LikeButton';

const iosevkaRegular = localFont({
  src: '../public/fonts/iosevka-regular.woff2',
  weight: '400',
  display: 'swap',
  variable: '--font-iosevka'
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
    >
      <article
        className={clsx(
          'mx-auto mb-16 flex w-full max-w-2xl flex-col items-start justify-center',
          iosevkaRegular.variable
        )}
      >
        <h1 className="mb-4 text-3xl font-medium text-black dark:text-white md:text-5xl">
          {post.title}
        </h1>
        <div className="mt-2 flex w-full items-baseline justify-between">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <time dateTime={post.date} title={post.date}>
              {new Date(post.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </time>
            {` • `}
            <span>{post.readingTime}</span>
          </p>

          <LikeButton slug={`/blog/${post.slug}`} />
        </div>
        <Suspense fallback={null}>
          <div className="prose mt-4 w-full max-w-none dark:prose-dark">
            {children}
          </div>
        </Suspense>
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
              className="cursor-pointer transition-colors hover:text-gray-900 hover:dark:text-gray-100"
              onClick={() => window.scrollTo({ top: 0 })}
            >
              Back to top
            </span>
          </p>
        </div>
        <div className="mt-8">
          <Subscribe />
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
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
          <a href={`${repo}issues/`} target="_blank" rel="noopener noreferrer">
            {'Suggest Change'}
          </a>
        </div>
      </article>
    </Container>
  );
}
