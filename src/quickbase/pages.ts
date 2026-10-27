import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { UsageError } from '../errors.js';
import { cdata, escapeXml, type QuickBaseClient } from './client.js';

export const MAX_PAGE_BYTES = 2 * 1024 * 1024;

/** Reads a file for deployment, refusing anything outside `workspaceDir` (including via symlinks). */
export async function readWorkspaceFile(workspaceDir: string, sourcePath: string): Promise<string> {
  const root = await realpath(workspaceDir).catch(() => {
    throw new UsageError(`Workspace directory does not exist: ${workspaceDir}`);
  });
  const resolved = path.resolve(root, sourcePath);
  const real = await realpath(resolved).catch(() => {
    throw new UsageError(`File not found: ${sourcePath}`);
  });
  const rel = path.relative(root, real);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new UsageError('sourcePath must be inside the workspace directory (QB_WORKSPACE_DIR or the server’s working directory).');
  }
  const info = await stat(real);
  if (!info.isFile()) throw new UsageError(`Not a regular file: ${sourcePath}`);
  if (info.size > MAX_PAGE_BYTES) throw new UsageError(`File is larger than ${MAX_PAGE_BYTES} bytes.`);
  return readFile(real, 'utf8');
}

interface XmlError {
  code: string;
  text?: string;
  detail?: string;
}

function tag(xml: string, name: string): string | undefined {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  return m?.[1]?.trim();
}

/** Returns an error if the XML response reports a non-zero errcode. */
export function xmlError(xml: string): XmlError | undefined {
  const code = tag(xml, 'errcode');
  if (code === undefined || code === '0') return undefined;
  return { code, text: tag(xml, 'errtext'), detail: tag(xml, 'errdetail') };
}

function throwXmlError(err: XmlError): never {
  throw new UsageError(`Quickbase XML API error ${err.code}${err.text ? `: ${err.text}` : ''}${err.detail ? ` (${err.detail})` : ''}`);
}

export interface DeployPageParams {
  appId: string;
  pageName: string;
  pageType: 1 | 3;
  body: string;
  overwriteById?: number;
}

export async function deployPage(client: QuickBaseClient, p: DeployPageParams): Promise<{ status: 'ok'; appId: string; pageName: string; pageId?: number }> {
  const target = p.overwriteById ? `<pageid>${p.overwriteById}</pageid>` : `<pagename>${escapeXml(p.pageName)}</pagename>`;
  const inner = `<pagetype>${p.pageType}</pagetype>${target}<pagebody>${cdata(p.body)}</pagebody>`;
  const xml = await client.requestXml(p.appId, 'API_AddReplaceDBPage', inner);
  const err = xmlError(xml);
  if (err) throwXmlError(err);
  const id = tag(xml, 'pageID');
  return { status: 'ok', appId: p.appId, pageName: p.pageName, pageId: id ? Number(id) : undefined };
}

export async function fetchPage(client: QuickBaseClient, appId: string, pageIdOrName: string): Promise<{ status: 'ok'; content: string; bytes: number }> {
  const inner = /^\d+$/.test(pageIdOrName) ? `<pageID>${pageIdOrName}</pageID>` : `<pagename>${escapeXml(pageIdOrName)}</pagename>`;
  const content = await client.requestXml(appId, 'API_GetDBPage', inner);
  if (content.includes('<qdbapi>')) {
    const err = xmlError(content);
    if (err) throwXmlError(err);
  }
  return { status: 'ok', content, bytes: Buffer.byteLength(content, 'utf8') };
}
