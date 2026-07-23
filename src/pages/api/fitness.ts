/**
 * GET /api/fitness → { vo2max, restingHr, source: 'garmin' | 'file' | 'none' }
 *
 * Garmin is attempted only when env credentials or kv-stored tokens exist.
 * ANY Garmin failure (auth drift, MFA challenge, upstream 5xx) falls back to
 * the hand-editable data/fitness.json; if even that is unreadable, honest
 * nulls with source 'none'. Never 5xx.
 *
 * Cache: garmin 86400 (vitals drift slowly) · file 3600 · none 60.
 */
import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { hasGarminCredentials, hasStoredGarminTokens, getGarminFitness } from '../../lib/garmin';
// Build-time snapshot — guarantees the fallback exists in the serverless bundle.
import fitnessSnapshot from '../../../data/fitness.json';

export const prerender = false;

interface FitnessBody {
  vo2max: number | null;
  restingHr: number | null;
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

/**
 * data/fitness.json values. Prefers a fresh read from disk (picks up hand
 * edits in dev) and falls back to the bundled build-time snapshot (Vercel).
 */
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
  // 1. Garmin — only worth attempting with env creds or bootstrapped tokens.
  try {
    if (hasGarminCredentials || (await hasStoredGarminTokens())) {
      const { vo2max, restingHr } = await getGarminFitness();
      // Both null means Garmin had nothing useful — prefer the curated file.
      if (vo2max !== null || restingHr !== null) {
        return json({ vo2max, restingHr, source: 'garmin' }, 86400);
      }
    }
  } catch {
    // Any failure (MFA required, token drift, upstream down) → file fallback.
  }

  // 2. Hand-editable file fallback.
  const file = await readFitnessFile();
  if (file) return json({ ...file, source: 'file' }, 3600);

  // 3. Honest nulls.
  return json({ vo2max: null, restingHr: null, source: 'none' }, 60);
};
