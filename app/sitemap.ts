import { sanityClient } from 'lib/sanity-server';
import { allSnippetsQuery, indexQuery } from 'lib/queries';
import { websiteURL } from 'lib/constants';

export default async function sitemap() {
  const allPosts = await sanityClient.fetch(indexQuery);
  const allBlogs = allPosts.map((post) => {
    return {
      url: `${websiteURL}/blog/${post.slug}`,
      lastModified: new Date(post._updatedAt).toISOString().split('T')[0]
    };
  });
  const allSnippets = await sanityClient.fetch(allSnippetsQuery);
  const allSnippetBlogs = allSnippets.map((post) => {
    return {
      url: `${websiteURL}/snippets/${post.slug}`,
      lastModified: new Date(post._updatedAt).toISOString().split('T')[0]
    };
  });

  const routes = [
    '',
    '/about',
    '/blog',
    '/guestbook',
    '/uses',
    '/anime',
    '/spotify',
    '/snippets',
    '/projects',
    '/dashboard'
  ].map((route) => ({
    url: `${websiteURL}${route}`,
    lastModified: new Date().toISOString().split('T')[0]
  }));

  return [...routes, ...allBlogs, ...allSnippetBlogs];
}
