import { z } from 'zod';
import { UsageError } from '../errors.js';

/** Quickbase table/app ids (DBIDs) are short lowercase alphanumeric strings, e.g. `bqx7abc12`. */
export const dbid = (what = 'Table ID') =>
  z
    .string()
    .trim()
    .regex(/^[a-z0-9]{3,}$/i, `${what} must be alphanumeric, e.g. "bqx7abc12"`)
    .describe(`${what} (DBID)`);

export const tableId = dbid('Table ID');
export const fieldId = z.number().int().positive().describe('Field ID');
export const recordId = z.number().int().positive().describe('Record ID (field 3)');

export const fieldIdList = z.array(fieldId).min(1).max(500);

/**
 * Field values. Accepts `{ "6": { "value": "x" } }` (Quickbase format) or the shorthand `{ "6": "x" }`.
 * Keys must be numeric field IDs.
 */
export const fieldValues = z
  .record(z.string().regex(/^\d+$/, 'Keys must be numeric field IDs'), z.unknown())
  .refine((v) => Object.keys(v).length > 0, 'At least one field is required')
  .describe('Map of fieldId to value, e.g. {"6": "Acme", "7": {"value": 42}}');

export type FieldValues = z.infer<typeof fieldValues>;

function isWrapped(v: unknown): v is { value: unknown } {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.keys(v).length === 1 && 'value' in v;
}

/** Normalises shorthand values into Quickbase's `{ "id": { "value": … } }` shape. */
export function toQbFields(values: FieldValues): Record<string, { value: unknown }> {
  const out: Record<string, { value: unknown }> = {};
  for (const [k, v] of Object.entries(values)) out[k] = isWrapped(v) ? { value: v.value } : { value: v };
  return out;
}

export const sortBy = z
  .array(z.object({ fieldId, order: z.enum(['ASC', 'DESC']).default('ASC') }))
  .max(20)
  .describe('Sort criteria');

export const appIdOptional = z.string().trim().regex(/^[a-z0-9]{3,}$/i).optional().describe('App ID (DBID). Defaults to QB_APP_ID');

export function requireApp(appId: string | undefined, fallback: string | undefined): string {
  const id = appId ?? fallback;
  if (!id) throw new UsageError('No app ID. Pass appId or set QB_APP_ID.');
  return id;
}

export function requireTable(provided: string | undefined, fallback: string | undefined, envName: string): string {
  const id = provided ?? fallback;
  if (!id) throw new UsageError(`No table ID. Pass tableId or set ${envName}.`);
  return id;
}
