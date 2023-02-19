import { components } from 'components/ProseComponents';
import { websiteURL } from 'lib/constants';

export const metadata = {
  title: 'About'
};

function About() {
  return (
    <>
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /about
      </h1>
      <components.h2>Bio</components.h2>
      <div>
        <components.h3>Job Title</components.h3>
        <p className="mt-2">
          Anil Seervi, Software Development Engineer at Zenduty
        </p>
      </div>
      <components.h2>Links</components.h2>
      <components.ul>
        <li>
          Twitter:{' '}
          <components.a href="https://twitter.com/linaseervi">
            @linASeervi
          </components.a>
        </li>
        <li>
          GitHub:{' '}
          <components.a href="https://github.com/AnilSeervi">
            @AnilSeervi
          </components.a>
        </li>
        <li>
          Website: <components.a href={websiteURL}>{websiteURL}</components.a>
        </li>
        <li>
          LinkedIn:{' '}
          <components.a href="https://www.linkedin.com/in/anilseervi/">
            https://www.linkedin.com/in/anilseervi
          </components.a>
        </li>
      </components.ul>
    </>
  );
}

export default About;
