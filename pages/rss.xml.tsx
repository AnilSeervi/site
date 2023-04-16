import RSS from 'rss';
import { sanityClient } from 'lib/sanity-server';
import { allSnippetsQuery, indexQuery } from 'lib/queries';
import { siteTitle, websiteURL } from 'lib/constants';

const siteURL = websiteURL;

export async function getServerSideProps({ res }) {
  const feed = new RSS({
    title: siteTitle,
    site_url: `${siteURL}`,
    feed_url: `${siteURL}/rss.xml`,
    language: 'en',
    description: 'A blog about web development and other things.',
    image_url: `${siteURL}/logo.jpeg`
  });

  const allPosts = await sanityClient.fetch(indexQuery);
  allPosts.map((post) => {
    feed.item({
      title: post.title,
      url: `${siteURL}/blog/${post.slug}`,
      date: post.date,
      description: post.excerpt
    });
  });

  const allSnippets = await sanityClient.fetch(allSnippetsQuery);
  allSnippets.map((snippet) => {
    feed.item({
      title: snippet.title,
      url: `${siteURL}/snippets/${snippet.slug}`,
      date: snippet._createdAt,
      description: snippet.excerpt
    });
  });

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=1200, stale-while-revalidate=600'
  );
  res.write(feed.xml({ indent: true }));
  res.end();

  return {
    props: {}
  };
}

export default function RSSFeed() {
  return null;
}
