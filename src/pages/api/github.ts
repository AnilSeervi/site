import type { APIRoute } from 'astro';
import { projects } from '../../config/site';
import {
  getContributions,
  getLastPush,
  getRepoStats,
  getSparks,
  isGithubConfigured
} from '../../lib/github';

export const prerender = false;

const json = (body: unknown, sMaxage: number) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${sMaxage}, stale-while-revalidate=${sMaxage * 2}`
    }
  });

export const GET: APIRoute = async () => {
  if (!isGithubConfigured) return json({ disabled: true }, 1200);

  const sparkRepos = projects
    .map((project) => project.repo)
    .filter((repo): repo is string => Boolean(repo));

  const [contributions, repoStats, lastPush, sparks] = await Promise.allSettled([
    getContributions(),
    getRepoStats(),
    getLastPush(),
    getSparks(sparkRepos)
  ]);

  const cal = contributions.status === 'fulfilled' ? contributions.value : null;
  const repo = repoStats.status === 'fulfilled' ? repoStats.value : null;
  const push = lastPush.status === 'fulfilled' ? lastPush.value : null;

  const degraded =
    contributions.status === 'rejected' ||
    repoStats.status === 'rejected' ||
    lastPush.status === 'rejected';

  return json(
    {
      total: cal?.total ?? null,
      weeks: cal?.weeks ?? null,
      days: cal?.days ?? null,
      /** ISO date of days[0][0] — the grid's calendar anchor (see Contributions) */
      from: cal?.from ?? null,
      followers: cal?.followers ?? null,
      repoCount: repo?.repoCount ?? null,
      stars: repo?.stars ?? null,
      devfolioStars: repo?.devfolioStars ?? null,
      devfolioForks: repo?.devfolioForks ?? null,
      lastPush: push,
      sparks: sparks.status === 'fulfilled' ? sparks.value : {}
    },
    degraded ? 60 : 1200
  );
};
