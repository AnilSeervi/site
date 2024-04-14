import GiscusWrapper from 'components/GiscusWrapper';
import { LikeButton } from 'components/LikeButton';
import { websiteURL } from 'lib/constants';
import { mdxToHtml } from 'lib/mdx';
import { snippetSlugsQuery, snippetsQuery } from 'lib/queries';
import { urlForImage } from 'lib/sanity';
import { sanityClient } from 'lib/sanity-server';
import { Snippet } from 'lib/types';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getOG } from 'utils/og';
import MdxWrapper from './MdxWrapper';

export async function generateStaticParams() {
  const paths = await sanityClient.fetch(snippetSlugsQuery);
  return paths.map((slug) => ({ slug }));
}

export const generateMetadata = async ({ params }) => {
  const { slug } = params;

  const {
    snippet: { title, _createdAt, _updatedAt }
  } = await sanityClient.fetch(snippetsQuery, {
    slug
  });

  return {
    title,
    description:
      'A collection of code snippets – including serverless functions, Node.js scripts, and CSS tricks.',
    url: `${websiteURL}/snippets/${slug}`,
    alternates: {
      canonical: `${websiteURL}/snippets/${slug}`
    },
    openGraph: {
      title,
      description:
        'A collection of code snippets – including serverless functions, Node.js scripts, and CSS tricks.',
      type: 'article',
      publishedTime: _createdAt,
      modifiedTime: _updatedAt,
      images: [
        {
          url: getOG({
            title,
            slug: `/snippets/${slug}`,
            preTitle: 'Check out this Snippet'
          }),
          width: 1280,
          height: 720,
          alt: title
        }
      ]
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description:
        'A collection of code snippets – including serverless functions, Node.js scripts, and CSS tricks.',
      images: {
        url: getOG({
          title,
          slug: `/snippets/${slug}`,
          preTitle: 'Check out this Snippet'
        }),
        alt: title
      }
    }
  };
};

async function Snippet({ params }) {
  let snippet: Snippet;

  const { snippet: fetchSnippet } = await sanityClient.fetch(snippetsQuery, {
    slug: params.slug
  });

  if (!fetchSnippet) {
    notFound();
  }

  const { html } = await mdxToHtml(fetchSnippet.content);

  snippet = {
    ...fetchSnippet,
    content: html
  };

  return (
    <>
      <section className="mb-8 flex w-full justify-between">
        <div>
          <h1 className="mb-4 text-3xl font-bold text-black dark:text-white md:text-5xl">
            {snippet.title}
          </h1>
          <p className="text-gray-700 dark:text-gray-300">
            {snippet.description}
          </p>
        </div>
        <div className="mt-2 sm:mt-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={snippet.title}
            height={48}
            width={48}
            src={urlForImage(snippet.logo)}
            className="rounded-full"
            loading="lazy"
          />
        </div>
      </section>
      <div className="sticky top-10 hidden h-0 self-center xl:!col-start-4 xl:row-start-2 xl:flex">
        <LikeButton slug={`/snippets/${snippet.slug}`} />
      </div>
      <Suspense fallback={null}>
        <MdxWrapper snippet={snippet} />
      </Suspense>
      <div className="mt-8">
        <LikeButton slug={`/snippets/${snippet.slug}`} />
      </div>
      <div className="mt-8 self-stretch">
        <p className="flex items-center justify-between font-mono text-sm text-gray-700 transition-colors  dark:text-gray-300">
          <Link
            href="/snippets"
            className="hover:text-gray-900 hover:dark:text-gray-100"
          >
            cd <span className="font-semibold">..</span>
          </Link>
        </p>
      </div>
      <GiscusWrapper />
    </>
  );
}

export default Snippet;
