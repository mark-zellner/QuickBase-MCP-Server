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

---

## 🔐 Session Authentication for Codepages

**IMPORTANT**: When building QuickBase codepages, **ALWAYS use session authentication** - **NEVER use user tokens** in embedded codepages.

### Why Session Auth?

- **Automatic**: No manual token management when embedded in QuickBase
- **Secure**: Tied to user's active session
- **Seamless**: Works transparently when codepage is loaded
- **Best Practice**: Industry standard for embedded applications

### ❌ NEVER Use User Tokens in Codepages

```javascript
// WRONG - Don't do this in codepages
const response = await fetch('https://api.quickbase.com/v1/records', {
    headers: {
        'Authorization': `QB-USER-TOKEN ${userToken}`, // ❌ BAD
        'QB-Realm-Hostname': realm
    }
});
```

### ✅ CORRECT - Use Session Authentication

```javascript
// CORRECT - Session auth in codepages
(function loadQuickBaseClient(){
    const IS_QB = /quickbase\.com$/i.test(location.hostname);
    const CODEPAGE = '/db/[realm]?a=dbpage&pageID=[hero_page_id]';
    const LOCAL = 'quickbase_codepage_hero.js';

    // ... resilient loader implementation ...

    (async function run(){
        if (IS_QB) {
            if (await attemptScript(CODEPAGE) && exportClient('script')) return;
            // ... other strategies ...
        }
        // ... fallback to shim ...
    })();
})();

// Then use the client
async function saveData(tableId, recordData) {
    if (typeof window.qbClient !== 'undefined' && window.qbClient.mode !== 'shim') {
        const client = new window.qbClient();
        return await client.post('records', {
            to: tableId,
            data: [recordData]
        });
    }
}
```

### Codepage Hero Deployment

1. **Deploy Codepage Hero**: Create a separate QuickBase codepage with `quickbase_codepage_hero.js`
2. **Note Page ID**: Record the assigned page ID (e.g., pageID=3)
3. **Reference in Code**: Use `/db/[realm]?a=dbpage&pageID=[id]` in your codepage

### Save Data Example

```javascript
const FIELD_IDS = {
    name: 6,
    email: 7,
    amount: 8
};

async function saveToQuickBase() {
    const recordData = {
        [FIELD_IDS.name]: { value: 'John Doe' },
        [FIELD_IDS.email]: { value: 'john@example.com' },
        [FIELD_IDS.amount]: { value: 150.00 }
    };

    try {
        const client = new window.qbClient();
        const response = await client.post('records', {
            to: 'your_table_id',
            data: [recordData]
        });
        console.log('Saved successfully:', response);
    } catch (error) {
        console.error('Save failed:', error);
    }
}
```

### Look Up Data Example

```javascript
async function findRecords(tableId, searchTerm) {
    const client = new window.qbClient();
    const response = await client.get('records', {
        from: tableId,
        where: `{6.EX.'${searchTerm}'}`, // Field 6 contains search term
        select: [6, 7, 8] // Return specific fields
    });
    return response.data;
}
```

### Key Takeaways

- **Session Auth Only**: Never use user tokens in codepages
- **Codepage Hero**: Deploy as separate codepage, reference by pageID
- **Field IDs**: Always use numeric field IDs, never names
- **Error Handling**: Check if client is available before using
- **Environment Aware**: Code works in both QuickBase and development

See `MyDealership.html` for a complete working example of session authentication in a codepage.