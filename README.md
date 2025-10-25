# QuickBase MCP Server

A comprehensive QuickBase development toolkit consisting of:

1. **MCP Server** - Model Context Protocol server for AI-assisted QuickBase operations
2. **Codepage Development Platform** - Web-based IDE for creating and deploying QuickBase codepages

## Overview

This repository provides two powerful tools for QuickBase development:

### MCP Server
A Model Context Protocol server that provides maximum flexibility for QuickBase operations through AI assistants like Claude. Create tables, add fields, modify relationships, and perform all QuickBase operations through MCP tools.

### Codepage Development Platform
A complete web-based development environment for creating, testing, and deploying QuickBase codepages with minimal technical expertise. Built for dealership staff and business users to develop interactive applications like pricing calculators.

[📖 **Platform Documentation**](platform/README.md) | [🚀 **Quick Start**](platform/README.md#-quick-start)

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
      "args": ["/path/to/quickbase-mcp-server/dist/index.js"],
      "env": {
        "QB_REALM": "yourname.quickbase.com",
        "QB_USER_TOKEN": "your_token_here",
        "QB_APP_ID": "yourid"
      }
    }
  }
}
```

## Available Tools

### Application Tools
- `quickbase_get_app_info` - Get application information
- `quickbase_get_tables` - List all tables
- `quickbase_test_connection` - Test connection

### Table Tools
- `quickbase_create_table` - Create new table
- `quickbase_get_table_info` - Get table details
- `quickbase_delete_table` - Delete table

### Field Tools
- `quickbase_get_table_fields` - Get all fields
- `quickbase_create_field` - Create new field
- `quickbase_update_field` - Update existing field
- `quickbase_delete_field` - Delete field

### Record Tools
- `quickbase_query_records` - Query with filters/sorting
- `quickbase_get_record` - Get specific record
- `quickbase_create_record` - Create new record
- `quickbase_update_record` - Update existing record
- `quickbase_delete_record` - Delete record
- `quickbase_bulk_create_records` - Create multiple records
- `quickbase_search_records` - Search by text

### Relationship Tools
- `quickbase_create_relationship` - Create table relationship
- `quickbase_get_relationships` - Get existing relationships

### Utility Tools
- `quickbase_get_reports` - Get all reports
- `quickbase_run_report` - Run specific report

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
