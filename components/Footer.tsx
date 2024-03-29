'use client';

import Link from 'next/link';
import NowPlaying from 'components/NowPlaying';
import ExternalLink from './ExternalLink';
import { useEnabledOnFirstIntersection } from 'hooks/useEnabledOnFirstIntersection';
import { usePageViews } from 'hooks/usePageViews';
import LoadingDots from './LoadingDots';
import InlineMetric from './InlineMetric';
import { usePathname } from 'next/navigation';

type FooterLinkType = {
  href: string;
  text: string;
  isExternal?: boolean;
};

const FooterLink = ({ href, text, isExternal }: FooterLinkType) =>
  isExternal ? (
    <a
      className="flex items-center text-gray-500 transition-colors hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200/80"
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
      className="text-gray-500 transition-colors hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200/80"
    >
      {text}
    </Link>
  );

export default function Footer() {
  const slug = usePathname();

  const { enabled, intersectionRef } = useEnabledOnFirstIntersection();
  return (
    <footer className="mx-auto mb-8 flex w-full max-w-2xl flex-col items-start justify-center px-4 md:px-0">
      <hr className="border-1 mb-8 w-full border-gray-200 dark:border-gray-800" />
      <NowPlaying />
      <div className="grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-start space-y-4">
          <FooterLink href="/about" text="About" />
          <FooterLink href="/dashboard" text="Dashboard" />
          <FooterLink href="/uses" text="Uses" />
          <FooterLink
            href="https://anilseervi.substack.com"
            isExternal
            text="Newsletter"
          />
        </div>
        <div className="flex flex-col items-start space-y-4">
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
        </div>
        <div className="flex flex-col items-start space-y-4">
          <FooterLink href="/spotify" text="Spotify" />
          <FooterLink href="/projects" text="Projects" />
        </div>
      </div>
      <div
        className="mt-8 flex items-center justify-between self-stretch text-sm text-gray-500 dark:text-gray-400/90"
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
