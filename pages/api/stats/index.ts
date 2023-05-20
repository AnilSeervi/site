import type { NextApiRequest, NextApiResponse } from 'next';
import { queryBuilder } from 'lib/planetscale';

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse
) {
  try {

    const total = await queryBuilder
      .selectFrom('page')
      .select(['views', 'likes'])
      .execute();

    const totalStats = total.reduce((acc, curr) => {
      acc.views += +curr.views;
      acc.likes += +curr.likes;
      return acc;
    }, { views: 0, likes: 0 });

    res.setHeader('Allow', ['GET']);
    return res
      .status(200)
      .json({
        views: totalStats.views.toString(),
        likes: totalStats.likes.toString()
      });
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: e.message });
  }
}
