# QuickBase MCP Server

[![Version](https://img.shields.io/badge/version-1.6.0-blue.svg)](CHANGELOG.md)
[![MCP Tools](https://img.shields.io/badge/MCP%20Tools-48-green.svg)](#mcp-tools)
[![Codepage Tools](https://img.shields.io/badge/Codepage%20Tools-14-orange.svg)](CODEPAGE_QUICK_REF.md)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-11%2F14%20passing-yellow.svg)](#testing)

A comprehensive QuickBase development toolkit consisting of:

1. **MCP Server** - Model Context Protocol server with 48 tools for AI-assisted QuickBase operations
2. **Codepage Development Platform** - Web-based IDE for creating and deploying QuickBase codepages
3. **Session Authentication Library** - Secure, token-free QuickBase integration

## 🎉 What's New in v1.6.0 - File Attachments & Bulk Operations!

### ✨ New Capabilities (7 New Tools!)
- **📎 File Attachment Management** - Upload, download, delete, and list file attachments (4 tools)
- **🔄 Enhanced Bulk Operations** - Upsert, bulk update, and bulk delete records (3 tools)
- **⚡ Improved Performance** - Batch operations reduce API calls and improve efficiency
- **💼 Business-Ready** - Tools designed for real-world document and data management

### 📎 File Management Features
- ✅ **Upload Files** - Attach documents, images, PDFs to records
- ✅ **Download Files** - Retrieve file attachments with version support
- ✅ **Delete Files** - Remove specific file versions
- ✅ **List Files** - View all file versions with metadata

### 🔄 Bulk Operation Features
- ✅ **Upsert Records** - Insert or update based on unique key
- ✅ **Bulk Updates** - Update multiple records in one operation
- ✅ **Bulk Deletes** - Delete multiple records using query filters
- ✅ **Error Handling** - Per-record error reporting

[📖 **v1.6.0 Full Documentation**](NEW_TOOLS_v1.6.0.md) | [⚡ **Quick Reference**](CODEPAGE_QUICK_REF.md) | [📝 **Changelog**](CHANGELOG.md)

---

## Overview

This repository provides three powerful tools for QuickBase development:

### 1. MCP Server
A Model Context Protocol server that provides maximum flexibility for QuickBase operations through AI assistants like Claude. Create tables, add fields, modify relationships, perform CRUD operations, **and now manage codepages with full version control**.

### 2. QuickBase Codepage Hero
A lightweight JavaScript library for building interactive QuickBase codepages. Deploy as a single codepage and use across all your QuickBase applications. **Now with v2.2 featuring pure session authentication - NO TOKENS REQUIRED!** ⭐

[📖 **Codepage Guide**](CLAUDE.md) | [🚀 **Deployment**](DEPLOYMENT.md) | [💡 **Example**](MyDealership.html) | [🔒 **Secure Version**](quickbase_codepage_hero_session.js)

### 3. Codepage Development Platform
A complete web-based development environment for creating, testing, and deploying QuickBase codepages with minimal technical expertise. Built for dealership staff and business users to develop interactive applications like pricing calculators.

[📖 **Platform Documentation**](platform/README.md) | [🚀 **Quick Start**](platform/README.md#-quick-start)

---

## QuickBase Codepage Hero

### What's New in v2.2 - Pure Session Authentication

- **⭐ ZERO TOKENS**: No app tokens, user tokens, or temporary tokens - 100% session-based
- **Maximum Security**: No credentials visible in codepage source code
- **User Permissions**: Each user's own QuickBase permissions automatically applied
- **Zero Configuration**: Deploy and use immediately - no token setup required
- **SSO Compatible**: Works with Single Sign-On environments
- **Simple API**: All CRUD operations with clean, intuitive methods

### Quick Start

**Deploy the library (2 minutes):**

1. Create a new codepage in your QuickBase app (pageID=3)
2. Copy [quickbase_codepage_hero_session.js](quickbase_codepage_hero_session.js) into the codepage
3. Save and you're done! **No tokens to configure.**

**Use in your codepages:**

```html
<script src="/db/YOUR_APP_ID?a=dbpage&pageID=3"></script>
<script>
// Test connection (optional)
await qbClient.testConnection('YOUR_TABLE_ID');

// Create a record - uses your session automatically!
async function saveData() {
    const result = await qbClient.createRecords('YOUR_TABLE_ID', [
        {
            6: { value: 'Toyota' },
            7: { value: 28000 }
        }
    ]);
    console.log('Saved!', result);
}

// Query records - your permissions applied
async function loadData() {
    const result = await qbClient.queryRecords('YOUR_TABLE_ID', {
        select: [3, 6, 7, 8],
        where: "{6.EX.'Toyota'}"
    });
    console.log('Records:', result.data);
}
</script>
```

### Example Application

[MyDealership.html](MyDealership.html) demonstrates a complete pricing calculator that:
- Loads vehicle data from QuickBase
- Performs complex calculations
- Saves results back to QuickBase
- Includes professional UI and error handling

**Try it**: Deploy to your app and access at:
```
https://YOUR_REALM.quickbase.com/db/YOUR_APP_ID?a=dbpage&pageID=2
```

### Features

✅ **Session-based authentication** - No tokens to manage
✅ **All CRUD operations** - Create, read, update, delete
✅ **Query & reporting** - Advanced filtering and sorting
✅ **Schema discovery** - Get tables, fields, and relationships
✅ **Automatic retries** - Handles network issues gracefully
✅ **TypeScript-ready** - Full type definitions available
✅ **Zero dependencies** - Pure JavaScript, works everywhere

### Documentation

- [CLAUDE.md](CLAUDE.md) - Complete API reference and development guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Step-by-step deployment instructions
- [guides/Quickbase_Session_Auth_Codepage.md](guides/Quickbase_Session_Auth_Codepage.md) - Authentication details
- [guides/CODEPAGE_HERO_OPTIONS.md](guides/CODEPAGE_HERO_OPTIONS.md) - Advanced configuration

---

## MCP Server

### Features

#### Application Management
- Get application information
- List all tables
- Test connection

#### Table Operations
- Create new tables
- Get table information
- Update table properties
- Delete tables

#### Field Management
- Get all fields for a table
- Create new fields (all types supported)
- Update existing fields
- Delete fields
- Support for lookups, formulas, relationships

#### Record Operations
- Query records with filtering and sorting
- Get specific records
- Create single or multiple records
- Update existing records
- Delete records
- Search records by text
- Bulk operations

#### Relationship Management
- Create parent-child relationships
- Get existing relationships
- Foreign key management

#### Utility Functions
- Get and run reports
- Advanced querying capabilities
- Error handling and retry logic

## Installation

1. **Clone and setup the server:**
```bash
cd quickbase-mcp-server
npm install
```

2. **Copy environment configuration:**
```bash
cp env.example .env
```

3. **Configure your QuickBase credentials in `.env`:**
```bash
# QuickBase Configuration
QB_REALM=yourname.quickbase.com
QB_USER_TOKEN=your_quickbase_user_token_here
QB_APP_ID=yourid

# Optional: Default settings
QB_DEFAULT_TIMEOUT=30000
QB_MAX_RETRIES=3

# MCP Server Configuration
MCP_SERVER_NAME=quickbase-mcp
MCP_SERVER_VERSION=1.0.0
```

4. **Build the project:**
```bash
npm run build
```

## Getting Your QuickBase User Token

1. Go to QuickBase → My Apps → User Account
2. Click "Manage user tokens"
3. Click "New user token"
4. Give it a name like "MCP Server"
5. Set appropriate permissions
6. Copy the token to your `.env` file

## Usage

### Run the server standalone:
```bash
npm start
```

### Add to your MCP client configuration:

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "quickbase": {
      "command": "node",
      "args": ["/absolute/path/to/quickbase-mcp-server/dist/index.js"],
      "env": {
        "QB_REALM": "yourname.quickbase.com",
        "QB_USER_TOKEN": "your_token_here",
        "QB_APP_ID": "yourid"
      }
    }
  }
}
```

> Tip: Run `npm run build` first so that `dist/index.js` exists. On Windows use a path such as `C:/Users/you/QuickBase-MCP-Server/dist/index.js` in the `args` array.

## Available Tools (48 Total)

### Application Tools (3)
- `quickbase_get_app_info` - Get application information
- `quickbase_get_tables` - List all tables
- `quickbase_test_connection` - Test connection

### Table Tools (3)
- `quickbase_create_table` - Create new table
- `quickbase_get_table_info` - Get table details
- `quickbase_delete_table` - Delete table

### Field Tools (4)
- `quickbase_get_table_fields` - Get all fields
- `quickbase_create_field` - Create new field
- `quickbase_update_field` - Update existing field
- `quickbase_delete_field` - Delete field

### Record Tools (7)
- `quickbase_query_records` - Query with filters/sorting
- `quickbase_get_record` - Get specific record
- `quickbase_create_record` - Create new record
- `quickbase_update_record` - Update existing record
- `quickbase_delete_record` - Delete record
- `quickbase_bulk_create_records` - Create multiple records
- `quickbase_search_records` - Search by text

### 🆕 File Attachment Tools (4) - NEW in v1.6.0
- `quickbase_upload_file` - Upload file to attachment field
- `quickbase_download_file` - Download file from attachment field
- `quickbase_delete_file` - Delete specific file version
- `quickbase_list_files` - List all file versions

### 🆕 Bulk Operations (3) - NEW in v1.6.0
- `quickbase_upsert_records` - Insert or update based on unique key
- `quickbase_bulk_update_records` - Update multiple records at once
- `quickbase_bulk_delete_records` - Delete multiple records by query

### Relationship Tools (7)
- `quickbase_create_relationship` - Create table relationship
- `quickbase_get_relationships` - Get existing relationships
- `quickbase_create_advanced_relationship` - Create with auto-lookup fields
- `quickbase_create_lookup_field` - Create lookup field
- `quickbase_validate_relationship` - Validate relationship integrity
- `quickbase_get_relationship_details` - Get detailed relationship info
- `quickbase_create_junction_table` - Create many-to-many junction table

### Codepage Management Tools (14)
- `quickbase_save_codepage` - Save codepage (simple)
- `quickbase_get_codepage` - Retrieve codepage
- `quickbase_list_codepages` - List all codepages
- `quickbase_execute_codepage` - Get execution metadata
- `quickbase_deploy_codepage` - Deploy with full metadata
- `quickbase_update_codepage` - Update existing codepage
- `quickbase_search_codepages` - Search by name/tags/table
- `quickbase_clone_codepage` - Clone and modify
- `quickbase_validate_codepage` - Validate syntax/API/security
- `quickbase_export_codepage` - Export as HTML/JSON/Markdown
- `quickbase_import_codepage` - Import from various formats
- `quickbase_save_codepage_version` - Save version snapshot
- `quickbase_get_codepage_versions` - Get version history
- `quickbase_rollback_codepage` - Rollback to previous version

### Utility Tools (2)
- `quickbase_get_reports` - Get all reports
- `quickbase_run_report` - Run specific report

### Auth Tools (1)
- `quickbase_initiate_oauth` - Initiate OAuth PKCE flow

---

## Example Usage

### Create a new table:
```json
{
  "name": "quickbase_create_table",
  "arguments": {
    "name": "New Projects",
    "description": "Project tracking table"
  }
}
```

### Add a field to a table:
```json
{
  "name": "quickbase_create_field",
  "arguments": {
    "tableId": "bu65pc8px",
    "label": "Project Status",
    "fieldType": "text_choice",
    "choices": ["Planning", "Active", "Complete", "On Hold"],
    "required": true
  }
}
```

### Query records with filtering:
```json
{
  "name": "quickbase_query_records",
  "arguments": {
    "tableId": "bu65pc8px",
    "where": "{6.EX.'John'}",
    "top": 10,
    "sortBy": [{"fieldId": 3, "order": "DESC"}]
  }
}
```

### Create a new record:
```json
{
  "name": "quickbase_create_record",
  "arguments": {
    "tableId": "bu65pc8px",
    "fields": {
      "6": {"value": "John Doe"},
      "7": {"value": "123 Main St"},
      "8": {"value": "john@example.com"}
    }
  }
}
```

## Field Types Supported

- `text` - Single line text
- `text_choice` - Single choice dropdown
- `text_multiline` - Multi-line text
- `richtext` - Rich text editor
- `numeric` - Number field
- `currency` - Currency field
- `percent` - Percentage field
- `date` - Date field
- `datetime` - Date/time field
- `checkbox` - Checkbox field
- `email` - Email field
- `phone` - Phone number field
- `url` - URL field
- `address` - Address field
- `file` - File attachment
- `lookup` - Lookup from another table
- `formula` - Calculated field
- `reference` - Table reference

## Development

### Run in development mode:
```bash
npm run dev
```

### Run tests:
```bash
npm test
```

## Troubleshooting

### Common Issues

1. **Authentication Error**
   - Check your user token is correct
   - Verify token permissions include your app
   - Ensure realm hostname is correct

2. **Table/Field Not Found**
   - Verify table/field IDs are correct
   - Check if you have permissions to access

3. **Field Creation Fails**
   - Check field type is supported
   - Verify choices are provided for choice fields
   - Ensure formula syntax is correct for formula fields

4. **Pricing Tool Save Fails (MCP)**
  - Confirm `PRICING_TABLE_ID` is set or pass `tableId` argument explicitly
  - Verify user token has access to pricing table
  - Check field mapping (MSRP → 7, Final Price → 11)

5. **Codepage Works But MCP Fails**
  - Likely auth difference: session vs token; see `AUTH_DIFFERENCES.md`
  - Ensure headers include `QB-Realm-Hostname`

6. **"Self-signed certificate in certificate chain"**
  - Export your corporate proxy/root certificate to a PEM file and reference it with `NODE_EXTRA_CA_CERTS=/path/to/root.pem` when running the server or tests (for example, `NODE_EXTRA_CA_CERTS=C:/certs/corp-root.pem npm test`).
  - Keep TLS verification enabled; avoid `NODE_TLS_REJECT_UNAUTHORIZED=0` except for temporary diagnostics, as QuickBase requires validated HTTPS.
  - See the [QuickBase Security & Compliance](https://developer.quickbase.com/platform/security) documentation for details on TLS requirements.

### Auth Context Differences
See `AUTH_DIFFERENCES.md` for a full comparison of session vs token authentication and when to use each path.

### Enable Debug Logging
Set environment variable:
```bash
DEBUG=quickbase-mcp:*
```

### Implementation Notes

This server provides the maximum flexibility for QuickBase operations by:

1. **Direct API Access** - Uses QuickBase REST API v1 directly
2. **Complete Field Support** - Supports all QuickBase field types
3. **Relationship Management** - Can create and manage table relationships
4. **Bulk Operations** - Efficient bulk record operations
5. **Advanced Querying** - Full QuickBase query syntax support
6. **Error Handling** - Comprehensive error handling and retry logic

---

## Codepage Development Platform

The **QuickBase Codepage Development Platform** is a full-featured web-based IDE specifically designed for creating, testing, and deploying QuickBase codepages. It empowers business users and dealership staff to build interactive applications without deep technical expertise.

### Key Features

- **Template-Based Development** - Pre-built templates for common use cases (pricing calculators, inventory managers, customer forms)
- **Monaco Code Editor** - Professional code editing with syntax highlighting and QuickBase API autocomplete
- **Secure Sandbox Testing** - Test codepages safely without affecting production data
- **Schema Management** - Visual interface for managing QuickBase tables, fields, and relationships
- **Version Control** - Git-like version control with branching, merging, and conflict resolution
- **Deployment Pipeline** - Multi-environment deployment (dev/staging/production) with rollback capabilities
- **Real-time Collaboration** - WebSocket-based collaboration for team development
- **Performance Analytics** - Monitor codepage performance and usage patterns

### Architecture

**Backend Stack:**
- Node.js + Express + TypeScript
- JWT authentication with role-based access control
- VM2 sandbox for secure code execution
- Redis for session management (production)
- QuickBase MCP Server integration

**Frontend Stack:**
- React + TypeScript + Material-UI
- Monaco Editor integration
- React Query for state management
- WebSocket for real-time features

### Quick Start

```bash
cd platform
cp .env.example .env
# Edit .env with your QuickBase credentials
./start.sh
```

The platform will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api

### Use Cases

**Vehicle Pricing Calculator** - Interactive pricing tool for car dealerships with:
- Real-time inventory integration
- Dynamic options and upgrades
- Discount and incentive calculations
- Financing calculations
- Quote generation and saving

**Inventory Management** - Custom inventory tracking with:
- Real-time stock updates
- Custom business logic
- Automated workflows

**Custom Business Applications** - Build any QuickBase application with:
- Complex calculations
- Data validation
- Integration with external APIs
- Custom user interfaces

### Documentation

Comprehensive documentation is available in the platform directory:

- [Installation Guide](platform/docs/INSTALLATION.md)
- [User Guide](platform/docs/USER_GUIDE.md)
- [API Documentation](platform/docs/API.md)
- [Deployment Guide](platform/docs/DEPLOYMENT.md)
- [Troubleshooting](platform/docs/TROUBLESHOOTING.md)

### Current Status

The platform implementation is complete with full feature set including:
- ✅ Complete backend API with authentication and authorization
- ✅ Frontend React application with all major components
- ✅ Template system with pre-built dealership templates
- ✅ Secure sandbox testing environment
- ✅ Schema management with relationship support
- ✅ Version control and deployment pipeline
- ✅ Comprehensive documentation
- ✅ Backend compiles successfully with TypeScript
- ✅ Shared type definitions completed

**Development Status**: Most TypeScript compilation issues have been resolved. The backend compiles successfully. Frontend has minor type issues primarily related to unused imports and some test files that need updating to match component interfaces.

---

## Repository Structure

```
QuickBase-MCP-Server/
├── src/                    # MCP Server source code
├── platform/               # Codepage Development Platform
│   ├── backend/           # Node.js/Express API server
│   ├── frontend/          # React application
│   ├── shared/            # Shared TypeScript types
│   ├── docs/              # Platform documentation
│   └── README.md          # Platform documentation
├── examples/              # Example codepages and usage
└── README.md             # This file
```

## License

MIT License 
