/**
 * Shelf geometry for READING · HARDCOVER (design_handoff_reading).
 *
 * Pure functions over the committed snapshot (src/data/hardcover.json, written
 * by scripts/sync-hardcover.mjs). Nothing here fetches: the token lives on one
 * machine and the shelf is a build-time artifact, so the page renders the same
 * bytes whether or not Hardcover is up.
 *
 * Everything is deterministic — spine height and casing colour are hashed from
 * the slug rather than randomised, so a rebuild doesn't reshuffle the shelf.
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
  /**
   * Site-relative path under /covers. Only the currently-reading books have
   * one — the shelf is spines and an opened book shows a typographic flyleaf,
   * so caching two dozen more cover images would be art nothing renders.
   */
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

/** a fitted spine — the shelf's own view of a book */
export interface Spine extends Book {
  /** px, ∝ page count */
  w: number;
  /** px, jittered like a real shelf */
  h: number;
  casing: string;
  /** what actually gets printed down the spine */
  label: string;
}

/* ---- constants from the handoff ---- */

/** the row accumulates spines until this budget is spent, then stops */
export const SHELF_FIT = 752;
export const SHELF_GAP = 5;
export const SHELF_HEIGHT = 170;

const W_MIN = 15;
const W_MAX = 32;
const PP_MIN = 120;
const PP_MAX = 600;
const H_MIN = 128;
const H_MAX = 158;

/**
 * Fallback casings, sampled from frame 10a — muted cloth and board, never
 * saturated. Only used for a book whose cover never downloaded: every other
 * spine takes its colour from its own art (see `casing` on the snapshot), which
 * is what makes the row read as this shelf rather than a palette.
 */
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

/** FNV-1a — small, stable, and not Math.random(): the shelf must not reshuffle */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** page count → spine width, clamped to the handoff's 15–32px */
export function spineWidth(pages: number | null): number {
  if (!pages) return Math.round((W_MIN + W_MAX) / 2);
  const t = Math.min(1, Math.max(0, (pages - PP_MIN) / (PP_MAX - PP_MIN)));
  return Math.round(W_MIN + t * (W_MAX - W_MIN));
}

/** deterministic 128–158px, so neighbours never line up flat */
export function spineHeight(slug: string): number {
  return H_MIN + (hash(`h:${slug}`) % (H_MAX - H_MIN + 1));
}

export function spineCasing(book: Book): string {
  return book.casing ?? CASINGS[hash(`c:${book.slug}`) % CASINGS.length]!;
}

/**
 * What fits down a spine: mono 9.5px runs ~5.55px per character, and the label
 * is inset from both ends by the wear shadows and the press mark. Titles are
 * shortened at a natural break first — a subtitle after `:` or an em-dash is
 * the part nobody needs vertically — and CSS ellipsis is the safety net.
 */
export function spineLabel(title: string, h: number): string {
  const room = Math.floor((h - 30) / 5.55);
  if (title.length <= room) return title;
  // dropping the subtitle usually buys enough room; when it doesn't, the CSS
  // ellipsis takes over rather than us truncating mid-word here
  return title.split(/\s*[:—–]\s*/)[0]!;
}

/**
 * Newest first, take what fits one shelf, drop the rest. The data list can be
 * long; the shelf decides — no scrolling, no second row.
 *
 * `fit` is overridable because mobile's row is narrower than the 752px column
 * the handoff designs for, and a shelf that overflows its plank is worse than
 * a shorter shelf.
 */
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
