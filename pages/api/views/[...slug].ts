import { eq } from 'drizzle-orm';
import { page } from 'drizzle/schema';
import { db } from 'lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSlug } from 'utils';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const slug = getSlug(req.query.slug);

    const postViews = await db
      .select({
        views: page.views
      })
      .from(page)
      .where(eq(page.slug, slug));

    const views = postViews[0]?.views || 0;

    if (req.method === 'POST') {
      if (!postViews[0]) {
        await db.insert(page).values({
          slug,
          views: 1
        } as typeof page.$inferInsert);
      }

      await db
        .update(page)
        .set({ views: views + 1 } as Partial<typeof page.$inferInsert>)
        .where(eq(page.slug, slug));

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
