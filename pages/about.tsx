import Link from 'next/link';
import Container from 'components/Container';
import { siteTitle, websiteURL } from 'lib/constants';

export default function About() {
  return (
    <Container title={`About – ${siteTitle}`}>
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /about
      </h1>
      <div className="prose leading-6 dark:prose-dark">
        <h2>Bio</h2>
        <h3>Job Title</h3>
        <p>Anil Seervi, Software Development Engineer at Zenduty</p>
        <h2>Links</h2>
        <ul>
          <li>
            Twitter: <a href="https://twitter.com/linaseervi">@linASeervi</a>
          </li>
          <li>
            GitHub: <a href="https://github.com/AnilSeervi">@AnilSeervi</a>
          </li>
          <li>
            Website: <Link href={websiteURL}>{websiteURL}</Link>
          </li>
          <li>
            LinkedIn:{' '}
            <a href="https://www.linkedin.com/in/anilseervi/">
              https://www.linkedin.com/in/anilseervi
            </a>
          </li>
        </ul>
      </div>
    </Container>
  );
}
