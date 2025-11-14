# QuickBase Codepage Tools - Quick Reference

## 🎯 14 Codepage Management Tools

### Basic Operations

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `deploy_codepage` | Deploy new codepage | name, code, version, tags |
| `get_codepage` | Retrieve codepage | tableId, recordId |
| `list_codepages` | List all codepages | tableId, limit |
| `update_codepage` | Modify codepage | recordId, code, version |
| `save_codepage` | Simple save | name, code, description |

### Search & Discovery

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `search_codepages` | Find codepages | searchTerm, tags, targetTableId |

### Quality Assurance

| Tool | Purpose | Checks |
|------|---------|--------|
| `validate_codepage` | Validate code | Syntax, APIs, Security |

### Collaboration

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `clone_codepage` | Duplicate & modify | sourceRecordId, newName, modifications |

### Import/Export

| Tool | Purpose | Formats |
|------|---------|---------|
| `export_codepage` | Export codepage | json, html, markdown |
| `import_codepage` | Import codepage | json, html, auto |

### Version Control

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `save_codepage_version` | Save snapshot | version, code, changeLog |
| `get_codepage_versions` | Get history | codepageRecordId, limit |
| `rollback_codepage` | Restore version | versionRecordId |

### Execution

| Tool | Purpose | Note |
|------|---------|------|
| `execute_codepage` | Get exec metadata | Returns metadata only (safe) |

---

## 📋 Common Workflows

### 1. Create New Codepage
```
1. validate_codepage (check code quality)
2. deploy_codepage (create in QuickBase)
3. get_codepage (verify creation)
```

### 2. Update Existing Codepage
```
1. get_codepage (retrieve current)
2. save_codepage_version (backup)
3. validate_codepage (check new code)
4. update_codepage (apply changes)
```

### 3. Clone & Customize
```
1. search_codepages (find template)
2. clone_codepage (duplicate)
3. update_codepage (customize)
```

### 4. Version Control
```
1. save_codepage_version (snapshot)
2. update_codepage (make changes)
3. [if needed] rollback_codepage (restore)
```

### 5. Export for Backup
```
1. list_codepages (find all)
2. export_codepage (save as JSON)
3. [store externally]
```

---

## 🔍 Field Mappings

### Codepages Table (bvi2ms4e9)
- **Field 3** - Record ID
- **Field 8** - Name
- **Field 9** - Version
- **Field 10** - Tags
- **Field 11** - Target Table ID
- **Field 12** - Active (checkbox)
- **Field 13** - Code (HTML/JS)
- **Field 14** - Description
- **Field 15** - Dependencies

### Versions Table (bvi2ms4ea)
- **Field 3** - Record ID
- **Field 6** - Codepage Record ID
- **Field 7** - Version
- **Field 8** - Code Snapshot
- **Field 9** - Change Log
- **Field 10** - Created Date

---

## ✅ Validation Checks

### Syntax
- ✅ HTML tag closure
- ✅ JavaScript function closure
- ✅ Basic structure validation

### API Usage
- ✅ qdb.api detection
- ✅ QB.api detection
- ✅ Session client detection
- ⚠️  Recommendations for best practices

### Security
- ❌ eval() usage
- ⚠️  innerHTML without sanitization
- ❌ Hardcoded credentials (passwords, API keys, tokens)
- ⚠️  SQL injection patterns

---

## 🎨 Example Codepage Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Codepage</title>
    <!-- Load QuickBase library -->
    <script src="https://cdn.quickbase.com/static/lib/qdb.js"></script>
    <style>
        /* Your styles */
    </style>
</head>
<body>
    <h1>My Application</h1>
    
    <!-- Your HTML -->
    
    <script>
        // Use qdb.api for best compatibility
        async function saveData(data) {
            if (typeof qdb !== 'undefined' && qdb.api) {
                await qdb.api.addRecord('YOUR_TABLE_ID', data);
            }
        }
    </script>
</body>
</html>
```

---

## 🚀 Quick Commands

```bash
# Build
npm run build

# Test lifecycle
npm run test:lifecycle

# Run all tests
npm run test:all

# Start MCP server
npm start
```

---

## 📊 Test Coverage

```
14 Total Tests
11 Passing (78.6%)
3 Expected Failures

✅ All CRUD operations
✅ Search & discovery
✅ Clone & import/export
✅ Validation
⚠️  Version control (table setup required)
```

---

## 🔗 Quick Links

- **Full Documentation**: [README_v1.5.0.md](README_v1.5.0.md)
- **Changelog**: [CHANGELOG.md](CHANGELOG.md)
- **Tool Guide**: [CODEPAGE_TOOLS_GUIDE.md](CODEPAGE_TOOLS_GUIDE.md)
- **Test Results**: `test-results-codepage-lifecycle.json`

---

**Version**: 1.5.0  
**Date**: November 13, 2025  
**Status**: Production Ready ✅
