import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from 'lib/prisma';
import { z } from 'zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const slug = z.string().array().parse(req.query.slug).join('/');

    if (req.method === 'GET') {
      const post = await prisma.page.findUnique({
        where: {
          slug
        }
      });

      return res.status(200).json({
        views: post?.views.toString() || '1',
        likes: post?.likes.toString() || '0'
      });
    }
    res.setHeader('Allow', ['GET']);
    return res.status(405).send('Method Not Allowed');
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
