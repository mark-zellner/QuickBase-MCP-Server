import { afterEach, describe, expect, it } from 'vitest';
import { allTools } from '../../src/tools/index.js';
import { connect, json, mockFetch, testConfig, TEST_TOKEN, type Recorded } from '../helpers.js';

let close: (() => Promise<void>) | undefined;
afterEach(async () => {
  await close?.();
  close = undefined;
});

async function setup(handler: (r: Recorded) => Response | undefined, cfg = testConfig()) {
  const m = mockFetch(handler);
  const c = await connect(cfg, m.fetch);
  close = c.close;
  return { ...c, calls: m.calls };
}

const LEGACY_NAMES = [
  'quickbase_get_app_info', 'quickbase_get_tables', 'quickbase_test_connection', 'quickbase_create_table', 'quickbase_get_table_info',
  'quickbase_delete_table', 'quickbase_get_table_fields', 'quickbase_create_field', 'quickbase_update_field', 'quickbase_delete_field',
  'quickbase_query_records', 'quickbase_get_record', 'quickbase_create_record', 'quickbase_update_record', 'quickbase_delete_record',
  'quickbase_bulk_create_records', 'quickbase_search_records', 'quickbase_create_relationship', 'quickbase_get_relationships',
  'quickbase_get_reports', 'quickbase_run_report', 'quickbase_create_advanced_relationship', 'quickbase_create_lookup_field',
  'quickbase_validate_relationship', 'quickbase_get_relationship_details', 'quickbase_create_junction_table', 'quickbase_save_codepage',
  'quickbase_get_codepage', 'quickbase_list_codepages', 'quickbase_execute_codepage', 'quickbase_deploy_codepage', 'quickbase_update_codepage',
  'quickbase_search_codepages', 'quickbase_clone_codepage', 'quickbase_validate_codepage', 'quickbase_export_codepage',
  'quickbase_import_codepage', 'quickbase_save_codepage_version', 'quickbase_get_codepage_versions', 'quickbase_rollback_codepage',
  'quickbase_initiate_oauth', 'quickbase_upload_file', 'quickbase_download_file', 'quickbase_delete_file', 'quickbase_list_files',
  'quickbase_upsert_records', 'quickbase_bulk_update_records', 'quickbase_bulk_delete_records', 'deploy_codepage', 'get_codepage',
];

describe('tool registry', () => {
  it('keeps every v1 tool name and has no duplicates', () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of LEGACY_NAMES) expect(names, n).toContain(n);
  });

  it('lists tools over MCP with schemas and annotations', async () => {
    const { mcp } = await setup(() => undefined);
    const { tools } = await mcp.listTools();
    expect(tools.length).toBe(allTools.length);
    const q = tools.find((t) => t.name === 'quickbase_query_records')!;
    expect(q.annotations?.readOnlyHint).toBe(true);
    expect(q.inputSchema.required).toContain('tableId');
    const del = tools.find((t) => t.name === 'quickbase_delete_record')!;
    expect(del.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });

  it('read-only mode hides every write tool', async () => {
    const { mcp } = await setup(() => undefined, testConfig({ readOnly: true }));
    const { tools } = await mcp.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain('quickbase_query_records');
    for (const hidden of ['quickbase_create_record', 'quickbase_delete_table', 'quickbase_upsert_records', 'deploy_codepage']) {
      expect(names).not.toContain(hidden);
    }
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
  });
});

describe('input validation (never crashes)', () => {
  it('rejects bad arguments without calling Quickbase', async () => {
    const { call, calls } = await setup(() => undefined);
    for (const args of [{}, { tableId: 123 }, { tableId: '../etc' }, { tableId: 'bqx12345', top: -5 }, { tableId: 'bqx12345', select: 'nope' }]) {
      const r = await call('quickbase_query_records', args);
      expect(r.isError).toBe(true);
    }
    expect(calls).toHaveLength(0);
  });

  it('survives unknown tools and null arguments', async () => {
    const { call, mcp } = await setup(() => undefined);
    await expect(mcp.callTool({ name: 'nope', arguments: {} })).resolves.toMatchObject({ isError: true });
    expect((await call('quickbase_get_app_info', { appId: 'x' })).isError).toBe(true);
  });

  it('requires confirm for destructive schema changes', async () => {
    const { call, calls } = await setup(() => undefined);
    expect((await call('quickbase_delete_table', { tableId: 'bqx12345' })).isError).toBe(true);
    expect((await call('quickbase_delete_field', { tableId: 'bqx12345', fieldId: 9 })).isError).toBe(true);
    expect(calls).toHaveLength(0);
  });
});

describe('records', () => {
  it('queries with select/where/sort/paging', async () => {
    const { call, calls } = await setup((r) => (r.url.pathname === '/v1/records/query' ? json({ data: [{ 3: { value: 1 } }], metadata: { numRecords: 1 } }) : undefined));
    const r = await call('quickbase_query_records', { tableId: 'bqx12345', select: [3, 6], where: "{6.EX.'a'}", sortBy: [{ fieldId: 6 }], top: 10, skip: 5 });
    expect(r.isError).toBe(false);
    expect(calls[0]!.body).toEqual({
      from: 'bqx12345',
      select: [3, 6],
      where: "{6.EX.'a'}",
      sortBy: [{ fieldId: 6, order: 'ASC' }],
      options: { top: 10, skip: 5 },
    });
    expect((r.data as { data: unknown[] }).data).toHaveLength(1);
  });

  it('create_record accepts shorthand and wrapped values', async () => {
    const { call, calls } = await setup(() => json({ metadata: { createdRecordIds: [77], updatedRecordIds: [], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 1 } }));
    const r = await call('quickbase_create_record', { tableId: 'bqx12345', fields: { 6: 'Acme', 7: { value: 42 }, 8: [1, 2] } });
    expect(calls[0]!.body).toMatchObject({ to: 'bqx12345', data: [{ 6: { value: 'Acme' }, 7: { value: 42 }, 8: { value: [1, 2] } }] });
    expect((r.data as { createdRecordIds: number[] }).createdRecordIds).toEqual([77]);
  });

  it('rejects non-numeric field keys', async () => {
    const { call, calls } = await setup(() => undefined);
    expect((await call('quickbase_create_record', { tableId: 'bqx12345', fields: { name: 'x' } })).isError).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('update_record sets field 3 and forbids changing it', async () => {
    const { call, calls } = await setup(() => json({ metadata: { createdRecordIds: [], updatedRecordIds: [5], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 1 } }));
    await call('quickbase_update_record', { tableId: 'bqx12345', recordId: 5, fields: { 6: 'x' } });
    expect(calls[0]!.body).toMatchObject({ data: [{ 3: { value: 5 }, 6: { value: 'x' } }] });
    expect((await call('quickbase_update_record', { tableId: 'bqx12345', recordId: 5, fields: { 3: 9 } })).isError).toBe(true);
  });

  it('get_record selects all fields and reports a missing record', async () => {
    const { call, calls } = await setup((r) => {
      if (r.url.pathname === '/v1/fields') return json([{ id: 3 }, { id: 6 }]);
      if (r.url.pathname === '/v1/records/query') return json({ data: [], metadata: {} });
      return undefined;
    });
    const r = await call('quickbase_get_record', { tableId: 'bqx12345', recordId: 99 });
    expect(r.isError).toBe(true);
    expect(r.text).toContain('not found');
    expect(calls[1]!.body).toMatchObject({ select: [3, 6], where: '{3.EX.99}' });
  });

  it('delete_record and bulk delete use a where clause; empty where is refused', async () => {
    const { call, calls } = await setup(() => json({ numberDeleted: 2 }));
    await call('quickbase_delete_record', { tableId: 'bqx12345', recordId: 4 });
    expect(calls[0]).toMatchObject({ method: 'DELETE', body: { from: 'bqx12345', where: '{3.EX.4}' } });
    expect((await call('quickbase_bulk_delete_records', { tableId: 'bqx12345', where: '  ' })).isError).toBe(true);
    const ok = await call('quickbase_bulk_delete_records', { tableId: 'bqx12345', where: '{6.GT.100}' });
    expect((ok.data as { numberDeleted: number }).numberDeleted).toBe(2);
  });

  it('bulk create sends 500-record chunks and merges results', async () => {
    let id = 0;
    const { call, calls } = await setup((r) => {
      const n = (r.body as { data: unknown[] }).data.length;
      const ids = Array.from({ length: n }, () => ++id);
      return json({ metadata: { createdRecordIds: ids, updatedRecordIds: [], unchangedRecordIds: [], totalNumberOfRecordsProcessed: n } });
    });
    const records = Array.from({ length: 1200 }, (_, i) => ({ fields: { 6: `r${i}` } }));
    const r = await call('quickbase_bulk_create_records', { tableId: 'bqx12345', records });
    expect(calls.map((c) => (c.body as { data: unknown[] }).data.length)).toEqual([500, 500, 200]);
    expect((r.data as { createdRecordIds: number[] }).createdRecordIds).toHaveLength(1200);
  });

  it('bulk create reports partial failure explicitly instead of hiding written records', async () => {
    let n = 0;
    const { call } = await setup(() =>
      ++n === 1
        ? json({ metadata: { createdRecordIds: [1], updatedRecordIds: [], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 500 } })
        : json({ message: 'down' }, 500),
    );
    const records = Array.from({ length: 700 }, (_, i) => ({ fields: { 6: `r${i}` } }));
    const r = await call('quickbase_bulk_create_records', { tableId: 'bqx12345', records });
    expect(r.isError).toBe(true);
    expect((r.data as { partialFailure: { processedBeforeFailure: number } }).partialFailure.processedBeforeFailure).toBe(500);
  });

  it('upsert groups by key field and sets mergeFieldId', async () => {
    const { call, calls } = await setup(() => json({ metadata: { createdRecordIds: [], updatedRecordIds: [1], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 1 } }));
    await call('quickbase_upsert_records', {
      tableId: 'bqx12345',
      records: [
        { keyField: 6, keyValue: 'a', data: { 7: 1 } },
        { keyField: 8, keyValue: 'b', data: { 7: 2 } },
        { keyField: 6, keyValue: 'c', data: { 7: 3 } },
      ],
    });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.body).toMatchObject({ mergeFieldId: 6, data: [{ 6: { value: 'a' } }, { 6: { value: 'c' } }] });
    expect(calls[1]!.body).toMatchObject({ mergeFieldId: 8 });
  });

  it('search escapes the term and defaults to text-like fields', async () => {
    const { call, calls } = await setup((r) => {
      if (r.url.pathname === '/v1/fields')
        return json([{ id: 6, fieldType: 'text' }, { id: 7, fieldType: 'numeric' }, { id: 8, fieldType: 'email-address' }]);
      return json({ data: [], metadata: {} });
    });
    await call('quickbase_search_records', { tableId: 'bqx12345', searchTerm: "o'neil" });
    expect((calls[1]!.body as { where: string }).where).toBe("({6.CT.'o\\'neil'})OR({8.CT.'o\\'neil'})");
  });
});

describe('schema tools', () => {
  it('maps legacy field types and builds properties', async () => {
    const { call, calls } = await setup(() => json({ id: 12 }));
    await call('quickbase_create_field', { tableId: 'bqx12345', label: 'Status', fieldType: 'text_choice', choices: ['a', 'b'], required: true });
    expect(calls[0]!.body).toEqual({ label: 'Status', fieldType: 'text-multiple-choice', properties: { required: true, choices: ['a', 'b'] } });
    expect(calls[0]!.url.searchParams.get('tableId')).toBe('bqx12345');
  });

  it('formula fields use mode formula; reference/lookup types explain the right tool', async () => {
    const { call, calls } = await setup(() => json({ id: 13 }));
    await call('quickbase_create_field', { tableId: 'bqx12345', label: 'Total', fieldType: 'formula', formula: '[A]+[B]', formulaResultType: 'numeric' });
    expect(calls[0]!.body).toEqual({ label: 'Total', fieldType: 'numeric', mode: 'formula', properties: { formula: '[A]+[B]' } });
    const ref = await call('quickbase_create_field', { tableId: 'bqx12345', label: 'P', fieldType: 'reference' });
    expect(ref.isError).toBe(true);
    expect(ref.text).toContain('quickbase_create_relationship');
  });

  it('delete_field uses the bulk delete endpoint', async () => {
    const { call, calls } = await setup(() => json({ deletedFieldIds: [9], errors: [] }));
    await call('quickbase_delete_field', { tableId: 'bqx12345', fieldId: 9, confirm: true });
    expect(calls[0]).toMatchObject({ method: 'DELETE', body: { fieldIds: [9] } });
    expect(calls[0]!.url.pathname).toBe('/v1/fields');
  });

  it('create_relationship rejects the removed foreignKeyFieldId and posts to the child table', async () => {
    const { call, calls } = await setup(() => json({ id: 20, foreignKeyField: { id: 20, label: 'Parent' } }));
    const bad = await call('quickbase_create_relationship', { parentTableId: 'bqpar0001', childTableId: 'bqchd0001', foreignKeyFieldId: 5 });
    expect(bad.isError).toBe(true);
    expect(bad.text).toContain('foreignKeyFieldLabel');
    await call('quickbase_create_relationship', { parentTableId: 'bqpar0001', childTableId: 'bqchd0001', foreignKeyFieldLabel: 'Parent', lookupFieldIds: [6] });
    expect(calls[0]!.url.pathname).toBe('/v1/tables/bqchd0001/relationship');
    expect(calls[0]!.body).toEqual({ parentTableId: 'bqpar0001', foreignKeyField: { label: 'Parent' }, lookupFieldIds: [6] });
  });

  it('advanced relationship relabels created lookup fields; many-to-many is refused', async () => {
    const { call, calls } = await setup((r) => {
      if (r.method === 'POST' && r.url.pathname.endsWith('/relationship')) return json({ id: 20, foreignKeyField: { id: 20, label: 'Parent' } });
      if (r.method === 'GET' && r.url.pathname === '/v1/fields')
        return json([{ id: 30, label: 'Parent - Name', fieldType: 'text', mode: 'lookup', properties: { lookupReferenceFieldId: 20, lookupTargetFieldId: 6 } }]);
      if (r.url.pathname === '/v1/fields/30') return json({ id: 30 });
      return undefined;
    });
    const r = await call('quickbase_create_advanced_relationship', {
      parentTableId: 'bqpar0001', childTableId: 'bqchd0001', referenceFieldLabel: 'Parent', lookupFields: [{ parentFieldId: 6, childFieldLabel: 'Parent name' }],
    });
    expect((r.data as { renamedLookupFieldIds: number[] }).renamedLookupFieldIds).toEqual([30]);
    expect(calls.at(-1)!.body).toEqual({ label: 'Parent name' });
    const m2m = await call('quickbase_create_advanced_relationship', { parentTableId: 'bqpar0001', childTableId: 'bqchd0001', referenceFieldLabel: 'x', relationshipType: 'many-to-many' });
    expect(m2m.isError).toBe(true);
  });
});

describe('reports and files', () => {
  it('runs a report with paging', async () => {
    const { call, calls } = await setup(() => json({ data: [], metadata: {} }));
    await call('quickbase_run_report', { tableId: 'bqx12345', reportId: '4', top: 5 });
    expect(calls[0]!.url.pathname).toBe('/v1/reports/4/run');
    expect(calls[0]!.url.searchParams.get('tableId')).toBe('bqx12345');
    expect(calls[0]!.url.searchParams.get('top')).toBe('5');
  });

  it('downloads the latest version when none is given', async () => {
    const { call, calls } = await setup((r) => {
      if (r.url.pathname === '/v1/records/query') return json({ data: [{ 9: { value: { versions: [{ versionNumber: 1, fileName: 'a.txt' }, { versionNumber: 3, fileName: 'c.txt' }] } } }], metadata: {} });
      if (r.url.pathname === '/v1/files/bqx12345/5/9/3') return new Response('SGVsbG8=', { headers: { 'content-type': 'application/octet-stream' } });
      return undefined;
    });
    const r = await call('quickbase_download_file', { tableId: 'bqx12345', recordId: 5, fieldId: 9 });
    expect(r.data).toEqual({ fileName: 'c.txt', versionNumber: 3, encoding: 'base64', data: 'SGVsbG8=' });
    expect(calls).toHaveLength(2);
  });

  it('upload sends the file through a record upsert and validates base64', async () => {
    const { call, calls } = await setup(() => json({ metadata: { createdRecordIds: [], updatedRecordIds: [5], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 1 } }));
    await call('quickbase_upload_file', { tableId: 'bqx12345', recordId: 5, fieldId: 9, fileName: 'a.txt', fileData: 'SGVsbG8=' });
    expect(calls[0]!.body).toMatchObject({ data: [{ 3: { value: 5 }, 9: { value: { fileName: 'a.txt', data: 'SGVsbG8=' } } }] });
    expect((await call('quickbase_upload_file', { tableId: 'bqx12345', recordId: 5, fieldId: 9, fileName: 'a', fileData: 'not base64!!' })).isError).toBe(true);
  });
});

describe('error handling', () => {
  it('turns API errors into actionable tool errors without leaking the token', async () => {
    const { call } = await setup(() => json({ message: `Invalid token ${TEST_TOKEN}`, description: 'nope' }, 401, { 'qb-api-ray': 'ray-1' }));
    const r = await call('quickbase_get_tables', {});
    expect(r.isError).toBe(true);
    expect(r.text).toContain('401');
    expect(r.text).toContain('QB_USER_TOKEN');
    expect(r.text).not.toContain(TEST_TOKEN);
  });

  it('reports a missing app id clearly', async () => {
    const { call } = await setup(() => undefined, testConfig({ appId: undefined }));
    const r = await call('quickbase_get_tables', {});
    expect(r.isError).toBe(true);
    expect(r.text).toContain('QB_APP_ID');
  });

  it('initiate_oauth builds a PKCE S256 URL offline', async () => {
    const { call, calls } = await setup(() => undefined);
    const r = await call('quickbase_initiate_oauth', { clientId: 'cid', redirectUri: 'https://example.com/cb' });
    const d = r.data as { authorizationUrl: string; codeVerifier: string };
    const u = new URL(d.authorizationUrl);
    expect(u.host).toBe('acme.quickbase.com');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(d.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(calls).toHaveLength(0);
  });
});
