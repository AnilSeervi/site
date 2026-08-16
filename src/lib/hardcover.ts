/**
 * Shelf geometry. Pure functions over the committed snapshot
 * (src/data/hardcover.json, written by scripts/sync-hardcover.mjs); nothing
 * fetches. Spine height and fallback casing are hashed from the slug, not
 * randomised, so a rebuild doesn't reshuffle the shelf.
 */

export interface Book {
  slug: string;
  title: string;
  author: string | null;
  pages: number | null;
  /** current page (current read only) */
  page?: number | null;
  /** 0–100 (current read only) */
  progress?: number | null;
  /** month the current read was started, lowercase */
  since?: string | null;
  /** 1–5, only ever set on finished books */
  rating?: number | null;
  /** site-relative path under /covers */
  cover?: string | null;
  /** casing colour sampled from the cover at sync time */
  casing?: string | null;
  updatedAt?: string | null;
}

export interface Snapshot {
  fetchedAt: string | null;
  current: Book | null;
  finished: Book[];
}

/** a book fitted to the shelf */
export interface Spine extends Book {
  /** px, ∝ page count */
  w: number;
  /** px, jittered per slug */
  h: number;
  casing: string;
  /** text printed down the spine */
  label: string;
}

/* ---- shelf constants ---- */

/** px budget for one shelf row */
export const SHELF_FIT = 752;
export const SHELF_GAP = 5;
export const SHELF_HEIGHT = 170;

const W_MIN = 15;
const W_MAX = 32;
const PP_MIN = 120;
const PP_MAX = 600;
const H_MIN = 128;
const H_MAX = 158;

/** fallback casings; only used for a book whose cover never downloaded */
const CASINGS = [
  '#3E4A57',
  '#5A3634',
  '#7A6A4F',
  '#2F3A38',
  '#4A4636',
  '#3B3550',
  '#5A4A38',
  '#45403A',
  '#533D3A',
  '#6B5B45'
];

/** FNV-1a — must stay deterministic; the shelf reshuffles otherwise */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** page count → spine width in px, clamped to 15–32 */
export function spineWidth(pages: number | null): number {
  if (!pages) return Math.round((W_MIN + W_MAX) / 2);
  const t = Math.min(1, Math.max(0, (pages - PP_MIN) / (PP_MAX - PP_MIN)));
  return Math.round(W_MIN + t * (W_MAX - W_MIN));
}

/** deterministic spine height in px, 128–158 */
export function spineHeight(slug: string): number {
  return H_MIN + (hash(`h:${slug}`) % (H_MAX - H_MIN + 1));
}

export function spineCasing(book: Book): string {
  return book.casing ?? CASINGS[hash(`c:${book.slug}`) % CASINGS.length]!;
}

/** Title trimmed to what fits down a spine: mono 9.5px ≈ 5.55px/char, 30px of
    inset. Drops the subtitle; CSS ellipsis is the safety net. */
export function spineLabel(title: string, h: number): string {
  const room = Math.floor((h - 30) / 5.55);
  if (title.length <= room) return title;
  return title.split(/\s*[:—–]\s*/)[0]!;
}

/** Takes books in order until one row's px budget is spent; `fit` is overridable
    for narrower (mobile) rows. */
export function fitShelf(books: Book[], fit: number = SHELF_FIT): Spine[] {
  const out: Spine[] = [];
  let used = 0;
  for (const b of books) {
    const w = spineWidth(b.pages);
    const next = used + w + (out.length ? SHELF_GAP : 0);
    if (next > fit) break;
    used = next;
    const h = spineHeight(b.slug);
    out.push({ ...b, w, h, casing: spineCasing(b), label: spineLabel(b.title, h) });
  }
  return out;
}
