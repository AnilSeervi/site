import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import NextLink from 'next/link';
import clsx from 'clsx';
import Footer from 'components/Footer';
import MobileMenu from 'components/MobileMenu';
import { usePageViews } from 'hooks/usePageViews';
import { useEffect } from 'react';
import { websiteURL } from 'lib/constants';

function NavItem({
  href,
  text,
  path
}: {
  href: string;
  text: string;
  path: string;
}) {
  const isActive = path === href;

  return (
    <NextLink
      href={href}
      className={clsx(
        isActive
          ? 'font-semibold text-gray-800 dark:text-gray-200'
          : 'font-normal text-gray-600 dark:text-gray-400',
        'hidden rounded-lg p-1 transition-all hover:bg-gray-200 dark:hover:bg-gray-800 sm:px-3 sm:py-2 md:inline-block'
      )}
    >
      <span className="capsize">{text}</span>
    </NextLink>
  );
}

export default function Container(props: {
  children: React.ReactNode;
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  date?: string;
  tags?: string[];
  preTitle?: string;
  _createdAt?: string;
  _updatedAt?: string;
  noindex?: boolean;
  ogDescription?: string;
  ogTitle?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();

  const { children, ...customMeta } = props;
  const router = useRouter();
  const slug = router.asPath;

  const { increment: incrementView } = usePageViews(slug, false);

  const meta = {
    description: 'Front-end developer, Open Source enthusiast.',
    type: 'website',
    ...customMeta
  };

  const searchParams = new URLSearchParams([
    ['title', meta.ogTitle || meta.title],
    ['description', meta.ogDescription ?? ''],
    ['image', meta.image ?? ''],
    ['url', websiteURL.replace('https://', '') + slug],
    ['preTitle', meta.preTitle ?? '']
  ]);

  const ogURL = `${websiteURL}/api/og?${searchParams.toString()}`;

  useEffect(() => {
    incrementView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        <title>{meta.title}</title>
        <meta
          name="robots"
          content={meta.noindex ? 'nofollow, noindex' : 'follow, index'}
        />
        <meta content={meta.description} name="description" />
        <meta property="og:url" content={`${websiteURL}${slug}`} />
        <link rel="canonical" href={`${websiteURL}${slug}`} />
        <meta property="og:type" content={meta.type} />
        <meta property="og:site_name" content="Anil Seervi" />
        <meta property="og:description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:image" content={ogURL} name="image" />
        <meta property="og:image:height" content="1800" />
        <meta property="og:image:width" content="942" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@linASeervi" />
        <meta name="twitter:creator" content="@linASeervi" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:alt" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={ogURL} />
        {meta.date && (
          <meta property="article:published_time" content={meta.date} />
        )}
        {meta._updatedAt && (
          <meta property="article:modified_time" content={meta._updatedAt} />
        )}
        <meta
          name="theme-color"
          content={resolvedTheme === 'dark' ? '#111827' : '#f9fafb'}
        />
        <meta name="color-scheme" content="light dark" />
      </Head>
      <header className="flex flex-col justify-center px-8">
        <nav className="relative mx-auto flex w-full max-w-2xl items-center justify-between border-gray-200 bg-gray-50 bg-opacity-60 pt-8 pb-8  text-gray-900 dark:border-gray-700  dark:bg-gray-900 dark:text-gray-100 sm:pb-16">
          <a href="#skip" className="skip-nav">
            Skip to content
          </a>
          <div className="ml-[-0.60rem]">
            <MobileMenu />
            <NavItem path={slug} href="/" text="Home" />
            <NavItem path={slug} href="/guestbook" text="Guestbook" />
            <NavItem path={slug} href="/projects" text="Projects" />
            <NavItem path={slug} href="/blog" text="Blog" />
            <NavItem path={slug} href="/snippets" text="Snippets" />
          </div>
          <button
            aria-label={`Switch to ${
              resolvedTheme === 'dark' ? 'light' : 'dark'
            } theme`}
            id="theme-toggle"
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 ring-gray-300 transition-all  dark:bg-gray-600"
            onClick={() =>
              setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="472.39"
              height="472.39"
              viewBox="0 0 472.39 472.39"
            >
              <g className="toggle-sun">
                <path d="M403.21,167V69.18H305.38L236.2,0,167,69.18H69.18V167L0,236.2l69.18,69.18v97.83H167l69.18,69.18,69.18-69.18h97.83V305.38l69.18-69.18Zm-167,198.17a129,129,0,1,1,129-129A129,129,0,0,1,236.2,365.19Z" />
              </g>
              <g className="toggle-circle">
                <circle className="cls-1" cx="236.2" cy="236.2" r="103.78" />
              </g>
            </svg>
          </button>
        </nav>
      </header>
      <main
        id="skip"
        className="flex flex-col justify-center bg-gray-50 px-8 dark:bg-gray-900"
      >
        {children}
      </main>
      <Footer slug={slug} />
    </>
  );
}
