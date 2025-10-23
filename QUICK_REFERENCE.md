# QuickBase MCP Server - Quick Reference Guide

## Tool Overview by Category

### Application Tools (3)
```
quickbase_get_app_info          - Returns app metadata
quickbase_get_tables            - Lists all tables in app
quickbase_test_connection       - Validates API connectivity
```

### Table Tools (3)
```
quickbase_create_table(name, description?)          - Returns tableId
quickbase_get_table_info(tableId)                   - Returns table metadata
quickbase_delete_table(tableId)                     - Removes table
```

### Field Tools (4)
```
quickbase_get_table_fields(tableId)                 - Lists all fields
quickbase_create_field(tableId, label, fieldType, required?, unique?, choices?, formula?, lookupTableId?, lookupFieldId?)
quickbase_update_field(tableId, fieldId, label?, required?, choices?)
quickbase_delete_field(tableId, fieldId)
```

**Supported Field Types**: text, text_choice, text_multiline, richtext, numeric, currency, percent, rating, date, datetime, timeofday, duration, checkbox, user, multiselect, email, phone, url, address, file, lookup, summary, formula, reference, autonumber

### Record Tools (7)
```
quickbase_query_records(tableId, select?, where?, sortBy?, top?, skip?)
  - where: QuickBase query syntax {fieldId.OPERATOR.'value'}
  - sortBy: [{fieldId: number, order: 'ASC'|'DESC'}]
  
quickbase_get_record(tableId, recordId, fieldIds?)
quickbase_create_record(tableId, fields: {fieldId: value})
quickbase_update_record(tableId, recordId, fields: {fieldId: {value: newValue}})
quickbase_delete_record(tableId, recordId)
quickbase_bulk_create_records(tableId, records: [{fields: {...}}])
quickbase_search_records(tableId, searchTerm, fieldIds?)
```

### Relationship Tools (7)
```
quickbase_create_relationship(parentTableId, childTableId, foreignKeyFieldId)
quickbase_get_relationships(tableId)

quickbase_create_advanced_relationship(parentTableId, childTableId, referenceFieldLabel, lookupFields?, relationshipType?)
  - relationshipType: 'one-to-many' | 'many-to-many'
  - lookupFields: [{parentFieldId, childFieldLabel}]
  
quickbase_create_lookup_field(childTableId, parentTableId, referenceFieldId, parentFieldId, lookupFieldLabel)
quickbase_validate_relationship(parentTableId, childTableId, foreignKeyFieldId)
  - Returns: {isValid, issues: string[], orphanedRecords: number}
  
quickbase_get_relationship_details(tableId, includeFields?)
quickbase_create_junction_table(junctionTableName, table1Id, table2Id, table1FieldLabel, table2FieldLabel, additionalFields?)
```

### Report Tools (2)
```
quickbase_get_reports(tableId)                      - Lists all reports
quickbase_run_report(reportId, tableId)             - Executes report
```

### Codepage Tools (4)
```
quickbase_save_codepage(tableId, name, code, description?)          - Returns recordId
quickbase_get_codepage(tableId, recordId)                           - Returns codepage record
quickbase_list_codepages(tableId, limit?)                           - Lists codepages
quickbase_execute_codepage(tableId, recordId, functionName, parameters?)
  - Note: Returns code + parameters for security (doesn't execute directly)
```

### Auth Tools (1)
```
quickbase_initiate_oauth(clientId, redirectUri, scopes?)
  - scopes: string[] e.g., ["read:table", "write:table"]
  - Returns: OAuth authorization URL
```

---

## Common Patterns

### Query Examples

**Simple Query**
```
quickbase_query_records("bu65pc8px", {
  where: "{6.EX.'John'}"  // Field 6 equals 'John'
})
```

**Query with Sorting & Pagination**
```
quickbase_query_records("bu65pc8px", {
  where: "{8.GT.100}",  // Field 8 greater than 100
  sortBy: [{fieldId: 6, order: 'ASC'}],
  top: 50,
  skip: 0
})
```

**Select Specific Fields**
```
quickbase_query_records("bu65pc8px", {
  select: [3, 6, 7, 8],  // Only fetch these fields
  top: 100
})
```

### Field ID Mappings
- **Field 3**: Always Record ID (auto-generated)
- **Field 6**: Commonly used for names (varies by table)
- **Field 7**: Commonly used for descriptions (varies by table)
- **Field 8**: Commonly used for codepage code (varies by table)

**Note**: Field ID mappings are hardcoded in the client. For other fields, check your app's field definitions first.

### Common Operators in WHERE Clauses
```
EX   - Exact match
XEX  - Does not equal
CT   - Contains
XCT  - Does not contain
GT   - Greater than
GTE  - Greater than or equal
LT   - Less than
LTE  - Less than or equal
BW   - Begins with
EW   - Ends with
```

### Record Field Format

**Creating Records**
```javascript
fields: {
  "6": { value: "John Doe" },
  "7": { value: "Description" },
  "8": { value: 100 }
}
```

**Updating Records**
```javascript
fields: {
  "6": { value: "Jane Doe" },
  "8": { value: 150 }
}
```

---

## Error Handling

All errors are returned as `McpError` with `ErrorCode.InternalError`:
```
{
  code: "InternalError",
  message: "Error executing quickbase_query_records: ..."
}
```

### Common Error Causes
1. **Invalid credentials**: Check QB_REALM, QB_USER_TOKEN, QB_APP_ID
2. **Invalid tableId**: Table doesn't exist or wrong ID
3. **Invalid fieldId**: Field doesn't exist in table
4. **Invalid recordId**: Record doesn't exist
5. **API timeout**: Increase QB_DEFAULT_TIMEOUT (default 30000ms)
6. **Malformed where clause**: Check QuickBase query syntax

---

## Configuration

Set via environment variables:
```
QB_REALM=yourname.quickbase.com          # Required
QB_USER_TOKEN=xxxxx                      # Required (from Account Settings)
QB_APP_ID=xxxxx                          # Required (from app URL)
QB_DEFAULT_TIMEOUT=30000                 # Optional (milliseconds)
QB_MAX_RETRIES=3                         # Optional (not yet implemented)
MCP_SERVER_NAME=quickbase-mcp            # Optional
MCP_SERVER_VERSION=1.0.0                 # Optional
```

---

## Known Limitations

### Not Implemented
- Retry logic (configured but not active)
- Response caching
- Rate limiting
- Aggregations (GROUP BY, SUM, COUNT)
- Joins between tables
- File attachment upload/download
- Webhooks
- Audit logs
- User/permission management

### Workarounds
- **Bulk Update**: Loop and call `quickbase_update_record` for each
- **Bulk Delete**: Build OR clause: `{3.EX.1}OR{3.EX.2}OR{3.EX.3}`
- **Delete Relationship**: Not supported; manually remove reference fields
- **Complex Filters**: Build where clause with OR/AND manually

---

## Performance Tips

1. **Select Only Needed Fields**: Use `select` parameter in queries
2. **Use Pagination**: Don't fetch all records; use `top` and `skip`
3. **Batch Operations**: Use `quickbase_bulk_create_records` for multiple inserts
4. **Index on Frequently Queried Fields**: Improves QuickBase performance
5. **Avoid Large Result Sets**: Use `top` parameter to limit results
6. **Cache Application Data**: Remember table/field IDs; don't query app info repeatedly

---

## Architecture Layers

```
┌─────────────────────────────────────────┐
│  MCP Client (Claude, other tools)       │
└──────────────┬──────────────────────────┘
               │ MCP Protocol
┌──────────────▼──────────────────────────┐
│  MCP Server (index.ts)                  │
│  - Tool routing                         │
│  - Request handling                     │
│  - Error wrapping                       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  QuickBase Client (client.ts)           │
│  - AxiosInstance                        │
│  - Request/response logging             │
│  - API method implementations           │
└──────────────┬──────────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────────┐
│  QuickBase API (api.quickbase.com/v1)   │
└─────────────────────────────────────────┘
```

---

## Debugging

### Enable Request/Response Logging
The client logs all requests and responses to stderr:
```
QB API Request: GET /apps/xxxxx
QB API Response: 200 /apps/xxxxx
QB API Error: 404 {"message":"Table not found"}
```

### Test Connection
```
quickbase_test_connection()  // Returns true if connected, false otherwise
```

### Get App Info
```
quickbase_get_app_info()     // Returns app metadata and tables
```

### List All Tables
```
quickbase_get_tables()       // Shows all tables with IDs
```

---

## Examples

### Create a Complete Table with Fields
```javascript
// 1. Create table
const tableId = await quickbase_create_table({
  name: "Customers",
  description: "Customer records"
});

// 2. Add fields
await quickbase_create_field({
  tableId: tableId,
  label: "First Name",
  fieldType: "text",
  required: true
});

await quickbase_create_field({
  tableId: tableId,
  label: "Email",
  fieldType: "email"
});
```

### Create Related Tables with Lookup
```javascript
// 1. Create relationship
await quickbase_create_advanced_relationship({
  parentTableId: "customers_table_id",
  childTableId: "orders_table_id",
  referenceFieldLabel: "Customer",
  lookupFields: [
    {
      parentFieldId: 6,  // Customer Name field
      childFieldLabel: "Customer Name Lookup"
    }
  ]
});
```

### Query with Complex Filter
```javascript
const results = await quickbase_query_records({
  tableId: "bu65pc8px",
  where: "{8.GT.100}AND{6.CT.'John'}",  // Field 8 > 100 AND Field 6 contains 'John'
  sortBy: [{fieldId: 8, order: 'DESC'}],
  top: 50
});
```

---

## Support & Issues

For bugs or feature requests:
- GitHub: https://github.com/LawrenceCirillo/QuickBase-MCP-Server
- Issues: https://github.com/LawrenceCirillo/QuickBase-MCP-Server/issues

For QuickBase API documentation:
- Official Docs: https://developer.quickbase.com/

---

**Version**: 1.0.0  
**Last Updated**: 2024-12-11  
**Author**: Lawrence Cirillo
