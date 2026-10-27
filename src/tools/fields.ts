import { z } from 'zod';
import type { QuickBaseClient } from '../quickbase/client.js';
import { UsageError } from '../errors.js';
import { defineTool } from './types.js';
import { fieldId, tableId } from './schemas.js';

/** Quickbase API field types. */
export const NATIVE_FIELD_TYPES = [
  'text',
  'text-multi-line',
  'text-multiple-choice',
  'rich-text',
  'numeric',
  'currency',
  'percent',
  'rating',
  'date',
  'date/time',
  'duration',
  'checkbox',
  'phone',
  'email-address',
  'user',
  'multi-user',
  'url',
  'address',
  'file',
] as const;
type NativeFieldType = (typeof NATIVE_FIELD_TYPES)[number];

/** Names used by the 1.x tools. They keep working and map to the API names. */
const LEGACY_TYPE_MAP = {
  text_choice: 'text-multiple-choice',
  text_multiline: 'text-multi-line',
  richtext: 'rich-text',
  datetime: 'date/time',
  email: 'email-address',
} as const satisfies Record<string, NativeFieldType>;

export const FIELD_TYPE_INPUTS = [...NATIVE_FIELD_TYPES, ...Object.keys(LEGACY_TYPE_MAP), 'formula', 'lookup', 'reference'] as [string, ...string[]];

export interface QbField {
  id: number;
  label: string;
  fieldType: string;
  mode?: string;
  properties?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface FieldInput {
  label: string;
  fieldType: string;
  required?: boolean;
  unique?: boolean;
  choices?: string[];
  formula?: string;
  formulaResultType?: string;
  lookupTableId?: string;
  lookupFieldId?: number;
}

export async function createField(client: QuickBaseClient, tableId: string, input: FieldInput): Promise<QbField> {
  const properties: Record<string, unknown> = {};
  if (input.required !== undefined) properties.required = input.required;
  if (input.unique !== undefined) properties.unique = input.unique;
  if (input.choices) properties.choices = input.choices;

  let fieldType = input.fieldType;
  const body: Record<string, unknown> = { label: input.label };

  if (fieldType === 'reference') {
    throw new UsageError('Reference fields are created together with a relationship. Use quickbase_create_relationship (or quickbase_create_advanced_relationship).');
  }
  if (fieldType === 'formula') {
    if (!input.formula) throw new UsageError('formula is required for formula fields');
    fieldType = input.formulaResultType ?? 'text';
    body.mode = 'formula';
    properties.formula = input.formula;
  } else if (fieldType === 'lookup') {
    throw new UsageError('Lookup fields are created through a relationship. Use quickbase_create_lookup_field.');
  } else if (fieldType in LEGACY_TYPE_MAP) {
    fieldType = LEGACY_TYPE_MAP[fieldType as keyof typeof LEGACY_TYPE_MAP];
  }
  if (input.formula && input.fieldType !== 'formula') {
    throw new UsageError('formula is only valid with fieldType "formula"');
  }
  if (input.choices && fieldType !== 'text-multiple-choice') {
    throw new UsageError('choices are only valid for text-multiple-choice (text_choice) fields');
  }
  body.fieldType = fieldType;
  if (Object.keys(properties).length > 0) body.properties = properties;
  return client.post<QbField>('/fields', body, { query: { tableId } });
}

export const fieldTools = [
  defineTool({
    name: 'quickbase_get_table_fields',
    title: 'List fields',
    description: 'Get all fields of a table (id, label, type, mode, properties).',
    inputSchema: { tableId, includeProperties: z.boolean().default(false).describe('Include full field properties (verbose)') },
    write: false,
    idempotent: true,
    handler: async ({ tableId, includeProperties }, { client }) =>
      client.get('/fields', { tableId, includeFieldPerms: false }).then((fields) =>
        includeProperties ? fields : (fields as QbField[]).map(({ id, label, fieldType, mode }) => ({ id, label, fieldType, mode })),
      ),
  }),
  defineTool({
    name: 'quickbase_create_field',
    title: 'Create field',
    description:
      'Create a field. fieldType accepts Quickbase API names (text, numeric, date/time, email-address, …) and the legacy names text_choice, text_multiline, richtext, datetime, email. ' +
      'Use fieldType "formula" with formula (+ optional formulaResultType). Lookup and reference fields come from the relationship tools.',
    inputSchema: {
      tableId,
      label: z.string().trim().min(1).max(500).describe('Field label'),
      fieldType: z.enum(FIELD_TYPE_INPUTS).describe('Type of field'),
      required: z.boolean().optional(),
      unique: z.boolean().optional(),
      choices: z.array(z.string().min(1)).min(1).optional().describe('Choices for text-multiple-choice fields'),
      formula: z.string().optional().describe('Formula for formula fields'),
      formulaResultType: z.enum(NATIVE_FIELD_TYPES).optional().describe('Result type for formula fields (default text)'),
    },
    write: true,
    handler: async ({ tableId, ...input }, { client }) => createField(client, tableId, input),
  }),
  defineTool({
    name: 'quickbase_update_field',
    title: 'Update field',
    description: 'Update a field’s label, required flag or choices. Choices replace the existing list.',
    inputSchema: {
      tableId,
      fieldId,
      label: z.string().trim().min(1).max(500).optional(),
      required: z.boolean().optional(),
      choices: z.array(z.string().min(1)).optional(),
    },
    write: true,
    idempotent: true,
    handler: async ({ tableId, fieldId, label, required, choices }, { client }) => {
      const properties: Record<string, unknown> = {};
      if (required !== undefined) properties.required = required;
      if (choices) properties.choices = choices;
      const body: Record<string, unknown> = {};
      if (label) body.label = label;
      if (Object.keys(properties).length > 0) body.properties = properties;
      if (Object.keys(body).length === 0) throw new UsageError('Nothing to update. Provide label, required or choices.');
      return client.post(`/fields/${fieldId}`, body, { query: { tableId }, idempotent: true });
    },
  }),
  defineTool({
    name: 'quickbase_delete_field',
    title: 'Delete field',
    description: 'Permanently delete a field and its data. Irreversible. Requires confirm=true.',
    inputSchema: { tableId, fieldId, confirm: z.literal(true).describe('Must be true to confirm the deletion') },
    write: true,
    destructive: true,
    idempotent: true,
    handler: async ({ tableId, fieldId }, { client }) =>
      client.delete('/fields', { query: { tableId }, body: { fieldIds: [fieldId] } }),
  }),
];
