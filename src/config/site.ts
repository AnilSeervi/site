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
  now: 'incident timelines at zenduty · oss bench quiet · porting this site to astro'
} as const;
