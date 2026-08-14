// Build-time OG cards (satori → resvg): /og/site.png, /og/<page>.png, /og/writing/<id>.png.
// Prerendered, so neither lib ships to the client or the serverless runtime.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { APIRoute, InferGetStaticPropsType } from 'astro';
import { getCollection } from 'astro:content';
import { Resvg } from '@resvg/resvg-js';
import satori, { type SatoriOptions } from 'satori';
import { site } from '~/config/site';

export const prerender = true;

type Card =
  | { kind: 'default' }
  | { kind: 'page'; label: string }
  | { kind: 'entry'; title: string; meta: string };

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const snippets = await getCollection('snippets');

  return [
    { params: { slug: 'site' }, props: { card: { kind: 'default' } as Card } },
    ...(['work', 'writing', 'live', 'about'] as const).map((page) => ({
      params: { slug: page },
      props: { card: { kind: 'page', label: `~/${page}` } as Card }
    })),
    ...posts.map((entry) => ({
      params: { slug: `writing/${entry.id}` },
      props: {
        card: {
          kind: 'entry',
          title: entry.data.title,
          meta: `${entry.data.date.getFullYear()} · ${entry.data.tag} · anil.vercel.app`
        } as Card
      }
    })),
    ...snippets.map((entry) => ({
      params: { slug: `writing/${entry.id}` },
      props: {
        card: {
          kind: 'entry',
          title: entry.data.title,
          meta: `snippet · ${entry.data.tag} · anil.vercel.app`
        } as Card
      }
    }))
  ];
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

/* tokens — must stay in lockstep with src/styles/global.css */
const BG = '#0F0D0B';
const CREAM = '#EDE6DA';
const BRASS = '#D9A54A';
const META = '#8A8171';
const SERIF = 'Newsreader';
const MONO = 'Spline Sans Mono';

/* satori element helper — plain object tree, no JSX */
type El = { type: string; props: Record<string, unknown> };
function el(type: string, style: Record<string, unknown>, children?: unknown): El {
  return { type, props: children === undefined ? { style } : { style, children } };
}

function buildCard(card: Card): El {
  const title = card.kind === 'entry' ? card.title : card.kind === 'page' ? card.label : site.title;
  const meta =
    card.kind === 'entry'
      ? card.meta
      : card.kind === 'page'
        ? 'staff software engineer · zenduty → xurrent'
        : site.url.replace('https://', '');

  const titleBlock: El[] = [
    el(
      'div',
      {
        fontFamily: SERIF,
        fontWeight: 500,
        fontSize: card.kind === 'entry' ? '62px' : '96px',
        lineHeight: 1.15,
        color: CREAM,
        maxWidth: '1020px',
        lineClamp: 3
      },
      title
    )
  ];
  if (card.kind === 'default') {
    titleBlock.push(
      el('div', { marginTop: '28px', fontFamily: MONO, fontSize: '26px', color: META }, site.role)
    );
  }

  return el(
    'div',
    {
      width: '1200px',
      height: '630px',
      display: 'flex',
      flexDirection: 'column',
      padding: '64px 80px 60px',
      backgroundColor: BG,
      // %-stops are required: satori resolves px stops against the element
      // width, but %-stops against the tile's gradient radius (26√2).
      backgroundImage:
        'radial-gradient(circle at 26px 26px, rgba(237, 230, 218, 0.08) 6.8%, transparent 8.2%)',
      backgroundSize: '52px 52px'
    },
    [
      el(
        'div',
        { fontFamily: MONO, fontSize: '30px', color: BRASS, letterSpacing: '0.5px' },
        site.handle
      ),
      el(
        'div',
        { flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
        titleBlock
      ),
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }, [
        el('div', { width: '120px', height: '2px', backgroundColor: BRASS, marginBottom: '26px' }),
        el('div', { fontFamily: MONO, fontSize: '24px', color: META, letterSpacing: '0.5px' }, meta)
      ])
    ]
  );
}

/* Static TTFs: satori can't read fontsource's woff2. Resolved from cwd because
   the bundled endpoint's import.meta.url no longer points into src. */
let fontsPromise: Promise<SatoriOptions['fonts']> | undefined;
function loadFonts(): Promise<SatoriOptions['fonts']> {
  fontsPromise ??= Promise.all([
    readFile(resolve(process.cwd(), 'src/assets/og-fonts/newsreader-500.ttf')),
    readFile(resolve(process.cwd(), 'src/assets/og-fonts/spline-sans-mono-400.ttf'))
  ]).then(([newsreader, splineMono]) => [
    { name: SERIF, data: newsreader, weight: 500, style: 'normal' },
    { name: MONO, data: splineMono, weight: 400, style: 'normal' }
  ]);
  return fontsPromise;
}

export const GET: APIRoute<Props> = async ({ props }) => {
  const svg = await satori(buildCard(props.card) as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: await loadFonts()
  });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' }
  });
};
