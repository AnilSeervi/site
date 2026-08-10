/**
 * <as-reading> — the READING · HARDCOVER section (design_handoff_reading).
 *
 * One island owns both halves, because they share nothing with anything else on
 * /live: the cover's pointer tilt, and the shelf's tip / pick / reshelve state.
 * Everything is DOM + CSS transforms — no canvas, no library. The keyframes
 * (as-pick, as-shelve, as-float) live in the component's <style>; this only
 * moves state between them.
 *
 * State, per the handoff: `out` is the books in hand (max two, insertion
 * ordered), `back` is books mid-reshelve (each clears on a 640ms timer so it
 * stays above its neighbours until it has slid home). Every timer is tracked
 * and cleared on disconnect — view transitions can unmount mid-animation.
 *
 * The shelf was fitted to 752px at build. On a phone the row is a third of
 * that, so the fit is re-run against the row's real width and the overflow is
 * hidden — one shelf at any width, which is the rule the fit exists to keep.
 *
 * Reduced motion: no tilt, no pickup. Hover and focus still drive the caption,
 * and the notes render as a plain list under the shelf (CSS).
 */

import { isMobile } from './breakpoint';

/** in-hand geometry — a single book centres, two sit either side of centre */
const LIFT = -30;
const PAIR_GAP = 105;
const RESHELVE_MS = 640;
const LEAN_HOLD = 380;

/** pointer tilt on the current-read cover */
const TILT_Y = 13;
const TILT_X = 9;

class AsReading extends HTMLElement {
  #timers = new Set<ReturnType<typeof setTimeout>>();
  #cleanup: (() => void)[] = [];
  #reduced = false;

  #row: HTMLElement | null = null;
  #books: HTMLButtonElement[] = [];
  #visible: HTMLButtonElement[] = [];
  #caption: HTMLElement | null = null;
  /** books in hand, oldest first */
  #out: HTMLButtonElement[] = [];

  connectedCallback() {
    this.#reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.#caption = this.querySelector<HTMLElement>('[data-caption]');
    this.#row = this.querySelector<HTMLElement>('[data-row]');
    this.#books = [...this.querySelectorAll<HTMLButtonElement>('.book')];

    this.#mountCover();
    this.#mountShelf();
  }

  disconnectedCallback() {
    this.#timers.forEach(clearTimeout);
    this.#timers.clear();
    this.#cleanup.forEach((fn) => fn());
    this.#cleanup = [];
    this.#out = [];
  }

  #after(ms: number, fn: () => void) {
    const t = setTimeout(() => {
      this.#timers.delete(t);
      fn();
    }, ms);
    this.#timers.add(t);
    return t;
  }

  #on<K extends keyof HTMLElementEventMap>(
    el: EventTarget,
    type: K,
    fn: (ev: HTMLElementEventMap[K]) => void,
    opts?: AddEventListenerOptions
  ) {
    el.addEventListener(type, fn as EventListener, opts);
    this.#cleanup.push(() => el.removeEventListener(type, fn as EventListener));
  }

  /* ---------------- current read ---------------- */

  #mountCover() {
    if (this.#reduced) return;
    const stage = this.querySelector<HTMLElement>('[data-stage]');
    const cover = this.querySelector<HTMLElement>('[data-cover]');
    const sheen = this.querySelector<HTMLElement>('[data-sheen]');
    if (!stage || !cover) return;

    const move = (ev: PointerEvent) => {
      const r = cover.getBoundingClientRect();
      // −1 … 1 from the cover's centre
      const px = (ev.clientX - r.left) / r.width - 0.5;
      const py = (ev.clientY - r.top) / r.height - 0.5;
      // short transition while the pointer drives it; the CSS 500ms settle
      // takes over the moment we stop overriding it on leave
      cover.style.transition = 'transform 160ms ease-out, box-shadow 160ms ease-out';
      cover.style.transform = `rotateY(${px * TILT_Y * 2}deg) rotateX(${-py * TILT_X * 2}deg) translateZ(14px)`;
      cover.style.boxShadow = '0 26px 55px rgba(0, 0, 0, 0.6)';
      if (sheen) {
        sheen.style.setProperty('--sx', `${(px + 0.5) * 100}%`);
        sheen.style.setProperty('--sy', `${(py + 0.5) * 100}%`);
        sheen.style.opacity = '1';
      }
    };
    const leave = () => {
      cover.style.transition = '';
      cover.style.transform = '';
      cover.style.boxShadow = '';
      if (sheen) sheen.style.opacity = '0';
    };

    this.#on(stage, 'pointermove', move);
    this.#on(stage, 'pointerleave', leave);
    // a finger that lifts never fires pointerleave on iOS
    this.#on(stage, 'pointercancel', leave);
  }

  /* ---------------- shelf ---------------- */

  #mountShelf() {
    const row = this.#row;
    if (!row || !this.#books.length) return;

    this.#refit();
    const ro = new ResizeObserver(() => this.#refit());
    ro.observe(row);
    this.#cleanup.push(() => ro.disconnect());

    for (const book of this.#books) {
      this.#on(book, 'pointerenter', () => this.#speak(book));
      this.#on(book, 'focus', () => this.#speak(book));
      this.#on(book, 'click', () => this.#toggle(book));
    }
    this.#on(row, 'pointerleave', () => this.#speak(null));
    this.#on(row, 'focusout', () => this.#speak(null));
  }

  /**
   * Re-run the build-time fit against the row's real width. Books that no
   * longer fit are hidden rather than wrapped — the shelf is one shelf.
   */
  #refit() {
    const row = this.#row;
    if (!row) return;
    const style = getComputedStyle(row);
    const pad = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const gap = parseFloat(style.gap) || 5;
    const budget = row.clientWidth - pad;

    let used = 0;
    let items = 0;
    const visible: HTMLButtonElement[] = [];
    // walk the row in order so the divider's width is spent like a book's —
    // the in-progress group is first, so it survives a narrow shelf
    for (const el of [...row.children] as HTMLElement[]) {
      const isBook = el.classList.contains('book');
      const w = isBook
        ? parseFloat(getComputedStyle(el).getPropertyValue('--w')) || el.offsetWidth
        : el.offsetWidth || 30;
      const next = used + w + (items ? gap : 0);
      const fits = next <= budget;
      if (!isBook) {
        // a divider with nothing after it is just a gap at the end
        el.hidden = !fits;
        if (fits) {
          used = next;
          items++;
        }
        continue;
      }
      const book = el as HTMLButtonElement;
      book.hidden = !fits;
      if (!fits) {
        // a hidden book can't stay in hand
        if (book.dataset.state) this.#reshelve(book, true);
        continue;
      }
      used = next;
      items++;
      visible.push(book);
    }
    this.#visible = visible;

    const cap = this.#caption;
    if (cap) {
      const done = visible.filter((b) => b.dataset.group === 'finished').length;
      const idle = `the last ${done} — tip a spine; click to take one down`;
      cap.dataset.idle = idle;
      if (!cap.hasAttribute('data-active')) cap.textContent = idle;
    }
    // the shelf may have narrowed past two-in-hand
    while (this.#out.length > this.#maxOut()) this.#reshelve(this.#out[0]!, true);
    if (this.#out.length) this.#place();
  }

  /** one book at a time on a phone — two at 1.5× would cover the whole shelf */
  #maxOut() {
    return isMobile() ? 1 : 2;
  }

  /** caption slot: names the book, or falls back to the idle line */
  #speak(book: HTMLButtonElement | null): void {
    const cap = this.#caption;
    if (!cap) return;
    // sticky while something is in hand — the shelf keeps talking about the
    // book you're holding until you hover another one that's also out
    if (!book) {
      const held = this.#out.at(-1);
      if (held) return this.#speak(held);
      cap.removeAttribute('data-active');
      cap.textContent = cap.dataset.idle ?? '';
      return;
    }
    // while a book is out the caption belongs to it — except for the
    // in-progress group, which stays live because it's still clickable
    if (this.#out.length && !book.dataset.state && book.dataset.group !== 'reading') return;

    const { title = '', author = '', note = '', group } = book.dataset;
    const hint =
      group === 'reading' && book.getAttribute('aria-current') !== 'true' ? 'click to bring it up' : '';
    cap.textContent = [title, author && `— ${author}`, note ? `· ${note}` : hint && `· ${hint}`]
      .filter(Boolean)
      .join(' ');
    cap.setAttribute('data-active', '');
  }

  #toggle(book: HTMLButtonElement) {
    // an in-progress book isn't taken down — it comes up into the current-read
    // slot, which is the only place its cover and note have room
    if (book.dataset.group === 'reading') return this.#promote(book);
    if (this.#reduced) return this.#speak(book);
    if (book.dataset.state === 'out') this.#reshelve(book);
    else if (!book.dataset.state) this.#pick(book);
  }

  /** swap the current-read block over to another status-2 book */
  #promote(book: HTMLButtonElement) {
    const panel = this.querySelector<HTMLElement>('[data-current]');
    if (!panel || book.getAttribute('aria-current') === 'true') return;

    const d = book.dataset;
    const set = (sel: string, text: string) => {
      const el = panel.querySelector<HTMLElement>(sel);
      if (!el) return;
      el.textContent = text;
      el.hidden = !text;
    };

    const img = panel.querySelector<HTMLImageElement>('[data-now-img]');
    const blank = panel.querySelector<HTMLElement>('[data-now-blank]');
    if (img && blank) {
      // never render a cover we don't have: the img is dropped, not blanked
      if (d.cover) {
        img.src = d.cover;
        img.alt = `${d.title} — cover`;
      }
      img.hidden = !d.cover;
      blank.hidden = !!d.cover;
    }

    set('[data-now-title]', d.title ?? '');
    set('[data-now-byline]', d.byline ?? '');
    set('[data-now-note]', d.note ?? '');
    const when = panel.querySelector<HTMLElement>('[data-now-when]');
    if (when) when.textContent = `now — ${d.since ? `since ${d.since}` : 'in hand'}`;

    const prog = panel.querySelector<HTMLElement>('[data-now-prog]');
    const pct = d.progress ? Number(d.progress) : null;
    if (prog) {
      prog.hidden = pct == null;
      const fill = prog.querySelector<HTMLElement>('[data-now-fill]');
      const label = prog.querySelector<HTMLElement>('[data-now-pct]');
      if (pct != null && fill && label) {
        fill.style.width = `${pct}%`;
        label.textContent = `${pct}%`;
      }
    }

    for (const b of this.#books) b.removeAttribute('aria-current');
    book.setAttribute('aria-current', 'true');

    // a short fade so the swap reads as one motion rather than four
    panel.setAttribute('data-swapping', '');
    this.#after(220, () => panel.removeAttribute('data-swapping'));
    this.#speak(book);
  }

  #pick(book: HTMLButtonElement) {
    // two in hand is the ceiling (one on a phone); the next sends the oldest home
    while (this.#out.length >= this.#maxOut()) this.#reshelve(this.#out[0]!);

    book.dataset.state = 'out';
    this.#out.push(book);
    this.#row?.setAttribute('data-holding', '');
    this.#row?.removeAttribute('data-settling');
    this.#place();
    this.#speak(book);

    // the neighbours only notice once the slot is actually clear
    this.#after(LEAN_HOLD, () => {
      if (book.dataset.state === 'out') this.#lean();
    });
  }

  #reshelve(book: HTMLButtonElement, silent = false) {
    const i = this.#out.indexOf(book);
    if (i >= 0) this.#out.splice(i, 1);

    book.dataset.state = 'back';
    book.style.removeProperty('--tx');
    book.style.removeProperty('--ty');

    this.#row?.setAttribute('data-settling', '');
    this.#lean();
    this.#place();

    this.#after(RESHELVE_MS, () => {
      delete book.dataset.state;
      if (!this.#out.length) {
        this.#row?.removeAttribute('data-holding');
        this.#row?.removeAttribute('data-settling');
      }
    });

    if (!silent) this.#speak(null);
  }

  /**
   * Lift the held books to the row's centre. The handoff's 376px is half of its
   * 752px row; deriving it from the live row keeps the pickup centred at any
   * width instead of flying off a narrow shelf.
   */
  #place() {
    const row = this.#row;
    if (!row) return;
    const width = row.clientWidth;
    const centre = width / 2;
    const spread = Math.min(PAIR_GAP, width * 0.14);

    this.#out.forEach((book, i) => {
      // offsetLeft, not getBoundingClientRect: the second pick re-places both
      // books, and a rect reads the position the first one has *already* been
      // translated to — so its next offset compounds and it walks off the shelf
      const from = book.offsetLeft - row.offsetLeft + book.offsetWidth / 2;
      const to = this.#out.length === 1 ? centre : centre + (i === 0 ? -spread : spread);
      book.style.setProperty('--tx', `${Math.round(to - from)}px`);
      book.style.setProperty('--ty', `${LIFT}px`);
    });
  }

  /** exactly the immediate neighbours of each gap, and nothing else */
  #lean() {
    for (const b of this.#books) delete b.dataset.lean;
    for (const held of this.#out) {
      const i = this.#visible.indexOf(held);
      if (i < 0) continue;
      // never across the bookend — the in-progress group is a separate run of
      // books and doesn't feel a gap opening on the other side of the divider
      const near = (b?: HTMLButtonElement) => b && !b.dataset.state && b.dataset.group === held.dataset.group;
      const left = this.#visible[i - 1];
      const right = this.#visible[i + 1];
      if (near(left)) left!.dataset.lean = 'left';
      if (near(right)) right!.dataset.lean = 'right';
    }
  }
}

if (!customElements.get('as-reading')) customElements.define('as-reading', AsReading);
