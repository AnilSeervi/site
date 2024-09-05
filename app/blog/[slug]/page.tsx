import GiscusWrapper from 'components/GiscusWrapper';
import { LikeButton } from 'components/LikeButton';
import { repo, websiteURL } from 'lib/constants';
import { mdxToHtml } from 'lib/mdx';
import { postQuery, postSlugsQuery } from 'lib/queries';
import { sanityClient } from 'lib/sanity-server';
import { Post } from 'lib/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getOG } from 'utils/og';
import MdxWrapper from './MdxWrapper';
import Metrics from './Metrics';

export async function generateStaticParams() {
  const paths = await sanityClient.fetch(postSlugsQuery);
  return paths.map((slug) => ({ slug }));
}

export const generateMetadata = async ({ params }) => {
  const { slug } = params;
  const {
    post: { title, excerpt, date, coverURL, _updatedAt, draft }
  } = await sanityClient.fetch(postQuery, {
    slug
  });

  return {
    title: title,
    description: excerpt,
    type: 'article',
    url: `${websiteURL}/blog/${slug}`,
    alternates: {
      canonical: `${websiteURL}/blog/${slug}`
    },
    openGraph: {
      title: title,
      description: excerpt,
      type: 'article',
      publishedTime: date,
      modifiedTime: _updatedAt,
      images: [
        {
          url: getOG({
            title: title,
            description: excerpt,
            slug: `/blog/${slug}`,
            preTitle: 'Check out this Blog',
            image: coverURL
          }),
          width: 1280,
          height: 720,
          alt: title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: excerpt,
      images: {
        url: getOG({
          title: title,
          description: excerpt,
          slug: `/blog/${slug}`,
          preTitle: 'Check out this Blog',
          image: coverURL
        }),
        alt: title,
        height: 720,
        width: 1280
      }
    },
    robots: {
      index: !draft,
      follow: !draft,
      nocache: draft
    }
  };
};

async function Blog({ params, searchParams }) {
  let post: Post;

  if (searchParams?.crash) {
    throw Error('in-app-error');
  }

  const { post: fetchPost } = await sanityClient.fetch(postQuery, {
    slug: params.slug
  });

  if (!fetchPost) {
    notFound();
  }

  const { html, readingTime } = await mdxToHtml(fetchPost.content);

  post = {
    ...fetchPost,
    content: html,
    readingTime
  };

  return (
    <>
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
      <Suspense fallback={null}>
        <MdxWrapper post={post} />
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
      <GiscusWrapper />
    </>
  );
}

export default Blog;
