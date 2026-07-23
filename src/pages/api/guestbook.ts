/**
 * /api/guestbook — the guestbook.
 *
 *   GET    → {entries: [{id, body, doodle, created_by, created_at}]} — latest
 *            50, NEVER exposes email. s-maxage=30; DB down → {entries:null}.
 *   POST   → session required (401). JSON {body?} (trimmed, ≤500 chars) or
 *            {doodle?} (data:image/png;base64 URL ≤80KB, decode-validated
 *            base64 + PNG magic bytes). Inserts with the session's
 *            email/name. → {entry}.
 *   DELETE → session required. JSON {id}; the session email must match the
 *            row's email (403 otherwise). → {ok:true}.
 */
import type { APIRoute } from 'astro';
import { desc, eq } from 'drizzle-orm';
import { db, isDbConfigured } from '~/lib/db';
import { guestbook } from '~/lib/schema';
import { readSession } from '~/lib/session';

export const prerender = false;

function json(body: unknown, init: { sMaxAge?: number; status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control':
        init.sMaxAge != null
          ? `public, s-maxage=${init.sMaxAge}, stale-while-revalidate=${init.sMaxAge * 2}`
          : 'no-store'
    }
  });
}

const PUBLIC_COLS = {
  id: guestbook.id,
  body: guestbook.body,
  doodle: guestbook.doodle,
  created_by: guestbook.created_by,
  created_at: guestbook.created_at
};

export const GET: APIRoute = async () => {
  if (!isDbConfigured) return json({ disabled: true }, { sMaxAge: 30 });
  try {
    const entries = await db()
      .select(PUBLIC_COLS)
      .from(guestbook)
      .orderBy(desc(guestbook.created_at), desc(guestbook.id))
      .limit(50);
    return json({ entries }, { sMaxAge: 30 });
  } catch {
    return json({ entries: null }, { sMaxAge: 60 });
  }
};

const DOODLE_PREFIX = 'data:image/png;base64,';
const DOODLE_MAX = 80 * 1024; // 80KB
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Strict doodle check: data:image/png;base64 URL, ≤80KB, decodable, PNG magic. */
function isValidDoodle(doodle: string): boolean {
  if (doodle.length > DOODLE_MAX || !doodle.startsWith(DOODLE_PREFIX)) return false;
  const b64 = doodle.slice(DOODLE_PREFIX.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64) || b64.length % 4 !== 0) return false;
  let bytes: Buffer;
  try {
    bytes = Buffer.from(b64, 'base64');
  } catch {
    return false;
  }
  if (bytes.length < PNG_MAGIC.length) return false;
  return PNG_MAGIC.every((m, i) => bytes[i] === m);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const session = await readSession(cookies);
  if (!session) return json({ error: 'unauthorized' }, { status: 401 });
  if (!isDbConfigured) return json({ disabled: true });

  let payload: { body?: unknown; doodle?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'invalid json' }, { status: 400 });
  }

  const body = typeof payload.body === 'string' ? payload.body.trim().slice(0, 500) : '';
  const doodle = typeof payload.doodle === 'string' ? payload.doodle : null;
  if (doodle != null && !isValidDoodle(doodle)) {
    return json({ error: 'invalid doodle' }, { status: 400 });
  }
  if (!body && !doodle) return json({ error: 'empty entry' }, { status: 400 });

  try {
    const [entry] = await db()
      .insert(guestbook)
      .values({
        email: session.email ?? '',
        body,
        doodle,
        created_by: session.name
      })
      .returning(PUBLIC_COLS);
    return json({ entry });
  } catch {
    return json({ entry: null }, { sMaxAge: 60 });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
  const session = await readSession(cookies);
  if (!session) return json({ error: 'unauthorized' }, { status: 401 });
  if (!isDbConfigured) return json({ disabled: true });

  let id: number;
  try {
    const payload = (await request.json()) as { id?: unknown };
    id = Number(payload.id);
  } catch {
    return json({ error: 'invalid json' }, { status: 400 });
  }
  if (!Number.isInteger(id)) return json({ error: 'invalid id' }, { status: 400 });

  try {
    const [row] = await db()
      .select({ email: guestbook.email })
      .from(guestbook)
      .where(eq(guestbook.id, id))
      .limit(1);
    if (!row) return json({ error: 'not found' }, { status: 404 });
    if (!session.email || row.email !== session.email) {
      return json({ error: 'forbidden' }, { status: 403 });
    }
    await db().delete(guestbook).where(eq(guestbook.id, id));
    return json({ ok: true });
  } catch {
    return json({ ok: false }, { sMaxAge: 60 });
  }
};
