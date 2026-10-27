import { z } from 'zod';
import { defineTool } from './types.js';
import { appIdOptional, requireApp, tableId } from './schemas.js';

export const tableTools = [
  defineTool({
    name: 'quickbase_get_tables',
    title: 'List tables',
    description: 'List all tables in the application.',
    inputSchema: { appId: appIdOptional },
    write: false,
    idempotent: true,
    handler: async ({ appId }, { client, config }) => client.get('/tables', { appId: requireApp(appId, config.appId) }),
  }),
  defineTool({
    name: 'quickbase_create_table',
    title: 'Create table',
    description: 'Create a new table in the application.',
    inputSchema: {
      appId: appIdOptional,
      name: z.string().trim().min(1).max(100).describe('Table name'),
      description: z.string().max(1000).optional().describe('Table description'),
    },
    write: true,
    handler: async ({ appId, name, description }, { client, config }) =>
      client.post('/tables', { name, description }, { query: { appId: requireApp(appId, config.appId) } }),
  }),
  defineTool({
    name: 'quickbase_get_table_info',
    title: 'Get table info',
    description: 'Get detailed information about a table (key field, record name, etc.).',
    inputSchema: { tableId, appId: appIdOptional },
    write: false,
    idempotent: true,
    handler: async ({ tableId, appId }, { client, config }) =>
      client.get(`/tables/${tableId}`, { appId: requireApp(appId, config.appId) }),
  }),
  defineTool({
    name: 'quickbase_delete_table',
    title: 'Delete table',
    description: 'Permanently delete a table and ALL its records. Irreversible. Requires confirm=true.',
    inputSchema: {
      tableId,
      appId: appIdOptional,
      confirm: z.literal(true).describe('Must be true to confirm the deletion'),
    },
    write: true,
    destructive: true,
    idempotent: true,
    handler: async ({ tableId, appId }, { client, config }) =>
      client.delete(`/tables/${tableId}`, { query: { appId: requireApp(appId, config.appId) } }),
  }),
];
