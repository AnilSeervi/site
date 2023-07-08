import FunctionCard from 'components/FunctionCard';
import { allSnippetsQuery } from 'lib/queries';
import { getClient } from 'lib/sanity-server';
import { Snippet } from 'lib/types';
import { getOG } from 'utils/og';

export const metadata = {
  title: 'Snippets',
  description:
    'A collection of code snippets I have used and saved. Mostly CSS and JS tricks, but also some serverless functions and some setup instructions.',
  openGraph: {
    title: 'Snippets',
    description:
      'A collection of code snippets I have used and saved. Mostly CSS and JS tricks, but also some serverless functions and some setup instructions.',
    images: [
      {
        url: getOG({
          title: 'Snippets',
          description:
            'A collection of code snippets I have used and saved. Mostly CSS and JS tricks, but also some serverless functions and some setup instructions.',
          slug: '/snippets',
          preTitle: 'Check out this Snippets',
          image: 'unsplash/photo-1616628188467-8fb29f49bbe8'
        }),
        width: 1280,
        height: 720,
        alt: 'Snippets'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Snippets',
    description:
      'A collection of code snippets I have used and saved. Mostly CSS and JS tricks, but also some serverless functions and some setup instructions.',
    images: {
      url: getOG({
        title: 'Snippets',
        description:
          'A collection of code snippets I have used and saved. Mostly CSS and JS tricks, but also some serverless functions and some setup instructions.',
        slug: '/snippets',
        preTitle: 'Check out this Snippets',
        image: 'unsplash/photo-1616628188467-8fb29f49bbe8'
      }),
      width: 1280,
      height: 720,
      alt: 'Snippets'
    }
  }
};

async function SnippetsIndex() {
  let snippets: Snippet[] = [];

  try {
    snippets = await getClient(false).fetch(allSnippetsQuery);
  } catch (e) {
    console.log(e);
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /snippets
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        A collection of code snippets I've used and saved. Mostly CSS and JS
        tricks, but also some serverless functions and some setup insctructions.
      </p>
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {snippets.map((snippet) => (
          <FunctionCard
            key={snippet.slug}
            title={snippet.title}
            slug={snippet.slug}
            logo={snippet.logo}
            description={snippet.description}
          />
        ))}
      </div>
    </>
  );
}

export default SnippetsIndex;
