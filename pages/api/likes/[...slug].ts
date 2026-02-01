import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createHash } from 'crypto';
import { getSlug } from 'utils';
import { db } from 'lib/db';
import { page, session } from 'drizzle/schema';
import { eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const ipAddress =
      req.headers['x-forwarded-for'] ||
      // Fallback for localhost or non Vercel deployments
      '0.0.0.0';

    const currentUserId =
      // Since a users IP address is part of the sessionId in our database, we
      // hash it to protect their privacy. By combining it with a salt, we get
      // get a unique id we can refer to, but we won't know what their ip
      // address was.
      createHash('md5')
        .update(ipAddress + process.env.IP_ADDRESS_SALT!, 'utf8')
        .digest('hex');

    const slug = getSlug(req.query.slug);

    const sessionId = slug + '___' + currentUserId;

    const [[post], [user]] = await Promise.all([
      await db
        .select({ likes: page.likes })
        .from(page)
        .where(eq(page.slug, slug)),
      await db
        .select({ likes: session.likes })
        .from(session)
        .where(eq(session.id, sessionId))
    ]);

    let currentUserLikes = 0;
    if (user?.likes) {
      currentUserLikes = +user.likes;
    }

    if (req.method === 'POST') {
      const count = z.number().min(1).max(3).parse(req.body.count);

      const sessionQuery = user?.likes
        ? db
            .update(session)
            .set({ likes: currentUserLikes + count } as Partial<typeof session.$inferInsert>)
            .where(eq(session.id, sessionId))
        : db.insert(session).values({ id: sessionId, likes: count });

      const [[pageLikes], [sessionLikes]] = await Promise.all([
        await db
          .update(page)
          .set({
            likes: +post.likes + count
          } as Partial<typeof page.$inferInsert>)
          .where(eq(page.slug, slug))
          .returning({ likes: page.likes }),

        await sessionQuery.returning()
      ]);

      return res.status(200).json({
        likes: (+post.likes + count).toString() || '0',
        currentUserLikes: (currentUserLikes + count).toString() || '0'
      });
    }

    if (req.method === 'GET') {
      return res.status(200).json({
        likes: post?.likes.toString() || '0',
        currentUserLikes: currentUserLikes.toString() || '0'
      });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).send('Method Not Allowed');
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}
