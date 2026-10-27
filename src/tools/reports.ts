import { z } from 'zod';
import { defineTool } from './types.js';
import { tableId } from './schemas.js';

const reportId = z.string().trim().regex(/^\d+$/, 'Report ID is numeric').describe('Report ID');

export const reportTools = [
  defineTool({
    name: 'quickbase_get_reports',
    title: 'List reports',
    description: 'List all reports of a table.',
    inputSchema: { tableId },
    write: false,
    idempotent: true,
    handler: async ({ tableId }, { client }) => client.get('/reports', { tableId }),
  }),
  defineTool({
    name: 'quickbase_get_report',
    title: 'Get report definition',
    description: 'Get the definition (query, columns, sorting) of one report.',
    inputSchema: { tableId, reportId },
    write: false,
    idempotent: true,
    handler: async ({ tableId, reportId }, { client }) => client.get(`/reports/${reportId}`, { tableId }),
  }),
  defineTool({
    name: 'quickbase_run_report',
    title: 'Run report',
    description: 'Run a report and return its records ({data, fields, metadata}).',
    inputSchema: {
      tableId,
      reportId,
      top: z.number().int().min(1).max(10_000).default(100),
      skip: z.number().int().min(0).optional(),
    },
    write: false,
    idempotent: true,
    handler: async ({ tableId, reportId, top, skip }, { client }) =>
      client.post(`/reports/${reportId}/run`, undefined, { query: { tableId, top, skip }, idempotent: true }),
  }),
];
