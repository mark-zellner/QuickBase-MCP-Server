# Quickbase MCP Code Page Deployment Guide

This guide outlines how to build, deploy, and manage Quickbase code pages using MCP tools and VS Code. It is designed to assist developers and AI agents (e.g., GitHub Copilot) working in this repo.

---

## 🧩 Project Overview

This repo supports development of **Code Pages** for Quickbase apps through the **Model Context Protocol (MCP)**. Code pages are custom HTML/JS/CSS pages embedded in Quickbase apps. 

### Architecture
- **MCP Server**: Provides 11+ comprehensive tools for codepage management
- **QuickBase REST API**: Used for storing codepage metadata in tables
- **Storage Strategy**: Codepages stored as records in a dedicated QuickBase table
- **Version Control**: Built-in versioning system for tracking changes

---

## 🛠️ Environment Setup

### Required `.env` Variables

```env
QB_REALM=yourrealm.quickbase.com
QB_USER_TOKEN=your_quickbase_user_token
QB_APP_ID=your_app_dbid
QB_DEFAULT_TIMEOUT=30000
QB_MAX_RETRIES=3
CODEPAGE_TABLE_ID=bltcpt7da  # Table for storing codepages
CODEPAGE_VERSION_TABLE_ID=bltcptv8z  # Table for version history
```

### QuickBase Table Structure

#### Codepages Table (CODEPAGE_TABLE_ID)
Required fields:
- **Field 3**: Record ID (auto-generated)
- **Field 6**: Name (text) - Codepage name
- **Field 7**: Code (text, multiline) - Complete HTML/JS/CSS code
- **Field 8**: Description (text, multiline) - Codepage description
- **Field 9**: Version (text) - Version number (e.g., "1.0.0")
- **Field 10**: Tags (text) - Comma-separated tags
- **Field 11**: Dependencies (text, multiline) - CDN links, one per line
- **Field 12**: Target Table ID (text) - Table this codepage works with
- **Field 13**: Active (checkbox) - Enable/disable the codepage
- **Field 14**: Created Date (datetime) - Auto-populated
- **Field 15**: Modified Date (datetime) - Auto-updated

#### Codepage Versions Table (CODEPAGE_VERSION_TABLE_ID)
Required fields:
- **Field 3**: Record ID (auto-generated)
- **Field 6**: Codepage Record ID (numeric) - Reference to main codepage
- **Field 7**: Version (text) - Version number
- **Field 8**: Code Snapshot (text, multiline) - Code at this version
- **Field 9**: Change Log (text, multiline) - Description of changes
- **Field 10**: Created Date (datetime) - Version creation date

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp env.example .env
# Edit .env with your QuickBase credentials
```

### 3. Setup Codepage Tables
```bash
npm run setup
```

### 4. Build and Start MCP Server
```bash
npm run build
npm start
```

### 5. Connect MCP Client
Configure your MCP client (e.g., Claude Desktop) to connect to the server.

---

## 📋 Available MCP Tools

### Deployment Tools

#### `quickbase_deploy_codepage`
Deploy a complete codepage with full metadata.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "name": "MyDealership Calculator",
  "code": "<!DOCTYPE html>...",
  "description": "AI-powered pricing calculator",
  "version": "1.0.0",
  "tags": ["calculator", "pricing"],
  "dependencies": [
    "https://cdn.quickbase.com/static/lib/qdb.js"
  ],
  "targetTableId": "bvhuaz8wz"
}
```

**Usage Example:**
```javascript
// In your MCP client
await deployCodepage({
  tableId: process.env.CODEPAGE_TABLE_ID,
  name: "Deal Sheet Calculator",
  code: readFileSync('MyDealership.html', 'utf8'),
  version: "2.0.0",
  tags: ["dealership", "calculator", "pricing"]
});
```

#### `quickbase_save_codepage`
Simple save without extended metadata (legacy).

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "name": "Simple Page",
  "code": "<!DOCTYPE html>...",
  "description": "Optional description"
}
```

#### `quickbase_update_codepage`
Update an existing codepage.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "recordId": 123,
  "code": "<!DOCTYPE html>...",
  "version": "1.0.1",
  "active": true
}
```

### Discovery Tools

#### `quickbase_list_codepages`
List all codepages in the table.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "limit": 50
}
```

#### `quickbase_search_codepages`
Search codepages by criteria.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "searchTerm": "calculator",
  "tags": ["pricing"],
  "targetTableId": "bvhuaz8wz",
  "activeOnly": true
}
```

#### `quickbase_get_codepage`
Get a specific codepage by record ID.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "recordId": 123
}
```

### Quality Tools

#### `quickbase_validate_codepage`
Validate code for syntax, API usage, and security.

**Parameters:**
```json
{
  "code": "<!DOCTYPE html>...",
  "checkSyntax": true,
  "checkAPIs": true,
  "checkSecurity": true
}
```

**Returns:**
```json
{
  "isValid": true,
  "errors": [],
  "warnings": ["Consider using qdb.api instead of QB.api"],
  "securityIssues": []
}
```

#### `quickbase_export_codepage`
Export codepage in various formats.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "recordId": 123,
  "format": "html"  // or "json" or "markdown"
}
```

### Collaboration Tools

#### `quickbase_clone_codepage`
Clone an existing codepage with modifications.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "sourceRecordId": 123,
  "newName": "Deal Sheet V2",
  "modifications": {
    "version": "2.0.0",
    "description": "Cloned from V1 with enhancements"
  }
}
```

#### `quickbase_execute_codepage`
Execute a function from a stored codepage (sandbox mode).

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "recordId": 123,
  "functionName": "calculatePrice",
  "parameters": {
    "msrp": 35000,
    "discount": 2000
  }
}
```

### Version Control Tools

#### `quickbase_save_codepage_version`
Save a version snapshot.

**Parameters:**
```json
{
  "tableId": "bltcptv8z",
  "codepageRecordId": 123,
  "version": "1.0.1",
  "code": "<!DOCTYPE html>...",
  "changeLog": "Fixed pricing calculation bug"
}
```

#### `quickbase_get_codepage_versions`
Get version history.

**Parameters:**
```json
{
  "tableId": "bltcptv8z",
  "codepageRecordId": 123,
  "limit": 10
}
```

#### `quickbase_rollback_codepage`
Rollback to a previous version.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "codepageRecordId": 123,
  "versionRecordId": 456
}
```

### Import/Export Tools

#### `quickbase_import_codepage`
Import from HTML, JSON, or file.

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "source": "<html>...</html>",
  "format": "html",
  "overwrite": false
}
```

---

## 🏗️ Development Workflows

### Create New Codepage
```bash
# 1. Create HTML file
code MyNewPage.html

# 2. Test locally
open MyNewPage.html

# 3. Deploy via MCP
# Use quickbase_deploy_codepage tool

# 4. Save version
# Use quickbase_save_codepage_version tool
```

### Update Existing Codepage
```bash
# 1. Fetch current version
# Use quickbase_get_codepage tool

# 2. Make changes
code MyPage.html

# 3. Update
# Use quickbase_update_codepage tool

# 4. Save version snapshot
# Use quickbase_save_codepage_version tool
```

### Clone and Modify
```bash
# 1. Find source codepage
# Use quickbase_search_codepages tool

# 2. Clone with modifications
# Use quickbase_clone_codepage tool

# 3. Update cloned version
# Use quickbase_update_codepage tool
```

---

## ✅ Working QuickBase Integration Patterns

### API Priority Order (from AGENTS.md)

```javascript
// 1. QuickBase JavaScript API (qdb.api) - BEST OPTION, No CORS
if (typeof qdb !== 'undefined' && qdb.api) {
    const response = await qdb.api.addRecord(tableId, recordData);
    return response.recordId;
}

// 2. Alternative QB API
else if (typeof QB !== 'undefined' && QB.api) {
    const response = await QB.api.addRecord(tableId, recordData);
    return response.recordId;
}

// 3. Session Client (may have CORS issues)
else if (typeof window.qbClient !== 'undefined' && window.qbClient.mode !== 'shim') {
    const response = await window.qbClient.post('records', {
        to: tableId,
        data: [recordData]
    });
    return response.data[0].id;
}
```

### Field Data Format
```javascript
// CORRECT: QuickBase field format
const recordData = {
    [fieldId]: { value: actualValue }
};

// Example:
const pricingRecord = {
    [7]: { value: 35000 },           // MSRP
    [8]: { value: 2000 },            // Discount
    [12]: { value: 'Toyota Camry' }  // Make
};
```

---

## 🔧 Best Practices

### 1. Version Control
- Always save version snapshots before major changes
- Use semantic versioning (1.0.0, 1.0.1, 1.1.0, 2.0.0)
- Include detailed change logs

### 2. Testing
- Validate code before deployment
- Test in QuickBase environment
- Use console logging for debugging

### 3. Security
- Validate user inputs
- Use environment variables for sensitive data
- Run security checks with `quickbase_validate_codepage`

### 4. Performance
- Minimize external dependencies
- Use CDN links for libraries
- Optimize code for QuickBase environment

### 5. Documentation
- Include description for all codepages
- Tag codepages for easy discovery
- Document target table IDs

---

## 🐛 Troubleshooting

### CORS Issues
- Always use `qdb.api` when available
- Avoid direct HTTP requests from codepages
- Use session client as fallback

### Authentication Errors
- Verify QB_USER_TOKEN is valid
- Check QB_REALM matches your environment
- Ensure proper permissions in QuickBase

### Deployment Failures
- Check table IDs are correct
- Verify field IDs match your schema
- Review logs for specific errors

### Version Control Issues
- Ensure version table exists
- Check codepage record ID is valid
- Verify version format (semantic versioning)

---

## 📚 Additional Resources

- **AGENTS.md**: Complete QuickBase integration patterns
- **CODEPAGE_TOOLS_GUIDE.md**: Detailed tool reference
- **examples/**: Sample codepages (ContactManager, TaskDashboard, etc.)
- **MyDealership.html**: Working example with pricing calculator

---

## 🎯 Example: Complete Deployment Workflow

```javascript
// Step 1: Validate the code
const validation = await quickbase_validate_codepage({
  code: myCodepageHTML,
  checkSyntax: true,
  checkAPIs: true,
  checkSecurity: true
});

if (!validation.isValid) {
  console.error('Validation failed:', validation.errors);
  return;
}

// Step 2: Deploy the codepage
const deployment = await quickbase_deploy_codepage({
  tableId: process.env.CODEPAGE_TABLE_ID,
  name: "My Calculator",
  code: myCodepageHTML,
  description: "Advanced pricing calculator",
  version: "1.0.0",
  tags: ["calculator", "pricing", "production"],
  dependencies: [
    "https://cdn.quickbase.com/static/lib/qdb.js",
    "https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"
  ],
  targetTableId: "bvhuaz8wz"
});

console.log('Deployed:', deployment.recordId);

// Step 3: Save version snapshot
await quickbase_save_codepage_version({
  tableId: process.env.CODEPAGE_VERSION_TABLE_ID,
  codepageRecordId: deployment.recordId,
  version: "1.0.0",
  code: myCodepageHTML,
  changeLog: "Initial release"
});

// Step 4: Test the deployment
const codepage = await quickbase_get_codepage({
  tableId: process.env.CODEPAGE_TABLE_ID,
  recordId: deployment.recordId
});

console.log('Deployment verified:', codepage);
```

---

## 🔄 Updates and Maintenance

### Check for Updates
```bash
git pull origin main
npm install
npm run build
```

### Rebuild MCP Server
```bash
npm run build
npm start
```

### Clean Build
```bash
rm -rf dist node_modules
npm install
npm run build
CODEPAGE_TABLE_ID=bltcpt7da  # Table for storing codepages
CODEPAGE_VERSION_TABLE_ID=bltcptv8z  # Table for version history