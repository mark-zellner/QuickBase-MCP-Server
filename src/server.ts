import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Config } from './config.js';
import { describeError } from './errors.js';
import { log } from './logger.js';
import { QuickBaseClient } from './quickbase/client.js';
import { selectTools } from './tools/index.js';
import { errorResult, jsonResult, type ToolContext, type ToolResult } from './tools/types.js';

export const SERVER_NAME = 'quickbase-mcp-server';
export const SERVER_VERSION = '2.0.0';

export function createServer(config: Config, client: QuickBaseClient = new QuickBaseClient(config)): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const ctx: ToolContext = { client, config };

  for (const tool of selectTools(config.readOnly)) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: {
          title: tool.title,
          readOnlyHint: !tool.write,
          destructiveHint: tool.write ? Boolean(tool.destructive) : false,
          idempotentHint: tool.write ? Boolean(tool.idempotent) : true,
          openWorldHint: true,
        },
      },
      async (args: unknown): Promise<ToolResult> => {
        try {
          const result = await tool.handler((args ?? {}) as Record<string, unknown>, ctx);
          const out = jsonResult(result);
          if (isPartialFailure(result)) out.isError = true;
          return out;
        } catch (error) {
          log('error', `Tool ${tool.name} failed`, { error: error instanceof Error ? error.message : String(error) });
          return errorResult(describeError(error));
        }
      },
    );
  }
  return server;
}

function isPartialFailure(result: unknown): boolean {
  return typeof result === 'object' && result !== null && 'partialFailure' in result && Boolean((result as { partialFailure?: unknown }).partialFailure);
}
