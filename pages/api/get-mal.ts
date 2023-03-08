import { getMAL } from 'lib/mal';
import { AnimeListNode, GenericError } from 'lib/types';

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnimeListNode[] | GenericError>
) {
  try {
    const response = await getMAL();
    const { data, error } = await response.json();

    if (!response.ok) throw new Error(error);

    res.setHeader(
      'Cache-Control',
      'public s-maxage=86400, stale-while-revalidate=43200'
    );
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(data);
  } catch (err: any) {
    res.status(405).json({ message: err.message });
  }
  res.end();
}
