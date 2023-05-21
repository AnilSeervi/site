import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { queryBuilder } from 'lib/planetscale';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    if (req.method === 'GET') {
      const entries = await queryBuilder
        .selectFrom('guestbook')
        .selectAll()
        .orderBy('updated_at', 'desc')
        .execute();

      return res.json(
        entries.map((entry) => ({
          id: entry.id.toString(),
          body: entry.body,
          created_by: entry.created_by,
          updated_at: entry.updated_at
        }))
      );
    }

    const session = await getSession({ req });
    const { email, name } = session.user;
    console.log(session, "session")

    if (!session) {
      return res.status(403).send('Unauthorized');
    }

    if (req.method === 'POST') {

      const newEntry = await queryBuilder.
        insertInto('guestbook')
        .values({
          email,
          body: req.body.body || '',
          created_by: name
        }).returning(['id', 'body', 'created_by', 'updated_at'])
        .executeTakeFirstOrThrow();

      return res.status(200).json({
        id: newEntry.id.toString(),
        body: newEntry.body,
        created_by: newEntry.created_by,
        updated_at: newEntry.updated_at
      });
    }

    return res.send('Method not allowed.');
  }
  catch (e) {
    console.error(e)
    return res.status(500).json({ message: e.message });
  }
}
