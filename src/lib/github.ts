/** GitHub data layer: contributions calendar (GraphQL) + repo/event stats (REST). Server-only, reads GITHUB_TOKEN. */

const USER = 'AnilSeervi';
const REST = 'https://api.github.com';
const GRAPHQL = 'https://api.github.com/graphql';

const token = import.meta.env.GITHUB_TOKEN;

export const isGithubConfigured = Boolean(token);

const headers = (): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json'
});

export interface Contributions {
  /** contributions in the last year */
  total: number;
  /** 52 weekly totals, oldest → newest */
  weeks: number[];
  /** weeks[i] = 7 daily counts (partial current week padded with 0s) */
  days: number[][];
  /** ISO date of days[0][0]; the grid is Sunday-aligned, so each cell is `from + (week * 7 + weekday)` days. */
  from: string;
  followers: number;
}

const CONTRIBUTIONS_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      followers { totalCount }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { contributionCount date } }
        }
      }
    }
  }
`;

export async function getContributions(): Promise<Contributions> {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: CONTRIBUTIONS_QUERY,
      variables: { login: USER }
    })
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  const user = json?.data?.user;
  if (!user) throw new Error('GitHub GraphQL returned no user');

  const calendar = user.contributionsCollection.contributionCalendar;
  const allWeeks: {
    contributionDays: { contributionCount: number; date: string }[];
  }[] = calendar.weeks;

  // GitHub returns ~53 columns; keep the last 52 and pad the short current week to 7.
  const kept = allWeeks.slice(-52);
  const days = kept.map((week) => {
    const counts = week.contributionDays.map((d) => d.contributionCount);
    while (counts.length < 7) counts.push(0);
    return counts;
  });
  const weeks = days.map((w) => w.reduce((a, b) => a + b, 0));

  // Only the last column comes back short; GitHub pads the oldest one itself.
  // Padding above is appended, so a partial FIRST column would break this anchor.
  const from = kept[0]?.contributionDays[0]?.date ?? '';

  return {
    total: calendar.totalContributions,
    weeks,
    days,
    from,
    followers: user.followers.totalCount
  };
}

export interface RepoStats {
  /** public repos */
  repoCount: number;
  /** stargazers summed over non-fork owned repos */
  stars: number;
  /** stargazers of AnilSeervi/DevFolio */
  devfolioStars: number;
  /** forks of AnilSeervi/DevFolio */
  devfolioForks: number;
}

export async function getRepoStats(): Promise<RepoStats> {
  // GitHub caps per_page at 100 — paginate so 100+ repos count correctly
  const repos: {
    fork: boolean;
    full_name: string;
    stargazers_count: number;
    forks_count: number;
  }[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`${REST}/users/${USER}/repos?per_page=100&page=${page}`, {
      headers: headers()
    });
    if (!res.ok) throw new Error(`GitHub repos ${res.status}`);
    const batch: typeof repos = await res.json();
    repos.push(...batch);
    if (batch.length < 100) break;
  }

  const mine = repos.filter((repo) => !repo.fork);
  const stars = mine.reduce((acc, repo) => acc + (repo.stargazers_count ?? 0), 0);
  const devfolio = repos.find((repo) => repo.full_name === `${USER}/DevFolio`);

  return {
    repoCount: repos.length,
    stars,
    devfolioStars: devfolio?.stargazers_count ?? 0,
    devfolioForks: devfolio?.forks_count ?? 0
  };
}

export interface LastPush {
  repo: string;
  /** commits the push added; null when GitHub won't say — callers must handle it */
  commits: number | null;
  ago: string;
}

/** a branch's first push reports this as `before`, so there is nothing to compare against */
const ZERO_SHA = '0000000000000000000000000000000000000000';

/**
 * PushEvent payloads no longer carry `commits` or `size` — they arrive as just
 * repository_id, push_id, ref, head, before, on every events endpoint (user,
 * user public, and repo alike) — so the count comes from comparing the two SHAs
 * the payload does give.
 *
 * Counted along the FIRST-PARENT chain, not `total_commits`. A merge makes the
 * other side's history reachable, and `total_commits` counts all of it: merging
 * this repo's old 54-commit history under the rebuild reported 57 for a push
 * that added 3. Those 54 were already on the remote. First-parent measures what
 * the push actually added to the branch, which is the old `distinct_size`.
 *
 * null rather than 0 when nothing can be resolved: a branch's first push has no
 * `before`, and a force-push leaves one that no longer exists (404). 0 would
 * render as "0 commits", which is a claim; null lets the caller say less.
 */
async function pushSize(repo: string, before?: string, head?: string): Promise<number | null> {
  if (!repo || !before || !head || before === ZERO_SHA) return null;
  try {
    const res = await fetch(`${REST}/repos/${repo}/compare/${before}...${head}`, {
      headers: headers()
    });
    if (!res.ok) return null;
    const json = await res.json();
    const total: number | null =
      typeof json?.total_commits === 'number' ? json.total_commits : null;

    // parents come with the compare payload, so the walk costs no extra request
    const commits: { sha: string; parents?: { sha: string }[] }[] = Array.isArray(json?.commits)
      ? json.commits
      : [];
    const parents = new Map(commits.map((c) => [c.sha, c.parents?.[0]?.sha]));

    let sha: string | undefined = head;
    let steps = 0;
    // compare truncates commits[] at 250, so the chain can dead-end; bail out
    // to total_commits rather than report a count that stopped early
    while (sha && sha !== before && steps <= 250) {
      if (!parents.has(sha)) return total;
      sha = parents.get(sha);
      steps++;
    }
    // a real push adds at least one commit, so 0 means the walk was wrong —
    // say nothing rather than render "0 commits"
    if (sha === before) return steps || null;
    return total;
  } catch {
    return null;
  }
}

/** Bucket an ISO timestamp by UTC calendar-day distance from now. */
function agoBucket(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const dayMs = 86_400_000;
  const thenDay = Math.floor(
    Date.UTC(then.getUTCFullYear(), then.getUTCMonth(), then.getUTCDate()) / dayMs
  );
  const nowDay = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / dayMs
  );
  const diff = nowDay - thenDay;
  if (diff <= 0) return 'earlier today';
  if (diff === 1) return 'yesterday';
  return `${diff} days ago`;
}

export async function getLastPush(): Promise<LastPush | null> {
  const res = await fetch(`${REST}/users/${USER}/events/public?per_page=100`, {
    headers: headers()
  });
  if (!res.ok) throw new Error(`GitHub events ${res.status}`);
  const events: {
    type: string;
    created_at: string;
    repo?: { name: string };
    payload?: {
      size?: number;
      commits?: unknown[];
      before?: string;
      head?: string;
    };
  }[] = await res.json();

  const push = events.find((event) => event.type === 'PushEvent');
  if (!push) return null;

  const repo = push.repo?.name ?? '';
  // the first two are what the payload used to carry; keep reading them in case
  // they come back, and fall through to the compare when they don't
  const commits =
    push.payload?.commits?.length ??
    push.payload?.size ??
    (await pushSize(repo, push.payload?.before, push.payload?.head));

  return { repo, commits, ago: agoBucket(push.created_at) };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * repo → 52 weekly commit counts ('all' series: owner + others).
 * GitHub answers 202 while computing stats; retried once after 2.5s, else omitted.
 */
export async function getSparks(repos: string[]): Promise<Record<string, number[]>> {
  const entries = await Promise.all(
    repos.map(async (repo): Promise<[string, number[]] | null> => {
      try {
        const url = `${REST}/repos/${repo}/stats/participation`;
        let res = await fetch(url, { headers: headers() });
        if (res.status === 202) {
          await sleep(2500);
          res = await fetch(url, { headers: headers() });
        }
        if (res.status === 202 || !res.ok) return null; // still computing, or failed
        const json = await res.json();
        if (!Array.isArray(json?.all)) return null;
        return [repo, json.all];
      } catch {
        return null;
      }
    })
  );
  return Object.fromEntries(entries.filter((entry): entry is [string, number[]] => entry !== null));
}
