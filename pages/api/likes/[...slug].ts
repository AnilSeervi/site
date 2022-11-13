import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from 'lib/prisma';
import { createHash } from 'crypto';

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

    const slug = req.query.slug.toString();

    const sessionId = slug + '___' + currentUserId;
    if (req.method === 'POST') {
      const { count } = req.body;

      if (count <= 3) {
        const [post, user] = await Promise.all([
          // increment the number of times everyone has liked this post
          prisma.page.upsert({
            where: { slug },
            create: {
              slug,
              likes: count
            },
            update: {
              likes: {
                increment: count
              }
            }
          }),

          // increment the number of times this user has liked this post
          prisma.session.upsert({
            where: { id: sessionId },
            create: {
              id: sessionId,
              likes: count
            },
            update: {
              likes: {
                increment: count
              }
            }
          })
        ]);

        return res.status(200).json({
          likes: post?.likes.toString() || '0',
          currentUserLikes: user?.likes.toString() || '0'
        });
      }
    }

    if (req.method === 'GET') {
      const [post, user] = await Promise.all([
        // get the number of likes this post has
        prisma.page.findUnique({
          where: { slug }
        }),

        // get the number of times the current user has liked this post
        prisma.session.findUnique({
          where: { id: sessionId }
        })
      ]);

      return res.status(200).json({
        likes: post?.likes.toString() || '0',
        currentUserLikes: user?.likes.toString() || '0'
      });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).send('Method Not Allowed');
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
