# 🎯 QuickBase Codepage Management via MCP Tools

## Research Summary

After reviewing https://developer.quickbase.com/, I found:

### ✅ What QuickBase REST API Provides:
- Apps (create, update, delete, get)
- Tables (create, update, delete, get schema)
- Fields (create, update, delete)
- Records (create, update, delete, query)
- Relationships (create, delete)
- Reports (get, run)

### ❌ What's NOT in REST API:
- **Code Pages** - No REST endpoints for pageID management
- Pages must be created/updated through UI

## 💡 Solution: Table-Based Codepage Management

Since QuickBase doesn't have Page API endpoints, we'll build a complete MCP-based codepage management system using **tables as the storage layer**.

### Architecture:
```
Codepage Management Table (bltcpt7da)
    ↓
MCP Tools for CRUD operations
    ↓
Deploy script references table records
    ↓
Manual paste in QuickBase (one-time per codepage)
    ↓
All future updates via table + auto-deployment
```

## 🛠️ MCP Tools to Build

### 1. Codepage Lifecycle Tools
- `quickbase_save_codepage` - Save HTML/JS code to management table
- `quickbase_get_codepage` - Retrieve codepage by ID or name
- `quickbase_list_codepages` - List all codepages with metadata
- `quickbase_update_codepage` - Update existing codepage
- `quickbase_deploy_codepage` - Deploy to QuickBase (prep + instructions)

### 2. Version Control Tools
- `quickbase_save_codepage_version` - Save version snapshot
- `quickbase_get_codepage_versions` - Get version history
- `quickbase_rollback_codepage` - Rollback to previous version
- `quickbase_compare_versions` - Diff two versions

### 3. Testing Tools
- `quickbase_validate_codepage` - Syntax check, security scan
- `quickbase_test_codepage` - Run automated tests
- `quickbase_execute_codepage` - Execute functions from codepage

### 4. Search & Discovery Tools
- `quickbase_search_codepages` - Search by name, tags, target table
- `quickbase_clone_codepage` - Clone existing codepage
- `quickbase_import_codepage` - Import from file/URL
- `quickbase_export_codepage` - Export as HTML/JSON/Markdown

## 📋 Implementation Plan

### Phase 1: Core MCP Tools (Now)
Implement in `src/tools/index.ts`:
```typescript
// Codepage management schemas
const SaveCodepageSchema = z.object({
  tableId: z.string(),
  name: z.string(),
  code: z.string(),
  description: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  targetTableId: z.string().optional()
});

const GetCodepageSchema = z.object({
  tableId: z.string(),
  recordId: z.number()
});

// Version control schemas
const SaveVersionSchema = z.object({
  tableId: z.string(),
  codepageRecordId: z.number(),
  version: z.string(),
  code: z.string(),
  changeLog: z.string().optional()
});

// Testing schemas
const ValidateCodepageSchema = z.object({
  code: z.string(),
  checkSyntax: z.boolean().optional(),
  checkSecurity: z.boolean().optional(),
  checkAPIs: z.boolean().optional()
});
```

### Phase 2: Client Methods (QuickBaseClient)
Add to `src/quickbase/client.ts`:
```typescript
// Codepage operations
async saveCodepage(tableId: string, data: CodepageData)
async getCodepage(tableId: string, recordId: number)
async listCodepages(tableId: string, options?: QueryOptions)
async updateCodepage(tableId: string, recordId: number, updates: Partial<CodepageData>)

// Version control
async saveCodepageVersion(tableId: string, versionData: VersionData)
async getVersionHistory(tableId: string, codepageId: number)
async rollbackCodepage(tableId: string, codepageId: number, versionId: number)

// Testing
async validateCodepage(code: string, options: ValidationOptions)
async executeCodepage(tableId: string, recordId: number, functionName: string, params: any)
```

### Phase 3: Tool Handlers (Server)
Add to `src/index.ts`:
```typescript
case 'quickbase_save_codepage': {
  const result = await qbClient.createRecord(params.tableId, {
    [6]: { value: params.name },
    [7]: { value: params.code },
    [8]: { value: params.description || '' },
    [9]: { value: params.version || '1.0.0' },
    [10]: { value: params.tags?.join(',') || '' }
  });
  return { recordId: result.recordId, success: true };
}
```

## 🎯 User Workflow

### Deploy MyDealership v2.0.0:
```
1. User: "Save MyDealership.html to codepage management table"
   → MCP calls quickbase_save_codepage
   → Returns recordId: 123

2. User: "Deploy codepage 123 to pageID 2"
   → MCP calls quickbase_deploy_codepage
   → Prepares code, copies to clipboard
   → Provides paste instructions

3. User: Pastes in QuickBase (one-time setup)

4. User: "Update MyDealership to v2.1.0"
   → MCP calls quickbase_update_codepage
   → Saves new version automatically
   → Instructions to re-paste (or reference table in codepage)
```

## 🚀 Advanced Pattern: Self-Updating Codepages

**Best Practice:** Make codepages load their code from the management table:

```html
<!-- In QuickBase Code Page -->
<div id="app">Loading...</div>
<script>
// Fetch latest code from management table
fetch('/db/bltcpt7da?a=API_DoQuery&query={6.EX.MyDealership}&clist=7')
  .then(r => r.text())
  .then(xml => {
    // Parse XML, extract code from field 7
    const code = extractCode(xml);
    // Execute code
    eval(code);
  });
</script>
```

**Benefits:**
- Update code via MCP (no manual paste)
- Version control built-in
- Rollback capability
- A/B testing support

## ✅ Let's Build This!

Next steps:
1. Add MCP tool schemas to `src/tools/index.ts`
2. Implement client methods in `src/quickbase/client.ts`
3. Add tool handlers in `src/index.ts`
4. Test with MyDealership deployment
5. Document the workflow

**This gives you full codepage lifecycle management via MCP!** 🎉
