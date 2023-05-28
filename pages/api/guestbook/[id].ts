import { queryBuilder } from 'lib/planetscale';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  const { id } = req.query;
  const { email } = session.user;

  const [entry] = await queryBuilder.selectFrom('guestbook')
    .where('id', '=', Number(id))
    .select(['id', 'body', 'created_by', 'updated_at', 'email'])
    .execute();

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

    await queryBuilder.deleteFrom('guestbook')
      .where('id', '=', Number(id))
      .execute();

    return res.status(204).json({});
  }

  if (req.method === 'PUT') {
    const body = (req.body.body || '').slice(0, 500);

    await queryBuilder.updateTable('guestbook').set({
      body,
      updated_at: new Date().toISOString()
    })
      .where('id', '=', Number(id))
      .execute();

    return res.status(201).json({
      ...entry,
      body
    });
  }

  return res.send('Method not allowed.');
}
