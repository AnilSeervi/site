import { getOG } from 'utils/og';

export const metadata = {
  title: 'Uses',
  description:
    "Here's what tech I'm currently using for coding, videos, and music.",
  openGraph: {
    title: 'Uses',
    description:
      "Here's what tech I'm currently using for coding, videos, and music.",
    images: [
      {
        url: getOG({
          title: 'Uses',
          description:
            "Here's what tech I'm currently using for coding, videos, and music.",
          slug: '/uses',
          image: 'unsplash/photo-1614624533048-a9c2f9cb5a96'
        }),
        width: 1920,
        height: 1080,
        alt: 'Uses'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Uses',
    images: [
      {
        url: getOG({
          title: 'Uses',
          description:
            "Here's what tech I'm currently using for coding, videos, and music.",
          slug: '/uses',
          image: 'unsplash/photo-1614624533048-a9c2f9cb5a96'
        }),
        width: 1920,
        height: 1080,
        alt: 'Uses'
      }
    ]
  }
};

function Uses() {
  return (
    <>
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /uses
      </h1>
      <p className="text-gray-700 dark:text-gray-300">
        Gonna fill this up sometime later...
      </p>
    </>
  );
}

export default Uses;
