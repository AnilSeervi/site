/**
 * sync-hardcover — pull the shelf from Hardcover and freeze it into the repo.
 *
 *   node scripts/sync-hardcover.mjs [--force]
 *
 * Writes src/data/hardcover.json (the snapshot /live renders from) and caches
 * the covers it actually needs into public/covers/. Nothing about Hardcover
 * runs at request time: the token stays on this machine, the covers are ours
 * rather than hotlinked, and a build with no network still ships the last good
 * shelf — the handoff's "API dead at build → ship the last successful snapshot"
 * rule, implemented by the snapshot being a committed file.
 *
 * Every book gets its cover: the current read renders it at 172×250, and a
 * finished book shows it on the front board when you take it down. They are
 * resized to 344px wide (2× the largest slot) because the raw files run to
 * 2.4MB each — 21MB of art for a page that never shows a pixel above 344.
 *
 * Each cover also yields the spine's casing colour, sampled from the art and
 * pulled back toward the page's warm black. A shelf of real books is coloured
 * by its covers; a palette picked from a hash only looks like one.
 *
 * Failure leaves the existing snapshot untouched and exits non-zero. Re-running
 * skips covers already on disk unless --force.
 *
 * The token expires yearly and cannot auto-renew (calendar reminder, not code).
 * It is read from .env and never printed — not in errors, not in debug output.
 */
import { readFile, writeFile, mkdir, readdir, unlink, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SNAPSHOT = resolve(ROOT, 'src/data/hardcover.json');
const COVER_DIR = resolve(ROOT, 'public/covers');
const ENDPOINT = 'https://api.hardcover.app/v1/graphql';
const FORCE = process.argv.includes('--force');

/** 172×250 slot at 2× — anything much smaller upscales, which the house rule
    ("never render a cover you don't have") counts as not having one. 260 is the
    floor rather than 344: a 293px jacket is a real cover, and refusing it left
    a book on the page with a blank block beside its title. */
const COVER_W = 344;
const MIN_SOURCE_W = 260;

/* ---------- env ---------- */

/** minimal .env reader — the value is used, never logged */
async function envToken() {
  if (process.env.HARDCOVER_TOKEN) return process.env.HARDCOVER_TOKEN.trim();
  let raw = '';
  try {
    raw = await readFile(resolve(ROOT, '.env'), 'utf8');
  } catch {
    return null;
  }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*HARDCOVER_TOKEN\s*=\s*(.*)$/);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

/* ---------- query ---------- */

/**
 * status_id 2 = currently reading, 3 = read. Hardcover is Hasura, so `me`
 * comes back as an array and everything is a nested selection.
 *
 * Both `book.image` and `edition.image` are asked for: they disagree often,
 * and one of the two is regularly a 98px thumbnail. Same for page counts.
 */
const QUERY = `
  query Shelf {
    me {
      user_books(
        where: { status_id: { _in: [2, 3] } }
        order_by: { updated_at: desc }
      ) {
        status_id
        updated_at
        first_started_reading_date
        last_read_date
        rating
        book {
          id
          slug
          title
          pages
          image { url width height }
          contributions { author { name } }
        }
        edition {
          pages
          image { url width height }
        }
        user_book_reads(order_by: { id: desc }, limit: 1) {
          progress
          progress_pages
          started_at
        }
      }
    }
  }
`;

async function graphqlRaw(token, query) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`
    },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30_000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`hardcover responded ${res.status}: ${text.slice(0, 200)}`);
  const body = JSON.parse(text);
  if (body.errors?.length) throw new Error(body.errors.map((e) => e.message).join(' · '));
  return body.data;
}

async function graphql(token) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token.startsWith('Bearer ') ? token : `Bearer ${token}`
    },
    body: JSON.stringify({ query: QUERY }),
    signal: AbortSignal.timeout(30_000)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`hardcover responded ${res.status}: ${text.slice(0, 300)}`);
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`hardcover returned non-JSON: ${text.slice(0, 200)}`);
  }
  if (body.errors?.length) {
    // surfaces schema drift (renamed field, missing permission) with the
    // message but never the request headers
    throw new Error(`hardcover graphql: ${body.errors.map((e) => e.message).join(' · ')}`);
  }
  const me = Array.isArray(body.data?.me) ? body.data.me[0] : body.data?.me;
  const rows = me?.user_books;
  if (!Array.isArray(rows)) throw new Error('hardcover: no user_books in response');
  return rows;
}

/* ---------- normalize ---------- */

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

/** smallest image that still clears the floor — less to download and resize */
function pick(cands) {
  const usable = cands.filter((i) => i?.url && i.width >= MIN_SOURCE_W);
  return usable.sort((a, b) => a.width * a.height - b.width * b.height)[0] ?? null;
}

/** the better of the book's own image and the edition you actually own */
function bestImage(row) {
  return pick([row.book?.image, row.edition?.image]);
}

/**
 * Last resort: the book's *other* editions. Hardcover's default image is
 * whichever edition happened to be scraped, and that is regularly a 98px
 * thumbnail while a sibling edition of the same book carries a 293px jacket.
 * Asked for only when the first two candidates fail, so the common case stays
 * one query.
 */
async function editionImage(token, bookId) {
  const q = `{ books(where: {id: {_eq: ${bookId}}}) { editions { image { url width height } } } }`;
  try {
    const rows = (await graphqlRaw(token, q))?.books?.[0]?.editions ?? [];
    return pick(rows.map((e) => e.image));
  } catch {
    return null;
  }
}

function shape(row) {
  const b = row.book ?? {};
  const read = row.user_book_reads?.[0] ?? {};
  const author = b.contributions?.[0]?.author?.name ?? null;
  const pages = [b.pages, row.edition?.pages].find((p) => typeof p === 'number' && p > 0) ?? null;

  // progress is 0–1 in some rows and 0–100 in others; normalize to whole %.
  // Both stay null when no read session exists, which is the common case —
  // the section then renders no bar rather than a 0%.
  let pct = null;
  if (typeof read.progress === 'number')
    pct = Math.round(read.progress <= 1 ? read.progress * 100 : read.progress);
  let page = typeof read.progress_pages === 'number' ? read.progress_pages : null;
  if (page == null && pct != null && pages) page = Math.round((pct / 100) * pages);
  if (pct == null && page != null && pages) pct = Math.round((page / pages) * 100);

  const started = read.started_at ?? row.first_started_reading_date ?? null;

  return {
    slug: b.slug || slugify(b.title ?? 'untitled'),
    title: b.title ?? 'Untitled',
    author,
    pages,
    page,
    progress: pct == null ? null : Math.min(100, Math.max(0, pct)),
    since: started ? MONTHS[new Date(started).getUTCMonth()] : null,
    rating: typeof row.rating === 'number' ? row.rating : null,
    updatedAt: row.updated_at ?? null
  };
}

/* ---------- covers ---------- */

const exists = (p) =>
  access(p).then(
    () => true,
    () => false
  );

const hex = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/**
 * The cover's average colour, pushed toward book cloth: saturation held to a
 * usable band, lightness pinned into the range the design's casings occupy, and
 * the whole thing mixed 30% into the page's warm black. Straight averages come
 * out either white (paperback covers) or mud.
 */
async function casingFrom(buf) {
  const { channels } = await sharp(buf).resize(24, 36, { fit: 'fill' }).stats();
  let [r, g, b] = channels.slice(0, 3).map((c) => c.mean);
  const mid = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  // pull extremes off the rails: a white cover would give a white spine, and
  // averaging a dark one lands on the page's own background
  const target = Math.min(150, Math.max(70, mid));
  const scale = mid > 1 ? target / mid : 1;
  [r, g, b] = [r * scale, g * scale, b * scale];
  // averages are muddy — push each channel out from its own mean so a green
  // cover still reads green as cloth
  const avg = (r + g + b) / 3;
  [r, g, b] = [r, g, b].map((c) => avg + (c - avg) * 1.35);
  // a little of the page's black keeps every casing inside the same room
  const [br, bg, bb] = [0x0f, 0x0d, 0x0b];
  return `#${hex(r * 0.82 + br * 0.18)}${hex(g * 0.82 + bg * 0.18)}${hex(b * 0.82 + bb * 0.18)}`;
}

/**
 * Download + resize one cover into public/covers. Returns the site-relative
 * path and the casing colour sampled from the art.
 */
async function cacheCover(slug, image) {
  if (!image) return { cover: null, casing: null };
  const file = `${slug}.jpg`;
  const dest = resolve(COVER_DIR, file);
  const rel = `/covers/${file}`;
  try {
    let out;
    if (!FORCE && (await exists(dest))) {
      out = await readFile(dest);
    } else {
      const res = await fetch(image.url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(String(res.status));
      out = await sharp(Buffer.from(await res.arrayBuffer()))
        .resize({ width: COVER_W, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
      await writeFile(dest, out);
    }
    return { cover: rel, casing: await casingFrom(out) };
  } catch (err) {
    console.warn(`  ! cover failed for ${slug} — ${err.message}`);
    return { cover: null, casing: null };
  }
}

/** drop cached covers for books that are no longer being read */
async function pruneCovers(keep) {
  let files = [];
  try {
    files = await readdir(COVER_DIR);
  } catch {
    return 0;
  }
  let n = 0;
  for (const f of files) {
    if (!f.endsWith('.jpg') || keep.has(f)) continue;
    await unlink(resolve(COVER_DIR, f));
    n++;
  }
  return n;
}

/* ---------- run ---------- */

const token = await envToken();
if (!token) {
  console.error(
    'HARDCOVER_TOKEN not found in .env or the environment.\n' +
      'Get one at hardcover.app → Settings → API, then add it to .env as:\n' +
      '  HARDCOVER_TOKEN=…\n' +
      'The existing snapshot is left untouched.'
  );
  process.exit(1);
}

console.log('fetching shelf…');
const rows = await graphql(token).catch((err) => {
  console.error(`failed: ${err.message}\nsnapshot left as-is.`);
  process.exit(1);
});

const all = rows.map((row) => ({
  book: shape(row),
  image: bestImage(row),
  bookId: row.book?.id,
  status: row.status_id
}));

// anything still without art gets one more look, across the book's editions
for (const r of all) {
  if (!r.image && r.bookId) r.image = await editionImage(token, r.bookId);
}

await mkdir(COVER_DIR, { recursive: true });
console.log(`caching ${all.length} covers…`);
for (const r of all) {
  const { cover, casing } = await cacheCover(r.book.slug, r.image);
  r.book.cover = cover;
  r.book.casing = casing;
}

const reading = all.filter((r) => r.status === 2).map((r) => r.book);
const finished = all.filter((r) => r.status !== 2).map((r) => r.book);

// keyed on covers we actually produced — a book whose only image was a 98px
// thumbnail must not keep a file from an earlier, less picky run
const pruned = await pruneCovers(
  new Set(all.filter((r) => r.book.cover).map((r) => `${r.book.slug}.jpg`))
);

const snapshot = {
  // stamped so the page can say how fresh the shelf is if it ever needs to
  fetchedAt: new Date().toISOString(),
  // every status_id 2 book — which one is "now" is an editorial choice, made
  // in site.ts (`reading.now`), not by whichever row Hardcover touched last
  reading,
  finished
};

await writeFile(SNAPSHOT, `${JSON.stringify(snapshot, null, 2)}\n`);
const missing = [...reading, ...finished].filter((b) => !b.cover);
console.log(
  `wrote src/data/hardcover.json — reading: ${reading.length} · finished: ${finished.length}` +
    (pruned ? ` · pruned ${pruned} stale cover${pruned === 1 ? '' : 's'}` : '')
);
for (const b of missing) console.log(`  · no usable cover: ${b.title}`);
