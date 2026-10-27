# QuickBase MCP Server v1.6.0 - New Tools

## 🎉 What's New: File Attachments & Bulk Operations

Version 1.6.0 adds **7 new MCP tools** focused on two critical business needs:
- **File Attachment Management** (4 tools)
- **Enhanced Bulk Operations** (3 tools)
- **Improved Record Operations** (4 existing tools enhanced)

Total tool count: **48 tools** (up from 41)

---

## 📎 File Attachment Management (4 New Tools)

### 1. `quickbase_upload_file`
Upload files to QuickBase file attachment fields.

**Parameters:**
- `tableId` (string, required) - Table ID
- `recordId` (number, required) - Record ID
- `fieldId` (number, required) - File attachment field ID
- `fileName` (string, required) - Name of the file
- `fileData` (string, required) - Base64 encoded file data

**Example:**
```json
{
  "name": "quickbase_upload_file",
  "arguments": {
    "tableId": "bvhuaz8wz",
    "recordId": 123,
    "fieldId": 15,
    "fileName": "contract.pdf",
    "fileData": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8..."
  }
}
```

**Response:**
```
File uploaded successfully!
File: contract.pdf
Version: 1
```

**Use Cases:**
- Upload vehicle documents to inventory records
- Attach contracts to customer records
- Store inspection reports with service records
- Archive photos with property listings

---

### 2. `quickbase_download_file`
Download files from QuickBase file attachment fields.

**Parameters:**
- `tableId` (string, required) - Table ID
- `recordId` (number, required) - Record ID
- `fieldId` (number, required) - File attachment field ID
- `versionNumber` (number, optional) - Specific version to download

**Example:**
```json
{
  "name": "quickbase_download_file",
  "arguments": {
    "tableId": "bvhuaz8wz",
    "recordId": 123,
    "fieldId": 15,
    "versionNumber": 1
  }
}
```

**Response:**
```json
{
  "fileName": "contract.pdf",
  "data": "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8..."
}
```

**Use Cases:**
- Retrieve documents for email attachments
- Download files for processing
- Access archived versions of documents
- Export documents for backup

---

### 3. `quickbase_delete_file`
Delete specific file versions from attachment fields.

**Parameters:**
- `tableId` (string, required) - Table ID
- `recordId` (number, required) - Record ID
- `fieldId` (number, required) - File attachment field ID
- `versionNumber` (number, required) - Version number to delete

**Example:**
```json
{
  "name": "quickbase_delete_file",
  "arguments": {
    "tableId": "bvhuaz8wz",
    "recordId": 123,
    "fieldId": 15,
    "versionNumber": 2
  }
}
```

**Use Cases:**
- Remove outdated documents
- Clean up incorrect file uploads
- Manage storage space
- Maintain compliance by removing old versions

---

### 4. `quickbase_list_files`
List all file versions in an attachment field.

**Parameters:**
- `tableId` (string, required) - Table ID
- `recordId` (number, required) - Record ID
- `fieldId` (number, required) - File attachment field ID

**Example:**
```json
{
  "name": "quickbase_list_files",
  "arguments": {
    "tableId": "bvhuaz8wz",
    "recordId": 123,
    "fieldId": 15
  }
}
```

**Response:**
```json
[
  {
    "versionNumber": 1,
    "fileName": "contract_v1.pdf",
    "size": 245678,
    "uploaded": "2025-01-15T10:30:00Z"
  },
  {
    "versionNumber": 2,
    "fileName": "contract_v2.pdf",
    "size": 248921,
    "uploaded": "2025-01-20T14:22:00Z"
  }
]
```

**Use Cases:**
- Audit document history
- View all uploaded files
- Track file versions
- Report on storage usage

---

## 🔄 Bulk Operations (3 New Tools)

### 5. `quickbase_upsert_records`
Insert or update records based on a unique key field (upsert operation).

**Parameters:**
- `tableId` (string, required) - Table ID
- `records` (array, required) - Records to upsert
  - `keyField` (number) - Field ID to use as unique key
  - `keyValue` (any) - Value of the key field
  - `data` (object) - Field values to insert/update

**Example:**
```json
{
  "name": "quickbase_upsert_records",
  "arguments": {
    "tableId": "bvhuaz8wz",
    "records": [
      {
        "keyField": 6,
        "keyValue": "VIN12345",
        "data": {
          "7": { "value": "Toyota" },
          "8": { "value": "Camry" },
          "9": { "value": 28000 }
        }
      },
      {
        "keyField": 6,
        "keyValue": "VIN67890",
        "data": {
          "7": { "value": "Honda" },
          "8": { "value": "Accord" },
          "9": { "value": 26500 }
        }
      }
    ]
  }
}
```

**Response:**
```
Upsert completed!
Created: 1
Updated: 1
Unchanged: 0
Total: 2
```

**Use Cases:**
- Import vehicle inventory (update existing, add new)
- Sync customer data from external systems
- Update pricing without creating duplicates
- Merge data from spreadsheets

---

### 6. `quickbase_bulk_update_records`
Update multiple records at once.

**Parameters:**
- `tableId` (string, required) - Table ID
- `updates` (array, required) - Records to update
  - `recordId` (number) - Record ID to update
  - `fields` (object) - Fields to update

**Example:**
```json
{
  "name": "quickbase_bulk_update_records",
  "arguments": {
    "tableId": "bvhuaz8wz",
    "updates": [
      {
        "recordId": 101,
        "fields": {
          "10": { "value": "In Stock" },
          "11": { "value": "2025-01-20" }
        }
      },
      {
        "recordId": 102,
        "fields": {
          "10": { "value": "In Stock" },
          "11": { "value": "2025-01-20" }
        }
      }
    ]
  }
}
```

**Response:**
```
Bulk update completed!
Updated: 2 records
```

**Use Cases:**
- Batch status updates
- Apply price changes across inventory
- Update multiple customer records
- Bulk field modifications

---

### 7. `quickbase_bulk_delete_records`
Delete multiple records using a query filter.

**Parameters:**
- `tableId` (string, required) - Table ID
- `where` (string, required) - QuickBase query to select records

**Example:**
```json
{
  "name": "quickbase_bulk_delete_records",
  "arguments": {
    "tableId": "bvhuaz8wz",
    "where": "{10.EX.'Archived'}AND{11.BF.'2024-01-01'}"
  }
}
```

**Response:**
```
Successfully deleted 47 records
```

**Use Cases:**
- Clean up old records
- Delete test data
- Archive outdated inventory
- Remove duplicate entries

---

## 🔧 Implementation Details

### Client Methods Added
**File Operations:**
- `uploadFile(tableId, recordId, fieldId, fileName, fileData): Promise<{versionNumber, fileName}>`
- `downloadFile(tableId, recordId, fieldId, versionNumber?): Promise<{fileName, data}>`
- `deleteFile(tableId, recordId, fieldId, versionNumber): Promise<void>`
- `listFiles(tableId, recordId, fieldId): Promise<FileVersion[]>`

**Bulk Operations:**
- `upsertRecords(tableId, records): Promise<{created[], updated[], unchanged[], totalProcessed}>`
- `bulkUpdateRecords(tableId, updates): Promise<{updated[], errors[]}>`
- `bulkDeleteRecords(tableId, where): Promise<number>`

### Error Handling
- **File operations**: Handle missing files, invalid field types, size limits
- **Bulk operations**: Report per-record errors without failing entire batch
- **Validation**: Type checking for all parameters
- **Detailed messages**: Clear error messages for debugging

---

## 📊 Performance Considerations

### File Attachments
- Files are transferred as Base64 encoded strings
- Large files may impact performance
- Consider file size limits (QuickBase has 50MB per file limit)
- Version management helps track changes

### Bulk Operations
- Upsert uses QuickBase's `mergeFieldId` for efficiency
- Batch operations reduce API calls vs individual updates
- Error handling allows partial success
- Consider breaking very large batches into chunks

---

## 🎯 Common Workflows

### Vehicle Inventory with Documents
```
1. quickbase_upsert_records (import vehicle data)
2. quickbase_upload_file (attach inspection reports)
3. quickbase_upload_file (attach photos)
4. quickbase_list_files (verify uploads)
```

### Data Import with Cleanup
```
1. quickbase_upsert_records (import new data)
2. quickbase_bulk_update_records (apply corrections)
3. quickbase_bulk_delete_records (remove invalid entries)
```

### Document Management
```
1. quickbase_list_files (audit existing files)
2. quickbase_download_file (backup important docs)
3. quickbase_delete_file (remove old versions)
4. quickbase_upload_file (upload updated versions)
```

---

## 📝 API Reference

### QuickBase API Endpoints Used

**File Operations:**
- `POST /files/{tableId}/{recordId}/{fieldId}` - Upload file
- `GET /files/{tableId}/{recordId}/{fieldId}[/{versionNumber}]` - Download file
- `DELETE /files/{tableId}/{recordId}/{fieldId}/{versionNumber}` - Delete file
- `GET /files/{tableId}/{recordId}/{fieldId}` - List versions

**Bulk Operations:**
- `POST /records` with `mergeFieldId` - Upsert records
- `POST /records` - Bulk update (existing endpoint, new wrapper)
- `DELETE /records` - Bulk delete (existing endpoint, new wrapper)

---

## 🚀 Getting Started

### Update Your Installation
```bash
git pull
npm install
npm run build
```

### Test File Upload
```bash
# Create a test file
echo "Test content" | base64 > test.txt.b64

# Use in your application
# The MCP tools will be automatically available
```

### Example: Upload Document
```javascript
// In your codepage or application
const fileData = btoa("Hello QuickBase!"); // Base64 encode

await mcpClient.callTool("quickbase_upload_file", {
  tableId: "bvhuaz8wz",
  recordId: 123,
  fieldId: 15,
  fileName: "test.txt",
  fileData: fileData
});
```

---

## 📚 Additional Resources

- [QuickBase File API Documentation](https://developer.quickbase.com/operation/uploadFile)
- [QuickBase Records API](https://developer.quickbase.com/operation/upsertRecords)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)

---

## 🐛 Known Limitations

1. **File Size**: QuickBase limits files to 50MB per attachment
2. **Base64 Overhead**: Base64 encoding increases data size by ~33%
3. **API Rate Limits**: Bulk operations count toward QuickBase API rate limits
4. **Field Types**: File operations only work with file attachment fields
5. **Permissions**: User must have edit rights to upload/delete files

---

## 🔮 Future Enhancements

Potential additions for v1.7.0:
- Direct file URL support (bypass Base64 encoding)
- Chunked file upload for large files
- Batch file operations
- File metadata search
- OCR/text extraction from uploaded PDFs
- Image thumbnail generation
- Virus scanning integration

---

## 📞 Support

For issues or questions:
1. Check the [troubleshooting guide](TROUBLESHOOTING_404.md)
2. Review [API documentation](README.md)
3. Examine [example usage](examples/)
4. Contact your QuickBase administrator

---

**Version**: 1.6.0  
**Release Date**: 2025-01-20  
**Breaking Changes**: None  
**Backwards Compatible**: Yes
