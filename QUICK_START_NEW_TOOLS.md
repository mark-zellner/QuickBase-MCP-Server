# Quick Start: File Attachments & Bulk Operations

Get started with the new v1.6.0 tools in 5 minutes!

---

## 🚀 Quick Setup

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies (if needed)
npm install

# 3. Build
npm run build

# 4. Start the server
npm start
```

---

## 📎 File Attachments - 3 Minute Tutorial

### Step 1: Upload a File

```javascript
// Convert file to Base64
const fileContent = "This is my test document";
const base64Data = Buffer.from(fileContent).toString('base64');

// Or from a file:
// const fs = require('fs');
// const base64Data = fs.readFileSync('myfile.pdf').toString('base64');

// Upload via MCP
{
  "name": "quickbase_upload_file",
  "arguments": {
    "tableId": "your_table_id",
    "recordId": 123,
    "fieldId": 15,
    "fileName": "test_document.txt",
    "fileData": base64Data
  }
}
```

**Response:**
```
File uploaded successfully!
File: test_document.txt
Version: 1
```

### Step 2: List Files

```javascript
{
  "name": "quickbase_list_files",
  "arguments": {
    "tableId": "your_table_id",
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
    "fileName": "test_document.txt",
    "size": 27,
    "uploaded": "2025-01-20T10:30:00Z"
  }
]
```

### Step 3: Download a File

```javascript
{
  "name": "quickbase_download_file",
  "arguments": {
    "tableId": "your_table_id",
    "recordId": 123,
    "fieldId": 15
  }
}
```

**Response:**
```json
{
  "fileName": "test_document.txt",
  "data": "VGhpcyBpcyBteSB0ZXN0IGRvY3VtZW50"
}
```

**Decode the file:**
```javascript
const content = Buffer.from(data, 'base64').toString('utf-8');
// "This is my test document"
```

---

## 🔄 Bulk Operations - 2 Minute Tutorial

### Upsert Records (Insert or Update)

```javascript
{
  "name": "quickbase_upsert_records",
  "arguments": {
    "tableId": "your_table_id",
    "records": [
      {
        "keyField": 6,              // VIN field
        "keyValue": "VIN12345",     // Unique value
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

**What happened?**
- VIN12345 was new → created
- VIN67890 already existed → updated

### Bulk Update Records

```javascript
{
  "name": "quickbase_bulk_update_records",
  "arguments": {
    "tableId": "your_table_id",
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

### Bulk Delete Records

```javascript
{
  "name": "quickbase_bulk_delete_records",
  "arguments": {
    "tableId": "your_table_id",
    "where": "{10.EX.'Archived'}"
  }
}
```

**Response:**
```
Successfully deleted 5 records
```

---

## 🎯 Common Use Cases

### Use Case 1: Vehicle Inventory Import with Photos

```javascript
// Step 1: Upsert vehicle data
await mcpClient.callTool("quickbase_upsert_records", {
  tableId: "vehicles_table",
  records: [
    {
      keyField: 6, // VIN
      keyValue: "VIN12345",
      data: {
        7: { value: "Toyota" },
        8: { value: "Camry" },
        9: { value: 28000 }
      }
    }
  ]
});

// Step 2: Get the record ID
const records = await mcpClient.callTool("quickbase_query_records", {
  tableId: "vehicles_table",
  where: "{6.EX.'VIN12345'}"
});
const recordId = records.data[0]['3'].value;

// Step 3: Upload photo
const photoBase64 = fs.readFileSync('vehicle.jpg').toString('base64');
await mcpClient.callTool("quickbase_upload_file", {
  tableId: "vehicles_table",
  recordId: recordId,
  fieldId: 15,
  fileName: "vehicle_photo.jpg",
  fileData: photoBase64
});
```

### Use Case 2: Batch Status Update

```javascript
// Get all pending records
const pending = await mcpClient.callTool("quickbase_query_records", {
  tableId: "orders_table",
  where: "{10.EX.'Pending'}",
  select: [3] // Record ID only
});

// Update all to "In Progress"
const updates = pending.data.map(record => ({
  recordId: record['3'].value,
  fields: {
    10: { value: "In Progress" },
    11: { value: new Date().toISOString() }
  }
}));

await mcpClient.callTool("quickbase_bulk_update_records", {
  tableId: "orders_table",
  updates: updates
});
```

### Use Case 3: Clean Up Old Test Data

```javascript
// Delete all records from before 2024
await mcpClient.callTool("quickbase_bulk_delete_records", {
  tableId: "test_table",
  where: "{5.BF.'2024-01-01'}"
});
```

---

## 💡 Pro Tips

### File Uploads
1. **Check field type**: Ensure field 15 is a "file attachment" field
2. **Size limits**: QuickBase limits files to 50MB
3. **Base64 overhead**: Files will be ~33% larger when encoded
4. **Multiple files**: Upload to the same field multiple times (creates versions)

### Upsert Operations
1. **Choose unique key**: Use VIN, email, SKU, or other unique identifier
2. **Consistent key field**: All records in one upsert must use same key field
3. **Merge behavior**: Existing records are updated, new ones created
4. **Field updates**: Only specified fields are updated

### Bulk Updates
1. **Error handling**: Check response for per-record errors
2. **Batch size**: Consider breaking very large batches (1000+) into chunks
3. **Permissions**: User must have edit rights for all records
4. **Field validation**: QuickBase validates all fields (required, format, etc.)

### Bulk Deletes
1. **Query syntax**: Use QuickBase query format `{fieldId.operator.'value'}`
2. **Test first**: Run query with `quickbase_query_records` to see what will delete
3. **No undo**: Deletions are permanent
4. **Permissions**: User must have delete rights

---

## 🔍 Testing Your Setup

### Test 1: File Upload
```javascript
const testContent = Buffer.from("Hello QuickBase!").toString('base64');
const result = await callTool("quickbase_upload_file", {
  tableId: "your_test_table",
  recordId: 1,
  fieldId: 15,
  fileName: "test.txt",
  fileData: testContent
});
console.log("✅ File upload:", result);
```

### Test 2: Upsert
```javascript
const result = await callTool("quickbase_upsert_records", {
  tableId: "your_test_table",
  records: [{
    keyField: 6,
    keyValue: "TEST123",
    data: { 7: { value: "Test Value" } }
  }]
});
console.log("✅ Upsert:", result);
```

### Test 3: Bulk Update
```javascript
const result = await callTool("quickbase_bulk_update_records", {
  tableId: "your_test_table",
  updates: [{
    recordId: 1,
    fields: { 7: { value: "Updated" } }
  }]
});
console.log("✅ Bulk update:", result);
```

---

## 🐛 Troubleshooting

### Issue: "Field is not a file attachment type"
**Solution**: Verify the field ID is for a file attachment field. Check in QuickBase settings.

### Issue: "Upsert created duplicates"
**Solution**: Ensure the key field is marked as "unique" in QuickBase field settings.

### Issue: "File too large"
**Solution**: QuickBase has a 50MB file size limit. Compress or split the file.

### Issue: "Permission denied"
**Solution**: User token must have write/delete permissions for the table.

### Issue: "Base64 decoding error"
**Solution**: Ensure file data is properly Base64 encoded before sending.

---

## 📚 Next Steps

1. **Read full documentation**: [NEW_TOOLS_v1.6.0.md](NEW_TOOLS_v1.6.0.md)
2. **Explore examples**: Check `examples/` directory
3. **Test in your app**: Try with your actual QuickBase data
4. **Report issues**: Document any problems for future improvements
5. **Suggest features**: What other tools would be helpful?

---

## 🆘 Need Help?

- **Documentation**: [NEW_TOOLS_v1.6.0.md](NEW_TOOLS_v1.6.0.md)
- **Full README**: [README.md](README.md)
- **QuickBase API**: https://developer.quickbase.com
- **MCP Protocol**: https://modelcontextprotocol.io

---

**Happy building! 🚀**

The new file attachment and bulk operation tools make it easier than ever to build powerful QuickBase applications with document management and efficient data processing.
