/**
 * <as-guestbook> + <as-doodle> — the ~/live guestbook (frame 6d).
 *
 * as-doodle: 320×140 pad on a 640×280 backing store (2× transform), cream
 * round-cap strokes, pointer capture, touch-action handled in CSS.
 *
 * as-guestbook: on connect fetches GET /api/guestbook + /api/auth/me in
 * parallel; real entries replace the SSR design quotes (which stay if the
 * fetch fails). Signed out → the header meta links to /api/auth/github and
 * 'ink it' walks there too; signed in → meta reads 'signed in as <login>',
 * the say-something input appears, and posts (text via ↵, doodle via
 * 'ink it') prepend optimistically — rolled back if the POST fails.
 * Entries render via textContent only (user content, never innerHTML);
 * the prepend animation respects prefers-reduced-motion.
 */
export {};

interface Entry {
  id: number;
  body: string;
  doodle: string | null;
  created_by: string;
  created_at: number;
}
interface GuestbookRes {
  disabled?: boolean;
  entries?: Entry[] | null;
}
interface MeRes {
  user: { login: string; name: string } | null;
}

const DOODLE_PREFIX = 'data:image/png;base64,';

function attrLine(createdBy: string, createdAt: number): string {
  const d = new Date(createdAt);
  const mon = d.toLocaleString('en-US', { month: 'short' }).toLowerCase();
  return `${createdBy} · ${mon} ${d.getFullYear()}`;
}

class AsDoodle extends HTMLElement {
  #ctx: CanvasRenderingContext2D | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #drawing = false;
  #dirty = false;
  #ac: AbortController | null = null;

  connectedCallback() {
    const canvas = this.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    this.#canvas = canvas;
    this.#ctx = ctx;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.strokeStyle = 'rgba(237,230,218,.85)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.#ac = new AbortController();
    const { signal } = this.#ac;
    const pos = (e: PointerEvent): [number, number] => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        canvas.setPointerCapture(e.pointerId);
        this.#drawing = true;
        this.#dirty = true;
        const [x, y] = pos(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
      },
      { signal }
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (!this.#drawing) return;
        const [x, y] = pos(e);
        ctx.lineTo(x, y);
        ctx.stroke();
      },
      { signal }
    );
    const end = () => {
      this.#drawing = false;
    };
    canvas.addEventListener('pointerup', end, { signal });
    canvas.addEventListener('pointercancel', end, { signal });
  }

  disconnectedCallback() {
    this.#ac?.abort();
    this.#ac = null;
    this.#drawing = false;
  }

  get dirty(): boolean {
    return this.#dirty;
  }

  clear() {
    this.#ctx?.clearRect(0, 0, 320, 140);
    this.#dirty = false;
  }

  toDataURL(): string | null {
    return this.#dirty ? (this.#canvas?.toDataURL('image/png') ?? null) : null;
  }
}

class AsGuestbook extends HTMLElement {
  #user: MeRes['user'] = null;
  #ac: AbortController | null = null;

  connectedCallback() {
    this.#ac = new AbortController();
    void this.#init();
  }

  disconnectedCallback() {
    this.#ac?.abort();
    this.#ac = null;
  }

  async #init() {
    const signal = this.#ac?.signal;
    const [gb, me] = await Promise.allSettled([
      fetch('/api/guestbook', { signal }).then((r) => (r.ok ? (r.json() as Promise<GuestbookRes>) : null)),
      fetch('/api/auth/me', { signal }).then((r) => (r.ok ? (r.json() as Promise<MeRes>) : null))
    ]);

    if (me.status === 'fulfilled' && me.value?.user) this.#user = me.value.user;
    this.#applyAuthState();

    const entries = gb.status === 'fulfilled' ? gb.value?.entries : null;
    if (Array.isArray(entries) && entries.length) {
      const list = this.querySelector('[data-gb-entries]');
      if (list) list.replaceChildren(...entries.map((e) => this.#renderEntry(e)));
    }

    this.#wire();
  }

  #applyAuthState() {
    const auth = this.querySelector<HTMLAnchorElement>('[data-gb-auth]');
    const say = this.querySelector<HTMLElement>('[data-gb-say]');
    if (!this.#user) return;
    if (auth) {
      auth.textContent = `signed in as ${this.#user.login}`;
      auth.removeAttribute('href');
      auth.classList.add('signed');
    }
    say?.removeAttribute('hidden');
  }

  #wire() {
    const signal = this.#ac?.signal;
    if (!signal) return;
    const doodle = this.querySelector<AsDoodle>('as-doodle');
    const input = this.querySelector<HTMLInputElement>('[data-gb-input]');

    this.querySelector('[data-gb-clear]')?.addEventListener(
      'click',
      () => doodle?.clear(),
      { signal }
    );

    this.querySelector('[data-gb-ink]')?.addEventListener(
      'click',
      () => {
        if (!this.#user) {
          window.location.href = '/api/auth/github';
          return;
        }
        const data = doodle?.toDataURL();
        if (!data) return;
        void this.#post({ doodle: data }, () => doodle?.clear());
      },
      { signal }
    );

    input?.addEventListener(
      'keydown',
      (e) => {
        if (e.key !== 'Enter') return;
        const body = input.value.trim().slice(0, 500);
        if (!body || !this.#user) return;
        void this.#post({ body }, () => {
          input.value = '';
        });
      },
      { signal }
    );
  }

  /** Optimistically prepend, POST, reconcile (id) or roll back on failure. */
  async #post(payload: { body?: string; doodle?: string }, onAccepted: () => void) {
    const list = this.querySelector('[data-gb-entries]');
    if (!list || !this.#user) return;

    const optimistic: Entry = {
      id: -1,
      body: payload.body ?? '',
      doodle: payload.doodle ?? null,
      created_by: this.#user.name,
      created_at: Date.now()
    };
    const node = this.#renderEntry(optimistic);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) node.classList.add('rise');
    list.prepend(node);
    onAccepted();

    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: this.#ac?.signal
      });
      const data = res.ok ? ((await res.json()) as { entry?: Entry | null }) : null;
      if (!data?.entry) {
        node.remove();
        return;
      }
      node.replaceWith(this.#renderEntry(data.entry));
    } catch {
      node.remove();
    }
  }

  /** Build an entry node — textContent only, user content is never markup. */
  #renderEntry(entry: Entry): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'gb-entry';

    if (entry.doodle && entry.doodle.startsWith(DOODLE_PREFIX)) {
      const img = document.createElement('img');
      img.className = 'gb-doodle';
      img.src = entry.doodle;
      img.alt = `doodle signature by ${entry.created_by}`;
      img.width = 160;
      img.height = 70;
      wrap.append(img);
    } else {
      const q = document.createElement('span');
      q.className = 'gb-q';
      q.textContent = `“${entry.body}”`;
      wrap.append(q);
    }

    const attr = document.createElement('span');
    attr.className = 'gb-attr';
    attr.textContent = attrLine(entry.created_by, entry.created_at);
    wrap.append(attr);
    return wrap;
  }
}

if (!customElements.get('as-doodle')) customElements.define('as-doodle', AsDoodle);
if (!customElements.get('as-guestbook')) customElements.define('as-guestbook', AsGuestbook);
