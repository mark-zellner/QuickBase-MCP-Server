# 🚀 MCP-Based QuickBase Codepage Deployment Plan

## 📋 Goal
Build MCP tools to deploy QuickBase codepages directly through the Model Context Protocol server, eliminating manual steps.

## 🎯 Current State vs Target State

### Current State
- ✅ Manual deployment: `deploy-automated.js` copies to clipboard
- ⚠️ Requires human to paste in QuickBase editor
- ✅ Backend testing works via MCP
- ❌ No direct codepage update via MCP

### Target State
- ✅ Fully automated deployment via MCP tools
- ✅ Direct codepage update (no clipboard needed)
- ✅ End-to-end deployment in one command
- ✅ Post-deployment verification automated

## 🔍 Technical Analysis

### QuickBase Codepage APIs

#### Option 1: REST API (Preferred if available)
```
Endpoint: Unknown - Need to research
Method: POST/PUT
Headers: QB-USER-TOKEN
Body: { pageId, code, name, description }
```
**Status**: ❓ Need to verify if REST API supports code pages

#### Option 2: XML API (Known to work)
```
Endpoint: /db/{appId}?a=PageSave
Method: POST
Body: XML with page content
Auth: Session-based or QB-USER-TOKEN
```
**Status**: ✅ Works but needs proper request format

#### Option 3: Internal API (Advanced)
```
Endpoint: /db/main?a=API_EditPage
Method: POST
Body: FormData with page content
Auth: Session cookies
```
**Status**: 🔬 Needs investigation

## 🛠️ Implementation Plan

### Phase 1: Research & Discovery (30 min)
1. **Test QuickBase APIs** for codepage updates
   - [ ] Try REST API endpoints
   - [ ] Test XML API PageSave
   - [ ] Document working methods

2. **Analyze Network Traffic**
   - [ ] Use browser DevTools on manual save
   - [ ] Capture request headers, body, cookies
   - [ ] Document exact API call sequence

3. **QuickBase Documentation Review**
   - [ ] Check QB API docs for page management
   - [ ] Look for code page endpoints
   - [ ] Review authentication requirements

### Phase 2: MCP Tool Design (1 hour)

#### Tool 1: `quickbase_deploy_codepage`
```typescript
{
  name: "quickbase_deploy_codepage",
  description: "Deploy a codepage directly to QuickBase",
  inputSchema: {
    pageId: number,      // QuickBase page ID
    code: string,        // HTML/JS code to deploy
    name: string,        // Page name
    description: string, // Page description
    version: string      // Version number
  }
}
```

#### Tool 2: `quickbase_get_codepage`
```typescript
{
  name: "quickbase_get_codepage",
  description: "Retrieve current codepage content from QuickBase",
  inputSchema: {
    pageId: number
  }
}
```

#### Tool 3: `quickbase_validate_codepage`
```typescript
{
  name: "quickbase_validate_codepage",
  description: "Validate codepage before deployment",
  inputSchema: {
    code: string,        // Code to validate
    checkSyntax: boolean,
    checkAPIs: boolean,
    checkSecurity: boolean
  }
}
```

#### Tool 4: `quickbase_rollback_codepage`
```typescript
{
  name: "quickbase_rollback_codepage",
  description: "Rollback to a previous codepage version",
  inputSchema: {
    pageId: number,
    version: string
  }
}
```

### Phase 3: Implementation (2-3 hours)

#### Step 1: Update QuickBase Client (`src/quickbase/client.ts`)
```typescript
// Add new methods
async deployCodepage(pageId: number, code: string, options: DeployOptions): Promise<DeployResult>
async getCodepage(pageId: number): Promise<CodepageContent>
async validateCodepage(code: string): Promise<ValidationResult>
async rollbackCodepage(pageId: number, version: string): Promise<RollbackResult>
```

#### Step 2: Add MCP Tools (`src/tools/index.ts`)
```typescript
// Define Zod schemas
const DeployCodepageSchema = z.object({
  pageId: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string().optional()
});

// Add tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      ...existingTools,
      {
        name: "quickbase_deploy_codepage",
        description: "Deploy a codepage directly to QuickBase",
        inputSchema: zodToJsonSchema(DeployCodepageSchema)
      }
      // ... more tools
    ]
  };
});
```

#### Step 3: Implement Tool Handlers (`src/index.ts`)
```typescript
case 'quickbase_deploy_codepage': {
  const { pageId, code, name, description, version } = params;
  
  // Save snapshot
  const snapshot = await saveSnapshot(code, version);
  
  // Deploy to QuickBase
  const result = await qbClient.deployCodepage(pageId, code, {
    name,
    description,
    version
  });
  
  // Save to management table
  await saveToManagementTable(code, name, version);
  
  // Return result
  return {
    content: [{
      type: "text",
      text: JSON.stringify(result, null, 2)
    }]
  };
}
```

#### Step 4: Add Types (`src/types/quickbase.ts`)
```typescript
export interface DeployOptions {
  name: string;
  description?: string;
  version?: string;
  createSnapshot?: boolean;
  saveToManagement?: boolean;
}

export interface DeployResult {
  success: boolean;
  pageId: number;
  version: string;
  snapshotPath?: string;
  managementRecordId?: number;
  editUrl: string;
  viewUrl: string;
}

export interface CodepageContent {
  pageId: number;
  name: string;
  code: string;
  lastModified: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}
```

### Phase 4: Testing (1 hour)

#### Unit Tests
```bash
npm run test:jest
```

#### Integration Test Script
```javascript
// test-mcp-deployment.js
async function testMCPDeployment() {
  // 1. Validate codepage
  await mcp.call('quickbase_validate_codepage', { code: html });
  
  // 2. Deploy to QuickBase
  await mcp.call('quickbase_deploy_codepage', {
    pageId: 2,
    code: html,
    name: 'MyDealership v2.0.0',
    version: '2.0.0'
  });
  
  // 3. Verify deployment
  await mcp.call('quickbase_query_records', {
    tableId: 'bvhuaz8wz',
    top: 1
  });
  
  // 4. Test rollback
  await mcp.call('quickbase_rollback_codepage', {
    pageId: 2,
    version: '1.0.0'
  });
}
```

#### Manual Testing Checklist
- [ ] Deploy via MCP tool
- [ ] Verify page updated in QuickBase
- [ ] Test rollback functionality
- [ ] Confirm snapshot created
- [ ] Check management table updated

### Phase 5: Documentation (30 min)

#### Update Files
- [ ] `README.md` - Add deployment tools section
- [ ] `TOOLS_SUMMARY.txt` - Document new tools
- [ ] `AGENTS.md` - Add deployment patterns
- [ ] `DEPLOYMENT_READY.md` - Update with MCP instructions

#### Create Examples
```markdown
## Deploy Codepage via MCP

### Using Claude Desktop
1. Open Claude Desktop
2. Reference the codepage file: #MyDealership.html
3. Ask: "Deploy this codepage to pageID 2 with version 2.0.0"

### Using MCP Client
```javascript
const result = await client.callTool('quickbase_deploy_codepage', {
  pageId: 2,
  code: fs.readFileSync('MyDealership.html', 'utf8'),
  name: 'MyDealership - AI Pricing Calculator',
  version: '2.0.0'
});
```

## 🚧 Implementation Challenges & Solutions

### Challenge 1: QuickBase Authentication
**Problem**: Code pages may require session cookies, not just user tokens
**Solution**: 
- Use `credentials: 'include'` in fetch
- Support both token and session-based auth
- Fallback to XML API if REST fails

### Challenge 2: HTML Encoding
**Problem**: Large HTML files may have encoding issues
**Solution**:
- Base64 encode code before sending
- Use proper Content-Type headers
- Test with various code sizes

### Challenge 3: API Discovery
**Problem**: QuickBase may not have documented codepage API
**Solution**:
- Reverse-engineer from browser DevTools
- Test multiple endpoint variations
- Document what works for future reference

### Challenge 4: Version Control
**Problem**: QuickBase doesn't natively version codepages
**Solution**:
- Store versions in management table
- Create snapshots in file system
- Implement rollback via snapshot restore

## 📊 Success Metrics

### Must Have (MVP)
- ✅ Deploy codepage via single MCP call
- ✅ No manual clipboard/paste steps
- ✅ Verification that deployment succeeded
- ✅ Error handling and rollback

### Nice to Have (v2)
- ✅ Diff comparison before deployment
- ✅ A/B testing support (deploy to staging first)
- ✅ Automated screenshot capture
- ✅ Performance metrics (deployment time)

### Stretch Goals (v3)
- ✅ CI/CD integration (GitHub Actions)
- ✅ Multi-environment deployment (dev/staging/prod)
- ✅ Automated testing after deployment
- ✅ Slack/Teams notifications

## 🗓️ Timeline

| Phase | Task | Duration | Status |
|-------|------|----------|--------|
| 1 | Research APIs | 30 min | 📋 TODO |
| 2 | Design Tools | 1 hour | 📋 TODO |
| 3 | Implementation | 2-3 hours | 📋 TODO |
| 4 | Testing | 1 hour | 📋 TODO |
| 5 | Documentation | 30 min | 📋 TODO |
| **Total** | | **5-6 hours** | |

## 🎯 Next Steps

### Immediate (Now)
1. **Research QuickBase APIs** for codepage management
   ```bash
   # Test XML API
   curl -X POST "https://vibe.quickbase.com/db/bvhuaz7pn?a=PageSave" \
     -H "QB-USER-TOKEN: $QB_USER_TOKEN" \
     -H "Content-Type: application/xml" \
     -d '<qdbapi>...</qdbapi>'
   ```

2. **Capture Browser Request** during manual save
   - Open DevTools Network tab
   - Manually save a codepage
   - Copy request as cURL
   - Document exact API call

3. **Test Request in Node.js**
   ```javascript
   // test-page-save.js
   const axios = require('axios');
   const response = await axios.post(url, data, { headers });
   console.log(response.data);
   ```

### Short Term (Today)
1. Implement `quickbase_deploy_codepage` tool
2. Test deployment to pageID=2
3. Verify MyDealership v2.0.0 deploys successfully
4. Update documentation

### Long Term (This Week)
1. Add validation, rollback, versioning tools
2. Build comprehensive test suite
3. Create demo video for QuickBase partnership
4. Publish MCP server to NPM registry

## 🔗 Related Files

- `src/quickbase/client.ts` - Add deployment methods here
- `src/tools/index.ts` - Add tool definitions here
- `src/types/quickbase.ts` - Add new types here
- `src/index.ts` - Add tool handlers here
- `deploy-automated.js` - Reference implementation
- `test-deployment.js` - Testing patterns

## 💡 Research Notes

### QuickBase Page Management Endpoints (To Test)
```
1. /db/{appId}?a=PageSave
2. /db/{appId}?a=API_EditPage
3. /db/{appId}?a=dbpage&pageID={id}&save=1
4. /api/v1/pages/{id} (REST)
5. /api/v1/apps/{appId}/pages (REST)
```

### Authentication Methods to Try
```
1. QB-USER-TOKEN header (preferred)
2. Session cookies (credentials: 'include')
3. QB-TEMP-TOKEN header (short-lived)
4. Application token in URL
```

### Request Body Formats to Test
```
1. JSON: { code: "...", name: "..." }
2. XML: <qdbapi><page>...</page></qdbapi>
3. FormData: append('code', html)
4. URL-encoded: code=...&name=...
```

---

## ✅ Definition of Done

This plan is complete when:
- [ ] MCP server has `quickbase_deploy_codepage` tool
- [ ] Tool successfully deploys MyDealership.html to pageID=2
- [ ] No manual steps required (no clipboard, no browser)
- [ ] Deployment verified via automated test
- [ ] Documentation updated with examples
- [ ] Code committed and pushed to GitHub

**Let's build this! 🚀**
