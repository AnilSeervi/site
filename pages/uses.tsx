import Container from 'components/Container';
import { siteTitle } from 'lib/constants';
import Image from 'next/image';

export default function Uses() {
  return (
    <Container
      title={`Uses – ${siteTitle}`}
      description="Here's what tech I'm currently using for coding, videos, and music."
    >
      <article className="mx-auto mb-16 flex w-full max-w-2xl flex-col items-start justify-center">
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-white md:text-5xl">
          /uses
        </h1>
        <p className="mt-2 mb-8 text-gray-700 dark:text-gray-300">
          Gonna fill this up sometime later...
        </p>
      </article>
    </Container>
  );
}
