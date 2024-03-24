import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { db } from 'lib/db';
import { page } from 'drizzle/schema';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const slug = z.string().array().parse(req.query.slug).join('/');

    if (req.method === 'GET') {
      const stats = await db
        .select({
          views: page.views,
          likes: page.likes
        })
        .from(page)
        .where(eq(page.slug, slug));

      return res.status(200).json(stats[0] || { views: 0, likes: 0 });
    }
    res.setHeader('Allow', ['GET']);
    return res.status(405).send('Method Not Allowed');
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: e.message });
  }
}
