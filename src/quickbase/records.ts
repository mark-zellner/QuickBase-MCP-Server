import type { QuickBaseClient } from './client.js';
import { allOf, anyOf, clause, recordIdsClause } from './query.js';
import { UsageError } from '../errors.js';

export interface QueryResponse {
  data: Record<string, { value: unknown }>[];
  fields?: { id: number; label: string; type: string }[];
  metadata: { numFields?: number; numRecords?: number; skip?: number; top?: number; totalRecords?: number };
}

export interface UpsertMetadata {
  createdRecordIds: number[];
  updatedRecordIds: number[];
  unchangedRecordIds: number[];
  totalNumberOfRecordsProcessed: number;
  lineErrors?: Record<string, string[]>;
}
export interface UpsertResponse {
  data?: Record<string, { value: unknown }>[];
  metadata: UpsertMetadata;
}

export interface QueryParams {
  tableId: string;
  select?: number[];
  where?: string;
  sortBy?: { fieldId: number; order: 'ASC' | 'DESC' }[];
  groupBy?: { fieldId: number; grouping: 'equal-values' }[];
  top?: number;
  skip?: number;
}

export const UPSERT_CHUNK_SIZE = 500;

export function queryRecords(client: QuickBaseClient, p: QueryParams): Promise<QueryResponse> {
  const body: Record<string, unknown> = { from: p.tableId };
  if (p.select?.length) body.select = p.select;
  if (p.where) body.where = p.where;
  if (p.sortBy?.length) body.sortBy = p.sortBy;
  if (p.groupBy?.length) body.groupBy = p.groupBy;
  if (p.top !== undefined || p.skip !== undefined) body.options = { top: p.top, skip: p.skip };
  // records/query only reads, so it is safe to retry.
  return client.post<QueryResponse>('/records/query', body, { idempotent: true });
}

export async function allFieldIds(client: QuickBaseClient, tableId: string): Promise<number[]> {
  const fields = await client.get<{ id: number }[]>('/fields', { tableId });
  return fields.map((f) => f.id);
}

export interface BulkResult {
  createdRecordIds: number[];
  updatedRecordIds: number[];
  unchangedRecordIds: number[];
  totalNumberOfRecordsProcessed: number;
  lineErrors: Record<string, string[]>;
  /** Present when a later chunk failed after earlier chunks were already written. */
  partialFailure?: { processedBeforeFailure: number; error: string };
}

/**
 * Writes records in chunks. Chunks are sequential and not retried on 5xx (POST is not idempotent),
 * so if one fails we report exactly how many records were already written.
 */
export async function upsertInChunks(
  client: QuickBaseClient,
  tableId: string,
  data: Record<string, { value: unknown }>[],
  mergeFieldId?: number,
): Promise<BulkResult> {
  const result: BulkResult = {
    createdRecordIds: [],
    updatedRecordIds: [],
    unchangedRecordIds: [],
    totalNumberOfRecordsProcessed: 0,
    lineErrors: {},
  };
  for (let i = 0; i < data.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = data.slice(i, i + UPSERT_CHUNK_SIZE);
    const body: Record<string, unknown> = { to: tableId, data: chunk, fieldsToReturn: [3] };
    if (mergeFieldId !== undefined) body.mergeFieldId = mergeFieldId;
    try {
      const res = await client.post<UpsertResponse>('/records', body);
      const m = res.metadata;
      result.createdRecordIds.push(...(m.createdRecordIds ?? []));
      result.updatedRecordIds.push(...(m.updatedRecordIds ?? []));
      result.unchangedRecordIds.push(...(m.unchangedRecordIds ?? []));
      result.totalNumberOfRecordsProcessed += m.totalNumberOfRecordsProcessed ?? chunk.length;
      for (const [line, errs] of Object.entries(m.lineErrors ?? {})) result.lineErrors[String(Number(line) + i)] = errs;
    } catch (error) {
      if (i === 0) throw error;
      result.partialFailure = { processedBeforeFailure: i, error: error instanceof Error ? error.message : String(error) };
      break;
    }
  }
  return result;
}

export async function deleteWhere(client: QuickBaseClient, tableId: string, where: string): Promise<{ numberDeleted: number }> {
  if (!where.trim()) throw new UsageError('A non-empty where clause is required to delete records.');
  return client.delete<{ numberDeleted: number }>('/records', { body: { from: tableId, where }, idempotent: true });
}

export { allOf, anyOf, clause, recordIdsClause };
