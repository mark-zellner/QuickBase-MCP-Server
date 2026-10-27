import { z } from 'zod';
import { deployPage, fetchPage, readWorkspaceFile } from '../quickbase/pages.js';
import { defineTool } from './types.js';
import { appIdOptional, requireApp } from './schemas.js';

/**
 * Quickbase "code pages" (HTML/JS stored in the app itself). Only the legacy XML API can read and write them.
 * These two tools keep their v1 names (no quickbase_ prefix).
 */
export const pageTools = [
  defineTool({
    name: 'deploy_codepage',
    title: 'Deploy code page from file',
    description:
      'Create or replace a Quickbase code page from a local file. The file must be inside the workspace directory (QB_WORKSPACE_DIR, default: the server’s working directory).',
    inputSchema: {
      appId: appIdOptional,
      pageName: z.string().trim().min(1).max(255).describe('Name with extension, e.g. index.html'),
      pageType: z.union([z.literal(1), z.literal(3)]).default(1).describe('1 = HTML/Text, 3 = Exact Form'),
      sourcePath: z.string().trim().min(1).describe('Path (relative to the workspace directory) of the file to deploy'),
      overwriteById: z.number().int().positive().optional().describe('Replace the page with this ID (use when renaming)'),
    },
    write: true,
    idempotent: true,
    handler: async ({ appId, pageName, pageType, sourcePath, overwriteById }, { client, config }) => {
      const body = await readWorkspaceFile(config.workspaceDir, sourcePath);
      return deployPage(client, { appId: requireApp(appId, config.appId), pageName, pageType, body, overwriteById });
    },
  }),
  defineTool({
    name: 'get_codepage',
    title: 'Get code page',
    description: 'Fetch the stored content of a Quickbase code page by numeric ID or by name.',
    inputSchema: {
      appId: appIdOptional,
      pageIdOrName: z.string().trim().min(1).describe('Page ID (e.g. 7) or name (e.g. index.html)'),
    },
    write: false,
    idempotent: true,
    handler: async ({ appId, pageIdOrName }, { client, config }) => fetchPage(client, requireApp(appId, config.appId), pageIdOrName),
  }),
];
