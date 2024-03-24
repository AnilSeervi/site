import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { db } from 'lib/db';
import { guestbook } from 'drizzle/schema';
import { desc } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const entries = db
        .select()
        .from(guestbook)
        .orderBy(desc(guestbook.updated_at));

      return res.json(
        entries[0]?.map((entry) => ({
          id: entry.id.toString(),
          body: entry.body,
          created_by: entry.created_by,
          updated_at: entry.updated_at
        }))
      );
    }

    const session = await getSession({ req });
    const { email, name } = session.user;

    if (!session) {
      return res.status(403).send('Unauthorized');
    }

    if (req.method === 'POST') {
      const [newEntry] = await db
        .insert(guestbook)
        .values({
          email,
          body: req.body.body || '',
          created_by: name
        })
        .returning({
          id: guestbook.id,
          body: guestbook.body,
          created_by: guestbook.created_by,
          updated_at: guestbook.updated_at
        });

      return res.status(200).json({
        id: newEntry.id.toString(),
        body: newEntry.body,
        created_by: newEntry.created_by,
        updated_at: newEntry.updated_at
      });
    }

    return res.send('Method not allowed.');
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
}
