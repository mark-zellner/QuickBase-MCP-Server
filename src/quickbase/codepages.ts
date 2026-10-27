import { UsageError } from '../errors.js';
import type { QuickBaseClient } from './client.js';
import { allOf, anyOf, clause } from './query.js';
import { queryRecords, upsertInChunks } from './records.js';

/**
 * Convention for storing code pages as records. Field IDs are fixed so that tables created for
 * the 1.x server keep working. Create the tables with these fields (see README).
 */
export const CP = { name: 8, version: 9, tags: 10, targetTableId: 11, active: 12, code: 13, description: 14, dependencies: 15 } as const;
/** Version-history table: field 1 (Date Created) is built in and used for ordering. */
export const VER = { created: 1, codepageRecordId: 6, version: 7, code: 8, changeLog: 9 } as const;

type Row = Record<string, { value?: unknown } | undefined>;

export interface Codepage {
  recordId: number | undefined;
  name?: string;
  code?: string;
  description?: string;
  version?: string;
  tags: string[];
  dependencies: string[];
  targetTableId?: string;
  active?: boolean;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v !== '' ? v : undefined);

export function parseCodepage(row: Row, includeCode = true): Codepage {
  const get = (id: number) => row[String(id)]?.value;
  const id = get(3);
  return {
    recordId: typeof id === 'number' ? id : undefined,
    name: str(get(CP.name)),
    ...(includeCode ? { code: str(get(CP.code)) } : {}),
    description: str(get(CP.description)),
    version: str(get(CP.version)),
    tags: (str(get(CP.tags)) ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    dependencies: (str(get(CP.dependencies)) ?? '').split('\n').map((t) => t.trim()).filter(Boolean),
    targetTableId: str(get(CP.targetTableId)),
    active: typeof get(CP.active) === 'boolean' ? (get(CP.active) as boolean) : undefined,
  };
}

export const CODEPAGE_SELECT = [3, CP.name, CP.version, CP.tags, CP.targetTableId, CP.active, CP.code, CP.description, CP.dependencies];
export const CODEPAGE_SELECT_NO_CODE = CODEPAGE_SELECT.filter((id) => id !== CP.code);

export async function getCodepageRow(client: QuickBaseClient, tableId: string, recordId: number, includeCode = true): Promise<Codepage> {
  const res = await queryRecords(client, {
    tableId,
    select: includeCode ? CODEPAGE_SELECT : CODEPAGE_SELECT_NO_CODE,
    where: clause(3, 'EX', recordId),
    top: 1,
  });
  const row = res.data[0];
  if (!row) throw new UsageError(`Codepage record ${recordId} not found in table ${tableId}`);
  return parseCodepage(row, includeCode);
}

export interface CodepageInput {
  name?: string;
  code?: string;
  description?: string;
  version?: string;
  tags?: string[];
  dependencies?: string[];
  targetTableId?: string;
  active?: boolean;
}

export function toRecordFields(input: CodepageInput): Record<string, { value: unknown }> {
  const f: Record<string, { value: unknown }> = {};
  if (input.name !== undefined) f[CP.name] = { value: input.name };
  if (input.code !== undefined) f[CP.code] = { value: input.code };
  if (input.description !== undefined) f[CP.description] = { value: input.description };
  if (input.version !== undefined) f[CP.version] = { value: input.version };
  if (input.tags !== undefined) f[CP.tags] = { value: input.tags.join(', ') };
  if (input.dependencies !== undefined) f[CP.dependencies] = { value: input.dependencies.join('\n') };
  if (input.targetTableId !== undefined) f[CP.targetTableId] = { value: input.targetTableId };
  if (input.active !== undefined) f[CP.active] = { value: input.active };
  return f;
}

export async function createCodepage(client: QuickBaseClient, tableId: string, input: CodepageInput): Promise<number> {
  const res = await upsertInChunks(client, tableId, [toRecordFields({ active: true, ...input })]);
  const id = res.createdRecordIds[0];
  if (id === undefined) throw new UsageError(`Quickbase did not create the codepage: ${JSON.stringify(res.lineErrors)}`);
  return id;
}

export async function updateCodepage(client: QuickBaseClient, tableId: string, recordId: number, input: CodepageInput): Promise<void> {
  const fields = toRecordFields(input);
  if (Object.keys(fields).length === 0) throw new UsageError('Nothing to update.');
  const res = await upsertInChunks(client, tableId, [{ ...fields, 3: { value: recordId } }]);
  if (Object.keys(res.lineErrors).length > 0) throw new UsageError(`Quickbase rejected the update: ${JSON.stringify(res.lineErrors)}`);
}

export async function findCodepages(
  client: QuickBaseClient,
  p: { tableId: string; searchTerm?: string; tags?: string[]; targetTableId?: string; activeOnly?: boolean; limit?: number; includeCode?: boolean },
): Promise<Codepage[]> {
  const parts: string[] = [];
  if (p.searchTerm) parts.push(anyOf([clause(CP.name, 'CT', p.searchTerm), clause(CP.description, 'CT', p.searchTerm)]));
  if (p.tags?.length) parts.push(anyOf(p.tags.map((t) => clause(CP.tags, 'CT', t))));
  if (p.targetTableId) parts.push(clause(CP.targetTableId, 'EX', p.targetTableId));
  if (p.activeOnly) parts.push(`{${CP.active}.EX.true}`);
  const res = await queryRecords(client, {
    tableId: p.tableId,
    select: p.includeCode ? CODEPAGE_SELECT : CODEPAGE_SELECT_NO_CODE,
    where: parts.length ? allOf(parts) : undefined,
    top: p.limit ?? 100,
  });
  return res.data.map((r) => parseCodepage(r, Boolean(p.includeCode)));
}

// ---- static validation ---------------------------------------------------

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityIssues: string[];
}

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export function checkHtmlBalance(html: string): string[] {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.slice(0, m.indexOf('>') + 1) + '</script>')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>');
  const stack: string[] = [];
  const errors: string[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
  for (let m = re.exec(stripped); m; m = re.exec(stripped)) {
    const [, closing, rawName, selfClosing] = m;
    const name = (rawName ?? '').toLowerCase();
    if (VOID.has(name) || selfClosing) continue;
    if (!closing) {
      stack.push(name);
    } else if (stack[stack.length - 1] === name) {
      stack.pop();
    } else if (stack.includes(name)) {
      const unclosed = stack.splice(stack.lastIndexOf(name)).slice(1);
      errors.push(`Unclosed <${unclosed.join('>, <')}> before </${name}>`);
    } else {
      errors.push(`Unexpected closing tag </${name}>`);
    }
  }
  if (stack.length) errors.push(`Unclosed tag(s): <${stack.join('>, <')}>`);
  return errors;
}

export async function checkScriptSyntax(html: string): Promise<string[]> {
  const { Script } = await import('node:vm');
  const errors: string[] = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let index = 0;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    index++;
    const attrs = m[1] ?? '';
    const body = m[2] ?? '';
    if (/\bsrc\s*=/i.test(attrs) || !body.trim()) continue;
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type && !['text/javascript', 'application/javascript'].includes(type)) continue; // modules, JSON, templates
    try {
      new Script(body); // compiles only, never runs
    } catch (e) {
      errors.push(`JavaScript syntax error in <script> #${index}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return errors;
}

export async function validateCode(code: string, opts: { checkSyntax?: boolean; checkAPIs?: boolean; checkSecurity?: boolean } = {}): Promise<ValidationReport> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const securityIssues: string[] = [];

  if (opts.checkSyntax !== false) {
    errors.push(...checkHtmlBalance(code));
    errors.push(...(await checkScriptSyntax(code)));
    if (!/<[a-z!]/i.test(code)) {
      // Plain JavaScript rather than HTML
      try {
        const { Script } = await import('node:vm');
        new Script(code);
      } catch (e) {
        errors.push(`JavaScript syntax error: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  if (opts.checkAPIs !== false) {
    const hasQdb = code.includes('qdb.api');
    const hasQB = code.includes('QB.api');
    const hasSession = code.includes('window.qbClient');
    if (!hasQdb && !hasQB && !hasSession) warnings.push('No Quickbase API usage detected.');
    if (hasQB && !hasQdb) warnings.push('Consider qdb.api instead of QB.api.');
  }
  if (opts.checkSecurity !== false) {
    if (/\beval\s*\(/.test(code)) securityIssues.push('eval() usage');
    if (/\bnew\s+Function\s*\(/.test(code)) securityIssues.push('new Function() usage');
    if (/\.innerHTML\s*=/.test(code)) warnings.push('innerHTML assignment: make sure the content is sanitised.');
    if (/(password|api[_-]?key|secret|token)\s*[:=]\s*['"][^'"]{6,}['"]/i.test(code)) securityIssues.push('Possible hard-coded credential');
  }
  return { isValid: errors.length === 0 && securityIssues.length === 0, errors, warnings, securityIssues };
}

export function exportCodepage(cp: Codepage, format: 'html' | 'json' | 'markdown'): string {
  if (format === 'html') return cp.code ?? '';
  if (format === 'json') return JSON.stringify(cp, null, 2);
  return `# ${cp.name ?? 'Untitled'} (v${cp.version ?? '1.0.0'})\n\n## Description\n${cp.description ?? ''}\n\n## Code\n\`\`\`html\n${cp.code ?? ''}\n\`\`\`\n\n## Metadata\n- **Version:** ${cp.version ?? '1.0.0'}\n- **Tags:** ${cp.tags.join(', ') || 'None'}\n- **Target table:** ${cp.targetTableId ?? 'None'}\n- **Active:** ${cp.active ? 'Yes' : 'No'}\n`;
}

export function parseImport(source: string, format: 'html' | 'json' | 'auto'): CodepageInput & { name: string; code: string } {
  const trimmed = source.trim();
  let fmt = format;
  if (fmt === 'auto') {
    if (trimmed.startsWith('{')) fmt = 'json';
    else if (/^<(!doctype|html|body|div|script)/i.test(trimmed)) fmt = 'html';
    else throw new UsageError('Cannot auto-detect the format. Specify format "html" or "json".');
  }
  if (fmt === 'json') {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new UsageError('source is not valid JSON.');
    }
    const o = (data ?? {}) as Record<string, unknown>;
    if (typeof o.name !== 'string' || typeof o.code !== 'string') throw new UsageError('JSON import needs string fields "name" and "code".');
    return {
      name: o.name,
      code: o.code,
      description: typeof o.description === 'string' ? o.description : undefined,
      version: typeof o.version === 'string' ? o.version : undefined,
      tags: Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string') : undefined,
      dependencies: Array.isArray(o.dependencies) ? o.dependencies.filter((t): t is string => typeof t === 'string') : undefined,
      targetTableId: typeof o.targetTableId === 'string' ? o.targetTableId : undefined,
    };
  }
  const title = /<title>([\s\S]*?)<\/title>/i.exec(trimmed)?.[1]?.trim();
  return { name: title || 'Imported Codepage', code: source, description: 'Imported from HTML', version: '1.0.0' };
}

