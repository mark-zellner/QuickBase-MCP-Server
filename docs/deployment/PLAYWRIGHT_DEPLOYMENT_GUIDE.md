# 🚀 Deploy MyDealership via Playwright MCP

## Goal
Deploy MyDealership.html to QuickBase pageID=2 using browser automation through Playwright MCP.

## Prerequisites
✅ Playwright MCP server is available (confirmed - `mcp_playwright_browser_*` tools detected)
✅ MyDealership.html is ready (38,066 characters)
✅ QuickBase session authentication works
✅ Target: pageID=2 (https://vibe.quickbase.com/db/bvhuaz7pn?a=dbpage&pageID=2)

## Deployment Script

### Step 1: Navigate to Edit Page
```
Tool: mcp_playwright_browser_navigate
URL: https://vibe.quickbase.com/db/bvhuaz7pn?a=dbpage&pageID=2&edit=1
```

### Step 2: Wait for Page Load
```
Tool: mcp_playwright_browser_wait_for
time: 3 (wait 3 seconds for editor to load)
```

### Step 3: Take Screenshot (Verify We're on Right Page)
```
Tool: mcp_playwright_browser_take_screenshot
filename: before-deployment.png
```

### Step 4: Click Code Editor Area
```
Tool: mcp_playwright_browser_click
element: "code editor textarea"
ref: [get from snapshot]
```

### Step 5: Select All Existing Code
```
Tool: mcp_playwright_browser_press_key
key: Control+A
```

### Step 6: Paste New Code
```
Tool: mcp_playwright_browser_type
element: "code editor"
ref: [get from snapshot]
text: [Full MyDealership.html content - 38,066 characters]
slowly: false
```

### Step 7: Click Save Button
```
Tool: mcp_playwright_browser_click
element: "Save button"
ref: [get from snapshot after clicking editor]
```

### Step 8: Wait for Save Confirmation
```
Tool: mcp_playwright_browser_wait_for
time: 3
```

### Step 9: Take Screenshot (Verify Save)
```
Tool: mcp_playwright_browser_take_screenshot
filename: after-deployment.png
```

### Step 10: Navigate to View Page (Verify Deployment)
```
Tool: mcp_playwright_browser_navigate
URL: https://vibe.quickbase.com/db/bvhuaz7pn?a=dbpage&pageID=2
```

### Step 11: Test Connection Button
```
Tool: mcp_playwright_browser_snapshot
(Get page elements and verify our code is loaded)
```

## Full Automation Sequence

The agent will execute this sequence:

```javascript
// 1. Navigate to edit page
await mcp.playwright.navigate("https://vibe.quickbase.com/db/bvhuaz7pn?a=dbpage&pageID=2&edit=1");

// 2. Wait for load
await mcp.playwright.wait_for({ time: 3 });

// 3. Get page snapshot to find editor
const snapshot = await mcp.playwright.snapshot();

// 4. Find code editor element reference
const editorRef = findElement(snapshot, "textarea[name='pagebody']");

// 5. Click editor
await mcp.playwright.click({ element: "code editor", ref: editorRef });

// 6. Select all
await mcp.playwright.press_key({ key: "Control+A" });

// 7. Type new code
const code = fs.readFileSync('MyDealership.html', 'utf8');
await mcp.playwright.type({
  element: "code editor",
  ref: editorRef,
  text: code,
  slowly: false
});

// 8. Find and click Save button
const saveRef = findElement(snapshot, "button:contains('Save')");
await mcp.playwright.click({ element: "Save button", ref: saveRef });

// 9. Wait for save
await mcp.playwright.wait_for({ time: 3 });

// 10. Verify deployment
await mcp.playwright.navigate("https://vibe.quickbase.com/db/bvhuaz7pn?a=dbpage&pageID=2");

// 11. Check if our code is live
const verifySnapshot = await mcp.playwright.snapshot();
const hasTestButton = verifySnapshot.includes('Test Connection');

console.log(`Deployment ${hasTestButton ? 'SUCCESS ✅' : 'FAILED ❌'}`);
```

## Instructions for Agent

**USER REQUEST:**
"Deploy MyDealership.html to pageID=2 using Playwright MCP browser automation"

**AGENT ACTIONS:**
1. Read MyDealership.html content
2. Navigate to edit URL with `mcp_playwright_browser_navigate`
3. Get page snapshot with `mcp_playwright_browser_snapshot`
4. Find editor element reference from snapshot
5. Click editor, select all, paste code using Playwright tools
6. Click Save button
7. Verify deployment by navigating to view URL
8. Confirm our code is live

**EXPECTED RESULT:**
- MyDealership v2.0.0 deployed to pageID=2
- No manual steps required
- Full automation via Playwright MCP
- Screenshots saved for verification

## Notes

### Element Selection Strategy
QuickBase code page editor uses either:
- `<textarea name="pagebody">` (plain HTML editor)
- `.CodeMirror` class (if CodeMirror editor)
- `[contenteditable="true"]` (rich text editor)

The Playwright snapshot will tell us which one exists.

### Large Code Handling
MyDealership.html is 38,066 characters. Playwright's `type` tool may have limits.

**Fallback Options:**
1. Use `evaluate` to set textarea value directly:
   ```javascript
   await mcp.playwright.evaluate({
     function: "() => { document.querySelector('textarea[name=pagebody]').value = `${code}`; }"
   });
   ```

2. Use clipboard (Playwright has clipboard APIs):
   ```javascript
   await page.evaluate(code => navigator.clipboard.writeText(code), code);
   await page.keyboard.press('Control+V');
   ```

## Ready to Execute!

The plan is ready. Agent can now:
1. Load MyDealership.html
2. Execute Playwright MCP automation sequence
3. Deploy to production

**Total Time: ~30 seconds** (all automated!) ⚡
