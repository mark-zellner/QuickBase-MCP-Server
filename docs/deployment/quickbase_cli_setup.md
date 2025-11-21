# Codepage Deployment Guide for MCP Project

This guide shows how to deploy codepages into your Quickbase app (`https://vibe.quickbase.com/nav/app/bvhuaz7pn`) using the **MCP codepage tools** (the official Quickbase CLI does not support codepage operations).

---

## Important Note: No Official CLI for Codepages

The [official Quickbase CLI](https://github.com/QuickBase/quickbase-cli) supports:
- Records (query, insert, update, delete)
- Tables (create, export, import)
- Fields and relationships
- Formulas

**It does NOT support codepage deployment.** Therefore, this MCP project provides comprehensive codepage management through its REST API integration.

---

## Option 1: Use MCP Codepage Tools (Recommended)

The MCP server provides 14 codepage management tools that handle the full lifecycle:

---

## 1. Configure Environment for Vibe App

Edit `.env` to point at your Vibe realm and app:

```env
QB_REALM=vibe.quickbase.com
QB_USER_TOKEN=your-user-token-here
QB_APP_TOKEN=your-app-token-here   # Optional, if app tokens enforced
QB_APP_ID=bvhuaz7pn
CODEPAGE_TABLE_ID=bvi2ms4e9        # Your codepages table ID
CODEPAGE_VERSIONS_TABLE_ID=bvi2ms4ea # Your versions table ID (if using version control)
```

---

## 2. Deploy Using MCP Codepage Tools

### 2.1 Via Node.js Test Scripts

Use the existing lifecycle test to deploy `MyDealership.html`:

```bash
# Build the MCP server first
npm run build

# Deploy via the test suite (creates a codepage record)
npm run test:lifecycle
```

Or create a dedicated deployment script in `package.json`:

```json
{
  "scripts": {
    "deploy:dealership": "node deploy-codepage.js"
  }
}
```

Where `deploy-codepage.js` uses the `QuickBaseClient`:

```javascript
import { QuickBaseClient } from './dist/quickbase/client.js';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const client = new QuickBaseClient({
  realm: process.env.QB_REALM,
  userToken: process.env.QB_USER_TOKEN,
  appId: process.env.QB_APP_ID
});

const code = fs.readFileSync('./MyDealership.html', 'utf-8');

const recordId = await client.deployCodepage({
  tableId: process.env.CODEPAGE_TABLE_ID,
  name: 'MyDealership Calculator',
  code: code,
  description: 'AI-powered pricing calculator',
  version: '2.0.0',
  tags: ['calculator', 'dealership', 'production'],
  targetTableId: 'bvhuaz8wz'
});

console.log(`✅ Deployed to record ID: ${recordId}`);
```

Then run:

```bash
npm run deploy:dealership
```

### 2.2 Via MCP Server (Claude Desktop / AI Tools)

If you have Claude Desktop or another MCP client configured:

1. Start the MCP server: `npm start`
2. In Claude Desktop, use the `deploy_codepage` tool:

   ```
   Deploy MyDealership.html as a codepage:
   - Table: bvi2ms4e9
   - Name: MyDealership Calculator  
   - Version: 2.0.0
   - Tags: calculator, dealership, production
   ```

The MCP server will create the codepage record in your Quickbase app.

---

## 3. Verify Deployment in Quickbase

After deploying, navigate to your codepages table in Quickbase:

```
https://vibe.quickbase.com/db/bvi2ms4e9?a=q
```

You should see your newly created codepage record with:
- Name (field 8)
- Version (field 9)
- Code (field 13)
- Tags (field 10)
- Active status (field 12)

---

## Option 2: Manual Upload via Quickbase UI

If you prefer not to use the MCP tools:

1. Go to your codepages table: `https://vibe.quickbase.com/db/bvi2ms4e9`
2. Click **Add Record**
3. Fill in:
   - **Name**: MyDealership Calculator
   - **Code**: Copy/paste the HTML from `MyDealership.html`
   - **Version**: 2.0.0
   - **Tags**: calculator, dealership
   - **Active**: ✓
4. **Save**

This manual approach works but bypasses validation, version control, and automation that the MCP tools provide.

---

## 4. Full Codepage Lifecycle Management

The MCP server provides 14 tools for complete codepage management:

### CRUD Operations
- `deploy_codepage` - Full deployment with metadata
- `get_codepage` - Retrieve by record ID
- `list_codepages` - List all codepages
- `update_codepage` - Modify existing codepage
- `save_codepage` - Simple save

### Validation & Testing
- `validate_codepage` - Syntax, API usage, security checks

### Search & Discovery
- `search_codepages` - Search by name, tags, table

### Collaboration
- `clone_codepage` - Duplicate and modify

### Import/Export
- `export_codepage` - JSON, HTML, or Markdown
- `import_codepage` - From JSON or HTML

### Version Control
- `save_codepage_version` - Snapshot with changelog
- `get_codepage_versions` - View history
- `rollback_codepage` - Restore previous version

### Execution
- `execute_codepage` - Get execution metadata

---

## 5. Recommended Workflow

1. **Develop locally** - Edit `MyDealership.html` in VS Code
2. **Validate** - Use `validate_codepage` tool to check syntax/security
3. **Deploy** - Use `deploy_codepage` to push to Quickbase
4. **Version** - Use `save_codepage_version` before major changes
5. **Test** - Open the codepage in Quickbase and test functionality
6. **Update** - Use `update_codepage` for incremental changes
7. **Rollback** - If needed, use `rollback_codepage` to restore previous version