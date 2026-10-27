#!/usr/bin/env node
/* Usage: quickbase-deploy-codepage <file> [--name=<pageName>] [--id=<pageId>] [--type=1|3] [--app=<appId>] */
import path from 'node:path';
import { ConfigError, loadConfig } from '../config.js';
import { describeError } from '../errors.js';
import { QuickBaseClient } from '../quickbase/client.js';
import { deployPage, readWorkspaceFile } from '../quickbase/pages.js';

function arg(name: string, args: string[]): string | undefined {
  return args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    process.stderr.write('Usage: quickbase-deploy-codepage <file> [--name=<pageName>] [--id=<pageId>] [--type=1|3] [--app=<appId>]\n');
    process.exit(2);
  }
  const config = loadConfig();
  const appId = arg('app', args) ?? config.appId;
  if (!appId) throw new ConfigError('No app ID. Set QB_APP_ID or pass --app=<appId>.');
  const idArg = arg('id', args);
  const typeArg = arg('type', args);
  const pageType = typeArg === '3' ? 3 : 1;
  const overwriteById = idArg ? Number.parseInt(idArg, 10) : undefined;
  if (idArg && (!Number.isInteger(overwriteById) || (overwriteById ?? 0) <= 0)) throw new ConfigError('--id must be a positive integer');
  const pageName = arg('name', args) ?? path.basename(file);

  const body = await readWorkspaceFile(config.workspaceDir, file);
  const result = await deployPage(new QuickBaseClient(config), { appId, pageName, pageType, body, overwriteById });
  process.stderr.write(`Deployed ${pageName}${result.pageId ? ` (page ${result.pageId})` : ''} to app ${appId}\n`);
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

run().catch((error: unknown) => {
  process.stderr.write(`Failed: ${error instanceof ConfigError ? error.message : describeError(error)}\n`);
  process.exit(1);
});
