# MyDealership - Deployment & Testing Guide

## 📋 Pre-Deployment Checklist

### 1. Verify Configuration
Open `MyDealership.html` and verify the CONFIG section (around line 474):

```javascript
const CONFIG = {
    pricingTableId: 'bvhuaz8wz', // ✅ Pricing Calculator table
    vehiclesTableId: 'bvhuaz7s5', // ✅ Vehicles table
    
    fields: {
        relatedVehicle: 6,
        msrp: 7,
        discount: 8,
        financingRate: 9,
        tradeInValue: 10,
        finalPrice: 11,
        vehicleMake: 12,
        vehicleModel: 13
    }
};
```

### 2. QuickBase Table Structure
Ensure your Pricing Calculator table (bvhuaz8wz) has these fields:
- Field 6: Related Vehicle (reference field)
- Field 7: MSRP (numeric)
- Field 8: Discount (numeric)
- Field 9: Financing Rate (numeric)
- Field 10: Trade-In Value (numeric)
- Field 11: Final Price (numeric)
- Field 12: Vehicle Make (text/lookup)
- Field 13: Vehicle Model (text/lookup)

## 🚀 Deployment Methods

### Method 1: QuickBase Code Page (Recommended)

1. **Create New Code Page**
   - Go to your QuickBase app
   - Navigate to Settings → Code Pages
   - Click "New Code Page"
   - Name: "MyDealership Calculator"

2. **Upload HTML**
   - Copy entire contents of `MyDealership.html`
   - Paste into the code page editor
   - Save

3. **Set Permissions**
   - Ensure the code page is accessible to users who need it
   - Set appropriate role-based permissions

4. **Get URL**
   - Note the code page URL: `https://[realm].quickbase.com/db/[appId]?a=dbpage&pageID=[pageId]`

### Method 2: QuickBase Dashboard Page

1. **Create Dashboard**
   - Go to your app's dashboard
   - Add new page
   - Select "Code Page" type

2. **Embed Code**
   - Use iframe or direct embed
   - Reference your uploaded code page

### Method 3: External Hosting (Advanced)

1. **Host HTML file** on your web server
2. **Configure CORS** in QuickBase
3. **Update OAuth settings** if using external hosting

## 🧪 Testing Procedure

### Test 1: Connection Test (Quick Validation)

1. **Open the deployed page** in QuickBase
2. **Click "🔍 Test Connection"** button
3. **Check results:**
   - ✅ Should see "Connection successful via [method]"
   - ✅ Debug info should show available APIs
   - ❌ If fails, check console for errors

**Expected Debug Output:**
```json
{
  "timestamp": "2025-10-28T...",
  "hostname": "yourealm.quickbase.com",
  "isQuickBase": true,
  "apis": {
    "qdb": true,
    "qdb_api": true,
    "qbClient": true,
    "qbClient_mode": "quickbase"
  },
  "config": {
    "pricingTableId": "bvhuaz8wz",
    "vehiclesTableId": "bvhuaz7s5"
  },
  "testResult": {
    "success": true,
    "method": "qdb.api"
  }
}
```

### Test 2: Calculate & Save (Full Workflow)

1. **Select a vehicle** from dropdown (e.g., "Toyota Camry 2024")
2. **MSRP should auto-populate** to $28,000
3. **Fill in test data:**
   - Discount: $2,000
   - Financing Rate: 4.5%
   - Trade-In Value: $15,000
   - Loan Term: 60 months

4. **Click "🚀 Calculate Pricing"**
   - Results should appear immediately
   - Final Price should be calculated correctly

5. **Click "💾 Save to QuickBase"**
   - Button should show "💾 Saving..."
   - Wait for success message
   - Should see: "✅ Saved successfully! Record ID: [number]"

6. **Verify in QuickBase**
   - Go to Pricing Calculator table (bvhuaz8wz)
   - Find the newly created record
   - Verify all fields have correct values:
     - MSRP: $28,000
     - Discount: $2,000
     - Financing Rate: 4.5
     - Trade-In Value: $15,000
     - Final Price: (calculated value)

### Test 3: Error Handling

1. **Test without calculating first:**
   - Refresh page
   - Click "💾 Save to QuickBase" immediately
   - Should see: "No pricing data to save"

2. **Test with invalid data:**
   - Enter negative MSRP
   - Try to calculate
   - Should show validation error

## 🐛 Troubleshooting

### Problem: "No QuickBase API available"

**Possible Causes:**
- Not accessing from QuickBase domain
- Code page not loaded correctly
- qdb.js CDN blocked

**Solutions:**
1. Verify you're accessing from `*.quickbase.com` domain
2. Check browser console for script loading errors
3. Check that `<script src="https://cdn.quickbase.com/static/lib/qdb.js"></script>` is present
4. Wait 3 seconds after page load and try again (qdb.api may load slowly)

### Problem: "CORS Error"

**Solution:**
- The code is designed to avoid CORS by using `qdb.api` first
- Ensure you're running from within QuickBase (not localhost)
- If testing locally, use the OAuth method instead

### Problem: Save succeeds but fields are empty

**Solution:**
1. Verify field IDs in CONFIG match your table
2. Check field permissions (not read-only)
3. Verify field types are correct (numeric for numbers)
4. Check console for field mapping errors

### Problem: "Record ID: undefined"

**Solution:**
- API may have saved but not returned record ID
- Check table directly to verify record was created
- May be using session client instead of qdb.api
- This is usually a non-critical issue

## 📊 Monitoring & Logs

### Browser Console Logs

Look for these key log messages:

```
[QuickBase Debug] Available APIs: {...}
[QuickBase] Using qdb.api (CORS-free) ✅
✅ Saved with qdb.api: [recordId]
```

### QuickBase Audit Logs

1. Go to app Settings → Usage
2. Check for API calls to Pricing Calculator table
3. Verify records are being created with correct timestamps

## 🔄 Update Procedure

### To update the calculator:

1. **Edit** `MyDealership.html` locally
2. **Test** changes locally if possible
3. **Copy** updated HTML
4. **Paste** into QuickBase code page
5. **Save** code page
6. **Clear browser cache** and reload
7. **Run all tests** again

## 📝 Testing Checklist

Before marking deployment as complete, verify:

- [ ] Test Connection button works
- [ ] Debug info displays correctly
- [ ] Vehicle selection updates MSRP
- [ ] Calculate button produces results
- [ ] All calculations are mathematically correct
- [ ] Save button is visible after calculation
- [ ] Save succeeds and returns record ID
- [ ] New record appears in QuickBase table
- [ ] All field values are correct in saved record
- [ ] Error handling works (test edge cases)
- [ ] Page works in Chrome, Firefox, Safari, Edge
- [ ] Mobile responsive layout works
- [ ] Console shows no JavaScript errors
- [ ] QuickBase audit log shows successful API calls

## 🎯 Success Criteria

✅ **Deployment Successful** when:
1. Test Connection returns success
2. Sample calculation saves to QuickBase
3. Record appears in table with correct values
4. No console errors
5. All users can access and use the calculator

## 📞 Support

If issues persist:
1. Check browser console for detailed error messages
2. Review QuickBase API permissions
3. Verify table and field IDs
4. Check network tab for failed requests
5. Review QuickBase session authentication status

---

**Last Updated:** October 28, 2025
**Version:** 1.0
**Tested On:** QuickBase Cloud (2025)
