import { z } from 'zod';
import { UsageError } from '../errors.js';
import {
  CP,
  VER,
  createCodepage,
  exportCodepage,
  findCodepages,
  getCodepageRow,
  parseImport,
  updateCodepage,
  validateCode,
} from '../quickbase/codepages.js';
import { clause } from '../quickbase/query.js';
import { queryRecords, upsertInChunks } from '../quickbase/records.js';
import { defineTool } from './types.js';
import { dbid, fieldValues, recordId, requireTable } from './schemas.js';

/**
 * "Codepages" stored as records (name, code, version, tags, …) in a table you own.
 * Not to be confused with Quickbase code pages (see pages.ts). Field IDs are in quickbase/codepages.ts.
 */
const cpTable = dbid('Table where codepages are stored. Defaults to CODEPAGE_TABLE_ID').optional();
const versionTable = dbid('Table where codepage versions are stored. Defaults to CODEPAGE_VERSION_TABLE_ID').optional();

const metaShape = {
  description: z.string().optional(),
  version: z.string().max(50).optional(),
  tags: z.array(z.string().min(1)).optional(),
  dependencies: z.array(z.string().min(1)).optional().describe('External dependencies (CDN links)'),
  targetTableId: dbid('Target table this codepage works with').optional(),
};

export const codepageTools = [
  defineTool({
    name: 'quickbase_save_codepage',
    title: 'Save codepage',
    description: 'Save a codepage (name + code) as a new record in the codepage table.',
    inputSchema: { tableId: cpTable, name: z.string().trim().min(1).max(255), code: z.string().min(1), description: z.string().optional() },
    write: true,
    handler: async ({ tableId, ...input }, { client, config }) => ({
      recordId: await createCodepage(client, requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), input),
    }),
  }),
  defineTool({
    name: 'quickbase_deploy_codepage',
    title: 'Deploy codepage with metadata',
    description: 'Save a codepage with metadata (version, tags, dependencies, target table). Marked active.',
    inputSchema: { tableId: cpTable, name: z.string().trim().min(1).max(255), code: z.string().min(1), ...metaShape },
    write: true,
    handler: async ({ tableId, ...input }, { client, config }) => ({
      recordId: await createCodepage(client, requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), input),
    }),
  }),
  defineTool({
    name: 'quickbase_get_codepage',
    title: 'Get codepage',
    description: 'Get a codepage record (parsed: name, code, version, tags, …).',
    inputSchema: { tableId: cpTable, recordId },
    write: false,
    idempotent: true,
    handler: async ({ tableId, recordId }, { client, config }) =>
      getCodepageRow(client, requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), recordId),
  }),
  defineTool({
    name: 'quickbase_list_codepages',
    title: 'List codepages',
    description: 'List codepages. Code bodies are omitted unless includeCode is true.',
    inputSchema: {
      tableId: cpTable,
      limit: z.number().int().min(1).max(1000).default(100),
      includeCode: z.boolean().default(false),
    },
    write: false,
    idempotent: true,
    handler: async ({ tableId, limit, includeCode }, { client, config }) =>
      findCodepages(client, { tableId: requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), limit, includeCode }),
  }),
  defineTool({
    name: 'quickbase_search_codepages',
    title: 'Search codepages',
    description: 'Search codepages by name/description text, tags, target table or active status.',
    inputSchema: {
      tableId: cpTable,
      searchTerm: z.string().trim().min(1).optional(),
      tags: z.array(z.string().min(1)).optional(),
      targetTableId: dbid('Target table').optional(),
      activeOnly: z.boolean().default(true),
      includeCode: z.boolean().default(false),
    },
    write: false,
    idempotent: true,
    handler: async ({ tableId, ...rest }, { client, config }) =>
      findCodepages(client, { tableId: requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), ...rest }),
  }),
  defineTool({
    name: 'quickbase_update_codepage',
    title: 'Update codepage',
    description: 'Update a codepage’s code, description, version or active flag.',
    inputSchema: {
      tableId: cpTable,
      recordId,
      code: z.string().optional(),
      description: z.string().optional(),
      version: z.string().max(50).optional(),
      active: z.boolean().optional(),
    },
    write: true,
    idempotent: true,
    handler: async ({ tableId, recordId, ...input }, { client, config }) => {
      await updateCodepage(client, requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), recordId, input);
      return { ok: true, recordId };
    },
  }),
  defineTool({
    name: 'quickbase_clone_codepage',
    title: 'Clone codepage',
    description: 'Clone a codepage under a new name. modifications maps codepage field IDs to new values.',
    inputSchema: { tableId: cpTable, sourceRecordId: recordId, newName: z.string().trim().min(1).max(255), modifications: fieldValues.optional() },
    write: true,
    handler: async ({ tableId, sourceRecordId, newName, modifications }, { client, config }) => {
      const table = requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID');
      const src = await getCodepageRow(client, table, sourceRecordId);
      const id = await createCodepage(client, table, {
        name: newName,
        code: src.code ?? '',
        description: src.description ?? `Cloned from ${src.name ?? sourceRecordId}`,
        version: src.version ?? '1.0.0',
        tags: src.tags,
        dependencies: src.dependencies,
        targetTableId: src.targetTableId,
      });
      if (modifications) {
        const patch: Record<string, { value: unknown }> = {};
        for (const [k, v] of Object.entries(modifications)) patch[k] = { value: v };
        await upsertInChunks(client, table, [{ ...patch, 3: { value: id } }]);
      }
      return { recordId: id };
    },
  }),
  defineTool({
    name: 'quickbase_validate_codepage',
    title: 'Validate codepage',
    description: 'Static checks on HTML/JS: tag balance, <script> syntax (compiled, never executed), Quickbase API usage and security smells. No network.',
    inputSchema: {
      code: z.string().min(1),
      checkSyntax: z.boolean().default(true),
      checkAPIs: z.boolean().default(true),
      checkSecurity: z.boolean().default(true),
    },
    write: false,
    idempotent: true,
    handler: async ({ code, ...opts }) => validateCode(code, opts),
  }),
  defineTool({
    name: 'quickbase_export_codepage',
    title: 'Export codepage',
    description: 'Export a codepage as html (code only), json (all fields) or markdown.',
    inputSchema: { tableId: cpTable, recordId, format: z.enum(['html', 'json', 'markdown']).default('html') },
    write: false,
    idempotent: true,
    handler: async ({ tableId, recordId, format }, { client, config }) =>
      exportCodepage(await getCodepageRow(client, requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), recordId), format),
  }),
  defineTool({
    name: 'quickbase_import_codepage',
    title: 'Import codepage',
    description: 'Import a codepage from an HTML document or a JSON export. With overwrite=true an existing codepage of the same name is updated instead of rejected.',
    inputSchema: {
      tableId: cpTable,
      source: z.string().min(1).describe('HTML or JSON text'),
      format: z.enum(['html', 'json', 'auto']).default('auto'),
      overwrite: z.boolean().default(false),
    },
    write: true,
    handler: async ({ tableId, source, format, overwrite }, { client, config }) => {
      const table = requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID');
      const data = parseImport(source, format);
      const existing = await queryRecords(client, { tableId: table, select: [3], where: clause(CP.name, 'EX', data.name), top: 1 });
      const existingId = existing.data[0]?.['3']?.value;
      if (typeof existingId === 'number') {
        if (!overwrite) throw new UsageError(`A codepage named "${data.name}" already exists (record ${existingId}). Use overwrite=true to replace it.`);
        await updateCodepage(client, table, existingId, data);
        return { recordId: existingId, action: 'updated' };
      }
      return { recordId: await createCodepage(client, table, data), action: 'created' };
    },
  }),
  defineTool({
    name: 'quickbase_execute_codepage',
    title: 'Describe codepage execution',
    description: 'Does NOT execute anything. Returns the codepage source with the requested function name and parameters so the caller can run it in their own sandbox.',
    inputSchema: {
      tableId: cpTable,
      recordId,
      functionName: z.string().trim().min(1).max(200),
      parameters: z.record(z.string(), z.unknown()).optional(),
    },
    write: false,
    idempotent: true,
    handler: async ({ tableId, recordId, functionName, parameters }, { client, config }) => {
      const cp = await getCodepageRow(client, requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID'), recordId);
      if (!cp.code) throw new UsageError('Codepage does not contain code.');
      return { executed: false, functionName, parameters, code: cp.code, note: 'Code execution is intentionally not implemented.' };
    },
  }),
  defineTool({
    name: 'quickbase_save_codepage_version',
    title: 'Save codepage version',
    description: 'Store a version snapshot of a codepage in the version table (fields: 6 codepage record ID, 7 version, 8 code, 9 change log).',
    inputSchema: {
      tableId: versionTable,
      codepageRecordId: recordId,
      version: z.string().trim().min(1).max(50),
      code: z.string().min(1),
      changeLog: z.string().optional(),
    },
    write: true,
    handler: async ({ tableId, codepageRecordId, version, code, changeLog }, { client, config }) => {
      const table = requireTable(tableId, config.codepageVersionTableId, 'CODEPAGE_VERSION_TABLE_ID');
      const row: Record<string, { value: unknown }> = {
        [VER.codepageRecordId]: { value: codepageRecordId },
        [VER.version]: { value: version },
        [VER.code]: { value: code },
      };
      if (changeLog) row[VER.changeLog] = { value: changeLog };
      const res = await upsertInChunks(client, table, [row]);
      return { recordId: res.createdRecordIds[0] };
    },
  }),
  defineTool({
    name: 'quickbase_get_codepage_versions',
    title: 'List codepage versions',
    description: 'Version history of a codepage, newest first.',
    inputSchema: { tableId: versionTable, codepageRecordId: recordId, limit: z.number().int().min(1).max(500).default(50) },
    write: false,
    idempotent: true,
    handler: async ({ tableId, codepageRecordId, limit }, { client, config }) => {
      const table = requireTable(tableId, config.codepageVersionTableId, 'CODEPAGE_VERSION_TABLE_ID');
      return queryRecords(client, {
        tableId: table,
        select: [3, VER.created, VER.version, VER.changeLog, VER.code],
        where: clause(VER.codepageRecordId, 'EX', codepageRecordId),
        sortBy: [{ fieldId: VER.created, order: 'DESC' }],
        top: limit,
      });
    },
  }),
  defineTool({
    name: 'quickbase_rollback_codepage',
    title: 'Roll back codepage',
    description:
      'Restore a codepage’s code from a version record. tableId is the codepage table; the version record is read from versionTableId (default CODEPAGE_VERSION_TABLE_ID). The version becomes "<version>-rollback".',
    inputSchema: { tableId: cpTable, versionTableId: versionTable, codepageRecordId: recordId, versionRecordId: recordId },
    write: true,
    handler: async ({ tableId, versionTableId, codepageRecordId, versionRecordId }, { client, config }) => {
      const table = requireTable(tableId, config.codepageTableId, 'CODEPAGE_TABLE_ID');
      const vTable = requireTable(versionTableId, config.codepageVersionTableId, 'CODEPAGE_VERSION_TABLE_ID');
      const res = await queryRecords(client, { tableId: vTable, select: [3, VER.version, VER.code], where: clause(3, 'EX', versionRecordId), top: 1 });
      const row = res.data[0];
      if (!row) throw new UsageError(`Version record ${versionRecordId} not found in table ${vTable}`);
      const code = row[String(VER.code)]?.value;
      const version = row[String(VER.version)]?.value;
      if (typeof code !== 'string' || !code) throw new UsageError('Version record does not contain a code snapshot.');
      await updateCodepage(client, table, codepageRecordId, { code, version: `${typeof version === 'string' ? version : 'unknown'}-rollback` });
      return { ok: true, codepageRecordId, restoredFromVersionRecord: versionRecordId };
    },
  }),
];
