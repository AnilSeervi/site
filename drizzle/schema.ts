import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';

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
    .default(
      sql`lower(hex(randomblob(16))) || '___' || lower(hex(randomblob(16)))`
    )
    .notNull(),
  createdAt: integer('createdAt')
    .default(sql`strftime('%s', 'now') * 1000`)
    .notNull(),
  likes: integer('likes').default(0).notNull()
});
