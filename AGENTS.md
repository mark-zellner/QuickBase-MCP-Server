# QuickBase MCP Server - Agent Instructions

## Overview

This is a Model Context Protocol (MCP) server providing full QuickBase database operations to AI agents. It enables agents to create tables, manage fields, query records, and handle relationships through standardized MCP tools.

## Architecture

- **Server**: TypeScript MCP server using `@modelcontextprotocol/sdk`
- **API Client**: Axios wrapper for QuickBase REST API v1
- **Tools**: Zod-validated MCP tools for all QuickBase operations
- **Transport**: Stdio-based communication with MCP clients

## Key Components

### MCP Server (`src/index.ts`)
- Handles tool listing and execution
- Routes requests to QuickBaseClient methods
- Returns JSON responses

### QuickBase Client (`src/quickbase/client.ts`)
- Axios instance with QuickBase-specific headers
- Request/response logging via interceptors
- Methods for apps, tables, fields, records

### Tools (`src/tools/index.ts`)
- Zod schemas for parameter validation
- Tool definitions with descriptions
- Support for all QuickBase field types

### Types (`src/types/quickbase.ts`)
- Zod enums for field types
- Interface definitions for QuickBase objects

## Data Flow

Agent Request → MCP Protocol → Server Handler → QuickBaseClient → HTTP API → QuickBase → Response

## Configuration

Required environment variables:
- `QB_REALM`: Your QuickBase realm hostname
- `QB_USER_TOKEN`: QuickBase user token
- `QB_APP_ID`: Application ID

Optional:
- `QB_DEFAULT_TIMEOUT`: Request timeout (default 30000ms)
- `QB_MAX_RETRIES`: Retry attempts (default 3)

## Development Workflow

### Setup
```bash
npm install
cp env.example .env
# Configure .env with your credentials
npm run setup
```

### Build & Run
```bash
npm run build    # Compile TypeScript
npm start        # Run server
npm run dev      # Development with watch mode
```

### Testing
```bash
npm test         # Basic API test
npm run test:jest # Unit tests
```

## QuickBase Specifics

### Identifiers
- **Table IDs**: String format like "bu65pc8px" (not names)
- **Field IDs**: Numeric IDs (not labels)
- **Record IDs**: Auto-generated numbers

### Field Types
Supported: text, numeric, date, checkbox, email, phone, url, file, lookup, formula, reference, etc.

### Authentication
Uses QB-USER-TOKEN in Authorization header with realm hostname.

### API Patterns
- GET for queries, POST for creation, PATCH for updates, DELETE for removal
- JSON payloads with fieldId: value pairs for records
- Query filtering using QuickBase syntax

## Tool Usage Examples

### Query Records
```json
{
  "tableId": "bu65pc8px",
  "select": [6, 7, 8],
  "where": "{6.EX.'Search Term'}",
  "top": 100
}
```

### Create Record
```json
{
  "tableId": "bu65pc8px",
  "fields": {
    "6": "John Doe",
    "7": "john@example.com",
    "8": 25
  }
}
```

### Create Field
```json
{
  "tableId": "bu65pc8px",
  "label": "Status",
  "fieldType": "text_choice",
  "choices": ["Active", "Inactive", "Pending"]
}
```

## Error Handling

- Network errors logged via axios interceptors
- Validation errors from Zod schemas
- QuickBase API errors returned as MCP errors
- Timeouts and retries configurable

## Integration Points

- **QuickBase API**: `https://api.quickbase.com/v1/`
- **MCP Clients**: Claude Desktop, other MCP-compatible apps
- **Dependencies**: axios, zod, dotenv, @modelcontextprotocol/sdk

## Best Practices

- Always use table/field IDs, never names
- Handle pagination with `skip` and `top` parameters
- Use proper field types for data integrity
- Test connections before bulk operations
- Log API calls for debugging

## Reference Files

- `src/index.ts`: Server implementation
- `src/quickbase/client.ts`: API client
- `src/tools/index.ts`: Tool definitions
- `src/types/quickbase.ts`: Data schemas