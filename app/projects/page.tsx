import ExternalLink from 'components/ExternalLink';

export const metadata = {
  title: 'Projects built by'
};

function Projects() {
  return (
    <>
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
    </>
  );
}

export default Projects;
