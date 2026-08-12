# anil.vercel.app

Personal site — writing, work, and a `/live` page wired to whatever I'm actually
doing: what's playing, what I'm reading, how far I ran this week.

Built with [Astro](https://astro.build). The interactive parts are plain custom
elements rather than a UI framework, so no framework runtime ships to the
browser — the page arrives as HTML and each island upgrades itself in place.

Previously a Next.js site; the rewrite lives in this repo's history under the
merge commit that grafted the two together.

## Running it

```sh
pnpm install
pnpm dev        # localhost:4321
pnpm build      # production build
pnpm check      # astro check — types across .astro and .ts
```

Node 24 (see `.nvmrc`), pnpm 10.

No environment variables are needed to run the site. Each live feed degrades on
its own when credentials are missing — an empty, waiting or error state in the
row, and the guestbook endpoints answer `200 {"disabled": true}` rather than
throwing — so `pnpm dev` on a fresh clone gives you the whole site with the data
rows quiet.

## Layout

```
src/
  pages/          routes; pages/api/* are the server endpoints the islands call
  islands/        custom elements — one file per interactive piece
  components/     .astro components, including live/ for the /live sections
  layouts/        Base (shell, fonts, view transitions), Article
  lib/            data providers: spotify, github, mal, garmin, hardcover, db
  content/        posts and snippets as MDX
  config/site.ts  copy and config in one place — nav, projects, bio, calendar
  styles/         global tokens; everything else is component-scoped
scripts/          Playwright probes and the Hardcover sync
```

## Live data

| section    | source                                    |
| ---------- | ----------------------------------------- |
| listening  | Spotify                                   |
| coding     | GitHub contributions                      |
| watching   | MyAnimeList                               |
| moving     | Garmin activities                         |
| reading    | Hardcover                                 |
| weather    | Open-Meteo (no key needed)                |
| guestbook  | Turso (libSQL) + GitHub OAuth for sign-in |

Credentials, by name only — see the provider in `src/lib/` for what each one is
for:

- Spotify — `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`
- GitHub — `GITHUB_TOKEN`
- MyAnimeList — `MAL_CLIENT_ID`, `MAL_CLIENT_SECRET`, `MAL_REFRESH_TOKEN`
- Garmin — `GARMIN_EMAIL`, `GARMIN_PASSWORD`
- Hardcover — `HARDCOVER_TOKEN`
- Guestbook — `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `OAUTH_CLIENT_KEY`,
  `OAUTH_CLIENT_SECRET`, `SESSION_SECRET`

`scripts/garmin-bootstrap.mjs` and `scripts/spotify-token.mjs` exist to mint the
refresh tokens those two need.

The reading shelf is the one feed that doesn't call out at request time: it
renders from `src/data/hardcover.json` and the covers beside it, refreshed daily
by `.github/workflows/sync-hardcover.yml`. If that job fails the last good
snapshot stays committed and the page keeps rendering it.

## Checks

`scripts/check-*.mjs` are Playwright probes, one per interactive piece — they
drive a real browser against a running dev server and print a JSON verdict.

```sh
pnpm dev &
node scripts/check-reading.mjs
node scripts/check-live.mjs https://anil.vercel.app
```

They assert behaviour that types can't: that a canvas actually painted, that an
interval doesn't leak across a view transition, that a loading state resolves.

How they take a base URL isn't consistent — most read the first argument and
fall back to `localhost:4321`, one reads a `BASE` env var, and two hardcode
localhost. Check the top of the file before pointing one at production.

## License

[MIT](./LICENSE)
