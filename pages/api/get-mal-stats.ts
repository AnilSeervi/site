import { getMALStats } from 'lib/mal';
import { AnimeStats, Error } from 'lib/types';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnimeStats | Error>
) {
  try {
    const response = await getMALStats();
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    res.setHeader(
      'Cache-Control',
      'public s-maxage=86400, stale-while-revalidate=43200'
    );
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (err) {
    res.status(405).json({ message: err.message });
  }
  res.end();
}
