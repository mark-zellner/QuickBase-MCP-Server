#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  console.log('🚀 QuickBase MCP Server Setup\n');
  console.log('This script will help you configure your QuickBase MCP server.\n');

  // Check if .env already exists
  if (existsSync('.env')) {
    const overwrite = await question('📁 .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('✅ Setup cancelled. Using existing .env file.');
      rl.close();
      return;
    }
  }

  try {
    // Get QuickBase configuration
    console.log('📋 QuickBase Configuration:');
    const realm = await question('   QuickBase Realm (e.g., yourcompany.quickbase.com): ');
    const userToken = await question('   User Token: ');
    const appId = await question('   App ID (e.g., btr3r3fk5): ');

    // Optional settings
    console.log('\n⚙️  Optional Settings (press Enter for defaults):');
    const timeout = await question('   Timeout in ms (default: 30000): ') || '30000';
    const maxRetries = await question('   Max retries (default: 3): ') || '3';
    const serverName = await question('   Server name (default: quickbase-mcp): ') || 'quickbase-mcp';

    // Validate required fields
    if (!realm || !userToken || !appId) {
      console.error('❌ Error: Realm, User Token, and App ID are required!');
      process.exit(1);
    }

    // Create .env content
    const envContent = `# QuickBase Configuration
QB_REALM=${realm}
QB_USER_TOKEN=${userToken}
QB_APP_ID=${appId}

# Optional: Default settings
QB_DEFAULT_TIMEOUT=${timeout}
QB_MAX_RETRIES=${maxRetries}

# MCP Server Configuration
MCP_SERVER_NAME=${serverName}
MCP_SERVER_VERSION=1.0.0
`;

    // Write .env file
    writeFileSync('.env', envContent);
    console.log('\n✅ .env file created successfully!');

    // Test connection
    console.log('\n🔍 Testing connection...');
    try {
      const { QuickBaseClient } = await import('./dist/quickbase/client.js');
      const client = new QuickBaseClient({
        realm,
        userToken,
        appId,
        timeout: parseInt(timeout),
        maxRetries: parseInt(maxRetries)
      });
      
      const connected = await client.testConnection();
      if (connected) {
        console.log('✅ Connection successful!');
        
        // Get app info
        const appInfo = await client.getAppInfo();
        console.log(`📱 Connected to app: ${appInfo.name || 'Unknown'}`);
        
        const tables = await client.getAppTables();
        console.log(`📊 Found ${tables.length} tables`);
      } else {
        console.log('❌ Connection failed. Please check your credentials.');
      }
    } catch (error) {
      console.log('⚠️  Could not test connection (server may need to be built first)');
      console.log('   Run: npm run build && npm start');
    }

    console.log('\n🎉 Setup complete! Next steps:');
    console.log('   1. Build the server: npm run build');
    console.log('   2. Start the server: npm start');
    console.log('   3. Add to your MCP client configuration');
    console.log('\n📖 See README.md for detailed usage instructions.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }

  rl.close();
}

setup().catch(console.error); 