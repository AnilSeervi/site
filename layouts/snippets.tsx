import Image from 'next/image';
import Container from 'components/Container';
import { PropsWithChildren, Suspense } from 'react';
import { Snippet } from 'lib/types';
import { urlForImage } from 'lib/sanity';
import Link from 'next/link';
import { JetBrains_Mono } from '@next/font/google';
import { LikeButton } from 'components/LikeButton';

const jetBrainsMono = JetBrains_Mono({
  weight: '400',
  display: 'swap',
  variable: '--font-jetbrains-mono'
});

export default function SnippetLayout({
  children,
  snippet
}: PropsWithChildren<{ snippet: Snippet }>) {
  return (
    <Container
      preTitle="Check out this Snippet"
      title={`${snippet.title}`}
      description="A collection of code snippets – including serverless functions, Node.js scripts, and CSS tricks."
      type="article"
      style={jetBrainsMono.variable}
    >
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
      <Suspense fallback={null}>{children}</Suspense>
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
          <span
            className="cursor-pointer transition-colors hover:text-gray-900 hover:dark:text-gray-100 xl:hidden"
            onClick={() => window.scrollTo({ top: 0 })}
          >
            Back to top
          </span>
        </p>
      </div>
    </Container>
  );
}
