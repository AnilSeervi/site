import Container from 'components/Container';
import TopTracks from 'components/TopTracks';
import TopArtistsIcons from 'components/TopArtistsIcons';
import ExternalLink from 'components/ExternalLink';

export default function Spotify() {
  return (
    <Container
      title="Spotify - Anil Seervi"
      description="My personal Spotify dashboard with my top tracks and top artists"
    >
      <div className="mx-auto mb-16 flex max-w-2xl flex-col items-start justify-center">
        <h1 className="mb-4 text-3xl font-bold text-black dark:text-white md:text-5xl">
          /spotify
        </h1>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          A personal dashboard for my Spotify account. View my{' '}
          <a
            className="transition-colors hover:text-gray-600 dark:hover:text-gray-300"
            target="_blank"
            rel="noopener noreferrer"
            href="https://open.spotify.com/user/zg30q92mvao9galx1h4bzevsg"
          >
            Spotify profile
            <ExternalLink />
          </a>{' '}
          to explore more playlists.
        </p>
        <h2 className="mb-4 mt-10 text-3xl font-bold text-black dark:text-white">
          Top Tracks
        </h2>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Curious what I'm currently jamming to? Here's my top tracks on Spotify
          updated daily.
        </p>
        <TopTracks />
        <h2 className="mb-4 mt-16 text-3xl font-bold text-black dark:text-white">
          Top Artists
        </h2>
        <TopArtistsIcons />
      </div>
    </Container>
  );
}
