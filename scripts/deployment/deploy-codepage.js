#!/usr/bin/env node
import { QuickBaseClient } from '../../dist/quickbase/client.js';
import fs from 'node:fs';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config();

// Configuration
const config = {
  realm: process.env.QB_REALM,
  userToken: process.env.QB_USER_TOKEN,
  appId: process.env.QB_APP_ID,
  timeout: 30000,
  maxRetries: 3
};

const codepageTableId = process.env.CODEPAGE_TABLE_ID || 'bvi2ms4e9';

// Get codepage file from command line argument
const codepageFile = process.argv[2] || './MyDealership.html';

console.log('📦 QuickBase Codepage Deployment\n');
console.log(`Configuration:`);
console.log(`  Realm: ${config.realm}`);
console.log(`  App ID: ${config.appId}`);
console.log(`  Table: ${codepageTableId}`);
console.log(`  File: ${codepageFile}\n`);

if (!fs.existsSync(codepageFile)) {
  console.error(`❌ Error: File not found: ${codepageFile}`);
  console.error(`Usage: node deploy-codepage.js <path-to-html-file>`);
  process.exit(1);
}

const client = new QuickBaseClient(config);

try {
  // Read the codepage file
  const code = fs.readFileSync(codepageFile, 'utf-8');
  const fileName = path.basename(codepageFile, '.html');
  
  console.log(`📄 Reading file: ${codepageFile} (${code.length} bytes)`);
  
  // Deploy the codepage
  console.log(`\n🚀 Deploying to QuickBase...`);
  
  const recordId = await client.deployCodepage({
    tableId: codepageTableId,
    name: fileName,
    code: code,
    description: `Deployed from ${codepageFile} on ${new Date().toISOString()}`,
    version: '1.0.0',
    tags: ['deployed', 'mcp'],
    targetTableId: process.env.TARGET_TABLE_ID || ''
  });
  
  console.log(`\n✅ Successfully deployed!`);
  console.log(`   Record ID: ${recordId}`);
  console.log(`   View at: https://${config.realm}/db/${codepageTableId}?a=dr&rid=${recordId}`);
  
} catch (error) {
  console.error(`\n❌ Deployment failed:`, error.message);
  process.exit(1);
}
