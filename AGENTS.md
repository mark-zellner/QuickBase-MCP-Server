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

## � Working QuickBase Integration Patterns (From Deal Sheet)

Based on the successful Deal Sheet implementation, here are the **proven working patterns** for QuickBase codepage integration:

### ✅ **API Priority Order (Working)**

When building QuickBase codepages, **always check APIs in this order**:

```javascript
// 1. QuickBase JavaScript API (qdb.api) - BEST OPTION, No CORS
if (typeof qdb !== 'undefined' && qdb.api) {
    const response = await qdb.api.addRecord(tableId, recordData);
    return response.recordId;
}

// 2. Alternative QB API (some environments use QB instead of qdb)
else if (typeof QB !== 'undefined' && QB.api) {
    const response = await QB.api.addRecord(tableId, recordData);
    return response.recordId;
}

// 3. Session Client (may have CORS issues in codepages)
else if (typeof window.qbClient !== 'undefined' && window.qbClient.mode !== 'shim') {
    const response = await window.qbClient.post('records', {
        to: tableId,
        data: [recordData]
    });
    return response.data[0].id;
}

// 4. Fallback error
else {
    throw new Error('No QuickBase API available');
}
```

### ✅ **Save to QuickBase - Working Pattern**

```javascript
async function saveToQuickBase(tableId, recordData) {
    try {
        // Debug: Check what APIs are available
        console.log('[QuickBase Debug] Available APIs:', {
            qdb: typeof qdb !== 'undefined',
            qdb_api: typeof qdb !== 'undefined' && qdb.api,
            QB: typeof QB !== 'undefined',
            qbClient: typeof window.qbClient !== 'undefined',
            qbClient_mode: window.qbClient?.mode
        });

        // Priority: qdb.api (no CORS issues)
        if (typeof qdb !== 'undefined' && qdb.api) {
            console.log('[QuickBase] Using qdb.api - BEST OPTION');
            const response = await qdb.api.addRecord(tableId, recordData);
            console.log('✅ Saved with qdb.api:', response.recordId);
            return { success: true, recordId: response.recordId };
        }

        // Alternative: QB.api
        else if (typeof QB !== 'undefined' && QB.api) {
            console.log('[QuickBase] Using QB.api');
            const response = await QB.api.addRecord(tableId, recordData);
            console.log('✅ Saved with QB.api:', response.recordId);
            return { success: true, recordId: response.recordId };
        }

        // Fallback: Session client (may have CORS)
        else if (typeof window.qbClient !== 'undefined' && window.qbClient.mode !== 'shim') {
            console.log('[QuickBase] Using session client (CORS possible)');
            const response = await window.qbClient.post('records', {
                to: tableId,
                data: [recordData]
            });
            console.log('✅ Saved with session client');
            return { success: true, data: response.data };
        }

        // No API available
        else {
            console.error('[QuickBase] No API available');
            return { success: false, error: 'No QuickBase API available' };
        }

    } catch (error) {
        console.error('❌ Save failed:', error);
        return { success: false, error: error.message };
    }
}
```

### ✅ **Look Up From QuickBase - Working Pattern**

```javascript
async function queryRecords(tableId, options = {}) {
    try {
        // Debug: Check available APIs
        console.log('[Query Debug] Available APIs:', {
            qdb: typeof qdb !== 'undefined',
            QB: typeof QB !== 'undefined',
            qbClient: typeof window.qbClient !== 'undefined'
        });

        // Priority: qdb.api
        if (typeof qdb !== 'undefined' && qdb.api) {
            console.log('[Query] Using qdb.api');
            const queryParams = {
                from: tableId,
                select: options.fields || [],
                where: options.where || '',
                top: options.limit || 100
            };
            const response = await qdb.api.queryRecords(queryParams);
            return response.records || [];
        }

        // Alternative: QB.api
        else if (typeof QB !== 'undefined' && QB.api) {
            console.log('[Query] Using QB.api');
            const queryParams = {
                from: tableId,
                select: options.fields || [],
                where: options.where || '',
                top: options.limit || 100
            };
            const response = await QB.api.queryRecords(queryParams);
            return response.records || [];
        }

        // Fallback: Session client
        else if (typeof window.qbClient !== 'undefined' && window.qbClient.mode !== 'shim') {
            console.log('[Query] Using session client');
            const queryParams = {
                from: tableId,
                select: options.fields || [],
                where: options.where || '',
                top: options.limit || 100
            };
            const response = await window.qbClient.get('records', queryParams);
            return response.data || [];
        }

        // No API available
        else {
            console.error('[Query] No API available');
            return [];
        }

    } catch (error) {
        console.error('❌ Query failed:', error);
        return [];
    }
}

// Usage Examples:
// Get all records
const allRecords = await queryRecords('bvhuaz8wz');

// Query with filter
const filteredRecords = await queryRecords('bvhuaz8wz', {
    where: "{6.EX.'John'}",  // Field 6 contains 'John'
    fields: [6, 7, 8]        // Return fields 6, 7, 8
});

// Get specific record by ID
const singleRecord = await queryRecords('bvhuaz8wz', {
    where: "{3.EX.'12345'}", // Record ID field
    top: 1
});
```

### ✅ **Field Data Format - Working Pattern**

```javascript
// CORRECT: QuickBase field format
const recordData = {
    [fieldId]: { value: actualValue }
};

// Examples:
const pricingRecord = {
    [7]: { value: 35000 },           // MSRP (number)
    [8]: { value: 2000 },            // Discount (number)
    [12]: { value: 'Toyota Camry' }, // Make (text)
    [13]: { value: 'Camry' }         // Model (text)
};
```

### ✅ **Error Handling - Working Pattern**

```javascript
async function safeQuickBaseOperation(operation, ...args) {
    try {
        const result = await operation(...args);
        if (result.success === false) {
            showError(`Operation failed: ${result.error}`);
            return null;
        }
        return result;
    } catch (error) {
        console.error('QuickBase operation error:', error);

        // Handle specific error types
        if (error.message.includes('CORS')) {
            showError('Network error - please refresh and try again');
        } else if (error.message.includes('401')) {
            showError('Authentication error - please log in again');
        } else if (error.message.includes('403')) {
            showError('Permission denied - contact administrator');
        } else {
            showError(`Error: ${error.message}`);
        }

        return null;
    }
}
```

### ✅ **Environment Detection - Working Pattern**

```javascript
function detectQuickBaseEnvironment() {
    const isInQuickBase = /quickbase\.com$/.test(location.hostname);
    const hasQdbApi = typeof qdb !== 'undefined' && qdb.api;
    const hasQbApi = typeof QB !== 'undefined' && QB.api;
    const hasSessionClient = typeof window.qbClient !== 'undefined';

    console.log('Environment detection:', {
        isInQuickBase,
        hasQdbApi,
        hasQbApi,
        hasSessionClient,
        sessionClientMode: window.qbClient?.mode
    });

    return {
        isInQuickBase,
        preferredApi: hasQdbApi ? 'qdb' : hasQbApi ? 'QB' : hasSessionClient ? 'session' : 'none'
    };
}
```

### ✅ **Key Lessons from Deal Sheet Success**

1. **API Priority**: `qdb.api` > `QB.api` > session client
2. **CORS Avoidance**: Use `qdb.api` whenever available
3. **Field IDs**: Always use numeric field IDs, never names
4. **Error Handling**: Comprehensive error catching with user-friendly messages
5. **Debug Logging**: Extensive console logging for troubleshooting
6. **Environment Awareness**: Code adapts to different QuickBase environments

### ✅ **Complete Working Example**

See `MyDealership.html` for a complete working implementation that:
- ✅ Saves pricing data to QuickBase
- ✅ Uses proper API priority order
- ✅ Handles CORS issues
- ✅ Provides user feedback
- ✅ Includes comprehensive error handling

**Status**: All patterns tested and working in production QuickBase environment.