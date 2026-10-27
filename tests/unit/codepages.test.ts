import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkHtmlBalance, parseCodepage, parseImport, validateCode } from '../../src/quickbase/codepages.js';
import { readWorkspaceFile } from '../../src/quickbase/pages.js';
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

describe('validation helpers', () => {
  it('detects unbalanced html and ignores void tags/comments', () => {
    expect(checkHtmlBalance('<div><p>hi<br><img src=x></p></div><!-- <b> -->')).toEqual([]);
    expect(checkHtmlBalance('<div><span></div>').join()).toMatch(/Unclosed <span>/);
    expect(checkHtmlBalance('</div>').join()).toMatch(/Unexpected closing/);
  });

  it('compiles inline scripts without running them', async () => {
    const side = '<script>globalThis.__ran = true;</script>';
    const ok = await validateCode(`<html>${side}<script>qdb.api({});</script></html>`, {});
    expect(ok.isValid).toBe(true);
    expect((globalThis as Record<string, unknown>).__ran).toBeUndefined();
    const bad = await validateCode('<script>function (</script>', {});
    expect(bad.isValid).toBe(false);
    expect(bad.errors.join()).toMatch(/syntax error/i);
  });

  it('flags eval and hard-coded secrets', async () => {
    const r = await validateCode('<script>eval("1"); var apiKey = "abcdef123456";</script>', {});
    expect(r.isValid).toBe(false);
    expect(r.securityIssues.length).toBe(2);
  });

  it('parses imports and exports', () => {
    expect(parseImport('<html><title> My Page </title></html>', 'auto').name).toBe('My Page');
    expect(parseImport(JSON.stringify({ name: 'n', code: 'c', tags: ['a'] }), 'auto')).toMatchObject({ name: 'n', code: 'c', tags: ['a'] });
    expect(() => parseImport('plain', 'auto')).toThrow(/auto-detect/);
    expect(() => parseImport('{"name":1}', 'json')).toThrow(/name/);
    expect(parseCodepage({ 3: { value: 4 }, 8: { value: 'n' }, 10: { value: 'a, b' }, 12: { value: true } })).toMatchObject({ recordId: 4, name: 'n', tags: ['a', 'b'], active: true });
  });
});

describe('readWorkspaceFile', () => {
  it('reads inside the workspace and blocks traversal, absolute paths and symlinks', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'qb-ws-'));
    const outside = await mkdtemp(path.join(os.tmpdir(), 'qb-out-'));
    await writeFile(path.join(root, 'index.html'), '<p>hi</p>');
    await writeFile(path.join(outside, 'secret.txt'), 'nope');
    await mkdir(path.join(root, 'sub'));
    await symlink(path.join(outside, 'secret.txt'), path.join(root, 'sub', 'link.txt'));

    await expect(readWorkspaceFile(root, 'index.html')).resolves.toBe('<p>hi</p>');
    await expect(readWorkspaceFile(root, '../' + path.basename(outside) + '/secret.txt')).rejects.toThrow(/inside the workspace/);
    await expect(readWorkspaceFile(root, path.join(outside, 'secret.txt'))).rejects.toThrow(/inside the workspace/);
    await expect(readWorkspaceFile(root, 'sub/link.txt')).rejects.toThrow(/inside the workspace/);
    await expect(readWorkspaceFile(root, 'missing.html')).rejects.toThrow(/not found/i);
    await expect(readWorkspaceFile(root, 'sub')).rejects.toThrow(/regular file/);
  });
});

describe('code page tools', () => {
  it('deploy_codepage posts XML with CDATA and no TLS bypass; token only in body', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'qb-ws-'));
    await writeFile(path.join(root, 'index.html'), '<p>a ]]> b & c</p>');
    const { call, calls } = await setup(() => new Response('<qdbapi><errcode>0</errcode><pageID>12</pageID></qdbapi>'), testConfig({ workspaceDir: root }));
    const r = await call('deploy_codepage', { pageName: 'index.html', sourcePath: 'index.html' });
    expect(r.data).toMatchObject({ status: 'ok', pageId: 12, pageName: 'index.html' });
    const body = calls[0]!.rawBody!;
    expect(calls[0]!.url.toString()).toBe('https://acme.quickbase.com/db/bqapp0001?a=API_AddReplaceDBPage');
    expect(body).toContain('<pagename>index.html</pagename>');
    expect(body).toContain('<![CDATA[<p>a ]]]]><![CDATA[> b & c</p>]]>');
    expect(r.text).not.toContain(TEST_TOKEN);
  });

  it('deploy_codepage surfaces XML API errors and refuses paths outside the workspace', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'qb-ws-'));
    await writeFile(path.join(root, 'a.html'), 'x');
    const { call } = await setup(
      () => new Response('<qdbapi><errcode>4</errcode><errtext>No permission</errtext><errdetail>nope</errdetail></qdbapi>'),
      testConfig({ workspaceDir: root }),
    );
    const err = await call('deploy_codepage', { pageName: 'a.html', sourcePath: 'a.html' });
    expect(err.isError).toBe(true);
    expect(err.text).toContain('No permission');
    const esc = await call('deploy_codepage', { pageName: 'a.html', sourcePath: '../../etc/passwd' });
    expect(esc.isError).toBe(true);
  });

  it('get_codepage returns raw content and detects XML errors', async () => {
    const ok = await setup(() => new Response('<html>hi</html>'));
    const r = await ok.call('get_codepage', { pageIdOrName: '7' });
    expect(r.data).toMatchObject({ status: 'ok', content: '<html>hi</html>' });
    expect(ok.calls[0]!.rawBody).toContain('<pageID>7</pageID>');
    await close?.();
    const bad = await setup(() => new Response('<qdbapi><errcode>30</errcode><errtext>Not found</errtext></qdbapi>'));
    expect((await bad.call('get_codepage', { pageIdOrName: 'x<y' })).isError).toBe(true);
    expect(bad.calls[0]!.rawBody).toContain('x&lt;y');
  });

  it('save_codepage falls back to CODEPAGE_TABLE_ID and errors clearly without it', async () => {
    const created = json({ metadata: { createdRecordIds: [9], updatedRecordIds: [], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 1 } });
    const a = await setup(() => created, testConfig({ codepageTableId: 'bqcode001' }));
    const r = await a.call('quickbase_save_codepage', { name: 'n', code: 'c' });
    expect(r.data).toEqual({ recordId: 9 });
    expect(a.calls[0]!.body).toMatchObject({ to: 'bqcode001', data: [{ 8: { value: 'n' }, 13: { value: 'c' }, 12: { value: true } }] });
    await close?.();
    const b = await setup(() => created);
    const e = await b.call('quickbase_save_codepage', { name: 'n', code: 'c' });
    expect(e.isError).toBe(true);
    expect(e.text).toContain('CODEPAGE_TABLE_ID');
  });

  it('rollback reads the version table and updates the codepage table', async () => {
    const { call, calls } = await setup((r) => {
      if (r.url.pathname === '/v1/records/query') return json({ data: [{ 3: { value: 3 }, 7: { value: '1.0.0' }, 8: { value: '<old/>' } }], metadata: {} });
      return json({ metadata: { createdRecordIds: [], updatedRecordIds: [1], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 1 } });
    });
    const r = await call('quickbase_rollback_codepage', { tableId: 'bqcode001', versionTableId: 'bqvers001', codepageRecordId: 1, versionRecordId: 3 });
    expect(r.isError).toBe(false);
    expect(calls[0]!.body).toMatchObject({ from: 'bqvers001' });
    expect(calls[1]!.body).toMatchObject({ to: 'bqcode001', data: [{ 3: { value: 1 }, 13: { value: '<old/>' }, 9: { value: '1.0.0-rollback' } }] });
  });

  it('import refuses to duplicate a name unless overwrite is set', async () => {
    const handler = (r: Recorded) => (r.url.pathname === '/v1/records/query' ? json({ data: [{ 3: { value: 8 } }], metadata: {} }) : json({ metadata: { createdRecordIds: [], updatedRecordIds: [8], unchangedRecordIds: [], totalNumberOfRecordsProcessed: 1 } }));
    const { call } = await setup(handler, testConfig({ codepageTableId: 'bqcode001' }));
    const dup = await call('quickbase_import_codepage', { source: '<html><title>X</title></html>' });
    expect(dup.isError).toBe(true);
    const over = await call('quickbase_import_codepage', { source: '<html><title>X</title></html>', overwrite: true });
    expect(over.data).toEqual({ recordId: 8, action: 'updated' });
  });

  it('execute_codepage never executes', async () => {
    const { call } = await setup(() => json({ data: [{ 3: { value: 1 }, 13: { value: 'function f(){}' } }], metadata: {} }), testConfig({ codepageTableId: 'bqcode001' }));
    const r = await call('quickbase_execute_codepage', { recordId: 1, functionName: 'f' });
    expect(r.data).toMatchObject({ executed: false, code: 'function f(){}' });
  });
});
