import { z } from 'zod';
import type { QuickBaseClient } from '../quickbase/client.js';
import { UsageError } from '../errors.js';
import { createField, FIELD_TYPE_INPUTS, type QbField } from './fields.js';
import { defineTool } from './types.js';
import { fieldId, tableId } from './schemas.js';

interface Relationship {
  id: number;
  parentTableId: string;
  childTableId: string;
  foreignKeyField: { id: number; label: string; type?: string };
  lookupFields: { id: number; label?: string }[];
  summaryFields: { id: number; label?: string }[];
  isCrossApp?: boolean;
}

async function listRelationships(client: QuickBaseClient, childTableId: string): Promise<Relationship[]> {
  const out: Relationship[] = [];
  let skip = 0;
  for (;;) {
    const page = await client.get<{ relationships: Relationship[]; metadata?: { totalRelationships?: number; numRelationships?: number } }>(
      `/tables/${childTableId}/relationships`,
      skip ? { skip } : undefined,
    );
    out.push(...page.relationships);
    const total = page.metadata?.totalRelationships ?? out.length;
    if (page.relationships.length === 0 || out.length >= total) break;
    skip = out.length;
  }
  return out;
}

/** After lookup fields exist, rename the ones we just created so they carry the requested labels. */
async function relabelLookups(
  client: QuickBaseClient,
  childTableId: string,
  referenceFieldId: number,
  wanted: { parentFieldId: number; label: string }[],
): Promise<{ renamed: number[]; warnings: string[] }> {
  const fields = await client.get<QbField[]>('/fields', { tableId: childTableId });
  const renamed: number[] = [];
  const warnings: string[] = [];
  for (const w of wanted) {
    const match = fields.find(
      (f) =>
        f.mode === 'lookup' &&
        Number(f.properties?.lookupReferenceFieldId) === referenceFieldId &&
        Number(f.properties?.lookupTargetFieldId) === w.parentFieldId,
    );
    if (!match) {
      warnings.push(`Lookup for parent field ${w.parentFieldId} was not found to rename; it keeps its default label.`);
      continue;
    }
    if (match.label !== w.label) await client.post(`/fields/${match.id}`, { label: w.label }, { query: { tableId: childTableId }, idempotent: true });
    renamed.push(match.id);
  }
  return { renamed, warnings };
}

async function createRelationship(
  client: QuickBaseClient,
  p: { parentTableId: string; childTableId: string; label: string; lookupFieldIds?: number[]; summaryFields?: unknown[] },
): Promise<Relationship> {
  const body: Record<string, unknown> = {
    parentTableId: p.parentTableId,
    foreignKeyField: { label: p.label },
  };
  if (p.lookupFieldIds?.length) body.lookupFieldIds = p.lookupFieldIds;
  if (p.summaryFields?.length) body.summaryFields = p.summaryFields;
  return client.post<Relationship>(`/tables/${p.childTableId}/relationship`, body);
}

export const relationshipTools = [
  defineTool({
    name: 'quickbase_create_relationship',
    title: 'Create relationship',
    description:
      'Create a parent-child relationship. Quickbase creates the reference (foreign key) field in the child table for you; ' +
      'name it with foreignKeyFieldLabel and optionally pull parent fields in with lookupFieldIds. ' +
      'Existing fields cannot be converted (foreignKeyFieldId from v1 is no longer supported).',
    inputSchema: {
      parentTableId: tableId,
      childTableId: tableId,
      foreignKeyFieldLabel: z.string().trim().min(1).max(500).optional().describe('Label of the new reference field (default "Related <parent table>")'),
      lookupFieldIds: z.array(fieldId).max(100).optional().describe('Parent field IDs to add as lookup fields in the child table'),
      foreignKeyFieldId: z.number().optional().describe('Removed in v2. Rejected with an explanation.'),
    },
    write: true,
    handler: async ({ parentTableId, childTableId, foreignKeyFieldLabel, lookupFieldIds, foreignKeyFieldId }, { client }) => {
      if (foreignKeyFieldId !== undefined) {
        throw new UsageError(
          'foreignKeyFieldId is no longer supported: the Quickbase API creates the reference field itself. Pass foreignKeyFieldLabel instead.',
        );
      }
      return createRelationship(client, {
        parentTableId,
        childTableId,
        label: foreignKeyFieldLabel ?? `Related ${parentTableId}`,
        lookupFieldIds,
      });
    },
  }),
  defineTool({
    name: 'quickbase_get_relationships',
    title: 'List relationships',
    description: 'List the relationships in which the table is the child (the table holding the reference fields).',
    inputSchema: { tableId },
    write: false,
    idempotent: true,
    handler: async ({ tableId }, { client }) => listRelationships(client, tableId),
  }),
  defineTool({
    name: 'quickbase_create_advanced_relationship',
    title: 'Create relationship with lookups',
    description:
      'Create a one-to-many relationship with a labelled reference field and labelled lookup fields in one step. ' +
      'For many-to-many use quickbase_create_junction_table.',
    inputSchema: {
      parentTableId: tableId,
      childTableId: tableId,
      referenceFieldLabel: z.string().trim().min(1).max(500),
      lookupFields: z
        .array(z.object({ parentFieldId: fieldId, childFieldLabel: z.string().trim().min(1).max(500) }))
        .max(100)
        .optional(),
      relationshipType: z.enum(['one-to-many', 'many-to-many']).default('one-to-many'),
    },
    write: true,
    handler: async ({ parentTableId, childTableId, referenceFieldLabel, lookupFields, relationshipType }, { client }) => {
      if (relationshipType === 'many-to-many') {
        throw new UsageError('many-to-many is not a single relationship in Quickbase. Use quickbase_create_junction_table.');
      }
      const rel = await createRelationship(client, {
        parentTableId,
        childTableId,
        label: referenceFieldLabel,
        lookupFieldIds: lookupFields?.map((l) => l.parentFieldId),
      });
      const relabel = lookupFields?.length
        ? await relabelLookups(client, childTableId, rel.foreignKeyField.id, lookupFields.map((l) => ({ parentFieldId: l.parentFieldId, label: l.childFieldLabel })))
        : { renamed: [], warnings: [] };
      return { relationship: rel, renamedLookupFieldIds: relabel.renamed, warnings: relabel.warnings };
    },
  }),
  defineTool({
    name: 'quickbase_create_lookup_field',
    title: 'Create lookup field',
    description: 'Add a lookup field to the child table that pulls a parent field through an existing reference field.',
    inputSchema: {
      childTableId: tableId,
      parentTableId: tableId,
      referenceFieldId: fieldId.describe('Reference field ID in the child table (the relationship ID)'),
      parentFieldId: fieldId.describe('Field in the parent table to look up'),
      lookupFieldLabel: z.string().trim().min(1).max(500),
    },
    write: true,
    handler: async ({ childTableId, parentTableId, referenceFieldId, parentFieldId, lookupFieldLabel }, { client }) => {
      const rels = await listRelationships(client, childTableId);
      const rel = rels.find((r) => r.id === referenceFieldId && r.parentTableId === parentTableId);
      if (!rel) throw new UsageError(`No relationship from ${childTableId} to ${parentTableId} uses reference field ${referenceFieldId}.`);
      const updated = await client.post<Relationship>(
        `/tables/${childTableId}/relationship/${referenceFieldId}`,
        { lookupFieldIds: [parentFieldId] },
        { idempotent: true },
      );
      const relabel = await relabelLookups(client, childTableId, referenceFieldId, [{ parentFieldId, label: lookupFieldLabel }]);
      return { relationship: updated, renamedLookupFieldIds: relabel.renamed, warnings: relabel.warnings };
    },
  }),
  defineTool({
    name: 'quickbase_validate_relationship',
    title: 'Validate relationship',
    description: 'Check that a reference field exists in the child table and points at the given parent table.',
    inputSchema: {
      parentTableId: tableId,
      childTableId: tableId,
      foreignKeyFieldId: fieldId.describe('Reference field ID in the child table'),
    },
    write: false,
    idempotent: true,
    handler: async ({ parentTableId, childTableId, foreignKeyFieldId }, { client }) => {
      const checks: { check: string; ok: boolean; detail?: string }[] = [];
      const fields = await client.get<QbField[]>('/fields', { tableId: childTableId });
      const field = fields.find((f) => f.id === foreignKeyFieldId);
      checks.push({ check: 'field exists in child table', ok: Boolean(field) });
      const rels = await listRelationships(client, childTableId);
      const rel = rels.find((r) => r.id === foreignKeyFieldId);
      checks.push({ check: 'field is a relationship reference', ok: Boolean(rel) });
      if (rel) {
        checks.push({
          check: 'relationship points to parent table',
          ok: rel.parentTableId === parentTableId,
          detail: rel.parentTableId === parentTableId ? undefined : `parent is ${rel.parentTableId}`,
        });
      }
      return { valid: checks.every((c) => c.ok), checks };
    },
  }),
  defineTool({
    name: 'quickbase_get_relationship_details',
    title: 'Relationship details',
    description: 'List relationships of a table with their lookup fields resolved (labels and types) when includeFields is true.',
    inputSchema: { tableId, includeFields: z.boolean().default(true) },
    write: false,
    idempotent: true,
    handler: async ({ tableId, includeFields }, { client }) => {
      const rels = await listRelationships(client, tableId);
      if (!includeFields) return rels;
      const fields = await client.get<QbField[]>('/fields', { tableId });
      return rels.map((r) => ({
        ...r,
        lookupFieldDetails: fields
          .filter((f) => f.mode === 'lookup' && Number(f.properties?.lookupReferenceFieldId) === r.id)
          .map(({ id, label, fieldType, properties }) => ({ id, label, fieldType, lookupTargetFieldId: properties?.lookupTargetFieldId })),
      }));
    },
  }),
  defineTool({
    name: 'quickbase_create_junction_table',
    title: 'Create junction table',
    description: 'Create a junction table for a many-to-many relationship: a new table with a reference field to each of two tables.',
    inputSchema: {
      appId: z.string().trim().optional().describe('App ID. Defaults to QB_APP_ID'),
      junctionTableName: z.string().trim().min(1).max(100),
      table1Id: tableId,
      table2Id: tableId,
      table1FieldLabel: z.string().trim().min(1).max(500),
      table2FieldLabel: z.string().trim().min(1).max(500),
      additionalFields: z
        .array(z.object({ label: z.string().trim().min(1), fieldType: z.enum(FIELD_TYPE_INPUTS).default('text') }))
        .max(50)
        .optional(),
    },
    write: true,
    handler: async (args, { client, config }) => {
      const appId = args.appId ?? config.appId;
      if (!appId) throw new UsageError('No app ID. Pass appId or set QB_APP_ID.');
      if (args.table1Id === args.table2Id) throw new UsageError('table1Id and table2Id must differ.');
      const table = await client.post<{ id: string }>('/tables', { name: args.junctionTableName }, { query: { appId } });
      const rel1 = await createRelationship(client, { parentTableId: args.table1Id, childTableId: table.id, label: args.table1FieldLabel });
      const rel2 = await createRelationship(client, { parentTableId: args.table2Id, childTableId: table.id, label: args.table2FieldLabel });
      const extra: QbField[] = [];
      for (const f of args.additionalFields ?? []) extra.push(await createField(client, table.id, f));
      return {
        junctionTableId: table.id,
        reference1FieldId: rel1.foreignKeyField.id,
        reference2FieldId: rel2.foreignKeyField.id,
        additionalFieldIds: extra.map((f) => f.id),
      };
    },
  }),
];
