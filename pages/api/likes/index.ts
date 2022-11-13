import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from 'lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const totalViews = await prisma.page.aggregate({
      _sum: {
        likes: true
      }
    });

    res.setHeader('Allow', ['GET']);
    return res.status(200).json({ total: totalViews._sum.likes.toString() });
  } catch (e) {
    return res.status(500).json({ message: e.message });
  }
}
