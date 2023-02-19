import ExternalLink from 'components/ExternalLink';
import TopArtistsIcons from 'components/TopArtistsIcons';
import TopTracks from 'components/TopTracks';
import { getTopArtists, getTopTracks } from 'lib/spotify';

export const revalidate = 200;

async function Spotify() {
  let topTrackItems = null;
  let topArtistItems = null;
  try {
    const topTracksResponse = await getTopTracks();
    const topArtistsResponse = await getTopArtists();

    const { items: toptitems } = await topTracksResponse.json();
    const { items: topaitems } = await topArtistsResponse.json();
    topArtistItems = topaitems;
    topTrackItems = toptitems;
  } catch (err) {
    console.log(err);
  }

  const tracks =
    topTrackItems?.map((track) => ({
      artist: track.artists.map((_artist) => _artist.name).join(', '),
      songUrl: track.external_urls.spotify,
      title: track.name,
      image: track.album.images[0].url,
      previewUrl: track.preview_url,
      id: track.id
    })) ?? [];

  const artists =
    topArtistItems?.map((artist) => ({
      artistUrl: artist.external_urls.spotify,
      name: artist.name,
      followers: artist.followers.total,
      image: artist.images[2].url
    })) ?? [];

  return (
    <>
      <h1 className="text-3xl font-bold text-black dark:text-white md:text-5xl">
        /spotify
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
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
      <h2 className="text-3xl font-bold text-black dark:text-white">
        Top Tracks
      </h2>
      <div className="flex flex-col">
        <p className="text-gray-600 dark:text-gray-400">
          Curious what I'm currently jamming to? Here's my top tracks on Spotify
          updated daily.
        </p>
        <TopTracks data={tracks} />
      </div>
      <h2 className="text-3xl font-bold text-black dark:text-white">
        Top Artists
      </h2>
      <div>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          These are some of the top artists on Spotify that I'm currently vibing
          to.
        </p>
        <TopArtistsIcons data={artists} />
      </div>
    </>
  );
}

export default Spotify;

//  title = 'Spotify';
//  description =
//    'My personal Spotify dashboard with my top tracks and top artists';
//  preTitle = "What's hot on my Spotify";
//  ogDescription =
//    'Personal Spotify dashboard with my top tracks and top artists, updates every day.';
//  image = 'unsplash/photo-1613329671121-5d1cf551cc3f';
//  ogTitle = 'Spotify Dashboard';
