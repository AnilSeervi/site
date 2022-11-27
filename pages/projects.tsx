import Container from 'components/Container';
import ExternalLink from 'components/ExternalLink';

function Projects() {
  return (
    <Container title="Projects built by Anil">
      <article className="mx-auto mb-16 flex w-full max-w-2xl flex-col items-start justify-center">
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-white md:text-5xl">
          /projects
        </h1>
        <p className="mt-2 mb-8 text-gray-700 dark:text-gray-300">
          Coming soon... <br />
          Meanwhile you can visit my{' '}
          <a
            href="https://github.com/AnilSeervi"
            target="_blank"
            rel="noopener noreferrer"
          >
            Github Account
            <ExternalLink />
          </a>
        </p>
      </article>
    </Container>
  );
}

export default Projects;
