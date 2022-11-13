import { getMAL } from 'lib/mal';
import { Animes } from 'lib/types';
import { NextApiRequest, NextApiResponse } from 'next';

type Error = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Animes | Error>
) {
  try {
    const response = await getMAL();
    const { data, error } = await response.json();

    if (!response.ok) throw new Error(error);

    const animes = data.map((anime) => ({
      id: anime.node.id,
      title: anime.node.title,
      score: anime.list_status.score,
      status: anime.list_status.status,
      episodes: anime.list_status.num_episodes_watched,
      image: anime.node.main_picture.large,
      start_date: anime.list_status.start_date,
      finish_date: anime.list_status.finish_date
    }));

    res.setHeader(
      'Cache-Control',
      'public s-maxage=86400, stale-while-revalidate=43200'
    );
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(animes);
  } catch (err) {
    res.status(405).json({ message: err.message });
  }
  res.end();
}
