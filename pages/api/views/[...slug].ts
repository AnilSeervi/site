import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from 'lib/prisma';
import { z } from 'zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const slug = z.string().array().parse(req.query.slug).join('/');

    if (req.method === 'POST') {
      const post = await prisma.page.upsert({
        create: {
          slug
        },
        update: {
          views: {
            increment: 1
          }
        },
        where: { slug }
      });

      return res.status(200).json({
        total: post?.views.toString() || '1'
      });
    }

    if (req.method === 'GET') {
      const post = await prisma.page.findUnique({
        where: {
          slug
        }
      });

      return res.status(200).json({ total: post?.views.toString() || '1' });
    }
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).send('Method Not Allowed');
  } catch (e: any) {
    return res.status(500).json({ message: e.message });
  }
}
