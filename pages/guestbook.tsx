import prisma from 'lib/prisma';
import Container from 'components/Container';
import Guestbook from 'components/Guestbook';
import { siteTitle } from 'lib/constants';

export default function GuestbookPage({ fallbackData }) {
  return (
    <Container
      title={`Guestbook`}
      description="Sign my digital guestbook and share some wisdom."
      preTitle="Sign my Guestbook"
      image="unsplash/photo-1627056503679-34051c0122c5"
    >
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-start justify-center">
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-black dark:text-white md:text-5xl">
          /guestbook
        </h1>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Leave a comment below. It could be anything – appreciation,
          information, wisdom, or even humor. Surprise me!
        </p>
        <Guestbook fallbackData={fallbackData} />
      </div>
    </Container>
  );
}

export async function getStaticProps() {
  const entries = await prisma.guestbook.findMany({
    orderBy: {
      updated_at: 'desc'
    }
  });

  const fallbackData = entries.map((entry) => ({
    id: entry.id.toString(),
    body: entry.body,
    created_by: entry.created_by.toString(),
    updated_at: entry.updated_at.toString()
  }));

  return {
    props: {
      fallbackData
    },
    revalidate: 60
  };
}
