/**
 * GitHub data layer — GraphQL contributions calendar + REST repo/event stats.
 * Server-only: reads GITHUB_TOKEN (classic PAT) from import.meta.env.
 */

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
  followers: number;
}

const CONTRIBUTIONS_QUERY = `
  query ($login: String!) {
    user(login: $login) {
      followers { totalCount }
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { contributionCount } }
        }
      }
    }
  }
`;

export async function getContributions(): Promise<Contributions> {
  const res = await fetch(GRAPHQL, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: CONTRIBUTIONS_QUERY, variables: { login: USER } })
  });
  if (!res.ok) throw new Error(`GitHub GraphQL ${res.status}`);
  const json = await res.json();
  const user = json?.data?.user;
  if (!user) throw new Error('GitHub GraphQL returned no user');

  const calendar = user.contributionsCollection.contributionCalendar;
  const allWeeks: { contributionDays: { contributionCount: number }[] }[] = calendar.weeks;

  // The calendar spans ~53 columns; keep the most recent 52 and pad any
  // partial week (the current one) to 7 days so the shape is consistent.
  const days = allWeeks.slice(-52).map((week) => {
    const counts = week.contributionDays.map((d) => d.contributionCount);
    while (counts.length < 7) counts.push(0);
    return counts;
  });
  const weeks = days.map((w) => w.reduce((a, b) => a + b, 0));

  return {
    total: calendar.totalContributions,
    weeks,
    days,
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
}

export async function getRepoStats(): Promise<RepoStats> {
  // GitHub caps per_page at 100 — paginate so 100+ repos count correctly
  const repos: { fork: boolean; full_name: string; stargazers_count: number }[] = [];
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
    devfolioStars: devfolio?.stargazers_count ?? 0
  };
}

export interface LastPush {
  repo: string;
  commits: number;
  ago: string;
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
    payload?: { size?: number; commits?: unknown[] };
  }[] = await res.json();

  const push = events.find((event) => event.type === 'PushEvent');
  if (!push) return null;

  return {
    repo: push.repo?.name ?? '',
    commits: push.payload?.commits?.length ?? push.payload?.size ?? 0,
    ago: agoBucket(push.created_at)
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * repo → 52 weekly commit counts (the 'all' series: owner + others).
 * GitHub answers 202 while it computes stats — retry once after 2.5s,
 * and omit the repo if it still isn't ready (or the request fails).
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
