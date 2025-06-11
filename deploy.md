# QuickBase MCP Server Deployment Guide

## Quick Start

1. **Install dependencies:**
```bash
npm install
```

2. **Run interactive setup:**
```bash
node setup.js
```

3. **Build and start:**
```bash
npm run build
npm start
```

## Manual Setup

### 1. Environment Configuration

Create a `.env` file with your QuickBase credentials:

```env
# Required
QB_REALM=seanngates.quickbase.com
QB_USER_TOKEN=your_user_token_here
QB_APP_ID=btr3r3fk5

# Optional
QB_DEFAULT_TIMEOUT=30000
QB_MAX_RETRIES=3
MCP_SERVER_NAME=quickbase-mcp
MCP_SERVER_VERSION=1.0.0
```

### 2. Getting Your User Token

1. **Login to QuickBase**
   - Go to https://seanngates.quickbase.com
   - Navigate to your user account settings

2. **Create User Token**
   - Click "Manage user tokens"
   - Click "New user token"
   - Name: "MCP Server"
   - Set permissions for your app
   - Copy the token to your `.env` file

## MCP Client Integration

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "quickbase": {
      "command": "node",
      "args": ["C:/Users/ljcir/Downloads/USWorkflow/USWorkflow/quickbase-mcp-server/dist/index.js"],
      "env": {
        "QB_REALM": "seanngates.quickbase.com",
        "QB_USER_TOKEN": "your_actual_token_here",
        "QB_APP_ID": "btr3r3fk5"
      }
    }
  }
}
```

### Other MCP Clients

For other MCP clients, use:
- **Command:** `node`
- **Args:** `["/full/path/to/quickbase-mcp-server/dist/index.js"]`
- **Environment variables:** As shown above

## Testing the Installation

### 1. Test connection:
```bash
npm run build
node -e "
import('./dist/index.js').then(() => {
  console.log('Server can be imported successfully');
}).catch(console.error);
"
```

### 2. Test with your actual QuickBase:

Create a test script `test-connection.js`:

```javascript
import { QuickBaseClient } from './dist/quickbase/client.js';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  const client = new QuickBaseClient({
    realm: process.env.QB_REALM,
    userToken: process.env.QB_USER_TOKEN,
    appId: process.env.QB_APP_ID,
    timeout: 30000,
    maxRetries: 3
  });

  try {
    console.log('Testing connection...');
    const connected = await client.testConnection();
    console.log('Connected:', connected);

    if (connected) {
      console.log('\nGetting app info...');
      const appInfo = await client.getAppInfo();
      console.log('App:', appInfo.name);

      console.log('\nGetting tables...');
      const tables = await client.getAppTables();
      console.log('Tables found:', tables.length);
      tables.forEach(table => {
        console.log(`  - ${table.name} (${table.id})`);
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
```

Run with: `node test-connection.js`

## Implementing Your QuickBase Mapping

Based on your `quickbase-mapping.json`, here are the key implementations you can do:

### 1. Add Missing Fields to Existing Tables

```javascript
// Example: Add Sales Rep ID to Masters table
await client.createField('bu7kkqifj', {
  label: 'Sales Rep ID',
  fieldType: 'numeric',
  required: false
});
```

### 2. Create Table Relationships

```javascript
// Create relationship between Sales Reps and Masters
await client.createRelationship(
  'bu7dnv428', // Sales Representatives (parent)
  'bu7kkqifj', // Masters (child)
  88 // Sales Rep ID field in Masters table
);
```

### 3. Create New Tables

```javascript
// Create Master Calendar table
const calendarTableId = await client.createTable({
  name: 'Master Calendar',
  description: 'Centralized scheduling for installations, inspections, meetings'
});

// Add fields to the new table
await client.createField(calendarTableId, {
  label: 'Event Title',
  fieldType: 'text',
  required: true
});
```

## Automation Scripts

You can create scripts to automate your QuickBase setup based on your mapping file:

### Auto-Setup Script

Create `auto-setup.js`:

```javascript
import { QuickBaseClient } from './dist/quickbase/client.js';
import mappingData from './quickbase-mapping.json' assert { type: 'json' };
import dotenv from 'dotenv';

dotenv.config();

async function autoSetup() {
  const client = new QuickBaseClient({
    realm: process.env.QB_REALM,
    userToken: process.env.QB_USER_TOKEN,
    appId: process.env.QB_APP_ID,
    timeout: 30000,
    maxRetries: 3
  });

  // Implement your mapping file automatically
  // This would read your mapping and create missing fields, relationships, etc.
  
  console.log('Setting up QuickBase from mapping file...');
  // Implementation based on your specific needs
}

autoSetup().catch(console.error);
```

## Production Deployment

### 1. Environment Variables in Production

Set these environment variables in your production environment:

```bash
export QB_REALM=seanngates.quickbase.com
export QB_USER_TOKEN=your_production_token
export QB_APP_ID=btr3r3fk5
export QB_DEFAULT_TIMEOUT=30000
export QB_MAX_RETRIES=3
```

### 2. Process Management

Use PM2 for production:

```bash
npm install -g pm2
pm2 start dist/index.js --name quickbase-mcp
pm2 save
pm2 startup
```

### 3. Logging

Logs are written to stderr by default. In production:

```bash
pm2 logs quickbase-mcp
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Run `npm install` to install dependencies
   - Run `npm run build` to compile TypeScript

2. **Authentication failures**
   - Verify your user token is correct
   - Check token permissions include your app
   - Ensure realm hostname is correct

3. **Field creation failures**
   - Check field names don't conflict with existing fields
   - Verify field types are supported
   - Ensure required properties are provided

### Debug Mode

Enable detailed logging:

```bash
DEBUG=* npm start
```

Or in your `.env`:
```env
DEBUG=quickbase-mcp:*
```

## Next Steps

Once deployed, you can:

1. **Implement your mapping file** - Create missing fields and relationships
2. **Set up Aurora integration** - Connect Aurora webhooks to QuickBase
3. **Configure JotForm integration** - Map form submissions to QuickBase
4. **Create automation** - Set up automated workflows

The server provides complete flexibility to implement your entire QuickBase workflow as defined in your mapping file. 