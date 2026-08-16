// <as-ticker> — cycles the data-items label/value pairs; with data-live it also
// fetches the feeds. The 260ms dip must stay ≥ the spans' `transition: opacity .25s`.

import { feed } from './feed';

type Item = [string, string];

const FRESH_MS = 48 * 3600 * 1000; // "recent enough to brag about" window
const IST_OFFSET_MIN = 330; // relative-time buckets keep the author's clock

/** Garmin sportType values that get the km prefix */
const KM_SPORTS = new Set([
  'running',
  'trail_running',
  'treadmill_running',
  'track_running',
  'virtual_run',
  'indoor_running',
  'cycling',
  'road_biking',
  'mountain_biking',
  'gravel_cycling',
  'indoor_cycling',
  'virtual_ride',
  'e_bike_fitness',
  'e_bike_mountain'
]);

/** 'this morning' / 'yesterday evening' bucket on the IST wall clock; null past yesterday. */
function relativeBucket(startedAt: string): string | null {
  const t = Date.parse(startedAt);
  if (Number.isNaN(t)) return null;
  const then = new Date(t + IST_OFFSET_MIN * 60000);
  const now = new Date(Date.now() + IST_OFFSET_MIN * 60000);
  const dayDiff =
    Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000) -
    Math.floor(Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate()) / 86400000);
  if (dayDiff > 1 || dayDiff < 0) return null;
  const h = then.getUTCHours();
  const slot = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return dayDiff === 0 ? `this ${slot}` : `yesterday ${slot}`;
}

const json = (url: string) => feed<Record<string, any>>(url);

function settled<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === 'fulfilled' ? r.value : null;
}

class AsTicker extends HTMLElement {
  #iv: ReturnType<typeof setInterval> | null = null;
  #dip: ReturnType<typeof setTimeout> | null = null;
  #idx = 0;
  #items: Item[] = [];
  #label: HTMLElement | null = null;
  #value: HTMLElement | null = null;

  connectedCallback() {
    try {
      this.#items = JSON.parse(this.dataset.items ?? '[]');
    } catch {
      this.#items = [];
    }
    this.#label = this.querySelector<HTMLElement>('[data-ticker-label]');
    this.#value = this.querySelector<HTMLElement>('[data-ticker-value]');
    if (!this.#label || !this.#value) return;

    if ('live' in this.dataset) {
      this.#loadLive().catch(() => {
        /* placeholders keep rotating */
      });
    }
    this.#start();
  }

  #start() {
    if (this.#iv || this.#items.length < 2) return; // a lone item just sits
    this.#iv = setInterval(() => {
      this.#label!.style.opacity = '0';
      this.#value!.style.opacity = '0';
      this.#dip = setTimeout(() => {
        this.#idx = (this.#idx + 1) % this.#items.length;
        const [l, v] = this.#items[this.#idx]!;
        this.#label!.textContent = l;
        this.#value!.textContent = v;
        this.#label!.style.opacity = '1';
        this.#value!.style.opacity = '1';
      }, 260);
    }, 3400);
  }

  /** swap the SSR waiting line for real items and start rotating */
  #activate(items: Item[]) {
    this.#items = items;
    this.#idx = 0;
    delete this.dataset.load; // drops data-load="waiting" → live styling
    const [l, v] = items[0]!;
    if (this.#label && this.#value) {
      this.#label.textContent = l;
      this.#value.textContent = v;
      this.#label.style.opacity = '1';
      this.#value.style.opacity = '1';
    }
    this.#start();
  }

  async #loadLive() {
    const [spotify, github, moving, mal] = (
      await Promise.allSettled([
        json('/api/spotify'),
        json('/api/github'),
        json('/api/moving'),
        json('/api/mal')
      ])
    ).map(settled);

    const items: Item[] = [];

    const track = spotify?.now ?? spotify?.last;
    if (track?.title && track?.artist) {
      items.push(['listening', `${track.title} — ${track.artist}`]);
    }

    // /api/github reports `ago` as a bucket string, not a timestamp — match, don't parse.
    const push = github?.lastPush;
    if (push?.repo && (push.ago === 'earlier today' || push.ago === 'yesterday')) {
      const short = String(push.repo).split('/').pop()!.toLowerCase();
      // null count = GitHub didn't say; drop the number rather than print "0 commits"
      const n = typeof push.commits === 'number' ? push.commits : null;
      items.push([
        'shipping',
        n === null
          ? `pushed to ${short}, ${push.ago}`
          : `${n} commit${n === 1 ? '' : 's'} to ${short}, ${push.ago}`
      ]);
    }

    const act = moving?.disabled ? null : moving?.latestAny;
    if (act?.name && act.startedAt && Date.now() - Date.parse(act.startedAt) <= FRESH_MS) {
      const rel = relativeBucket(act.startedAt);
      if (rel) {
        const name = String(act.name).toLowerCase();
        const value = KM_SPORTS.has(act.sportType)
          ? `${act.distanceKm}km ${name}, ${rel}`
          : `${name}, ${rel}`;
        items.push(['moving', value]);
      }
    }

    const w = mal?.watching;
    if (w?.title && w.updatedAt && Date.now() - Date.parse(w.updatedAt) <= FRESH_MS) {
      const ep = w.epTotal ? `episode ${w.ep} of ${w.epTotal}` : `episode ${w.ep}`;
      items.push(['watching', `${w.title} — ${ep}`]);
    }

    const r = mal?.reading;
    if (r?.title) {
      items.push(['reading', r.title === 'Berserk' ? `${r.title} — the long haul` : r.title]);
    }

    // nothing answered, or the subtree was swapped away mid-flight → leave the SSR waiting line
    if (!items.length || !this.isConnected) return;
    this.#activate(items);
  }

  disconnectedCallback() {
    if (this.#iv) clearInterval(this.#iv);
    if (this.#dip) clearTimeout(this.#dip);
    this.#iv = null;
    this.#dip = null;
  }
}

if (!customElements.get('as-ticker')) customElements.define('as-ticker', AsTicker);
