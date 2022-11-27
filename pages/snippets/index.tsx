import Container from 'components/Container';
import FunctionCard from 'components/FunctionCard';
import { InferGetStaticPropsType } from 'next';
import { allSnippetsQuery } from 'lib/queries';
import { getClient } from 'lib/sanity-server';
import { Snippet } from 'lib/types';
import { siteTitle } from 'lib/constants';

export default function Snippets({
  snippets
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <Container
      title={`Code Snippets – ${siteTitle}`}
      description="A collection of code snippets – including serverless functions, Node.js scripts, and CSS tricks."
      preTitle="Check out these Snippets"
    >
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-start justify-center">
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-white md:text-5xl">
          /snippets
        </h1>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          A collection of code snippets I've used and saved. Mostly CSS and JS
          tricks, but also some serverless functions and some setup
          insctructions.
        </p>
        <div className="my-2 mt-4 grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
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
      </div>
    </Container>
  );
}

export async function getStaticProps({ preview = false }) {
  const snippets: Snippet[] = await getClient(preview).fetch(allSnippetsQuery);

  return { props: { snippets } };
}
