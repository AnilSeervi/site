import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';
import clsx from 'clsx';
import Footer from 'components/Footer';
import { usePageViews } from 'hooks/usePageViews';
import { useEffect } from 'react';
import { websiteURL } from 'lib/constants';
import Header from './Header';

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
  style?: string;
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
      <Header />
      {props.type !== 'article' ? (
        <main
          id="skip"
          className={clsx(
            'relative mb-8 grid grid-cols-[1fr,min(672px,100%),1fr] gap-y-8 px-4 text-base text-black dark:text-white xl:grid-cols-[1fr,minmax(auto,240px),min(672px,100%),minmax(auto,240px),1fr] xl:gap-x-9 xl:px-0 [&>*]:col-start-2 xl:[&>*]:col-start-3',
            props.style
          )}
        >
          {children}
        </main>
      ) : (
        <main id="skip">
          <article
            className={clsx(
              'relative mb-8 grid grid-cols-[1fr,min(672px,100%),1fr] gap-y-8 px-4 text-base text-black dark:text-white xl:grid-cols-[1fr,minmax(auto,240px),min(672px,100%),minmax(auto,240px),1fr] xl:gap-x-9 xl:px-0 [&>*]:col-start-2 xl:[&>*]:col-start-3',
              props.style
            )}
          >
            {children}
          </article>
        </main>
      )}
      <Footer />
    </>
  );
}
