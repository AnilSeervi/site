import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { site } from '~/config/site';

export const GET: APIRoute = async (context) => {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const snippets = await getCollection('snippets');

  return rss({
    title: site.title,
    description: site.description,
    site: context.site ?? site.url,
    items: [
      ...posts.map((p) => ({
        title: p.data.title,
        description: p.data.excerpt,
        pubDate: p.data.date,
        link: `/writing/${p.id}`
      })),
      ...snippets.map((s) => ({
        title: s.data.title,
        description: s.data.description,
        link: `/writing/${s.id}`
      }))
    ],
    customData: '<language>en-us</language>'
  });
};
