# QuickBase MCP Server - Enhanced Codepage Tools

## 🚀 New Codepage Management Features

The QuickBase MCP Server now includes **11 comprehensive tools** for managing, deploying, versioning, and maintaining QuickBase codepages.

---

## 📋 Tool Categories

### 1. **Deployment Tools**
- `quickbase_deploy_codepage` - Full-featured codepage deployment
- `quickbase_update_codepage` - Update existing codepages
- `quickbase_import_codepage` - Import from HTML/JSON/files

### 2. **Discovery Tools**
- `quickbase_list_codepages` - List all codepages
- `quickbase_search_codepages` - Search by name, tags, target table
- `quickbase_get_codepage` - Get specific codepage details

### 3. **Quality Tools**
- `quickbase_validate_codepage` - Syntax, API, and security validation
- `quickbase_export_codepage` - Export in HTML/JSON/Markdown

### 4. **Collaboration Tools**
- `quickbase_clone_codepage` - Clone with modifications
- `quickbase_execute_codepage` - Run stored functions

### 5. **Version Control Tools**
- `quickbase_save_codepage_version` - Save version snapshots
- `quickbase_get_codepage_versions` - View version history
- `quickbase_rollback_codepage` - Rollback to previous version

---

## 🔧 Detailed Tool Reference

### quickbase_deploy_codepage

**Purpose:** Deploy a complete codepage with full metadata

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "name": "MyDealership Calculator",
  "code": "<!DOCTYPE html>...",
  "description": "AI-powered pricing calculator",
  "version": "1.0.0",
  "tags": ["calculator", "pricing", "dealership"],
  "dependencies": [
    "https://cdn.quickbase.com/static/lib/qdb.js",
    "https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"
  ],
  "targetTableId": "bvhuaz8wz"
}
```

**Response:**
```
Codepage deployed successfully with record ID: 123
Name: MyDealership Calculator
Version: 1.0.0
```

**Use Cases:**
- Deploy new codepages from development
- Publish production-ready code
- Track dependencies and versions

---

### quickbase_update_codepage

**Purpose:** Update an existing codepage

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "recordId": 123,
  "code": "<!DOCTYPE html>...",  // optional
  "description": "Updated description",  // optional
  "version": "1.0.1",  // optional
  "active": true  // optional - enable/disable
}
```

**Response:**
```
Codepage 123 updated successfully
```

**Use Cases:**
- Push code updates
- Update documentation
- Enable/disable codepages
- Increment versions

---

### quickbase_search_codepages

**Purpose:** Find codepages by criteria

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "searchTerm": "calculator",  // optional - searches name & description
  "tags": ["pricing", "dealership"],  // optional - filter by tags
  "targetTableId": "bvhuaz8wz",  // optional - filter by target table
  "activeOnly": true  // default true - only active codepages
}
```

**Response:**
```json
[
  {
    "3": { "value": 123 },
    "6": { "value": "MyDealership Calculator" },
    "8": { "value": "AI-powered pricing calculator" },
    "9": { "value": "1.0.0" },
    "10": { "value": "calculator, pricing, dealership" },
    "12": { "value": "bvhuaz8wz" },
    "13": { "value": true }
  }
]
```

**Use Cases:**
- Find codepages by functionality
- List all calculators
- Find codepages for specific tables
- Inventory active codepages

---

### quickbase_clone_codepage

**Purpose:** Clone a codepage with optional modifications

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "sourceRecordId": 123,
  "newName": "MyDealership Calculator v2",
  "modifications": {
    "8": "Enhanced with new features",  // Update description
    "9": "2.0.0",  // Update version
    "12": "bvhuaz999"  // Different target table
  }
}
```

**Response:**
```
Codepage cloned successfully! New record ID: 456
Original: 123 → Clone: 456
```

**Use Cases:**
- Create variations for different departments
- Test new features safely
- Branch development versions
- Create templates

---

### quickbase_validate_codepage

**Purpose:** Validate code quality and security

**Parameters:**
```json
{
  "code": "<!DOCTYPE html>...",
  "checkSyntax": true,  // Check JavaScript syntax
  "checkAPIs": true,  // Check QuickBase API usage
  "checkSecurity": true  // Check for security issues
}
```

**Response:**
```json
{
  "valid": true,
  "warnings": [
    "⚠️ Uses fetch API - consider using qdb.api instead"
  ],
  "errors": [],
  "suggestions": [
    "✅ Uses qdb.api (good!)",
    "✅ Uses session client (good!)"
  ]
}
```

**Security Checks:**
- ❌ `eval()` usage
- ❌ Unsafe `innerHTML` assignments
- ❌ Hardcoded tokens
- ❌ Password references

**API Recommendations:**
- ✅ `qdb.api` (best - no CORS)
- ✅ Session client
- ✅ `QB.api`
- ⚠️ `fetch()` (may have CORS issues)

**Use Cases:**
- Pre-deployment validation
- Code review automation
- Security audits
- Best practices enforcement

---

### quickbase_export_codepage

**Purpose:** Export codepages in multiple formats

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "recordId": 123,
  "format": "html"  // "html", "json", or "markdown"
}
```

**Response (HTML):**
```html
<!DOCTYPE html>
<html>...full codepage code...</html>
```

**Response (JSON):**
```json
{
  "name": "MyDealership Calculator",
  "code": "<!DOCTYPE html>...",
  "description": "AI-powered pricing calculator",
  "version": "1.0.0",
  "tags": "calculator, pricing, dealership",
  "targetTableId": "bvhuaz8wz"
}
```

**Response (Markdown):**
```markdown
# MyDealership Calculator

**Version:** 1.0.0
**Description:** AI-powered pricing calculator

## Code

```javascript
...code here...
```
```

**Use Cases:**
- Backup codepages
- Share with team
- Documentation
- Version control integration

---

### quickbase_import_codepage

**Purpose:** Import codepages from external sources

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "source": "<!DOCTYPE html>..." or "{\"name\":...}" or "file.html",
  "format": "auto",  // "html", "json", or "auto"
  "overwrite": false  // Replace if exists
}
```

**Response:**
```
Codepage imported successfully! Record ID: 789
```

**Use Cases:**
- Import from backups
- Restore deleted codepages
- Import from external sources
- Batch imports

---

### quickbase_save_codepage_version

**Purpose:** Create version snapshot for history tracking

**Parameters:**
```json
{
  "tableId": "bltcpt7db",  // Codepage Versions table
  "codepageRecordId": 123,
  "version": "1.0.1",
  "code": "<!DOCTYPE html>...",
  "changeLog": "Fixed calculation bug, added validation"
}
```

**Response:**
```
Version 1.0.1 saved with record ID: 555
```

**Use Cases:**
- Track code changes
- Maintain version history
- Document changes
- Enable rollbacks

---

### quickbase_get_codepage_versions

**Purpose:** View version history

**Parameters:**
```json
{
  "tableId": "bltcpt7db",
  "codepageRecordId": 123,
  "limit": 10  // optional, default 50
}
```

**Response:**
```json
[
  {
    "3": { "value": 555 },
    "6": { "value": 123 },
    "7": { "value": "1.0.1" },
    "8": { "value": "<!DOCTYPE..." },
    "9": { "value": "Fixed calculation bug" }
  },
  {
    "3": { "value": 554 },
    "6": { "value": 123 },
    "7": { "value": "1.0.0" },
    "8": { "value": "<!DOCTYPE..." },
    "9": { "value": "Initial release" }
  }
]
```

**Use Cases:**
- Review change history
- Compare versions
- Audit changes
- Find when bugs were introduced

---

### quickbase_rollback_codepage

**Purpose:** Revert to a previous version

**Parameters:**
```json
{
  "tableId": "bltcpt7da",
  "codepageRecordId": 123,
  "versionRecordId": 554  // Version to restore
}
```

**Response:**
```
Codepage 123 rolled back to version 1.0.0
```

**Use Cases:**
- Undo bad deployments
- Recover from bugs
- Test previous versions
- Emergency fixes

---

## 📊 Field ID Reference

### Codepages Table (bltcpt7da)
- Field 3: Record ID
- Field 6: Name
- Field 7: Code
- Field 8: Description
- Field 9: Version
- Field 10: Tags (comma-separated)
- Field 11: Dependencies (newline-separated)
- Field 12: Target Table ID
- Field 13: Active (checkbox)

### Codepage Versions Table (bltcpt7db)
- Field 3: Record ID
- Field 6: Codepage Reference (to main codepage)
- Field 7: Version Number
- Field 8: Code Snapshot
- Field 9: Change Log

---

## 🎯 Workflow Examples

### Example 1: Deploy MyDealership Calculator

```javascript
// 1. Validate code first
const validation = await mcp.call('quickbase_validate_codepage', {
  code: myDealershipHTML,
  checkSyntax: true,
  checkAPIs: true,
  checkSecurity: true
});

// 2. If valid, deploy
if (validation.valid) {
  const deployment = await mcp.call('quickbase_deploy_codepage', {
    tableId: 'bltcpt7da',
    name: 'MyDealership Calculator',
    code: myDealershipHTML,
    description: 'AI-powered car dealership pricing calculator',
    version: '1.0.0',
    tags: ['calculator', 'pricing', 'dealership', 'ai'],
    dependencies: [
      'https://cdn.quickbase.com/static/lib/qdb.js'
    ],
    targetTableId: 'bvhuaz8wz'
  });
  
  console.log(`Deployed! Record ID: ${deployment.recordId}`);
}
```

### Example 2: Update & Version Control

```javascript
// 1. Save current version before updating
await mcp.call('quickbase_save_codepage_version', {
  tableId: 'bltcpt7db',
  codepageRecordId: 123,
  version: '1.0.0',
  code: currentCode,
  changeLog: 'Stable version before enhancement'
});

// 2. Update codepage
await mcp.call('quickbase_update_codepage', {
  tableId: 'bltcpt7da',
  recordId: 123,
  code: newCode,
  version: '1.0.1',
  description: 'Added test connection button'
});

// 3. If something goes wrong, rollback
await mcp.call('quickbase_rollback_codepage', {
  tableId: 'bltcpt7da',
  codepageRecordId: 123,
  versionRecordId: 555  // Previous version
});
```

### Example 3: Clone for Different Department

```javascript
// Clone calculator for Sales department
const salesClone = await mcp.call('quickbase_clone_codepage', {
  tableId: 'bltcpt7da',
  sourceRecordId: 123,
  newName: 'Sales Department Calculator',
  modifications: {
    "8": "Sales-specific pricing calculator",
    "10": "sales, calculator, pricing",
    "12": "bvhuaz_sales_table"
  }
});
```

### Example 4: Search & Export

```javascript
// Find all active calculators
const calculators = await mcp.call('quickbase_search_codepages', {
  tableId: 'bltcpt7da',
  tags: ['calculator'],
  activeOnly: true
});

// Export each one for backup
for (const calc of calculators) {
  const backup = await mcp.call('quickbase_export_codepage', {
    tableId: 'bltcpt7da',
    recordId: calc[3].value,
    format: 'json'
  });
  
  // Save to file system or version control
  fs.writeFileSync(`backup_${calc[6].value}.json`, backup);
}
```

---

## 🛠️ Setup Requirements

### Environment Variables

```env
# Required
QB_REALM=yourrealm.quickbase.com
QB_USER_TOKEN=your_user_token
QB_APP_ID=your_app_id

# Optional - Codepage tables
CODEPAGE_TABLE_ID=bltcpt7da
CODEPAGE_VERSION_TABLE_ID=bltcpt7db
```

### Table Setup

**Codepages Table:**
```sql
CREATE TABLE Codepages (
  Name TEXT,
  Code TEXT (multiline),
  Description TEXT,
  Version TEXT,
  Tags TEXT,
  Dependencies TEXT (multiline),
  Target_Table_ID TEXT,
  Active CHECKBOX
)
```

**Codepage Versions Table:**
```sql
CREATE TABLE Codepage_Versions (
  Codepage_Reference REFERENCE (to Codepages),
  Version_Number TEXT,
  Code_Snapshot TEXT (multiline),
  Change_Log TEXT
)
```

---

## 🎉 Benefits

### For Developers
- ✅ Version control for codepages
- ✅ Automated validation
- ✅ Easy cloning and templates
- ✅ Safe rollback capability

### For Teams
- ✅ Centralized codepage management
- ✅ Search and discovery
- ✅ Documentation in exports
- ✅ Collaboration through cloning

### For Organizations
- ✅ Code quality assurance
- ✅ Security checks
- ✅ Audit trails
- ✅ Disaster recovery

---

## 📞 Support

For issues or questions:
1. Check validation results for specific errors
2. Review field IDs in your QuickBase app
3. Ensure proper permissions for tables
4. Check MCP server logs for detailed errors

---

**Last Updated:** October 28, 2025  
**Version:** 2.0.0  
**Status:** ✅ Production Ready
