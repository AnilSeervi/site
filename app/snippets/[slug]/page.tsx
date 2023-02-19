import Backtotop from 'components/backtotop';
import { LikeButton } from 'components/LikeButton';
import { mdxToHtml } from 'lib/mdx';
import { snippetSlugsQuery, snippetsQuery } from 'lib/queries';
import { urlForImage } from 'lib/sanity';
import { sanityClient } from 'lib/sanity-server';
import { Snippet } from 'lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import MdxWrapper from './MdxWrapper';

export async function generateStaticParams() {
  const paths = await sanityClient.fetch(snippetSlugsQuery);
  return paths.map((slug) => ({ slug }));
}

async function Snippet({ params, preview = false }) {
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
          <Image
            alt={snippet.title}
            height={48}
            width={48}
            src={urlForImage(snippet.logo)}
            className="rounded-full"
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
          <Backtotop />
        </p>
      </div>
    </>
  );
}

export default Snippet;

// preTitle="Check out this Snippet"
//     title={`${snippet.title}`}
//     description="A collection of code snippets – including serverless functions, Node.js scripts, and CSS tricks."
//     type="article"
//     style={jetBrainsMono.variable}
