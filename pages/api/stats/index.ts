import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from 'lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const total = await prisma.page.aggregate({
      _sum: {
        views: true,
        likes: true
      }
    });

    res.setHeader('Allow', ['GET']);
    return res
      .status(200)
      .json({
        views: total._sum.views.toString(),
        likes: total._sum.likes.toString()
      });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
