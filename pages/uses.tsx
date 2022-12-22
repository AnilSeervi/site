import Container from 'components/Container';
import { siteTitle } from 'lib/constants';
import Image from 'next/image';

export default function Uses() {
  return (
    <Container
      title="Gear that Anil uses"
      description="Here's what tech I'm currently using for coding, videos, and music."
      image="unsplash/photo-1614624533048-a9c2f9cb5a96"
    >
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /uses
      </h1>
      <p className="text-gray-700 dark:text-gray-300">
        Gonna fill this up sometime later...
      </p>
    </Container>
  );
}
