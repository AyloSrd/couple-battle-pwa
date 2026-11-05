import { z } from 'zod';
import { ZGameSchema, isGameConsistent, type TGame } from '@/shared/game/domain/game';
import { ZProfileSchema, type TSaveKey, type TSaveValues } from './types';

/**
 * The one codec between the save store and storage. Every stored value is an envelope
 * `{ v, savedAt, data }` serialised as JSON; `encode` and `decode` are exact inverses for every
 * value the store can hold (round-trip tested), so what a relaunch reads is what was shown.
 */

/** Current version of each stored value. Bump it together with a `MIGRATIONS` entry. */
export const SAVE_VERSION = { profile: 1, game: 1 } as const satisfies Record<TSaveKey, number>;

type TMigration = (data: unknown) => unknown;
export type TMigrations = Record<number, TMigration>;

/**
 * `MIGRATIONS[key][v]` upgrades data written at version `v` to `v + 1`. Empty today; every
 * entry gets a test (a fixture at `v` decodes at the current version).
 * e.g. profile `1: (d) => ({ ...d, settings: { ...d.settings, haptics: d.settings.vibration } })`
 */
export const MIGRATIONS: Record<TSaveKey, TMigrations> = { profile: {}, game: {} };

const SCHEMAS = {
  profile: ZProfileSchema,
  game: ZGameSchema.refine((game) => isGameConsistent(game as TGame), { message: 'inconsistent game' }),
} as const satisfies Record<TSaveKey, z.ZodType>;

const ZEnvelopeSchema = z.object({
  v: z.number().int().nonnegative(),
  savedAt: z.number().int().nonnegative(),
  data: z.unknown(),
});

export type TDecoded<T> =
  | { kind: 'ok'; data: T; savedAt: number }
  /** nothing stored */
  | { kind: 'missing' }
  /** not JSON, not an envelope, no migration path, or data that fails its schema */
  | { kind: 'invalid' }
  /** written by a newer app (downgrade): never overwrite it */
  | { kind: 'newer' };

export function encode<K extends TSaveKey>(key: K, data: TSaveValues[K], savedAt: number): string {
  return JSON.stringify({ v: SAVE_VERSION[key], savedAt, data });
}

/** Run `migrations[from] … migrations[to - 1]` in order; `undefined` when a step is missing. */
export function migrate(data: unknown, from: number, to: number, migrations: TMigrations): unknown {
  let current = data;
  for (let v = from; v < to; v++) {
    const step = migrations[v];
    if (!step) return undefined;
    current = step(current);
  }
  return current;
}

export function decode<K extends TSaveKey>(key: K, raw: string | null): TDecoded<TSaveValues[K]> {
  if (raw === null) return { kind: 'missing' };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { kind: 'invalid' };
  }
  const envelope = ZEnvelopeSchema.safeParse(json);
  if (!envelope.success) return { kind: 'invalid' };
  const { v, savedAt, data } = envelope.data;
  const current = SAVE_VERSION[key];
  if (v > current) return { kind: 'newer' };
  const upgraded = v === current ? data : migrate(data, v, current, MIGRATIONS[key]);
  if (upgraded === undefined) return { kind: 'invalid' };
  const parsed = SCHEMAS[key].safeParse(upgraded);
  if (!parsed.success) return { kind: 'invalid' };
  return { kind: 'ok', data: parsed.data as TSaveValues[K], savedAt };
}

/** Structural equality of two JSON-shaped values; a key holding `undefined` counts as absent. */
export function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = (o: object) => Object.keys(o).filter((k) => (o as Record<string, unknown>)[k] !== undefined);
  const ka = keys(a);
  if (ka.length !== keys(b).length) return false;
  return ka.every((k) => sameData((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
