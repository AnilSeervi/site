import { sum } from 'drizzle-orm';
import { page } from 'drizzle/schema';
import { db } from 'lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(_: NextApiRequest, res: NextApiResponse) {
  try {
    const total = await db
      .select({
        total: sum(page.likes)
      })
      .from(page);

    res.setHeader('Allow', ['GET']);
    return res.status(200).json(total[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: e.message });
  }
}
