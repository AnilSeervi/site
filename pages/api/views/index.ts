import { queryBuilder } from 'lib/planetscale';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  _: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const total = await queryBuilder
      .selectFrom('page')
      .select(['views'])
      .execute();

    const totalViews = total.reduce((acc, curr) => {
      acc.views += +curr.views;
      return acc;
    }, { views: 0 });

    res.setHeader('Allow', ['GET']);
    return res.status(200).json({ total: totalViews.views.toString() });
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: e.message });
  }
}
