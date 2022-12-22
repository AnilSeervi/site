import Container from 'components/Container';
import ExternalLink from 'components/ExternalLink';

function Projects() {
  return (
    <Container title="Projects built by Anil">
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /projects
      </h1>
      <p className="text-gray-700 dark:text-gray-300">
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
    </Container>
  );
}

export default Projects;
