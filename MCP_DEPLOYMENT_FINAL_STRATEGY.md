# 🎯 MCP Deployment Strategy - Final Decision

## 🔍 Research Results

**Date**: October 28, 2025  
**Finding**: QuickBase code pages **CANNOT** be updated via REST or XML APIs

### What Works ✅
- GET page content (retrieve existing code)
- REST API for tables, records, fields
- XML API for data operations
- Session-based authentication

### What Doesn't Work ❌
- POST/PUT to update code page content
- XML API PageSave/EditPage
- URL-based page updates
- Any programmatic code page modification

## 🚀 Chosen Solution: Playwright MCP Integration

### Why Playwright?
1. **Fully Automated**: No manual steps required
2. **MCP Native**: Already an MCP server (`@modelcontextprotocol/server-playwright`)
3. **Battle-Tested**: Used by Anthropic's Claude
4. **Reliable**: Handles authentication, navigation, form submission

### Architecture

```
User Request
    ↓
Claude / MCP Client
    ↓
Our QuickBase MCP Server
    ↓
Playwright MCP Server (browser automation)
    ↓
QuickBase Web UI
    ↓
Code Page Updated! ✅
```

## 📋 Implementation Plan

### Step 1: Install Playwright MCP (5 min)
```bash
# Install Playwright MCP server
npm install @modelcontextprotocol/server-playwright

# Install browser dependencies
npx playwright install chromium
```

### Step 2: Add MCP Tool (30 min)
```typescript
// src/tools/index.ts

export const DeployCodepageSchema = z.object({
  pageId: z.number().describe("QuickBase page ID"),
  code: z.string().describe("HTML/JavaScript code to deploy"),
  name: z.string().describe("Page name"),
  version: z.string().optional().describe("Version number")
});

// Tool definition
{
  name: "quickbase_deploy_codepage",
  description: `Deploy a codepage to QuickBase using browser automation.
    This tool:
    1. Opens QuickBase in a browser
    2. Navigates to the code page editor
    3. Pastes the new code
    4. Saves the page
    5. Verifies deployment`,
  inputSchema: zodToJsonSchema(DeployCodepageSchema)
}
```

### Step 3: Implement Automation (1 hour)
```typescript
// src/services/codepage-deployment.ts

import { chromium } from 'playwright';

export class CodepageDeployment {
  async deploy(options: DeployOptions): Promise<DeployResult> {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // 1. Navigate to QuickBase
      await page.goto(`https://${realm}/db/${appId}?a=dbpage&pageID=${pageId}&edit=1`);
      
      // 2. Wait for authentication (session cookies)
      await page.waitForLoadState('networkidle');
      
      // 3. Find code editor
      const editor = await page.locator('textarea[name="pagebody"], .CodeMirror');
      
      // 4. Clear and paste new code
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(code);
      
      // 5. Click Save button
      await page.click('button:has-text("Save"), input[value="Save"]');
      
      // 6. Wait for save confirmation
      await page.waitForURL(/pageID=\d+[^&]*$/);
      
      // 7. Verify deployment
      const content = await page.content();
      const success = content.includes('saved') || content.includes('success');
      
      return {
        success,
        pageId,
        version,
        url: page.url()
      };
      
    } finally {
      await browser.close();
    }
  }
}
```

### Step 4: Add MCP Handler (15 min)
```typescript
// src/index.ts

case 'quickbase_deploy_codepage': {
  const { pageId, code, name, version } = params;
  
  // Save snapshot first
  const snapshotPath = await saveSnapshot(code, version);
  
  // Deploy via browser automation
  const deployment = new CodepageDeployment();
  const result = await deployment.deploy({
    realm: process.env.QB_REALM,
    appId: process.env.QB_APP_ID,
    pageId,
    code,
    name,
    version
  });
  
  // Save to management table
  if (result.success) {
    await saveToManagementTable(code, name, version);
  }
  
  return {
    content: [{
      type: "text",
      text: JSON.stringify({
        ...result,
        snapshotPath,
        editUrl: `https://${realm}/db/${appId}?a=dbpage&pageID=${pageId}&edit=1`,
        viewUrl: `https://${realm}/db/${appId}?a=dbpage&pageID=${pageId}`
      }, null, 2)
    }]
  };
}
```

### Step 5: Update Configuration (5 min)
```json
// Claude Desktop config (claude_desktop_config.json)
{
  "mcpServers": {
    "quickbase": {
      "command": "node",
      "args": ["C:/path/to/QuickBase-MCP-Server/dist/index.js"],
      "env": {
        "QB_REALM": "vibe.quickbase.com",
        "QB_USER_TOKEN": "your-token",
        "QB_APP_ID": "bvhuaz7pn"
      }
    }
  }
}
```

### Step 6: Testing (30 min)
```bash
# Build
npm run build

# Test deployment
node test-mcp-deployment.cjs
```

## 🎯 User Experience

### Before (Current)
```
User: "Deploy MyDealership to pageID 2"
Agent: "I've copied the code to your clipboard. Now:
        1. Open this URL
        2. Press Ctrl+A
        3. Press Ctrl+V
        4. Click Save
        Done!"
```

### After (With Playwright MCP)
```
User: "Deploy MyDealership to pageID 2"
Agent: "Deploying... ✅ Done! Deployed v2.0.0 to pageID 2.
        View: https://vibe.quickbase.com/db/bvhuaz7pn?a=dbpage&pageID=2"
```

## ⚡ Alternative: Use Existing Playwright MCP

Instead of implementing our own, we can **use** the existing Playwright MCP server:

```json
// Claude Desktop config
{
  "mcpServers": {
    "quickbase": {
      "command": "node",
      "args": ["dist/index.js"]
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

Then in our QuickBase MCP tool:
```typescript
case 'quickbase_deploy_codepage': {
  // Call Playwright MCP to do browser automation
  const script = `
    await page.goto('https://vibe.quickbase.com/db/bvhuaz7pn?a=dbpage&pageID=${pageId}&edit=1');
    await page.waitForLoadState('networkidle');
    const editor = await page.locator('textarea[name="pagebody"]');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type(\`${code}\`);
    await page.click('button:has-text("Save")');
    await page.waitForURL(/pageID=/);
  `;
  
  // Execute via Playwright MCP
  const result = await playwrightMCP.call('playwright_execute', { script });
  
  return result;
}
```

## 📊 Comparison

| Approach | Automation | Complexity | Reliability | Time |
|----------|-----------|------------|-------------|------|
| **Manual** | 0% | Low | 100% | 30s |
| **Clipboard (Current)** | 80% | Low | 95% | 10s |
| **Playwright (Built-in)** | 100% | High | 90% | 2-3 hours |
| **Playwright (External)** | 100% | Medium | 85% | 1 hour |

## 🎯 Recommendation

**Use External Playwright MCP** (Option 4)

### Why?
1. **Fastest Implementation**: 1 hour vs 2-3 hours
2. **Standard Solution**: Uses official MCP server
3. **Maintainable**: No custom browser code to maintain
4. **Flexible**: Can use for other automation tasks

### Implementation Steps
1. Add Playwright MCP to Claude config (5 min)
2. Create wrapper tool in our MCP server (30 min)
3. Test deployment (15 min)
4. Deploy MyDealership v2.0.0 (5 min)
5. Documentation (10 min)

**Total Time: ~65 minutes** ⏱️

## ✅ Action Items

- [ ] Install `@modelcontextprotocol/server-playwright`
- [ ] Update Claude Desktop config with Playwright MCP
- [ ] Create `quickbase_deploy_codepage` wrapper tool
- [ ] Test with dummy page
- [ ] Deploy MyDealership v2.0.0 to production
- [ ] Update documentation

**Let's implement this! 🚀**
