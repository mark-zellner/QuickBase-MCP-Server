# Codepage Hero Library Options

## Current Setup (Using CDN)

The application currently loads Codepage Hero from CDN:
```html
<script src="https://cdn.jsdelivr.net/gh/johnhewi/Quickbase_Codepage_Hero@v1.0.2/quickbase_codepage_hero.js"></script>
```

## What is Codepage Hero?

**Codepage Hero** is a JavaScript library that simplifies QuickBase API calls when code runs inside QuickBase as a codepage. It handles:

1. **Session-based authentication** - Uses existing QuickBase session
2. **Temporary token management** - Fetches temporary tokens automatically
3. **Simplified API calls** - Provides convenience methods like `client.query()`, `client.post()`
4. **Error handling** - Consistent error responses

**GitHub Repository:** https://github.com/johnhewi/Quickbase_Codepage_Hero

---

## Option 1: Continue Using CDN (RECOMMENDED) ✅

### Pros:
- ✅ Already working and tested
- ✅ Maintained by library author
- ✅ Easy to update (change version number)
- ✅ No maintenance required
- ✅ Cached by browser after first load

### Cons:
- ⚠️ External dependency
- ⚠️ Requires internet access to CDN (jsDelivr)
- ⚠️ Version pinned to v1.0.2

### When to Use:
- Production applications where internet access is guaranteed
- When you want automatic bug fixes from upstream
- Standard deployment

---

## Option 2: Host Library Locally in QuickBase

You can copy the library code into a separate QuickBase codepage and reference it locally.

### Steps:

#### Step 1: Download the Library
```bash
# Download from GitHub
curl -o quickbase_codepage_hero.js https://cdn.jsdelivr.net/gh/johnhewi/Quickbase_Codepage_Hero@v1.0.2/quickbase_codepage_hero.js
```

#### Step 2: Create a New Codepage in QuickBase
1. Go to QuickBase App Settings
2. Create new Page: "Codepage Hero Library"
3. Set type: "Exact Form" or "Code Page"
4. Paste the entire library code
5. Note the Page ID (e.g., `pageID=123`)

#### Step 3: Update DealSheet_Unified.html
Replace the CDN script tag with local reference:

**Before:**
```html
<script src="https://cdn.jsdelivr.net/gh/johnhewi/Quickbase_Codepage_Hero@v1.0.2/quickbase_codepage_hero.js"></script>
```

**After:**
```html
<script src="?a=dbpage&pageID=123"></script>
```

### Pros:
- ✅ No external dependencies
- ✅ Works offline/intranet
- ✅ Full control over code
- ✅ Can customize if needed

### Cons:
- ⚠️ Must manually update when library updates
- ⚠️ More maintenance overhead
- ⚠️ Requires additional QuickBase page

### When to Use:
- High-security environments (no external CDN access)
- Intranet/offline deployments
- When you need custom modifications

---

## Option 3: Inline the Library Code

Paste the entire library directly into DealSheet_Unified.html.

### Steps:

1. Download library from CDN
2. Open DealSheet_Unified.html
3. Replace `<script src="..."></script>` with:
```html
<script>
// Paste entire quickbase_codepage_hero.js code here
(function() {
  // Library code...
})();
</script>
```

### Pros:
- ✅ Single file deployment
- ✅ No external dependencies
- ✅ Fastest load time (no extra HTTP request)

### Cons:
- ⚠️ Very large file (~500+ lines added)
- ⚠️ Harder to maintain
- ⚠️ Manual updates required

### When to Use:
- Single-file deployment requirement
- Maximum performance (eliminate extra HTTP request)
- Simple deployment process

---

## Recommendation

**Keep using CDN (Option 1)** unless you have specific requirements:

- ✅ Use CDN if: Standard deployment, internet access available, prefer automatic updates
- ⚠️ Use Local Host (Option 2) if: Security policy blocks CDN, intranet deployment, need customization
- ⚠️ Use Inline (Option 3) if: Single-file requirement, maximum performance critical

---

## Library API Reference

### Initialize Client
```javascript
const client = QBAuth.getClient();
```

### Query Records
```javascript
const records = await client.query(tableId, whereClause, selectFields, options);
// Example:
const records = await client.query('bvaks84xj', "{6.EX.'N123456'}", [6, 10, 11, 12], { skip: 0, top: 2 });
```

### Create Records
```javascript
const result = await client.post(tableId, arrayOfRecords);
// Example:
const result = await client.post('bve4nnem9', [
  { 46: { value: 'John Doe' }, 47: { value: 'N123456' } }
]);
```

### Update Records
```javascript
const result = await client.update(tableId, arrayOfRecords);
```

### Delete Records
```javascript
const result = await client.delete(tableId, arrayOfRecordIds);
```

---

## Troubleshooting

### Error: "QuickBase client not available"
**Solution:** Client initialization failed. Ensure page is loaded inside QuickBase.

### Error 400: Bad Request
**Solution:** Check parameter order/format. See API reference above.

### Error 207: Invalid Field Value
**Solution:** Field validation failed. Check:
- Multiple Choice fields have exact text match
- Date fields are in correct format
- Numeric fields don't have strings
- Required fields are not null

---

## Current Implementation Status

✅ **Currently using:** CDN Option (jsDelivr)  
✅ **Working correctly:** Yes  
📋 **Action needed:** None (unless specific requirement for local hosting)

If you need to switch to local hosting, follow Option 2 steps above.
