import Guestbook from 'components/Guestbook';
import prisma from 'lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from 'pages/api/auth/[...nextauth]';

async function getGuestbook() {
  const entries = await prisma.guestbook.findMany({
    orderBy: {
      updated_at: 'desc'
    }
  });
  return entries;
}

export const revalidate = 1800;

async function GuestBook() {
  let entries = [],
    session = null;
  try {
    const [data, sessionRes] = await Promise.allSettled([
      getGuestbook(),
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
    console.log(err);
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
        <Guestbook fallbackData={entries} session={session} />
      </div>
    </>
  );
}

export default GuestBook;

//  title={`Guestbook`}
//     description="Sign my digital guestbook and share some wisdom."
//     preTitle="Sign my Guestbook"
//     image="unsplash/photo-1627056503679-34051c0122c5"
