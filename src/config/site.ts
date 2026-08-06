export const site = {
	url: "https://anil.vercel.app",
	title: "Anil Seervi",
	handle: "~/anil-seervi",
	description:
		"Developer, designer & open sourcerer. Staff software engineer at Zenduty → Xurrent, Bengaluru.",
	repo: "https://github.com/AnilSeervi/site",
	email: "anilseervi@duck.com",
	socials: {
		github: "https://github.com/AnilSeervi",
		twitter: "https://twitter.com/linASeervi",
		linkedin: "https://www.linkedin.com/in/anilseervi",
		mail: "mailto:anilseervi@duck.com",
		rss: "/rss.xml",
	},
	nav: [
		{ label: "work", href: "/work" },
		{ label: "writing", href: "/writing" },
		{ label: "live", href: "/live" },
		{ label: "about", href: "/about" },
	],
	// `❯ now — …` status line (home) — edit in one place
	now: "status pages at xurrent · oss bench quiet",
	role: "staff software engineer · zenduty → xurrent · bengaluru",
	/**
	 * A headline, not a bio. The role line above it already gives the title,
	 * the company and the city; the proof strip below gives the numbers — so
	 * this line only has to be worth reading.
	 */
	intro:
		"Fixed a stranger's SDK. Got hired 13 days later. Still fixing things.",
} as const

export type ProjectStatus = "active" | "maintained" | "archived"

export interface Project {
	name: string
	/** short description used on the home list */
	home?: string
	/** longer description used on /work */
	work: string
	why: string
	status: ProjectStatus
	/** owner/repo for the commit-activity sparkline (wired in Phase 5) */
	repo?: string
	href: string
	/**
	 * Renders live GitHub counts after the `work` copy instead of baking them
	 * into the string. The hardcoded "★485 · 166 forks" had drifted from the
	 * real 486/165 in both directions at once, which is what hardcoded brags do.
	 */
	live?: "devfolio"
}

/**
 * Home shows the 4 with `home` copy; /work shows all 6, in this order.
 *
 * `status` is checked against the GitHub API, not vibes — it had inverted:
 * Pomodorox was marked archived while being the second-most-recently-pushed
 * repo in the whole account, and QP Hoard was marked active with no commit in
 * 41 months. A live site is not the same claim as a live repo, so where the two
 * disagree the copy says the site is up and the status describes the repo.
 */
export const projects: Project[] = [
	{
		name: "DevFolio",
		home: "Portfolio template — clone, fill six sections, ship.",
		work: "Portfolio template with a documented path from clone to hosted.",
		why: "Why: every portfolio tutorial stopped at “deploy”. DevFolio documents what comes after.",
		status: "maintained",
		repo: "AnilSeervi/DevFolio",
		href: "https://devfolio.js.org",
		live: "devfolio",
	},
	{
		name: "QP Hoard",
		home: "Previous years' papers for undergrads, offline-first.",
		work: "PWA hoarding previous years' question papers — searchable, offline-first. Still serving.",
		why: "Why: exam week, papers scattered across WhatsApp groups. Now they're one search away, offline.",
		status: "archived",
		repo: "AnilSeervi/QP-Hoard",
		href: "https://qp.pages.dev",
	},
	{
		/* display name, not the package id — `inspirational-quotes` breaks at its
		   hyphen in the 150px name column and reads as two half-words */
		name: "Inspirational Quotes",
		home: "One npm install, one random quote. ~280 a month.",
		work: "npm package that hands you a random quote. ~280 installs a month, still.",
		why: "Why: I wanted to know what publishing to a registry actually involved. Turns out: versioning discipline.",
		status: "archived",
		repo: "AnilSeervi/inspirational-quotes",
		href: "https://www.npmjs.com/package/@anilseervi/inspirational-quotes",
	},
	{
		name: "Pomodorox",
		work: "Hourglass-concept pomodoro timer, customizable to your rhythm.",
		why: "Why: every timer nagged. An hourglass you flip felt honest.",
		status: "maintained",
		repo: "AnilSeervi/Pomodorox",
		href: "https://pomodorox.pages.dev",
	},
	{
		name: "Atmos",
		/* no `home` copy: the front page digest holds four, and Atmos is the
		   weakest of the six by every public number — 0 stars, 0 forks, and a
		   newer weather app (atmof) already exists. It keeps its /work row. */
		work: "The modern-UI weather app — Vite + React on OpenWeather and Mapbox.",
		why: "Why: weather apps are ad farms. I wanted radar-clean UI and an excuse to learn Mapbox.",
		status: "archived",
		repo: "AnilSeervi/Atmos",
		href: "https://atmos.pages.dev",
	},
	{
		name: "this site",
		home: "Astro islands, live feeds, view transitions. You're in it.",
		work: "Astro islands over live Spotify, GitHub & MAL feeds. Source in the open.",
		why: "Why: the site is the sandbox — every new API or platform trick lands here first.",
		status: "active",
		repo: "AnilSeervi/site",
		href: "https://github.com/AnilSeervi/site",
	},
]

/**
 * Source link for a row, derived from the same owner/repo the sparkline uses so
 * there's one place to be wrong. `href` points at the running thing — the app,
 * the npm page — and this points at the code, so a name click and a `src ↗`
 * click always land somewhere predictable. Returns null when they'd be the same
 * link: `this site` has no "try it" that isn't the page you're already on, so
 * its name goes to the repo and the slot stays empty.
 */
export const srcUrl = (p: Project): string | null => {
	if (!p.repo) return null
	const url = `https://github.com/${p.repo}`
	return url === p.href ? null : url
}

export const statusColors: Record<ProjectStatus, string> = {
	active: "#92C78C",
	maintained: "#D9A54A",
	archived: "#5E5749",
}

/**
 * /work — the day job. One entry, because there is one job: the `ladder` line
 * carries the progression that a single row header can't, and the bullets are
 * scope owned rather than tasks done.
 */
export const experience = [
	{
		name: "Zenduty → Xurrent",
		ladder: "founding frontend engineer → sde2 → staff",
		meta: "jan 22 — now",
		bullets: [
			"Own the frontend platform — build tooling, error architecture, the release process",
			"Built Status Pages end-to-end — dashboard, public SPA, and the rich-text editor package behind it",
			"600+ PRs reviewed across web, mobile and backend — the frontend review gate",
		],
	},
]

/**
 * /work — PRs to other people's repos, 2020 → now.
 *
 * `prs` is PRs opened to that repo; the section meta carries the merged total
 * (~220 of 259), because per-repo merge rates differ and rounding each one
 * would overstate the small ones. Every row links to the public search that
 * produced it, so the number is checkable rather than claimed.
 *
 * Static, not fetched: a build-time count would add a token dependency and a
 * rate limit to a figure that moves when a PR lands, not when a page renders.
 */
export const contributions = {
	meta: "259 prs · ~220 merged",
	href: "https://github.com/search?q=is%3Apr+author%3AAnilSeervi+is%3Amerged&type=pullrequests",
	lede: "Self-taught, in public — years before the job. One of these went to Zenduty's own SDK, 13 days before they hired me.",
	repos: [
		{
			repo: "mdn/content",
			prs: 111,
			note: "docs + live code examples — css grid, webhid, webxr, form validation",
		},
		{ repo: "github/docs", prs: 28, note: "" },
		{ repo: "kimlimjustin/xplorer", prs: 11, note: "tauri file explorer" },
		{ repo: "gatsbyjs/gatsby", prs: 8, note: "" },
		{ repo: "mdn/interactive-examples", prs: 5, note: "" },
		{ repo: "denoland/deno", prs: 3, note: "" },
		{ repo: "mui/material-ui", prs: 2, note: "" },
	],
	tail: "…and singles in npm/cli, actions/setup-node, web.dev, cloudflare-docs, sentry-docs, swr-site, create-t3-app, tamagui, simple-icons, browser-compat-data, yari, js.org",
}

/**
 * About — click-to-reveal facts (frame 6e).
 *
 * These sit directly above the calendar, so they answer what it can't: the
 * calendar shows the title ladder and the ships, these say the scope, the
 * habits and the person. Nothing here restates a milestone or a card face.
 */
export const facts = [
	{ key: "role", value: "staff engineer · frontend platform" },
	{
		key: "focus",
		value: "front-end architecture · build systems · reliability",
	},
	{ key: "stack", value: "typescript · react" },
	{ key: "reviews", value: "600+ prs reviewed · web, mobile, backend" },
	{ key: "superpower", value: "reading minified stack traces calmly" },
	{ key: "location", value: "bengaluru, in · 12.97° N 77.59° E" },
	{ key: "fuel", value: "filter coffee · lo-fi · long manga arcs" },
]

/** About — career calendar (frame 6e). Yearly rails 2026 → 2020. */
export const calendar = {
	years: [2026, 2025, 2024, 2023, 2022, 2021, 2020],
	/**
	 * A card spans its years, so its two edges are its two dates: the footer
	 * (kicker/title/dates) sits at the bottom = the start, and `head` labels the
	 * top = where the span stands now. `ticks` mark the turns in between, each
	 * pinned to its own year band — the span's dead middle carries the ladder.
	 */
	cards: [
		{
			key: "zd",
			kicker: "ZENDUTY → XURRENT",
			title: "Founding Engineer → Staff",
			dates: "jan 22 — now",
			head: "staff engineer · now",
			ticks: [
				{ year: 2025, label: "staff · oct 25" },
				{ year: 2024, label: "sde2 · jan 24" },
			],
			/** grid rows: 2026 row → the 2022 join */
			fromYear: 2026,
			toYear: 2022,
			accent: true,
		},
		{
			key: "self",
			kicker: "THE CLASSROOM",
			title: "Self-taught, in public",
			dates: "2020 — jan 22",
			head: "~220 merged prs · 111 to mdn",
			ticks: [],
			fromYear: 2021,
			toYear: 2020,
			accent: false,
		},
	],
	/**
	 * The bar: something that shipped, that a stranger would recognize as a
	 * turn in the story, and that no other element on the page already says.
	 * In-progress work, internal tooling and line-count trivia don't clear it —
	 * they live in `details` below, where there's room to earn them.
	 *
	 * Nothing here repeats a card's `ticks` or footer either: the promotions and
	 * the hire are the Zenduty card's own edges and would only be said twice.
	 *
	 * Ordered latest-first within each year, like `years` above — the calendar
	 * runs newest at the top, so reading it upward is reading it forward in time.
	 */
	milestones: [
		{ year: 2026, label: "status pages ship, end to end" }, // jun–jul 26
		{ year: 2025, label: "xurrent acquires zenduty" }, // feb 25
		{ year: 2024, label: "workflows v1 → v2 ship" }, // aug + dec 24
		{ year: 2023, label: "enso design system — co-built" }, // oct 23
		{ year: 2023, label: "vite migration, solo — 45% faster" }, // jul 23
		{ year: 2022, label: "monorepo conversion — proposed & led" }, // dec 22
		{ year: 2022, label: "platform redesign — 237 commits in 6 mo" }, // feb–jul 22
		{ year: 2021, label: "devfolio ships — ★485" },
		{ year: 2020, label: "qp hoard — the first pwa" },
	],
	/**
	 * Written as talking, not as a résumé. Every one of these used to open with
	 * a verb and end with a metric after an em-dash — eight times in a row,
	 * which reads as a bullet-point generator rather than a person. Same facts,
	 * same numbers, said the way you'd say them out loud: first person, varied
	 * sentence shapes, and the reason a thing happened kept next to what it was.
	 */
	details: {
		zd: {
			title: "Founding Engineer → Staff · Zenduty → Xurrent",
			meta: "full-time · jan 24, 2022 — now",
			bullets: [
				"Status Pages is mine end to end: dashboard, public site, and the editor package under both.",
				"Deleted webpack in one PR. App 45% faster, builds 62% faster, TypeScript came free.",
				"react-query was my idea, so I own the layer it made: 100+ typed hooks, web and mobile.",
				"The monorepo was my pitch. 497 files moved, 28,000 lines of forked duplicates gone.",
				"antd had to go. I argued for radix, we built enso, and I gatekept every PR after.",
				"When it crashes it's my problem. One Sentry overhaul cut 41,000 lines from 493 files.",
				"Two weeks in I was redesigning the platform. 237 commits later it shipped.",
				"600+ PRs reviewed, plenty in languages I don't write. Three engineers report to me.",
			],
		},
		self: {
			title: "Self-taught, in public",
			meta: "2020 — jan 22 · the classroom years",
			bullets: [
				"Couldn't get hired yet, so I worked on other people's code: ~220 merged PRs, 111 to MDN.",
				"DevFolio was meant to be my portfolio. Hundreds of other developers run it now.",
				"QP Hoard came out of exam week — every past paper, searchable, offline. Still up.",
				"The last of those PRs went to Zenduty's SDK. They hired me 13 days later.",
			],
		},
		oss: {
			title: "Side projects & OSS",
			meta: "2020 — now · the constant lane",
			bullets: [
				"259 PRs into repos that aren't mine — MDN, GitHub Docs, Gatsby, Deno, npm, web.dev.",
				"Atmos, Pomodorox, Recipes Counter: one app for each thing I wanted to learn properly.",
				"This site is the sandbox. Anything I'm curious about gets built here first.",
				"The unglamorous half is the point — DevFolio issues still get answered, five years on.",
			],
		},
	},
}

/** Command palette (frame 6g) */
export const paletteActions = [
	{ label: "pbcopy email", hint: "⌘C", action: "copy-email" },
	{ label: "open src ↗", action: "open-src" },
	{ label: "cat feed.xml", action: "open-feed" },
	{ label: "theme → system", action: "cycle-accent" },
]

export const accentOptions = ["#D9A54A", "#CE7B5B", "#8CC98F", "#7FA8C9"]
