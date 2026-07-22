// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://anil.vercel.app',
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  devToolbar: { enabled: false }
});
