// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

/** Article code-block theme: strings brass, numerals green, functions cream. */
const warmTheme = {
  name: 'complete-minimal',
  type: 'dark',
  colors: {
    'editor.background': '#141110',
    'editor.foreground': '#C9C0AF'
  },
  settings: [
    { settings: { foreground: '#C9C0AF' } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#5E5749' }
    },
    {
      scope: ['string', 'punctuation.definition.string', 'string.template'],
      settings: { foreground: '#D9A54A' }
    },
    {
      scope: [
        'constant.numeric',
        'constant.language',
        'constant.character',
        'constant.other.placeholder'
      ],
      settings: { foreground: '#92C78C' }
    },
    {
      scope: [
        'entity.name.function',
        'support.function',
        'entity.name.class',
        'support.class',
        'entity.name.type',
        'new.expr entity.name.function'
      ],
      settings: { foreground: '#EDE6DA' }
    },
    {
      scope: [
        'support.variable',
        'variable.language',
        'support.constant',
        'variable.other.object',
        'support.type.object'
      ],
      settings: { foreground: '#8A8171' }
    },
    {
      scope: ['keyword', 'storage.type', 'storage.modifier', 'keyword.operator.new'],
      settings: { foreground: '#A99F8C' }
    },
    {
      scope: ['keyword.operator'],
      settings: { foreground: '#A99F8C' }
    },
    {
      scope: ['variable.other.property', 'support.type.property-name', 'meta.object-literal.key'],
      settings: { foreground: '#C9C0AF' }
    },
    {
      scope: ['entity.name.tag'],
      settings: { foreground: '#A99F8C' }
    },
    {
      scope: ['entity.other.attribute-name'],
      settings: { foreground: '#8A8171' }
    },
    {
      scope: ['markup.inserted'],
      settings: { foreground: '#92C78C' }
    },
    {
      scope: ['markup.deleted'],
      settings: { foreground: '#CE7B5B' }
    }
  ]
};

/** Lift ```lang title="…" fence meta onto the <pre> so CSS can render a label. */
const codeTitleTransformer = {
  name: 'code-title',
  pre(node) {
    const meta = this.options.meta?.__raw ?? '';
    const m = meta.match(/title="([^"]+)"/);
    if (m) node.properties['data-title'] = m[1];
  }
};

export default defineConfig({
  site: 'https://anil.vercel.app',
  adapter: vercel(),
  redirects: {
    // Old site structure → new structure (301s by default)
    '/blog': '/writing',
    '/blog/hof-in-js': '/writing/higher-order-functions-in-javascript',
    '/blog/[slug]': '/writing/[slug]',
    '/snippets': '/writing',
    '/snippets/[slug]': '/writing/[slug]',
    '/anime': '/live',
    '/spotify': '/live',
    '/dashboard': '/live',
    '/guestbook': '/live',
    '/uses': '/about',
    '/projects': '/work',
    '/feed.xml': '/rss.xml',
    // External shortlinks carried over from the old site's vercel.json
    '/newsletter': 'https://anilseervi.substack.com/',
    '/linkedin': 'https://www.linkedin.com/in/anilseervi/',
    '/twitter': 'https://twitter.com/linaseervi',
    '/github': 'https://github.com/anilseervi',
    '/insta': 'https://www.instagram.com/linaseervi/',
    '/cv': 'https://cv-anil.vercel.app/',
    '/hentai': 'https://youtu.be/dQw4w9WgXcQ'
  },
  integrations: [mdx(), sitemap()],
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: {
      theme: warmTheme,
      transformers: [codeTitleTransformer]
    }
  }
});
