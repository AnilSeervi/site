import Link from 'next/link';

import NowPlaying from 'components/NowPlaying';
import ExternalLink from './ExternalLink';
import { useEnabledOnFirstIntersection } from 'hooks/useEnabledOnFirstIntersection';
import { usePageViews } from 'hooks/usePageViews';
import LoadingDots from './LoadingDots';
import InlineMetric from './InlineMetric';

type FooterLinkType = {
  href: string;
  text: string;
  isExternal?: boolean;
};

const FooterLink = ({ href, text, isExternal }: FooterLinkType) =>
  isExternal ? (
    <a
      className="flex items-center text-gray-500 transition-colors hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
      target="_blank"
      rel="noopener noreferrer"
      href={href}
    >
      {text}
      <ExternalLink />
    </a>
  ) : (
    <Link
      href={href}
      className="text-gray-500 transition-colors hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
    >
      {text}
    </Link>
  );

export default function Footer({ slug }) {
  const { enabled, intersectionRef } = useEnabledOnFirstIntersection();
  return (
    <footer className="mx-auto mb-8 flex w-full max-w-2xl flex-col items-start justify-center px-8 md:px-0">
      <hr className="border-1 mb-8 w-full border-gray-200 dark:border-gray-800" />
      <NowPlaying />
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-start space-y-4">
          <FooterLink href="/" text="Home" />
          <FooterLink href="/about" text="About" />
          <FooterLink href="/dashboard" text="Dashboard" />
          <FooterLink href="/uses" text="Uses" />
          <FooterLink href="/newsletter" text="Newsletter" />
        </div>
        <div className="flex flex-col items-start space-y-4">
          <FooterLink
            href="https://twitter.com/linaseervi"
            text="Twitter"
            isExternal
          />
          <FooterLink
            href="https://github.com/AnilSeervi"
            text="GitHub"
            isExternal
          />
          <FooterLink
            href="https://www.linkedin.com/in/anilseervi/"
            text="LinkedIn"
            isExternal
          />
          <FooterLink
            href="https://instagram.com/linaseervi"
            text="Instagram"
            isExternal
          />
          <FooterLink href="/tweets" text="Tweets" />
        </div>
        <div className="flex flex-col items-start space-y-4">
          <FooterLink href="/blog" text="Blog" />
          <FooterLink href="/snippets" text="Snippets" />
          <FooterLink href="/anime" text="Anime" />
          <FooterLink href="/spotify" text="Spotify" />
        </div>
      </div>
      <div
        className="mt-8 flex items-center justify-between self-stretch text-sm text-gray-300 dark:text-gray-600"
        ref={intersectionRef}
      >
        <p>
          Built with Next.js <span>&#9650;</span>
        </p>
        {enabled ? <Metrics slug={slug} /> : null}
      </div>
    </footer>
  );
}

const Metrics = ({ slug }: { slug: string }) => {
  const { views, isLoading: viewsIsLoading } = usePageViews(slug);

  return (
    <>
      <span>
        {viewsIsLoading ? <LoadingDots /> : <InlineMetric stat={views} />} views
      </span>
    </>
  );
};
