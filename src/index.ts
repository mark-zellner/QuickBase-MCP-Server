#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConfigError, loadConfig } from './config.js';
import { log, registerSecret } from './logger.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  registerSecret(config.userToken);
  const server = createServer(config);
  const transport = new StdioServerTransport();

  const shutdown = async (signal: string) => {
    log('info', `Received ${signal}, shutting down`);
    await server.close().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // Never let a stray rejection kill the stdio session silently; log it to stderr and keep serving.
  process.on('unhandledRejection', (reason) => log('error', 'Unhandled rejection', { reason: String(reason) }));

  await server.connect(transport);
  log('info', `quickbase-mcp-server ready (realm ${config.realm}${config.readOnly ? ', read-only' : ''})`);
}

main().catch((error: unknown) => {
  const message = error instanceof ConfigError ? error.message : `Fatal: ${error instanceof Error ? error.message : String(error)}`;
  process.stderr.write(`[quickbase-mcp] ${message}\n`);
  process.exit(1);
});
