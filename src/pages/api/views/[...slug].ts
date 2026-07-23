import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { db, isDbConfigured } from '~/lib/db';
import { page } from '~/lib/schema';

export const prerender = false;

/**
 * Page-view counter backed by the existing Turso `page` table.
 *
 * GET  /api/views/<path>  → { views: number }   (0 when no row yet)
 * POST /api/views/<path>  → { views: number }   (upsert, +1)
 *
 * Slug scheme (matches the old site's usePageViews): '/' + path segments,
 * with '' / 'home' normalized to '/home'. e.g. /api/views/writing/foo
 * tracks the slug '/writing/foo'.
 *
 * Degradation contract: missing env → 200 {"disabled":true};
 * upstream failure → 200 { views: null } (never 5xx for expected failures).
 */

function normalizeSlug(param: string | undefined): string {
  const joined = (param ?? '').replace(/^\/+|\/+$/g, '');
  return joined === '' || joined === 'home' ? '/home' : `/${joined}`;
}

const json = (body: unknown, cacheControl: string) =>
  new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': cacheControl
    }
  });

const GET_CACHE = 'public, s-maxage=60, stale-while-revalidate=120';
const NO_STORE = 'no-store';

export const GET: APIRoute = async ({ params }) => {
  if (!isDbConfigured) return json({ disabled: true }, GET_CACHE);
  const slug = normalizeSlug(params.slug);
  try {
    const rows = await db()
      .select({ views: page.views })
      .from(page)
      .where(eq(page.slug, slug))
      .limit(1);
    return json({ views: rows[0]?.views ?? 0 }, GET_CACHE);
  } catch {
    return json({ views: null }, 'public, s-maxage=60, stale-while-revalidate=120');
  }
};

export const POST: APIRoute = async ({ params }) => {
  if (!isDbConfigured) return json({ disabled: true }, NO_STORE);
  const slug = normalizeSlug(params.slug);
  try {
    const rows = await db()
      .insert(page)
      .values({ slug, views: 1 })
      .onConflictDoUpdate({
        target: page.slug,
        set: { views: sql`${page.views} + 1` }
      })
      .returning({ views: page.views });
    return json({ views: rows[0]?.views ?? 1 }, NO_STORE);
  } catch {
    return json({ views: null }, NO_STORE);
  }
};
