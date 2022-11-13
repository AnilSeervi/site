import { getMALStats } from 'lib/mal';
import { AnimeStats } from 'lib/types';
import { NextApiRequest, NextApiResponse } from 'next';

type Error = {
  message: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnimeStats | Error>
) {
  try {
    const response = await getMALStats();
    const data = await response.json();

    if (!response.ok) throw new Error(data.error);

    const stats = {
      name: data.name,
      mean_score: data.anime_statistics.mean_score,
      episodes: data.anime_statistics.num_episodes,
      watching: data.anime_statistics.num_items_watching,
      completed: data.anime_statistics.num_items_completed,
      plan_to_watch: data.anime_statistics.num_items_plan_to_watch,
      on_hold: data.anime_statistics.num_items_on_hold,
      dropped: data.anime_statistics.num_items_dropped,
      total: data.anime_statistics.num_items,
      days_watched: data.anime_statistics.num_days
    };

    res.setHeader(
      'Cache-Control',
      'public s-maxage=86400, stale-while-revalidate=43200'
    );
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(stats);
  } catch (err) {
    res.status(405).json({ message: err.message });
  }
  res.end();
}
