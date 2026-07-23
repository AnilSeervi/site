export const site = {
  url: 'https://anil.vercel.app',
  title: 'Anil Seervi',
  handle: '~/anil-seervi',
  description:
    'Developer, designer & open sourcerer. Staff software engineer at Zenduty, Bangalore.',
  repo: 'https://github.com/AnilSeervi/site',
  email: 'anilseervi@duck.com',
  socials: {
    github: 'https://github.com/AnilSeervi',
    twitter: 'https://twitter.com/linASeervi',
    linkedin: 'https://www.linkedin.com/in/anilseervi',
    mail: 'mailto:anilseervi@duck.com',
    rss: '/rss.xml'
  },
  nav: [
    { label: 'work', href: '/work' },
    { label: 'writing', href: '/writing' },
    { label: 'live', href: '/live' },
    { label: 'about', href: '/about' }
  ],
  // `❯ now — …` status line (home) — edit in one place
  now: 'incident timelines at zenduty · oss bench quiet · porting this site to astro',
  role: 'staff software engineer · zenduty · bangalore',
  intro:
    'Developer, designer & open sourcerer. I build tools developers actually use — a portfolio template behind hundreds of dev sites — and ship a faster, more accessible web at Zenduty.'
} as const;

export type ProjectStatus = 'active' | 'maintained' | 'archived';

export interface Project {
  name: string;
  /** short description used on the home list */
  home?: string;
  /** longer description used on /work */
  work: string;
  why: string;
  status: ProjectStatus;
  /** owner/repo for the commit-activity sparkline (wired in Phase 5) */
  repo?: string;
  href: string;
}

/** Home shows the 4 with `home` copy; /work shows all 5, in this order. */
export const projects: Project[] = [
  {
    name: 'DevFolio',
    home: 'Portfolio template — clone, fill six sections, ship.',
    work: 'Portfolio template with a documented path from clone to hosted. ★486 · 166 forks.',
    why: 'Why: every portfolio tutorial stopped at “deploy”. DevFolio starts there — documented from clone to custom domain.',
    status: 'maintained',
    repo: 'AnilSeervi/DevFolio',
    href: 'https://github.com/AnilSeervi/DevFolio'
  },
  {
    name: 'QP Hoard',
    home: "Previous years' papers for undergrads, offline-first.",
    work: "PWA hoarding previous years' question papers — searchable, offline-first.",
    why: "Why: exam week, papers scattered across WhatsApp groups. Now they're one search away, offline.",
    status: 'active',
    href: 'https://qp.pages.dev'
  },
  {
    name: 'Atmos',
    home: 'The modern-UI weather app — Vite + React.',
    work: 'The modern-UI weather app — Vite + React on OpenWeather and Mapbox.',
    why: 'Why: weather apps are ad farms. I wanted radar-clean UI and an excuse to learn Mapbox.',
    status: 'archived',
    repo: 'AnilSeervi/Atmos',
    href: 'https://github.com/AnilSeervi/Atmos'
  },
  {
    name: 'Pomodorox',
    work: 'Hourglass-concept pomodoro timer, customizable to your rhythm.',
    why: 'Why: every timer nagged. An hourglass you flip felt honest.',
    status: 'archived',
    repo: 'AnilSeervi/Pomodorox',
    href: 'https://github.com/AnilSeervi/Pomodorox'
  },
  {
    name: 'this site',
    home: "Astro islands, live feeds, view transitions. You're in it.",
    work: 'Astro islands over live Spotify, GitHub & MAL feeds. Source in the open.',
    why: 'Why: the site is the sandbox — every new API or platform trick lands here first.',
    status: 'active',
    repo: 'AnilSeervi/site',
    href: 'https://github.com/AnilSeervi/site'
  }
];

export const statusColors: Record<ProjectStatus, string> = {
  active: '#92C78C',
  maintained: '#D9A54A',
  archived: '#5E5749'
};

export const experience = [
  {
    name: 'Zenduty',
    desc: ' — staff software engineer. Incident-management tooling for on-call teams; front-end architecture, performance and accessibility.',
    meta: 'current'
  },
  {
    name: 'Before that',
    desc: ' — self-taught, in public. Everything below was the classroom.',
    meta: 'the way in'
  }
];

/** About — click-to-reveal facts (frame 6e) */
export const facts = [
  { key: 'role', value: 'design-minded staff engineer, zenduty' },
  { key: 'focus', value: 'front-end architecture · performance · a11y' },
  { key: 'stack', value: 'typescript · react · astro (this site) · tailwind' },
  { key: 'superpower', value: 'reading minified stack traces calmly' },
  { key: 'location', value: 'bengaluru, in · 12.97° N 77.59° E' },
  { key: 'fuel', value: 'filter coffee · lo-fi · long manga arcs' }
];

/** About — career calendar (frame 6e). Yearly rails 2026 → 2018. */
export const calendar = {
  years: [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018],
  cards: [
    {
      key: 'zd',
      kicker: 'ZENDUTY',
      title: 'Frontend → Staff Engineer',
      dates: 'may 22 — now',
      /** grid rows: 2026 row → mid-2022 */
      fromYear: 2026,
      toYear: 2022,
      accent: true
    },
    {
      key: 'self',
      kicker: 'THE CLASSROOM',
      title: 'Self-taught, in public',
      dates: '2018 — apr 22',
      fromYear: 2021,
      toYear: 2018,
      accent: false
    }
  ],
  milestones: [
    { year: 2024, label: 'staff promotion' },
    { year: 2022, label: 'joins zenduty' },
    { year: 2021, label: 'devfolio ships · first articles' },
    { year: 2020, label: 'qp hoard, the first pwa' },
    { year: 2018, label: 'hello, world' }
  ],
  details: {
    zd: {
      title: 'Frontend → Staff Engineer · Zenduty',
      meta: 'full-time · may 22 — now',
      bullets: [
        'Rebuilt the incident timeline — the screen on-call engineers live in',
        'Led the accessibility pass: keyboard-first nav, sane focus order, AA contrast',
        "Cut dashboard JS by a third chasing performance budgets — staff since '24"
      ]
    },
    self: {
      title: 'Self-taught, in public',
      meta: '2018 — apr 22 · the classroom years',
      bullets: [
        "DevFolio ships — ends up running hundreds of other developers' portfolios",
        'QP Hoard: the first PWA, built for exam week and kept alive since',
        'Eight articles on JS & React — writing became the study method'
      ]
    },
    oss: {
      title: 'Side projects & OSS',
      meta: '2018 — now · the constant lane',
      bullets: [
        'Atmos, Pomodorox, Recipes Counter — one app per thing worth learning',
        'This site: the sandbox where every new API or platform trick lands first',
        'Maintenance over novelty — DevFolio issues still get answered'
      ]
    }
  }
};

/** Command palette (frame 6g) */
export const paletteActions = [
  { label: 'pbcopy email', hint: '⌘C', action: 'copy-email' },
  { label: 'open src ↗', action: 'open-src' },
  { label: 'cat feed.xml', action: 'open-feed' },
  { label: 'theme → system', action: 'cycle-accent' }
];

export const accentOptions = ['#D9A54A', '#CE7B5B', '#8CC98F', '#7FA8C9'];
