import { queryBuilder } from 'lib/planetscale';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const total = await queryBuilder
      .selectFrom('page')
      .select(['likes'])
      .execute();

    const totalLikes = total.reduce((acc, curr) => {
      acc.likes += +curr.likes;
      return acc;
    }, { likes: 0 });


    res.setHeader('Allow', ['GET']);
    return res.status(200).json({ total: totalLikes.likes.toString() });
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: e.message });
  }
}
