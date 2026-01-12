import { deployCodepage } from '../tools/pages/deploy_codepage.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function run() {
  const args = process.argv.slice(2);
  const filePath = args.find(a => !a.startsWith('--'));
  if (!filePath) {
    console.error("Usage: node deploy.js <path/to/file> [--id=<pageID>] [--name=<pageName>]");
    process.exit(1);
  }

  const idArg = args.find(a => a.startsWith('--id='));
  const nameArg = args.find(a => a.startsWith('--name='));
  
  const pageId = idArg ? parseInt(idArg.split('=')[1]) : undefined;
  const pageName = nameArg ? nameArg.split('=')[1] : path.basename(filePath);
  const relativePath = path.relative(process.cwd(), filePath);

  console.log(`Deploying ${relativePath} as ${pageName}${pageId ? ` (ID: ${pageId})` : ''}...`);

  const config = {
      realm: process.env.QB_REALM || '',
      userToken: process.env.QB_USER_TOKEN || '',
      appId: process.env.QB_APP_ID || '',
      timeout: Number(process.env.QB_DEFAULT_TIMEOUT) || 30000,
      maxRetries: Number(process.env.QB_MAX_RETRIES) || 3
  };

  if (!config.realm || !config.userToken || !config.appId) {
    console.error('Missing env vars');
    process.exit(1);
  }

  try {
    const result = await deployCodepage({
        pageName,
        sourcePath: relativePath,
        pageType: 1, // Default to HTML
        overwriteById: pageId
    }, config);
    console.log("Success!", result);
  } catch (err: any) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
}

run();
