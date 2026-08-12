/** GET /api/fitness. s-maxage: garmin 86400 · file 3600 · none 60. Degrades, never 5xx. */
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { hasGarminCredentials, hasStoredGarminTokens, getGarminFitness } from '../../lib/garmin';
// Build-time snapshot — guarantees the fallback exists in the serverless bundle.
import fitnessSnapshot from '../../../data/fitness.json';

export const prerender = false;

interface FitnessBody {
  vo2max: number | null;
  restingHr: number | null;
  /** Garmin's fitness rating for the VO2max; garmin-only */
  vo2maxRating: string | null;
  source: 'garmin' | 'file' | 'none';
}

function json(body: FitnessBody, sMaxAge: number): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${sMaxAge * 2}`
    }
  });
}

function asVital(x: unknown): number | null {
  return typeof x === 'number' && Number.isFinite(x) ? x : null;
}

/** data/fitness.json — fresh disk read (picks up dev edits), else the snapshot. */
async function readFitnessFile(): Promise<{ vo2max: number | null; restingHr: number | null } | null> {
  try {
    const raw = await readFile(new URL('../../../data/fitness.json', import.meta.url), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      const rec = parsed as Record<string, unknown>;
      return { vo2max: asVital(rec.vo2max), restingHr: asVital(rec.restingHr) };
    }
  } catch {
    // fall through to the bundled snapshot
  }
  if (typeof fitnessSnapshot === 'object' && fitnessSnapshot !== null) {
    const rec = fitnessSnapshot as Record<string, unknown>;
    return { vo2max: asVital(rec.vo2max), restingHr: asVital(rec.restingHr) };
  }
  return null;
}

export const GET: APIRoute = async () => {
  try {
    if (hasGarminCredentials || (await hasStoredGarminTokens())) {
      const { vo2max, restingHr, vo2maxRating } = await getGarminFitness();
      if (vo2max !== null || restingHr !== null) {
        return json({ vo2max, restingHr, vo2maxRating, source: 'garmin' }, 86400);
      }
    }
  } catch {
    // Any Garmin failure (MFA, token drift, upstream down) → file fallback.
  }

  const file = await readFitnessFile();
  if (file) return json({ ...file, vo2maxRating: null, source: 'file' }, 3600);

  return json({ vo2max: null, restingHr: null, vo2maxRating: null, source: 'none' }, 60);
};
