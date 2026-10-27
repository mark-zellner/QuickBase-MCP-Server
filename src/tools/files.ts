import { z } from 'zod';
import type { QuickBaseClient } from '../quickbase/client.js';
import { UsageError } from '../errors.js';
import { clause } from '../quickbase/query.js';
import { queryRecords, upsertInChunks } from '../quickbase/records.js';
import { defineTool } from './types.js';
import { fieldId, recordId, tableId } from './schemas.js';

interface FileVersion {
  versionNumber: number;
  fileName?: string;
  uploaded?: string;
  creator?: unknown;
}

const MAX_DOWNLOAD_CHARS = 8_000_000; // base64 characters (~6 MB of file)

async function listVersions(client: QuickBaseClient, table: string, record: number, field: number): Promise<FileVersion[]> {
  const res = await queryRecords(client, { tableId: table, select: [field], where: clause(3, 'EX', record), top: 1 });
  const row = res.data[0];
  if (!row) throw new UsageError(`Record ${record} not found in table ${table}`);
  const value = row[String(field)]?.value as { versions?: FileVersion[] } | undefined;
  return value?.versions ?? [];
}

export const fileTools = [
  defineTool({
    name: 'quickbase_list_files',
    title: 'List file versions',
    description: 'List all stored versions of the file in a file-attachment field of a record.',
    inputSchema: { tableId, recordId, fieldId },
    write: false,
    idempotent: true,
    handler: async ({ tableId, recordId, fieldId }, { client }) => listVersions(client, tableId, recordId, fieldId),
  }),
  defineTool({
    name: 'quickbase_download_file',
    title: 'Download file',
    description: 'Download a file as base64. Without versionNumber the latest version is used. Files above ~6 MB are refused.',
    inputSchema: { tableId, recordId, fieldId, versionNumber: z.number().int().positive().optional() },
    write: false,
    idempotent: true,
    handler: async ({ tableId, recordId, fieldId, versionNumber }, { client }) => {
      let version = versionNumber;
      let fileName: string | undefined;
      if (version === undefined) {
        const versions = await listVersions(client, tableId, recordId, fieldId);
        const latest = versions.reduce<FileVersion | undefined>((a, v) => (!a || v.versionNumber > a.versionNumber ? v : a), undefined);
        if (!latest) throw new UsageError('The field holds no file.');
        version = latest.versionNumber;
        fileName = latest.fileName;
      }
      const data = await client.get<string>(`/files/${tableId}/${recordId}/${fieldId}/${version}`);
      if (typeof data !== 'string') throw new UsageError('Unexpected response while downloading the file.');
      if (data.length > MAX_DOWNLOAD_CHARS) throw new UsageError('File is too large to return through MCP (limit ~6 MB).');
      return { fileName, versionNumber: version, encoding: 'base64', data };
    },
  }),
  defineTool({
    name: 'quickbase_upload_file',
    title: 'Upload file',
    description: 'Upload a base64-encoded file into a file-attachment field of an existing record (adds a new version).',
    inputSchema: {
      tableId,
      recordId,
      fieldId,
      fileName: z.string().trim().min(1).max(255),
      fileData: z.string().min(1).regex(/^[A-Za-z0-9+/=\s]+$/, 'fileData must be base64').describe('Base64 encoded file data'),
    },
    write: true,
    handler: async ({ tableId, recordId, fieldId, fileName, fileData }, { client }) =>
      upsertInChunks(client, tableId, [
        { 3: { value: recordId }, [String(fieldId)]: { value: { fileName, data: fileData.replace(/\s+/g, '') } } },
      ]),
  }),
  defineTool({
    name: 'quickbase_delete_file',
    title: 'Delete file version',
    description: 'Delete one version of a file in a file-attachment field.',
    inputSchema: { tableId, recordId, fieldId, versionNumber: z.number().int().positive() },
    write: true,
    destructive: true,
    idempotent: true,
    handler: async ({ tableId, recordId, fieldId, versionNumber }, { client }) =>
      client.delete(`/files/${tableId}/${recordId}/${fieldId}/${versionNumber}`),
  }),
];
