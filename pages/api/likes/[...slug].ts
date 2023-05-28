import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createHash } from 'crypto';
import { getSlug } from 'utils';
import { queryBuilder } from 'lib/planetscale';

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
      await queryBuilder.selectFrom('page').where('slug', '=', slug).select(['likes']).execute(),
      await queryBuilder.selectFrom('session').where('id', '=', sessionId).select(['likes']).execute()
    ])

    let currentUserLikes = 0;
    if (user?.likes) {
      currentUserLikes = +user.likes;
    }

    if (req.method === 'POST') {
      const count = z.number().min(1).max(3).parse(req.body.count);

      await Promise.all([
        await queryBuilder.insertInto('page').values({
          slug, likes: count
        })
          .onDuplicateKeyUpdate({
            likes: +post.likes + count,
          }).execute(),

        await queryBuilder.insertInto('session').values({
          id: sessionId, likes: count
        })
          .onDuplicateKeyUpdate({
            likes: currentUserLikes + count,
          }).execute()
      ])

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
