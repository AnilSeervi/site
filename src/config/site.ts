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
	// `❯ now — …` status line on the home page
	now: "status pages at xurrent · oss bench quiet",
	role: "staff software engineer · zenduty → xurrent · bengaluru",
	intro:
		"Fixed a stranger's SDK. Got hired 13 days later. Still fixing things.",
} as const

export interface Project {
	name: string
	/** short description used on the home digest */
	home?: string
	/** the spread's description on /work */
	work: string
	/** always-visible italic line under the description; starts "Why:" */
	why: string
	/** real stack, dot-separated */
	stack: string[]
	/** `spread` = editorial treatment on /work; `archive` = compact row */
	tier: "spread" | "archive"
	/** one-liner for an archive row, where there's no room for `work` + `why` */
	blurb?: string
	/** extra text on the chip after the `active` dot — a number, never a status word */
	metric?: string
	/** the deployed site responds — renders the green `active` dot on the chip */
	siteUp?: boolean
	/** owner/repo — drives both the source link and the home sparkline */
	repo?: string
	/** the running thing: the app, the npm page. The source link is derived. */
	href: string
	/** fills the chip from /api/github instead of a hardcoded count string */
	live?: "devfolio"
}

/** /work renders the `spread` tiers in this order, then `archive`; the home digest is the entries with `home` copy. */
export const projects: Project[] = [
	{
		name: "DevFolio",
		home: "Portfolio template — clone, fill six sections, ship.",
		work: "Portfolio template with a documented path from clone to hosted. Hundreds of other developers run it today.",
		why: "Why: every portfolio tutorial stopped at “deploy”. DevFolio starts there.",
		stack: ["scss", "vanilla js", "js.org"],
		tier: "spread",
		siteUp: true,
		repo: "AnilSeervi/DevFolio",
		href: "https://devfolio.js.org",
		live: "devfolio",
	},
	{
		name: "QP Hoard",
		home: "Previous years' papers for undergrads, offline-first.",
		work: "PWA hoarding previous years' question papers — searchable, offline-first. Built for exam week, kept alive since.",
		why: "Why: papers were scattered across WhatsApp groups. Now they're one search away.",
		stack: ["react", "pwa", "cloudflare pages"],
		tier: "spread",
		siteUp: true,
		repo: "AnilSeervi/QP-Hoard",
		href: "https://qp.pages.dev",
	},
	{
		name: "Atmos",
		home: "The modern-UI weather app — Vite + React.",
		work: "The modern-UI weather app — Vite + React on OpenWeather and Mapbox.",
		why: "Why: weather apps are ad farms. I wanted radar-clean UI and an excuse to learn Mapbox.",
		stack: ["vite", "react", "mapbox"],
		tier: "spread",
		siteUp: true,
		repo: "AnilSeervi/Atmos",
		href: "https://atmos.pages.dev",
	},
	{
		name: "Pomodorox",
		home: "Hourglass-concept pomodoro timer — flip to start.",
		work: "Hourglass-concept pomodoro timer, customizable to your rhythm.",
		why: "Why: every timer nagged. An hourglass you flip felt honest.",
		stack: ["react", "typescript", "cloudflare pages"],
		tier: "spread",
		siteUp: true,
		repo: "AnilSeervi/Pomodorox",
		href: "https://pomodorox.pages.dev",
	},
	{
		name: "this site",
		work: "Astro islands over live Spotify, GitHub & MAL feeds. Source in the open — you're in it right now.",
		why: "Why: the sandbox where every new API or platform trick lands first.",
		stack: ["astro", "islands", "vercel"],
		tier: "spread",
		siteUp: true,
		repo: "AnilSeervi/site",
		/* the deployed site, not the repo: if `href` matched the derived GitHub URL,
		   srcUrl() would return null and the row would render only one link */
		href: "https://anil.vercel.app",
	},
	{
		/* display name, not the package id — `inspirational-quotes` wraps at its hyphen */
		name: "Inspirational Quotes",
		work: "An npm package that hands you a random quote. Typed, scoped, and still being pulled three years on.",
		why: "Why: I wanted to know what publishing to a registry actually involved. Turns out: versioning discipline.",
		/* the archive tier has no chip, so the install count rides the blurb */
		blurb: "one npm install, one random quote — ~280 a month",
		stack: ["typescript", "npm"],
		tier: "archive",
		repo: "AnilSeervi/inspirational-quotes",
		href: "https://www.npmjs.com/package/@anilseervi/inspirational-quotes",
	},
]

/** GitHub source link for a row, derived from `repo`; null when it would equal `href`. */
export const srcUrl = (p: Project): string | null => {
	if (!p.repo) return null
	const url = `https://github.com/${p.repo}`
	return url === p.href ? null : url
}

export const spreads = projects.filter((p) => p.tier === "spread")
export const archive = projects.filter((p) => p.tier === "archive")

/** /work — the day job. */
export const experience = [
	{
		name: "Zenduty → Xurrent",
		ladder: "founding frontend engineer → sde2 → staff",
		meta: "jan 22 — now",
		bullets: [
			"Own the frontend platform — build tooling, error architecture, the release process",
			"Built the Status Pages frontend — dashboard, public SPA, rich-text editor package",
			"600+ PRs reviewed across web, mobile and backend — the frontend review gate",
		],
	},
]

/**
 * /work — PRs to other people's repos. `prs` counts PRs opened, not merged;
 * the merged total lives in `meta`. Static by design — no build-time fetch.
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

/** About — click-to-reveal facts. */
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

/** About — career calendar. Yearly rails 2026 → 2020. */
export const calendar = {
	years: [2026, 2025, 2024, 2023, 2022, 2021, 2020],
	/**
	 * A card spans `fromYear` → `toYear`: the footer dates are the start, `head`
	 * labels the top of the span, and each `ticks` entry pins to its own year band.
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
	/** Ordered latest-first within each year, matching `years` above. */
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
	/** Every bullet must stay ≤90 chars: one line on desktop, two on mobile. */
	details: {
		zd: {
			title: "Founding Engineer → Staff · Zenduty → Xurrent",
			meta: "full-time · jan 24, 2022 — now",
			bullets: [
				"I built the Status Pages frontend — dashboard, public site, editor package — and own it.",
				"Deleted webpack in one PR. App 45% faster, builds 62% faster, TypeScript came free.",
				"I left react-query in a review comment; it's now 100+ typed hooks, web and mobile.",
				"Convinced the team to go monorepo: 497 files moved, 28,000 duplicate lines gone.",
				"antd had to go. I argued for radix, we built enso, and I gatekept every PR after.",
				"I own the crashes too. One Sentry overhaul cut 41,000 lines from 493 files.",
				"Two weeks in I was redesigning the platform. 237 commits later it shipped.",
				"I lead three engineers and gate 600+ PRs, plenty in languages I don't write.",
			],
		},
		self: {
			title: "Self-taught, in public",
			meta: "2020 — jan 22 · the classroom years",
			bullets: [
				"Couldn't get hired yet, so I worked on other people's code: ~220 merged PRs, 111 to MDN.",
				"DevFolio started as a portfolio for one person. Hundreds of developers run it now.",
				"QP Hoard came out of exam week — every past paper, searchable, offline. Still up.",
				"The last of those PRs went to Zenduty's SDK. They hired me 13 days later.",
			],
		},
		oss: {
			title: "Side projects & OSS",
			meta: "2020 — now · the constant lane",
			bullets: [
				"259 PRs into repos I don't maintain — MDN, GitHub Docs, Gatsby, Deno, npm, web.dev.",
				"Atmos, Pomodorox, Recipes Counter: one app for each thing I wanted to learn properly.",
				"This site is the sandbox. Anything I'm curious about gets built here first.",
				"The unglamorous half is the point — DevFolio issues still get answered, five years on.",
			],
		},
	},
}

/**
 * `now`: Hardcover keeps several books at status_id 2; this slug picks the one in
 * hand (unknown → newest status-2 book with a cover). `notes` keyed by that slug.
 */
export const reading = {
	/** Hardcover handle — the corner link on the section */
	handle: "kazenil",
	now: "the-psychology-of-money",
	notes: {} as Record<string, string>,
}

/** Command palette */
export const paletteActions = [
	{ label: "pbcopy email", hint: "⌘C", action: "copy-email" },
	{ label: "open src ↗", action: "open-src" },
	{ label: "cat feed.xml", action: "open-feed" },
	{ label: "theme → system", action: "cycle-accent" },
]

export const accentOptions = ["#D9A54A", "#CE7B5B", "#8CC98F", "#7FA8C9"]
