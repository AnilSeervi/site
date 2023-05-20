import { queryBuilder } from 'lib/planetscale';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSlug } from 'utils';


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const slug = getSlug(req.query.slug);

    const post = await queryBuilder
      .selectFrom('page')
      .where('slug', '=', slug)
      .select(['views'])
      .execute();

    const views = !post.length ? 0 : Number(post[0].views);

    if (req.method === 'POST') {

      await queryBuilder.insertInto('page').values({
        slug, views: 1
      }).onDuplicateKeyUpdate({
        views: views + 1,
      }).execute();

      return res.status(200).json({
        total: (views + 1).toString() || '1'
      });
    }

    if (req.method === 'GET') {
      return res.status(200).json({ total: views.toString() || '1' });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).send('Method Not Allowed');
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}
