# Claude Code - QuickBase Codepage Development Guide

This repository contains tools and workflows for developing QuickBase codepages with AI assistance.

## Overview

This project enables rapid development of interactive QuickBase applications (codepages) that can load and save data from all tables within a QuickBase app, using session-based authentication.

## Key Components

### 1. QuickBase Codepage Hero Library

**File**: [quickbase_codepage_hero.js](quickbase_codepage_hero.js)

A robust JavaScript client library for QuickBase API operations using temporary token authentication. This library should be deployed as a QuickBase codepage (pageID=3 in the example).

**Features**:
- Session-based authentication (no user tokens required)
- Automatic token caching and refresh
- Retry logic with exponential backoff
- Support for all CRUD operations
- Query, report execution, schema discovery

**Authentication Strategy**:
1. Requests temporary token using user's session cookies
2. Caches token for 5 minutes to minimize API calls
3. Automatically refreshes expired tokens
4. No CORS issues when used within QuickBase codepages

### 2. MyDealership Example Application

**File**: [MyDealership.html](MyDealership.html)

A fully-featured car dealership pricing calculator demonstrating:
- Dynamic vehicle pricing calculations
- QuickBase integration for saving results
- Resilient client library loading with multiple fallback strategies
- Professional UI with Material Design principles

## Quick Start

### Step 1: Deploy the Client Library

1. Open your QuickBase app
2. Navigate to Pages > Code Pages
3. Create or edit pageID=3
4. Copy the entire contents of `quickbase_codepage_hero.js`
5. Paste into the codepage editor
6. Save the codepage

### Step 2: Deploy Your Application

1. Create a new codepage (e.g., pageID=2)
2. Copy the contents of `MyDealership.html`
3. Update the CONFIG section with your table and field IDs:

```javascript
const CONFIG = {
    pricingTableId: 'YOUR_TABLE_ID',
    vehiclesTableId: 'YOUR_VEHICLES_TABLE_ID',
    fields: {
        relatedVehicle: 6,
        msrp: 7,
        discount: 8,
        // ... your field IDs
    }
};
```

4. Save and access via: `https://YOUR_REALM.quickbase.com/db/YOUR_APP_ID?a=dbpage&pageID=2`

### Step 3: Test the Integration

1. Open your codepage in QuickBase
2. Open browser console (F12)
3. Look for: `[QuickBase Codepage Hero] v2.0.0 - Temporary token client initialized`
4. Fill out the pricing form
5. Click "Calculate Pricing"
6. Click "Save to QuickBase"
7. Verify the record was created in your table

## Client Library API Reference

### Initialization

The library auto-initializes when loaded and exports multiple global objects:

```javascript
window.qbClient      // Main client instance (recommended)
window.client        // Alias
window.Client        // Constructor class
window.QuickBaseClient // Constructor class
```

### Core Methods

#### Create Records
```javascript
await qbClient.createRecords(tableId, records);

// Example
await qbClient.createRecords('bvhuaz8wz', [
    {
        6: { value: 'Toyota' },
        7: { value: 28000 }
    }
]);
```

#### Query Records
```javascript
await qbClient.queryRecords(tableId, options);

// Example
const results = await qbClient.queryRecords('bvhuaz8wz', {
    select: [6, 7, 8],
    where: "{6.EX.'Toyota'}"
});
```

#### Update Records
```javascript
await qbClient.updateRecords(tableId, records);

// Example
await qbClient.updateRecords('bvhuaz8wz', [
    {
        3: { value: 42 }, // Record ID
        7: { value: 29000 }
    }
]);
```

#### Delete Records
```javascript
await qbClient.deleteRecords(tableId, recordIds);

// Example
await qbClient.deleteRecords('bvhuaz8wz', [42, 43, 44]);
```

#### Get Fields
```javascript
const fields = await qbClient.getFields(tableId);
```

#### Get Tables
```javascript
const tables = await qbClient.getTables(appId);
```

#### Get Reports
```javascript
const reports = await qbClient.getReports(tableId);
```

#### Run Report
```javascript
const results = await qbClient.runReport(tableId, reportId, {
    skip: 0,
    top: 100
});
```

## Loading All Tables in an App

To create a codepage that can load and save to all tables:

```javascript
// Get app ID from URL or config
const APP_ID = 'bvhuaz7pn';

// Load all tables
const tables = await qbClient.getTables(APP_ID);

// Populate a dropdown
const tableSelect = document.getElementById('tableSelect');
tables.forEach(table => {
    const option = document.createElement('option');
    option.value = table.id;
    option.textContent = table.name;
    tableSelect.appendChild(option);
});

// When user selects a table, load its fields
tableSelect.addEventListener('change', async (e) => {
    const tableId = e.target.value;
    const fields = await qbClient.getFields(tableId);

    console.log('Fields:', fields);
    // Render form based on fields
});

// Save to selected table
async function saveRecord(tableId, fieldValues) {
    const recordData = {};

    // Build record data from form
    Object.entries(fieldValues).forEach(([fieldId, value]) => {
        recordData[fieldId] = { value: value };
    });

    const result = await qbClient.createRecords(tableId, [recordData]);
    console.log('Created record:', result);
}
```

## Troubleshooting

### Error: "window.qbClient.post is not a function"

**Cause**: The client library failed to load properly.

**Solutions**:
1. Verify pageID=3 contains the exact code from `quickbase_codepage_hero.js`
2. Check browser console for syntax errors
3. Ensure the codepage is a "JavaScript" type, not "HTML"
4. Clear browser cache and reload

### Error: "Failed to get temporary token: 401"

**Cause**: User session expired or insufficient permissions.

**Solutions**:
1. Refresh the page to establish a new session
2. Verify the user has access to the table
3. Check that the table ID is correct

### Error: "HTTP 403: Forbidden"

**Cause**: User lacks permissions for the operation.

**Solutions**:
1. Grant user appropriate role permissions
2. Check table-level permissions
3. Verify field-level permissions for restricted fields

### Error: "Uncaught SyntaxError: Unexpected identifier"

**Cause**: The codepage HTML wrapper is interfering with JavaScript parsing.

**Solutions**:
1. Ensure the codepage at pageID=3 contains ONLY JavaScript (no HTML tags)
2. Remove any `<script>` tags from the codepage
3. Copy the exact contents of `quickbase_codepage_hero.js` without modifications

## Using QuickBase MCP

This repository includes a QuickBase MCP (Model Context Protocol) server for enhanced AI integration:

```bash
# List available MCP resources
mcp list-resources --server quickbase

# Query QuickBase via MCP
mcp invoke --server quickbase --tool query-records \
  --params '{"tableId": "bvhuaz8wz", "select": [6, 7, 8]}'
```

See [guides/Authentication_Best_Practices.md](guides/Authentication_Best_Practices.md) for details.

## Development Workflow with Claude Code

### 1. Understanding the Codebase

Ask Claude Code to explore:
```
Explore the QuickBase codepage structure and explain how authentication works
```

### 2. Adding New Features

```
Add a feature to MyDealership.html that loads all vehicles from the Vehicles
table and populates the dropdown dynamically
```

### 3. Debugging Issues

```
The save function is failing with a 403 error. Debug the issue and suggest fixes.
```

### 4. Creating New Codepages

```
Create a new codepage for managing inventory that can:
1. Load all tables in the app
2. Display records from the selected table
3. Allow inline editing
4. Save changes back to QuickBase
```

## Best Practices

### 1. Always Use Temporary Token Authentication

Never embed user tokens or app tokens in codepages. Always use the session-based temporary token approach.

### 2. Cache Tokens Appropriately

The client library caches tokens for 5 minutes. Don't request new tokens for every API call.

### 3. Handle Errors Gracefully

```javascript
try {
    await qbClient.createRecords(tableId, records);
    showSuccess('Record saved!');
} catch (error) {
    console.error('Save failed:', error);
    showError(`Failed to save: ${error.message}`);
}
```

### 4. Validate Input Before Saving

```javascript
function validatePricingData(data) {
    if (!data.msrp || data.msrp <= 0) {
        throw new Error('MSRP must be greater than 0');
    }
    if (data.discount < 0) {
        throw new Error('Discount cannot be negative');
    }
    // ... more validations
}
```

### 5. Use Field IDs, Not Field Names

Always reference fields by their numeric ID, not by name:

```javascript
// Good
recordData[7] = { value: 28000 };

// Bad (won't work)
recordData['MSRP'] = { value: 28000 };
```

### 6. Test in Development First

Create a development copy of your app and test there first before deploying to production.

## Advanced Topics

### Dynamic Schema Discovery

Build forms dynamically based on table schema:

```javascript
async function buildFormForTable(tableId) {
    const fields = await qbClient.getFields(tableId);
    const form = document.getElementById('dynamicForm');

    fields.forEach(field => {
        if (field.mode === 'user' || field.mode === 'normal') {
            const input = createInputForField(field);
            form.appendChild(input);
        }
    });
}

function createInputForField(field) {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = field.label;

    const input = document.createElement('input');
    input.id = `field_${field.id}`;
    input.type = getInputType(field.fieldType);
    input.required = field.required;

    wrapper.appendChild(label);
    wrapper.appendChild(input);

    return wrapper;
}
```

### Batch Operations

Process multiple records efficiently:

```javascript
async function batchUpdate(tableId, updates) {
    const BATCH_SIZE = 100;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        await qbClient.updateRecords(tableId, batch);

        // Update progress
        const progress = Math.min(100, ((i + batch.length) / updates.length) * 100);
        updateProgressBar(progress);
    }
}
```

### Real-time Updates with Polling

```javascript
let pollInterval;

function startPolling(tableId) {
    pollInterval = setInterval(async () => {
        const records = await qbClient.queryRecords(tableId, {
            select: [3, 6, 7, 8],
            where: "{5.AFT.'today'}",
            top: 10
        });

        updateDashboard(records);
    }, 5000); // Poll every 5 seconds
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}
```

## Resources

- [QuickBase API Documentation](https://developer.quickbase.com/operation/insertUpdateRecords)
- [Authentication Best Practices](guides/Authentication_Best_Practices.md)
- [Session Authentication Guide](guides/Quickbase_Session_Auth_Codepage.md)
- [Codepage Hero Options](guides/CODEPAGE_HERO_OPTIONS.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the console logs for detailed error messages
3. Consult the QuickBase API documentation
4. Ask Claude Code for help with specific issues

## License

MIT License - See [LICENSE](LICENSE) for details.
