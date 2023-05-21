import Guestbook from 'components/Guestbook';
import { queryBuilder } from 'lib/planetscale';
import { getServerSession } from 'next-auth/next';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getOG } from 'utils/og';

async function getGuestbookData() {
  const entries = await queryBuilder
    .selectFrom('guestbook')
    .select(['id', 'body', 'created_by', 'updated_at'])
    .orderBy('updated_at', 'desc')
    .limit(100)
    .execute();

  return entries;
}

export const dynamic = 'force-dynamic';

export const revalidate = 1800;

export const metadata = {
  title: 'Guestbook',
  description: 'My personal guestbook, built with Next.js API routes.',
  openGraph: {
    title: 'Guestbook',
    description: 'My personal guestbook, built with Next.js API routes.',
    images: [
      {
        url: getOG({
          title: 'Guestbook',
          description: 'My personal guestbook, built with Next.js API routes.',
          slug: '/guestbook',
          image: 'unsplash/photo-1627056503679-34051c0122c5'
        }),
        width: 1920,
        height: 1080,
        alt: 'Guestbook'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guestbook',
    images: [
      {
        url: getOG({
          title: 'Guestbook',
          description: 'My personal guestbook, built with Next.js API routes.',
          slug: '/guestbook',
          image: 'unsplash/photo-1627056503679-34051c0122c5'
        }),
        width: 1920,
        height: 1080,
        alt: 'Guestbook'
      }
    ]
  }
};

async function GuestBook() {
  let entries = [],
    session = null;
  try {
    const [data, sessionRes] = await Promise.allSettled([
      getGuestbookData(),
      getServerSession(authOptions)
    ]);
    if (data.status === 'fulfilled' && data.value[0]) {
      entries = data?.value.map((entry) => ({
        id: entry.id.toString(),
        body: entry.body,
        created_by: entry.created_by.toString(),
        updated_at: entry.updated_at.toString()
      }));
    } else {
      console.error(data);
    }

    if (sessionRes.status === 'fulfilled') {
      session = sessionRes.value;
    } else {
      console.error(sessionRes);
    }
  } catch (err) {
    console.error(err);
  }
  return (
    <>
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-start justify-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
          /guestbook
        </h1>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Leave a comment below. It could be anything – appreciation,
          information, wisdom, or even humor. Surprise me!
        </p>
        <Guestbook entries={entries} session={session} />
      </div>
    </>
  );
}

export default GuestBook;
