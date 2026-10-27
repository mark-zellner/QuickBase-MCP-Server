import { defineTool } from './types.js';
import { appIdOptional, requireApp } from './schemas.js';

export const appTools = [
  defineTool({
    name: 'quickbase_get_app_info',
    title: 'Get app info',
    description: 'Get information about a Quickbase application (name, dates, settings). Uses appId or QB_APP_ID.',
    inputSchema: { appId: appIdOptional },
    write: false,
    idempotent: true,
    handler: async ({ appId }, { client, config }) => client.get(`/apps/${requireApp(appId, config.appId)}`),
  }),
  defineTool({
    name: 'quickbase_test_connection',
    title: 'Test connection',
    description: 'Verify the realm and user token by listing the tables of the app. Returns ok plus the table count.',
    inputSchema: { appId: appIdOptional },
    write: false,
    idempotent: true,
    handler: async ({ appId }, { client, config }) => {
      const id = requireApp(appId, config.appId);
      const tables = await client.get<unknown[]>('/tables', { appId: id });
      return { ok: true, realm: client.realm, appId: id, tableCount: Array.isArray(tables) ? tables.length : 0 };
    },
  }),
];
