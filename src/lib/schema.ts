/**
 * Drizzle schema for the EXISTING Turso database.
 *
 * Mirrors the live tables verbatim (ported from the old site:
 * /Users/anil/Projects/site/drizzle/schema.ts). This is production data —
 * do not run migrations or alter these definitions casually.
 *
 * Phase 6 (migration already ran — scripts/migrate-phase6.mjs):
 * guestbook.doodle TEXT NULL + the kv table.
 */
import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const guestbook = sqliteTable('guestbook', {
  id: integer('id').primaryKey().notNull(),
  email: text('email').notNull(),
  body: text('body').notNull(),
  created_by: text('created_by').notNull(),
  created_at: integer('created_at')
    .default(sql`strftime('%s', 'now') * 1000`)
    .notNull(),
  updated_at: integer('updated_at')
    .default(sql`strftime('%s', 'now') * 1000`)
    .notNull(),
  /** doodle-signature PNG data URL (data:image/png;base64,…) — null for text entries */
  doodle: text('doodle')
});

/** generic key/value store (Garmin OAuth tokens etc.) */
export const kv = sqliteTable('kv', {
  k: text('k').primaryKey().notNull(),
  v: text('v').notNull(),
  updatedAt: integer('updatedAt')
    .default(sql`strftime('%s', 'now') * 1000`)
    .notNull()
});

export const page = sqliteTable(
  'page',
  {
    id: text('id')
      .primaryKey()
      .default(sql`lower(hex(randomblob(16)))`)
      .notNull(),
    createdAt: integer('createdAt')
      .default(sql`strftime('%s', 'now') * 1000`)
      .notNull(),
    slug: text('slug').notNull(),
    likes: integer('likes').default(0).notNull(),
    views: integer('views').default(1).notNull()
  },
  (table) => {
    return {
      slugUnique: uniqueIndex('page_slug_unique').on(table.slug)
    };
  }
);

export const session = sqliteTable('session', {
  id: text('id')
    .primaryKey()
    .default(sql`lower(hex(randomblob(16))) || '___' || lower(hex(randomblob(16)))`)
    .notNull(),
  createdAt: integer('createdAt')
    .default(sql`strftime('%s', 'now') * 1000`)
    .notNull(),
  likes: integer('likes').default(0).notNull()
});
