import { ColumnType, Kysely } from "kysely";
import { PlanetScaleDialect } from "kysely-planetscale";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface Guestbook {
  id: Generated<number>;
  email: string;
  body: string;
  created_by: string;
  created_at: Generated<Date>;
  updated_at: Generated<Date> | string;
}

export interface Page {
  id: string;
  createdAt: Generated<Date>;
  slug: string;
  likes: Generated<number>;
  views: Generated<number>;
}

export interface Session {
  id: string;
  createdAt: Generated<Date>;
  likes: Generated<number>;
}

export interface Database {
  guestbook: Guestbook;
  page: Page;
  session: Session;
}

export const queryBuilder = new Kysely<Database>({
  dialect: new PlanetScaleDialect({
    url: process.env['DATABASE_URL']
  })
});
