import type { NextApiRequest, NextApiResponse } from 'next';
import { queryBuilder } from 'lib/planetscale';
import { z } from 'zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const slug = z.string().array().parse(req.query.slug).join('/');

    if (req.method === 'GET') {
      const [post] = await queryBuilder
        .selectFrom('page')
        .where('slug', '=', slug)
        .select(['views', 'likes'])
        .execute();

      return res.status(200).json({
        views: post.views.toString() || '1',
        likes: post.likes.toString() || '0'
      });
    }
    res.setHeader('Allow', ['GET']);
    return res.status(405).send('Method Not Allowed');
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: e.message });
  }
}
