import { z } from 'zod';
import { UsageError } from '../errors.js';
import { clause, anyOf } from '../quickbase/query.js';
import {
  allFieldIds,
  deleteWhere,
  queryRecords,
  upsertInChunks,
  type QueryResponse,
} from '../quickbase/records.js';
import { defineTool } from './types.js';
import { fieldId, fieldIdList, fieldValues, recordId, sortBy, tableId, toQbFields } from './schemas.js';

const SEARCHABLE_TYPES = new Set(['text', 'text-multi-line', 'text-multiple-choice', 'rich-text', 'email-address', 'phone', 'url']);
const MAX_SEARCH_FIELDS = 25;
const MAX_BATCH = 5000;

export const recordTools = [
  defineTool({
    name: 'quickbase_query_records',
    title: 'Query records',
    description:
      'Query records with optional field selection, filter, sorting and paging. Returns {data, fields, metadata}. ' +
      'Filter syntax: {fieldId.OP.value}, e.g. {6.EX.\'Acme\'}AND{7.GT.100}. Omit select to get the table’s default columns.',
    inputSchema: {
      tableId,
      select: fieldIdList.optional().describe('Field IDs to return'),
      where: z.string().max(10_000).optional().describe('Quickbase query filter'),
      sortBy: sortBy.optional(),
      top: z.number().int().min(1).max(10_000).default(100).describe('Max records to return (default 100)'),
      skip: z.number().int().min(0).default(0).describe('Records to skip (paging)'),
    },
    write: false,
    idempotent: true,
    handler: async ({ tableId, ...rest }, { client }) => queryRecords(client, { tableId, ...rest }),
  }),
  defineTool({
    name: 'quickbase_get_record',
    title: 'Get record',
    description: 'Get one record by ID. Returns all fields unless fieldIds is given.',
    inputSchema: { tableId, recordId, fieldIds: fieldIdList.optional().describe('Specific field IDs to retrieve') },
    write: false,
    idempotent: true,
    handler: async ({ tableId, recordId, fieldIds }, { client }) => {
      const select = fieldIds ?? (await allFieldIds(client, tableId));
      const res = await queryRecords(client, { tableId, select, where: clause(3, 'EX', recordId), top: 1 });
      const record = res.data[0];
      if (!record) throw new UsageError(`Record ${recordId} not found in table ${tableId}`);
      return record;
    },
  }),
  defineTool({
    name: 'quickbase_create_record',
    title: 'Create record',
    description: 'Create one record. fields maps field IDs to values, e.g. {"6": "Acme"}.',
    inputSchema: { tableId, fields: fieldValues },
    write: true,
    handler: async ({ tableId, fields }, { client }) => upsertInChunks(client, tableId, [toQbFields(fields)]),
  }),
  defineTool({
    name: 'quickbase_update_record',
    title: 'Update record',
    description: 'Update one record by ID. Only the given fields change.',
    inputSchema: { tableId, recordId, fields: fieldValues },
    write: true,
    idempotent: true,
    handler: async ({ tableId, recordId, fields }, { client }) => {
      if ('3' in fields) throw new UsageError('Field 3 (Record ID) cannot be changed.');
      return upsertInChunks(client, tableId, [{ ...toQbFields(fields), 3: { value: recordId } }]);
    },
  }),
  defineTool({
    name: 'quickbase_delete_record',
    title: 'Delete record',
    description: 'Delete one record by ID.',
    inputSchema: { tableId, recordId },
    write: true,
    destructive: true,
    idempotent: true,
    handler: async ({ tableId, recordId }, { client }) => deleteWhere(client, tableId, clause(3, 'EX', recordId)),
  }),
  defineTool({
    name: 'quickbase_bulk_create_records',
    title: 'Bulk create records',
    description: `Create many records (max ${MAX_BATCH} per call; sent in chunks of 500).`,
    inputSchema: { tableId, records: z.array(z.object({ fields: fieldValues })).min(1).max(MAX_BATCH) },
    write: true,
    handler: async ({ tableId, records }, { client }) =>
      upsertInChunks(client, tableId, records.map((r) => toQbFields(r.fields))),
  }),
  defineTool({
    name: 'quickbase_bulk_update_records',
    title: 'Bulk update records',
    description: `Update many records by ID (max ${MAX_BATCH} per call).`,
    inputSchema: {
      tableId,
      updates: z.array(z.object({ recordId, fields: fieldValues })).min(1).max(MAX_BATCH),
    },
    write: true,
    idempotent: true,
    handler: async ({ tableId, updates }, { client }) =>
      upsertInChunks(
        client,
        tableId,
        updates.map((u) => ({ ...toQbFields(u.fields), 3: { value: u.recordId } })),
      ),
  }),
  defineTool({
    name: 'quickbase_upsert_records',
    title: 'Upsert records',
    description: 'Insert or update records matched on a key field (mergeFieldId). Records may use different key fields; they are grouped per key field.',
    inputSchema: {
      tableId,
      records: z
        .array(z.object({ keyField: fieldId, keyValue: z.unknown(), data: fieldValues }))
        .min(1)
        .max(MAX_BATCH),
    },
    write: true,
    idempotent: true,
    handler: async ({ tableId, records }, { client }) => {
      const groups = new Map<number, Record<string, { value: unknown }>[]>();
      for (const r of records) {
        if (r.keyValue === undefined || r.keyValue === null || r.keyValue === '') {
          throw new UsageError(`keyValue is required for every record (key field ${r.keyField})`);
        }
        const row = { ...toQbFields(r.data), [String(r.keyField)]: { value: r.keyValue } };
        const list = groups.get(r.keyField) ?? [];
        list.push(row);
        groups.set(r.keyField, list);
      }
      const results = [];
      for (const [mergeFieldId, rows] of groups) {
        results.push({ keyField: mergeFieldId, ...(await upsertInChunks(client, tableId, rows, mergeFieldId)) });
      }
      return results.length === 1 ? results[0] : results;
    },
  }),
  defineTool({
    name: 'quickbase_bulk_delete_records',
    title: 'Bulk delete records',
    description: 'Delete all records matching a Quickbase query. where is required (an empty filter is rejected).',
    inputSchema: { tableId, where: z.string().trim().min(1).max(10_000).describe('Query selecting records to delete, e.g. {6.GT.100}') },
    write: true,
    destructive: true,
    idempotent: true,
    handler: async ({ tableId, where }, { client }) => deleteWhere(client, tableId, where),
  }),
  defineTool({
    name: 'quickbase_search_records',
    title: 'Search records',
    description: 'Find records whose text fields contain a term. Searches the given fieldIds, or all text-like fields (max 25) if omitted.',
    inputSchema: {
      tableId,
      searchTerm: z.string().trim().min(1).max(500),
      fieldIds: fieldIdList.optional().describe('Field IDs to search in'),
      top: z.number().int().min(1).max(1000).default(100),
    },
    write: false,
    idempotent: true,
    handler: async ({ tableId, searchTerm, fieldIds, top }, { client }): Promise<QueryResponse> => {
      let targets = fieldIds;
      if (!targets) {
        const fields = await client.get<{ id: number; fieldType: string }[]>('/fields', { tableId });
        targets = fields.filter((f) => SEARCHABLE_TYPES.has(f.fieldType)).map((f) => f.id).slice(0, MAX_SEARCH_FIELDS);
        if (targets.length === 0) throw new UsageError('The table has no text fields to search.');
      }
      const where = anyOf(targets.map((id) => clause(id, 'CT', searchTerm)));
      return queryRecords(client, { tableId, where, top });
    },
  }),
];
