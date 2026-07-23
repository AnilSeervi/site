/**
 * Turso (libSQL) + drizzle singleton. Server-only — secrets never reach the client.
 *
 * Check `isDbConfigured` before calling `db()`; endpoints must degrade to
 * 200 {"disabled":true} when the env vars are missing rather than throwing.
 */
import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from '~/lib/schema';

const url = import.meta.env.TURSO_DATABASE_URL as string | undefined;
const authToken = import.meta.env.TURSO_AUTH_TOKEN as string | undefined;

/** True when both Turso env vars are present. */
export const isDbConfigured = Boolean(url && authToken);

let singleton: LibSQLDatabase<typeof schema> | undefined;

/** Lazily-created drizzle client. Throws if the DB is not configured. */
export function db(): LibSQLDatabase<typeof schema> {
  if (!isDbConfigured || !url) throw new Error('Turso env vars are not configured');
  singleton ??= drizzle(createClient({ url, authToken }), { schema });
  return singleton;
}
