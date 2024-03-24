import { eq } from 'drizzle-orm';
import { guestbook } from 'drizzle/schema';
import { db } from 'lib/db';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  const { id } = req.query;
  const { email } = session.user;

  const [entry] = await db
    .select({
      id: guestbook.id,
      body: guestbook.body,
      created_by: guestbook.created_by,
      updated_at: guestbook.updated_at,
      email: guestbook.email
    })
    .from(guestbook)
    .where(eq(guestbook.id, Number(id)));

  if (req.method === 'GET') {
    return res.json({
      id: entry.id.toString(),
      body: entry.body,
      created_by: entry.created_by,
      updated_at: entry.updated_at
    });
  }

  if (!session || email !== entry.email) {
    return res.status(403).send('Unauthorized');
  }

  if (req.method === 'DELETE') {
    await db.delete(guestbook).where(eq(guestbook.id, Number(id)));

    return res.status(204).json({});
  }

  if (req.method === 'PUT') {
    const body = (req.body.body || '').slice(0, 500);

    const [entry] = await db
      .update(guestbook)
      .set({
        body,
        updated_at: new Date().getTime()
      })
      .where(eq(guestbook.id, Number(id)))
      .returning({
        id: guestbook.id,
        body: guestbook.body,
        created_by: guestbook.created_by,
        updated_at: guestbook.updated_at
      });

    return res.status(201).json({
      ...entry,
      body
    });
  }

  return res.send('Method not allowed.');
}
