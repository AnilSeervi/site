import Guestbook from 'components/Guestbook';
import { desc } from 'drizzle-orm';
import { guestbook } from 'drizzle/schema';
import { db } from 'lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from 'pages/api/auth/[...nextauth]';
import { getOG } from 'utils/og';

async function getGuestbookData() {
  return db
    .select({
      id: guestbook.id,
      body: guestbook.body,
      created_by: guestbook.created_by,
      updated_at: guestbook.updated_at
    })
    .from(guestbook)
    .orderBy(desc(guestbook.updated_at))
    .limit(100);
}

export const dynamic = 'force-dynamic';

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
        width: 1280,
        height: 720,
        alt: 'Guestbook'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guestbook',
    description: 'My personal guestbook, built with Next.js API routes.',
    images: {
      url: getOG({
        title: 'Guestbook',
        description: 'My personal guestbook, built with Next.js API routes.',
        slug: '/guestbook',
        image: 'unsplash/photo-1627056503679-34051c0122c5'
      }),
      width: 1280,
      height: 720,
      alt: 'Guestbook'
    }
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
        created_by: entry.created_by,
        updated_at: entry.updated_at
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
